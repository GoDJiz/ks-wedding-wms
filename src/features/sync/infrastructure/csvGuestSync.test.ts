import { describe, it, expect } from "vitest";
import {
  normalizeExternalKey,
  normalizeRsvp,
  parseAmount,
} from "./csvGuestSync";

describe("normalizeExternalKey", () => {
  it("uses email (lowercased) when present, ignoring name/phone", () => {
    expect(
      normalizeExternalKey("John Doe", "0811112222", "John@Example.com")
    ).toBe("john@example.com");
  });

  it("falls back to name|phone when email is absent", () => {
    expect(normalizeExternalKey("John Doe", "0811112222", "")).toBe(
      "john doe|0811112222"
    );
  });

  it("normalizes name case for matching (case-insensitive)", () => {
    const a = normalizeExternalKey("JOHN DOE", "0811112222", "");
    const b = normalizeExternalKey("john doe", "0811112222", "");
    expect(a).toBe(b);
  });

  it("treats different phone numbers as different guests when no email given", () => {
    const a = normalizeExternalKey("John Doe", "0811112222", "");
    const b = normalizeExternalKey("John Doe", "0899998888", "");
    expect(a).not.toBe(b);
  });

  it("trims whitespace before combining name and phone", () => {
    expect(normalizeExternalKey("  John Doe  ", " 0811112222 ", "")).toBe(
      "john doe|0811112222"
    );
  });
});

describe("normalizeRsvp", () => {
  it.each([
    ["yes", "attending"],
    ["Yes", "attending"],
    ["attending", "attending"],
    ["confirmed", "attending"],
    ["y", "attending"],
    ["no", "declined"],
    ["declined", "declined"],
    ["not attending", "declined"],
    ["n", "declined"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(normalizeRsvp(input)).toBe(expected);
  });

  it("defaults to pending for unrecognized or blank values", () => {
    expect(normalizeRsvp("")).toBe("pending");
    expect(normalizeRsvp("maybe")).toBe("pending");
    expect(normalizeRsvp("TBD")).toBe("pending");
  });
});

describe("parseAmount", () => {
  it("parses a plain number string", () => {
    expect(parseAmount("1500")).toBe(1500);
  });

  it("strips currency symbols and commas (common Sheet formatting)", () => {
    expect(parseAmount("฿1,500.50")).toBe(1500.5);
    expect(parseAmount("THB 2,000")).toBe(2000);
  });

  it("returns 0 for blank input", () => {
    expect(parseAmount("")).toBe(0);
  });

  it("returns 0 for non-numeric garbage rather than NaN", () => {
    expect(parseAmount("N/A")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });

  it("handles negative amounts", () => {
    expect(parseAmount("-500")).toBe(-500);
  });
});
