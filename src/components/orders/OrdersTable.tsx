import Link from "next/link";
import type { OrderListItemDTO } from "@/server/dto/orders.dto";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { formatDate, formatMoney } from "@/lib/format";

type OrdersTableProps = {
  orders: OrderListItemDTO[];
};

/**
 * The Table view. Same `orders` array the Cards view gets — one query, one service call, two
 * presentations; the switch is purely about layout, never about fetching different data.
 *
 * Columns mirror the CSV export (api-contract.md) so what you see is what you download.
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
                className="font-bold text-navy hover:underline"
              >
                {order.number}
              </Link>
            ),
        },
        { key: "type", header: "Type", render: (order) => <TypeBadge type={order.type} /> },
        {
          key: "status",
          header: "Status",
          render: (order) => <StatusBadge status={order.status} type={order.type} hasAlert={order.hasAlert} />,
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
