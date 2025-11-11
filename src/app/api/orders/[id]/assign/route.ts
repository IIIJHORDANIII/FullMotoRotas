import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { assignmentSchema } from "@/validation/order";
import { AssignmentStatus, DeliveryStatus, Role } from "@/generated/prisma/enums";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";

async function ensureOrder(id: string) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order) {
    throw notFound("Pedido não encontrado");
  }
  return order;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);
    const order = await ensureOrder(id);

    if (user.role === Role.ESTABLISHMENT) {
      const establishment = await prisma.establishmentProfile.findUnique({ where: { userId: user.id } });
      if (!establishment || establishment.id !== order.establishmentId) {
        throw forbidden("Você não pode atribuir motoboys a este pedido");
      }
    }

    const body = await request.json();
    const { motoboyId } = assignmentSchema.parse(body);

    const motoboy = await prisma.motoboyProfile.findUnique({ where: { id: motoboyId } });
    if (!motoboy) {
      throw notFound("Motoboy não encontrado");
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryAssignment.create({
        data: {
          orderId: order.id,
          motoboyId,
        },
      });

      await tx.deliveryOrder.update({
        where: { id: order.id },
        data: { status: DeliveryStatus.ASSIGNED },
      });

      await tx.deliveryEvent.create({
        data: {
          orderId: order.id,
          status: DeliveryStatus.ASSIGNED,
          message: `Pedido atribuído ao motoboy ${motoboy.fullName}`,
        },
      });

      return created;
    });

    return jsonResponse(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atribuir motoboy", 500));
  }
}

const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus),
  rejectionReason: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, Role.MOTOBOY);

    const body = await request.json();
    const data = updateAssignmentSchema.parse(body);

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        orderId: id,
        motoboy: { userId: user.id },
      },
    });

    if (!assignment) {
      throw notFound("Atribuição não encontrada para este motoboy");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: data.status,
          rejectionReason: data.rejectionReason,
          acceptedAt: data.status === AssignmentStatus.ACCEPTED ? new Date() : assignment.acceptedAt,
          completedAt: data.status === AssignmentStatus.COMPLETED ? new Date() : assignment.completedAt,
        },
      });

      if (data.status === AssignmentStatus.COMPLETED) {
        await tx.deliveryOrder.update({
          where: { id },
          data: { status: DeliveryStatus.DELIVERED, completedAt: new Date() },
        });
        await tx.deliveryEvent.create({
          data: {
            orderId: id,
            status: DeliveryStatus.DELIVERED,
            message: "Pedido marcado como entregue pelo motoboy",
          },
        });
      }

      if (data.status === AssignmentStatus.REJECTED) {
        await tx.deliveryEvent.create({
          data: {
            orderId: id,
            status: DeliveryStatus.ASSIGNED,
            message: "Motoboy rejeitou a entrega",
            metadata: data.rejectionReason 
              ? ({ rejectionReason: data.rejectionReason } as Prisma.InputJsonValue)
              : undefined,
          },
        });
      }

      return result;
    });

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atualizar atribuição", 500));
  }
}
