import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";

type Supply = OrderDetailDTO["supplies"][number];

const CATEGORY_STYLES: Record<string, string> = {
  Securement: "bg-[#DBEAFE] text-[#1E40AF]",
  "Edge protect": "bg-[#FEF3C7] text-[#92400E]",
  Wrap: "bg-[#DCFCE7] text-[#166534]",
  Labeling: "bg-[#EDE9FE] text-[#5B21B6]",
};

const columns: DataTableColumn<Supply>[] = [
  { key: "sku", header: "SKU", render: (s) => s.sku },
  {
    key: "category",
    header: "Category",
    render: (s) => (
      <span
        className={`inline-block rounded-full px-2 py-[3px] text-[10px] font-bold ${CATEGORY_STYLES[s.category] ?? "bg-[#F3F4F6] text-[#374151]"}`}
      >
        {s.category}
      </span>
    ),
  },
  { key: "qty", header: "Q-ty", className: "text-right", render: (s) => <span className="font-semibold">{s.qty}</span> },
  { key: "unitPrice", header: "Unit $", className: "text-right", render: (s) => formatMoney(s.unitPrice) },
  {
    key: "lineTotal",
    header: "Line total",
    className: "text-right",
    render: (s) => <span className="font-semibold text-ink">{formatMoney(s.lineTotal)}</span>,
  },
];

/**
 * `supplies` and `suppliesSubtotal` both come from getOrderByNumber() as-is — `lineTotal` and
 * the subtotal are computed once in the DTO mapper (DECISIONS.md B9), never recomputed here.
 */
export function SuppliesTable({ supplies, subtotal }: { supplies: OrderDetailDTO["supplies"]; subtotal: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">Supplies</h2>
        <button
          type="button"
          disabled
          title="Out of scope"
          className="cursor-not-allowed rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold text-muted"
        >
          + Supply
        </button>
      </div>
      {supplies.length === 0 ? (
        <EmptyState title="No supplies logged" />
      ) : (
        <DataTable
          columns={columns}
          rows={supplies}
          rowKey={(s) => s.id}
          footer={
            <tr className="border-t border-border bg-page">
              <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-semibold text-muted">
                Supply subtotal
              </td>
              <td className="px-3 py-2.5 text-right text-xs font-bold text-ink">{formatMoney(subtotal)}</td>
            </tr>
          }
        />
      )}
    </div>
  );
}
