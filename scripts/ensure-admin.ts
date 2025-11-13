// Script para garantir que o usuário admin existe e está ativo
// Execute: npx tsx scripts/ensure-admin.ts

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Carregar variáveis de ambiente do arquivo .env manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env");

try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Não foi possível carregar .env, usando variáveis de ambiente do sistema");
}

process.env.PRISMA_GENERATE_DATAPROXY = "true";
process.env.PRISMA_CLIENT_USE_DATAPROXY = "true";
process.env.PRISMA_CLIENT_DATAPROXY = "true";

async function ensureAdmin() {
  const { PrismaClient, Role } = await import("@prisma/client");
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default ?? bcryptModule;

  const prisma = new PrismaClient();

  const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@motorotas.com";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

  console.log(`\n🔧 Verificando usuário admin: ${email}\n`);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      console.log(`✅ Usuário admin já existe: ${email}`);
      
      // Resetar senha e garantir que está ativo
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          password: passwordHash,
          isActive: true,
        },
      });
      
      console.log(`✅ Senha resetada e usuário ativado`);
      console.log(`\n📧 Email: ${email}`);
      console.log(`🔑 Senha: ${password}\n`);
    } else {
      // Criar novo usuário admin
      console.log(`📝 Criando novo usuário admin...`);
      const passwordHash = await bcrypt.hash(password, 10);
      
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.ADMIN,
          isActive: true,
        },
      });
      
      console.log(`✅ Usuário admin criado com sucesso!`);
      console.log(`\n📧 Email: ${email}`);
      console.log(`🔑 Senha: ${password}\n`);
    }
  } catch (error) {
    console.error("❌ Erro ao garantir usuário admin:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ensureAdmin().catch((error) => {
  console.error("❌ Erro inesperado ao executar ensure-admin:", error);
  process.exit(1);
});


