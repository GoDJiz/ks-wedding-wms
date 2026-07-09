"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { Guest, RsvpStatus } from "../domain/Guest";
import {
  createGuestSchema,
  type CreateGuestInput,
  updateGuestSchema,
  type UpdateGuestInput,
} from "../guest.types";
import {
  listGuests,
  insertWalkInGuest,
  updateGuestRow,
  deleteGuestRow,
} from "../infrastructure/guestRepository";

const PAGE_SIZE = 30;

export async function getGuests(
  projectId: string,
  page: number,
  search: string,
  rsvpFilter: RsvpStatus | "all"
): Promise<
  ActionResult<{ guests: Guest[]; totalCount: number; pageSize: number }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { guests, totalCount } = await listGuests(supabase, projectId, {
      search,
      rsvpFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    return { ok: true, data: { guests, totalCount, pageSize: PAGE_SIZE } };
  } catch (err) {
    await logErrorServer({
      module: "features/guest/getGuests",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function createGuest(
  input: CreateGuestInput
): Promise<ActionResult<null>> {
  const parsed = createGuestSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertWalkInGuest(supabase, {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      tableNo: parsed.data.tableNo || null,
      rsvpStatus: parsed.data.rsvpStatus,
    });

    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/guests");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/guest/createGuest",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateGuest(
  input: UpdateGuestInput
): Promise<ActionResult<null>> {
  const parsed = updateGuestSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await updateGuestRow(supabase, parsed.data.guestId, {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      tableNo: parsed.data.tableNo || null,
      rsvpStatus: parsed.data.rsvpStatus,
    });

    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/guests");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/guest/updateGuest",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function deleteGuest(
  guestId: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await deleteGuestRow(supabase, guestId);
    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/guests");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/guest/deleteGuest",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
