import type { ComponentChildren } from "preact";
import { StoreHeader } from "./StoreHeader.tsx";

// Common page chrome: gray canvas, centered column, store header, optional
// title block. Every route wraps its content in this.
export function PageShell(props: {
  current: string;
  title?: string;
  subtitle?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class="min-h-screen bg-gray-50 px-4 py-8">
      <div class="mx-auto max-w-3xl flex flex-col gap-6">
        <StoreHeader current={props.current} />
        {props.title && (
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-bold text-gray-900">{props.title}</h1>
            {props.subtitle && (
              <p class="text-gray-500 text-sm">{props.subtitle}</p>
            )}
          </div>
        )}
        {props.children}
      </div>
    </div>
  );
}
