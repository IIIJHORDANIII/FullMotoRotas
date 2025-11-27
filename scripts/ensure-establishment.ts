#!/usr/bin/env node

/**
 * Script para garantir que o usuário estabelecimento existe e está ativo
 * Similar ao ensure-admin.ts, mas para estabelecimento
 * Execute: npx tsx scripts/ensure-establishment.ts
 */

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

async function ensureEstablishment() {
  const { PrismaClient, Role, EstablishmentPlan } = await import("../src/generated/prisma/index.js");
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default ?? bcryptModule;

  const prisma = new PrismaClient();

  const email = process.env.DEFAULT_ESTABLISHMENT_EMAIL || "estabelecimento@motorotas.app.br";
  const password = process.env.DEFAULT_ESTABLISHMENT_PASSWORD || "Estabelecimento@123";

  console.log(`\n🔧 Verificando usuário estabelecimento: ${email}\n`);

  try {
    const existing = await prisma.user.findUnique({ 
      where: { email },
      include: { establishment: true }
    });

    if (existing) {
      console.log(`✅ Usuário estabelecimento já existe: ${email}`);
      
      // Resetar senha e garantir que está ativo
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          password: passwordHash,
          isActive: true,
        },
      });
      
      // Garantir que o perfil do estabelecimento existe e está ativo
      if (!existing.establishment) {
        console.log(`📝 Criando perfil do estabelecimento...`);
        await prisma.establishmentProfile.create({
          data: {
            userId: existing.id,
            name: "Estabelecimento Motorotas",
            cnpj: "12345678000190",
            contactEmail: email,
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
        console.log(`✅ Perfil do estabelecimento criado`);
      } else {
        // Garantir que o estabelecimento está ativo
        await prisma.establishmentProfile.update({
          where: { userId: existing.id },
          data: { isActive: true },
        });
        console.log(`✅ Estabelecimento reativado`);
      }
      
      console.log(`✅ Senha resetada e usuário ativado`);
      console.log(`\n📧 Email: ${email}`);
      console.log(`🔑 Senha: ${password}\n`);
    } else {
      // Criar novo usuário estabelecimento
      console.log(`📝 Criando novo usuário estabelecimento...`);
      const passwordHash = await bcrypt.hash(password, 10);
      
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.ESTABLISHMENT,
          isActive: true,
          establishment: {
            create: {
              name: "Estabelecimento Motorotas",
              cnpj: "12345678000190",
              contactEmail: email,
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
      
      console.log(`✅ Usuário estabelecimento criado com sucesso!`);
      console.log(`\n📧 Email: ${email}`);
      console.log(`🔑 Senha: ${password}\n`);
    }
  } catch (error) {
    console.error("❌ Erro ao garantir usuário estabelecimento:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      if (error.stack) {
        console.error("Stack:", error.stack);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ensureEstablishment().catch((error) => {
  console.error("❌ Erro inesperado ao executar ensure-establishment:", error);
  process.exit(1);
});

