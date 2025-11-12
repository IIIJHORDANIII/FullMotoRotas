import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validar DATABASE_URL antes de criar o Prisma Client
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não está definida. Configure a variável de ambiente DATABASE_URL com a string de conexão do MongoDB."
  );
}

// Verificar se a URL não é do Data Proxy (deve ser uma URL MongoDB normal)
if (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+")) {
  throw new Error(
    "DATABASE_URL não deve usar o Prisma Data Proxy. Use uma string de conexão MongoDB direta (ex: mongodb+srv://...)"
  );
}

// Garantir que variáveis de ambiente não forcem o Data Proxy
process.env.PRISMA_GENERATE_DATAPROXY = "false";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";

// Log da URL para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  console.log("DATABASE_URL configurada:", databaseUrl.substring(0, 20) + "...");
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Teste de conexão ao inicializar (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  prisma.$connect().catch((error) => {
    console.error("Erro ao conectar ao banco de dados:", error);
  });
}
