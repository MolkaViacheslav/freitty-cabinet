import { getOrders } from "@/server/services/orders.service";
import { getHubOptions } from "@/server/services/hubs.service";
import { ordersQuerySchema } from "@/server/dto/orders.dto";
import { buildQueryString, parseSearchParams, toSearchParams } from "@/lib/query";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderCard } from "@/components/orders/OrderCard";
import { DraftOrderCard } from "@/components/orders/DraftOrderCard";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersPagination } from "@/components/orders/OrdersPagination";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersTabs } from "@/components/orders/OrdersTabs";
import { ViewSwitch, type OrdersView } from "@/components/orders/ViewSwitch";
import { Breadcrumbs } from "../../_components/Breadcrumbs";

export const dynamic = "force-dynamic";

/** `view` is presentation only — it never reaches the service, so it is parsed separately from
 * the filter schema rather than polluting the API contract. */
function parseView(value: string | null): OrdersView {
  return value === "table" ? "table" : "cards";
}

/**
 * Order List.
 *
 * Like the Dashboard, this is a Server Component that calls `getOrders(filters)` **directly** —
 * no fetch to our own /api/orders (DECISIONS.md A2). The filter bar and view switch are the only
 * client code, and all they do is rewrite the URL; `router.push` then re-runs *this* function on
 * the server. So there is no client-side data fetching at all, and no second copy of the filter
 * state living in React.
 *
 * The tab/filter combination rules (DECISIONS.md B1 mutually-exclusive tabs, B2 AND-combination
 * with Drafts ignoring Status) are already implemented in lib/filters.ts and are not re-decided
 * here. Tab counters likewise come from getOrders() — the page never recounts them.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = toSearchParams(raw);
  const view = parseView(params.get("view"));

  // Same schema as the API route. An unparseable filter falls back to defaults instead of 400-ing:
  // a hand-edited URL should show the default list, not blank the screen (same call as Stage 4).
  const parsed = parseSearchParams(ordersQuerySchema, params);
  const filters = parsed.success ? parsed.data : ordersQuerySchema.parse({});

  const [result, hubs] = await Promise.all([getOrders(filters), getHubOptions()]);
  const { items, pagination, counters } = result;

  // The export takes the *current* filters, minus anything that is about presentation or paging —
  // api-contract.md: the CSV is the whole matching selection, not the visible page.
  const exportHref = `/api/orders/export${buildQueryString(params, { page: null, pageSize: null, view: null })}`;

  return (
    <div className="flex flex-col">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Orders" }]} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-ink">All Orders</h1>
        <div className="ml-auto flex gap-2">
          <a
            href={exportHref}
            className="rounded-md border border-blue bg-white px-4 py-2 text-[13px] font-semibold text-navy hover:bg-page"
          >
            📥 Export CSV
          </a>
          {/* Mutations are out of scope (CLAUDE.md) — shown disabled, never faked. */}
          <button
            type="button"
            disabled
            title="Out of scope"
            className="cursor-not-allowed rounded-md bg-red/50 px-4 py-2 text-[13px] font-semibold text-white"
          >
            + New Order
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <OrdersTabs counters={counters} activeTab={filters.tab} searchParams={params} />
        <div className="flex flex-wrap items-center gap-2">
          <OrdersFilters
            activeTab={filters.tab}
            hubs={hubs}
            hub={filters.hub}
            status={filters.status}
            period={filters.period}
            query={params.toString()}
          />
          <div className="ml-auto">
            <ViewSwitch current={view} searchParams={params} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            title="No orders match these filters"
            description="Try a different tab, another hub, or widen the date range."
          />
        ) : view === "table" ? (
          <OrdersTable orders={items} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((order) =>
              order.status === "DRAFT" ? (
                <DraftOrderCard key={order.id} order={order} />
              ) : (
                <OrderCard key={order.id} order={order} />
              ),
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <OrdersPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          searchParams={params}
        />
      )}
    </div>
  );
}
