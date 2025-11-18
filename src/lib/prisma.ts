import { PrismaClient } from "@/generated/prisma/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    const error = new Error(
      "DATABASE_URL não está definida. Configure a string do Prisma Data Proxy (prisma+postgres://...) nas variáveis de ambiente."
    );
    console.error("[Prisma] ❌", error.message);
    throw error;
  }

  // Verificar formato da URL
  const isPrismaProxy = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+");
  if (!isPrismaProxy) {
    console.warn(
      "[Prisma] ⚠️ DATABASE_URL não parece ser uma URL do Prisma Data Proxy."
    );
    console.warn(
      "[Prisma] Certifique-se de usar uma conexão prisma:// ou prisma+postgres://."
    );
    console.warn(
      "[Prisma] URL atual começa com:",
      databaseUrl.substring(0, 20) + "..."
    );
  } else {
    console.log("[Prisma] ✓ DATABASE_URL parece ser uma URL do Prisma Data Proxy");
  }

  // Configurar variáveis de ambiente para Data Proxy
  process.env.PRISMA_GENERATE_DATAPROXY = "true";
  process.env.PRISMA_CLIENT_USE_DATAPROXY = "true";
  process.env.PRISMA_CLIENT_DATAPROXY = "true";

  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    console.log("[Prisma] ✓ PrismaClient criado com sucesso");
    console.log("[Prisma] Runtime:", process.env.PRISMA_CLIENT_USE_DATAPROXY === "true" ? "Data Proxy" : "Standard");
    return client;
  } catch (error) {
    console.error("[Prisma] ❌ Erro ao criar PrismaClient:", error);
    if (error instanceof Error) {
      console.error("[Prisma] Mensagem:", error.message);
      console.error("[Prisma] Stack:", error.stack);
    }
    throw error;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Função auxiliar para testar conexão
export async function testPrismaConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Para Data Proxy, não usar $connect() explicitamente
    // A conexão será feita automaticamente na primeira query
    await prisma.$queryRaw`SELECT 1`;
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Prisma] ❌ Erro ao testar conexão:", errorMessage);
    
    if (error instanceof Error) {
      const errorMsg = errorMessage.toLowerCase();
      if (
        errorMsg.includes("connect") ||
        errorMsg.includes("econnrefused") ||
        errorMsg.includes("enotfound") ||
        errorMsg.includes("timeout") ||
        errorMsg.includes("authentication") ||
        errorMsg.includes("api key") ||
        errorMsg.includes("invalid url")
      ) {
        return {
          success: false,
          error: "Erro de conexão com o Prisma Data Proxy. Verifique se a DATABASE_URL está correta e se a API key é válida.",
        };
      }
    }
    
    return { success: false, error: errorMessage };
  }
}
