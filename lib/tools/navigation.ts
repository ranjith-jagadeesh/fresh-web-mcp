import type { WebMcpTool } from "../webmcp.ts";
import { argString } from "./args.ts";

// Central registry of pages. The navigate tool, the intent fallback, and the
// nav bar all read this, so adding a page in one place wires up all three.
export interface PageDef {
  slug: string;
  path: string;
  label: string;
  inNav?: boolean; // shown in the top nav bar
  // Questions that should route here even if the model doesn't emit navigate.
  intent?: RegExp;
}

// Order matters for intentDestination (first match wins): checkout is listed
// before orders so "place my order" routes to checkout, not order history.
export const PAGES: PageDef[] = [
  {
    slug: "home",
    path: "/",
    label: "Products",
    inNav: true,
    intent: /\b(products?|shop|store|catalog|browse|home)\b/i,
  },
  {
    slug: "cart",
    path: "/cart",
    label: "Cart",
    inNav: true,
    intent: /\b(cart|basket|my bag)\b/i,
  },
  {
    slug: "checkout",
    path: "/checkout",
    label: "Checkout",
    inNav: false,
    intent: /\b(checkout|check\s*out|place\s+.*order|pay|buy\s+now)\b/i,
  },
  {
    slug: "orders",
    path: "/orders",
    label: "Orders",
    inNav: true,
    intent: /\b(orders?|order history|my orders|purchases|past orders)\b/i,
  },
  {
    slug: "about",
    path: "/about",
    label: "About",
    inNav: true,
    intent:
      /\b(who\s+are\s+you|what\s+do\s+you\s+do|what\s+can\s+you\s+do|about\s+(you|us|this)|your\s+background)\b/i,
  },
];

// The cross-cutting tool registered on every page so the agent can route
// anywhere. Description lists destinations — generated from PAGES.
export function makeNavigateTool(): WebMcpTool {
  return {
    name: "navigate",
    description: "Navigate the browser to one of this store's pages: " +
      PAGES.map((p) => `"${p.slug}" (${p.label})`).join(", ") +
      ". Use whenever the user wants to open or go to a different page.",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: PAGES.map((p) => p.slug),
          description: "Which page to open.",
        },
      },
      required: ["destination"],
    },
    execute: (args) => {
      const raw = argString(args, "destination").toLowerCase();
      const page = PAGES.find((p) => raw.includes(p.slug)) ??
        PAGES.find((p) => p.slug === "home")!;
      if (typeof globalThis.location !== "undefined") {
        setTimeout(() => (globalThis.location.href = page.path), 700);
      }
      return `Taking you to the ${page.label} page…`;
    },
    annotations: { readOnlyHint: false },
  };
}

export function intentDestination(text: string): PageDef | null {
  return PAGES.find((p) => p.intent?.test(text)) ?? null;
}
