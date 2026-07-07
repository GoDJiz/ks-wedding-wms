"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/Button";
import type { WhitelistedUser } from "../users.types";
import { inviteUser, removeUser } from "../application/usersActions";

const ROLES = ["owner", "admin", "finance", "organizer", "viewer"] as const;

export function UsersManager({
  projectId,
  initialUsers,
}: {
  projectId: string;
  initialUsers: WhitelistedUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await inviteUser({ email, role, projectId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setUsers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          email,
          invitedRole: role,
          createdAt: new Date().toISOString(),
        },
      ]);
      setEmail("");
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeUser(id);
      if (result.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Role
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            className="rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : "Add"}
        </Button>
      </form>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">{u.email}</p>
              <p className="text-xs text-slate-400">{u.invitedRole}</p>
            </div>
            <Button
              variant="danger"
              onClick={() => handleRemove(u.id)}
              disabled={isPending}
            >
              Remove
            </Button>
          </li>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-slate-400">No whitelisted users yet.</p>
        )}
      </ul>
    </div>
  );
}
