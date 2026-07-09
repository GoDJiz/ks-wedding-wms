"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { TextInput } from "@/shared/ui/TextInput";
import { Select } from "@/shared/ui/Select";
import { EmptyState, InlineError, PageSkeleton } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { Guest, RsvpStatus } from "../domain/Guest";
import { getGuests, deleteGuest } from "../application/guestActions";
import { GuestForm } from "./GuestForm";

export function GuestPageClient({
  projectId,
  initialGuests,
  initialTotalCount,
  pageSize,
}: {
  projectId: string;
  initialGuests: Guest[];
  initialTotalCount: number;
  pageSize: number;
}) {
  const { t, tError } = useLanguage();
  const [guests, setGuests] = useState(initialGuests);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | "all">("all");
  const [editingGuest, setEditingGuest] = useState<Guest | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchGuests = (
    nextPage: number,
    nextSearch: string,
    nextFilter: RsvpStatus | "all"
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await getGuests(
        projectId,
        nextPage,
        nextSearch,
        nextFilter
      );
      if (result.ok) {
        setGuests(result.data.guests);
        setTotalCount(result.data.totalCount);
        setPage(nextPage);
      } else {
        setError(tError(result.code));
      }
    });
  };

  const rsvpLabel = (s: RsvpStatus) =>
    ({
      pending: t.guest.rsvpPending,
      attending: t.guest.rsvpAttending,
      declined: t.guest.rsvpDeclined,
    })[s];

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteGuest(id);
      if (result.ok) {
        fetchGuests(page, search, rsvpFilter);
      } else {
        setError(tError(result.code));
      }
    });
  };

  if (editingGuest) {
    return (
      <GuestForm
        projectId={projectId}
        guest={editingGuest === "new" ? undefined : editingGuest}
        onSaved={() => {
          setEditingGuest(null);
          fetchGuests(0, search, rsvpFilter);
        }}
        onCancel={() => setEditingGuest(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <TextInput
            placeholder={t.guest.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchGuests(0, e.target.value, rsvpFilter);
            }}
          />
        </div>
        <Select
          value={rsvpFilter}
          onChange={(e) => {
            const v = e.target.value as RsvpStatus | "all";
            setRsvpFilter(v);
            fetchGuests(0, search, v);
          }}
        >
          <option value="all">{t.guest.filterAll}</option>
          <option value="pending">{t.guest.rsvpPending}</option>
          <option value="attending">{t.guest.rsvpAttending}</option>
          <option value="declined">{t.guest.rsvpDeclined}</option>
        </Select>
        <Button onClick={() => setEditingGuest("new")}>
          {t.guest.addGuest}
        </Button>
      </div>

      {error && <InlineError message={error} />}

      {isPending ? (
        <PageSkeleton />
      ) : guests.length === 0 ? (
        <EmptyState message={t.guest.noGuests} />
      ) : (
        <>
          <ul className="space-y-2">
            {guests.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => setEditingGuest(g)}
                >
                  <p className="text-sm font-medium text-slate-700">
                    {g.name}{" "}
                    {g.isManuallyModified && (
                      <span title={t.guest.locked}>🔒</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rsvpLabel(g.rsvpStatus)} ·{" "}
                    {g.source === "walk_in"
                      ? t.guest.sourceWalkIn
                      : t.guest.sourceSheet}
                    {g.tableNo ? ` · ${t.guest.table} ${g.tableNo}` : ""}
                  </p>
                  {(g.transferAmount > 0 || g.envelopeAmount > 0) && (
                    <p className="text-xs text-slate-500">
                      {formatCurrency(g.transferAmount || g.envelopeAmount)}
                    </p>
                  )}
                </button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(g.id)}
                  disabled={isPending}
                >
                  {t.common.delete}
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => fetchGuests(page - 1, search, rsvpFilter)}
              disabled={page === 0 || isPending}
            >
              ←
            </Button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => fetchGuests(page + 1, search, rsvpFilter)}
              disabled={page + 1 >= totalPages || isPending}
            >
              →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
