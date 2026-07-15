import { describe, it, expect } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats a whole number with two decimal places", () => {
    expect(formatCurrency(1000)).toBe("฿1,000.00");
  });

  it("formats a decimal amount, rounding correctly", () => {
    expect(formatCurrency(1234.5)).toBe("฿1,234.50");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("฿0.00");
  });

  it("formats negative amounts (e.g. a loss/deficit figure)", () => {
    expect(formatCurrency(-500)).toBe("-฿500.00");
  });

  it("adds thousands separators for large amounts", () => {
    expect(formatCurrency(1234567.89)).toBe("฿1,234,567.89");
  });
});
