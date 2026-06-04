import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import { findProductById } from "../../lib/catalog.ts";
import { PageShell } from "../../components/PageShell.tsx";
import ProductDetailPage from "../../islands/ProductDetailPage.tsx";

export default function ProductRoute(props: PageProps) {
  const product = findProductById(props.params.id);
  return (
    <>
      <Head>
        <title>{product ? `${product.name} · Nano Store` : "Not found"}</title>
      </Head>
      <PageShell current="/">
        {product
          ? <ProductDetailPage product={product} />
          : (
            <div class="text-center py-12 text-gray-400">
              Product not found.{" "}
              <a href="/" class="text-emerald-700 hover:underline">
                Back to products
              </a>
            </div>
          )}
      </PageShell>
    </>
  );
}
