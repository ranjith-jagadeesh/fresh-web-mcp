import { useMemo, useState } from "preact/hooks";
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
  const { addToCart } = useCart();

  const setFilter = (patch: Filters) => setFilters((f) => ({ ...f, ...patch }));

  // Tools mutate the SAME view state the manual controls use.
  const tools = useMemo(
    () => [
      ...makeCatalogTools({
        onSearch: setQuery,
        onFilter: setFilter,
        onSort: setSortBy,
      }),
      addByNameTool(),
      makeNavigateTool(),
    ],
    [],
  );
  const assistant = useAssistant(tools);

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
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
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
            class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
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
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
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
          />
          <span class="text-sm text-gray-600">In stock</span>
        </label>
      </div>

      <p class="text-sm text-gray-400">{visible.length} products</p>

      {/* Grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visible.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
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

function ProductCard(props: { product: Product; onAdd: () => void }) {
  const p = props.product;
  const out = p.stock <= 0;
  return (
    <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
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
          onClick={props.onAdd}
          class="rounded-lg bg-emerald-600 text-white text-sm px-3 py-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {out ? "Out" : "Add"}
        </button>
      </div>
    </div>
  );
}
