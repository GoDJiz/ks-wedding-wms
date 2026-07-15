/**
 * Google Apps Script — optional scheduled trigger for guest sync and
 * payment reminders. This is NOT how guest data gets into the app —
 * that happens by the app pulling your Sheet's "Publish to web" CSV URL
 * directly (see docs/SYNC_STRATEGY.md). This script's only job is to
 * ping the app on a timer so sync/reminders happen automatically instead
 * of requiring someone to click "Sync Now" manually.
 *
 * (Earlier versions of this project had Apps Script push row data to a
 * Supabase Edge Function. That architecture was replaced — see
 * docs/SIGNIFICANT_FINDINGS.md, Milestone 4 entry, for why. If you set
 * this project up before that change, delete any old trigger pointing at
 * a supabase.co/functions/v1/... URL and replace it with this script.)
 *
 * Setup:
 * 1. Paste this into any Google Sheet's Extensions → Apps Script (doesn't
 *    need to be the guest-list Sheet itself, though it can be).
 * 2. Fill in APP_URL, PROJECT_ID, and SHARED_SECRET below.
 * 3. Run `pingGuestSync` once manually to test (Apps Script will prompt
 *    for authorization the first time — approve it, it's your own script).
 * 4. Triggers (clock icon in the left sidebar) → Add Trigger → choose
 *    the function → Time-driven → Day timer (or hourly, your choice).
 */

const APP_URL = "https://YOUR-APP.vercel.app";
const PROJECT_ID = "YOUR_PROJECT_ID_HERE"; // the wedding project's UUID
const SHARED_SECRET = "PASTE_SHEET_SYNC_SHARED_SECRET_HERE"; // matches SHEET_SYNC_SHARED_SECRET in Vercel

function pingGuestSync() {
  callEndpoint("/api/sync/guests");
}

function pingPaymentReminders() {
  callEndpoint("/api/notifications/payment-reminders");
}

function callEndpoint(path) {
  const response = UrlFetchApp.fetch(APP_URL + path, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ projectId: PROJECT_ID, secret: SHARED_SECRET }),
    muteHttpExceptions: true,
  });

  Logger.log("Status: %s", response.getResponseCode());
  Logger.log("Body: %s", response.getContentText());
}
