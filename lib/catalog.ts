// Mock product catalog + pure query helpers (search / filter / sort). No
// backend — this is all the "data layer" the demo needs.

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  rating: number; // 0–5
  stock: number;
  icon: string; // emoji stand-in for a product image
  blurb: string;
}

export const CATEGORIES = [
  "Shoes",
  "Electronics",
  "Apparel",
  "Home",
  "Sports",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRODUCTS: Product[] = [
  {
    id: "p01",
    name: "Cloud Runner Shoes",
    category: "Shoes",
    price: 89,
    rating: 4.6,
    stock: 12,
    icon: "👟",
    blurb: "Lightweight everyday running shoes.",
  },
  {
    id: "p02",
    name: "Trail Blazer Sneakers",
    category: "Shoes",
    price: 119,
    rating: 4.4,
    stock: 7,
    icon: "🥾",
    blurb: "Grippy soles for off-road trails.",
  },
  {
    id: "p03",
    name: "Leather Loafers",
    category: "Shoes",
    price: 140,
    rating: 4.2,
    stock: 0,
    icon: "👞",
    blurb: "Smart-casual full-grain leather.",
  },
  {
    id: "p04",
    name: "Canvas Slip-ons",
    category: "Shoes",
    price: 45,
    rating: 4.0,
    stock: 30,
    icon: "👟",
    blurb: "Easy weekend slip-on style.",
  },
  {
    id: "p05",
    name: "Summit Hiking Boots",
    category: "Shoes",
    price: 165,
    rating: 4.7,
    stock: 5,
    icon: "🥾",
    blurb: "Waterproof boots for serious hikes.",
  },
  {
    id: "p06",
    name: "Coastal Sandals",
    category: "Shoes",
    price: 35,
    rating: 3.8,
    stock: 22,
    icon: "🩴",
    blurb: "Breezy sandals for warm days.",
  },

  {
    id: "p07",
    name: "Pulse Wireless Earbuds",
    category: "Electronics",
    price: 79,
    rating: 4.5,
    stock: 40,
    icon: "🎧",
    blurb: "Compact earbuds with deep bass.",
  },
  {
    id: "p08",
    name: "Boom Bluetooth Speaker",
    category: "Electronics",
    price: 59,
    rating: 4.3,
    stock: 18,
    icon: "🔊",
    blurb: "Portable speaker, 12-hour battery.",
  },
  {
    id: "p09",
    name: "Aura Smart Watch",
    category: "Electronics",
    price: 199,
    rating: 4.6,
    stock: 9,
    icon: "⌚",
    blurb: "Fitness tracking and notifications.",
  },
  {
    id: "p10",
    name: "Hush Noise-Cancel Headphones",
    category: "Electronics",
    price: 249,
    rating: 4.8,
    stock: 6,
    icon: "🎧",
    blurb: "Studio-grade active noise cancelling.",
  },
  {
    id: "p11",
    name: "Volt USB-C Charger",
    category: "Electronics",
    price: 25,
    rating: 4.1,
    stock: 50,
    icon: "🔌",
    blurb: "65W fast charging, two ports.",
  },
  {
    id: "p12",
    name: "ClearView Webcam",
    category: "Electronics",
    price: 69,
    rating: 4.0,
    stock: 14,
    icon: "📷",
    blurb: "1080p webcam with auto-light.",
  },
  {
    id: "p13",
    name: "Clack Mechanical Keyboard",
    category: "Electronics",
    price: 109,
    rating: 4.7,
    stock: 11,
    icon: "⌨️",
    blurb: "Hot-swappable tactile switches.",
  },
  {
    id: "p14",
    name: "Glide Wireless Mouse",
    category: "Electronics",
    price: 39,
    rating: 4.2,
    stock: 33,
    icon: "🖱️",
    blurb: "Silent clicks, ergonomic grip.",
  },

  {
    id: "p15",
    name: "Everyday Cotton Tee",
    category: "Apparel",
    price: 19,
    rating: 4.3,
    stock: 80,
    icon: "👕",
    blurb: "Soft breathable cotton t-shirt.",
  },
  {
    id: "p16",
    name: "Cozy Pullover Hoodie",
    category: "Apparel",
    price: 49,
    rating: 4.6,
    stock: 25,
    icon: "🧥",
    blurb: "Fleece-lined, kangaroo pocket.",
  },
  {
    id: "p17",
    name: "Classic Denim Jacket",
    category: "Apparel",
    price: 89,
    rating: 4.4,
    stock: 13,
    icon: "🧥",
    blurb: "Timeless mid-wash denim.",
  },
  {
    id: "p18",
    name: "Merino Wool Sweater",
    category: "Apparel",
    price: 99,
    rating: 4.5,
    stock: 0,
    icon: "🧶",
    blurb: "Warm, itch-free merino knit.",
  },
  {
    id: "p19",
    name: "Storm Rain Jacket",
    category: "Apparel",
    price: 79,
    rating: 4.2,
    stock: 16,
    icon: "🧥",
    blurb: "Fully seam-sealed and packable.",
  },
  {
    id: "p20",
    name: "Weekday Chino Pants",
    category: "Apparel",
    price: 55,
    rating: 4.1,
    stock: 21,
    icon: "👖",
    blurb: "Stretch chinos, tapered fit.",
  },

  {
    id: "p21",
    name: "Stoneware Coffee Mug",
    category: "Home",
    price: 14,
    rating: 4.4,
    stock: 60,
    icon: "☕",
    blurb: "Chunky handmade-look mug.",
  },
  {
    id: "p22",
    name: "Press & Brew French Press",
    category: "Home",
    price: 32,
    rating: 4.5,
    stock: 19,
    icon: "🫖",
    blurb: "Borosilicate glass, 1L.",
  },
  {
    id: "p23",
    name: "Cloud Throw Blanket",
    category: "Home",
    price: 42,
    rating: 4.6,
    stock: 23,
    icon: "🛋️",
    blurb: "Plush oversized throw.",
  },
  {
    id: "p24",
    name: "Halo Desk Lamp",
    category: "Home",
    price: 38,
    rating: 4.2,
    stock: 17,
    icon: "💡",
    blurb: "Dimmable LED with USB port.",
  },
  {
    id: "p25",
    name: "Calm Scented Candle",
    category: "Home",
    price: 22,
    rating: 4.3,
    stock: 44,
    icon: "🕯️",
    blurb: "Soy wax, 50-hour burn.",
  },
  {
    id: "p26",
    name: "Acacia Cutting Board",
    category: "Home",
    price: 29,
    rating: 4.5,
    stock: 27,
    icon: "🪵",
    blurb: "Solid acacia, juice groove.",
  },

  {
    id: "p27",
    name: "Grip Yoga Mat",
    category: "Sports",
    price: 34,
    rating: 4.5,
    stock: 35,
    icon: "🧘",
    blurb: "Non-slip 6mm cushioning.",
  },
  {
    id: "p28",
    name: "FlexCore Dumbbell Set",
    category: "Sports",
    price: 129,
    rating: 4.6,
    stock: 8,
    icon: "🏋️",
    blurb: "Adjustable 2×12.5kg pair.",
  },
  {
    id: "p29",
    name: "Hydro Water Bottle",
    category: "Sports",
    price: 24,
    rating: 4.4,
    stock: 70,
    icon: "🥤",
    blurb: "Insulated, keeps cold 24h.",
  },
  {
    id: "p30",
    name: "PowerBand Resistance Set",
    category: "Sports",
    price: 27,
    rating: 4.2,
    stock: 29,
    icon: "💪",
    blurb: "Five bands, light to heavy.",
  },
  {
    id: "p31",
    name: "Ace Tennis Racket",
    category: "Sports",
    price: 95,
    rating: 4.3,
    stock: 10,
    icon: "🎾",
    blurb: "Lightweight graphite frame.",
  },
  {
    id: "p32",
    name: "Trailguard Bike Helmet",
    category: "Sports",
    price: 64,
    rating: 4.7,
    stock: 15,
    icon: "🪖",
    blurb: "MIPS protection, 18 vents.",
  },
];

// Index built once at module load so id lookups (one per cart line on every
// cart render) are O(1) instead of scanning the whole catalog each time.
const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function findProductById(id: string): Product | undefined {
  return BY_ID.get(id);
}

// Resolve a free-text reference ("the running shoes", "p09") to a product.
export function findProduct(query: string): Product | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return PRODUCTS.find((p) => p.id.toLowerCase() === q) ??
    PRODUCTS.find((p) => p.name.toLowerCase() === q) ??
    PRODUCTS.find((p) => p.name.toLowerCase().includes(q)) ??
    PRODUCTS.find((p) => q.includes(p.name.toLowerCase()));
}

export function searchProducts(items: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((p) =>
    `${p.name} ${p.category} ${p.blurb}`.toLowerCase().includes(q)
  );
}

export interface Filters {
  category?: Category;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
}

export function filterProducts(items: Product[], f: Filters): Product[] {
  return items.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.minRating != null && p.rating < f.minRating) return false;
    if (f.inStockOnly && p.stock <= 0) return false;
    return true;
  });
}

export type SortBy = "price-asc" | "price-desc" | "rating" | "name";

export function sortProducts(items: Product[], by: SortBy): Product[] {
  const c = [...items];
  switch (by) {
    case "price-asc":
      return c.sort((a, b) => a.price - b.price);
    case "price-desc":
      return c.sort((a, b) => b.price - a.price);
    case "rating":
      return c.sort((a, b) => b.rating - a.rating);
    case "name":
      return c.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Tolerant coercion of loose model input into our enums.
export function normalizeSort(input: string): SortBy {
  const s = input.toLowerCase();
  if (/(desc|high|expensive|most)/.test(s)) return "price-desc";
  if (/(asc|low|cheap|least)/.test(s)) return "price-asc";
  if (/(rating|best|top|review)/.test(s)) return "rating";
  if (/(name|alpha|a-z)/.test(s)) return "name";
  return "price-asc";
}

export function normalizeCategory(input: string): Category | undefined {
  const s = input.trim().toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === s) ??
    CATEGORIES.find((c) =>
      c.toLowerCase().includes(s) || s.includes(c.toLowerCase())
    );
}
