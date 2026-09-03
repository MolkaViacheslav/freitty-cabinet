"use client";

import { useCallback } from "react";
import { buildQueryString } from "@/lib/query";

/** Params that describe *which* orders are shown. Changing any of them invalidates the page number. */
const FILTER_KEYS = ["tab", "hub", "status", "period", "search"] as const;

/**
 * The one place client controls are allowed to change the Order List's state.
 *
 * Nothing here holds data in `useState` — filters live in the URL (DECISIONS.md A5), so the only
 * thing a control does is compute the next URL and go there. The Server Component then re-reads
 * the filters and calls getOrders(); there is no client-side fetch of /api/orders and no second
 * copy of the filter state to keep in sync.
 *
 * Navigation is a full page load (`location.assign`), not `router.push`, for the reason documented
 * in OrdersTabs: on this Next build a client navigation that changes only the query string of the
 * current route fetches the right RSC payload and then never commits it. Every screen here is
 * `force-dynamic`, so a full navigation is the same server render either way.
 *
 * `query` is passed in from the Server Component as a plain string — a URLSearchParams instance
 * is not serializable across the server/client boundary.
 */
export function useOrdersUrl(path: string, query: string) {
  return useCallback(
    (changes: Record<string, string | number | null>) => {
      // Any change to what is being filtered invalidates the current page — page 3 of the old
      // result set is meaningless (and often empty) in the new one.
      const touchesFilters = Object.keys(changes).some((key) =>
        FILTER_KEYS.includes(key as (typeof FILTER_KEYS)[number]),
      );
      const next = touchesFilters ? { ...changes, page: null } : changes;
      window.location.assign(`${path}${buildQueryString(new URLSearchParams(query), next)}`);
    },
    [path, query],
  );
}
