import Link from "next/link";
import { createGroupAction, deleteGroupAction, moveGroupAction, renameGroupAction } from "@/app/actions";
import { AddLinkForm } from "@/components/add-link-form";
import { QuickOpen } from "@/components/quick-open";
import { SavedLinkRow } from "@/components/saved-link-row";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass, quietButtonClass } from "@/components/ui";
import { listCatalogIndex } from "@/lib/catalog";
import { requireUser } from "@/lib/current-user";
import { database } from "@/lib/database";
import { listSaveHits, loadPortal } from "@/lib/portal";
import type { PortalGroup, SavedLink } from "@/lib/types";

export const metadata = { title: "My Portal" };

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "recent" ? "recent" : "manual";
  const notice = params.notice === "saved" || params.notice === "already-saved" ? params.notice : "";
  const error = (params.error ?? "").slice(0, 200);
  const user = await requireUser();
  const db = database();
  const portal = loadPortal(db, user.id);
  const saves = listSaveHits(db, user.id);
  const catalog = listCatalogIndex(db);
  const groups = portal.groups.map((group) => ({ id: group.id, name: group.name }));
  const empty = saves.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">My Portal</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Signed in as {user.email}. This list belongs to this account. Sign out and sign in with another email to open
            a different portal.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/portal" className={view === "manual" ? "rounded-full bg-ink px-3 py-1 text-paper" : "rounded-full border border-line bg-card px-3 py-1"}>
            Manual
          </Link>
          <Link href="/portal?view=recent" className={view === "recent" ? "rounded-full bg-ink px-3 py-1 text-paper" : "rounded-full border border-line bg-card px-3 py-1"}>
            Recent
          </Link>
        </div>
      </div>
      {notice === "saved" ? <p className="rounded-lg bg-card px-3 py-2 text-sm">Saved to your portal.</p> : null}
      {notice === "already-saved" ? (
        <p className="rounded-lg bg-card px-3 py-2 text-sm">That site is already in your portal. Here it is.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-clay-soft px-3 py-2 text-sm text-clay">
          {error}
        </p>
      ) : null}
      <QuickOpen saves={saves} catalog={catalog} />
      <AddLinkForm catalog={catalog.map((site) => ({ host: site.host, name: site.name }))} />
      <form action={createGroupAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="view" value={view} />
        <label className="sr-only" htmlFor="new-group">
          New group name
        </label>
        <input id="new-group" name="name" maxLength={40} placeholder="New group, such as Work" className={fieldClass} />
        <SubmitButton variant="quiet" pendingLabel="Adding…">
          Add group
        </SubmitButton>
      </form>
      {empty ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-6">
          <p className="font-medium">Save a few sites you open every day.</p>
          <p className="mt-1 text-sm text-muted">Start from the catalog, or paste an address above.</p>
          <a href="/explore" className={`${quietButtonClass} mt-4`}>
            Explore the catalog
          </a>
        </div>
      ) : null}
      {view === "recent" ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Recent</h2>
          <div className="space-y-2">
            {portal.recent.map((link) => (
              <SavedLinkRow key={link.id} link={link} groups={groups} view={view} showOrder={false} />
            ))}
          </div>
        </section>
      ) : (
        <ManualPortal groups={portal.groups} ungrouped={portal.ungrouped} pinned={portal.pinned} groupOptions={groups} />
      )}
    </div>
  );
}

function ManualPortal({
  groups,
  ungrouped,
  pinned,
  groupOptions,
}: {
  groups: PortalGroup[];
  ungrouped: SavedLink[];
  pinned: SavedLink[];
  groupOptions: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="space-y-8">
      {pinned.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Pinned</h2>
          <div className="space-y-2">
            {pinned.map((link) => (
              <SavedLinkRow
                key={`pin-${link.id}`}
                link={link}
                groups={groupOptions}
                view="manual"
                showOrder={false}
                anchor={false}
                domId={`pin-${link.id}`}
              />
            ))}
          </div>
        </section>
      ) : null}
      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl">{group.name}</h2>
            <form action={renameGroupAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="view" value="manual" />
              <label className="sr-only" htmlFor={`rename-${group.id}`}>
                Rename {group.name}
              </label>
              <input id={`rename-${group.id}`} name="name" defaultValue={group.name} maxLength={40} className={`${fieldClass} w-40`} />
              <SubmitButton variant="tiny">Rename</SubmitButton>
            </form>
            <form action={moveGroupAction}>
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="direction" value="up" />
              <input type="hidden" name="view" value="manual" />
              <SubmitButton variant="tiny">Up</SubmitButton>
            </form>
            <form action={moveGroupAction}>
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="direction" value="down" />
              <input type="hidden" name="view" value="manual" />
              <SubmitButton variant="tiny">Down</SubmitButton>
            </form>
            <form action={deleteGroupAction}>
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="view" value="manual" />
              <SubmitButton variant="danger">Delete group</SubmitButton>
            </form>
          </div>
          {group.links.length === 0 ? <p className="text-sm text-muted">No sites in this group yet.</p> : null}
          <div className="space-y-2">
            {group.links.map((link) => (
              <SavedLinkRow key={link.id} link={link} groups={groupOptions} view="manual" showOrder />
            ))}
          </div>
        </section>
      ))}
      {ungrouped.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Ungrouped</h2>
          <div className="space-y-2">
            {ungrouped.map((link) => (
              <SavedLinkRow key={link.id} link={link} groups={groupOptions} view="manual" showOrder />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
