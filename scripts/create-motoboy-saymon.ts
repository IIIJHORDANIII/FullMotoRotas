// Script para criar usuário de motoboy específico: saymon@motorotas.com
// Usa PostgreSQL direto para evitar problemas com Prisma Data Proxy
// Cria o motoboy como INDISPONÍVEL (não logado)
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

// Carregar variáveis de ambiente do .env manualmente
try {
  const envPath = resolve(process.cwd(), ".env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Não foi possível carregar .env, usando variáveis de ambiente do sistema");
}

// Para scripts locais, precisamos usar uma URL direta do PostgreSQL
const directUrl = process.env.DIRECT_DATABASE_URL;
const databaseUrl = process.env.DATABASE_URL;

if (!directUrl && !databaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL ou DATABASE_URL não está definida. Configure a string de conexão do banco de dados.\n" +
    "Para scripts locais, use DIRECT_DATABASE_URL com uma URL direta do PostgreSQL (postgresql://...)"
  );
}

// Usar DIRECT_DATABASE_URL se disponível (conexão direta), senão DATABASE_URL
let finalUrl: string = directUrl || databaseUrl || "";

// Garantir que finalUrl não está vazio (já foi verificado acima, mas TypeScript precisa disso)
if (!finalUrl) {
  throw new Error("URL do banco de dados não está definida");
}

// Se a URL começa com prisma:// ou prisma+postgres://, precisamos usar DIRECT_DATABASE_URL
if (finalUrl.startsWith("prisma://") || finalUrl.startsWith("prisma+postgres://")) {
  if (!directUrl) {
    throw new Error(
      "DATABASE_URL é uma URL do Prisma Data Proxy. Configure DIRECT_DATABASE_URL com uma URL direta do PostgreSQL (postgresql://...)"
    );
  }
  finalUrl = directUrl;
}

console.log(`[Script] Usando URL: ${finalUrl.substring(0, Math.min(50, finalUrl.length))}...`);

// Criar cliente PostgreSQL direto
const client = new Client({
  connectionString: finalUrl,
});

async function createMotoboySaymon() {
  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log("✅ Conectado ao banco de dados\n");

    // Credenciais do motoboy
    const email = "saymon@motorotas.com";
    const password = "123456";
    const fullName = "Saymon";
    const cpf = "11122233344";
    const cnhNumber = "11122233345";
    const cnhCategory = "AB";
    const vehicleType = "moto";
    const phone = "(47) 98888-7777";

    console.log(`📝 Criando motoboy: ${email}`);
    console.log(`   Status: INDISPONÍVEL (não logado)\n`);

    // Verificar se já existe
    const userResult = await client.query(
      `SELECT u.id, u.email, m.id as motoboy_id 
       FROM "User" u 
       LEFT JOIN "MotoboyProfile" m ON m."userId" = u.id 
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].motoboy_id) {
      console.log(`⚠️  Motoboy já existe: ${email}`);
      console.log(`   Atualizando senha e dados...`);
      
      // Resetar senha e atualizar perfil como INDISPONÍVEL
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = userResult.rows[0].id;
      const motoboyId = userResult.rows[0].motoboy_id;
      
      await client.query(
        `UPDATE "User" SET password = $1, "isActive" = true WHERE id = $2`,
        [passwordHash, userId]
      );
      
      // Tornar indisponível e remover localização
      await client.query(
        `UPDATE "MotoboyProfile" 
         SET "fullName" = $1, "isAvailable" = false, "currentLat" = NULL, "currentLng" = NULL 
         WHERE id = $2`,
        [fullName, motoboyId]
      );
      
      console.log(`✅ Motoboy atualizado com sucesso!`);
      console.log(`   Email: ${email}`);
      console.log(`   Senha: ${password}`);
      console.log(`   Status: INDISPONÍVEL\n`);
    } else {
      // Criar novo motoboy como INDISPONÍVEL
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();
      const motoboyId = randomUUID();

      // Criar usuário primeiro
      await client.query(
        `INSERT INTO "User" (id, email, password, role, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'MOTOBOY', true, NOW(), NOW())`,
        [userId, email, passwordHash]
      );

      // Criar perfil de motoboy como INDISPONÍVEL (sem localização)
      await client.query(
        `INSERT INTO "MotoboyProfile" 
         (id, "userId", "fullName", cpf, "cnhNumber", "cnhCategory", "vehicleType", phone, 
          "isAvailable", "currentLat", "currentLng", "hiredAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NULL, NULL, NOW(), NOW(), NOW())`,
        [motoboyId, userId, fullName, cpf, cnhNumber, cnhCategory, vehicleType, phone]
      );

      console.log(`✅ Motoboy criado com sucesso!`);
      console.log(`   ID: ${userId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Senha: ${password}`);
      console.log(`   Status: INDISPONÍVEL\n`);
    }

    // Resumo final
    console.log("=".repeat(60));
    console.log("📋 CREDENCIAIS DO MOTOBOY");
    console.log("=".repeat(60));
    console.log(`\n🛵 MOTOBOY:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    console.log(`   Nome: ${fullName}`);
    console.log(`   Role: MOTOBOY`);
    console.log(`   Status: INDISPONÍVEL (não logado)`);
    console.log(`   Acesso: /motoboy/dashboard`);
    console.log(`\n⚠️  O motoboy está INDISPONÍVEL e não aparecerá no mapa`);
    console.log(`   até que faça login e seja marcado como disponível.`);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Erro ao criar motoboy:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

createMotoboySaymon().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

