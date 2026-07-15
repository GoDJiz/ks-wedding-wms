"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import { notifyProjectRecipients } from "@/shared/notifications/notifyRecipients";
import type {
  ReimbursementRequest,
  ReimbursementFileInfo,
  ReimbursementStatus,
} from "../domain/ReimbursementRequest";
import {
  approveRequestSchema,
  type ApproveRequestInput,
  rejectRequestSchema,
  type RejectRequestInput,
} from "../reimbursement.types";
import {
  listReimbursements,
  getReimbursementById,
  findPossibleDuplicate,
  approveRequest,
  rejectRequest,
  updateRequestStatus,
} from "../infrastructure/reimbursementRepository";

export async function getReimbursements(
  status: ReimbursementStatus | "all"
): Promise<ActionResult<ReimbursementRequest[]>> {
  try {
    const { projectId } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const requests = await listReimbursements(supabase, projectId, status);
    return { ok: true, data: requests };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/getReimbursements",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function getReimbursementDetail(requestId: string): Promise<
  ActionResult<{
    request: ReimbursementRequest;
    files: ReimbursementFileInfo[];
    fileUrls: Record<string, string>;
    isPossibleDuplicate: boolean;
  }>
> {
  try {
    const { projectId } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const { request, files } = await getReimbursementById(supabase, requestId);

    if (!request) return { ok: false, code: "not_found" };

    const isPossibleDuplicate = await findPossibleDuplicate(
      supabase,
      projectId,
      request.requestedAmount,
      request.purchaseDate,
      requestId
    );

    // Signed URLs generated server-side (Owner/Admin/Finance only, per the
    // storage_private_buckets_select_managers policy) — never a public URL.
    // Parallelized since each file's signed URL is independent of the others.
    const fileUrls: Record<string, string> = {};
    await Promise.all(
      files.map(async (file) => {
        const bucket = file.fileType === "slip" ? "slips" : "receipts";
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(file.storagePath, 60 * 10);
        if (data) fileUrls[file.id] = data.signedUrl;
      })
    );

    return {
      ok: true,
      data: { request, files, fileUrls, isPossibleDuplicate },
    };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/getReimbursementDetail",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function approveReimbursement(
  input: ApproveRequestInput
): Promise<ActionResult<null>> {
  const parsed = approveRequestSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const { user } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const { request } = await getReimbursementById(
      supabase,
      parsed.data.requestId
    );
    if (!request) return { ok: false, code: "not_found" };

    const { error } = await approveRequest(supabase, {
      requestId: parsed.data.requestId,
      projectId: parsed.data.projectId,
      categoryId: parsed.data.categoryId,
      paymentAccountId: parsed.data.paymentAccountId,
      approvedAmount: parsed.data.approvedAmount,
      partialApprovalReason: parsed.data.partialApprovalReason || null,
      reviewedBy: user.id,
      purchaseDate: request.purchaseDate,
      paymentMethod: request.paymentMethod,
      description: request.description,
    });

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    notifyProjectRecipients(supabase, parsed.data.projectId, {
      title: "Reimbursement Approved",
      summary: `${request.requesterName}'s request was approved`,
      amountText: `${parsed.data.approvedAmount.toFixed(2)} THB`,
    }).catch(() => {
      // swallow — a notification failure must never affect the approval itself
    });

    revalidatePath("/reimbursement");
    revalidatePath("/budget");
    revalidatePath("/expense");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/approveReimbursement",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function rejectReimbursement(
  input: RejectRequestInput
): Promise<ActionResult<null>> {
  const parsed = rejectRequestSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const { user } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const { error } = await rejectRequest(
      supabase,
      parsed.data.requestId,
      parsed.data.rejectReason,
      user.id
    );

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/reimbursement");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/rejectReimbursement",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function markReimbursementStatus(
  requestId: string,
  status: "paid" | "completed" | "cancelled"
): Promise<ActionResult<null>> {
  try {
    await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const { error } = await updateRequestStatus(supabase, requestId, status);

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    if (status === "paid") {
      const { data: row } = await supabase
        .from("reimbursement_requests")
        .select("project_id, requester_name, approved_amount, requested_amount")
        .eq("id", requestId)
        .single();
      if (row) {
        notifyProjectRecipients(supabase, row.project_id as string, {
          title: "Payment Completed",
          summary: `Payment to ${row.requester_name} has been completed`,
          amountText: `${Number(row.approved_amount ?? row.requested_amount).toFixed(2)} THB`,
        }).catch(() => {
          // swallow — non-blocking, per the notification design
        });
      }
    }

    revalidatePath("/reimbursement");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/markReimbursementStatus",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
