import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

type Operation = OrderDetailDTO["operations"][number];

const columns: DataTableColumn<Operation>[] = [
  {
    key: "type",
    header: "Operation",
    render: (op) => (
      <span className="font-medium text-ink">
        {op.isBillable && <span className="mr-1 font-bold text-[#059669]">$</span>}
        {op.typeLabel}
      </span>
    ),
  },
  { key: "trailer", header: "Trailer", render: (op) => op.trailerNumber ?? "—" },
  {
    key: "qty",
    header: "Q-ty",
    className: "text-right",
    render: (op) => <span className="font-semibold text-blue">{op.qty}</span>,
  },
  { key: "unit", header: "Unit", render: (op) => op.unitLabel },
  { key: "appliedAt", header: "Applied at", render: (op) => <span className="text-muted">{formatDate(new Date(op.appliedAt))}</span> },
  {
    key: "activity",
    header: "Activity",
    render: (op) => (
      <span className="text-[#9CA3AF]">
        💬 {op.commentsCount} · 📷 {op.photosCount}
      </span>
    ),
  },
];

/** `operations` come straight from getOrderByNumber() — this table computes nothing, just lays
 * out the 8 fields (type/typeLabel, trailerNumber, qty, unitLabel, appliedAt, comments/photos,
 * isBillable) that api-contract.md defines for the Operation shape. */
export function OperationsTable({ operations }: { operations: OrderDetailDTO["operations"] }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">Operations</h2>
        <button
          type="button"
          disabled
          title="Out of scope"
          className="cursor-not-allowed rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold text-muted"
        >
          + Operation
        </button>
      </div>
      {operations.length === 0 ? (
        <EmptyState title="No operations yet" />
      ) : (
        <DataTable columns={columns} rows={operations} rowKey={(op) => op.id} />
      )}
    </div>
  );
}
