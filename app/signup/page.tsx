import { AuthForm } from "@/components/auth-form";
import { redirectIfSignedIn } from "@/lib/current-user";
import { safeNextPath } from "@/lib/safe-next";

export const metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  await redirectIfSignedIn(nextPath);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-card p-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-muted">
          Use an email and a password of at least 8 characters. The password is stored as a salted hash. A second email
          creates a second, separate portal.
        </p>
      </div>
      <AuthForm mode="signup" nextPath={nextPath} />
    </div>
  );
}
