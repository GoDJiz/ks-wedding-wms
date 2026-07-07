// Milestone 0 spike: receives a test call from Google Apps Script and
// confirms the round trip works. Real upsert-by-mapping logic is Milestone 4.

Deno.serve(async (req) => {
  const sharedSecret = Deno.env.get("SHEET_SYNC_SHARED_SECRET");
  const body = await req.json();

  if (!sharedSecret || body.secret !== sharedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  console.log("Received headers:", body.headers);
  console.log("Received rows:", body.rows);

  return new Response(
    JSON.stringify({
      ok: true,
      receivedRowCount: Array.isArray(body.rows) ? body.rows.length : 0,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
