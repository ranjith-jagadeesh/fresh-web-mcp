import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { addOrder, type Order, type OrderItem } from "../lib/orders.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

// SubmitEvent extensions added by WebMCP's declarative API.
type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (value: unknown) => void;
};

export default function CheckoutPage() {
  const { lines, total, clearCart } = useCart();
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Assistant here only navigates — placing the order is the DECLARATIVE
  // WebMCP tool (the annotated form below), handled by the browser agent.
  const tools = useMemo(() => [makeNavigateTool()], []);
  const assistant = useAssistant(tools);

  // Turn the form into a WebMCP declarative tool by annotating it. The browser
  // computes the tool's input schema from the fields and their <label>s.
  useEffect(() => {
    const f = formRef.current;
    if (!f) return;
    f.setAttribute("toolname", "place_order");
    f.setAttribute(
      "tooldescription",
      "Place the order using the customer's shipping details. Call this to " +
        "check out and buy the items currently in the cart.",
    );
  }, []);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const agentEvent = e as AgentSubmitEvent;

    if (lines.length === 0) {
      setError("Your cart is empty — add something before checking out.");
      if (agentEvent.agentInvoked) {
        agentEvent.respondWith?.("Cannot place order: the cart is empty.");
      }
      return;
    }

    const items: OrderItem[] = lines.map((l) => ({
      id: l.product.id,
      name: l.product.name,
      qty: l.qty,
      price: l.product.price,
    }));
    const order: Order = {
      id: `ORD-${Math.floor(Date.now() / 1000) % 10000}`,
      date: new Date().toISOString().slice(0, 10),
      status: "Processing",
      items,
      total,
    };

    addOrder(order);
    clearCart();
    setError("");
    setConfirmation(order);
    if (agentEvent.agentInvoked) {
      agentEvent.respondWith?.(
        `Order ${order.id} placed. Total $${order.total}.`,
      );
    }
  }

  if (confirmation) {
    return (
      <div class="flex flex-col gap-6">
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col gap-3 text-center">
          <div class="text-4xl">✅</div>
          <h2 class="text-xl font-bold text-emerald-800">Order placed!</h2>
          <p class="text-emerald-700">
            <strong>{confirmation.id}</strong> — {confirmation.items.length}
            {" "}
            item(s), ${confirmation.total}. Status: {confirmation.status}.
          </p>
          <div class="flex gap-3 justify-center pt-2">
            <a
              href="/orders"
              class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              View your orders
            </a>
            <a
              href="/"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Continue shopping
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-6">
      {lines.length > 0 && (
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-sm">
          <div class="font-semibold text-gray-700 mb-2">Order summary</div>
          {lines.map((l) => (
            <div key={l.product.id} class="flex justify-between text-gray-600">
              <span>{l.product.icon} {l.product.name} × {l.qty}</span>
              <span class="tabular-nums">${l.lineTotal}</span>
            </div>
          ))}
          <div class="flex justify-between font-bold tabular-nums border-t border-gray-100 mt-2 pt-2">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col gap-4"
      >
        <h2 class="font-semibold text-gray-800">Shipping details</h2>
        <p class="text-xs text-gray-400">
          This form is a <strong>declarative WebMCP tool</strong>{" "}
          (<code>place_order</code>) — a browser agent can fill and submit it.
        </p>

        <Field id="fullName" label="Full name" />
        <Field id="email" label="Email address" type="email" />
        <Field id="address" label="Shipping address" />
        <div class="flex gap-3">
          <Field id="city" label="City" />
          <Field id="zip" label="ZIP / Postcode" />
        </div>

        {error && <p class="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          class="rounded-lg bg-emerald-600 text-white font-medium py-2.5 hover:bg-emerald-700 transition-colors"
        >
          Place order
        </button>
      </form>

      <AssistantChat
        assistant={assistant}
        hint={
          <>
            Try <em>"go back to the cart"</em> or <em>"open my orders"</em>.
          </>
        }
      />
    </div>
  );
}

function Field(props: { id: string; label: string; type?: string }) {
  return (
    <label class="flex flex-col gap-1 flex-1" htmlFor={props.id}>
      <span class="text-xs text-gray-400">{props.label}</span>
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        required
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  );
}
