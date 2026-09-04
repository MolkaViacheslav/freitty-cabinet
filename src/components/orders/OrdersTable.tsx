import Link from "next/link";
import type { OrderListItemDTO } from "@/server/dto/orders.dto";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { LinkPendingIndicator } from "@/components/ui/LinkPendingIndicator";
import { AwaitingActionBadge } from "@/components/orders/AwaitingActionBadge";
import { formatDate, formatMoney } from "@/lib/format";

type OrdersTableProps = {
  orders: OrderListItemDTO[];
};

/**
 * The Table view. Same `orders` array the Cards view gets — one query, one service call, two
 * presentations; the switch is purely about layout, never about fetching different data.
 *
 * Column set and order roughly follow the CSV export (api-contract.md), but they are not
 * identical: the CSV has separate "Declared Qty"/"Actual Qty" number columns (one row per order,
 * for spreadsheet use), while this table shows a single formatted "Qty" cell (`quantityLabel`,
 * e.g. "15 × Std + 3 × XL") without `actualQty` — that number lives on the Order Detail page
 * instead. Don't assume a column here has an exact CSV counterpart.
 */
export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <DataTable
      rows={orders}
      rowKey={(order) => order.id}
      columns={[
        {
          key: "number",
          header: "Number",
          render: (order) =>
            order.status === "DRAFT" ? (
              // Drafts are not navigable in the Cards view either — editing is out of scope.
              <span data-order-number className="font-bold text-muted">
                {order.number}
              </span>
            ) : (
              <Link
                data-order-number
                href={`/orders/${order.number}`}
                prefetch={false} // same reason as OrderCard: no speculative render per row
                className="inline-flex items-center gap-1.5 font-bold text-navy hover:underline"
              >
                {order.number}
                <LinkPendingIndicator />
              </Link>
            ),
        },
        { key: "type", header: "Type", render: (order) => <TypeBadge type={order.type} /> },
        {
          key: "status",
          header: "Status",
          render: (order) => (
            <span className="flex flex-wrap items-center gap-1">
              <StatusBadge status={order.status} type={order.type} hasAlert={order.hasAlert} />
              {order.awaitingClientAction && <AwaitingActionBadge />}
            </span>
          ),
        },
        { key: "hub", header: "Hub", render: (order) => order.hub.name },
        { key: "scheduled", header: "Scheduled", render: (order) => formatDate(new Date(order.scheduledAt)) },
        { key: "destination", header: "Destination", render: (order) => order.destination ?? "—" },
        {
          key: "qty",
          header: "Qty",
          render: (order) => (order.declaredQty > 0 ? order.quantityLabel : "—"),
        },
        { key: "carrier", header: "Carrier", render: (order) => order.carrierName ?? order.driverName ?? "—" },
        {
          key: "amount",
          header: "Amount",
          className: "text-right",
          render: (order) => formatMoney(order.amount),
        },
        { key: "next", header: "Next Action", render: (order) => order.nextActionLabel ?? "—" },
      ]}
    />
  );
}
