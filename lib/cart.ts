// Cart state, persisted to localStorage so it survives full-page navigation
// across the store. Mutations dispatch a window event so every component using
// useCart() on the page (cart list, header badge, etc.) updates live.

import { findProductById, type Product } from "./catalog.ts";

export interface CartItem {
  id: string;
  qty: number;
}

const KEY = "webmcp-cart";
export const CART_EVENT = "cart-changed";

export function readCart(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(id: string, qty = 1) {
  const items = readCart();
  const existing = items.find((i) => i.id === id);
  if (existing) existing.qty += qty;
  else items.push({ id, qty });
  writeCart(items.filter((i) => i.qty > 0));
}

export function setQuantity(id: string, qty: number) {
  let items = readCart();
  if (qty <= 0) {
    items = items.filter((i) => i.id !== id);
  } else {
    const existing = items.find((i) => i.id === id);
    if (existing) existing.qty = qty;
    else items.push({ id, qty });
  }
  writeCart(items);
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter((i) => i.id !== id));
}

export function clearCart() {
  writeCart([]);
}

export interface CartLine {
  product: Product;
  qty: number;
  lineTotal: number;
}

// Resolve cart items to full products with line totals (skips unknown ids).
export function cartLines(): CartLine[] {
  return readCart().flatMap((i) => {
    const product = findProductById(i.id);
    return product
      ? [{ product, qty: i.qty, lineTotal: product.price * i.qty }]
      : [];
  });
}
