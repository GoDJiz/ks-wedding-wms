import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCsv } from "@/shared/lib/parseCsv";
import { shortHash } from "@/shared/lib/shortHash";
import type { SyncRunStatus } from "../domain/SyncRun";

export type PreviewItem = {
  row: number;
  name: string;
  action: "insert" | "update" | "skip" | "fail";
  reason?: string;
};

type RunResult = {
  status: SyncRunStatus;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  errorLog: { row: number; reason: string }[];
  csvHash: string | null;
  preview: PreviewItem[];
};

const PREVIEW_LIMIT = 100; // keep the response small — a preview, not a full dump

function normalizeExternalKey(
  name: string,
  phone: string,
  email: string
): string {
  if (email.trim()) return email.trim().toLowerCase();
  return `${name.trim().toLowerCase()}|${phone.trim()}`;
}

function normalizeRsvp(raw: string): "pending" | "attending" | "declined" {
  const v = raw.trim().toLowerCase();
  if (["yes", "attending", "y", "confirmed"].includes(v)) return "attending";
  if (["no", "declined", "n", "not attending"].includes(v)) return "declined";
  return "pending";
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Runs one guest sync pass — or previews one, when dryRun is true. See
 * docs/SYNC_STRATEGY.md for the full design. `dryRun` only gates the actual
 * writes (guarded individually below); the categorization logic that
 * decides insert/update/skip/fail is identical either way, so a dry run's
 * preview is a true preview of what a real run would do, not a separate
 * code path that could drift out of sync with it.
 */
export async function runGuestSync(
  supabase: SupabaseClient,
  projectId: string,
  csvUrl: string,
  dryRun = false
): Promise<RunResult> {
  const errorLog: { row: number; reason: string }[] = [];
  const preview: PreviewItem[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const csvResponse = await fetch(csvUrl);
  if (!csvResponse.ok) {
    return {
      status: "failed",
      rowsProcessed: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      errorLog: [
        { row: -1, reason: `CSV fetch failed: HTTP ${csvResponse.status}` },
      ],
      csvHash: null,
      preview: [],
    };
  }
  const csvText = await csvResponse.text();
  const csvHash = await shortHash(csvText);
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    return {
      status: "success",
      rowsProcessed: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      errorLog: [],
      csvHash,
      preview: [],
    };
  }

  const [mappingsRes, flagRes, existingGuestsRes] = await Promise.all([
    supabase
      .from("sync_field_mappings")
      .select("source_field, target_field")
      .eq("project_id", projectId),
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("project_id", projectId)
      .eq("flag_key", "sync_allow_overwrite_manual")
      .maybeSingle(),
    supabase
      .from("guests")
      .select("id, external_key, is_manually_modified")
      .eq("project_id", projectId)
      .eq("source", "sheet_sync"),
  ]);

  const mapping = new Map<string, string>(
    (mappingsRes.data ?? []).map((m) => [
      m.source_field as string,
      m.target_field as string,
    ])
  );
  const allowOverwrite = flagRes.data?.enabled === true;
  const existingByKey = new Map<
    string,
    { id: string; isManuallyModified: boolean }
  >(
    (existingGuestsRes.data ?? []).map((g) => [
      g.external_key as string,
      {
        id: g.id as string,
        isManuallyModified: g.is_manually_modified as boolean,
      },
    ])
  );

  const addPreview = (item: PreviewItem) => {
    if (preview.length < PREVIEW_LIMIT) preview.push(item);
  };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // header row + 1-index
    try {
      const row = rows[i];
      const getMapped = (target: string): string => {
        for (const [source, mappedTarget] of mapping.entries()) {
          if (mappedTarget === target) return row[source] ?? "";
        }
        return "";
      };

      const name = getMapped("name");
      if (!name.trim()) {
        skipped++;
        const reason = "Missing name — row skipped";
        errorLog.push({ row: rowNum, reason });
        addPreview({ row: rowNum, name: "(blank)", action: "skip", reason });
        continue;
      }

      const phone = getMapped("phone");
      const email = getMapped("email");
      const externalKey = normalizeExternalKey(name, phone, email);

      const guestFields = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        table_no: getMapped("table_no").trim() || null,
        rsvp_status: normalizeRsvp(getMapped("rsvp_status")),
        transfer_amount: parseAmount(getMapped("transfer_amount")),
        envelope_amount: parseAmount(getMapped("envelope_amount")),
        remark: getMapped("remark").trim() || null,
      };

      const existing = existingByKey.get(externalKey);
      let guestId: string;

      if (!existing) {
        if (!dryRun) {
          const { data, error } = await supabase
            .from("guests")
            .insert({
              project_id: projectId,
              external_key: externalKey,
              source: "sheet_sync",
              ...guestFields,
            })
            .select("id")
            .single();
          if (error || !data)
            throw new Error(error?.message ?? "insert failed");
          guestId = data.id as string;
        } else {
          guestId = "dry-run-placeholder";
        }
        inserted++;
        addPreview({ row: rowNum, name: guestFields.name, action: "insert" });
      } else if (existing.isManuallyModified && !allowOverwrite) {
        skipped++;
        const reason = "Manually modified — overwrite not enabled";
        errorLog.push({ row: rowNum, reason: `Skipped "${name}" — ${reason}` });
        addPreview({
          row: rowNum,
          name: guestFields.name,
          action: "skip",
          reason,
        });
        continue;
      } else {
        if (!dryRun) {
          const { error } = await supabase
            .from("guests")
            .update({
              ...guestFields,
              is_manually_modified: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        }
        guestId = existing.id;
        updated++;
        addPreview({ row: rowNum, name: guestFields.name, action: "update" });
      }

      // Mirror non-zero envelope/transfer amounts into incomes (real runs only).
      if (!dryRun) {
        for (const [type, amount] of [
          ["transfer", guestFields.transfer_amount],
          ["envelope", guestFields.envelope_amount],
        ] as const) {
          if (amount > 0) {
            const { data: account } = await supabase
              .from("payment_accounts")
              .select("id")
              .eq("project_id", projectId)
              .limit(1)
              .maybeSingle();
            if (account) {
              await supabase.from("incomes").upsert(
                {
                  project_id: projectId,
                  payment_account_id: account.id,
                  guest_id: guestId,
                  type,
                  amount,
                  date: new Date().toISOString().slice(0, 10),
                  source: "sheet_sync",
                },
                { onConflict: "guest_id,type" }
              );
            }
          }
        }
      }
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : "Unknown row error";
      errorLog.push({ row: rowNum, reason });
      addPreview({ row: rowNum, name: "—", action: "fail", reason });
    }
  }

  const rowsProcessed = rows.length;
  const status: SyncRunStatus =
    failed === 0 ? "success" : inserted + updated > 0 ? "partial" : "failed";

  return {
    status,
    rowsProcessed,
    rowsInserted: inserted,
    rowsUpdated: updated,
    rowsSkipped: skipped,
    rowsFailed: failed,
    errorLog,
    csvHash,
    preview,
  };
}
