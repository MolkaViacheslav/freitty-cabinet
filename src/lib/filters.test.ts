import { describe, expect, it } from "vitest";
import { buildOrdersWhere, foldTabCounters } from "./filters";

const NOW = new Date("2026-09-03T15:20:00.000Z"); // Thursday
const LAST_30_DAYS_START = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);

describe("buildOrdersWhere", () => {
  it("defaults to last-30-days scheduledAt filter only", () => {
    expect(buildOrdersWhere({}, NOW)).toEqual({
      AND: [{ scheduledAt: { gte: LAST_30_DAYS_START } }],
    });
  });

  it("tab=drafts filters by DRAFT status", () => {
    expect(buildOrdersWhere({ tab: "drafts" }, NOW)).toEqual({
      AND: [{ status: "DRAFT" }, { scheduledAt: { gte: LAST_30_DAYS_START } }],
    });
  });

  it("tab=drafts ignores the status filter (DECISIONS.md B2)", () => {
    const withStatus = buildOrdersWhere({ tab: "drafts", status: "new" }, NOW);
    const withoutStatus = buildOrdersWhere({ tab: "drafts" }, NOW);
    expect(withStatus).toEqual(withoutStatus);
  });

  it("tab=alerts requires hasAlert and excludes drafts", () => {
    expect(buildOrdersWhere({ tab: "alerts" }, NOW)).toEqual({
      AND: [{ hasAlert: true, status: { not: "DRAFT" } }, { scheduledAt: { gte: LAST_30_DAYS_START } }],
    });
  });

  it("combines tab + hub + status + period + search with AND (DECISIONS.md B2)", () => {
    const where = buildOrdersWhere(
      { tab: "cross-dock", hub: "markham", status: "in-progress", period: "this-week", search: "FR0016" },
      NOW,
    );
    expect(where).toEqual({
      AND: [
        { type: "CROSS_DOCK", hasAlert: false, status: { not: "DRAFT" } },
        { hub: { name: { equals: "markham", mode: "insensitive" } } },
        { status: "IN_PROGRESS" },
        { scheduledAt: { gte: new Date("2026-08-31T00:00:00.000Z") } }, // Monday of NOW's ISO week
        {
          OR: [
            { number: { contains: "FR0016", mode: "insensitive" } },
            { refNumber: { contains: "FR0016", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("status=new maps to READY, status=in-progress maps to IN_PROGRESS", () => {
    expect(buildOrdersWhere({ status: "new" }, NOW)).toEqual({
      AND: [{ status: "READY" }, { scheduledAt: { gte: LAST_30_DAYS_START } }],
    });
    expect(buildOrdersWhere({ status: "in-progress" }, NOW)).toEqual({
      AND: [{ status: "IN_PROGRESS" }, { scheduledAt: { gte: LAST_30_DAYS_START } }],
    });
  });

  it("period=today uses the start of the current UTC day", () => {
    expect(buildOrdersWhere({ period: "today" }, NOW)).toEqual({
      AND: [{ scheduledAt: { gte: new Date("2026-09-03T00:00:00.000Z") } }],
    });
  });

  it("period=this-week uses the Monday of the current ISO week", () => {
    expect(buildOrdersWhere({ period: "this-week" }, NOW)).toEqual({
      AND: [{ scheduledAt: { gte: new Date("2026-08-31T00:00:00.000Z") } }],
    });
  });
});

describe("foldTabCounters", () => {
  it("sums into the right segment per DECISIONS.md B1 priority (Draft > Alert > type)", () => {
    const counters = foldTabCounters([
      { status: "DRAFT", hasAlert: false, type: "CONSOLIDATION", count: 1 },
      { status: "READY", hasAlert: true, type: "CROSS_DOCK", count: 2 },
      { status: "IN_PROGRESS", hasAlert: false, type: "CROSS_DOCK", count: 18 },
      { status: "CLOSED", hasAlert: false, type: "CONSOLIDATION", count: 6 },
    ]);
    expect(counters).toEqual({ all: 27, drafts: 1, alerts: 2, crossDock: 18, consolidation: 6 });
  });

  it("a DRAFT with hasAlert still counts as drafts — Draft outranks Alert", () => {
    const counters = foldTabCounters([{ status: "DRAFT", hasAlert: true, type: "CROSS_DOCK", count: 1 }]);
    expect(counters).toEqual({ all: 1, drafts: 1, alerts: 0, crossDock: 0, consolidation: 0 });
  });

  it("returns all zeros for an empty group list", () => {
    expect(foldTabCounters([])).toEqual({ all: 0, drafts: 0, alerts: 0, crossDock: 0, consolidation: 0 });
  });
});
