import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validar DATABASE_URL antes de criar o Prisma Client
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const errorMessage = 
    "DATABASE_URL não está definida. Configure a variável de ambiente DATABASE_URL com a string de conexão do MongoDB.\n" +
    "Na Vercel, configure esta variável em: Settings > Environment Variables";
  console.error("❌", errorMessage);
  throw new Error(errorMessage);
}

// Verificar se a URL não é do Data Proxy (deve ser uma URL MongoDB normal)
if (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+")) {
  throw new Error(
    "DATABASE_URL não deve usar o Prisma Data Proxy. Use uma string de conexão MongoDB direta (ex: mongodb+srv://...)"
  );
}

// Garantir que variáveis de ambiente não forcem o Data Proxy
// Essas variáveis devem ser definidas ANTES de importar o PrismaClient
process.env.PRISMA_GENERATE_DATAPROXY = "false";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = "library";

// Log da URL para debug (sempre logar em produção também para debug na Vercel)
console.log("✓ DATABASE_URL configurada:", databaseUrl.substring(0, 30) + "...");
console.log("✓ Prisma Engine Type:", process.env.PRISMA_CLIENT_ENGINE_TYPE || "library");
console.log("✓ PRISMA_GENERATE_DATAPROXY:", process.env.PRISMA_GENERATE_DATAPROXY || "não definido");

// Criar Prisma Client com tratamento de erro melhorado
let prismaInstance: PrismaClient;

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  
  // Verificar se o Prisma Client foi criado corretamente
  if (!prismaInstance) {
    throw new Error("Falha ao criar instância do Prisma Client");
  }
} catch (error) {
  console.error("❌ Erro ao criar Prisma Client:", error);
  if (error instanceof Error) {
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    
    // Verificar se é erro de Data Proxy
    if (error.message.includes("prisma://") || error.message.includes("prisma+")) {
      throw new Error(
        "Prisma Client foi gerado com Data Proxy habilitado. " +
        "Execute 'npm run postinstall' para regenerar o Prisma Client sem Data Proxy."
      );
    }
  }
  throw error;
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Teste de conexão ao inicializar (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  prisma.$connect().catch((error) => {
    console.error("Erro ao conectar ao banco de dados:", error);
  });
}
