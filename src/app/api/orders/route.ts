import { NextRequest, NextResponse } from "next/server";
import { ordersQuerySchema } from "@/server/dto/orders.dto";
import { getOrders } from "@/server/services/orders.service";
import { apiError } from "@/server/http/api-error";
import { parseSearchParams } from "@/lib/query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(ordersQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "query";
    return apiError("VALIDATION_ERROR", `Invalid query parameter: ${field}`);
  }

  try {
    const result = await getOrders(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    // Log before swallowing — otherwise a production 500 leaves nothing in the Vercel logs.
    console.error("[GET /api/orders] failed", { query: parsed.data, error });
    return apiError("INTERNAL_ERROR", "Failed to load orders");
  }
}
