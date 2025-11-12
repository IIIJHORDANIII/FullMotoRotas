import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const health: {
    status: string;
    timestamp: string;
    database?: {
      connected: boolean;
      error?: string;
    };
    prisma?: {
      engineType?: string;
      generateDataproxy?: string;
    };
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Verificar conexão com o banco de dados (MongoDB)
  try {
    // Para MongoDB, tentamos uma operação simples como contar documentos
    await prisma.user.count();
    health.database = { connected: true };
  } catch (error) {
    health.status = "degraded";
    health.database = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Adicionar informações do Prisma
  health.prisma = {
    engineType: process.env.PRISMA_CLIENT_ENGINE_TYPE || "library",
    generateDataproxy: process.env.PRISMA_GENERATE_DATAPROXY || "false",
  };

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
