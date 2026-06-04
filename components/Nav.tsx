import { PAGES } from "../lib/tools/navigation.ts";

// Top nav, driven by the PAGES registry (only pages flagged inNav appear).
export function Nav(props: { current: string }) {
  return (
    <nav class="flex gap-4 text-sm">
      {PAGES.filter((p) => p.inNav).map((p) => (
        <a
          key={p.path}
          href={p.path}
          class={p.path === props.current
            ? "font-semibold text-emerald-700"
            : "text-gray-500 hover:text-gray-800"}
        >
          {p.label}
        </a>
      ))}
    </nav>
  );
}
