// WebMCP — Chrome 146 early-preview imperative API (navigator.modelContext).
//
// WebMCP lets a page publish structured "tools" that in-browser AI agents (Gemini
// in Chrome, the Model Context Tool Inspector extension, etc.) can call directly,
// instead of screen-scraping the UI. This module wraps the imperative half of the
// API: registerTool + an AbortSignal for cleanup.
//
// Requires Chrome 146+ with chrome://flags/#enable-webmcp-testing set to Enabled.

// A single tool definition. The same shape is accepted by the on-device Prompt
// API (see lib/nano.ts), so tools are defined once and shared by both.
//   - inputSchema is JSON-Schema describing the arguments.
//   - execute receives the validated args and returns a value handed back to the
//     calling agent as the tool's output (a string is the simplest choice).
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (
        tool: WebMcpTool,
        options?: { signal?: AbortSignal },
      ) => void;
    };
  }
}

// True when this browser exposes the WebMCP imperative API.
export function webmcpSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.modelContext;
}

// Register every tool with the browser agent and return a cleanup function that
// unregisters them all (WebMCP unregisters via the AbortSignal passed at
// registration). Safe to call when the API is missing — it just returns a no-op,
// so callers never have to branch on support.
export function registerTools(tools: WebMcpTool[]): () => void {
  if (!webmcpSupported()) return () => {};
  const controller = new AbortController();
  for (const tool of tools) {
    navigator.modelContext!.registerTool(tool, { signal: controller.signal });
  }
  return () => controller.abort();
}
