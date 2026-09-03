import { describe, expect, it } from "vitest";
import { getWeekBucket, getWeekBucketRange, WEEK_BUCKET_COUNT } from "./week";

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
