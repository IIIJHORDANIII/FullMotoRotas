import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";

let bootstrapPromise: Promise<void> | null = null;

async function createDefaultAdmin() {
  try {
    const { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } = env;

    console.log(`[Bootstrap] Verificando usuário admin: ${DEFAULT_ADMIN_EMAIL}`);
    
    // Verificar conexão com o banco antes de tentar criar usuário
    console.log("[Bootstrap] Prisma Client disponível:", !!prisma);
    
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error("[Bootstrap] ❌ DATABASE_URL não está configurada!");
      throw new Error("DATABASE_URL não está configurada. Configure a variável de ambiente na Vercel.");
    }
    
    // Verificar formato da URL
    const dbUrl = process.env.DATABASE_URL;
    const isPrismaProxy = dbUrl.startsWith("prisma://") || dbUrl.startsWith("prisma+");
    
    if (!isPrismaProxy) {
      console.warn("[Bootstrap] ⚠️ DATABASE_URL não parece ser uma URL do Prisma Data Proxy");
      console.warn("[Bootstrap] Formato esperado: prisma+postgres://YOUR_WORKSPACE.prisma-data.net/?api_key=YOUR_API_KEY");
      console.warn("[Bootstrap] URL atual começa com:", dbUrl.substring(0, 30) + "...");
    } else {
      console.log("[Bootstrap] ✓ DATABASE_URL parece ser uma URL do Prisma Data Proxy");
    }
    
    // Tentar uma query simples para verificar conexão
    try {
      await prisma.user.count();
      console.log("[Bootstrap] ✓ Conectado ao banco de dados");
    } catch (connectionError) {
      console.error("[Bootstrap] ❌ Erro ao conectar com o banco de dados:", connectionError);
      if (connectionError instanceof Error) {
        console.error("[Bootstrap] Mensagem:", connectionError.message);
        
        // Verificar se é erro de formato da URL
        if (connectionError.message.includes("Invalid URL") || connectionError.message.includes("Invalid connection string")) {
          throw new Error(
            "DATABASE_URL inválida. Verifique se está no formato correto: prisma+postgres://YOUR_WORKSPACE.prisma-data.net/?api_key=YOUR_API_KEY"
          );
        }
        
        // Verificar se é erro de autenticação
        if (connectionError.message.includes("authentication") || connectionError.message.includes("API key")) {
          throw new Error(
            "Erro de autenticação com o Prisma Data Proxy. Verifique se a API key está correta e se o workspace está ativo."
          );
        }
      }
      throw connectionError;
    }

    const existing = await prisma.user.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } });

    if (existing) {
      console.log(`[Bootstrap] Usuário admin já existe: ${DEFAULT_ADMIN_EMAIL}`);
      
      // Garantir que está ativo
      if (!existing.isActive) {
        await prisma.user.update({
          where: { email: DEFAULT_ADMIN_EMAIL },
          data: { isActive: true },
        });
        console.log(`[Bootstrap] Usuário admin reativado: ${DEFAULT_ADMIN_EMAIL}`);
      }
      return;
    }

    console.log(`[Bootstrap] Criando usuário admin: ${DEFAULT_ADMIN_EMAIL}`);
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    
    console.log(`[Bootstrap] ✅ Usuário admin criado com sucesso: ${DEFAULT_ADMIN_EMAIL}`);
  } catch (error) {
    console.error("[Bootstrap] ❌ Erro ao criar admin padrão:", error);
    if (error instanceof Error) {
      console.error("[Bootstrap] Mensagem:", error.message);
      console.error("[Bootstrap] Stack:", error.stack);
    }
    // Não lança erro para não bloquear o sistema se o admin já existir ou houver outro problema
    // O erro será logado mas não interromperá a execução
  }
}

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = createDefaultAdmin();
  }
  return bootstrapPromise;
}
