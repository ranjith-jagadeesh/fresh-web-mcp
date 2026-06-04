import { Head } from "$fresh/runtime.ts";
import { PageShell } from "../components/PageShell.tsx";

export default function About() {
  return (
    <>
      <Head>
        <title>About · Nano Store</title>
      </Head>
      <PageShell current="/about" title="About this store">
        <section class="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-3 text-gray-700">
          <p>
            Nano Store is a demo of <strong>WebMCP</strong>{" "}
            — a proposed web standard where a page publishes structured tools
            that AI agents can call directly, instead of guessing their way
            around the UI. The assistant on each page runs on Chrome's on-device
            {" "}
            <strong>Gemini Nano</strong> — no server, no network.
          </p>
          <p>
            Each page registers{" "}
            <strong>only the tools it needs</strong>, plus a shared{" "}
            <strong>navigate</strong> tool:
          </p>
          <ul class="list-disc list-inside flex flex-col gap-1">
            <li>
              <strong>Products</strong> — <code>search_products</code>,{" "}
              <code>filter_products</code>, <code>sort_products</code>,{" "}
              <code>add_to_cart</code>
            </li>
            <li>
              <strong>Product detail</strong> — <code>add_to_cart</code>
            </li>
            <li>
              <strong>Cart</strong> — <code>update_quantity</code>,{" "}
              <code>remove_from_cart</code>, <code>clear_cart</code>
            </li>
            <li>
              <strong>Checkout</strong> — <code>place_order</code> (a{" "}
              <em>declarative</em> WebMCP form)
            </li>
            <li>
              <strong>Orders</strong> — <code>track_order</code>,{" "}
              <code>reorder</code>
            </li>
            <li>
              <strong>Every page</strong> — <code>navigate</code>
            </li>
          </ul>
          <p>
            One stable behavior prompt steers the model; each page hands it a
            different tool array, and a generated tool manifest grounds Nano on
            the exact tool names — so the prompt never grows as tools are added.
          </p>
        </section>
      </PageShell>
    </>
  );
}
