import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  CATEGORIES,
  type Category,
  filterProducts,
  type Filters,
  type Product,
  PRODUCTS,
  searchProducts,
  type SortBy,
  sortProducts,
} from "../lib/catalog.ts";
import { makeCatalogTools } from "../lib/tools/catalog.ts";
import { addByNameTool } from "../lib/tools/cart.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<SortBy>("rating");
  const { lines, addToCart } = useCart();

  const setFilter = (patch: Filters) => setFilters((f) => ({ ...f, ...patch }));

  // Which control the assistant just touched, so it can glow briefly. Manual
  // edits intentionally don't flash (typing in search would strobe); only the
  // agent-driven tool handlers below trigger it, which is the demo's whole
  // point — you watch the AI light up the same inputs you can use yourself.
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const flashTimers = useRef<Record<string, number>>({});
  const flashCtrl = (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    setFlash((f) => {
      const next = { ...f };
      for (const k of list) next[k] = true;
      return next;
    });
    for (const k of list) {
      clearTimeout(flashTimers.current[k]);
      flashTimers.current[k] = setTimeout(() => {
        setFlash((f) => {
          const next = { ...f };
          delete next[k];
          return next;
        });
      }, 1100);
    }
  };

  // Tools mutate the SAME view state the manual controls use, and additionally
  // flash the control they changed so an on-screen viewer can see the agent act.
  const tools = useMemo(
    () => [
      ...makeCatalogTools({
        onSearch: (q) => {
          setQuery(q);
          flashCtrl("search");
        },
        onFilter: (patch) => {
          setFilter(patch);
          flashCtrl(Object.keys(patch));
        },
        onSort: (by) => {
          setSortBy(by);
          flashCtrl("sort");
        },
      }),
      addByNameTool(),
      makeNavigateTool(),
    ],
    [],
  );
  const assistant = useAssistant(tools);

  // How many of each product are in the cart, for the per-card "🛒 N" pill.
  const qtyById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lines) m[l.product.id] = l.qty;
    return m;
  }, [lines]);

  // Recompute the visible set only when an input actually changes — the
  // search → filter → sort chain otherwise reruns on every unrelated render.
  const visible = useMemo(
    () =>
      sortProducts(
        filterProducts(searchProducts(PRODUCTS, query), filters),
        sortBy,
      ),
    [query, filters, sortBy],
  );

  // Bump a generation counter whenever the visible set actually changes. Keying
  // the grid and the count on it remounts them, replaying the stagger-in and
  // count pop — so any filter/sort/search (manual or agent) is visibly felt.
  const visibleSig = visible.map((p) => p.id).join(",");
  const [gen, setGen] = useState(0);
  const prevSig = useRef<string | null>(null);
  useEffect(() => {
    if (prevSig.current !== null && prevSig.current !== visibleSig) {
      setGen((g) => g + 1);
    }
    prevSig.current = visibleSig;
  }, [visibleSig]);

  return (
    <div class="flex flex-col gap-6">
      {/* Controls */}
      <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 flex-1 min-w-[180px]">
          <span class="text-xs text-gray-400">Search</span>
          <input
            type="text"
            value={query}
            placeholder="headphones, shoes…"
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            class={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500${
              flash.search ? " ctrl-flash" : ""
            }`}
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-400">Category</span>
          <select
            value={filters.category ?? ""}
            onChange={(e) =>
              setFilter({
                category:
                  ((e.target as HTMLSelectElement).value || undefined) as
                    | Category
                    | undefined,
              })}
            class={`rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white${
              flash.category ? " ctrl-flash" : ""
            }`}
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-400">Max price</span>
          <input
            type="number"
            value={filters.maxPrice ?? ""}
            placeholder="∞"
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setFilter({ maxPrice: v === "" ? undefined : Number(v) });
            }}
            class={`w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm${
              flash.maxPrice ? " ctrl-flash" : ""
            }`}
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-400">Min rating</span>
          <select
            value={String(filters.minRating ?? "")}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setFilter({ minRating: v === "" ? undefined : Number(v) });
            }}
            class={`rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white${
              flash.minRating ? " ctrl-flash" : ""
            }`}
          >
            <option value="">Any</option>
            <option value="3">3★+</option>
            <option value="4">4★+</option>
            <option value="4.5">4.5★+</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-gray-400">Sort</span>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy((e.target as HTMLSelectElement).value as SortBy)}
            class={`rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white${
              flash.sort ? " ctrl-flash" : ""
            }`}
          >
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <label class="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={!!filters.inStockOnly}
            onChange={(e) =>
              setFilter({
                inStockOnly: (e.target as HTMLInputElement).checked,
              })}
            class={flash.inStockOnly ? "ctrl-flash" : undefined}
          />
          <span class="text-sm text-gray-600">In stock</span>
        </label>
      </div>

      <p class="text-sm text-gray-400">
        <span key={gen} class="count-pop font-medium text-gray-500">
          {visible.length}
        </span>{" "}
        products
      </p>

      {
        /* Grid — keyed on `gen` so a result-set change remounts it and the
          cards replay their staggered fade-in. */
      }
      <div key={gen} class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visible.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            index={i}
            qtyInCart={qtyById[p.id] ?? 0}
            onAdd={() => addToCart(p.id, 1)}
          />
        ))}
        {visible.length === 0 && (
          <p class="col-span-full text-center text-gray-400 py-8">
            No products match those filters.
          </p>
        )}
      </div>

      <AssistantChat
        assistant={assistant}
        hint={
          <>
            Try <em>"show electronics under $80"</em>,{" "}
            <em>"sort by price low to high"</em>, or{" "}
            <em>"add the wireless earbuds to my cart"</em>.
          </>
        }
      />
    </div>
  );
}

function ProductCard(props: {
  product: Product;
  index: number;
  qtyInCart: number;
  onAdd: () => void;
}) {
  const p = props.product;
  const out = p.stock <= 0;
  const qty = props.qtyInCart;

  // Brief "✓ Added" confirmation on the button right at the product, so it's
  // clear WHICH item went in — the header badge alone doesn't show that.
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  const handleAdd = () => {
    props.onAdd();
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <div
      class="card-in relative rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2"
      style={{ animationDelay: `${Math.min(props.index, 11) * 45}ms` }}
    >
      {/* In-cart quantity pill — pops (keyed on qty) each time it changes. */}
      {qty > 0 && (
        <span
          key={qty}
          class="added-pop absolute -top-2 -right-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 shadow"
          aria-label={`${qty} in cart`}
        >
          🛒 {qty}
        </span>
      )}
      <a href={`/product/${p.id}`} class="flex flex-col gap-2">
        <div class="text-4xl text-center py-2">{p.icon}</div>
        <div class="font-medium text-gray-900 leading-tight">{p.name}</div>
        <div class="text-xs text-gray-400">{p.category} · ★ {p.rating}</div>
      </a>
      <div class="mt-auto flex items-center justify-between pt-2">
        <span class="font-bold tabular-nums">${p.price}</span>
        <button
          type="button"
          disabled={out}
          onClick={handleAdd}
          class={`rounded-lg text-white text-sm px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            justAdded ? "bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {out ? "Out" : justAdded ? "✓ Added" : "Add"}
        </button>
      </div>
    </div>
  );
}
