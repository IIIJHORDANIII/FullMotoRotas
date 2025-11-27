import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-context";
import { errorResponse, jsonResponse } from "@/lib/http";
import { getPagarmeClient } from "@/lib/pagarme";
import { Role } from "@/generated/prisma/enums";

const createPlanSchema = z.object({
  name: z.string().min(3, "Nome do plano deve ter pelo menos 3 caracteres"),
  amount: z.number().int().positive("Valor deve ser positivo em centavos"),
  days: z.number().int().positive("Dias deve ser um número positivo"),
  payment_methods: z.array(z.string()).optional(),
  trial_days: z.number().int().nonnegative().optional(),
  installments: z.number().int().positive().optional(),
});

/**
 * GET /api/plans
 * Lista todos os planos do Pagar.me
 * Apenas ADMIN pode listar planos
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, [Role.ADMIN]);

    const client = getPagarmeClient();
    const plans = await client.listPlans();

    return jsonResponse({ plans }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/plans
 * Cria um novo plano no Pagar.me
 * Apenas ADMIN pode criar planos
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, [Role.ADMIN]);

    const body = await request.json();
    const data = createPlanSchema.parse(body);

    const client = getPagarmeClient();
    const plan = await client.createPlan({
      name: data.name,
      amount: data.amount,
      days: data.days,
      payment_methods: data.payment_methods,
      trial_days: data.trial_days,
      installments: data.installments,
    });

    return jsonResponse({ plan }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

