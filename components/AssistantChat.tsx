import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Assistant } from "../lib/useAssistant.ts";

// Floating assistant: a chat bubble pinned bottom-right that opens a chat
// window. All state/behavior comes from useAssistant, so every page shares this
// exact widget and only supplies a page-specific hint. Returned as a fixed
// overlay, so it doesn't take layout space on the page.
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

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [a.messages, a.busy, open]);

  const ready = a.availability === "available";

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
                    ready ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                On-device · Gemini Nano
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              class="text-gray-300 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </header>

          {/* Transcript */}
          <div
            ref={logRef}
            class="flex flex-col gap-2 p-3 overflow-y-auto bg-gray-50"
            style="height: min(55vh, 26rem);"
          >
            {/* Capability hint as a greeting bubble */}
            <div class="self-start max-w-[90%] rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-600">
              {!ready && (
                <p class="text-amber-600 mb-1">
                  Gemini Nano unavailable here — enable Chrome's Prompt API to
                  chat.
                </p>
              )}
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
              <div class="self-start rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-400">
                …
              </div>
            )}

            {a.progress !== null && (
              <p class="text-xs text-gray-500 self-start">
                Downloading model… {Math.round(a.progress * 100)}%
              </p>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              a.ask();
            }}
            class="flex gap-2 p-3 border-t border-gray-100"
          >
            <input
              type="text"
              value={a.question}
              onInput={(e) =>
                a.setQuestion((e.target as HTMLInputElement).value)}
              placeholder="ask me something…"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={a.busy}
              class="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {a.busy ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        class="relative w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center text-2xl"
      >
        {open ? "×" : "💬"}
        {!open && (
          <span
            class={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-emerald-600 ${
              ready ? "bg-emerald-300" : "bg-amber-300"
            }`}
          />
        )}
      </button>
    </div>
  );
}
