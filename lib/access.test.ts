import assert from "node:assert/strict";
import test from "node:test";
import { authenticate, createSession, createUser, findUserBySessionToken } from "@/lib/accounts";
import { importCatalog, listCatalogIndex, searchCatalog } from "@/lib/catalog";
import { createDatabase } from "@/lib/db";
import { hashSessionToken } from "@/lib/tokens";
import {
  createGroup,
  deleteGroup,
  listSavedLinks,
  moveLinkToGroup,
  recordOpen,
  saveCatalogSite,
  saveLink,
} from "@/lib/portal";

function memoryDb() {
  return createDatabase(":memory:");
}

test("two accounts cannot read, move, or open each other's saves", () => {
  const db = memoryDb();
  const ada = createUser(db, "Ada@Example.com", "correct horse");
  const byron = createUser(db, "byron@example.com", "battery staple");
  assert.equal(ada.email, "ada@example.com");
  assert.equal(authenticate(db, "ada@example.com", "wrong-password"), null);
  assert.equal(authenticate(db, "ada@example.com", "correct horse")?.id, ada.id);

  const adaLink = saveLink(db, ada.id, "https://example.com/ada?utm_source=x");
  const byronLink = saveLink(db, byron.id, "https://example.com/byron");
  assert.deepEqual(
    listSavedLinks(db, byron.id).map((link) => link.id),
    [byronLink.id],
  );

  assert.throws(() => moveLinkToGroup(db, byron.id, adaLink.id, null), /not in your portal/);
  assert.equal(recordOpen(db, byron.id, adaLink.id), null);
  assert.equal(listSavedLinks(db, ada.id)[0]?.openCount, 0);

  const opened = recordOpen(db, ada.id, adaLink.id);
  assert.equal(opened?.url, "https://example.com/ada");
  assert.equal(listSavedLinks(db, ada.id)[0]?.openCount, 1);

  const adaGroup = createGroup(db, ada.id, "Work");
  assert.throws(() => moveLinkToGroup(db, byron.id, byronLink.id, adaGroup), /not in your portal/);
  assert.equal(listSavedLinks(db, byron.id)[0]?.groupId, null);
});

test("the same normalized URL is saved once per account", () => {
  const db = memoryDb();
  const user = createUser(db, "one@example.com", "correct horse");
  const first = saveLink(db, user.id, "https://Example.com/docs/");
  const second = saveLink(db, user.id, "https://example.com/docs?utm_medium=email");
  assert.equal(second.existed, true);
  assert.equal(second.id, first.id);
  assert.equal(listSavedLinks(db, user.id).length, 1);
});

test("deleting a group keeps the saves and drops the group", () => {
  const db = memoryDb();
  const user = createUser(db, "groups@example.com", "correct horse");
  const groupId = createGroup(db, user.id, "Personal");
  const saved = saveLink(db, user.id, "https://example.com/keep");
  moveLinkToGroup(db, user.id, saved.id, groupId);
  deleteGroup(db, user.id, groupId);
  const [link] = listSavedLinks(db, user.id);
  assert.equal(link?.groupId, null);
  assert.equal(link?.url, "https://example.com/keep");
});

test("sessions store a hash and expire", () => {
  const db = memoryDb();
  const user = createUser(db, "session@example.com", "correct horse");
  const token = createSession(db, user.id);
  const stored = db.prepare("SELECT token_hash FROM sessions WHERE user_id = ?").get(user.id) as {
    token_hash: string;
  };
  assert.notEqual(stored.token_hash, token);
  assert.equal(stored.token_hash, hashSessionToken(token));
  assert.equal(findUserBySessionToken(db, token)?.email, user.email);

  db.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?").run("2000-01-01T00:00:00.000Z", user.id);
  assert.equal(findUserBySessionToken(db, token, new Date("2026-01-01T00:00:00.000Z")), null);
});

test("catalog search treats percent as a literal", () => {
  const db = memoryDb();
  importCatalog(db, {
    categories: [{ slug: "dev", name: "Developer" }],
    sites: [
      {
        name: "100% Stack",
        url: "https://example.com/percent",
        description: "A literal percent",
        category: "dev",
      },
      {
        name: "GitHub",
        url: "https://github.com",
        description: "Code hosting",
        category: "dev",
      },
    ],
  });
  const user = createUser(db, "catalog@example.com", "correct horse");
  const indexed = listCatalogIndex(db);
  assert.equal(Object.getPrototypeOf(indexed[0]), Object.prototype);
  const found = searchCatalog(db, { query: "%" });
  assert.deepEqual(
    found.sites.map((site) => site.name),
    ["100% Stack"],
  );
  const saved = saveCatalogSite(db, user.id, found.sites[0].id);
  assert.equal(saved.existed, false);
  assert.equal(saveCatalogSite(db, user.id, found.sites[0].id).existed, true);
});

test("deleting a user removes that user's portal", () => {
  const db = memoryDb();
  const user = createUser(db, "gone@example.com", "correct horse");
  createSession(db, user.id);
  createGroup(db, user.id, "Work");
  saveLink(db, user.id, "https://example.com/gone");
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  const links = db.prepare("SELECT COUNT(*) AS count FROM saved_links").get() as { count: number };
  const groups = db.prepare("SELECT COUNT(*) AS count FROM link_groups").get() as { count: number };
  const sessions = db.prepare("SELECT COUNT(*) AS count FROM sessions").get() as { count: number };
  assert.equal(Number(links.count), 0);
  assert.equal(Number(groups.count), 0);
  assert.equal(Number(sessions.count), 0);
});
