// On-device Gemini Nano via Chrome's built-in Prompt API (the `LanguageModel`
// global). This is the same API the reference portfolio site uses; here we add
// tool calling so Nano can drive the page's WebMCP tools locally — no server,
// no network, the model runs on the user's device.
//
// Availability states (LanguageModel.availability()):
//   "unavailable"  — device/browser can't run it (no Prompt API, unsupported HW)
//   "downloadable" — supported, model not yet downloaded
//   "downloading"  — a download is in progress
//   "available"    — ready to use immediately

import type { WebMcpTool } from "./webmcp.ts";

export type NanoAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

// Minimal typings for the slice of the Prompt API we use.
export interface NanoSession {
  prompt: (input: string) => Promise<string>;
}

interface LanguageModelStatic {
  availability: () => Promise<NanoAvailability>;
  create: (options: {
    initialPrompts?: { role: string; content: string }[];
    tools?: Pick<
      WebMcpTool,
      "name" | "description" | "inputSchema" | "execute"
    >[];
    monitor?: (monitor: EventTarget) => void;
  }) => Promise<NanoSession>;
}

declare global {
  // The Prompt API is exposed as a global named `LanguageModel`.
  var LanguageModel: LanguageModelStatic | undefined;
}

// True when the browser exposes the on-device Prompt API.
export function nanoSupported(): boolean {
  return typeof self !== "undefined" && "LanguageModel" in self;
}

// Current availability, collapsing "unsupported" into "unavailable" so callers
// have a single signal to reason about.
export async function nanoAvailability(): Promise<NanoAvailability> {
  if (!nanoSupported()) return "unavailable";
  return await LanguageModel!.availability();
}

// Create an on-device session that can call the given tools. When the model
// decides a tool is needed it runs that tool's `execute` automatically and feeds
// the result back, so `session.prompt()` resolves to the final natural-language
// answer with the arithmetic already done by our code.
//
// Returns null when on-device inference can't be used at all ("unavailable").
// For "downloadable"/"downloading" it kicks off / attaches to the download and
// reports progress through onDownloadProgress (0..1); the returned session is
// ready once that resolves.
export async function createToolSession(
  tools: WebMcpTool[],
  systemPrompt: string,
  onDownloadProgress?: (loaded: number) => void,
): Promise<NanoSession | null> {
  if (!nanoSupported()) return null;
  if ((await LanguageModel!.availability()) === "unavailable") return null;

  // Ground the model on the EXACT tool names/params. Today's on-device Prompt
  // API doesn't reliably surface the `tools` list to the model (it also doesn't
  // auto-run them), so without this Nano invents plausible-but-wrong tools like
  // `calculator(expression=…)`. The manifest is generated from the tools array —
  // never hand-maintained — so the behavior prompt stays tool-agnostic.
  const system = `${systemPrompt}\n\n${toolManifest(tools)}`;

  return await LanguageModel!.create({
    initialPrompts: [{ role: "system", content: system }],
    // Strip WebMCP-only fields (annotations) the Prompt API doesn't expect.
    tools: tools.map(({ name, description, inputSchema, execute }) => ({
      name,
      description,
      inputSchema,
      execute,
    })),
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        onDownloadProgress?.((event as ProgressEvent).loaded);
      });
    },
  });
}

// Build a compact, generated spec of the available tools so the model is
// grounded on their exact names and parameters. Derived from the tools array,
// so the stable behavior prompt never has to list tools.
function toolManifest(tools: WebMcpTool[]): string {
  const lines = tools.map((t) => {
    const params = Object.entries(t.inputSchema.properties)
      .map(([name, schema]) =>
        `${name}: ${(schema as { type?: string }).type ?? "any"}`
      )
      .join(", ");
    return `- ${t.name}(${params}) — ${t.description}`;
  });
  const first = tools[0];
  const example = first
    ? `${first.name}(${
      Object.keys(first.inputSchema.properties).map((k) => `${k}=…`).join(", ")
    })`
    : "toolName(arg=value)";
  return [
    "Call ONLY these tools, by their exact names — never invent another tool:",
    ...lines,
    `To call a tool, output ONLY the call on a single line, e.g. ${example}`,
  ].join("\n");
}

export interface ParsedToolCall {
  tool: WebMcpTool;
  args: Record<string, unknown>;
}

// Today's on-device Prompt API often does NOT auto-run a tool — it leaks the
// model's chosen call back as text, e.g. a ```tool_code add(19, 23)``` block or a
// JSON blob. This parses that text into a concrete {tool, args} so the caller can
// run the tool itself. When auto-execution does work, the answer is plain prose
// with no call to find and this returns null — so it's safe either way.
export function parseToolCall(
  text: string,
  tools: WebMcpTool[],
): ParsedToolCall | null {
  return parseToolCalls(text, tools)[0] ?? null;
}

// Like parseToolCall, but returns EVERY call found in the response, in the order
// they appear. A single message can ask for several things ("use my address and
// place the order"), and the model sometimes emits both calls — the caller runs
// them in sequence. Returns [] when there's no call to find.
export function parseToolCalls(
  text: string,
  tools: WebMcpTool[],
): ParsedToolCall[] {
  // 1) JSON form: {"name": "add", "arguments": { ... }} (also parameters/args).
  //    Greedy (first "{" to last "}") so a nested arguments object is included.
  //    The model emits at most one JSON object, so this yields a single call.
  const jsonMatch = text.includes('"name"') ? text.match(/\{[\s\S]*\}/) : null;
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      const tool = tools.find((t) => t.name === obj.name);
      if (tool) {
        const args = obj.arguments ?? obj.parameters ?? obj.args ?? {};
        return [{ tool, args }];
      }
    } catch { /* not valid JSON — fall through to call syntax */ }
  }

  // 2) Call syntax: name(...) anywhere, incl. inside a ```tool_code``` fence or a
  //    print(...) wrapper. Collect every occurrence of every tool, then return
  //    them ordered by where they appear so a multi-step request runs in order.
  const found: { index: number; call: ParsedToolCall }[] = [];
  for (const tool of tools) {
    const re = new RegExp(tool.name + "\\s*\\(([^)]*)\\)", "g");
    for (let m = re.exec(text); m; m = re.exec(text)) {
      found.push({ index: m.index, call: { tool, args: parseArgs(m[1], tool) } });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.call);
}

// Parse the inside of name(...) into named args. Handles positional ("19, 23"),
// key=value and key: value, mapping positionals onto the schema's property order.
function parseArgs(raw: string, tool: WebMcpTool): Record<string, unknown> {
  const keys = Object.keys(tool.inputSchema.properties);

  // A single string-typed parameter (e.g. a comma-separated list like
  // summarize("4, 8, 15")) must NOT be split on its commas — take the whole
  // payload, dropping only a leading `name=`/`name:` and surrounding quotes.
  if (keys.length === 1) {
    const only = keys[0];
    const prop = tool.inputSchema.properties[only] as { type?: string };
    if (prop?.type === "string") {
      const kv = raw.match(
        new RegExp(`^["']?${only}["']?\\s*[:=]\\s*([\\s\\S]+)$`),
      );
      return { [only]: stripQuotes(kv ? kv[1] : raw) };
    }
  }

  const args: Record<string, unknown> = {};
  splitTopLevel(raw).forEach((part, i) => {
    const kv = part.match(/^["']?(\w+)["']?\s*[:=]\s*([\s\S]+)$/);
    if (kv) args[kv[1]] = stripQuotes(kv[2]);
    else if (keys[i]) args[keys[i]] = stripQuotes(part);
  });
  return args;
}

// Split on commas that are NOT inside quotes, dropping the quote characters, so
// quoted values containing commas survive as one argument.
function splitTopLevel(raw: string): string[] {
  const parts: string[] = [];
  let cur = "", quote = "";
  for (const ch of raw) {
    if (quote) ch === quote ? (quote = "") : (cur += ch);
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ",") (parts.push(cur), (cur = ""));
    else cur += ch;
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function stripQuotes(s: string): string {
  return s.trim().replace(/^["']|["']$/g, "");
}
