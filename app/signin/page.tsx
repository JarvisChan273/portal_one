import { AuthForm } from "@/components/auth-form";
import { redirectIfSignedIn } from "@/lib/current-user";
import { safeNextPath } from "@/lib/safe-next";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  await redirectIfSignedIn(nextPath);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-card p-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Each email is its own portal. Signing in with a different email shows that account&apos;s sites, not the ones
          you see now.
        </p>
      </div>
      <AuthForm mode="signin" nextPath={nextPath} />
    </div>
  );
}
