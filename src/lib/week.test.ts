import { describe, expect, it } from "vitest";
import { getWeekBucket, getWeekBucketRange, startOfIsoWeek, WEEK_BUCKET_COUNT } from "./week";

const REFERENCE = new Date("2026-09-03T15:20:00.000Z"); // Thursday, inside W10 (2026-08-31..2026-09-06)

describe("getWeekBucket", () => {
  it("places the reference date's own week in the last bucket (W10)", () => {
    expect(getWeekBucket(REFERENCE, REFERENCE)).toBe(WEEK_BUCKET_COUNT);
  });

  it("Sunday 23:59:59.999 stays in the previous ISO week, Monday 00:00:00.000 starts the next", () => {
    expect(getWeekBucket(new Date("2026-08-30T23:59:59.999Z"), REFERENCE)).toBe(9);
    expect(getWeekBucket(new Date("2026-08-31T00:00:00.000Z"), REFERENCE)).toBe(10);
  });

  it("returns null just before the 10-week window starts", () => {
    const { start } = getWeekBucketRange(1, REFERENCE);
    expect(getWeekBucket(new Date(start.getTime() - 1), REFERENCE)).toBeNull();
  });

  it("returns null just after the 10-week window ends", () => {
    const { end } = getWeekBucketRange(WEEK_BUCKET_COUNT, REFERENCE);
    expect(getWeekBucket(new Date(end.getTime() + 1), REFERENCE)).toBeNull();
  });

  it("agrees with getWeekBucketRange at both edges of every bucket", () => {
    for (let b = 1; b <= WEEK_BUCKET_COUNT; b++) {
      const { start, end } = getWeekBucketRange(b, REFERENCE);
      expect(getWeekBucket(start, REFERENCE)).toBe(b);
      expect(getWeekBucket(end, REFERENCE)).toBe(b);
    }
  });
});

/**
 * dashboard.service.ts maps raw-SQL rows to buckets by feeding `date_trunc('week', "closedAt")`
 * straight into getWeekBucket. That only works while both agree on what "start of week" means, and
 * that agreement is the one place where a timezone mistake would silently shift chart bars.
 *
 * Postgres `date_trunc('week', ts)` on a `timestamp` (no time zone) returns Monday 00:00:00 of the
 * ISO week, in the same naive UTC wall clock the column stores. These cases pin startOfIsoWeek to
 * exactly that definition — if it ever drifts, the chart breaks here instead of in production.
 */
describe("startOfIsoWeek matches Postgres date_trunc('week', ...)", () => {
  const cases: [input: string, expectedMonday: string][] = [
    ["2026-09-03T15:20:00.000Z", "2026-08-31T00:00:00.000Z"], // Thursday
    ["2026-08-31T00:00:00.000Z", "2026-08-31T00:00:00.000Z"], // Monday 00:00 — already the boundary
    ["2026-09-06T23:59:59.999Z", "2026-08-31T00:00:00.000Z"], // Sunday end-of-day, same week
    ["2026-09-07T00:00:00.000Z", "2026-09-07T00:00:00.000Z"], // next Monday
    ["2026-01-01T12:00:00.000Z", "2025-12-29T00:00:00.000Z"], // week spanning a year boundary
    ["2026-03-29T02:30:00.000Z", "2026-03-23T00:00:00.000Z"], // EU DST switch day — UTC has no shift
  ];

  it.each(cases)("%s -> %s", (input, expectedMonday) => {
    expect(startOfIsoWeek(new Date(input)).toISOString()).toBe(expectedMonday);
  });

  it("is idempotent — truncating an already-truncated value changes nothing", () => {
    const monday = startOfIsoWeek(new Date("2026-09-03T15:20:00.000Z"));
    expect(startOfIsoWeek(monday).getTime()).toBe(monday.getTime());
  });
});
