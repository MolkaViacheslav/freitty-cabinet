import type { z } from "zod";

/**
 * Strips empty-string entries (e.g. `?hub=` left behind by a cleared UI filter) before
 * validating, then safeParses. Filters live in the URL (DECISIONS.md A5), and resetting a
 * filter naturally produces an empty param — that means "no filter", not an invalid value.
 */
export function parseSearchParams<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams,
): z.ZodSafeParseResult<z.output<T>> {
  const input: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== "") input[key] = value;
  }
  return schema.safeParse(input) as z.ZodSafeParseResult<z.output<T>>;
}
