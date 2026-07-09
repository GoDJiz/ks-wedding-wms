"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { Select } from "@/shared/ui/Select";
import { FormActions } from "@/shared/ui/FormActions";
import { InlineError } from "@/shared/ui/StateViews";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import type { Guest, RsvpStatus } from "../domain/Guest";
import { createGuest, updateGuest } from "../application/guestActions";

export function GuestForm({
  projectId,
  guest,
  onSaved,
  onCancel,
}: {
  projectId: string;
  guest?: Guest;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t, tError } = useLanguage();
  const [name, setName] = useState(guest?.name ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [tableNo, setTableNo] = useState(guest?.tableNo ?? "");
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(
    guest?.rsvpStatus ?? "pending"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrorCode(null);

    const result = guest
      ? await updateGuest({
          guestId: guest.id,
          projectId,
          name,
          phone,
          email,
          tableNo,
          rsvpStatus,
        })
      : await createGuest({
          projectId,
          name,
          phone,
          email,
          tableNo,
          rsvpStatus,
        });

    if (result.ok) {
      onSaved();
    } else {
      setStatus("error");
      setErrorCode(result.code);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white/70 p-4"
    >
      <FormField label={t.guest.name}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormField>
      <FormField label={t.guest.phone}>
        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <FormField label={t.guest.email}>
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label={t.guest.table}>
        <TextInput
          value={tableNo}
          onChange={(e) => setTableNo(e.target.value)}
        />
      </FormField>
      <FormField label={t.guest.rsvp}>
        <Select
          value={rsvpStatus}
          onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}
        >
          <option value="pending">{t.guest.rsvpPending}</option>
          <option value="attending">{t.guest.rsvpAttending}</option>
          <option value="declined">{t.guest.rsvpDeclined}</option>
        </Select>
      </FormField>

      {status === "error" && errorCode && (
        <InlineError message={tError(errorCode)} />
      )}

      <FormActions
        onCancel={onCancel}
        saving={status === "saving"}
        saveLabel={t.common.save}
        cancelLabel={t.common.cancel}
      />
    </form>
  );
}
