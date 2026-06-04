import { Head } from "$fresh/runtime.ts";
import { PageShell } from "../components/PageShell.tsx";
import CheckoutPage from "../islands/CheckoutPage.tsx";

export default function Checkout() {
  return (
    <>
      <Head>
        <title>Checkout · Nano Store</title>
      </Head>
      <PageShell
        current="/checkout"
        title="Checkout"
        subtitle="The order form is a declarative WebMCP tool an agent can fill and submit."
      >
        <CheckoutPage />
      </PageShell>
    </>
  );
}
