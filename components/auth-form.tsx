"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/ui";

const initialState: FormState = { error: "" };

export function AuthForm({ mode, nextPath }: { mode: "signin" | "signup"; nextPath: string }) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction] = useActionState(action, initialState);
  const otherHref = `${mode === "signin" ? "/signup" : "/signin"}?next=${encodeURIComponent(nextPath)}`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Email</span>
        <input className={fieldClass} name="email" type="email" autoComplete="username" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Password</span>
        <input
          className={fieldClass}
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </label>
      {mode === "signup" ? (
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Confirm password</span>
          <input className={fieldClass} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </label>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-lg bg-clay-soft px-3 py-2 text-sm text-clay">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel={mode === "signin" ? "Signing in…" : "Creating account…"}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </SubmitButton>
      <p className="text-sm text-muted">
        {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
        <Link href={otherHref} className="text-teal underline">
          {mode === "signin" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
