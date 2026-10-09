const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

export type NormalizedUrl = {
  url: string;
  host: string;
};

export function normalizeUrl(input: string): NormalizedUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;

  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  const kept = new URLSearchParams();
  for (const [key, value] of parsed.searchParams) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      kept.append(key, value);
    }
  }
  parsed.search = kept.toString();

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return { url: parsed.toString(), host: parsed.hostname };
}

export function hostKey(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function likeContains(input: string): string {
  const escaped = input.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}
