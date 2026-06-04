import { useMemo } from "preact/hooks";
import { cartManagementTools } from "../lib/tools/cart.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

export default function CartPage() {
  const { lines, total, setQuantity, removeFromCart, clearCart } = useCart();

  const tools = useMemo(
    () => [...cartManagementTools(), makeNavigateTool()],
    [],
  );
  const assistant = useAssistant(tools);

  return (
    <div class="flex flex-col gap-6">
      <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col gap-4">
        {lines.length === 0
          ? (
            <div class="text-center py-8 flex flex-col gap-3">
              <p class="text-gray-400">Your cart is empty.</p>
              <a href="/" class="text-emerald-700 hover:underline">
                Browse products →
              </a>
            </div>
          )
          : (
            <>
              {lines.map((l) => (
                <div
                  key={l.product.id}
                  class="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0"
                >
                  <span class="text-3xl">{l.product.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate">
                      {l.product.name}
                    </div>
                    <div class="text-xs text-gray-400">
                      ${l.product.price} each
                    </div>
                  </div>
                  <div class="flex items-center rounded-lg border border-gray-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(l.product.id, l.qty - 1)}
                      class="px-2.5 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span class="px-2 tabular-nums text-sm">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(l.product.id, l.qty + 1)}
                      class="px-2.5 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <div class="w-16 text-right font-semibold tabular-nums">
                    ${l.lineTotal}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(l.product.id)}
                    class="text-gray-300 hover:text-red-500 text-lg"
                    aria-label={`Remove ${l.product.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <div class="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={clearCart}
                  class="text-sm text-gray-500 hover:text-red-500"
                >
                  Clear cart
                </button>
                <div class="text-lg font-bold tabular-nums">
                  Total: ${total}
                </div>
              </div>
              <a
                href="/checkout"
                class="rounded-lg bg-emerald-600 text-white font-medium py-2.5 text-center hover:bg-emerald-700 transition-colors"
              >
                Checkout
              </a>
            </>
          )}
      </div>

      <AssistantChat
        assistant={assistant}
        hint={
          <>
            Try <em>"set the hoodie to 3"</em>, <em>"remove the earbuds"</em>,
            {" "}
            <em>"clear the cart"</em>, or <em>"go to checkout"</em>.
          </>
        }
      />
    </div>
  );
}
