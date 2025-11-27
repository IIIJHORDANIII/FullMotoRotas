#!/usr/bin/env tsx
/**
 * Script para migrar o banco de dados para o novo .env
 * 
 * Este script executa as migrações do Prisma usando DIRECT_DATABASE_URL
 * quando disponível, ou DATABASE_URL como fallback.
 */

import { execSync } from "child_process";
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
    // Ignorar linhas vazias e comentários
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }
    
    // Procurar por padrão KEY="value" ou KEY=value
    const match = trimmedLine.match(/^([^#=]+)=["']?([^"']*)["']?$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remover aspas se houver
      value = value.replace(/^["']|["']$/g, "");
      
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
  
  // Debug: mostrar variáveis carregadas (apenas primeiros caracteres)
  console.log("🔍 Variáveis carregadas do .env:");
  if (process.env.DATABASE_URL) {
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 40)}...`);
  }
  if (process.env.DIRECT_DATABASE_URL) {
    console.log(`   DIRECT_DATABASE_URL: ${process.env.DIRECT_DATABASE_URL.substring(0, 40)}...`);
  }
  console.log("");
} catch (error) {
  console.warn("⚠️  Não foi possível carregar o arquivo .env:", error);
  if (error instanceof Error) {
    console.warn("   Erro:", error.message);
  }
}

const directUrl = process.env.DIRECT_DATABASE_URL;
const databaseUrl = process.env.DATABASE_URL;

console.log("🔄 Iniciando migração do banco de dados...\n");

// Verificar se há uma URL de banco configurada
if (!directUrl && !databaseUrl) {
  console.error("❌ Erro: Nenhuma URL de banco de dados encontrada!");
  console.error("   Configure DIRECT_DATABASE_URL ou DATABASE_URL no arquivo .env");
  process.exit(1);
}

// Priorizar DIRECT_DATABASE_URL para migrações (conexão direta é mais confiável)
const migrationUrl: string = directUrl || databaseUrl || "";
const urlType = directUrl ? "DIRECT_DATABASE_URL (conexão direta)" : "DATABASE_URL";

// Garantir que migrationUrl não está vazia (TypeScript safety)
if (!migrationUrl) {
  console.error("❌ Erro: URL de banco de dados inválida!");
  process.exit(1);
}

console.log(`📊 Usando: ${urlType}`);
console.log(`🔗 URL: ${migrationUrl.substring(0, Math.min(30, migrationUrl.length))}...\n`);

try {
  // Definir a URL no ambiente para o Prisma usar
  const env = {
    ...process.env,
    DATABASE_URL: migrationUrl,
  };

  // Se estamos usando DIRECT_DATABASE_URL, garantir que o Prisma use conexão direta
  if (directUrl) {
    delete env.PRISMA_GENERATE_DATAPROXY;
    delete env.PRISMA_CLIENT_USE_DATAPROXY;
    delete env.PRISMA_CLIENT_DATAPROXY;
    console.log("✓ Configurado para usar conexão direta ao banco\n");
  }

  console.log("📦 Aplicando migrações...");
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: env,
  });

  console.log("\n✅ Migrações aplicadas com sucesso!");

  console.log("\n🔄 Regenerando Prisma Client...");
  execSync("npx prisma generate", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: env,
  });

  console.log("\n✅ Prisma Client regenerado com sucesso!");
  console.log("\n🎉 Migração concluída! O banco de dados está pronto para uso.");
} catch (error) {
  console.error("\n❌ Erro durante a migração:", error);
  process.exit(1);
}

