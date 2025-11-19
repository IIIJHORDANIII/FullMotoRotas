// Script para desconectar o motoboy Lucas
// Usa PostgreSQL direto para evitar problemas com Prisma Data Proxy
import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

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

async function disconnectMotoboyLucas() {
  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log("✅ Conectado ao banco de dados\n");

    const email = "lucas@motorotas.com";

    console.log(`📝 Desconectando motoboy: ${email}`);

    // Buscar o motoboy
    const userResult = await client.query(
      `SELECT u.id, u.email, m.id as motoboy_id, m."fullName"
       FROM "User" u 
       LEFT JOIN "MotoboyProfile" m ON m."userId" = u.id 
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].motoboy_id) {
      console.log(`⚠️  Motoboy não encontrado: ${email}`);
      return;
    }

    const motoboyId = userResult.rows[0].motoboy_id;
    const fullName = userResult.rows[0].fullName || "Lucas";

    // Desconectar: tornar indisponível e limpar localização
    await client.query(
      `UPDATE "MotoboyProfile" 
       SET "isAvailable" = false, "currentLat" = NULL, "currentLng" = NULL 
       WHERE id = $1`,
      [motoboyId]
    );

    console.log(`✅ Motoboy desconectado com sucesso!`);
    console.log(`   Nome: ${fullName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Status: Indisponível`);
    console.log(`   Localização: Removida\n`);
  } catch (error) {
    console.error("❌ Erro ao desconectar motoboy:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

disconnectMotoboyLucas().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

