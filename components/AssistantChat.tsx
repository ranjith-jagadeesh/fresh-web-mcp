import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Assistant } from "../lib/useAssistant.ts";

// Persisted so the chat stays open across navigations (each page is a full
// reload that remounts this widget). sessionStorage scopes it to the tab.
const OPEN_KEY = "assistant.open";

// Floating assistant: a chat bubble pinned bottom-right that opens a chat
// window. All state/behavior comes from useAssistant, so every page shares this
// exact widget and only supplies a page-specific hint. Returned as a fixed
// overlay, so it doesn't take layout space on the page.
//
// Visibility rules:
//   • "checking"     → render nothing (we don't yet know if the model can run).
//   • "unavailable"  → launcher shows; opening reveals a short "what you need"
//     panel (Chrome 146 + flag). The public demo URL is shared widely, so most
//     visitors land here — silently hiding the widget would make the page look
//     broken and bury the whole point of the demo.
//   • "downloadable" → launcher shows; opening reveals a consent panel that asks
//     before downloading the model — we never download just because the page
//     loaded (a surprise multi-GB download is exactly the thing people resent).
//   • "downloading"  → launcher shows; opening reveals download progress.
//   • "available"    → launcher shows; opening reveals the chat window.
export function AssistantChat(
  props: {
    assistant: Assistant;
    title?: string;
    hint?: ComponentChildren;
  },
) {
  const a = props.assistant;
  const [open, setOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the transcript pinned to the latest message. `a.availability` is in the
  // deps so that after a navigation — where the restored messages arrive BEFORE
  // the chat body mounts (it only renders once availability resolves to
  // "available") — the scroll runs when the body finally mounts, instead of the
  // transcript being left scrolled to the top.
  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [a.messages, a.busy, open, a.availability]);

  // Restore the open state from before a navigation (done in an effect, not the
  // initial value, to avoid an SSR/client hydration mismatch), then keep it in
  // sync so the window reopens automatically on the next page.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_KEY) === "1") setOpen(true);
    } catch { /* storage unavailable — non-fatal */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch { /* storage unavailable — non-fatal */ }
  }, [open]);

  // While we're still probing, render nothing — the state resolves in a tick and
  // we'd rather not flash a launcher that might immediately change meaning.
  if (a.availability === "checking") {
    return null;
  }

  const ready = a.availability === "available";
  const unsupported = a.availability === "unavailable";
  // A download is in flight — either the user consented and we kicked it off, or
  // Chrome already had one running and we attached to it.
  const downloading = a.preparing || a.availability === "downloading";
  // Supported, model not present, nothing downloading yet → ask before pulling it.
  const needsConsent = !ready && !unsupported && !downloading;

  // Opening the chat never starts a download — that only happens when the user
  // explicitly clicks "Download" in the consent panel (which also satisfies the
  // user-gesture some browsers require). Toggling just shows/hides the window.
  function toggle() {
    setOpen((o) => !o);
  }

  return (
    <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div class="w-[22rem] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <header class="flex items-center justify-between gap-2 px-4 py-3 bg-gray-900 text-white">
            <div class="flex flex-col">
              <span class="font-semibold text-sm">
                {props.title ?? "Store assistant"}
              </span>
              <span class="flex items-center gap-1.5 text-[11px] text-gray-300">
                <span
                  class={`inline-block w-2 h-2 rounded-full ${
                    ready
                      ? "bg-emerald-400"
                      : unsupported
                      ? "bg-gray-400"
                      : downloading
                      ? "bg-amber-400 animate-pulse"
                      : "bg-amber-400"
                  }`}
                />
                {unsupported
                  ? "Requires Chrome desktop"
                  : "On-device · Gemini Nano"}
              </span>
            </div>
            <div class="flex items-center gap-3">
              {ready && a.messages.length > 0 && (
                <button
                  type="button"
                  onClick={a.clear}
                  aria-label="Clear conversation"
                  class="text-[11px] text-gray-300 hover:text-white underline underline-offset-2"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                class="text-gray-300 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
          </header>

          {ready
            ? <ChatBody assistant={a} hint={props.hint} logRef={logRef} />
            : unsupported
            ? <UnsupportedBody />
            : downloading
            ? <DownloadingBody assistant={a} />
            : needsConsent
            ? <ConsentBody assistant={a} />
            : null}
        </div>
      )}

      {/* Floating launcher */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close chat" : "Open chat"}
        class="relative w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center text-2xl"
      >
        {open ? "×" : "💬"}
        {!open && (
          <span
            class={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-emerald-600 ${
              ready
                ? "bg-emerald-300"
                : unsupported
                ? "bg-gray-300"
                : downloading
                ? "bg-amber-300 animate-pulse"
                : "bg-amber-300"
            }`}
          />
        )}
      </button>
    </div>
  );
}

// Shown when this browser can't run the on-device model — i.e. it lacks Chrome's
// WebMCP / Prompt API preview. Most visitors to the public demo land here, so
// instead of hiding the widget we explain what the demo is and what's needed to
// drive it live (and reassure them the rest of the store still works).
function UnsupportedBody() {
  return (
    <div
      class="flex flex-col gap-3 overflow-y-auto p-5 bg-gray-50 text-sm text-gray-700"
      style="height: min(55vh, 26rem);"
    >
      <p class="font-medium text-gray-900">
        This assistant runs entirely on your device 🔒
      </p>
      <p class="text-gray-600">
        It's powered by Chrome's built-in on-device AI —{" "}
        <span class="font-medium text-gray-800">Gemini Nano</span>{" "}
        via the new WebMCP + Prompt APIs, still in early preview. To drive the
        store by chat, open this page in{" "}
        <span class="font-medium text-gray-800">
          Chrome 146+ on a desktop or laptop
        </span>. No extra setup needed.
      </p>
      <p class="mt-1 text-xs text-gray-500">
        On another browser? There's a short video of it in action in the post.
        Meanwhile, feel free to browse the store — everything else works
        normally.
      </p>
    </div>
  );
}

// Shown when the model is supported but not yet on this device. We ask before
// downloading rather than pulling a multi-GB model the moment the page loads —
// the user opted into the chat, not into a surprise download.
function ConsentBody(props: { assistant: Assistant }) {
  return (
    <div
      class="flex flex-col gap-3 overflow-y-auto p-5 bg-gray-50 text-sm text-gray-700"
      style="height: min(55vh, 26rem);"
    >
      <p class="font-medium text-gray-900">
        Set up the assistant 🔒
      </p>
      <p class="text-gray-600">
        It runs <span class="font-medium text-gray-800">Gemini Nano</span>{" "}
        entirely in your browser — no server, no API key, nothing leaves your
        device. Chrome ships this model to many desktops automatically, but it's
        not on this one yet.
      </p>
      <p class="text-gray-600">
        Want to download it now? It's a one-time download (often a few GB);
        after that the assistant works instantly.
      </p>
      <button
        type="button"
        onClick={() => props.assistant.startDownload()}
        class="mt-1 self-start rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        Download and enable
      </button>
      <p class="text-[11px] text-gray-400">
        You can keep browsing the store while it downloads.
      </p>
    </div>
  );
}

// Shown while the on-device model is still downloading — gives the user a clear
// read on how far along the one-time download is before the chat is usable.
function DownloadingBody(props: { assistant: Assistant }) {
  const a = props.assistant;
  const pct = a.progress !== null ? Math.round(a.progress * 100) : null;

  return (
    <div
      class="flex flex-col items-center justify-center text-center gap-3 p-6 bg-gray-50"
      style="height: min(55vh, 26rem);"
    >
      <div class="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <p class="text-sm font-medium text-gray-800">Preparing the assistant</p>
      <p class="text-xs text-gray-500 max-w-[16rem]">
        Downloading Gemini Nano to run privately on your device. This only
        happens once.
      </p>
      <div class="w-full max-w-[16rem] mt-1">
        <div class="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            class="h-full bg-emerald-500 transition-all duration-300"
            style={`width: ${pct ?? 5}%`}
          />
        </div>
        <p class="text-[11px] text-gray-400 mt-1">
          {pct !== null ? `${pct}% downloaded` : "Starting…"}
        </p>
      </div>
    </div>
  );
}

// The usual chat surface — transcript + composer. Only rendered once the model
// is available, so it never has to reason about download/availability state.
function ChatBody(props: {
  assistant: Assistant;
  hint?: ComponentChildren;
  logRef: { current: HTMLDivElement | null };
}) {
  const a = props.assistant;

  return (
    <>
      {/* Transcript */}
      <div
        ref={props.logRef}
        class="flex flex-col gap-2 p-3 overflow-y-auto bg-gray-50"
        style="height: min(55vh, 26rem);"
      >
        {/* Capability hint as a greeting bubble */}
        <div class="self-start max-w-[90%] rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-600">
          {props.hint ?? <>Ask me to help around the store.</>}
        </div>

        {a.messages.map((m, i) => (
          <div
            key={i}
            class={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
              m.who === "user"
                ? "self-end bg-emerald-600 text-white"
                : "self-start bg-white border border-gray-200 text-gray-800"
            }`}
          >
            {m.text}
          </div>
        ))}

        {a.busy && (
          <div class="self-start rounded-lg bg-white border border-gray-200 px-3 py-2">
            <span
              class="flex items-center gap-1"
              aria-label="Assistant is typing"
            >
              <span class="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span class="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span class="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          a.ask();
        }}
        class="flex items-end gap-2 p-3 border-t border-gray-100"
      >
        <textarea
          rows={2}
          value={a.question}
          onInput={(e) =>
            a.setQuestion((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline (multi-line composing).
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              a.ask();
            }
          }}
          placeholder="ask me something…  (Shift+Enter for a new line)"
          class="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={a.busy}
          class="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 shrink-0"
        >
          {a.busy ? "…" : "Send"}
        </button>
      </form>
    </>
  );
}
