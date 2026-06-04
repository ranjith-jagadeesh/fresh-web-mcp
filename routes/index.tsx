import { Head } from "$fresh/runtime.ts";
import { PageShell } from "../components/PageShell.tsx";
import ProductsPage from "../islands/ProductsPage.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Nano Store · Products</title>
      </Head>
      <PageShell
        current="/"
        title="Products"
        subtitle="Search, filter, and sort by hand — or ask the on-device assistant, which calls the same WebMCP tools."
      >
        <ProductsPage />
      </PageShell>
    </>
  );
}
