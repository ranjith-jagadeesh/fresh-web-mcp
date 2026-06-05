import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  addOrder,
  hasUsableAddress,
  type Order,
  type OrderItem,
  type ShippingAddress,
} from "../lib/orders.ts";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import {
  makeUseRecentAddressTool,
  wantsRecentAddress,
} from "../lib/tools/address.ts";
import { makePlaceOrderTool, wantsPlaceOrder } from "../lib/tools/checkout.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { useCart } from "../lib/useCart.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  email: "",
  address: "",
  city: "",
  zip: "",
};

// SubmitEvent extensions added by WebMCP's declarative API.
type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (value: unknown) => void;
};

export default function CheckoutPage() {
  const { lines, total, clearCart } = useCart();
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const formRef = useRef<HTMLFormElement>(null);

  const setField = (id: keyof ShippingAddress) => (value: string) =>
    setForm((prev) => ({ ...prev, [id]: value }));

  // Keep the latest cart + form values reachable from the stable placeOrder
  // closure below (the tools array is built once with [] deps, so it can't
  // close over the live values directly).
  const ctxRef = useRef({ lines, total, form, clearCart });
  ctxRef.current = { lines, total, form, clearCart };

  // The single source of truth for placing an order. Both the form's submit
  // handler and the imperative place_order tool call this, so clicking "Place
  // order" and asking the assistant to "place my order" do exactly the same
  // thing. Returns the message to surface (in chat or via respondWith).
  const placeOrder = useCallback((): string => {
    const { lines, total, form, clearCart } = ctxRef.current;
    if (lines.length === 0) {
      setError("Your cart is empty — add something before checking out.");
      return "Cannot place order: the cart is empty.";
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
      // Only persist a real address — never a blank object that would later
      // surface as a bogus "recent address".
      shipping: hasUsableAddress(form) ? { ...form } : undefined,
    };
    addOrder(order);
    clearCart();
    setError("");
    setConfirmation(order);
    return `Order ${order.id} placed. Total $${order.total}.`;
  }, []);

  // The assistant navigates, prefills the shipping form from the most recently
  // used address, AND can place the order. The form is ALSO a declarative
  // WebMCP tool (annotated below) for external browser agents; place_order here
  // is the imperative twin so the in-page assistant can place orders too.
  const tools = useMemo(
    () => [
      makeNavigateTool(),
      makeUseRecentAddressTool(setForm),
      makePlaceOrderTool(placeOrder),
    ],
    [placeOrder],
  );
  const fallbacks = useMemo(
    () => [
      { matches: wantsRecentAddress, tool: "use_recent_address" },
      { matches: wantsPlaceOrder, tool: "place_order" },
    ],
    [],
  );
  const assistant = useAssistant(tools, fallbacks);

  // Once an order is placed, show the confirmation briefly, then take the
  // customer to their orders page. Clears the timer if they navigate first.
  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => {
      globalThis.location.href = "/orders";
    }, 3000);
    return () => clearTimeout(t);
  }, [confirmation]);

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
    const message = placeOrder();
    // When a browser agent submitted the declarative form, hand the result back.
    if (agentEvent.agentInvoked) agentEvent.respondWith?.(message);
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
          <p class="text-xs text-emerald-600">
            Taking you to your orders…
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

        {
          /* Keep the assistant on screen through the post-order bridge — it
            otherwise vanishes for the ~3s before the redirect to /orders. */
        }
        <AssistantChat
          assistant={assistant}
          hint={
            <>
              Try <em>"open my orders"</em> or <em>"continue shopping"</em>.
            </>
          }
        />
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

        <Field
          id="fullName"
          label="Full name"
          value={form.fullName}
          onValue={setField("fullName")}
        />
        <Field
          id="email"
          label="Email address"
          type="email"
          value={form.email}
          onValue={setField("email")}
        />
        <Field
          id="address"
          label="Shipping address"
          value={form.address}
          onValue={setField("address")}
        />
        <div class="flex gap-3">
          <Field
            id="city"
            label="City"
            value={form.city}
            onValue={setField("city")}
          />
          <Field
            id="zip"
            label="ZIP / Postcode"
            value={form.zip}
            onValue={setField("zip")}
          />
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

function Field(props: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onValue: (value: string) => void;
}) {
  return (
    <label class="flex flex-col gap-1 flex-1" htmlFor={props.id}>
      <span class="text-xs text-gray-400">{props.label}</span>
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        required
        value={props.value}
        onInput={(e) => props.onValue((e.target as HTMLInputElement).value)}
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  );
}
