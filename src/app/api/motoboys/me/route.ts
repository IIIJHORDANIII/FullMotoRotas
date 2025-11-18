import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, notFound } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { Role } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.MOTOBOY]);

    const motoboy = await prisma.motoboyProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { email: true, isActive: true } },
      },
    });

    if (!motoboy) {
      throw notFound("Perfil de motoboy não encontrado");
    }

    return jsonResponse(motoboy);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao obter perfil do motoboy", 500));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth(request, [Role.MOTOBOY]);

    const motoboy = await prisma.motoboyProfile.findUnique({
      where: { userId: user.id },
    });

    if (!motoboy) {
      throw notFound("Perfil de motoboy não encontrado");
    }

    const body = await request.json();
    const { currentLat, currentLng, isAvailable } = body;

    const updateData: {
      currentLat?: number;
      currentLng?: number;
      isAvailable?: boolean;
    } = {};

    if (currentLat !== undefined) updateData.currentLat = currentLat;
    if (currentLng !== undefined) updateData.currentLng = currentLng;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const updated = await prisma.motoboyProfile.update({
      where: { id: motoboy.id },
      data: updateData,
    });

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atualizar localização", 500));
  }
}

