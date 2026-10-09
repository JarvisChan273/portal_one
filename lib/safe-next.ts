export function safeNextPath(value: string | null | undefined, fallback = "/portal"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\n") || value.includes("\r")) return fallback;
  if (/%0a|%0d/i.test(value)) return fallback;
  return value;
}
