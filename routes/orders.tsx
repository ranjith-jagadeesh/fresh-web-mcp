import { Head } from "$fresh/runtime.ts";
import { PageShell } from "../components/PageShell.tsx";
import OrdersPage from "../islands/OrdersPage.tsx";

export default function Orders() {
  return (
    <>
      <Head>
        <title>Orders · Nano Store</title>
      </Head>
      <PageShell
        current="/orders"
        title="Your orders"
        subtitle="Order history (seeded test data). Ask the assistant to track or reorder."
      >
        <OrdersPage />
      </PageShell>
    </>
  );
}
