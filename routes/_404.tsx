import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 · Nano Store</title>
      </Head>
      <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div class="flex flex-col items-center text-center">
          <span class="text-5xl mb-4">🛍️</span>
          <p class="text-sm font-semibold text-emerald-600">Nano Store</p>
          <h1 class="mt-2 text-3xl font-bold text-gray-900">
            404 — page not found
          </h1>
          <p class="mt-3 text-gray-600 max-w-sm">
            That aisle doesn't exist. The product or page you were looking for
            may have moved or sold out.
          </p>
          <a
            href="/"
            class="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Back to the store
          </a>
        </div>
      </div>
    </>
  );
}
