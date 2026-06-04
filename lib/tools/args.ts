// Lenient coercion of the loose arguments small on-device models emit. They
// sometimes use the wrong key name or pass only a positional value, so these
// helpers fall back tolerantly instead of failing — keeping every tool's
// argument handling consistent in one place.

// A string argument by key, falling back to the first provided value. Returns
// "" when nothing usable was given (never the literal "undefined").
export function argString(args: Record<string, unknown>, key: string): string {
  const v = args[key] ?? Object.values(args)[0];
  return v == null ? "" : String(v);
}

// A non-negative integer quantity. `fallback` is returned when the value is
// missing or not a positive number — 1 for "add" (a bare add means one), 0 for
// "update" (0 removes the item).
export function qtyArg(value: unknown, fallback = 1): number {
  const n = Math.floor(Number(value));
  return n > 0 ? n : fallback;
}
