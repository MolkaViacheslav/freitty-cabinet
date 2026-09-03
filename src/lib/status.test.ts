import { describe, expect, it } from "vitest";
import { ACTIVE_ORDER_STATUSES, getOrderTypeLabel, getRoleLabel, getStatusFlow, getStatusLabel } from "./status";

describe("getOrderTypeLabel", () => {
  it("maps order types to their display labels", () => {
    expect(getOrderTypeLabel("CROSS_DOCK")).toBe("Cross-Dock");
    expect(getOrderTypeLabel("CONSOLIDATION")).toBe("Consolidation");
  });
});

describe("getRoleLabel", () => {
  it("maps every role, including the two-word one", () => {
    expect(getRoleLabel("ADMIN")).toBe("Admin");
    expect(getRoleLabel("DISPATCHER")).toBe("Dispatcher");
    expect(getRoleLabel("DRIVER")).toBe("Driver");
    expect(getRoleLabel("FLOOR_LEAD")).toBe("Floor lead");
  });
});

describe("ACTIVE_ORDER_STATUSES", () => {
  it("is everything except DRAFT and CLOSED (DECISIONS.md B6)", () => {
    expect([...ACTIVE_ORDER_STATUSES]).toEqual(["READY", "IN_PROGRESS", "CONSOLIDATED", "IN_TRANSIT", "DECONSOLIDATED"]);
  });

  it("excludes the two inactive statuses explicitly — the KPI and the card list share this list", () => {
    expect(ACTIVE_ORDER_STATUSES).not.toContain("DRAFT");
    expect(ACTIVE_ORDER_STATUSES).not.toContain("CLOSED");
  });
});

describe("getStatusLabel", () => {
  it("maps READY to New regardless of type", () => {
    expect(getStatusLabel("READY", "CROSS_DOCK")).toBe("New");
    expect(getStatusLabel("READY", "CONSOLIDATION")).toBe("New");
  });

  it("splits IN_PROGRESS by type (DECISIONS.md B4)", () => {
    expect(getStatusLabel("IN_PROGRESS", "CROSS_DOCK")).toBe("On Stock");
    expect(getStatusLabel("IN_PROGRESS", "CONSOLIDATION")).toBe("In progress");
  });

  it("maps the rest of the pipeline 1:1", () => {
    expect(getStatusLabel("DRAFT", "CROSS_DOCK")).toBe("Draft");
    expect(getStatusLabel("CONSOLIDATED", "CONSOLIDATION")).toBe("Consolidated");
    expect(getStatusLabel("IN_TRANSIT", "CONSOLIDATION")).toBe("In transit");
    expect(getStatusLabel("DECONSOLIDATED", "CONSOLIDATION")).toBe("Deconsolidated");
    expect(getStatusLabel("CLOSED", "CROSS_DOCK")).toBe("Completed");
  });

  it("hasAlert overrides the label regardless of status/type", () => {
    expect(getStatusLabel("IN_PROGRESS", "CONSOLIDATION", true)).toBe("Alert");
    expect(getStatusLabel("CLOSED", "CROSS_DOCK", true)).toBe("Alert");
    expect(getStatusLabel("DRAFT", "CROSS_DOCK", true)).toBe("Alert");
  });
});

describe("getStatusFlow", () => {
  it("CLOSED jumps straight from IN_PROGRESS, skipping consolidation-only stages", () => {
    expect(getStatusFlow("CLOSED")).toEqual(["DRAFT", "READY", "IN_PROGRESS", "CLOSED"]);
  });

  it("intermediate statuses show the full chain reached so far", () => {
    expect(getStatusFlow("DRAFT")).toEqual(["DRAFT"]);
    expect(getStatusFlow("READY")).toEqual(["DRAFT", "READY"]);
    expect(getStatusFlow("CONSOLIDATED")).toEqual(["DRAFT", "READY", "IN_PROGRESS", "CONSOLIDATED"]);
    expect(getStatusFlow("DECONSOLIDATED")).toEqual([
      "DRAFT",
      "READY",
      "IN_PROGRESS",
      "CONSOLIDATED",
      "IN_TRANSIT",
      "DECONSOLIDATED",
    ]);
  });
});
