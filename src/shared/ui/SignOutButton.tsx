"use client";

import { useTransition } from "react";
import { signOut } from "@/shared/session/signOut";

export function SignOutButton({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="min-h-10 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-sky-50 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
