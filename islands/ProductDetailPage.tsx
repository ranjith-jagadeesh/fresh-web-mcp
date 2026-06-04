import { useMemo, useState } from "preact/hooks";
import type { Product } from "../lib/catalog.ts";
import { addThisProductTool } from "../lib/tools/cart.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

export default function ProductDetailPage(props: { product: Product }) {
  const p = props.product;
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  // This page's add_to_cart always targets THIS product, so the model never
  // has to name it.
  const tools = useMemo(
    () => [addThisProductTool(p), makeNavigateTool()],
    [p],
  );
  const assistant = useAssistant(tools);
  const out = p.stock <= 0;

  return (
    <div class="flex flex-col gap-6">
      <a href="/" class="text-sm text-emerald-700 hover:underline">
        ← Back to products
      </a>

      <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row gap-6">
        <div class="text-7xl text-center sm:w-40 flex items-center justify-center">
          {p.icon}
        </div>
        <div class="flex flex-col gap-2 flex-1">
          <div class="text-xs text-gray-400">{p.category}</div>
          <h1 class="text-2xl font-bold text-gray-900">{p.name}</h1>
          <div class="text-sm text-gray-500">
            ★ {p.rating} · {out ? "Out of stock" : `${p.stock} in stock`}
          </div>
          <p class="text-gray-600">{p.blurb}</p>
          <div class="text-2xl font-bold tabular-nums mt-2">${p.price}</div>

          <div class="flex items-center gap-3 mt-3">
            <div class="flex items-center rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                class="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
              >
                −
              </button>
              <span class="px-3 tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                class="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={out}
              onClick={() => addToCart(p.id, qty)}
              class="flex-1 rounded-lg bg-emerald-600 text-white font-medium py-2 hover:bg-emerald-700 transition-colors disabled:opacity-40"
            >
              {out ? "Out of stock" : `Add ${qty} to cart`}
            </button>
          </div>
        </div>
      </div>

      <AssistantChat
        assistant={assistant}
        hint={
          <>
            Try <em>"add 2 to my cart"</em> or <em>"go to the cart"</em>.
          </>
        }
      />
    </div>
  );
}
