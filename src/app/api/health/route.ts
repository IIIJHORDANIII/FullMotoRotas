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

  // Verificar conexão com o banco de dados (Postgres)
  try {
    // Para Postgres, tentamos uma operação simples como contar registros
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
    dataProxy: process.env.DATABASE_URL?.startsWith("prisma") ? "enabled" : "disabled",
    generateDataproxy: process.env.PRISMA_GENERATE_DATAPROXY ?? "true",
  };

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
