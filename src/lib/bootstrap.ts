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
    try {
      await prisma.$connect();
      console.log("[Bootstrap] ✓ Conectado ao banco de dados");
    } catch (connectError) {
      console.error("[Bootstrap] ❌ Erro ao conectar ao banco:", connectError);
      if (connectError instanceof Error) {
        console.error("[Bootstrap] Mensagem:", connectError.message);
        // Verificar se é erro de Data Proxy
        if (connectError.message.includes("prisma://") || connectError.message.includes("prisma+")) {
          throw new Error(
            "Prisma Client está tentando usar Data Proxy. " +
            "Verifique se o Prisma Client foi gerado corretamente sem Data Proxy."
          );
        }
      }
      throw connectError;
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
