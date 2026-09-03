import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildQueryString, parseSearchParams, toSearchParams } from "./query";

const schema = z.object({
  hub: z.string().trim().min(1).optional(),
  tab: z.enum(["all", "alerts"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});

describe("parseSearchParams", () => {
  it("treats an empty param as absent, not invalid (a cleared UI filter)", () => {
    const params = new URLSearchParams("hub=&tab=&page=");
    const result = parseSearchParams(schema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ hub: undefined, tab: "all", page: 1 });
    }
  });

  it("still validates a genuinely invalid non-empty value", () => {
    const params = new URLSearchParams("tab=bogus");
    const result = parseSearchParams(schema, params);
    expect(result.success).toBe(false);
  });

  it("passes non-empty values through untouched", () => {
    const params = new URLSearchParams("hub=markham&tab=alerts&page=2");
    const result = parseSearchParams(schema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ hub: "markham", tab: "alerts", page: 2 });
    }
  });
});

describe("toSearchParams", () => {
  it("converts Next's searchParams record", () => {
    expect(toSearchParams({ tab: "alerts", hub: "markham" }).toString()).toBe("tab=alerts&hub=markham");
  });

  it("drops undefined values", () => {
    expect(toSearchParams({ tab: "alerts", hub: undefined }).toString()).toBe("tab=alerts");
  });

  it("takes the last value of a repeated param", () => {
    expect(toSearchParams({ hub: ["markham", "toronto"] }).get("hub")).toBe("toronto");
  });

  it("keeps an empty string, so parseSearchParams can decide it means 'no filter'", () => {
    expect(toSearchParams({ hub: "" }).toString()).toBe("hub=");
  });
});

describe("buildQueryString", () => {
  const base = new URLSearchParams("tab=alerts&hub=markham&page=3");

  it("overrides a key and keeps the rest", () => {
    expect(buildQueryString(base, { page: 2 })).toBe("?hub=markham&page=2&tab=alerts");
  });

  it("removes a key on null — that is how 'Hub: All' clears the filter", () => {
    expect(buildQueryString(base, { hub: null })).toBe("?page=3&tab=alerts");
  });

  it("treats an empty string as removal too", () => {
    expect(buildQueryString(base, { hub: "" })).toBe("?page=3&tab=alerts");
  });

  it("returns an empty string when nothing is left, so the href is just the path", () => {
    expect(buildQueryString(new URLSearchParams("page=2"), { page: null })).toBe("");
  });

  it("is order-stable — the same filter state always yields the same URL", () => {
    const a = buildQueryString(new URLSearchParams("hub=markham&tab=alerts"));
    const b = buildQueryString(new URLSearchParams("tab=alerts&hub=markham"));
    expect(a).toBe(b);
  });

  it("adds a key that was not there before", () => {
    expect(buildQueryString(new URLSearchParams(""), { view: "table" })).toBe("?view=table");
  });
});
