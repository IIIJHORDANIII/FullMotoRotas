import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { statusEventSchema } from "@/validation/order";
import { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma";

async function ensureOrderAccess(orderId: string, userId: string, role: Role) {
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: orderId },
    include: {
      establishment: { select: { userId: true } },
      assignments: {
        select: {
          motoboy: { select: { userId: true } },
        },
      },
    },
  });

  if (!order) {
    throw notFound("Pedido não encontrado");
  }

  if (role === Role.ADMIN) return order;

  if (role === Role.ESTABLISHMENT && order.establishment.userId === userId) return order;

  if (role === Role.MOTOBOY && order.assignments.some((item) => item.motoboy.userId === userId)) {
    return order;
  }

  throw forbidden("Você não possui permissão para registrar eventos neste pedido");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);

    await ensureOrderAccess(id, user.id, user.role);

    const body = await request.json();
    const data = statusEventSchema.parse(body);

    const event = await prisma.deliveryEvent.create({
      data: {
        orderId: id,
        status: data.status,
        message: data.message,
        metadata:
          data.metadata !== undefined
            ? (data.metadata ?? Prisma.JsonNull)
            : undefined,
      },
    });

    return jsonResponse(event, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao registrar evento", 500));
  }
}
