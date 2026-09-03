import type { OrderStatus, OrderType } from "@prisma/client";
import { Breadcrumbs } from "../_components/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type SampleRow = { number: string; type: OrderType; status: OrderStatus; hasAlert: boolean; hub: string };

const SAMPLE_ROWS: SampleRow[] = [
  { number: "FR001676", type: "CONSOLIDATION", status: "IN_PROGRESS", hasAlert: false, hub: "Markham" },
  { number: "FR001674", type: "CONSOLIDATION", status: "IN_PROGRESS", hasAlert: true, hub: "Markham" },
  { number: "FR001672", type: "CROSS_DOCK", status: "CLOSED", hasAlert: false, hub: "Markham" },
];

const ALL_STATUSES: { status: OrderStatus; type: OrderType }[] = [
  { status: "DRAFT", type: "CROSS_DOCK" },
  { status: "READY", type: "CROSS_DOCK" },
  { status: "IN_PROGRESS", type: "CROSS_DOCK" },
  { status: "IN_PROGRESS", type: "CONSOLIDATION" },
  { status: "CONSOLIDATED", type: "CONSOLIDATION" },
  { status: "IN_TRANSIT", type: "CONSOLIDATION" },
  { status: "DECONSOLIDATED", type: "CONSOLIDATION" },
  { status: "CLOSED", type: "CROSS_DOCK" },
];

/**
 * Stage 3 sandbox — not a real screen, just atoms placed next to each other to check them
 * against docs/mockup.html. All data below is fixed sample data for visual verification,
 * never fetched from the API. Deleted once Dashboard/Order List/Order Detail (Stages 4–6)
 * replace it as the real "/" route.
 */
export default function SandboxPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "UI Sandbox" }]} />
        <h1 className="text-xl font-bold text-ink">UI Sandbox — Stage 3 atoms</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Тимчасова сторінка для перевірки атомів проти docs/mockup.html. Дані нижче — фіксовані приклади для
          демонстрації стилів, не з БД.
        </p>
      </div>

      <section className="grid grid-cols-4 gap-3">
        <KpiCard label="Active Orders" value={7} accent="blue" trend={{ direction: "up", text: "2 this week" }} />
        <KpiCard
          label="Completed (30 d)"
          value={24}
          accent="green"
          trend={{ direction: "flat", text: "same as last month" }}
        />
        <KpiCard label="Need Attention" value={3} accent="red" trend={{ direction: "down", text: "2 alert · 1 awaiting" }} />
        <KpiCard label="Avg $/order" value="$767.53" accent="orange" />
      </section>

      <section className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(({ status, type }) => (
          <StatusBadge key={`${status}-${type}`} status={status} type={type} />
        ))}
        <StatusBadge status="IN_PROGRESS" type="CONSOLIDATION" hasAlert />
        <TypeBadge type="CROSS_DOCK" />
        <TypeBadge type="CONSOLIDATION" />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-semibold text-ink">Card atom</div>
          <p className="mt-1 text-xs text-muted">Generic container: rounded-card + border, used for KPI/content blocks.</p>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Skeleton atom</div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      </section>

      <section>
        <DataTable
          rowKey={(row) => row.number}
          columns={[
            {
              key: "number",
              header: "Number",
              render: (row) => <span className="font-bold text-navy">{row.number}</span>,
            },
            { key: "type", header: "Type", render: (row) => <TypeBadge type={row.type} /> },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} type={row.type} hasAlert={row.hasAlert} />,
            },
            { key: "hub", header: "Hub", render: (row) => row.hub },
          ]}
          rows={SAMPLE_ROWS}
        />
      </section>

      <section>
        <EmptyState title="No orders match these filters" description="Try clearing Hub or Status filters." />
      </section>
    </div>
  );
}
