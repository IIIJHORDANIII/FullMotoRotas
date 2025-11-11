import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-context";
import { jsonResponse, errorResponse } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    return jsonResponse({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao obter usuário", 500));
  }
}
