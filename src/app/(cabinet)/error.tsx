"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

/** Segment-level error boundary. The most likely cause in this app is the Supabase free-tier
 * project being paused, so the copy says what to do rather than dumping a stack trace. */
export default function CabinetError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[cabinet] render failed", error);
  }, [error]);

  return (
    <EmptyState
      icon="⚠️"
      title="Could not load this screen"
      description="The database did not answer. If this is the hosted demo, the Supabase project may be paused — it needs a manual restore from the dashboard."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-blue"
        >
          Try again
        </button>
      }
    />
  );
}
