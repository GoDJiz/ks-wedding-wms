/**
 * Milestone 0 spike: proves Google Apps Script can call a Supabase Edge Function.
 * Paste this into Extensions → Apps Script on the guest-list Google Sheet.
 *
 * Full field-mapping-driven sync (Milestone 4) builds on this same call pattern —
 * this spike just proves the connection works with a couple of test rows.
 */

const EDGE_FUNCTION_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-guests-test";
const SHARED_SECRET = "PASTE_SHEET_SYNC_SHARED_SECRET_HERE"; // matches SHEET_SYNC_SHARED_SECRET env var

function testSyncCall() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  const rows = values.slice(1, 3); // just the first two data rows, for the spike

  const payload = {
    secret: SHARED_SECRET,
    headers: headers,
    rows: rows,
  };

  const response = UrlFetchApp.fetch(EDGE_FUNCTION_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  Logger.log("Status: %s", response.getResponseCode());
  Logger.log("Body: %s", response.getContentText());
}

/**
 * Optional: run testSyncCall() on a time-based trigger for the real
 * Milestone 4 sync (Triggers → Add Trigger → Time-driven → every 15-30 min).
 */
