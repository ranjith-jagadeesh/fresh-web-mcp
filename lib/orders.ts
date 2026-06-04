// Order history. Seeded with test data; real orders placed at checkout are
// prepended and persisted to localStorage.

import { readJson, writeJson } from "./storage.ts";

export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  status: OrderStatus;
  items: OrderItem[];
  total: number;
}

const KEY = "webmcp-orders";

// Six test orders so the page is populated on first visit.
export const SEED_ORDERS: Order[] = [
  {
    id: "ORD-1048",
    date: "2026-05-30",
    status: "Processing",
    items: [
      { id: "p10", name: "Hush Noise-Cancel Headphones", qty: 1, price: 249 },
      { id: "p11", name: "Volt USB-C Charger", qty: 2, price: 25 },
    ],
    total: 299,
  },
  {
    id: "ORD-1042",
    date: "2026-05-24",
    status: "Shipped",
    items: [
      { id: "p01", name: "Cloud Runner Shoes", qty: 1, price: 89 },
      { id: "p29", name: "Hydro Water Bottle", qty: 1, price: 24 },
    ],
    total: 113,
  },
  {
    id: "ORD-1031",
    date: "2026-05-15",
    status: "Delivered",
    items: [
      { id: "p16", name: "Cozy Pullover Hoodie", qty: 2, price: 49 },
    ],
    total: 98,
  },
  {
    id: "ORD-1025",
    date: "2026-05-09",
    status: "Delivered",
    items: [
      { id: "p13", name: "Clack Mechanical Keyboard", qty: 1, price: 109 },
      { id: "p14", name: "Glide Wireless Mouse", qty: 1, price: 39 },
      { id: "p21", name: "Stoneware Coffee Mug", qty: 2, price: 14 },
    ],
    total: 176,
  },
  {
    id: "ORD-1014",
    date: "2026-04-28",
    status: "Delivered",
    items: [
      { id: "p27", name: "Grip Yoga Mat", qty: 1, price: 34 },
      { id: "p30", name: "PowerBand Resistance Set", qty: 1, price: 27 },
    ],
    total: 61,
  },
  {
    id: "ORD-1007",
    date: "2026-04-19",
    status: "Cancelled",
    items: [
      { id: "p09", name: "Aura Smart Watch", qty: 1, price: 199 },
    ],
    total: 199,
  },
];

export function readOrders(): Order[] {
  return readJson<Order[]>(KEY, SEED_ORDERS);
}

export function addOrder(order: Order) {
  writeJson(KEY, [order, ...readOrders()]);
}

export function findOrder(query: string): Order | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const orders = readOrders();
  return orders.find((o) => o.id.toLowerCase() === q) ??
    orders.find((o) => o.id.toLowerCase().includes(q));
}
