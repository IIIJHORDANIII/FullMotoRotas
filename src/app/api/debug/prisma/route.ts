import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const debug: {
    timestamp: string;
    environment: {
      DATABASE_URL?: string;
      PRISMA_GENERATE_DATAPROXY?: string;
      PRISMA_CLIENT_ENGINE_TYPE?: string;
      PRISMA_CLI_QUERY_ENGINE_TYPE?: string;
      NODE_ENV?: string;
    };
    prismaClient: {
      created: boolean;
      error?: string;
    };
    database: {
      connected: boolean;
      error?: string;
      testQuery?: any;
    };
  } = {
    timestamp: new Date().toISOString(),
    environment: {
      DATABASE_URL: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.substring(0, 30)}...`
        : undefined,
      PRISMA_GENERATE_DATAPROXY: process.env.PRISMA_GENERATE_DATAPROXY,
      PRISMA_CLIENT_ENGINE_TYPE: process.env.PRISMA_CLIENT_ENGINE_TYPE,
      PRISMA_CLI_QUERY_ENGINE_TYPE: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE,
      NODE_ENV: process.env.NODE_ENV,
    },
    prismaClient: {
      created: !!prisma,
    },
    database: {
      connected: false,
    },
  };

  // Verificar se o Prisma Client foi criado corretamente
  if (!prisma) {
    debug.prismaClient.error = "Prisma Client não foi criado";
    return NextResponse.json(debug, { status: 500 });
  }

  // Tentar conectar ao banco de dados (MongoDB)
  try {
    // Para MongoDB, tentamos uma operação simples como contar documentos
    const userCount = await prisma.user.count();
    debug.database.connected = true;
    debug.database.testQuery = { userCount };
  } catch (error) {
    debug.database.connected = false;
    debug.database.error = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof Error) {
      debug.database.error += ` | Stack: ${error.stack?.substring(0, 500)}`;
    }
  }

  return NextResponse.json(debug, { status: 200 });
}

