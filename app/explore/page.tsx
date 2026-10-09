import { addUrlAction } from "@/app/actions";
import { SiteCard } from "@/components/site-card";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass, quietButtonClass } from "@/components/ui";
import { catalogCount, categoryExists, listFeatured, listGroupedCatalog, searchCatalog } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/current-user";
import { database } from "@/lib/database";
import { savedCatalogLinks } from "@/lib/portal";
import { normalizeUrl } from "@/lib/url";

export const metadata = { title: "Explore" };

function explorePath(category: string, query: string): string {
  const search = new URLSearchParams();
  if (category) search.set("category", category);
  if (query) search.set("q", query);
  const value = search.toString();
  return value ? `/explore?${value}` : "/explore";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const category = (params.category ?? "").trim();
  const query = (params.q ?? "").trim().slice(0, 200);
  const error = (params.error ?? "").slice(0, 200);
  const db = database();
  const user = await getCurrentUser();
  const knownCategory = category ? categoryExists(db, category) : false;
  const directory = listGroupedCatalog(db);
  const grouped = !query && !category ? directory : [];
  const featured = !query && !category ? listFeatured(db) : [];
  const flat = query || category ? searchCatalog(db, { categorySlug: knownCategory ? category : category || null, query, limit: 50 }) : null;
  const returnTo = explorePath(category, query);
  const saved = user ? savedCatalogLinks(db, user.id) : {};
  const total = catalogCount(db);
  const categories = directory.map((entry) => ({ slug: entry.slug, name: entry.name, count: entry.sites.length }));
  const addable = query && flat && flat.sites.length === 0 ? normalizeUrl(query) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Explore</h1>
        <p className="mt-2 max-w-2xl text-muted">
          A short catalog of {total} sites. Save the ones you actually open. Anything you save stays in your own portal.
        </p>
      </div>
      <form action="/explore" className="flex flex-col gap-2 sm:flex-row">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input className={fieldClass} name="q" defaultValue={query} placeholder="Search by name or site" />
        <button className={quietButtonClass} type="submit">
          Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <a href="/explore" className={!category ? "rounded-full bg-ink px-3 py-1 text-sm text-paper" : "rounded-full border border-line bg-card px-3 py-1 text-sm"}>
          All
        </a>
        {categories.map((entry) => (
          <a
            key={entry.slug}
            href={`/explore?category=${entry.slug}`}
            className={
              category === entry.slug
                ? "rounded-full bg-ink px-3 py-1 text-sm text-paper"
                : "rounded-full border border-line bg-card px-3 py-1 text-sm"
            }
          >
            {entry.name}
          </a>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-clay-soft px-3 py-2 text-sm text-clay">
          {error}
        </p>
      ) : null}
      {category && !knownCategory ? <p className="text-sm text-muted">That category is not in the catalog.</p> : null}
      {flat && flat.sites.length === 0 && (!category || knownCategory) ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-5">
          <p className="text-sm">Nothing in the catalog matches that search.</p>
          {addable ? (
            <div className="mt-3">
              {user ? (
                <form action={addUrlAction}>
                  <input type="hidden" name="url" value={addable.url} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton pendingLabel="Saving…">Add this URL to my portal</SubmitButton>
                </form>
              ) : (
                <a className={quietButtonClass} href={`/signin?next=${encodeURIComponent(returnTo)}`}>
                  Sign in to add this URL
                </a>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {flat && flat.truncated ? <p className="text-sm text-muted">Showing the first 50 matches.</p> : null}
      {featured.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Start here</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((site) => (
              <SiteCard key={site.id} site={site} signedIn={Boolean(user)} returnTo={returnTo} savedLinkId={saved[site.id]} />
            ))}
          </div>
        </section>
      ) : null}
      {flat ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flat.sites.map((site) => (
            <SiteCard key={site.id} site={site} signedIn={Boolean(user)} returnTo={returnTo} savedLinkId={saved[site.id]} />
          ))}
        </div>
      ) : (
        grouped.map((entry) => (
          <section key={entry.slug} className="space-y-3">
            <h2 className="font-display text-2xl">{entry.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entry.sites.map((site) => (
                <SiteCard key={site.id} site={site} signedIn={Boolean(user)} returnTo={returnTo} savedLinkId={saved[site.id]} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
