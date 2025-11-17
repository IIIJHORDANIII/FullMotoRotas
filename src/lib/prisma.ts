import { PrismaClient } from "@/generated/prisma/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não está definida. Configure a string do Prisma Data Proxy (prisma+postgres://...) nas variáveis de ambiente."
    );
  }

  if (!databaseUrl.startsWith("prisma")) {
    console.warn(
      "⚠️ DATABASE_URL não parece ser uma URL do Prisma Data Proxy. Certifique-se de usar uma conexão prisma:// ou prisma+postgres://."
    );
  }

  process.env.PRISMA_GENERATE_DATAPROXY = "true";
  process.env.PRISMA_CLIENT_USE_DATAPROXY = "true";
  process.env.PRISMA_CLIENT_DATAPROXY = "true";

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
