import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type SubOrder = OrderDetailDTO["subOrders"][number];

const columns: DataTableColumn<SubOrder>[] = [
  { key: "code", header: "Sub-order", render: (so) => <span className="font-semibold text-navy">{so.code}</span> },
  { key: "refNumber", header: "Ref N", render: (so) => so.refNumber },
  {
    key: "pallets",
    header: "Pallets",
    className: "text-right",
    render: (so) => <span className="font-semibold text-blue">{so.pallets}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (so) =>
      so.hasAlert ? (
        <span className="inline-block rounded-full bg-danger-bg px-2 py-[3px] text-[10px] font-bold text-danger-ink">
          ⚠ {so.alertMessage ?? "Alert"}
        </span>
      ) : (
        <span className="text-muted">OK</span>
      ),
  },
];

/**
 * The sub-orders a consolidation is made of. Rendered only when there are any, so a Cross-Dock
 * order does not grow an empty section.
 *
 * This is the reason the detail page exists for a consolidation: `subOrders` was already in the
 * DTO and already shown as a "3 refs" chip on the list card, but the detail page — the screen you
 * reach by clicking that chip — did not show them at all. The per-sub-order alert flag is surfaced
 * here as well, since a parent order is often flagged because one of these is.
 */
export function SubOrdersTable({
  subOrders,
  totalPallets,
}: {
  subOrders: OrderDetailDTO["subOrders"];
  totalPallets: number;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">
          Sub-orders <span className="font-normal text-muted">· {subOrders.length}</span>
        </h2>
      </div>
      <DataTable
        columns={columns}
        rows={subOrders}
        rowKey={(so) => so.code}
        footer={
          <tr className="border-t border-border bg-page">
            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-semibold text-muted">
              Total pallets
            </td>
            <td className="px-3 py-2.5 text-right text-xs font-bold text-ink">{totalPallets}</td>
            <td />
          </tr>
        }
      />
    </div>
  );
}
