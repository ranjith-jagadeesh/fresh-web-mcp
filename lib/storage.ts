// Safe localStorage access shared by cart and orders. Guards the server (where
// localStorage is undefined) and swallows quota / parse / private-mode errors,
// so a storage failure degrades gracefully to the fallback instead of crashing
// the page.

export function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — keep the in-memory state.
  }
}
