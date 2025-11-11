import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { establishmentSchema } from "@/validation/establishment";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/auth";

async function buildEstablishmentMetrics(establishmentId: string) {
  const [statusCounts, reviews] = await Promise.all([
    prisma.deliveryOrder.groupBy({
      by: ["status"],
      where: { establishmentId },
      _count: { _all: true },
    }),
    prisma.review.aggregate({
      where: { order: { establishmentId } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const counts = statusCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    totals: counts,
    averageRating: reviews._avg.rating ?? null,
    ratingCount: reviews._count.rating,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const establishments = await prisma.establishmentProfile.findMany({
      where: user.role === Role.ADMIN ? {} : { userId: user.id },
      include: {
        user: { select: { email: true, isActive: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withMetrics = await Promise.all(
      establishments.map(async (establishment) => ({
        ...establishment,
        metrics: await buildEstablishmentMetrics(establishment.id),
      })),
    );

    return jsonResponse(withMetrics);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao listar estabelecimentos", 500));
  }
}

const createEstablishmentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  profile: establishmentSchema,
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, Role.ADMIN);

    if (user.role !== Role.ADMIN) {
      throw forbidden("Somente administradores podem criar estabelecimentos");
    }

    const body = await request.json();
    const { email, password, profile } = createEstablishmentSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email já utilizado", 409, "EMAIL_IN_USE");
    }

    const passwordHash = await hashPassword(password);

    const created = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.ESTABLISHMENT,
        },
      });

      const createdProfile = await tx.establishmentProfile.create({
        data: {
          ...profile,
          userId: createdUser.id,
        },
      });

      return { createdUser, createdProfile };
    });

    return jsonResponse({
      user: {
        id: created.createdUser.id,
        email: created.createdUser.email,
      },
      profile: created.createdProfile,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao criar estabelecimento", 500));
  }
}
