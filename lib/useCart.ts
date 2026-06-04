import { useEffect, useState } from "preact/hooks";
import {
  addToCart,
  CART_EVENT,
  type CartLine,
  cartLines,
  clearCart,
  removeFromCart,
  setQuantity,
} from "./cart.ts";

// Reactive view of the cart. Re-reads on the window CART_EVENT (same-tab
// mutations from buttons or tools) and the storage event (other tabs).
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(cartLines());
    sync();
    addEventListener(CART_EVENT, sync);
    addEventListener("storage", sync);
    return () => {
      removeEventListener(CART_EVENT, sync);
      removeEventListener("storage", sync);
    };
  }, []);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);

  // Mutations are the same global functions the tools call, so UI and agent
  // stay in sync through the shared event.
  return {
    lines,
    count,
    total,
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart,
  };
}
