import { addToCart, clearCart, removeFromCart, setQuantity } from "../cart.ts";
import { findProduct, type Product } from "../catalog.ts";
import type { WebMcpTool } from "../webmcp.ts";
import { argString, qtyArg } from "./args.ts";

// add_to_cart by product name — used on the catalog (listing) page where many
// products are visible.
export function addByNameTool(): WebMcpTool {
  return {
    name: "add_to_cart",
    description:
      "Add one or more of a product to the cart by name. Use whenever the user " +
      "wants to add, buy, purchase, get, or put an item in their cart — " +
      "including with a quantity (e.g. \"add two hiking boots\" → " +
      "add_to_cart(product=\"hiking boots\", quantity=2)).",
    inputSchema: {
      type: "object",
      properties: {
        product: {
          type: "string",
          description: "The product name (or id) to add.",
        },
        quantity: {
          type: "number",
          description: "How many to add. Defaults to 1.",
        },
      },
      required: ["product"],
    },
    execute: (args) => {
      const product = argString(args, "product");
      const p = findProduct(product);
      if (!p) return `No product found matching "${product}".`;
      const qty = qtyArg(args.quantity);
      addToCart(p.id, qty);
      return `Added ${qty} × ${p.name} to the cart.`;
    },
    annotations: { readOnlyHint: false },
  };
}

// add_to_cart that always adds THIS page's product — used on the detail page,
// where the product is unambiguous.
export function addThisProductTool(product: Product): WebMcpTool {
  return {
    name: "add_to_cart",
    description: `Add the current product (${product.name}) to the cart.`,
    inputSchema: {
      type: "object",
      properties: {
        quantity: {
          type: "number",
          description: "How many to add. Defaults to 1.",
        },
      },
      required: [],
    },
    execute: (args) => {
      const qty = qtyArg(args.quantity);
      addToCart(product.id, qty);
      return `Added ${qty} × ${product.name} to the cart.`;
    },
    annotations: { readOnlyHint: false },
  };
}

// Cart management — used on the cart page.
export function cartManagementTools(): WebMcpTool[] {
  return [
    {
      name: "update_quantity",
      description: "Set how many of a product are in the cart.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "The product name or id.",
          },
          quantity: {
            type: "number",
            description: "The new quantity (0 removes it).",
          },
        },
        required: ["product", "quantity"],
      },
      execute: (args) => {
        const product = argString(args, "product");
        const p = findProduct(product);
        if (!p) return `No product found matching "${product}".`;
        const qty = qtyArg(args.quantity, 0);
        setQuantity(p.id, qty);
        return qty === 0
          ? `Removed ${p.name} from the cart.`
          : `Set ${p.name} to ${qty}.`;
      },
      annotations: { readOnlyHint: false },
    },
    {
      name: "remove_from_cart",
      description: "Remove a product from the cart entirely.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "The product name or id.",
          },
        },
        required: ["product"],
      },
      execute: (args) => {
        const product = argString(args, "product");
        const p = findProduct(product);
        if (!p) return `No product found matching "${product}".`;
        removeFromCart(p.id);
        return `Removed ${p.name} from the cart.`;
      },
      annotations: { readOnlyHint: false },
    },
    {
      name: "clear_cart",
      description: "Empty the entire cart.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: () => {
        clearCart();
        return "Cart cleared.";
      },
      annotations: { readOnlyHint: false },
    },
  ];
}
