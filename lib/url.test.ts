import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "@/lib/safe-next";
import { hostKey, likeContains, normalizeUrl } from "@/lib/url";

test("normalizes host case, tracking params, and trailing slashes", () => {
  const normalized = normalizeUrl("HTTPS://GitHub.COM/foo/?utm_source=newsletter&id=1#readme");
  assert.ok(normalized);
  assert.equal(normalized.url, "https://github.com/foo?id=1");
  assert.equal(normalized.host, "github.com");
});

test("keeps the slash on an origin URL", () => {
  const normalized = normalizeUrl("https://example.com");
  assert.equal(normalized?.url, "https://example.com/");
});

test("drops default ports and embedded passwords", () => {
  const normalized = normalizeUrl("https://user:secret@example.com:443/a/");
  assert.equal(normalized?.url, "https://example.com/a");
  assert.equal(normalized?.url.includes("secret"), false);
});

test("rejects non-http URLs", () => {
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("data:text/html,hi"), null);
  assert.equal(normalizeUrl("not a url"), null);
});

test("host key ignores a leading www", () => {
  assert.equal(hostKey("www.Google.com"), "google.com");
  assert.equal(hostKey("github.com"), "github.com");
});

test("like pattern escapes wildcards", () => {
  assert.equal(likeContains("100%_done"), "%100\\%\\_done%");
});

test("next paths stay on this site", () => {
  assert.equal(safeNextPath("/portal"), "/portal");
  assert.equal(safeNextPath("/explore?q=github"), "/explore?q=github");
  assert.equal(safeNextPath("https://evil.test"), "/portal");
  assert.equal(safeNextPath("//evil.test"), "/portal");
  assert.equal(safeNextPath("/%0a/evil"), "/portal");
});
