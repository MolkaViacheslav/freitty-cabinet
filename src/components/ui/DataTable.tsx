export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
};

/** Mirrors docs/mockup.html's .opt table: dark header, zebra-striped rows. Purely presentational —
 * empty state is the caller's job (render EmptyState instead of DataTable when rows.length === 0). */
export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-sidebar text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left text-[11px] font-bold tracking-wide uppercase ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className={i % 2 === 1 ? "bg-[#FAFAFB]" : undefined}>
              {columns.map((col) => (
                <td key={col.key} className={`border-b border-border px-3 py-2.5 ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
