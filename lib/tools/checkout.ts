import type { WebMcpTool } from "../webmcp.ts";

// Imperative twin of the checkout form's declarative `place_order` tool, so the
// in-page assistant (Gemini Nano) can place the order too — not just an external
// browser WebMCP agent submitting the form. `place` runs the same logic the
// submit handler does and returns the message to show in the chat.
export function makePlaceOrderTool(place: () => string): WebMcpTool {
  return {
    name: "place_order",
    description:
      "Place the order using the shipping details currently in the checkout " +
      "form and the items in the cart. Call this when the user says to place, " +
      "submit, or confirm their order.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: () => place(),
    annotations: { readOnlyHint: false },
  };
}

// Phrase fallback for when the small model doesn't emit the call.
const PLACE_ORDER_RE =
  /\b(place|submit|confirm|complete|finish)\b.*\border\b|\b(buy|checkout|check\s*out)\b.*\bnow\b/i;

export function wantsPlaceOrder(text: string): boolean {
  return PLACE_ORDER_RE.test(text);
}
