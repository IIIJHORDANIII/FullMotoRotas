import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, forbidden } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { motoboySchema } from "@/validation/motoboy";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/auth";
import { Prisma } from "@/generated/prisma";

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

    // Verificar se precisa calcular métricas (query param ?metrics=true)
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") === "true";

    const motoboys = await prisma.motoboyProfile.findMany({
      select: {
        id: true,
        fullName: true,
        cpf: true,
        cnhNumber: true,
        cnhCategory: true,
        vehicleType: true,
        phone: true,
        isAvailable: true,
        currentLat: true,
        currentLng: true,
        workSchedule: true,
        verifiedAt: true,
        hiredAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true, isActive: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Só calcular métricas se solicitado explicitamente
    // Isso melhora drasticamente a performance para o mapa que só precisa das localizações
    if (includeMetrics) {
      const withMetrics = await Promise.all(
        motoboys.map(async (motoboy) => ({
          ...motoboy,
          metrics: await buildMotoboyMetrics(motoboy.id),
        })),
      );
      return jsonResponse(withMetrics);
    }

    // Retornar sem métricas para melhor performance
    return jsonResponse(motoboys);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    
    // Log detalhado do erro
    console.error("[API Motoboys] ❌ Erro ao listar motoboys:", error);
    if (error instanceof Error) {
      console.error("[API Motoboys] Mensagem:", error.message);
      console.error("[API Motoboys] Stack:", error.stack);
      
      // Verificar se é erro de conexão com banco de dados
      const errorMsg = error.message.toLowerCase();
      if (
        errorMsg.includes("connect") ||
        errorMsg.includes("econnrefused") ||
        errorMsg.includes("enotfound") ||
        errorMsg.includes("timeout") ||
        errorMsg.includes("authentication failed") ||
        errorMsg.includes("postgres") ||
        errorMsg.includes("prisma") ||
        errorMsg.includes("database")
      ) {
        return errorResponse(
          new AppError(
            "Erro ao conectar com o banco de dados. Verifique a configuração da DATABASE_URL.",
            500,
            "DATABASE_CONNECTION_ERROR"
          )
        );
      }
    }
    
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
          workSchedule:
            profile.workSchedule !== undefined
              ? (profile.workSchedule ?? Prisma.JsonNull)
              : undefined,
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
