import { describe, it, expect } from "vitest";
import { mapSupabaseError } from "./mapSupabaseError";

describe("mapSupabaseError", () => {
  it("maps row-level security violations to permission_denied", () => {
    expect(
      mapSupabaseError(
        'new row violates row-level security policy for table "guests"'
      )
    ).toBe("permission_denied");
  });

  it("maps generic permission denied errors to permission_denied", () => {
    expect(mapSupabaseError("permission denied for table projects")).toBe(
      "permission_denied"
    );
  });

  it("maps duplicate key violations to already_whitelisted", () => {
    expect(
      mapSupabaseError(
        'duplicate key value violates unique constraint "whitelisted_emails_email_key"'
      )
    ).toBe("already_whitelisted");
  });

  it("maps 'already exists' errors to already_whitelisted", () => {
    expect(mapSupabaseError("relation already exists")).toBe(
      "already_whitelisted"
    );
  });

  it("is case-insensitive", () => {
    expect(mapSupabaseError("PERMISSION DENIED for table projects")).toBe(
      "permission_denied"
    );
  });

  it("falls back to unknown_error for anything unrecognized", () => {
    expect(mapSupabaseError("connection timeout")).toBe("unknown_error");
    expect(mapSupabaseError("")).toBe("unknown_error");
  });
});
