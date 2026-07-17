import "server-only";

export type LineNotification = {
  title: string;
  summary: string;
  amountText?: string;
  detailUrl?: string;
};

/**
 * Parses a LINE Messaging API error body. LINE always returns
 * `{ message: string, details?: { message: string; property: string }[] }`
 * on error (see https://developers.line.biz/en/reference/messaging-api/#error-responses).
 * Falls back gracefully if the body isn't JSON so this never itself throws.
 */
async function extractLineErrorDetail(res: Response): Promise<string> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return `HTTP ${res.status} (response body could not be read)`;
  }
  try {
    const json = JSON.parse(text) as {
      message?: string;
      details?: { message?: string; property?: string }[];
    };
    const parts = [json.message ?? "Unknown LINE API error"];
    if (json.details?.length) {
      parts.push(
        ...json.details.map(
          (d) => `${d.property ?? "field"}: ${d.message ?? "invalid"}`
        )
      );
    }
    return parts.join(" | ");
  } catch {
    return text.slice(0, 300) || `HTTP ${res.status} with empty body`;
  }
}

/**
 * Structured result from a LINE push call.
 * - `status`: the HTTP status LINE returned. 0 means the request never got
 *   a response at all (network/DNS/timeout failure); -1 means the token
 *   env var itself is missing, so no request was even attempted.
 * - `detail`: LINE's own error message (parsed from the JSON error body),
 *   e.g. "Authentication failed due to the following reason: invalid
 *   token." or "The property, 'to', in the request body is invalid".
 *   This is what actually distinguishes "token is wrong" from "recipient
 *   ID is wrong" from "LINE is down" — a bare HTTP status can't.
 */
export type LineSendResult = {
  error: string | null;
  status: number;
  detail: string | null;
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
): Promise<LineSendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return {
      error: "LINE_CHANNEL_ACCESS_TOKEN not configured",
      status: -1,
      detail: "LINE_CHANNEL_ACCESS_TOKEN is not set in this environment.",
    };
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
      const detail = await extractLineErrorDetail(res);
      return {
        error: `LINE API returned HTTP ${res.status}: ${detail}`,
        status: res.status,
        detail,
      };
    }
    return { error: null, status: res.status, detail: null };
  } catch (err) {
    // fetch() itself threw — network failure, DNS failure, timeout, etc.
    // No HTTP response was ever received, hence status 0.
    return {
      error: err instanceof Error ? err.message : "Unknown LINE API error",
      status: 0,
      detail: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}
