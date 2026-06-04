import { useMemo, useState } from "preact/hooks";
import { type Order, type OrderStatus, readOrders } from "../lib/orders.ts";
import { makeOrderTools } from "../lib/tools/orders.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

const STATUS_STYLES: Record<OrderStatus, string> = {
  Processing: "bg-amber-100 text-amber-700",
  Shipped: "bg-sky-100 text-sky-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  // Lazy init: on the server localStorage is undefined so readOrders() returns
  // the seed (rendered immediately); on the client it reads any saved orders.
  const [orders] = useState<Order[]>(readOrders);
  const { addToCart } = useCart();

  const tools = useMemo(() => [...makeOrderTools(), makeNavigateTool()], []);
  const assistant = useAssistant(tools);

  function reorder(o: Order) {
    for (const item of o.items) addToCart(item.id, item.qty);
  }

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        {orders.map((o) => (
          <div
            key={o.id}
            class="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-gray-900">{o.id}</div>
                <div class="text-xs text-gray-400">{o.date}</div>
              </div>
              <span
                class={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  STATUS_STYLES[o.status]
                }`}
              >
                {o.status}
              </span>
            </div>

            <div class="flex flex-col gap-1 text-sm text-gray-600">
              {o.items.map((it) => (
                <div key={it.id} class="flex justify-between">
                  <span>{it.name} × {it.qty}</span>
                  <span class="tabular-nums">${it.price * it.qty}</span>
                </div>
              ))}
            </div>

            <div class="flex items-center justify-between border-t border-gray-100 pt-2">
              <span class="font-bold tabular-nums">Total: ${o.total}</span>
              <button
                type="button"
                onClick={() => reorder(o)}
                class="rounded-lg border border-emerald-600 text-emerald-700 text-sm px-3 py-1.5 hover:bg-emerald-50 transition-colors"
              >
                Reorder
              </button>
            </div>
          </div>
        ))}
      </div>

      <AssistantChat
        assistant={assistant}
        hint={
          <>
            Try <em>"track ORD-1042"</em>, <em>"reorder ORD-1031"</em>, or{" "}
            <em>"go to the cart"</em>.
          </>
        }
      />
    </div>
  );
}
