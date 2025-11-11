import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { deliveryOrderUpdateSchema } from "@/validation/order";
import { DeliveryStatus, Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

async function getOrderOrFail(id: string) {
  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      establishment: { select: { id: true, name: true, userId: true } },
      assignments: {
        include: {
          motoboy: {
            select: { id: true, fullName: true, userId: true },
          },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
      reviews: true,
    },
  });

  if (!order) {
    throw notFound("Pedido não encontrado");
  }

  return order;
}

function ensureAccess(order: Awaited<ReturnType<typeof getOrderOrFail>>, userId: string, role: Role) {
  if (role === Role.ADMIN) {
    return;
  }

  if (role === Role.ESTABLISHMENT && order.establishment.userId === userId) {
    return;
  }

  if (
    role === Role.MOTOBOY &&
    order.assignments.some((assignment) => assignment.motoboy.userId === userId)
  ) {
    return;
  }

  throw forbidden("Você não tem acesso a este pedido");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);
    const order = await getOrderOrFail(id);
    ensureAccess(order, user.id, user.role);
    return jsonResponse(order);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao obter pedido", 500));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);
    const order = await getOrderOrFail(id);
    ensureAccess(order, user.id, user.role);

    const body = await request.json();
    const data = deliveryOrderUpdateSchema.parse(body);

    if (user.role === Role.MOTOBOY) {
      const allowedStatuses: DeliveryStatus[] = [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED];
      if (data.status && !allowedStatuses.includes(data.status)) {
        throw forbidden("Motoboys só podem atualizar o status para EM ROTA ou ENTREGUE");
      }
    }

    const updateData: Prisma.DeliveryOrderUpdateInput = {
      ...data,
    };

    if (data.status === DeliveryStatus.DELIVERED) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id },
      data: updateData,
    });

    if (data.status) {
      await prisma.deliveryEvent.create({
        data: {
          orderId: updated.id,
          status: data.status,
          message: `Status atualizado para ${data.status}`,
        },
      });
    }

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atualizar pedido", 500));
  }
}
