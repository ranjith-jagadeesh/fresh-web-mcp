import { addToCart } from "../cart.ts";
import { findOrder } from "../orders.ts";
import type { WebMcpTool } from "../webmcp.ts";

// Order-history tools — used on the orders page. `onReorder` lets the page
// react (e.g. surface a "view cart" hint) after items are re-added.
export function makeOrderTools(onReorder?: () => void): WebMcpTool[] {
  return [
    {
      name: "track_order",
      description:
        "Look up the status of a past order by its id (e.g. ORD-1042).",
      inputSchema: {
        type: "object",
        properties: {
          order: { type: "string", description: "The order id." },
        },
        required: ["order"],
      },
      execute: (args) => {
        const o = findOrder(String(args.order ?? Object.values(args)[0] ?? ""));
        if (!o) return `No order found matching "${args.order}".`;
        return `${o.id} is ${o.status} — ${o.items.length} item(s), $${o.total}.`;
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "reorder",
      description:
        "Add all items from a past order back into the cart, by order id.",
      inputSchema: {
        type: "object",
        properties: {
          order: { type: "string", description: "The order id to reorder." },
        },
        required: ["order"],
      },
      execute: (args) => {
        const o = findOrder(String(args.order ?? Object.values(args)[0] ?? ""));
        if (!o) return `No order found matching "${args.order}".`;
        for (const item of o.items) addToCart(item.id, item.qty);
        onReorder?.();
        return `Re-added ${o.items.length} item(s) from ${o.id} to your cart.`;
      },
      annotations: { readOnlyHint: false },
    },
  ];
}
