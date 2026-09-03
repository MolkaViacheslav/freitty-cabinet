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

/** Next's page `searchParams` arrive as a plain record; normalize to URLSearchParams so pages and
 * route handlers share one parsing path (including the empty-string stripping above). */
export function toSearchParams(record: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      // A repeated param (?hub=a&hub=b) is not meaningful for any of our filters — take the last,
      // which is what a URLSearchParams round-trip would also yield.
      if (value.length > 0) params.set(key, value[value.length - 1]);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

/**
 * Applies `changes` on top of `current` and serializes back to a query string.
 *
 * `null` removes a key — that is how "Hub: All" clears the filter instead of sending `?hub=`.
 * Keys are emitted in a stable order so the same filter state always produces the same URL
 * (otherwise Next would treat two identical states as different routes).
 */
export function buildQueryString(
  current: URLSearchParams,
  changes: Record<string, string | number | null> = {},
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  next.sort();
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}
