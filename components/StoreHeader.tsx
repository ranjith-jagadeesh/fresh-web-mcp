import { Nav } from "./Nav.tsx";
import CartBadge from "../islands/CartBadge.tsx";

// Shared store header: brand + nav + live cart badge. Used by every route so
// the chrome stays consistent.
export function StoreHeader(props: { current: string }) {
  return (
    <header class="flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
      <a href="/" class="text-lg font-bold text-gray-900">
        🛍️ Nano Store
      </a>
      <div class="flex items-center gap-6">
        <Nav current={props.current} />
        <CartBadge />
      </div>
    </header>
  );
}
