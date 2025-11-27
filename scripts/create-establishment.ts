#!/usr/bin/env node

/**
 * Script para criar um usuário estabelecimento
 * Uso: npx tsx scripts/create-establishment.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
// Carregar variáveis de ambiente
const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

// Configurar variáveis de ambiente do Prisma Data Proxy
process.env.PRISMA_GENERATE_DATAPROXY = "true";
process.env.PRISMA_CLIENT_USE_DATAPROXY = "true";
process.env.PRISMA_CLIENT_DATAPROXY = "true";

async function createEstablishment() {
  // Importar módulos dinamicamente
  const { PrismaClient, Role, EstablishmentPlan } = await import("../src/generated/prisma/index.js");
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default ?? bcryptModule;
  
  const prisma = new PrismaClient();
  console.log("\n🔧 Criando usuário estabelecimento...\n");

  try {
    const email = "estabelecimento@motorotas.app.br";
    const password = "Estabelecimento@123"; // Senha padrão, pode ser alterada depois

    console.log(`📝 Email: ${email}`);

    // Verificar se já existe
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { establishment: true },
    });

    if (existing) {
      console.log(`⚠️  Usuário já existe: ${email}`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   Ativo: ${existing.isActive ? "Sim" : "Não"}`);
      
      if (existing.establishment) {
        console.log(`   Estabelecimento: ${existing.establishment.name}`);
        console.log(`   CNPJ: ${existing.establishment.cnpj}`);
      }
      
      // Perguntar se quer resetar a senha
      console.log(`\n💡 Para resetar a senha, execute:`);
      console.log(`   npx tsx scripts/reset-password.ts ${email}\n`);
      
      await prisma.$disconnect();
      return;
    }

    // Criar hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário e perfil do estabelecimento
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: Role.ESTABLISHMENT,
        isActive: true,
        establishment: {
          create: {
            name: "Estabelecimento Motorotas",
            cnpj: "12345678000190", // CNPJ padrão, deve ser alterado
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
      include: {
        establishment: true,
      },
    });

    console.log(`\n✅ Usuário estabelecimento criado com sucesso!`);
    console.log(`\n📋 DETALHES:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Estabelecimento: ${user.establishment?.name}`);
    console.log(`   CNPJ: ${user.establishment?.cnpj}`);
    console.log(`\n⚠️  IMPORTANTE:`);
    console.log(`   - Altere a senha após o primeiro login`);
    console.log(`   - Atualize o CNPJ e dados do estabelecimento`);
    console.log(`   - Acesse: /dashboard\n`);
  } catch (error) {
    console.error("❌ Erro ao criar usuário estabelecimento:", error);
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

// Executar função principal
createEstablishment().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

