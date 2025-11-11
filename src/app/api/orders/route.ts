import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { deliveryOrderSchema } from "@/validation/order";
import { Role, DeliveryStatus } from "@/generated/prisma/enums";
import crypto from "crypto";

function generateDeliveryCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function resolveEstablishmentId(userId: string) {
  const establishment = await prisma.establishmentProfile.findUnique({ where: { userId } });
  if (!establishment) {
    throw notFound("Perfil de estabelecimento não encontrado");
  }
  return establishment.id;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);

    let where: Parameters<typeof prisma.deliveryOrder.findMany>[0]["where"] = {};

    if (user.role === Role.ESTABLISHMENT) {
      where = { establishment: { userId: user.id } };
    }

    if (user.role === Role.MOTOBOY) {
      where = {
        assignments: {
          some: {
            motoboy: { userId: user.id },
          },
        },
      };
    }

    const orders = await prisma.deliveryOrder.findMany({
      where,
      include: {
        establishment: {
          select: { name: true, id: true },
        },
        assignments: {
          include: {
            motoboy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(orders);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao listar pedidos", 500));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const body = await request.json();
    const parsed = deliveryOrderSchema.parse(body);

    let establishmentId = parsed.establishmentId;

    if (user.role === Role.ESTABLISHMENT) {
      establishmentId = await resolveEstablishmentId(user.id);
    }

    if (!establishmentId) {
      throw forbidden("Estabelecimento é obrigatório");
    }

    const order = await prisma.deliveryOrder.create({
      data: {
        ...parsed,
        establishmentId,
        deliveryCode: generateDeliveryCode(),
      },
    });

    await prisma.deliveryEvent.create({
      data: {
        orderId: order.id,
        status: DeliveryStatus.PENDING,
        message: "Pedido criado",
      },
    });

    return jsonResponse(order, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao criar pedido", 500));
  }
}
