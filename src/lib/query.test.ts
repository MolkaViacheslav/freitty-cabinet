import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseSearchParams } from "./query";

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
