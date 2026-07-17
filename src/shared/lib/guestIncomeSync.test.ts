import { describe, it, expect } from "vitest";
import { guestIncomeSyncStatus } from "./guestIncomeSync";

describe("guestIncomeSyncStatus", () => {
  it("returns 'none' when there is no transfer amount and no linked income", () => {
    expect(guestIncomeSyncStatus(0, null)).toBe("none");
  });

  it("returns 'synced' when the linked income amount matches transfer_amount", () => {
    expect(guestIncomeSyncStatus(5000, 5000)).toBe("synced");
  });

  it("returns 'pending' when transfer_amount changed but income hasn't caught up", () => {
    // e.g. 5000 -> 7000 before the sync call has run
    expect(guestIncomeSyncStatus(7000, 5000)).toBe("pending");
  });

  it("returns 'pending' when transfer_amount > 0 but no income exists yet", () => {
    expect(guestIncomeSyncStatus(5000, null)).toBe("pending");
  });

  it("returns 'cancelled' when transfer_amount dropped to 0 but a linked income remains (zeroed)", () => {
    expect(guestIncomeSyncStatus(0, 0)).toBe("cancelled");
  });
});
