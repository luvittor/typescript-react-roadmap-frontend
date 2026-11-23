import { describe, expect, it } from "vitest";

import { getConsecutiveMonths } from "../src/utils/date";

describe("getConsecutiveMonths", () => {
  it("advances across December without skipping January", () => {
    expect(getConsecutiveMonths(new Date(2026, 10, 30), 4)).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });
});
