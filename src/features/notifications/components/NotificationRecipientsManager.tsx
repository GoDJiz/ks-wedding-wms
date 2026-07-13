"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import type { NotificationRecipient } from "../domain/NotificationRecipient";
import {
  addRecipient,
  removeRecipient,
  sendTestNotification,
  sendPaymentRemindersNow,
} from "../application/notificationActions";

export function NotificationRecipientsManager({
  projectId,
  initialRecipients,
}: {
  projectId: string;
  initialRecipients: NotificationRecipient[];
}) {
  const { t, tError } = useLanguage();
  const [recipients, setRecipients] = useState(initialRecipients);
  const [lineUserId, setLineUserId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addRecipient(projectId, lineUserId, label);
      if (!result.ok) {
        setError(tError(result.code));
        return;
      }
      setRecipients((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          lineUserId,
          label: label || null,
          enabled: true,
        },
      ]);
      setLineUserId("");
      setLabel("");
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeRecipient(id);
      if (result.ok) {
        setRecipients((prev) => prev.filter((r) => r.id !== id));
      } else {
        setError(tError(result.code));
      }
    });
  };

  const handleTest = (recipientLineUserId: string) => {
    setStatus(null);
    startTransition(async () => {
      const result = await sendTestNotification(recipientLineUserId);
      if (result.ok) {
        setStatus(t.notifications.testSent);
      } else {
        setError(tError(result.code));
      }
    });
  };

  const handleSendReminders = () => {
    setStatus(null);
    setError(null);
    startTransition(async () => {
      const result = await sendPaymentRemindersNow(projectId);
      if (result.ok) {
        setStatus(
          `${t.notifications.remindersSent}: ${result.data.remindedCount}`
        );
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-4">
      <Button
        variant="secondary"
        onClick={handleSendReminders}
        disabled={isPending}
        className="w-full"
      >
        🔔 {t.notifications.sendReminders}
      </Button>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <FormField label={t.notifications.lineUserId}>
            <TextInput
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              required
            />
          </FormField>
        </div>
        <FormField label={t.notifications.label}>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormField>
        <Button type="submit" disabled={isPending}>
          {t.notifications.add}
        </Button>
      </form>

      {error && <InlineError message={error} />}
      {status && <p className="text-sm text-emerald-600">{status}</p>}

      {recipients.length === 0 ? (
        <EmptyState message={t.notifications.noRecipients} />
      ) : (
        <ul className="space-y-2">
          {recipients.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {r.label ?? r.lineUserId}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {r.lineUserId}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleTest(r.lineUserId)}
                  disabled={isPending}
                >
                  {t.notifications.test}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleRemove(r.id)}
                  disabled={isPending}
                >
                  {t.common.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
