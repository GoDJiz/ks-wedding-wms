import type { SupabaseClient } from "@supabase/supabase-js";
import type { Guest, RsvpStatus } from "../domain/Guest";

type GuestRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  table_no: string | null;
  rsvp_status: RsvpStatus;
  transfer_amount: number;
  envelope_amount: number;
  remark: string | null;
  source: Guest["source"];
  is_manually_modified: boolean;
};

function toDomain(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    tableNo: row.table_no,
    rsvpStatus: row.rsvp_status,
    transferAmount: Number(row.transfer_amount),
    envelopeAmount: Number(row.envelope_amount),
    remark: row.remark,
    source: row.source,
    isManuallyModified: row.is_manually_modified,
  };
}

const GUEST_SELECT =
  "id, name, phone, email, table_no, rsvp_status, transfer_amount, envelope_amount, remark, source, is_manually_modified";

export async function listGuests(
  supabase: SupabaseClient,
  projectId: string,
  {
    search,
    rsvpFilter,
    limit,
    offset,
  }: {
    search: string;
    rsvpFilter: RsvpStatus | "all";
    limit: number;
    offset: number;
  }
): Promise<{ guests: Guest[]; totalCount: number }> {
  let query = supabase
    .from("guests")
    .select(GUEST_SELECT, { count: "exact" })
    .eq("project_id", projectId);

  if (search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  if (rsvpFilter !== "all") {
    query = query.eq("rsvp_status", rsvpFilter);
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) return { guests: [], totalCount: 0 };
  return {
    guests: (data as unknown as GuestRow[]).map(toDomain),
    totalCount: count ?? 0,
  };
}

export async function insertWalkInGuest(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    name: string;
    phone: string | null;
    email: string | null;
    tableNo: string | null;
    rsvpStatus: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("guests").insert({
    project_id: input.projectId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    table_no: input.tableNo,
    rsvp_status: input.rsvpStatus,
    source: "walk_in",
  });
  return { error: error?.message ?? null };
}

export async function updateGuestRow(
  supabase: SupabaseClient,
  guestId: string,
  input: {
    name: string;
    phone: string | null;
    email: string | null;
    tableNo: string | null;
    rsvpStatus: string;
  }
): Promise<{ error: string | null }> {
  // Any manual edit through the app marks the guest protected from future
  // sync overwrites, per the Sync Strategy — this is the one place that
  // flag gets set (sync itself never sets it true).
  const { error } = await supabase
    .from("guests")
    .update({
      name: input.name,
      phone: input.phone,
      email: input.email,
      table_no: input.tableNo,
      rsvp_status: input.rsvpStatus,
      is_manually_modified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId);
  return { error: error?.message ?? null };
}

export async function deleteGuestRow(
  supabase: SupabaseClient,
  guestId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("guests").delete().eq("id", guestId);
  return { error: error?.message ?? null };
}
