import "server-only";

export type LineNotification = {
  title: string;
  summary: string;
  amountText?: string;
  detailUrl?: string;
};

/**
 * Sends one LINE Flex Message. Never throws — a failed notification should
 * never block the business action that triggered it (submitting a
 * reimbursement, creating an expense); errors are returned for the caller
 * to log, not propagated.
 */
export async function sendLineMessage(
  lineUserId: string,
  notification: LineNotification
): Promise<{ error: string | null }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" };
  }

  const bodyContents: Record<string, unknown>[] = [
    { type: "text", text: notification.title, weight: "bold", size: "md" },
    {
      type: "text",
      text: notification.summary,
      wrap: true,
      size: "sm",
      color: "#888888",
    },
  ];
  if (notification.amountText) {
    bodyContents.push({
      type: "text",
      text: notification.amountText,
      weight: "bold",
      size: "xl",
      margin: "md",
    });
  }

  const flexMessage = {
    to: lineUserId,
    messages: [
      {
        type: "flex",
        altText: notification.title,
        contents: {
          type: "bubble",
          body: { type: "box", layout: "vertical", contents: bodyContents },
          ...(notification.detailUrl && {
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#AFCBFF",
                  action: {
                    type: "uri",
                    label: "Open Detail",
                    uri: notification.detailUrl,
                  },
                },
              ],
            },
          }),
        },
      },
    ],
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(flexMessage),
    });
    if (!res.ok) {
      return { error: `LINE API returned HTTP ${res.status}` };
    }
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown LINE API error",
    };
  }
}
