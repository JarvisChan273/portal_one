"use client";

import { useFormStatus } from "react-dom";
import { dangerButtonClass, quietButtonClass, solidButtonClass, tinyButtonClass } from "@/components/ui";

const classes = {
  solid: solidButtonClass,
  quiet: quietButtonClass,
  tiny: tinyButtonClass,
  danger: dangerButtonClass,
};

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "solid",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof classes;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classes[variant]}>
      {pending ? pendingLabel : children}
    </button>
  );
}
