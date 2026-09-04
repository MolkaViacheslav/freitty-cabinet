"use client";

import { useLinkStatus } from "next/link";

type LinkPendingIndicatorProps = {
  /** "overlay" dims the whole (relatively positioned) parent with a centered spinner — for a
   * card-sized click target. "inline" is a small spinner meant to sit next to text, e.g. a table
   * cell. Defaults to "inline". */
  variant?: "overlay" | "inline";
};

/**
 * Order Detail has no `loading.tsx` above it, on purpose (CLAUDE.md — a Suspense boundary there
 * would let the shell flush with HTTP 200 before `notFound()` can answer 404, see Stage 6's fix).
 * Without a route-level boundary, clicking into an order gave zero visual feedback for the ~2s the
 * force-dynamic page takes to render — it looked like the click did nothing.
 *
 * `useLinkStatus` reads the pending state of the *specific* `<Link>` this is nested in. No
 * Suspense boundary is involved, so the 404 behaviour it would otherwise regress is untouched.
 */
export function LinkPendingIndicator({ variant = "inline" }: LinkPendingIndicatorProps) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  const spinner = (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-blue"
    />
  );

  if (variant === "inline") return spinner;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-white/70">
      {spinner}
    </div>
  );
}
