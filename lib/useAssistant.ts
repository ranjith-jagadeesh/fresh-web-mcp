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

// Heuristic for the retry nudge: did the user likely want a tool? Either the
// question contains numbers (arithmetic / summary) or the model's reply punted
// ("I need to use the … tool", "let me calculate…").
function looksLikeToolNeeded(question: string, answer: string): boolean {
  return /\d/.test(question) ||
    /\b(tool|comput|calculat|summar|need to|should|let me)\b/i.test(answer);
}

// Everything the chat UI needs. The hook owns all the Nano + WebMCP logic so it
// isn't duplicated per page; a page just builds its tools and renders the chat.
export interface Assistant {
  messages: ChatMsg[];
  question: string;
  setQuestion: (value: string) => void;
  busy: boolean;
  progress: number | null;
  webmcpOk: boolean;
  availability: NanoAvailability | "checking";
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
  const [webmcpOk, setWebmcpOk] = useState(false);
  const [availability, setAvailability] = useState<
    NanoAvailability | "checking"
  >("checking");
  const sessionRef = useRef<NanoSession | null>(null);

  // On mount: register this page's tools with WebMCP and probe availability.
  // The returned cleanup unregisters the tools when the page island unmounts.
  useEffect(() => {
    setWebmcpOk(webmcpSupported());
    nanoAvailability().then(setAvailability);
    return registerTools(tools);
  }, [tools]);

  function push(who: ChatMsg["who"], text: string) {
    setMessages((prev) => [...prev, { who, text }]);
  }

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    push("user", q);
    setQuestion("");
    setBusy(true);
    try {
      if (!sessionRef.current) {
        sessionRef.current = await createToolSession(
          tools,
          BEHAVIOR_PROMPT,
          (loaded) => setProgress(loaded),
        );
        setProgress(null);
      }
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
      setBusy(false);
    }
  }

  return {
    messages,
    question,
    setQuestion,
    busy,
    progress,
    webmcpOk,
    availability,
    ask,
  };
}
