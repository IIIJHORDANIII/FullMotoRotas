import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/http";
import { AppError, notFound } from "@/lib/errors";

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { deliveryCode: params.code },
      select: {
        id: true,
        status: true,
        deliveryAddress: true,
        deliveryCode: true,
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw notFound("Entrega não encontrada para este código");
    }

    return jsonResponse(order);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao consultar rastreamento", 500));
  }
}
