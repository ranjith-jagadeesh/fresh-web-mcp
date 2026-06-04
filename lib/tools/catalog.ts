import {
  CATEGORIES,
  type Filters,
  normalizeCategory,
  normalizeSort,
  type SortBy,
} from "../catalog.ts";
import type { WebMcpTool } from "../webmcp.ts";

// Callbacks into the products page's view state. The tools don't hold the
// product list — they just tell the page how to change what's shown.
export interface CatalogHandlers {
  onSearch: (query: string) => void;
  onFilter: (patch: Filters) => void;
  onSort: (by: SortBy) => void;
}

export function makeCatalogTools(h: CatalogHandlers): WebMcpTool[] {
  return [
    {
      name: "search_products",
      description:
        "Search products by keyword in their name or category. Use when the " +
        "user names a product or a kind of product.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: 'Search keywords, e.g. "headphones".',
          },
        },
        required: ["query"],
      },
      execute: (args) => {
        const q = String(args.query ?? Object.values(args)[0] ?? "");
        h.onSearch(q);
        return `Showing results for "${q}".`;
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "filter_products",
      description:
        "Filter the visible products by category, maximum price, minimum " +
        "rating, and/or in-stock only. Any of these can be combined.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [...CATEGORIES],
            description: "Restrict to a category.",
          },
          maxPrice: {
            type: "number",
            description: "Only items at or below this price.",
          },
          minRating: {
            type: "number",
            description: "Only items with at least this star rating (0–5).",
          },
          inStockOnly: {
            type: "boolean",
            description: "If true, hide out-of-stock items.",
          },
        },
        required: [],
      },
      execute: (args) => {
        const patch: Filters = {};
        if (args.category != null && String(args.category) !== "") {
          patch.category = normalizeCategory(String(args.category));
        }
        if (args.maxPrice != null && String(args.maxPrice) !== "") {
          patch.maxPrice = Number(args.maxPrice);
        }
        if (args.minRating != null && String(args.minRating) !== "") {
          patch.minRating = Number(args.minRating);
        }
        if (args.inStockOnly != null) {
          patch.inStockOnly = args.inStockOnly === true ||
            String(args.inStockOnly).toLowerCase() === "true";
        }
        h.onFilter(patch);
        return "Filter applied.";
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "sort_products",
      description: "Sort the visible products by price, rating, or name.",
      inputSchema: {
        type: "object",
        properties: {
          by: {
            type: "string",
            enum: ["price-asc", "price-desc", "rating", "name"],
            description: "Sort order.",
          },
        },
        required: ["by"],
      },
      execute: (args) => {
        const by = normalizeSort(
          String(args.by ?? Object.values(args)[0] ?? ""),
        );
        h.onSort(by);
        return `Sorted by ${by}.`;
      },
      annotations: { readOnlyHint: true },
    },
  ];
}
