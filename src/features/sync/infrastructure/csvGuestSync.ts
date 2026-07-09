import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCsv } from "@/shared/lib/parseCsv";
import type { SyncRunStatus } from "../domain/SyncRun";

type RunResult = {
  status: SyncRunStatus;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  errorLog: { row: number; reason: string }[];
};

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
 * Runs one guest sync pass. See docs/SYNC_STRATEGY.md for the full design —
 * this function is the implementation of that design, not a place to
 * re-derive the rules from scratch.
 */
export async function runGuestSync(
  supabase: SupabaseClient,
  projectId: string,
  csvUrl: string
): Promise<RunResult> {
  const errorLog: { row: number; reason: string }[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Fetch + parse — if this fails, nothing to iterate, whole run fails.
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
    };
  }
  const csvText = await csvResponse.text();
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
    };
  }

  // Load config once, not per-row.
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

  for (let i = 0; i < rows.length; i++) {
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
        errorLog.push({ row: i + 2, reason: "Missing name — row skipped" }); // +2: header row + 1-index
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
        // No match among sheet_sync rows -> always insert. Never merges
        // into a walk_in row even on a name coincidence (see Sync Strategy).
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
        if (error || !data) throw new Error(error?.message ?? "insert failed");
        guestId = data.id as string;
        inserted++;
      } else if (existing.isManuallyModified && !allowOverwrite) {
        skipped++;
        errorLog.push({
          row: i + 2,
          reason: `Skipped "${name}" — manually modified, overwrite not enabled`,
        });
        continue;
      } else {
        const { error } = await supabase
          .from("guests")
          .update({
            ...guestFields,
            is_manually_modified: false, // sync becomes authoritative again for this row
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        guestId = existing.id;
        updated++;
      }

      // Mirror non-zero envelope/transfer amounts into incomes, per Sync
      // Strategy — upsert on (guest_id, type) so re-syncing doesn't
      // duplicate rows. Needs a payment account to attach to; uses the
      // project's first account as a reasonable default (Owner can
      // reassign the account later — the amount/date being logged
      // automatically is the valuable part here).
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
    } catch (err) {
      failed++;
      errorLog.push({
        row: i + 2,
        reason: err instanceof Error ? err.message : "Unknown row error",
      });
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
  };
}
