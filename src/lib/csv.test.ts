import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves plain values untouched", () => {
    expect(csvCell("FR001383")).toBe("FR001383");
    expect(csvCell(12)).toBe("12");
  });

  it("renders null and undefined as an empty cell", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas and doubles embedded quotes", () => {
    expect(csvCell("Toronto, ON")).toBe('"Toronto, ON"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("quotes a lone CR, not just LF — rows are joined with CRLF", () => {
    expect(csvCell("a\rb")).toBe('"a\rb"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("+CMD")).toBe("'+CMD");
  });

  it("applies the formula guard inside the quotes when both are needed", () => {
    expect(csvCell("=HYPERLINK(a,b)")).toBe('"\'=HYPERLINK(a,b)"');
  });
});

describe("toCsv", () => {
  it("joins header and rows with CRLF", () => {
    const csv = toCsv(["Number", "Hub"], [
      ["FR001383", "Markham"],
      ["FR001674", "Toronto, ON"],
    ]);
    expect(csv).toBe('Number,Hub\r\nFR001383,Markham\r\nFR001674,"Toronto, ON"');
  });

  it("emits a header-only document for an empty result", () => {
    expect(toCsv(["Number"], [])).toBe("Number");
  });
});
