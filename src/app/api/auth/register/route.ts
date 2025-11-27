import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBootstrap } from "@/lib/bootstrap";
import { hashPassword, signJwt } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/http";
import { AppError, conflict } from "@/lib/errors";
import { registerSchema } from "@/validation/auth";
import { establishmentSchema } from "@/validation/establishment";
import { motoboySchema } from "@/validation/motoboy";
import { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    await ensureBootstrap();

    const json = await request.json();
    const { email, password, role, profile } = registerSchema.parse(json);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw conflict("Email já cadastrado", "EMAIL_IN_USE");
    }

    const passwordHash = await hashPassword(password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role,
          isActive: true, // Garantir que está ativo
        },
      });

      if (role === Role.ESTABLISHMENT) {
        const establishmentData = establishmentSchema.parse(profile);
        await tx.establishmentProfile.create({
          data: {
            ...establishmentData,
            userId: user.id,
          },
        });
      }

      if (role === Role.MOTOBOY) {
        const motoboyData = motoboySchema.parse(profile);
        await tx.motoboyProfile.create({
          data: {
            ...motoboyData,
            userId: user.id,
            isAvailable: motoboyData.isAvailable ?? false,
            workSchedule: motoboyData.workSchedule ?? Prisma.JsonNull,
          },
        });
      }

      return user;
    });

    const token = signJwt({ sub: created.id, email: created.email, role: created.role });

    return jsonResponse({
      id: created.id,
      email: created.email,
      role: created.role,
      token,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error(error);
    return errorResponse(new AppError("Falha ao criar usuário", 500));
  }
}
