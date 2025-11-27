import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth";
import { Role, EstablishmentPlan } from "@/generated/prisma/enums";

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

async function createDefaultEstablishment() {
  try {
    const DEFAULT_ESTABLISHMENT_EMAIL = process.env.DEFAULT_ESTABLISHMENT_EMAIL || "estabelecimento@motorotas.app.br";
    const DEFAULT_ESTABLISHMENT_PASSWORD = process.env.DEFAULT_ESTABLISHMENT_PASSWORD || "Estabelecimento@123";

    console.log(`[Bootstrap] Verificando usuário estabelecimento: ${DEFAULT_ESTABLISHMENT_EMAIL}`);
    
    const existing = await prisma.user.findUnique({ 
      where: { email: DEFAULT_ESTABLISHMENT_EMAIL },
      include: { establishment: true }
    });

    if (existing) {
      console.log(`[Bootstrap] Usuário estabelecimento já existe: ${DEFAULT_ESTABLISHMENT_EMAIL}`);
      
      // Garantir que está ativo
      if (!existing.isActive) {
        await prisma.user.update({
          where: { email: DEFAULT_ESTABLISHMENT_EMAIL },
          data: { isActive: true },
        });
        console.log(`[Bootstrap] Usuário estabelecimento reativado: ${DEFAULT_ESTABLISHMENT_EMAIL}`);
      }
      
      // Garantir que o perfil existe e está ativo
      if (!existing.establishment) {
        await prisma.establishmentProfile.create({
          data: {
            userId: existing.id,
            name: "Estabelecimento Motorotas",
            cnpj: "12345678000190",
            contactEmail: DEFAULT_ESTABLISHMENT_EMAIL,
            contactPhone: "(11) 98765-4321",
            addressLine1: "Rua Exemplo, 123",
            addressLine2: "Centro",
            city: "São Paulo",
            state: "SP",
            postalCode: "01234-567",
            deliveryRadiusKm: 10,
            baseDeliveryFee: 5.0,
            additionalPerKm: 1.5,
            estimatedDeliveryTimeMinutes: 30,
            plan: EstablishmentPlan.BASIC,
            isActive: true,
          },
        });
        console.log(`[Bootstrap] Perfil do estabelecimento criado`);
      } else if (!existing.establishment.isActive) {
        await prisma.establishmentProfile.update({
          where: { userId: existing.id },
          data: { isActive: true },
        });
        console.log(`[Bootstrap] Estabelecimento reativado`);
      }
      
      return;
    }

    console.log(`[Bootstrap] Criando usuário estabelecimento: ${DEFAULT_ESTABLISHMENT_EMAIL}`);
    const passwordHash = await hashPassword(DEFAULT_ESTABLISHMENT_PASSWORD);

    await prisma.user.create({
      data: {
        email: DEFAULT_ESTABLISHMENT_EMAIL,
        password: passwordHash,
        role: Role.ESTABLISHMENT,
        isActive: true,
        establishment: {
          create: {
            name: "Estabelecimento Motorotas",
            cnpj: "12345678000190",
            contactEmail: DEFAULT_ESTABLISHMENT_EMAIL,
            contactPhone: "(11) 98765-4321",
            addressLine1: "Rua Exemplo, 123",
            addressLine2: "Centro",
            city: "São Paulo",
            state: "SP",
            postalCode: "01234-567",
            deliveryRadiusKm: 10,
            baseDeliveryFee: 5.0,
            additionalPerKm: 1.5,
            estimatedDeliveryTimeMinutes: 30,
            plan: EstablishmentPlan.BASIC,
            isActive: true,
          },
        },
      },
    });
    
    console.log(`[Bootstrap] ✅ Usuário estabelecimento criado com sucesso: ${DEFAULT_ESTABLISHMENT_EMAIL}`);
  } catch (error) {
    console.error("[Bootstrap] ❌ Erro ao criar estabelecimento padrão:", error);
    if (error instanceof Error) {
      console.error("[Bootstrap] Mensagem:", error.message);
      console.error("[Bootstrap] Stack:", error.stack);
    }
    // Não lança erro para não bloquear o sistema
  }
}

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = Promise.all([
      createDefaultAdmin(),
      createDefaultEstablishment(),
    ]).then(() => {});
  }
  return bootstrapPromise;
}
