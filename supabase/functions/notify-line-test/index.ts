// Milestone 0 spike: proves an Edge Function can push a LINE Flex Message.
// Deploy with: supabase functions deploy notify-line-test
// Set secrets with: supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=... LINE_TEST_USER_ID=...
// Invoke with: supabase functions invoke notify-line-test

// deno-lint-ignore-file no-explicit-any
Deno.serve(async () => {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  const userId = Deno.env.get("LINE_TEST_USER_ID");

  if (!token || !userId) {
    return new Response(
      JSON.stringify({ error: "Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_TEST_USER_ID secret" }),
      { status: 500 }
    );
  }

  const flexMessage = {
    to: userId,
    messages: [
      {
        type: "flex",
        altText: "Milestone 0 test notification",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "Architecture Validation", weight: "bold", size: "md" },
              { type: "text", text: "This confirms the LINE notification path works.", wrap: true, size: "sm", color: "#888888" },
              { type: "text", text: "0.00 THB", weight: "bold", size: "xl", margin: "md" },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#AFCBFF",
                action: { type: "uri", label: "Open Detail", uri: "https://example.com" },
              },
            ],
          },
        },
      },
    ],
  };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(flexMessage),
  });

  const body = await res.text();
  return new Response(body, { status: res.status });
});
