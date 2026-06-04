import { useCart } from "../lib/useCart.ts";

// Live cart count in the header. It's an island so it reacts to the shared
// cart event — adding from any page (button or tool) updates it immediately.
export default function CartBadge() {
  const { count } = useCart();
  return (
    <a
      href="/cart"
      class="relative inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <span class="text-lg">🛒</span>
      {count > 0 && (
        <span class="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold leading-[18px] text-center">
          {count}
        </span>
      )}
    </a>
  );
}
