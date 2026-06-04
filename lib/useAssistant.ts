import { useEffect, useRef, useState } from "preact/hooks";
import { registerTools, webmcpSupported, type WebMcpTool } from "./webmcp.ts";
import {
  createToolSession,
  type NanoAvailability,
  nanoAvailability,
  type NanoSession,
  type ParsedToolCall,
  parseToolCalls,
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

// Upper bound on tool calls executed for one user message. Caps the agentic
// chaining loop so a confused model can't run tools indefinitely.
const MAX_TOOL_STEPS = 4;

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
  clear: () => void;
}

// Page-specific reliability net: when the small model doesn't emit a tool call,
// a matching phrase routes straight to the named (parameterless) tool. Mirrors
// the built-in navigation fallback, but works for any tool a page wants to
// guarantee — e.g. checkout's "use my recent address" / "place my order".
export interface IntentFallback {
  matches: (question: string) => boolean;
  tool: string;
}

// Drive an on-device assistant for a given set of tools. Pass a STABLE array
// (build it with useMemo in the page island) — the hook re-registers tools when
// the array identity changes.
export function useAssistant(
  tools: WebMcpTool[],
  fallbacks: IntentFallback[] = [],
): Assistant {
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

  // We deliberately do NOT download the model just because someone opened the
  // site — a multi-GB background download without consent is a hostile surprise,
  // and user control is the whole point of "on-device". So a "downloadable" model
  // waits for an explicit click in the chat (see ConsentBody in AssistantChat).
  // The one exception is "downloading": a download is already in flight (Chrome
  // or another tab started it), so we attach once to surface progress and reuse
  // the resulting session rather than leaving the user staring at a dead spinner.
  useEffect(() => {
    if (!autoStartedRef.current && availability === "downloading") {
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
          "On-device Gemini Nano isn't available in this browser. To use the " +
            "assistant, open this page in Chrome 146+ on desktop with " +
            "chrome://flags/#enable-webmcp-testing and the Prompt API enabled. " +
            "The store itself still works without it.",
        );
        return;
      }

      const answer = await sessionRef.current.prompt(q);
      let calls = parseToolCalls(answer, tools);

      // Small models sometimes acknowledge a tool without emitting the call
      // ("I need to use the calculator tool"). If it looks like a tool was
      // needed (and it isn't a navigation question), nudge once for the bare
      // call and parse again. This is general — it works for any tool.
      if (
        !calls.length && !intentDestination(q) && looksLikeToolNeeded(q, answer)
      ) {
        const retry = await sessionRef.current.prompt(
          "Call the tool needed for my last request now. Output ONLY the call " +
            "on a single line, like toolName(arg=value, ...). No other words.",
        );
        calls = parseToolCalls(retry, tools);
      }

      // 1) Tool calls — run them, then keep asking the model whether another
      //    tool is needed to finish the request, so a single message can chain
      //    steps ("use my address AND place the order"). The model's session is
      //    stateful, so each continuation prompt sees the original request and
      //    the results so far. Bounded by MAX_STEPS, and a per-call signature
      //    guard stops the model from re-running the same call in a loop.
      if (calls.length) {
        const ran = new Set<string>();
        const sig = (c: ParsedToolCall) => c.tool.name + JSON.stringify(c.args);
        for (let step = 0; step < MAX_TOOL_STEPS && calls.length; step++) {
          let didRun = false;
          for (const call of calls) {
            if (ran.has(sig(call))) continue;
            ran.add(sig(call));
            push("bot", String(await call.tool.execute(call.args)));
            didRun = true;
          }
          // Nothing new ran this round → the model is repeating itself; stop.
          if (!didRun) break;
          // Continue ONLY for things the user explicitly asked for. Re-state the
          // original request and forbid volunteering extra actions, so the model
          // doesn't tack on "helpful" steps like navigating to the cart.
          const next = await sessionRef.current.prompt(
            `My original request was: "${q}". Is there a part of THAT request ` +
              "that has not been done yet? If so, output ONLY the tool call for " +
              "it on a single line. If everything I asked for is done, reply " +
              "with a short confirmation and NO tool call. Do NOT take any " +
              "action I did not explicitly ask for (e.g. do not navigate).",
          );
          calls = parseToolCalls(next, tools).filter((c) => !ran.has(sig(c)));
        }
        return;
      }

      // 2a) Page-specific reliability net: a phrase the page registered should
      //     route straight to its tool even if the model didn't emit the call.
      for (const fb of fallbacks) {
        if (!fb.matches(q)) continue;
        const tool = tools.find((t) => t.name === fb.tool);
        if (tool) {
          push("bot", String(await tool.execute({})));
          return;
        }
      }

      // 2b) Reliability net: route obvious navigation questions even if the
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

  // Wipe the transcript AND drop the model session so its conversation memory
  // starts fresh — otherwise the model would still "remember" the cleared turns.
  // The next ask() recreates the session. The messages→storage effect persists
  // the empty transcript, so the clear survives navigation too.
  function clear() {
    setMessages([]);
    sessionRef.current = null;
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
    clear,
  };
}
