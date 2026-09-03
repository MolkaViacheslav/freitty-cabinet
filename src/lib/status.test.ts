import { describe, expect, it } from "vitest";
import { getStatusFlow, getStatusLabel } from "./status";

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
