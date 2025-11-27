import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-context";
import { errorResponse, jsonResponse } from "@/lib/http";
import { AppError, notFound, forbidden } from "@/lib/errors";
import { getPagarmeClient } from "@/lib/pagarme";
import { Role } from "@/generated/prisma/enums";
import { SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * GET /api/subscriptions/[subscriptionId]
 * Busca uma assinatura específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: {
        establishment: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            contactEmail: true,
            userId: true,
          },
        },
      },
    });

    if (!subscription) {
      return errorResponse(notFound("Assinatura não encontrada"));
    }

    // Verificar permissão: ADMIN pode ver todas, ESTABLISHMENT apenas a própria
    if (
      user.role === Role.ESTABLISHMENT &&
      subscription.establishment.userId !== user.id
    ) {
      return errorResponse(forbidden("Acesso negado"));
    }

    // Buscar dados atualizados do Pagar.me
    const client = getPagarmeClient();
    const pagarmeSubscription = await client.getSubscription(
      subscription.pagarmeSubscriptionId
    );

    return jsonResponse(
      {
        subscription: {
          ...subscription,
          pagarmeData: pagarmeSubscription,
        },
      },
      200
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new AppError(String(error))
    );
  }
}

/**
 * DELETE /api/subscriptions/[subscriptionId]
 * Cancela uma assinatura
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: {
        establishment: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!subscription) {
      return errorResponse(notFound("Assinatura não encontrada"));
    }

    // Verificar permissão
    if (
      user.role === Role.ESTABLISHMENT &&
      subscription.establishment.userId !== user.id
    ) {
      return errorResponse(forbidden("Acesso negado"));
    }

    // Cancelar no Pagar.me
    const client = getPagarmeClient();
    const cancelledSubscription = await client.cancelSubscription(
      subscription.pagarmeSubscriptionId
    );

    // Atualizar no banco de dados
    const updated = await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        canceledAt: new Date(),
        metadata: cancelledSubscription as unknown as Prisma.InputJsonValue,
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

    return jsonResponse({ subscription: updated }, 200);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new AppError(String(error))
    );
  }
}

