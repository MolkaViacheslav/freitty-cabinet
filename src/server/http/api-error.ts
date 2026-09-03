import { NextResponse } from "next/server";

export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

export function apiError(code: ApiErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}
