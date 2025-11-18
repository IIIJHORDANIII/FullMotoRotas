import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-context";
import { errorResponse, jsonResponse } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { Role } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);

    // Se for motoboy, limpar localização ao fazer logout
    if (user.role === Role.MOTOBOY) {
      try {
        const motoboyProfile = await prisma.motoboyProfile.findUnique({
          where: { userId: user.id },
        });

        if (motoboyProfile) {
          // Limpar localização e marcar como indisponível
          await prisma.motoboyProfile.update({
            where: { id: motoboyProfile.id },
            data: {
              currentLat: null,
              currentLng: null,
              isAvailable: false,
            },
          });
        }
      } catch (error) {
        // Não falhar o logout se houver erro ao limpar localização
        console.error("[Logout] Erro ao limpar localização do motoboy:", error);
      }
    }

    return jsonResponse({ message: "Logout realizado com sucesso" });
  } catch (error) {
    // Mesmo se houver erro de autenticação, retornar sucesso para não bloquear o logout
    if (error instanceof AppError && error.statusCode === 401) {
      return jsonResponse({ message: "Logout realizado com sucesso" });
    }
    
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    
    console.error("[Logout] Erro:", error);
    return jsonResponse({ message: "Logout realizado com sucesso" });
  }
}

