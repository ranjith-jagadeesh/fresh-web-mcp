import { latestShippingAddress, type ShippingAddress } from "../orders.ts";
import type { WebMcpTool } from "../webmcp.ts";

// Checkout tool: fill the shipping form from the most recently used address.
// `apply` lets the checkout page write the values into its form state.
export function makeUseRecentAddressTool(
  apply: (addr: ShippingAddress) => void,
): WebMcpTool {
  return {
    name: "use_recent_address",
    description:
      "Fill the shipping form with the customer's most recently used address, " +
      "taken from their latest past order. Use when the user says something " +
      "like \"use my recent address\" or \"use the same address as last time\".",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: () => {
      const addr = latestShippingAddress();
      if (!addr) return "No saved address from a previous order yet.";
      apply(addr);
      return `Filled your shipping details from your most recent order — ${addr.fullName}, ${addr.address}, ${addr.city} ${addr.zip}.`;
    },
    annotations: { readOnlyHint: false },
  };
}

// Phrase fallback: small on-device models don't always emit the tool call, so
// the page can detect the intent and run the tool directly. Mirrors the
// intentDestination net used for navigation.
const RECENT_ADDRESS_RE =
  /\b(recent|recently used|last|previous|same|saved)\b.*\baddress\b|\baddress\b.*\b(last time|before|again)\b/i;

export function wantsRecentAddress(text: string): boolean {
  return RECENT_ADDRESS_RE.test(text);
}
