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
// Usar lazy initialization para evitar erros durante a importação do módulo
let prismaInstance: PrismaClient | null = null;
let prismaError: Error | null = null;

function getPrismaClient(): PrismaClient {
  // Se já temos uma instância, retornar
  if (prismaInstance) {
    return prismaInstance;
  }

  // Se já tentamos criar e deu erro, lançar o erro
  if (prismaError) {
    throw prismaError;
  }

  // Se já existe no global, usar
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }

  // Tentar criar nova instância
  try {
    console.log("🔧 Criando Prisma Client (lazy initialization)...");
    
    // Configuração explícita para garantir que não use Data Proxy
    const prismaConfig: {
      log?: ("error" | "warn")[];
    } = {
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    };
    
    console.log(`   Config: ${JSON.stringify(prismaConfig)}`);
    
    // Criar Prisma Client sem passar datasources explicitamente
    // O Prisma Client vai usar a DATABASE_URL da variável de ambiente automaticamente
    prismaInstance = new PrismaClient(prismaConfig);
    
    // Verificar se o Prisma Client foi criado corretamente
    if (!prismaInstance) {
      throw new Error("Falha ao criar instância do Prisma Client");
    }
    
    console.log("✓ Prisma Client criado com sucesso");
    
    // Armazenar no global para reutilização
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaInstance;
    }
    
    return prismaInstance;
  } catch (error) {
    prismaError = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Erro ao criar Prisma Client:", prismaError);
    
    if (prismaError instanceof Error) {
      console.error("Mensagem:", prismaError.message);
      console.error("Stack:", prismaError.stack);
      
      // Verificar se é erro de Data Proxy
      if (prismaError.message.includes("prisma://") || 
          prismaError.message.includes("prisma+") || 
          prismaError.message.includes("must start with the protocol") ||
          prismaError.message.includes("Error validating datasource")) {
        console.error("\n⚠️ PROBLEMA DETECTADO: Prisma está tentando usar Data Proxy!");
        console.error("Mensagem de erro completa:", prismaError.message);
        console.error("\nVariáveis de ambiente atuais:");
        console.error(`   DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
        console.error(`   PRISMA_GENERATE_DATAPROXY: ${process.env.PRISMA_GENERATE_DATAPROXY}`);
        console.error(`   PRISMA_CLIENT_ENGINE_TYPE: ${process.env.PRISMA_CLIENT_ENGINE_TYPE}`);
        console.error(`   PRISMA_CLI_QUERY_ENGINE_TYPE: ${process.env.PRISMA_CLI_QUERY_ENGINE_TYPE}`);
      }
    }
    
    throw prismaError;
  }
}

// Criar wrapper que inicializa o client apenas quando necessário
function createPrismaWrapper(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }
  
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }
  
  return getPrismaClient();
}

// Exportar wrapper que cria o client quando necessário
// Isso evita erros durante a importação do módulo
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = createPrismaWrapper();
    const value = client[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// Nota: Não inicializar o Prisma Client durante a importação do módulo
// Ele será criado quando necessário (lazy initialization)
// Isso evita erros durante o build e permite melhor tratamento de erros em runtime
