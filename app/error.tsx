"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <button type="button" onClick={() => reset()} className="rounded-lg bg-teal px-3 py-2 text-sm text-white">
        Try again
      </button>
    </div>
  );
}
