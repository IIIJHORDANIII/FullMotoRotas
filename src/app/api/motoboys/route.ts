import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { motoboySchema } from "@/validation/motoboy";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

async function buildMotoboyMetrics(motoboyProfileId: string) {
  const [assignments, reviews] = await Promise.all([
    prisma.deliveryAssignment.groupBy({
      by: ["status"],
      where: { motoboyId: motoboyProfileId },
      _count: { _all: true },
    }),
    prisma.review.aggregate({
      where: { target: { motoboy: { id: motoboyProfileId } } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const counts = assignments.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    assignments: counts,
    averageRating: reviews._avg.rating ?? null,
    ratingCount: reviews._count.rating,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);

    const motoboys = await prisma.motoboyProfile.findMany({
      include: {
        user: { select: { email: true, isActive: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withMetrics = await Promise.all(
      motoboys.map(async (motoboy) => ({
        ...motoboy,
        metrics: await buildMotoboyMetrics(motoboy.id),
      })),
    );

    return jsonResponse(withMetrics);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao listar motoboys", 500));
  }
}

const createMotoboySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  profile: motoboySchema,
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, Role.ADMIN);

    if (user.role !== Role.ADMIN) {
      throw forbidden("Somente administradores podem cadastrar motoboys");
    }

    const body = await request.json();
    const { email, password, profile } = createMotoboySchema.parse(body);

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
          role: Role.MOTOBOY,
        },
      });

      const createdProfile = await tx.motoboyProfile.create({
        data: {
          ...profile,
          userId: createdUser.id,
          isAvailable: profile.isAvailable ?? false,
          workSchedule: profile.workSchedule as Prisma.InputJsonValue | null | undefined,
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
    return errorResponse(new AppError("Falha ao criar motoboy", 500));
  }
}
