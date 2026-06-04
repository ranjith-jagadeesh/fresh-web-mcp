import { useEffect, useRef, useState } from "preact/hooks";
import { registerTools, webmcpSupported, type WebMcpTool } from "./webmcp.ts";
import {
  createToolSession,
  type NanoAvailability,
  nanoAvailability,
  type NanoSession,
  parseToolCall,
} from "./nano.ts";
import { BEHAVIOR_PROMPT } from "./behavior.ts";
import { intentDestination } from "./tools/navigation.ts";

export interface ChatMsg {
  who: "user" | "bot";
  text: string;
}

// Navigation in this app is a full page reload (navigate sets location.href), so
// the transcript is persisted here and restored on the next page's mount to keep
// the conversation continuous across pages. sessionStorage scopes it to the tab.
const MESSAGES_KEY = "assistant.messages";

// Heuristic for the retry nudge: did the user likely want a tool? Either the
// question contains numbers (arithmetic / summary) or the model's reply punted
// ("I need to use the … tool", "let me calculate…").
const TOOL_PUNT_RE = /\b(tool|comput|calculat|summar|need to|should|let me)\b/i;
function looksLikeToolNeeded(question: string, answer: string): boolean {
  return /\d/.test(question) || TOOL_PUNT_RE.test(answer);
}

// Everything the chat UI needs. The hook owns all the Nano + WebMCP logic so it
// isn't duplicated per page; a page just builds its tools and renders the chat.
export interface Assistant {
  messages: ChatMsg[];
  question: string;
  setQuestion: (value: string) => void;
  busy: boolean;
  progress: number | null;
  preparing: boolean;
  webmcpOk: boolean;
  availability: NanoAvailability | "checking";
  startDownload: () => Promise<void>;
  ask: () => Promise<void>;
}

// Drive an on-device assistant for a given set of tools. Pass a STABLE array
// (build it with useMemo in the page island) — the hook re-registers tools when
// the array identity changes.
export function useAssistant(tools: WebMcpTool[]): Assistant {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [webmcpOk, setWebmcpOk] = useState(false);
  const [availability, setAvailability] = useState<
    NanoAvailability | "checking"
  >("checking");
  const sessionRef = useRef<NanoSession | null>(null);
  const preparingRef = useRef(false);
  const autoStartedRef = useRef(false);

  // On mount: register this page's tools with WebMCP and probe availability.
  // The returned cleanup unregisters the tools when the page island unmounts.
  useEffect(() => {
    setWebmcpOk(webmcpSupported());
    nanoAvailability().then(setAvailability);
    return registerTools(tools);
  }, [tools]);

  // Restore the transcript saved before a navigation, then keep storage in sync
  // with every change so the next page can pick up where this one left off.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      if (saved) setMessages(JSON.parse(saved) as ChatMsg[]);
    } catch { /* storage unavailable / bad JSON — start fresh */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch { /* storage unavailable — non-fatal */ }
  }, [messages]);

  // Once we know the model is supported but not ready, download it in the
  // background so it's prepared by the time the user opens the chat. We auto-try
  // exactly once (autoStartedRef) so a failed attempt doesn't loop; the chat's
  // open action can retry, doubling as the user gesture some browsers require.
  useEffect(() => {
    if (
      !autoStartedRef.current &&
      (availability === "downloadable" || availability === "downloading")
    ) {
      autoStartedRef.current = true;
      startDownload();
    }
  }, [availability]);

  function push(who: ChatMsg["who"], text: string) {
    setMessages((prev) => [...prev, { who, text }]);
  }

  // Kick off (or attach to) the on-device model download and report progress.
  // Safe to call repeatedly: it no-ops if a session already exists or a download
  // is already in flight. On success the session is cached for ask() and
  // availability flips to "available"; on a hard failure it collapses to
  // "unavailable" so the chat hides itself.
  async function startDownload() {
    if (sessionRef.current || preparingRef.current) return;
    preparingRef.current = true;
    setPreparing(true);
    setProgress(0);
    try {
      const session = await createToolSession(
        tools,
        BEHAVIOR_PROMPT,
        (loaded) => setProgress(loaded),
      );
      sessionRef.current = session;
      // Null means on-device inference can't be used at all → hide the chat.
      setAvailability(session ? "available" : "unavailable");
    } catch {
      // Re-probe: a recoverable failure (e.g. needs a user gesture) stays
      // "downloadable" so the launcher remains and the open action can retry,
      // while a genuine failure resolves to "unavailable" and hides the chat.
      setAvailability(await nanoAvailability());
    } finally {
      preparingRef.current = false;
      setPreparing(false);
      setProgress(null);
    }
  }

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    push("user", q);
    setQuestion("");
    setBusy(true);
    try {
      // Model was already downloaded at load (no background prep ran): create
      // the session now. startDownload caches it on sessionRef.
      if (!sessionRef.current) await startDownload();
      if (!sessionRef.current) {
        push(
          "bot",
          "On-device Gemini Nano isn't available here. Use Chrome 138+ with " +
            "the Prompt API enabled — the buttons and WebMCP tools still work.",
        );
        return;
      }

      const answer = await sessionRef.current.prompt(q);
      let call = parseToolCall(answer, tools);

      // Small models sometimes acknowledge a tool without emitting the call
      // ("I need to use the calculator tool"). If it looks like a tool was
      // needed (and it isn't a navigation question), nudge once for the bare
      // call and parse again. This is general — it works for any tool.
      if (!call && !intentDestination(q) && looksLikeToolNeeded(q, answer)) {
        const retry = await sessionRef.current.prompt(
          "Call the tool needed for my last request now. Output ONLY the call " +
            "on a single line, like toolName(arg=value, ...). No other words.",
        );
        call = parseToolCall(retry, tools);
      }

      // 1) A tool call (first try or after the nudge) — run it; this also
      //    updates the page UI via the tool.
      if (call) {
        push("bot", String(await call.tool.execute(call.args)));
        return;
      }

      // 2) Reliability net: route obvious navigation questions even if the
      //    model didn't emit navigate — but only if this page HAS a navigate
      //    tool and we're not already on the target page.
      const dest = intentDestination(q);
      const navigate = tools.find((t) => t.name === "navigate");
      if (dest && navigate && globalThis.location?.pathname !== dest.path) {
        push("bot", String(await navigate.execute({ destination: dest.slug })));
        return;
      }

      // 3) Otherwise just show the model's text answer.
      push("bot", answer.trim() || "(no answer)");
    } catch (err) {
      push("bot", "Something went wrong: " + (err as Error).message);
    } finally {
      // Always clear the download indicator — even if session creation threw,
      // so the UI never sticks on a stale "Downloading…" percentage.
      setProgress(null);
      setBusy(false);
    }
  }

  return {
    messages,
    question,
    setQuestion,
    busy,
    progress,
    preparing,
    webmcpOk,
    availability,
    startDownload,
    ask,
  };
}
