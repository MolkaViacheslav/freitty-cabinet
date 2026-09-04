import { notFound } from "next/navigation";
import { getOrderByNumber } from "@/server/services/orders.service";
import { OrderDetailHeader } from "@/components/orders/OrderDetailHeader";
import { OrderAlertBanner } from "@/components/orders/OrderAlertBanner";
import { OrderInfoGrid } from "@/components/orders/OrderInfoGrid";
import { DockCard } from "@/components/orders/DockCard";
import { ActualCard, ExpectedCard } from "@/components/orders/DeltaCards";
import { WarehouseNotePanel } from "@/components/orders/WarehouseNotePanel";
import { SubOrdersTable } from "@/components/orders/SubOrdersTable";
import { OperationsTable } from "@/components/orders/OperationsTable";
import { SuppliesTable } from "@/components/orders/SuppliesTable";
import { Breadcrumbs } from "../../_components/Breadcrumbs";

export const dynamic = "force-dynamic";

/**
 * Order Detail. Server Component, calls `getOrderByNumber(number)` **directly** — no fetch to
 * our own /api/orders/[number] (DECISIONS.md A2, same as Dashboard and Order List).
 *
 * A missing order → `notFound()`, which renders `(cabinet)/not-found.tsx` with a real HTTP 404.
 * That only works because this segment has no `loading.tsx` above it: a Suspense boundary would
 * let the shell flush with a 200 before this function ever reached `notFound()`. See the route
 * groups `(overview)` and `orders/(list)`, which keep their skeletons without covering this page.
 */
export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await getOrderByNumber(number);
  if (!order) notFound();

  return (
    <div className="flex flex-col">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Orders", href: "/orders" }, { label: order.number }]}
      />

      <OrderDetailHeader order={order} />

      {order.hasAlert && <OrderAlertBanner alertMessage={order.alertMessage} subOrders={order.subOrders} />}

      <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-l-[3px] border-amber-border border-l-amber-accent bg-amber-bg px-3.5 py-2.5 text-xs text-amber-ink">
        <span className="text-base">ℹ️</span>
        <span>
          <strong>Read-only:</strong> Transfers between hubs are handled by the call center only. Contact support if
          this order needs to move.
        </span>
      </div>

      <OrderInfoGrid order={order} now={new Date()} />

      <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-[300px_1fr]">
        <DockCard dock={order.dock} trailerNumber={order.trailerNumber} />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <ExpectedCard expected={order.delta.expected} unit={order.unit} xlQty={order.xlQty} />
          <ActualCard delta={order.delta} />
          <WarehouseNotePanel
            note={order.warehouseNote}
            photosCount={order.photosCount}
            photosLimit={order.photosLimit}
          />
        </div>
      </div>

      {order.subOrders.length > 0 && (
        <SubOrdersTable subOrders={order.subOrders} totalPallets={order.subOrdersPallets} />
      )}

      <OperationsTable operations={order.operations} />
      <SuppliesTable supplies={order.supplies} subtotal={order.suppliesSubtotal} />
    </div>
  );
}
