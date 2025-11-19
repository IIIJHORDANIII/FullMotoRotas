// Script para deletar todos os motoboys existentes usando PostgreSQL direto
import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// Carregar variáveis de ambiente do .env manualmente (como outros scripts fazem)
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
  console.error("\n❌ Erro: Nenhuma URL de banco de dados encontrada!");
  console.error("\n📝 Configure uma das seguintes variáveis no arquivo .env:");
  console.error("   - DIRECT_DATABASE_URL=\"postgresql://user:password@host/database?sslmode=require\"");
  console.error("   - DATABASE_URL=\"postgresql://user:password@host/database?sslmode=require\"");
  console.error("\n💡 Dica: Se você usa Prisma Accelerate, configure DIRECT_DATABASE_URL com a URL direta do PostgreSQL.\n");
  process.exit(1);
}

// Usar DIRECT_DATABASE_URL se disponível (conexão direta), senão DATABASE_URL
// Se for uma URL do Prisma Data Proxy, tentar extrair a URL direta ou usar DIRECT_DATABASE_URL
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

async function deleteAllMotoboys() {
  console.log("\n🗑️  Deletando todos os motoboys existentes...\n");

  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log("✅ Conectado ao banco de dados\n");

    // Primeiro, contar os motoboys
    const countResult = await client.query('SELECT COUNT(*)::int as count FROM "MotoboyProfile"');
    const totalCount = Number(countResult.rows[0]?.count || 0);

    console.log(`📊 Encontrados ${totalCount} motoboys no banco de dados`);

    if (totalCount === 0) {
      console.log("✅ Nenhum motoboy encontrado para deletar.");
      return;
    }

    // Contar motoboys com entregas
    const withAssignmentsResult = await client.query(`
      SELECT COUNT(DISTINCT mp.id)::int as count 
      FROM "MotoboyProfile" mp
      INNER JOIN "DeliveryAssignment" da ON da."motoboyId" = mp.id
    `);
    const withAssignments = Number(withAssignmentsResult.rows[0]?.count || 0);
    
    console.log(`   - ${withAssignments} motoboys com entregas atribuídas`);
    console.log(`   - ${totalCount - withAssignments} motoboys sem entregas\n`);

    // Confirmar antes de deletar
    console.log("⚠️  ATENÇÃO: Esta operação irá deletar:");
    console.log(`   - ${totalCount} perfis de motoboy`);
    console.log(`   - ${totalCount} usuários associados`);
    console.log(`   - Todas as entregas atribuídas serão mantidas, mas sem motoboy associado\n`);

    // Deletar usando SQL direto em uma única transação
    await client.query("BEGIN");
    
    try {
      // Primeiro deletar os perfis de motoboy e coletar os userIds
      const deleteMotoboysResult = await client.query(`
        DELETE FROM "MotoboyProfile" RETURNING "userId"
      `);
      
      const userIds = deleteMotoboysResult.rows.map((row) => row.userId);
      
      // Depois deletar os usuários associados
      if (userIds.length > 0) {
        await client.query(
          `DELETE FROM "User" WHERE id = ANY($1::text[]) AND role = 'MOTOBOY'`,
          [userIds]
        );
      }
      
      await client.query("COMMIT");
      
      console.log(`✅ Deletados ${userIds.length} motoboys e seus usuários associados`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    // Resumo final
    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMO DA DELEÇÃO");
    console.log("=".repeat(60));
    console.log(`\n✅ Deletados com sucesso: ${totalCount} motoboys`);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Erro ao deletar motoboys:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteAllMotoboys().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

