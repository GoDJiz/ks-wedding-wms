"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { Select } from "@/shared/ui/Select";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import type { PaymentAccount } from "../domain/PaymentAccount";
import {
  createPaymentAccount,
  removePaymentAccount,
} from "../application/paymentAccountsActions";

export function PaymentAccountsManager({
  projectId,
  initialAccounts,
}: {
  projectId: string;
  initialAccounts: PaymentAccount[];
}) {
  const { t, tError } = useLanguage();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "cash">("bank");
  const [owner, setOwner] = useState<"bride" | "groom" | "joint">("joint");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ownerLabel = (o: PaymentAccount["owner"]) =>
    ({
      bride: t.paymentAccounts.ownerBride,
      groom: t.paymentAccounts.ownerGroom,
      joint: t.paymentAccounts.ownerJoint,
    })[o ?? "joint"];

  const typeLabel = (ty: PaymentAccount["type"]) =>
    ty === "bank" ? t.paymentAccounts.typeBank : t.paymentAccounts.typeCash;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPaymentAccount({
        projectId,
        name,
        type,
        owner,
      });
      if (!result.ok) {
        setError(tError(result.code));
        return;
      }
      setAccounts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name,
          type,
          owner,
          createdAt: new Date().toISOString(),
        },
      ]);
      setName("");
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removePaymentAccount(id);
      if (result.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <FormField label={t.paymentAccounts.name} htmlFor="account-name">
            <TextInput
              id="account-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label={t.paymentAccounts.type} htmlFor="account-type">
          <Select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value as "bank" | "cash")}
          >
            <option value="bank">{t.paymentAccounts.typeBank}</option>
            <option value="cash">{t.paymentAccounts.typeCash}</option>
          </Select>
        </FormField>
        <FormField label={t.paymentAccounts.owner} htmlFor="account-owner">
          <Select
            id="account-owner"
            value={owner}
            onChange={(e) =>
              setOwner(e.target.value as "bride" | "groom" | "joint")
            }
          >
            <option value="bride">{t.paymentAccounts.ownerBride}</option>
            <option value="groom">{t.paymentAccounts.ownerGroom}</option>
            <option value="joint">{t.paymentAccounts.ownerJoint}</option>
          </Select>
        </FormField>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.saving : t.common.add}
        </Button>
      </form>

      {error && <InlineError message={error} />}

      {accounts.length === 0 ? (
        <EmptyState message={t.paymentAccounts.noAccounts} />
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {typeLabel(a.type)} · {ownerLabel(a.owner)}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => handleRemove(a.id)}
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
