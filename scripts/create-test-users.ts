import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log("\n🔧 Criando usuários de teste...\n");

  try {
    // Criar usuário de teste para Estabelecimento
    const establishmentEmail = "estabelecimento@teste.com";
    const establishmentPassword = "Estabelecimento@123";

    console.log(`📝 Criando estabelecimento: ${establishmentEmail}`);

    // Verificar se já existe
    const existingEstablishment = await prisma.user.findUnique({
      where: { email: establishmentEmail },
    });

    if (existingEstablishment) {
      console.log(`⚠️  Estabelecimento já existe: ${establishmentEmail}`);
      console.log(`   Email: ${establishmentEmail}`);
      console.log(`   Senha: ${establishmentPassword}\n`);
    } else {
      const establishmentPasswordHash = await bcrypt.hash(establishmentPassword, 10);

      const establishmentUser = await prisma.user.create({
        data: {
          email: establishmentEmail,
          password: establishmentPasswordHash,
          role: Role.ESTABLISHMENT,
          isActive: true,
          establishment: {
            create: {
              name: "Restaurante Bom Sabor",
              cnpj: "12345678000190",
              contactEmail: establishmentEmail,
              contactPhone: "(11) 98765-4321",
              addressLine1: "Rua das Flores, 123",
              addressLine2: "Centro",
              city: "São Paulo",
              state: "SP",
              postalCode: "01234-567",
              deliveryRadiusKm: 10,
              baseDeliveryFee: 5.0,
              additionalPerKm: 1.5,
              estimatedDeliveryTimeMinutes: 30,
              plan: "BASIC",
              isActive: true,
            },
          },
        },
      });

      console.log(`✅ Estabelecimento criado com sucesso!`);
      console.log(`   ID: ${establishmentUser.id}`);
      console.log(`   Email: ${establishmentEmail}`);
      console.log(`   Senha: ${establishmentPassword}\n`);
    }

    // Criar usuário de teste para Motoboy
    const motoboyEmail = "motoboy@teste.com";
    const motoboyPassword = "Motoboy@123";

    console.log(`📝 Criando motoboy: ${motoboyEmail}`);

    // Verificar se já existe
    const existingMotoboy = await prisma.user.findUnique({
      where: { email: motoboyEmail },
    });

    if (existingMotoboy) {
      console.log(`⚠️  Motoboy já existe: ${motoboyEmail}`);
      console.log(`   Email: ${motoboyEmail}`);
      console.log(`   Senha: ${motoboyPassword}\n`);
    } else {
      const motoboyPasswordHash = await bcrypt.hash(motoboyPassword, 10);

      const motoboyUser = await prisma.user.create({
        data: {
          email: motoboyEmail,
          password: motoboyPasswordHash,
          role: Role.MOTOBOY,
          isActive: true,
          motoboy: {
            create: {
              fullName: "João Silva",
              cpf: "12345678900",
              cnhNumber: "12345678901",
              cnhCategory: "AB",
              vehicleType: "moto",
              phone: "(11) 91234-5678",
              isAvailable: true,
              currentLat: -23.5505,
              currentLng: -46.6333,
            },
          },
        },
      });

      console.log(`✅ Motoboy criado com sucesso!`);
      console.log(`   ID: ${motoboyUser.id}`);
      console.log(`   Email: ${motoboyEmail}`);
      console.log(`   Senha: ${motoboyPassword}\n`);
    }

    // Resumo final
    console.log("=".repeat(60));
    console.log("📋 RESUMO DOS USUÁRIOS DE TESTE");
    console.log("=".repeat(60));
    console.log("\n🏢 ESTABELECIMENTO:");
    console.log(`   Email: ${establishmentEmail}`);
    console.log(`   Senha: ${establishmentPassword}`);
    console.log(`   Role: ESTABLISHMENT`);
    console.log(`   Acesso: /dashboard`);
    console.log("\n🛵 MOTOBOY:");
    console.log(`   Email: ${motoboyEmail}`);
    console.log(`   Senha: ${motoboyPassword}`);
    console.log(`   Role: MOTOBOY`);
    console.log(`   Acesso: /motoboy/dashboard`);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Erro ao criar usuários de teste:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

