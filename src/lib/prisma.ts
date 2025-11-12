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
// IMPORTANTE: Forçar uso de library engine explicitamente
let prismaInstance: PrismaClient;

try {
  // Configuração explícita para garantir que não use Data Proxy
  const prismaConfig: any = {
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  };
  
  // Forçar engineType library se disponível na configuração
  // Isso garante que mesmo se o Prisma Client foi gerado incorretamente, forçamos o uso da biblioteca
  if (typeof (PrismaClient as any).prototype !== 'undefined') {
    // Tentar definir engineType diretamente se possível
    try {
      // @ts-ignore - propriedade interna do Prisma
      prismaConfig.__internal = {
        engineType: 'library',
      };
    } catch (e) {
      // Ignorar se não for possível
    }
  }
  
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);
  
  // Verificar se o Prisma Client foi criado corretamente
  if (!prismaInstance) {
    throw new Error("Falha ao criar instância do Prisma Client");
  }
  
  // Tentar conectar para verificar se há erro de Data Proxy
  // Isso vai falhar imediatamente se o Prisma Client foi gerado com Data Proxy
  prismaInstance.$connect().catch((connectError: any) => {
    const errorMessage = connectError?.message || String(connectError);
    
    // Verificar se é erro de Data Proxy
    if (errorMessage.includes("prisma://") || 
        errorMessage.includes("prisma+") || 
        errorMessage.includes("must start with the protocol")) {
      console.error("\n❌ ERRO CRÍTICO: Prisma Client foi gerado com Data Proxy habilitado!");
      console.error("Mensagem de erro:", errorMessage);
      console.error("\nSoluções:");
      console.error("1. Verifique se o script force-prisma-generate.js foi executado durante o build");
      console.error("2. Verifique se o schema.prisma tem 'engineType = \"library\"' configurado");
      console.error("3. Verifique se as variáveis de ambiente PRISMA_* estão configuradas corretamente");
      console.error("4. Execute 'npm run postinstall' localmente para regenerar o Prisma Client");
      
      throw new Error(
        "Prisma Client foi gerado com Data Proxy habilitado. " +
        "Verifique os logs de build e execute 'npm run postinstall' para regenerar."
      );
    }
    
    // Se não for erro de Data Proxy, apenas logar e continuar
    console.warn("⚠ Aviso ao conectar (não crítico):", errorMessage);
  });
  
} catch (error) {
  console.error("❌ Erro ao criar Prisma Client:", error);
  if (error instanceof Error) {
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    
    // Verificar se é erro de Data Proxy
    if (error.message.includes("prisma://") || 
        error.message.includes("prisma+") || 
        error.message.includes("must start with the protocol")) {
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
