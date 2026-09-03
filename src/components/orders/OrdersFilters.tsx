"use client";

import type { OrderTabFilter } from "@/lib/filters";
import type { HubOption } from "@/server/services/hubs.service";
import { useOrdersUrl } from "./use-orders-url";

type OrdersFiltersProps = {
  activeTab: OrderTabFilter;
  hubs: HubOption[];
  hub?: string;
  status?: string;
  period: string;
  /** Current query string, as a plain serializable value (a URLSearchParams instance cannot cross
   * the server/client boundary). The selects build the next URL from it. */
  query: string;
};

const PERIODS = [
  { value: "last-30-days", label: "Last 30 days" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This week" },
];

const STATUSES = [
  { value: "new", label: "New" },
  { value: "in-progress", label: "In progress" },
];

const SELECT =
  "rounded-md border border-[#D0D7DE] bg-white px-2.5 py-1.5 text-xs text-ink disabled:cursor-not-allowed disabled:bg-page disabled:text-[#9CA3AF]";

/**
 * The only client component on this screen, and only because a `<select>` needs an onChange to
 * navigate — tabs, view and paging are all plain links.
 *
 * It still holds no data: `onChange` rewrites the URL and the Server Component re-renders. The
 * selects are controlled by the values parsed out of the URL, not by React state, so the control
 * and the list can never disagree.
 */
export function OrdersFilters({ activeTab, hubs, hub, status, period, query }: OrdersFiltersProps) {
  const setParams = useOrdersUrl("/orders", query);

  // DECISIONS.md B2: the Drafts tab ignores Status (a draft has no meaningful pipeline status), so
  // the control is disabled rather than silently having no effect. The value stays in the URL, so
  // switching back to another tab restores the filter the user had picked.
  const statusDisabled = activeTab === "drafts";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={SELECT} value={hub ?? ""} onChange={(e) => setParams({ hub: e.target.value || null })} aria-label="Hub">
        <option value="">Hub: All</option>
        {hubs.map((h) => (
          <option key={h.slug} value={h.slug}>
            {h.name}
          </option>
        ))}
      </select>

      <select className={SELECT} value={period} onChange={(e) => setParams({ period: e.target.value })} aria-label="Date">
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            Date: {p.label}
          </option>
        ))}
      </select>

      <select
        className={SELECT}
        value={status ?? ""}
        disabled={statusDisabled}
        title={statusDisabled ? "Drafts have no pipeline status (DECISIONS.md B2)" : undefined}
        onChange={(e) => setParams({ status: e.target.value || null })}
        aria-label="Status"
      >
        <option value="">Status: Any</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
