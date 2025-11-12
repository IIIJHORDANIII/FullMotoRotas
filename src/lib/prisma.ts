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

// Verificar variáveis de ambiente que podem forçar Data Proxy
const problematicEnvVars = [
  "PRISMA_CLIENT_DATAPROXY_URL",
  "DATAPROXY_URL",
  "PRISMA_ENGINES_MIRROR",
];

problematicEnvVars.forEach((varName) => {
  if (process.env[varName]) {
    console.warn(`⚠️ Variável de ambiente ${varName} está definida: ${process.env[varName]}`);
    console.warn(`   Isso pode forçar o uso do Data Proxy. Removendo...`);
    delete process.env[varName];
  }
});

// Garantir que variáveis de ambiente não forcem o Data Proxy
// Essas variáveis devem ser definidas ANTES de importar o PrismaClient
process.env.PRISMA_GENERATE_DATAPROXY = "false";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = "library";

// Verificar se há alguma configuração que está forçando Data Proxy
console.log("🔍 Verificando configurações do Prisma:");
console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 30)}...`);
console.log(`   PRISMA_GENERATE_DATAPROXY: ${process.env.PRISMA_GENERATE_DATAPROXY}`);
console.log(`   PRISMA_CLIENT_ENGINE_TYPE: ${process.env.PRISMA_CLIENT_ENGINE_TYPE}`);
console.log(`   PRISMA_CLI_QUERY_ENGINE_TYPE: ${process.env.PRISMA_CLI_QUERY_ENGINE_TYPE}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);

// Criar Prisma Client com tratamento de erro melhorado
// IMPORTANTE: Forçar uso de library engine explicitamente
let prismaInstance: PrismaClient;

try {
  // Configuração explícita para garantir que não use Data Proxy
  // IMPORTANTE: Não passar datasources no construtor pode ajudar a evitar validação incorreta
  const prismaConfig: {
    log?: ("error" | "warn")[];
  } = {
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  };
  
  console.log("🔧 Criando Prisma Client...");
  console.log(`   Config: ${JSON.stringify(prismaConfig)}`);
  
  // Criar Prisma Client sem passar datasources explicitamente
  // O Prisma Client vai usar a DATABASE_URL da variável de ambiente automaticamente
  // Isso evita problemas de validação durante o build
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);
  
  // Verificar se o Prisma Client foi criado corretamente
  if (!prismaInstance) {
    throw new Error("Falha ao criar instância do Prisma Client");
  }
  
  console.log("✓ Prisma Client criado com sucesso");
  
  // NÃO tentar conectar durante o build - isso pode causar problemas
  // A conexão será feita quando necessário em runtime
  
} catch (error) {
  console.error("❌ Erro ao criar Prisma Client:", error);
  if (error instanceof Error) {
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    
    // Verificar se é erro de Data Proxy
    if (error.message.includes("prisma://") || 
        error.message.includes("prisma+") || 
        error.message.includes("must start with the protocol") ||
        error.message.includes("Error validating datasource")) {
      console.error("\n⚠️ PROBLEMA DETECTADO: Prisma está tentando usar Data Proxy!");
      console.error("Mensagem de erro completa:", error.message);
      console.error("\nIsso pode acontecer se:");
      console.error("1. O Prisma Client foi gerado incorretamente");
      console.error("2. Há uma configuração que força o uso do Data Proxy");
      console.error("3. O Next.js está usando uma versão cached do Prisma Client");
      console.error("4. Há uma variável de ambiente forçando Data Proxy");
      console.error("\nVariáveis de ambiente atuais:");
      console.error(`   DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
      console.error(`   PRISMA_GENERATE_DATAPROXY: ${process.env.PRISMA_GENERATE_DATAPROXY}`);
      console.error(`   PRISMA_CLIENT_ENGINE_TYPE: ${process.env.PRISMA_CLIENT_ENGINE_TYPE}`);
      console.error(`   PRISMA_CLI_QUERY_ENGINE_TYPE: ${process.env.PRISMA_CLI_QUERY_ENGINE_TYPE}`);
      console.error("\nSoluções:");
      console.error("- Verifique os logs de build para confirmar que o script foi executado");
      console.error("- Limpe o cache da Vercel e faça um redeploy");
      console.error("- Verifique se não há variáveis de ambiente forçando Data Proxy na Vercel");
      console.error("- Verifique se a DATABASE_URL está correta (deve ser mongodb+srv://...)");
      
      throw new Error(
        `Prisma Client está tentando usar Data Proxy. ` +
        `Erro: ${error.message}. ` +
        `Verifique os logs de build e limpe o cache da Vercel.`
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
