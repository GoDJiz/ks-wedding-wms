import { describe, it, expect } from "vitest";
import { parseCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("parses a simple CSV with headers", () => {
    const csv = "Name,Phone\nJohn,081-111-2222\nJane,081-333-4444";
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { Name: "John", Phone: "081-111-2222" },
      { Name: "Jane", Phone: "081-333-4444" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'Name,Address\n"Doe, John","123 Main St, Apt 4"';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { Name: "Doe, John", Address: "123 Main St, Apt 4" },
    ]);
  });

  it("handles doubled-quote escaping inside quoted fields", () => {
    const csv = 'Name,Remark\nJohn,"He said ""hello"""';
    const rows = parseCsv(csv);
    expect(rows[0].Remark).toBe('He said "hello"');
  });

  it("handles CRLF line endings (Google Sheets CSV export style)", () => {
    const csv = "Name,Phone\r\nJohn,081-111-2222\r\nJane,081-333-4444";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].Name).toBe("John");
  });

  it("trims whitespace around header and value", () => {
    const csv = "Name , Phone\n John , 081-111-2222 ";
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual({ Name: "John", Phone: "081-111-2222" });
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns an empty array for header-only input (no data rows)", () => {
    expect(parseCsv("Name,Phone")).toEqual([]);
  });

  it("handles a trailing blank line without producing a phantom row", () => {
    const csv = "Name,Phone\nJohn,081-111-2222\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it("handles Thai text correctly (no special-casing needed for UTF-8)", () => {
    const csv = "ชื่อ,โทรศัพท์\nสมชาย,081-111-2222";
    const rows = parseCsv(csv);
    expect(rows).toEqual([{ ชื่อ: "สมชาย", โทรศัพท์: "081-111-2222" }]);
  });

  it("handles missing trailing columns as empty strings", () => {
    const csv = "Name,Phone,Email\nJohn,081-111-2222";
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual({ Name: "John", Phone: "081-111-2222", Email: "" });
  });
});
