import { describe, expect, it } from "vitest";
import {
  computeLineTotal,
  computeSuppliesSubtotal,
  computeTrendPercent,
  formatMoney,
  formatPercent,
  formatQuantityLabel,
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
