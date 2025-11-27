import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-context";
import { errorResponse, jsonResponse } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { getPagarmeClient } from "@/lib/pagarme";
import { Role } from "@/generated/prisma/enums";

/**
 * GET /api/plans/[planId]
 * Busca um plano específico do Pagar.me
 * Apenas ADMIN pode buscar planos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await requireAuth(request, [Role.ADMIN]);

    const { planId } = await params;
    const client = getPagarmeClient();
    const plan = await client.getPlan(planId);

    return jsonResponse({ plan }, 200);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new AppError(String(error))
    );
  }
}

