import { Head } from "$fresh/runtime.ts";
import { PageShell } from "../components/PageShell.tsx";
import CartPage from "../islands/CartPage.tsx";

export default function Cart() {
  return (
    <>
      <Head>
        <title>Cart · Nano Store</title>
      </Head>
      <PageShell
        current="/cart"
        title="Your cart"
        subtitle="Adjust quantities by hand or ask the assistant to update, remove, or clear items."
      >
        <CartPage />
      </PageShell>
    </>
  );
}
