import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReimbursementRequest,
  ReimbursementFileInfo,
  ReimbursementStatus,
} from "../domain/ReimbursementRequest";

type RequestRow = {
  id: string;
  requester_name: string;
  phone: string;
  category_id: string | null;
  description: string | null;
  purchase_date: string;
  requested_amount: number;
  approved_amount: number | null;
  payment_method: ReimbursementRequest["paymentMethod"];
  bank_info: string | null;
  status: ReimbursementStatus;
  reject_reason: string | null;
  partial_approval_reason: string | null;
  created_at: string;
  budget_categories: { name: string } | null;
};

function toDomain(row: RequestRow): ReimbursementRequest {
  return {
    id: row.id,
    requesterName: row.requester_name,
    phone: row.phone,
    categoryId: row.category_id,
    categoryName: row.budget_categories?.name ?? null,
    description: row.description,
    purchaseDate: row.purchase_date,
    requestedAmount: Number(row.requested_amount),
    approvedAmount:
      row.approved_amount === null ? null : Number(row.approved_amount),
    paymentMethod: row.payment_method,
    bankInfo: row.bank_info,
    status: row.status,
    rejectReason: row.reject_reason,
    partialApprovalReason: row.partial_approval_reason,
    createdAt: row.created_at,
  };
}

const REQUEST_SELECT =
  "id, requester_name, phone, category_id, description, purchase_date, requested_amount, " +
  "approved_amount, payment_method, bank_info, status, reject_reason, partial_approval_reason, " +
  "created_at, budget_categories(name)";

export async function insertReimbursementRequest(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    requesterName: string;
    phone: string;
    categoryId: string | null;
    description: string | null;
    purchaseDate: string;
    requestedAmount: number;
    paymentMethod: string;
    bankInfo: string | null;
  }
): Promise<{ requestId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("reimbursement_requests")
    .insert({
      project_id: input.projectId,
      requester_name: input.requesterName,
      phone: input.phone,
      category_id: input.categoryId,
      description: input.description,
      purchase_date: input.purchaseDate,
      requested_amount: input.requestedAmount,
      payment_method: input.paymentMethod,
      bank_info: input.bankInfo,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error || !data)
    return { requestId: null, error: error?.message ?? "insert failed" };
  return { requestId: data.id as string, error: null };
}

export async function insertReimbursementFiles(
  supabase: SupabaseClient,
  reimbursementId: string,
  filePaths: string[],
  fileType: "receipt" | "cash_photo" | "slip"
): Promise<{ error: string | null }> {
  const rows = filePaths.map((path) => ({
    reimbursement_id: reimbursementId,
    file_type: fileType,
    storage_path: path,
  }));
  const { error } = await supabase.from("reimbursement_files").insert(rows);
  return { error: error?.message ?? null };
}

export async function listReimbursements(
  supabase: SupabaseClient,
  projectId: string,
  status: ReimbursementStatus | "all"
): Promise<ReimbursementRequest[]> {
  let query = supabase
    .from("reimbursement_requests")
    .select(REQUEST_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as RequestRow[]).map(toDomain);
}

export async function getReimbursementById(
  supabase: SupabaseClient,
  id: string
): Promise<{
  request: ReimbursementRequest | null;
  files: ReimbursementFileInfo[];
}> {
  const [requestRes, filesRes] = await Promise.all([
    supabase
      .from("reimbursement_requests")
      .select(REQUEST_SELECT)
      .eq("id", id)
      .single(),
    supabase
      .from("reimbursement_files")
      .select("id, file_type, storage_path")
      .eq("reimbursement_id", id),
  ]);

  const request = requestRes.data
    ? toDomain(requestRes.data as unknown as RequestRow)
    : null;
  const files = (filesRes.data ?? []).map((f) => ({
    id: f.id as string,
    fileType: f.file_type as ReimbursementFileInfo["fileType"],
    storagePath: f.storage_path as string,
  }));

  return { request, files };
}

export async function findPossibleDuplicate(
  supabase: SupabaseClient,
  projectId: string,
  requestedAmount: number,
  purchaseDate: string,
  excludeRequestId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("reimbursement_requests")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("requested_amount", requestedAmount)
    .eq("purchase_date", purchaseDate)
    .neq("id", excludeRequestId)
    .in("status", [
      "submitted",
      "pending_approval",
      "approved",
      "paid",
      "completed",
    ]);

  return (count ?? 0) > 0;
}

export async function approveRequest(
  supabase: SupabaseClient,
  input: {
    requestId: string;
    projectId: string;
    categoryId: string;
    paymentAccountId: string;
    approvedAmount: number;
    partialApprovalReason: string | null;
    reviewedBy: string;
    purchaseDate: string;
    paymentMethod: string;
    description: string | null;
  }
): Promise<{ error: string | null }> {
  // Create the linked Expense first, then mark the request approved with a
  // reference to it — if the expense insert fails, the request is left
  // untouched (still pending) rather than silently approved with no
  // corresponding expense record.
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      project_id: input.projectId,
      category_id: input.categoryId,
      payment_account_id: input.paymentAccountId,
      date: input.purchaseDate,
      amount: input.approvedAmount,
      payment_method: input.paymentMethod,
      remark: input.description
        ? `Reimbursement: ${input.description}`
        : "Reimbursement",
      source_reimbursement_id: input.requestId,
      created_by: input.reviewedBy,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return { error: expenseError?.message ?? "expense creation failed" };
  }

  const { error } = await supabase
    .from("reimbursement_requests")
    .update({
      status: "approved",
      approved_amount: input.approvedAmount,
      partial_approval_reason: input.partialApprovalReason,
      reviewed_by: input.reviewedBy,
      expense_id: expense.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  return { error: error?.message ?? null };
}

export async function rejectRequest(
  supabase: SupabaseClient,
  requestId: string,
  rejectReason: string,
  reviewedBy: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("reimbursement_requests")
    .update({
      status: "rejected",
      reject_reason: rejectReason,
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return { error: error?.message ?? null };
}

export async function updateRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  status: "paid" | "completed" | "cancelled"
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("reimbursement_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId);

  return { error: error?.message ?? null };
}
