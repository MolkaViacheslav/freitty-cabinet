import { getDashboardSummary } from "@/server/services/dashboard.service";
import { getOrders } from "@/server/services/orders.service";
import { ordersQuerySchema } from "@/server/dto/orders.dto";
import { KpiCard } from "@/components/ui/KpiCard";
import { OrderCard } from "@/components/orders/OrderCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "./_components/Breadcrumbs";

export const dynamic = "force-dynamic";

/** Stage 1.5 vertical slice: Server Component calling services directly (no HTTP hop to
 * our own API, per CLAUDE.md architecture) — proves Decimal/Date DTO serialization and
 * force-dynamic work end to end before Stage 4 builds the full screen on top of this. */
export default async function DashboardPage() {
  const [summary, orders] = await Promise.all([
    getDashboardSummary(),
    getOrders(ordersQuerySchema.parse({ pageSize: 1 })),
  ]);

  const activeOrders = summary.kpi.activeOrders;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Orders" }]} />

      <KpiCard
        label="Active Orders"
        value={activeOrders.value}
        accent="blue"
        trend={{
          direction: activeOrders.trend.direction,
          text: `${activeOrders.trend.value} ${activeOrders.trend.label}`,
        }}
      />

      {orders.items[0] ? (
        <OrderCard order={orders.items[0]} />
      ) : (
        <EmptyState title="No orders yet" description="The seed database has no orders matching this view." />
      )}
    </div>
  );
}
