import { NextRequest } from "next/server";
import { ordersExportQuerySchema, type OrderListItemDTO } from "@/server/dto/orders.dto";
import { getAllOrdersForExport } from "@/server/services/orders.service";
import { formatDate } from "@/lib/format";
import { getOrderTypeLabel } from "@/lib/status";
import { apiError } from "@/server/http/api-error";
import { parseSearchParams } from "@/lib/query";

export const dynamic = "force-dynamic";

const CSV_COLUMNS = [
  "Number",
  "Type",
  "Status",
  "Hub",
  "Scheduled",
  "Destination",
  "Declared Qty",
  "Actual Qty",
  "Carrier",
  "Amount",
  "Next Action",
] as const;

function csvCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function toCsvRow(item: OrderListItemDTO): string {
  return [
    item.number,
    getOrderTypeLabel(item.type),
    item.statusLabel,
    item.hub.name,
    formatDate(new Date(item.scheduledAt)),
    item.destination,
    item.declaredQty,
    item.actualQty,
    item.carrierName,
    item.amount === null ? null : item.amount.toFixed(2),
    item.nextActionLabel,
  ]
    .map(csvCell)
    .join(",");
}

export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(ordersExportQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "query";
    return apiError("VALIDATION_ERROR", `Invalid query parameter: ${field}`);
  }

  try {
    const items = await getAllOrdersForExport(parsed.data);
    const csv = [CSV_COLUMNS.join(","), ...items.map(toCsvRow)].join("\r\n");
    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return apiError("INTERNAL_ERROR", "Failed to export orders");
  }
}
