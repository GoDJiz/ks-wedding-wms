import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lineClient.ts imports "server-only", which throws when imported outside
// a Next.js server bundle. Next's webpack config aliases it to a no-op in
// server contexts; vitest has no such alias, so we stub it here the same
// way Next does, scoped to this test file only.
vi.mock("server-only", () => ({}));

describe("sendLineMessage", () => {
  const ORIGINAL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = ORIGINAL_TOKEN;
    vi.unstubAllGlobals();
  });

  it("returns status -1 and a clear detail when the token env var is missing (not a generic error)", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const { sendLineMessage } = await import("./lineClient");

    const result = await sendLineMessage("U1234567890123456789012345678901", {
      title: "Test",
      summary: "Test",
    });

    expect(result.status).toBe(-1);
    expect(result.error).toBeTruthy();
    expect(result.detail).toContain("LINE_CHANNEL_ACCESS_TOKEN");
  });

  it("parses LINE's JSON error body into `detail` on a 401 (invalid token) instead of only a bare status code", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "fake-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Authentication failed due to the following reason: invalid token.",
          }),
          { status: 401 }
        )
      )
    );
    const { sendLineMessage } = await import("./lineClient");

    const result = await sendLineMessage("U1234567890123456789012345678901", {
      title: "Test",
      summary: "Test",
    });

    expect(result.status).toBe(401);
    expect(result.detail).toContain("Authentication failed");
    expect(result.detail).toContain("invalid token");
  });

  it("parses LINE's `details[]` array (e.g. invalid recipient) on a 400", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "fake-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "The request body has 1 error(s)",
            details: [
              {
                message: "May not be empty",
                property: "to",
              },
            ],
          }),
          { status: 400 }
        )
      )
    );
    const { sendLineMessage } = await import("./lineClient");

    const result = await sendLineMessage("not-a-real-line-id", {
      title: "Test",
      summary: "Test",
    });

    expect(result.status).toBe(400);
    expect(result.detail).toContain("to: May not be empty");
  });

  it("returns status 0 (not a thrown exception) when fetch itself fails, e.g. DNS/network error", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "fake-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("fetch failed: getaddrinfo ENOTFOUND api.line.me"))
    );
    const { sendLineMessage } = await import("./lineClient");

    const result = await sendLineMessage("U1234567890123456789012345678901", {
      title: "Test",
      summary: "Test",
    });

    expect(result.status).toBe(0);
    expect(result.detail).toContain("ENOTFOUND");
  });

  it("returns status 200 and no error on success", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "fake-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const { sendLineMessage } = await import("./lineClient");

    const result = await sendLineMessage("U1234567890123456789012345678901", {
      title: "Test",
      summary: "Test",
    });

    expect(result.error).toBeNull();
    expect(result.status).toBe(200);
  });
});
