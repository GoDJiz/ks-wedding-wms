"use server";

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import {
  publicSubmitSchema,
  type PublicSubmitInput,
} from "../reimbursement.types";
import {
  insertReimbursementRequest,
  insertReimbursementFiles,
} from "../infrastructure/reimbursementRepository";
import {
  getPublicProjectInfo,
  type PublicProjectInfo,
} from "../infrastructure/publicProjectRepository";
import { notifyProjectRecipients } from "@/shared/notifications/notifyRecipients";

export async function getPublicProject(
  projectId: string
): Promise<ActionResult<PublicProjectInfo>> {
  try {
    const supabase = await createSupabaseServerClient();
    const project = await getPublicProjectInfo(supabase, projectId);
    if (!project) return { ok: false, code: "not_found" };
    return { ok: true, data: project };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/getPublicProject",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function submitReimbursement(
  input: PublicSubmitInput
): Promise<ActionResult<{ referenceCode: string }>> {
  const parsed = publicSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { requestId, error } = await insertReimbursementRequest(supabase, {
      projectId: parsed.data.projectId,
      requesterName: parsed.data.requesterName,
      phone: parsed.data.phone,
      categoryId: null,
      description: parsed.data.description || null,
      purchaseDate: parsed.data.purchaseDate,
      requestedAmount: parsed.data.requestedAmount,
      paymentMethod: parsed.data.paymentMethod,
      bankInfo: parsed.data.bankInfo || null,
    });

    if (error || !requestId) {
      return { ok: false, code: mapSupabaseError(error ?? "") };
    }

    const fileType =
      parsed.data.paymentMethod === "bank_transfer" ? "slip" : "receipt";
    const { error: filesError } = await insertReimbursementFiles(
      supabase,
      requestId,
      parsed.data.filePaths,
      fileType
    );
    // A file-record failure doesn't roll back the submission — the request
    // itself is the important half; log it so it's investigable, but the
    // requester still gets a successful confirmation since their request
    // was genuinely received.
    if (filesError) {
      await logErrorServer({
        module: "features/reimbursement/submitReimbursement.files",
        errorMessage: filesError,
        projectId: parsed.data.projectId,
      });
    }

    // Notify admins — non-blocking: a notification failure must never
    // affect the requester's successful submission result.
    notifyProjectRecipients(supabase, parsed.data.projectId, {
      title: "New Reimbursement Request",
      summary: `${parsed.data.requesterName} submitted a request`,
      amountText: `${parsed.data.requestedAmount.toFixed(2)} THB`,
    }).catch(() => {
      // swallow — notification failures are non-critical to the requester
    });

    return {
      ok: true,
      data: { referenceCode: requestId.slice(0, 8).toUpperCase() },
    };
  } catch (err) {
    await logErrorServer({
      module: "features/reimbursement/submitReimbursement",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
