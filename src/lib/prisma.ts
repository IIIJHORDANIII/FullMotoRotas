import { PrismaClient } from "@/generated/prisma/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_DATABASE_URL;
  
  // Verificar se DATABASE_URL é uma URL do Prisma Data Proxy
  // Se for, o Prisma Client provavelmente foi gerado com --data-proxy
  const isDataProxyUrl = databaseUrl && (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+"));
  
  let finalUrl: string;
  let useDirectConnection = false;
  
  if (isDataProxyUrl) {
    // DATABASE_URL é do Prisma Data Proxy - SEMPRE usar, mesmo em desenvolvimento
    // O Prisma Client gerado com --data-proxy não aceita URLs diretas do PostgreSQL
    finalUrl = databaseUrl;
    console.log("[Prisma] ✓ Usando Prisma Data Proxy (DATABASE_URL)");
  } else if (directUrl && process.env.NODE_ENV !== "production") {
    // Em desenvolvimento, se não for Data Proxy, pode usar conexão direta
    finalUrl = directUrl;
    useDirectConnection = true;
    console.log("[Prisma] ✓ Usando conexão direta (desenvolvimento)");
  } else {
    // Usar DATABASE_URL como padrão
    finalUrl = databaseUrl || "";
  }

  if (!finalUrl) {
    const error = new Error(
      useDirectConnection
        ? "DIRECT_DATABASE_URL não está definida. Configure a string de conexão direta do banco de dados."
        : "DATABASE_URL não está definida. Configure a string do Prisma Data Proxy (prisma+postgres://...) nas variáveis de ambiente."
    );
    console.error("[Prisma] ❌", error.message);
    throw error;
  }

  // Verificar formato da URL
  const isPrismaProxy = finalUrl.startsWith("prisma://") || finalUrl.startsWith("prisma+");
  
  if (useDirectConnection) {
    // Não configurar variáveis de Data Proxy para conexão direta
    delete process.env.PRISMA_GENERATE_DATAPROXY;
    delete process.env.PRISMA_CLIENT_USE_DATAPROXY;
    delete process.env.PRISMA_CLIENT_DATAPROXY;
  } else if (isPrismaProxy) {
    // Configurar variáveis de ambiente para Data Proxy
    process.env.PRISMA_GENERATE_DATAPROXY = "true";
    process.env.PRISMA_CLIENT_USE_DATAPROXY = "true";
    process.env.PRISMA_CLIENT_DATAPROXY = "true";
  } else if (!isDataProxyUrl && !useDirectConnection) {
    // Se não for Data Proxy e não for conexão direta, avisar
    console.warn(
      "[Prisma] ⚠️ DATABASE_URL não parece ser uma URL do Prisma Data Proxy."
    );
    console.warn(
      "[Prisma] Se o Prisma Client foi gerado com --data-proxy, use prisma:// ou prisma+postgres://"
    );
  }

  try {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: finalUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    console.log("[Prisma] ✓ PrismaClient criado com sucesso");
    console.log("[Prisma] Runtime:", useDirectConnection ? "Direct Connection" : (process.env.PRISMA_CLIENT_USE_DATAPROXY === "true" ? "Data Proxy" : "Standard"));
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
