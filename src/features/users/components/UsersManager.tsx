"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { Select } from "@/shared/ui/Select";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
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
  const { t, tError } = useLanguage();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleLabel = (r: string) =>
    ({
      owner: t.users.roleOwner,
      admin: t.users.roleAdmin,
      finance: t.users.roleFinance,
      organizer: t.users.roleOrganizer,
      viewer: t.users.roleViewer,
    })[r] ?? r;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await inviteUser({ email, role, projectId });
      if (!result.ok) {
        setError(tError(result.code));
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
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <FormField label={t.users.email} htmlFor="invite-email">
            <TextInput
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label={t.users.role} htmlFor="invite-role">
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.saving : t.common.add}
        </Button>
      </form>

      {error && <InlineError message={error} />}

      {users.length === 0 ? (
        <EmptyState message={t.users.noUsers} />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{u.email}</p>
                <p className="text-xs text-slate-500">
                  {roleLabel(u.invitedRole)}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => handleRemove(u.id)}
                disabled={isPending}
              >
                {t.common.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
