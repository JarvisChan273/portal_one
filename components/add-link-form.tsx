"use client";

import { useActionState, useMemo, useState } from "react";
import { addLinkAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/ui";
import { hostKey, normalizeUrl } from "@/lib/url";

const initialState: FormState = { error: "" };

export function AddLinkForm({ catalog }: { catalog: Array<{ host: string; name: string }> }) {
  const [url, setUrl] = useState("");
  const [state, formAction] = useActionState(addLinkAction, initialState);
  const match = useMemo(() => {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;
    return catalog.find((site) => hostKey(site.host) === hostKey(normalized.host)) ?? null;
  }, [catalog, url]);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div>
        <h2 className="font-display text-xl">Add a link</h2>
        <p className="text-sm text-muted">Paste any http or https address. It stays in your portal.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <input
          className={fieldClass}
          name="url"
          type="url"
          required
          placeholder="https://"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <input className={fieldClass} name="title" type="text" maxLength={120} placeholder="Title (optional)" />
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
      {match ? (
        <p className="text-sm text-muted">
          This host matches <span className="font-medium text-ink">{match.name}</span> in the catalog. The exact address
          you pasted is what gets saved.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-clay">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
