import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { transaction } from "@/lib/db";
import type { CatalogIndexItem, CatalogSite } from "@/lib/types";
import { likeContains, normalizeUrl } from "@/lib/url";

export type CatalogFile = {
  categories: Array<{ slug: string; name: string }>;
  sites: Array<{
    name: string;
    url: string;
    description: string;
    category: string;
    featured?: boolean;
  }>;
};

type CatalogRow = {
  id: string;
  category_slug: string;
  category_name: string;
  name: string;
  url: string;
  host: string;
  description: string;
  featured: number;
};

const SITE_SQL = `
  SELECT
    catalog_sites.id AS id,
    categories.slug AS category_slug,
    categories.name AS category_name,
    catalog_sites.name AS name,
    catalog_sites.url AS url,
    catalog_sites.host AS host,
    catalog_sites.description AS description,
    catalog_sites.featured AS featured
  FROM catalog_sites
  JOIN categories ON categories.id = catalog_sites.category_id
`;

function mapSite(row: CatalogRow): CatalogSite {
  return {
    id: String(row.id),
    categorySlug: String(row.category_slug),
    categoryName: String(row.category_name),
    name: String(row.name),
    url: String(row.url),
    host: String(row.host),
    description: String(row.description),
    featured: Number(row.featured) === 1,
  };
}

export function catalogFilePath(): string {
  return path.join(process.cwd(), "catalog", "catalog.json");
}

export function readCatalogFile(filename = catalogFilePath()): CatalogFile {
  return JSON.parse(fs.readFileSync(filename, "utf8")) as CatalogFile;
}

export function importCatalog(db: AppDatabase, file: CatalogFile): { categories: number; sites: number } {
  return transaction(db, () => {
    file.categories.forEach((category, index) => {
      const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get(category.slug) as
        | { id: string }
        | undefined;
      if (existing) {
        db.prepare("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?").run(
          category.name,
          index,
          existing.id,
        );
      } else {
        db.prepare("INSERT INTO categories (id, slug, name, sort_order) VALUES (?, ?, ?, ?)").run(
          randomUUID(),
          category.slug,
          category.name,
          index,
        );
      }
    });

    const counters = new Map<string, number>();
    for (const site of file.sites) {
      const normalized = normalizeUrl(site.url);
      if (!normalized) throw new Error(`Invalid catalog URL: ${site.url}`);
      const category = db.prepare("SELECT id FROM categories WHERE slug = ?").get(site.category) as
        | { id: string }
        | undefined;
      if (!category) throw new Error(`Unknown category: ${site.category}`);
      const sortOrder = counters.get(site.category) ?? 0;
      counters.set(site.category, sortOrder + 1);
      const featured = site.featured ? 1 : 0;
      const existing = db.prepare("SELECT id FROM catalog_sites WHERE url = ?").get(normalized.url) as
        | { id: string }
        | undefined;
      if (existing) {
        db.prepare(
          `UPDATE catalog_sites
           SET category_id = ?, name = ?, host = ?, description = ?, sort_order = ?, featured = ?
           WHERE id = ?`,
        ).run(category.id, site.name, normalized.host, site.description, sortOrder, featured, existing.id);
      } else {
        db.prepare(
          `INSERT INTO catalog_sites
           (id, category_id, name, url, host, description, sort_order, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          category.id,
          site.name,
          normalized.url,
          normalized.host,
          site.description,
          sortOrder,
          featured,
        );
      }
    }

    return { categories: file.categories.length, sites: file.sites.length };
  });
}

export function ensureCatalog(db: AppDatabase, filename = catalogFilePath()): void {
  const row = db.prepare("SELECT COUNT(*) AS count FROM categories").get() as { count: number };
  if (Number(row.count) > 0) return;
  importCatalog(db, readCatalogFile(filename));
}

export function listGroupedCatalog(db: AppDatabase): Array<{ slug: string; name: string; sites: CatalogSite[] }> {
  const categories = db
    .prepare("SELECT slug, name FROM categories ORDER BY sort_order ASC")
    .all() as Array<{ slug: string; name: string }>;
  const sites = (db.prepare(`${SITE_SQL} ORDER BY categories.sort_order ASC, catalog_sites.sort_order ASC`).all() as CatalogRow[]).map(
    mapSite,
  );
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    sites: sites.filter((site) => site.categorySlug === category.slug),
  }));
}

export function listFeatured(db: AppDatabase): CatalogSite[] {
  return (
    db.prepare(
      `${SITE_SQL} WHERE catalog_sites.featured = 1 ORDER BY categories.sort_order ASC, catalog_sites.sort_order ASC`,
    ).all() as CatalogRow[]
  ).map(mapSite);
}

export function searchCatalog(
  db: AppDatabase,
  input: { categorySlug?: string | null; query?: string | null; limit?: number },
): { sites: CatalogSite[]; truncated: boolean } {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (input.categorySlug) {
    where.push("categories.slug = ?");
    params.push(input.categorySlug);
  }
  const query = input.query?.trim();
  if (query) {
    where.push("(catalog_sites.name LIKE ? ESCAPE '\\' OR catalog_sites.host LIKE ? ESCAPE '\\')");
    const pattern = likeContains(query);
    params.push(pattern, pattern);
  }
  const limit = input.limit ?? 50;
  const sql = `
    ${SITE_SQL}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY categories.sort_order ASC, catalog_sites.sort_order ASC
    LIMIT ?
  `;
  const rows = db.prepare(sql).all(...params, limit + 1) as CatalogRow[];
  return {
    sites: rows.slice(0, limit).map(mapSite),
    truncated: rows.length > limit,
  };
}

export function categoryExists(db: AppDatabase, slug: string): boolean {
  const row = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
  return Boolean(row);
}

export function listCatalogIndex(db: AppDatabase): CatalogIndexItem[] {
  return db
    .prepare("SELECT id, name, host, url FROM catalog_sites ORDER BY name ASC")
    .all() as CatalogIndexItem[];
}

export function catalogCount(db: AppDatabase): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM catalog_sites").get() as { count: number };
  return Number(row.count);
}
