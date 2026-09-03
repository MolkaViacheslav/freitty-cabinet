import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", timestamp });
  } catch (error) {
    // This is the endpoint the keep-alive cron hits — if it starts failing, the log is the only
    // place that says whether the Supabase project is paused or the credentials are wrong.
    console.error("[GET /api/health] database check failed", error);
    return NextResponse.json({ status: "error", db: "down", timestamp }, { status: 503 });
  }
}
