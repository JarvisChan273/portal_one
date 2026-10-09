import { ensureCatalog } from "@/lib/catalog";
import { getDb, type AppDatabase } from "@/lib/db";

const globalStore = globalThis as unknown as { protaloneSeeded?: boolean };

export function database(): AppDatabase {
  const db = getDb();
  if (!globalStore.protaloneSeeded) {
    ensureCatalog(db);
    globalStore.protaloneSeeded = true;
  }
  return db;
}
