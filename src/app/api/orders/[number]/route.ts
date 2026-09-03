import { NextResponse } from "next/server";
import { getOrderByNumber } from "@/server/services/orders.service";
import { apiError } from "@/server/http/api-error";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;

  try {
    const order = await getOrderByNumber(number);
    if (!order) {
      return apiError("NOT_FOUND", `No order with number "${number}"`);
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("[GET /api/orders/[number]] failed", { number, error });
    return apiError("INTERNAL_ERROR", "Failed to load order");
  }
}
