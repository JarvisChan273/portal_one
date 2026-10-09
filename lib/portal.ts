import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { transaction } from "@/lib/db";
import { PortalError } from "@/lib/errors";
import type { PortalGroup, SavedLink, SaveHit } from "@/lib/types";
import { hostFromUrl, normalizeUrl } from "@/lib/url";

type LinkRow = {
  id: string;
  title: string;
  url: string;
  pinned: number;
  group_id: string | null;
  sort_order: number;
  open_count: number;
  last_opened_at: string | null;
  catalog_site_id: string | null;
};

export type SaveResult = {
  id: string;
  existed: boolean;
};

function mapLink(row: LinkRow): SavedLink {
  return {
    id: String(row.id),
    title: String(row.title),
    url: String(row.url),
    host: hostFromUrl(String(row.url)),
    pinned: Number(row.pinned) === 1,
    groupId: row.group_id == null ? null : String(row.group_id),
    sortOrder: Number(row.sort_order),
    openCount: Number(row.open_count),
    lastOpenedAt: row.last_opened_at == null ? null : String(row.last_opened_at),
    catalogSiteId: row.catalog_site_id == null ? null : String(row.catalog_site_id),
  };
}

function requireOwnedLink(db: AppDatabase, userId: string, linkId: string): LinkRow {
  const row = db
    .prepare(
      `SELECT id, title, url, pinned, group_id, sort_order, open_count, last_opened_at, catalog_site_id
       FROM saved_links WHERE id = ? AND user_id = ?`,
    )
    .get(linkId, userId) as LinkRow | undefined;
  if (!row) throw new PortalError("That saved site is not in your portal.");
  return row;
}

function nextSort(db: AppDatabase, userId: string, groupId: string | null): number {
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM saved_links WHERE user_id = ? AND group_id IS ?")
    .get(userId, groupId) as { max_sort: number };
  return Number(row.max_sort) + 1;
}

export function listSavedLinks(db: AppDatabase, userId: string): SavedLink[] {
  return (
    db
      .prepare(
        `SELECT id, title, url, pinned, group_id, sort_order, open_count, last_opened_at, catalog_site_id
         FROM saved_links WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC`,
      )
      .all(userId) as LinkRow[]
  ).map(mapLink);
}

export function savedCatalogLinks(db: AppDatabase, userId: string): Record<string, string> {
  const rows = db
    .prepare("SELECT id, catalog_site_id FROM saved_links WHERE user_id = ? AND catalog_site_id IS NOT NULL")
    .all(userId) as Array<{ id: string; catalog_site_id: string }>;
  return Object.fromEntries(rows.map((row) => [String(row.catalog_site_id), String(row.id)]));
}

export function listSaveHits(db: AppDatabase, userId: string): SaveHit[] {
  return listSavedLinks(db, userId).map((link) => ({
    id: link.id,
    title: link.title,
    host: link.host,
  }));
}

export function loadPortal(db: AppDatabase, userId: string): {
  groups: PortalGroup[];
  ungrouped: SavedLink[];
  pinned: SavedLink[];
  recent: SavedLink[];
} {
  const links = listSavedLinks(db, userId);
  const groups = (
    db
      .prepare("SELECT id, name, sort_order FROM link_groups WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC")
      .all(userId) as Array<{ id: string; name: string; sort_order: number }>
  ).map((group) => ({
    id: String(group.id),
    name: String(group.name),
    sortOrder: Number(group.sort_order),
    links: links.filter((link) => link.groupId === group.id),
  }));

  const recent = [...links].sort((a, b) => {
    if (a.lastOpenedAt === b.lastOpenedAt) return a.title.localeCompare(b.title);
    if (!a.lastOpenedAt) return 1;
    if (!b.lastOpenedAt) return -1;
    return a.lastOpenedAt < b.lastOpenedAt ? 1 : -1;
  });

  return {
    groups,
    ungrouped: links.filter((link) => link.groupId === null),
    pinned: links.filter((link) => link.pinned),
    recent,
  };
}

export function saveLink(
  db: AppDatabase,
  userId: string,
  rawUrl: string,
  requestedTitle?: string,
  catalogSiteId?: string | null,
): SaveResult {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) throw new PortalError("Enter a valid http or https URL.");

  const existing = db
    .prepare("SELECT id FROM saved_links WHERE user_id = ? AND normalized_url = ?")
    .get(userId, normalized.url) as { id: string } | undefined;
  if (existing) return { id: String(existing.id), existed: true };

  const title = (requestedTitle?.trim() || normalized.host).slice(0, 120);
  const id = randomUUID();
  const groupId = null;
  db.prepare(
    `INSERT INTO saved_links
     (id, user_id, catalog_site_id, group_id, title, url, normalized_url, pinned, sort_order, open_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)`,
  ).run(
    id,
    userId,
    catalogSiteId ?? null,
    groupId,
    title,
    normalized.url,
    normalized.url,
    nextSort(db, userId, null),
    new Date().toISOString(),
  );
  return { id, existed: false };
}

export function saveCatalogSite(db: AppDatabase, userId: string, catalogSiteId: string): SaveResult {
  const site = db.prepare("SELECT id, name, url FROM catalog_sites WHERE id = ?").get(catalogSiteId) as
    | { id: string; name: string; url: string }
    | undefined;
  if (!site) throw new PortalError("That site is not in the catalog.");
  return saveLink(db, userId, String(site.url), String(site.name), String(site.id));
}

export function createGroup(db: AppDatabase, userId: string, nameInput: string): string {
  const name = nameInput.trim();
  if (!name) throw new PortalError("Give the group a name.");
  if (name.length > 40) throw new PortalError("Use a group name of 40 characters or fewer.");
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM link_groups WHERE user_id = ?")
    .get(userId) as { max_sort: number };
  const id = randomUUID();
  db.prepare("INSERT INTO link_groups (id, user_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    userId,
    name,
    Number(row.max_sort) + 1,
    new Date().toISOString(),
  );
  return id;
}

export function renameGroup(db: AppDatabase, userId: string, groupId: string, nameInput: string): void {
  const name = nameInput.trim();
  if (!name) throw new PortalError("Give the group a name.");
  if (name.length > 40) throw new PortalError("Use a group name of 40 characters or fewer.");
  const result = db.prepare("UPDATE link_groups SET name = ? WHERE id = ? AND user_id = ?").run(name, groupId, userId);
  if (Number(result.changes) === 0) throw new PortalError("That group is not in your portal.");
}

export function deleteGroup(db: AppDatabase, userId: string, groupId: string): void {
  const result = db.prepare("DELETE FROM link_groups WHERE id = ? AND user_id = ?").run(groupId, userId);
  if (Number(result.changes) === 0) throw new PortalError("That group is not in your portal.");
}

export function moveGroup(db: AppDatabase, userId: string, groupId: string, direction: -1 | 1): void {
  const groups = db
    .prepare("SELECT id, sort_order FROM link_groups WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(userId) as Array<{ id: string; sort_order: number }>;
  swapSort(db, "link_groups", userId, groups, groupId, direction);
}

export function setPinned(db: AppDatabase, userId: string, linkId: string, pinned: boolean): void {
  const result = db
    .prepare("UPDATE saved_links SET pinned = ? WHERE id = ? AND user_id = ?")
    .run(pinned ? 1 : 0, linkId, userId);
  if (Number(result.changes) === 0) throw new PortalError("That saved site is not in your portal.");
}

export function deleteLink(db: AppDatabase, userId: string, linkId: string): void {
  const result = db.prepare("DELETE FROM saved_links WHERE id = ? AND user_id = ?").run(linkId, userId);
  if (Number(result.changes) === 0) throw new PortalError("That saved site is not in your portal.");
}

export function moveLink(db: AppDatabase, userId: string, linkId: string, direction: -1 | 1): void {
  const link = requireOwnedLink(db, userId, linkId);
  const siblings = db
    .prepare(
      `SELECT id, sort_order FROM saved_links
       WHERE user_id = ? AND group_id IS ?
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all(userId, link.group_id) as Array<{ id: string; sort_order: number }>;
  swapSort(db, "saved_links", userId, siblings, linkId, direction);
}

export function moveLinkToGroup(db: AppDatabase, userId: string, linkId: string, groupId: string | null): void {
  requireOwnedLink(db, userId, linkId);
  if (groupId) {
    const group = db.prepare("SELECT id FROM link_groups WHERE id = ? AND user_id = ?").get(groupId, userId);
    if (!group) throw new PortalError("That group is not in your portal.");
  }
  const sortOrder = nextSort(db, userId, groupId);
  const result = db
    .prepare("UPDATE saved_links SET group_id = ?, sort_order = ? WHERE id = ? AND user_id = ?")
    .run(groupId, sortOrder, linkId, userId);
  if (Number(result.changes) === 0) throw new PortalError("That saved site is not in your portal.");
}

export function recordOpen(db: AppDatabase, userId: string, linkId: string): { url: string } | null {
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE saved_links SET open_count = open_count + 1, last_opened_at = ? WHERE id = ? AND user_id = ?")
    .run(now, linkId, userId);
  if (Number(result.changes) === 0) return null;
  const row = db.prepare("SELECT url FROM saved_links WHERE id = ? AND user_id = ?").get(linkId, userId) as
    | { url: string }
    | undefined;
  if (!row) return null;
  const url = String(row.url);
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  return { url };
}

function swapSort(
  db: AppDatabase,
  table: "link_groups" | "saved_links",
  userId: string,
  rows: Array<{ id: string; sort_order: number }>,
  id: string,
  direction: -1 | 1,
): void {
  const index = rows.findIndex((row) => row.id === id);
  const neighbor = rows[index + direction];
  if (index < 0 || !neighbor) return;
  const current = rows[index];
  transaction(db, () => {
    db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ? AND user_id = ?`).run(
      neighbor.sort_order,
      current.id,
      userId,
    );
    db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ? AND user_id = ?`).run(
      current.sort_order,
      neighbor.id,
      userId,
    );
  });
}
