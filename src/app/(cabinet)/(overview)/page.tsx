import Link from "next/link";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { getActiveOrders } from "@/server/services/orders.service";
import { getCabinetUser } from "@/server/services/users.service";
import { dashboardQuerySchema } from "@/server/dto/orders.dto";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderCard } from "@/components/orders/OrderCard";
import { ActivityCharts } from "@/components/dashboard/ActivityCharts";
import { GranularitySwitch } from "@/components/dashboard/GranularitySwitch";
import { InsightsRow } from "@/components/dashboard/InsightsRow";
import { NeedAttentionCard } from "@/components/dashboard/NeedAttentionCard";
import { formatMoney, formatPercent } from "@/lib/format";
import { Breadcrumbs } from "../_components/Breadcrumbs";

export const dynamic = "force-dynamic";

/** How many order cards the "Active Orders" section shows — the mockup's 2×2 grid. */
const ACTIVE_ORDERS_PREVIEW = 4;

/**
 * Dashboard.
 *
 * This page calls `getDashboardSummary()` and `getActiveOrders()` **directly**, as ordinary async
 * functions — it does NOT fetch('/api/dashboard/summary'). That is the central architectural claim
 * of the project (DECISIONS.md A2): the REST route and this page are two independent consumers of
 * one service layer, not a chain where the page goes over HTTP to its own API. An app requesting
 * itself over HTTP would add a pointless network hop and a slower TTFB; the REST route still
 * exists on its own for curl and for future client-side interactions.
 *
 * Consequence you can verify in DevTools: loading `/` issues no request to /api/dashboard/summary.
 *
 * Nothing below is hardcoded — every number, label and card field comes from the services.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Same zod schema the API route uses; an unknown ?granularity= falls back to the default here
  // rather than 400-ing, because a bad URL should not blank out a screen the user is looking at.
  const raw = await searchParams;
  const parsed = dashboardQuerySchema.safeParse(raw);
  const granularity = parsed.success ? parsed.data.granularity : "week";

  const [summary, activeOrders, user] = await Promise.all([
    getDashboardSummary(granularity),
    getActiveOrders(ACTIVE_ORDERS_PREVIEW),
    getCabinetUser(),
  ]);

  const { activeOrders: activeKpi, completed30d, needAttention } = summary.kpi;

  return (
    <div className="flex flex-col">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      <h1 className="mb-5 text-xl font-bold text-ink">Welcome, {user?.name ?? "there"} 👋</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Orders"
          value={activeKpi.value}
          accent="blue"
          trend={{ direction: activeKpi.trend.direction, text: `${activeKpi.trend.value} ${activeKpi.trend.label}` }}
        />
        <KpiCard
          label="Completed (30 d)"
          value={completed30d.value}
          accent="green"
          trend={{
            direction: completed30d.trend.direction,
            text: `${formatPercent(completed30d.trend.value)} ${completed30d.trend.label}`,
          }}
        />
        <NeedAttentionCard value={needAttention.value} breakdown={needAttention.breakdown} href="/orders?tab=alerts" />
      </section>

      <div className="mt-5 mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Active Orders</h2>
        <Link href="/orders" className="text-xs font-semibold text-blue hover:underline">
          View all →
        </Link>
      </div>

      {activeOrders.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      ) : (
        <EmptyState title="No active orders" description="Everything is either closed or still a draft." />
      )}

      <section className="mt-6 rounded-card border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">📊 Your activity</h2>
          <GranularitySwitch current={granularity} />
        </div>

        <ActivityCharts
          buckets={summary.activity.buckets}
          completedTotalLabel={String(completed30d.value)}
          spendTotalLabel={formatMoney(summary.insights.totalSpend30d)}
        />

        <InsightsRow
          completedChangePercent={summary.insights.completedChangePercent}
          totalSpend30d={summary.insights.totalSpend30d}
          avgPerOrder={summary.insights.avgPerOrder}
          bestWeek={summary.insights.bestWeek}
        />
      </section>
    </div>
  );
}
