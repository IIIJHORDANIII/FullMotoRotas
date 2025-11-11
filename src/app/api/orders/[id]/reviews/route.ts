import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { reviewSchema } from "@/validation/order";
import { Role } from "@/generated/prisma/enums";

async function ensureOrderParticipation(orderId: string, userId: string, role: Role) {
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: orderId },
    include: {
      establishment: { select: { userId: true } },
      assignments: { select: { motoboy: { select: { userId: true } } } },
    },
  });

  if (!order) {
    throw notFound("Pedido não encontrado");
  }

  if (role === Role.ESTABLISHMENT && order.establishment.userId === userId) {
    return order;
  }

  if (role === Role.MOTOBOY && order.assignments.some((item) => item.motoboy.userId === userId)) {
    return order;
  }

  if (role === Role.ADMIN) {
    return order;
  }

  throw forbidden("Você não participou desta entrega");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);
    await ensureOrderParticipation(id, user.id, user.role);

    const reviews = await prisma.review.findMany({
      where: { orderId: id },
      include: {
        author: { select: { id: true, email: true, role: true } },
        target: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(reviews);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao listar avaliações", 500));
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ESTABLISHMENT, Role.MOTOBOY, Role.ADMIN]);
    const order = await ensureOrderParticipation(id, user.id, user.role);

    const body = await request.json();
    const data = reviewSchema.partial({ orderId: true }).parse({ ...body, orderId: id });

    if (data.targetId === user.id) {
      throw forbidden("Não é possível avaliar a si mesmo");
    }

    const target = await prisma.user.findUnique({ where: { id: data.targetId } });
    if (!target) {
      throw notFound("Usuário alvo não encontrado");
    }

    const allowedTargetIds = new Set<string>();
    allowedTargetIds.add(order.establishment.userId);
    order.assignments.forEach((assignment) => {
      allowedTargetIds.add(assignment.motoboy.userId);
    });

    if (!allowedTargetIds.has(data.targetId)) {
      throw forbidden("Usuário alvo não participa desta entrega");
    }

    const review = await prisma.review.create({
      data: {
        orderId: id,
        authorId: user.id,
        targetId: data.targetId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    // Atualizar métricas básicas
    if (target.role === Role.MOTOBOY) {
      // Nota: MotoboyProfile não possui campo 'notes', então não atualizamos
      // As métricas podem ser calculadas dinamicamente quando necessário
      const stats = await prisma.review.aggregate({
        where: { targetId: data.targetId },
        _avg: { rating: true },
      });
      // Métricas podem ser consultadas via API quando necessário
    }

    if (target.role === Role.ESTABLISHMENT) {
      const stats = await prisma.review.aggregate({
        where: { targetId: data.targetId },
        _avg: { rating: true },
      });
      await prisma.establishmentProfile.updateMany({
        where: { userId: data.targetId },
        data: { notes: `Avaliação média: ${(stats._avg.rating ?? 0).toFixed(2)}` },
      });
    }

    return jsonResponse(review, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao criar avaliação", 500));
  }
}
