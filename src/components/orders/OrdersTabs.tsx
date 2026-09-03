import type { OrderTabFilter, TabCounters } from "@/lib/filters";
import { buildQueryString } from "@/lib/query";

type OrdersTabsProps = {
  /** Counters come from getOrders() — already computed without the current tab
   * (api-contract.md). Nothing here recounts anything. */
  counters: TabCounters;
  activeTab: OrderTabFilter;
  searchParams: URLSearchParams;
};

const TABS: { value: OrderTabFilter; label: string; counter: keyof TabCounters }[] = [
  { value: "all", label: "All", counter: "all" },
  { value: "cross-dock", label: "Cross-Dock", counter: "crossDock" },
  { value: "consolidation", label: "Consolidation", counter: "consolidation" },
  { value: "alerts", label: "Alerts", counter: "alerts" },
  { value: "drafts", label: "Drafts", counter: "drafts" },
];

const ORDERS_PATH = "/orders";

/**
 * Tabs are plain `<a>` links, deliberately — not `<Link>`, not buttons.
 *
 * Each tab is an addressable state (DECISIONS.md A5), so an anchor is what it actually is:
 * middle-click, "copy link address" and back/forward all work for free.
 *
 * Why a full navigation instead of `<Link>`'s client-side one: on this Next build, a client
 * navigation that changes *only* the query string of the current route fetches the new RSC
 * payload (verified: 200, correct segment) but never commits it — the URL and the list both stay
 * put. Cross-route client navigation and any full load are unaffected. Since every screen here is
 * `force-dynamic`, a full navigation performs exactly the same server render, so the only thing
 * given up is the client-side transition; what is gained is that the address bar and the rendered
 * list can never disagree. See PROGRESS.md (Stage 5) for the full evidence.
 *
 * Switching a tab also drops `page` — page 3 of the old segment is meaningless in the new one.
 */
export function OrdersTabs({ counters, activeTab, searchParams }: OrdersTabsProps) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.value === activeTab;
        const href = `${ORDERS_PATH}${buildQueryString(searchParams, {
          tab: tab.value === "all" ? null : tab.value,
          page: null,
        })}`;
        return (
          <a
            key={tab.value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[13px] font-semibold ${
              active ? "border-b-red text-navy" : "border-b-transparent text-muted hover:text-navy"
            }`}
          >
            {tab.label}{" "}
            <span
              className={`rounded-lg px-1.5 py-px text-[10px] ${
                tab.value === "alerts" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#E5E7EB] text-[#374151]"
              }`}
            >
              {counters[tab.counter]}
            </span>
          </a>
        );
      })}
    </div>
  );
}
