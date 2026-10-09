import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="font-display text-4xl">That page is not available</h1>
      <p className="text-muted">The link may belong to another account, or it may have been removed.</p>
      <Link href="/portal" className="inline-block text-teal underline">
        Back to My Portal
      </Link>
    </div>
  );
}
