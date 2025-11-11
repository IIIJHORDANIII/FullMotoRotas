import { NextResponse } from "next/server";
import type { AppError } from "@/lib/errors";

export function jsonResponse<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function errorResponse(error: Error | AppError) {
  const status = (error as AppError).status ?? 500;
  const code = (error as AppError).code ?? "INTERNAL_ERROR";
  const message = error.message ?? "Erro interno do servidor";

  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}
