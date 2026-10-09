import {
  deleteLinkAction,
  moveLinkAction,
  moveLinkToGroupAction,
  setPinnedAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { SavedLink } from "@/lib/types";

function openedLabel(link: SavedLink): string | null {
  if (!link.lastOpenedAt) return link.openCount > 0 ? `Opened ${link.openCount} times` : null;
  const date = new Date(link.lastOpenedAt);
  if (Number.isNaN(date.getTime())) return null;
  const when = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `Last opened ${when}`;
}

export function SavedLinkRow({
  link,
  groups,
  view,
  showOrder,
  anchor = true,
  domId,
}: {
  link: SavedLink;
  groups: Array<{ id: string; name: string }>;
  view: "manual" | "recent";
  showOrder: boolean;
  anchor?: boolean;
  domId?: string;
}) {
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.host)}&sz=64`;
  const meta = openedLabel(link);
  return (
    <article
      id={anchor ? `link-${link.id}` : undefined}
      className="portal-link scroll-mt-24 rounded-2xl border border-line bg-card p-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <img src={favicon} alt="" width={28} height={28} className="rounded-md bg-paper" />
        <div className="min-w-40 flex-1">
          <a href={`/go/${link.id}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-teal">
            {link.title}
          </a>
          <p className="text-xs text-muted">
            {link.host}
            {meta ? ` · ${meta}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={setPinnedAction}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="pinned" value={link.pinned ? "0" : "1"} />
            <input type="hidden" name="view" value={view} />
            <SubmitButton variant="tiny">{link.pinned ? "Unpin" : "Pin"}</SubmitButton>
          </form>
          {showOrder ? (
            <>
              <form action={moveLinkAction}>
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="direction" value="up" />
                <input type="hidden" name="view" value={view} />
                <SubmitButton variant="tiny">Up</SubmitButton>
              </form>
              <form action={moveLinkAction}>
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="direction" value="down" />
                <input type="hidden" name="view" value={view} />
                <SubmitButton variant="tiny">Down</SubmitButton>
              </form>
            </>
          ) : null}
          <form action={moveLinkToGroupAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="view" value={view} />
            <label className="sr-only" htmlFor={`group-${domId ?? link.id}`}>
              Group for {link.title}
            </label>
            <select
              id={`group-${domId ?? link.id}`}
              name="groupId"
              defaultValue={link.groupId ?? ""}
              className="rounded-md border border-line bg-card px-2 py-1 text-xs"
            >
              <option value="">Ungrouped</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <SubmitButton variant="tiny">Move</SubmitButton>
          </form>
          <form action={deleteLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="view" value={view} />
            <SubmitButton variant="danger">Remove</SubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
