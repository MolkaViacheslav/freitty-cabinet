import { describe, expect, it } from "vitest";
import {
  computeLineTotal,
  computeSuppliesSubtotal,
  computeTrendPercent,
  formatDateWithYear,
  formatMoney,
  formatPercent,
  formatQuantityLabel,
  getRelativeDayLabel,
} from "./format";

describe("formatQuantityLabel", () => {
  it('renders "Std + XL" when there is extra XL on top of Standard', () => {
    expect(formatQuantityLabel("STANDARD", 15, 3)).toBe("15 × Std + 3 × XL");
  });

  it("renders plain Std when there is no XL", () => {
    expect(formatQuantityLabel("STANDARD", 28, 0)).toBe("28 × Std");
  });

  it("renders plain XL when the primary unit is XL", () => {
    expect(formatQuantityLabel("XL", 10, 0)).toBe("10 × XL");
  });

  it("adds extra XL into the total when the primary unit is also XL, instead of dropping it", () => {
    expect(formatQuantityLabel("XL", 10, 2)).toBe("12 × XL");
  });
});

describe("computeLineTotal / computeSuppliesSubtotal", () => {
  it("computes a single line total as qty × unitPrice", () => {
    expect(computeLineTotal(4, 4.5)).toBe(18);
  });

  it("matches the FR001383 supplies spec (data-model.md §2.7): $73.20", () => {
    const items = [
      { qty: 4, unitPrice: 4.5 }, // Straps 12
      { qty: 16, unitPrice: 1.2 }, // Corners 50
      { qty: 2, unitPrice: 18.0 }, // Shrink wrap 120g
    ];
    expect(computeSuppliesSubtotal(items)).toBe(73.2);
  });
});

describe("computeTrendPercent", () => {
  it("matches the seed's +20% (24 vs 20, DECISIONS.md B8)", () => {
    expect(computeTrendPercent(24, 20)).toBe(20);
  });

  it("rounds to the nearest integer", () => {
    expect(computeTrendPercent(20, 24)).toBe(-17);
  });

  it("treats previous=0 as +100% when current > 0, and 0% when both are 0", () => {
    expect(computeTrendPercent(5, 0)).toBe(100);
    expect(computeTrendPercent(0, 0)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("groups thousands — a five-figure spend total is unreadable otherwise", () => {
    expect(formatMoney(19732.19)).toBe("$19,732.19");
    expect(formatMoney(822.17)).toBe("$822.17");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(18)).toBe("$18.00");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("renders an em dash for null, so a missing amount is never '$null'", () => {
    expect(formatMoney(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("signs positive values and leaves negatives as-is", () => {
    expect(formatPercent(20)).toBe("+20%");
    expect(formatPercent(-17)).toBe("-17%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatDateWithYear", () => {
  it("spells the year out and keeps the UTC time", () => {
    expect(formatDateWithYear(new Date("2026-04-17T09:00:00.000Z"))).toBe("17 Apr 2026, 09:00");
  });

  it("reads the date in UTC, never in the server's local zone", () => {
    // 23:30Z on the 31st is already 02:30 on 1 Jan in UTC+3 — a local-time formatter would
    // print the wrong day, month and year all at once.
    expect(formatDateWithYear(new Date("2026-12-31T23:30:00.000Z"))).toBe("31 Dec 2026, 23:30");
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatDateWithYear(new Date("2026-01-05T08:05:00.000Z"))).toBe("5 Jan 2026, 08:05");
  });
});

describe("getRelativeDayLabel", () => {
  const now = new Date("2026-04-17T14:00:00.000Z");

  it("labels the same UTC calendar day as today, whatever the time of day", () => {
    expect(getRelativeDayLabel(new Date("2026-04-17T00:00:00.000Z"), now)).toBe("today");
    expect(getRelativeDayLabel(new Date("2026-04-17T23:59:59.999Z"), now)).toBe("today");
  });

  it("labels the adjacent days", () => {
    expect(getRelativeDayLabel(new Date("2026-04-18T00:00:00.000Z"), now)).toBe("tomorrow");
    expect(getRelativeDayLabel(new Date("2026-04-16T23:59:59.999Z"), now)).toBe("yesterday");
  });

  it("returns null further out, so the grid falls back to the plain date", () => {
    expect(getRelativeDayLabel(new Date("2026-04-19T09:00:00.000Z"), now)).toBeNull();
    expect(getRelativeDayLabel(new Date("2026-04-15T09:00:00.000Z"), now)).toBeNull();
  });

  it("survives a DST-shifting month boundary — days are compared as UTC dates, not by ms/86400000", () => {
    const marchEnd = new Date("2026-03-31T22:00:00.000Z");
    expect(getRelativeDayLabel(new Date("2026-04-01T01:00:00.000Z"), marchEnd)).toBe("tomorrow");
  });
});
