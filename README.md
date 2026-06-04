# 🛍️ Nano Store

A small e-commerce demo where an **in-browser AI agent runs the store** —
browsing, cart, checkout, and order tracking — by calling tools the page
publishes, instead of clicking the UI. The agent runs **fully on-device** on
Chrome's Gemini Nano: no server, no API key, nothing leaves the browser.

**Live demo:** https://fresh-web-mcp.ranjithjagadees.deno.net/

> ⚠️ The AI assistant needs Chrome's early-preview APIs (see
> [Requirements](#requirements)). Without them the store still works normally —
> the chat bubble just explains what's needed.

## What it shows

[**WebMCP**](https://github.com/webmachinelearning/webmcp) lets a web page
expose structured _tools_ (`searchProducts`, `addToCart`, `checkout`,
`trackOrder`, …) that an in-browser AI agent can call directly — no DOM
scraping, no brittle clicking. Each page registers the tools relevant to it, and
an on-device model turns plain language ("add the blue one to my cart and check
out") into those tool calls.

- **On-device** — inference runs on Chrome's
  [Prompt API](https://developer.chrome.com/docs/ai/built-in) (Gemini Nano). No
  backend model, no network round-trip, fully private.
- **Both WebMCP APIs** — most pages use the imperative API
  (`navigator.modelContext.registerTool`); checkout uses the declarative API (an
  annotated `<form>`).
- **Agent-driven navigation** — a single request can chain steps across pages,
  and the cart/conversation persist across full-page navigations.

## Requirements

To drive the store by chat you need:

1. **Chrome 146+** on desktop
2. Enable `chrome://flags/#enable-webmcp-testing` and the Prompt API (Gemini
   Nano), then relaunch

On many Chrome desktops the Nano model is already downloaded, so there's nothing
extra to install.

## Run it locally

Install [Deno](https://deno.land/manual/getting_started/installation), then:

```
deno task start
```

Open http://localhost:8000. Tap the 💬 bubble (bottom-right) and tell it what
you want.

## How it's built

[Deno Fresh](https://fresh.deno.dev) + Tailwind. The WebMCP + Nano core:

- `lib/webmcp.ts` — `registerTool` wrapper (imperative API + cleanup).
- `lib/nano.ts` — on-device `LanguageModel` session, tool-call parsing, and a
  generated tool manifest injected into the system prompt so the small model
  grounds on the real tools instead of inventing them.
- `lib/useAssistant.ts` — hook that registers a page's tools and runs the chat
  pipeline (with an agentic multi-step tool loop and intent fallbacks).
- `components/AssistantChat.tsx` — the floating chat widget shared by every
  page.
- `lib/tools/{catalog,cart,orders,navigation}.ts` — per-page tool factories over
  the mock catalog, cart (localStorage), and order history.

> Note: the project directory is named `react-genui` for historical reasons —
> it's a Deno Fresh app, not React/Next.

After adding or removing routes/islands, run `deno task manifest` to regenerate
`fresh.gen.ts`. `deno task check` type-checks, lints, and format-checks.
