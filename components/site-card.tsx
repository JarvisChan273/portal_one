import { saveCatalogAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { quietButtonClass } from "@/components/ui";

export function SiteCard({
  site,
  signedIn,
  returnTo,
  savedLinkId,
}: {
  site: { id: string; name: string; host: string; url: string; description: string };
  signedIn: boolean;
  returnTo: string;
  savedLinkId?: string;
}) {
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.host)}&sz=64`;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        {/* Favicon hosts are a fixed image service. The app server does not fetch the site. */}
        <img src={favicon} alt="" width={32} height={32} className="mt-0.5 rounded-md bg-paper" />
        <div>
          <h3 className="font-medium leading-tight">{site.name}</h3>
          <p className="text-xs text-muted">{site.host}</p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted">{site.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={site.url} target="_blank" rel="noopener noreferrer" className={quietButtonClass}>
          Open
        </a>
        {savedLinkId ? (
          <a href={`/portal#link-${savedLinkId}`} className={quietButtonClass}>
            In your portal
          </a>
        ) : signedIn ? (
          <form action={saveCatalogAction}>
            <input type="hidden" name="catalogSiteId" value={site.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton variant="tiny" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </form>
        ) : (
          <a href={`/signin?next=${encodeURIComponent(returnTo)}`} className={quietButtonClass}>
            Save
          </a>
        )}
      </div>
    </article>
  );
}
