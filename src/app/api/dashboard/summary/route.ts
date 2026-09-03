import { NextRequest, NextResponse } from "next/server";
import { dashboardQuerySchema } from "@/server/dto/orders.dto";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { apiError } from "@/server/http/api-error";
import { parseSearchParams } from "@/lib/query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(dashboardQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "query";
    return apiError("VALIDATION_ERROR", `Invalid query parameter: ${field}`);
  }

  try {
    const summary = await getDashboardSummary(parsed.data.granularity);
    return NextResponse.json(summary);
  } catch {
    return apiError("INTERNAL_ERROR", "Failed to load dashboard summary");
  }
}
