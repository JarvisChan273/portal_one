import { importCatalog, readCatalogFile } from "@/lib/catalog";
import { database } from "@/lib/database";

const result = importCatalog(database(), readCatalogFile());
console.log(`Catalog updated: ${result.categories} categories, ${result.sites} sites.`);
