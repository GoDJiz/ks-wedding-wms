import { describe, it, expect } from "vitest";
import { shortHash } from "./shortHash";

describe("shortHash", () => {
  it("produces a deterministic hash for the same input", async () => {
    const a = await shortHash("hello world");
    const b = await shortHash("hello world");
    expect(a).toBe(b);
  });

  it("produces different hashes for different input", async () => {
    const a = await shortHash("hello world");
    const b = await shortHash("hello world!");
    expect(a).not.toBe(b);
  });

  it("returns a 12-character lowercase hex string", async () => {
    const hash = await shortHash("test");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it("handles empty string input without throwing", async () => {
    const hash = await shortHash("");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });
});
