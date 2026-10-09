import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function Header({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          Protalone
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/explore" className="hover:text-teal">
            Explore
          </Link>
          {email ? (
            <Link href="/portal" className="hover:text-teal">
              My Portal
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email ? (
            <form action={signOutAction} className="flex items-center gap-3">
              <span className="max-w-48 truncate text-sm text-muted" title={email}>
                {email}
              </span>
              <SubmitButton variant="quiet" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          ) : (
            <Link href="/signin" className="rounded-lg bg-ink px-3 py-2 text-sm text-paper">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
