import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { Role } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, Role.ADMIN);

    const [usersCount, motoboyCount, establishmentsCount, ordersByStatus, reviews] = await Promise.all([
      prisma.user.count(),
      prisma.motoboyProfile.count(),
      prisma.establishmentProfile.count(),
      prisma.deliveryOrder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const orderSummary = ordersByStatus.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    return jsonResponse({
      totals: {
        users: usersCount,
        motoboys: motoboyCount,
        establishments: establishmentsCount,
      },
      orders: orderSummary,
      ratings: {
        average: reviews._avg.rating ?? null,
        count: reviews._count.rating,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao gerar relatório", 500));
  }
}
