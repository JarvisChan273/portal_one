"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveCatalogAction } from "@/app/actions";
import { fieldClass } from "@/components/ui";
import type { CatalogIndexItem, SaveHit } from "@/lib/types";

type Hit =
  | { kind: "save"; id: string; title: string; host: string }
  | { kind: "catalog"; id: string; title: string; host: string; url: string };

export function QuickOpen({ saves, catalog }: { saves: SaveHit[]; catalog: CatalogIndexItem[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [] as Hit[];
    const saveHits: Hit[] = saves
      .filter((save) => `${save.title} ${save.host}`.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((save) => ({ kind: "save", id: save.id, title: save.title, host: save.host }));
    const catalogHits: Hit[] = catalog
      .filter((site) => `${site.name} ${site.host}`.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((site) => ({ kind: "catalog", id: site.id, title: site.name, host: site.host, url: site.url }));
    return [...saveHits, ...catalogHits];
  }, [catalog, query, saves]);

  function openHit(hit: Hit) {
    if (hit.kind === "save") {
      window.open(`/go/${hit.id}`, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(hit.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Quick open. Press / to focus. Your saves come first.</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => Math.min(current + 1, Math.max(hits.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && hits[active]) {
              event.preventDefault();
              openHit(hits[active]);
            } else if (event.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="Type a site you saved, or one from the catalog"
          className={fieldClass}
        />
      </label>
      {query.trim() ? (
        <ul className="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-line bg-card shadow-lg">
          {hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">No matching site.</li>
          ) : (
            hits.map((hit, index) => (
              <li key={`${hit.kind}-${hit.id}`} className={index === active ? "bg-paper" : ""}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openHit(hit)}
                    className="min-w-0 flex-1 text-left text-sm"
                  >
                    <span className="block font-medium">{hit.title}</span>
                    <span className="text-muted">{hit.host}</span>
                  </button>
                  {hit.kind === "catalog" ? (
                    <form action={saveCatalogAction}>
                      <input type="hidden" name="catalogSiteId" value={hit.id} />
                      <input type="hidden" name="returnTo" value="/portal" />
                      <button type="submit" className="text-xs text-teal">
                        Save
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-muted">Saved</span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
