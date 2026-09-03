// ISO-week bucketing for the activity charts. See DECISIONS.md B10:
// 10 buckets, Monday-start ISO weeks, W1 = oldest, W10 = the week containing `reference`.

export const WEEK_BUCKET_COUNT = 10;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

/**
 * Maps a date to its week bucket (1..WEEK_BUCKET_COUNT) relative to `reference`.
 * Returns null if the date falls outside the 10-week window.
 */
export function getWeekBucket(date: Date, reference: Date = new Date()): number | null {
  const referenceWeekStart = startOfIsoWeek(reference);
  const dateWeekStart = startOfIsoWeek(date);
  const weeksBack = Math.round((referenceWeekStart.getTime() - dateWeekStart.getTime()) / MS_PER_WEEK);
  const bucket = WEEK_BUCKET_COUNT - weeksBack;
  if (bucket < 1 || bucket > WEEK_BUCKET_COUNT) return null;
  return bucket;
}

export function getWeekBucketLabel(bucket: number): string {
  return `W${bucket}`;
}

/** Start/end (inclusive) of a given bucket's ISO week, for range queries and seed data placement. */
export function getWeekBucketRange(bucket: number, reference: Date = new Date()): { start: Date; end: Date } {
  const referenceWeekStart = startOfIsoWeek(reference);
  const weeksBack = WEEK_BUCKET_COUNT - bucket;
  const start = new Date(referenceWeekStart.getTime() - weeksBack * MS_PER_WEEK);
  const end = new Date(start.getTime() + MS_PER_WEEK - 1);
  return { start, end };
}
