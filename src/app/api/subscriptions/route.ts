import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-context";
import { errorResponse, jsonResponse } from "@/lib/http";
import { AppError, notFound, forbidden } from "@/lib/errors";
import { getPagarmeClient } from "@/lib/pagarme";
import { Role } from "@/generated/prisma/enums";
import { SubscriptionStatus } from "@/generated/prisma/enums";

const createSubscriptionSchema = z.object({
  establishmentId: z.string().min(1, "ID do estabelecimento é obrigatório"),
  planId: z.string().min(1, "ID do plano é obrigatório"),
  payment_method: z.enum(["credit_card", "boleto"]),
  card_id: z.string().optional(),
  card_hash: z.string().optional(),
});

/**
 * GET /api/subscriptions
 * Lista todas as assinaturas
 * ADMIN: lista todas
 * ESTABLISHMENT: lista apenas a própria assinatura
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const where =
      user.role === Role.ADMIN
        ? {}
        : {
            establishment: {
              userId: user.id,
            },
          };

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        establishment: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            contactEmail: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ subscriptions }, 200);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new AppError(String(error))
    );
  }
}

/**
 * POST /api/subscriptions
 * Cria uma nova assinatura no Pagar.me
 * ADMIN e ESTABLISHMENT podem criar assinaturas
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const body = await request.json();
    const data = createSubscriptionSchema.parse(body);

    // Verificar se o estabelecimento existe
    const establishment = await prisma.establishmentProfile.findUnique({
      where: { id: data.establishmentId },
      include: { subscription: true },
    });

    // Se o usuário é ESTABLISHMENT, garantir que está criando assinatura para seu próprio estabelecimento
    if (user.role === Role.ESTABLISHMENT) {
      if (!establishment || establishment.userId !== user.id) {
        return errorResponse(forbidden("Você só pode criar assinatura para seu próprio estabelecimento"));
      }
    }

    if (!establishment) {
      return errorResponse(notFound("Estabelecimento não encontrado"));
    }

    if (establishment.subscription) {
      return errorResponse(
        new AppError("Estabelecimento já possui uma assinatura ativa", 400)
      );
    }

    // Buscar o plano no Pagar.me para validar
    const client = getPagarmeClient();
    const pagarmePlan = await client.getPlan(data.planId);

    // Criar cliente no Pagar.me se necessário (simplificado - você pode melhorar isso)
    // Por enquanto, vamos assumir que o customer_id já existe ou será criado separadamente

    // Criar assinatura no Pagar.me
    const pagarmeSubscription = await client.createSubscription({
      plan_id: data.planId,
      customer_id: data.establishmentId, // Simplificado - você pode criar um modelo Customer separado
      payment_method: data.payment_method,
      card_id: data.card_id,
      card_hash: data.card_hash,
    });

    // Salvar assinatura no banco de dados
    const subscription = await prisma.subscription.create({
      data: {
        establishmentId: data.establishmentId,
        pagarmePlanId: pagarmePlan.id,
        pagarmeSubscriptionId: pagarmeSubscription.id,
        pagarmeCustomerId: pagarmeSubscription.customer_id,
        status: mapPagarmeStatusToLocal(pagarmeSubscription.status),
        currentPeriodStart: pagarmeSubscription.current_period_start
          ? new Date(pagarmeSubscription.current_period_start)
          : null,
        currentPeriodEnd: pagarmeSubscription.current_period_end
          ? new Date(pagarmeSubscription.current_period_end)
          : null,
        metadata: pagarmeSubscription as unknown as Prisma.InputJsonValue,
      },
      include: {
        establishment: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            contactEmail: true,
          },
        },
      },
    });

    return jsonResponse({ subscription }, 201);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new AppError(String(error))
    );
  }
}

/**
 * Mapeia o status do Pagar.me para o enum local
 */
function mapPagarmeStatusToLocal(status: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    cancelled: SubscriptionStatus.CANCELLED,
    past_due: SubscriptionStatus.PAST_DUE,
    pending: SubscriptionStatus.PENDING,
    trialing: SubscriptionStatus.TRIALING,
  };

  return statusMap[status.toLowerCase()] || SubscriptionStatus.PENDING;
}

