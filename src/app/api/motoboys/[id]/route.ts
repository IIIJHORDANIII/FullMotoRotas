import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, notFound, forbidden } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { motoboyUpdateSchema } from "@/validation/motoboy";
import { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma";

async function getMotoboyOrFail(id: string) {
  const motoboy = await prisma.motoboyProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, isActive: true } },
      assignments: {
        take: 10,
        orderBy: { assignedAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              deliveryAddress: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!motoboy) {
    throw notFound("Motoboy não encontrado");
  }

  return motoboy;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT, Role.MOTOBOY]);
    const motoboy = await getMotoboyOrFail(id);

    if (user.role === Role.MOTOBOY && motoboy.userId !== user.id) {
      throw forbidden("Você não pode acessar outro motoboy");
    }

    return jsonResponse(motoboy);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao obter motoboy", 500));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.MOTOBOY]);
    const motoboy = await getMotoboyOrFail(id);

    if (user.role === Role.MOTOBOY && motoboy.userId !== user.id) {
      throw forbidden("Você não pode atualizar outro motoboy");
    }

    const body = await request.json();
    const data = motoboyUpdateSchema.parse(body);

    const updated = await prisma.motoboyProfile.update({
      where: { id },
      data: {
        ...data,
        workSchedule:
          data.workSchedule !== undefined
            ? (data.workSchedule ?? Prisma.JsonNull)
            : undefined,
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atualizar motoboy", 500));
  }
}
