import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { AppError, notFound, forbidden } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";
import { establishmentUpdateSchema } from "@/validation/establishment";
import { Role } from "@/generated/prisma/enums";

async function getEstablishmentOrFail(id: string) {
  const establishment = await prisma.establishmentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, isActive: true } },
      _count: { select: { orders: true } },
    },
  });

  if (!establishment) {
    throw notFound("Estabelecimento não encontrado");
  }

  return establishment;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);
    const establishment = await getEstablishmentOrFail(id);

    if (user.role !== Role.ADMIN && establishment.userId !== user.id) {
      throw forbidden("Você não pode acessar este estabelecimento");
    }

    return jsonResponse(establishment);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao obter estabelecimento", 500));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await requireAuth(request, [Role.ADMIN, Role.ESTABLISHMENT]);
    const establishment = await getEstablishmentOrFail(id);

    if (user.role !== Role.ADMIN && establishment.userId !== user.id) {
      throw forbidden("Você não pode atualizar este estabelecimento");
    }

    const body = await request.json();
    const data = establishmentUpdateSchema.parse(body);

    const updated = await prisma.establishmentProfile.update({
      where: { id },
      data,
    });

    return jsonResponse(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao atualizar estabelecimento", 500));
  }
}
