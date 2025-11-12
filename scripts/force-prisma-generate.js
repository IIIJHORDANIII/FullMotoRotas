#!/usr/bin/env node

/**
 * Script para forçar a geração do Prisma Client SEM Data Proxy
 * Este script garante que todas as variáveis de ambiente estão configuradas
 * e limpa qualquer cache antes de gerar o Prisma Client
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Logs muito visíveis para debug na Vercel
console.log("\n");
console.log("=".repeat(80));
console.log("🚀 INICIANDO: force-prisma-generate.js");
console.log("=".repeat(80));
console.log(`📁 Diretório atual: ${process.cwd()}`);
console.log(`📁 Script executado de: ${__dirname}`);
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log("=".repeat(80));
console.log("\n");

const projectRoot = path.join(__dirname, "..");
const generatedPrismaPath = path.join(projectRoot, "src", "generated", "prisma");
const dotPrismaPath = path.join(projectRoot, "node_modules", ".prisma");

console.log("🔧 Forçando geração do Prisma Client sem Data Proxy...");
console.log(`📂 Project root: ${projectRoot}`);
console.log(`📂 Generated path: ${generatedPrismaPath}`);
console.log(`📂 Dot prisma path: ${dotPrismaPath}`);

// Limpar diretórios gerados
const dirsToClean = [generatedPrismaPath, dotPrismaPath];
dirsToClean.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`Limpando: ${dir}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠ Não foi possível limpar ${dir}:`, error.message);
    }
  }
});

// Configurar variáveis de ambiente explicitamente
const env = {
  ...process.env,
  // Forçar desabilitação do Data Proxy
  PRISMA_GENERATE_DATAPROXY: "false",
  PRISMA_CLIENT_ENGINE_TYPE: "library",
  PRISMA_CLI_QUERY_ENGINE_TYPE: "library",
  // Remover qualquer variável que possa forçar Data Proxy
};

// Deletar variáveis que podem forçar Data Proxy
delete env.PRISMA_CLIENT_DATAPROXY_URL;
delete env.DATAPROXY_URL;
delete env.PRISMA_ENGINES_MIRROR;
delete env.PRISMA_CLI_QUERY_ENGINE_TYPE; // Remover antes de definir novamente
delete env.PRISMA_CLIENT_ENGINE_TYPE; // Remover antes de definir novamente

// Garantir que as variáveis estão definidas corretamente
env.PRISMA_GENERATE_DATAPROXY = "false";
env.PRISMA_CLIENT_ENGINE_TYPE = "library";
env.PRISMA_CLI_QUERY_ENGINE_TYPE = "library";

// Verificar DATABASE_URL
if (env.DATABASE_URL) {
  if (env.DATABASE_URL.startsWith("prisma://") || env.DATABASE_URL.startsWith("prisma+")) {
    console.error("❌ ERRO: DATABASE_URL está configurada para usar Prisma Data Proxy!");
    console.error("Configure DATABASE_URL com uma string de conexão MongoDB direta (ex: mongodb+srv://...)");
    process.exit(1);
  }
  console.log("✓ DATABASE_URL configurada (não é Data Proxy)");
} else {
  console.warn("⚠ DATABASE_URL não está definida (pode estar configurada na Vercel)");
}

console.log("Variáveis de ambiente configuradas:");
console.log(`  PRISMA_GENERATE_DATAPROXY=${env.PRISMA_GENERATE_DATAPROXY}`);
console.log(`  PRISMA_CLIENT_ENGINE_TYPE=${env.PRISMA_CLIENT_ENGINE_TYPE}`);
console.log(`  PRISMA_CLI_QUERY_ENGINE_TYPE=${env.PRISMA_CLI_QUERY_ENGINE_TYPE}`);

// Verificar se o schema.prisma existe
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ ERRO: schema.prisma não encontrado em: ${schemaPath}`);
  process.exit(1);
}
console.log(`✓ Schema.prisma encontrado: ${schemaPath}`);

// Ler o schema para verificar se engineType está configurado
const schemaContent = fs.readFileSync(schemaPath, "utf8");
if (!schemaContent.includes("engineType") || !schemaContent.includes("library")) {
  console.error("❌ ERRO: schema.prisma não tem engineType = 'library' configurado!");
  console.error("Adicione 'engineType = \"library\"' no generator client do schema.prisma");
  process.exit(1);
}
console.log("✓ Schema.prisma tem engineType = 'library' configurado");

// Executar prisma generate
// IMPORTANTE: O schema.prisma já tem engineType = "library" configurado
// Isso deve ser suficiente para garantir que não use Data Proxy
try {
  console.log("\n📦 Executando: npx prisma generate");
  console.log("📝 Schema.prisma configurado com: engineType = 'library'");
  console.log("🔧 Variáveis de ambiente:");
  console.log(`   PRISMA_GENERATE_DATAPROXY=${env.PRISMA_GENERATE_DATAPROXY}`);
  console.log(`   PRISMA_CLIENT_ENGINE_TYPE=${env.PRISMA_CLIENT_ENGINE_TYPE}`);
  console.log(`   PRISMA_CLI_QUERY_ENGINE_TYPE=${env.PRISMA_CLI_QUERY_ENGINE_TYPE}`);
  
  execSync("npx prisma generate", {
    cwd: projectRoot,
    stdio: "inherit",
    env: env,
  });
  console.log("\n✓ Prisma Client gerado com sucesso");
} catch (error) {
  console.error("\n❌ Erro ao gerar Prisma Client:", error.message);
  if (error instanceof Error && error.stack) {
    console.error("Stack:", error.stack);
  }
  process.exit(1);
}

// Verificar se o client foi gerado corretamente
const clientIndexPath = path.join(generatedPrismaPath, "index.js");
const clientRuntimePath = path.join(generatedPrismaPath, "runtime", "library.js");

if (fs.existsSync(clientIndexPath)) {
  const clientContent = fs.readFileSync(clientIndexPath, "utf8");
  
  // Verificar se há referências ao Data Proxy no código gerado
  const hasDataProxy = clientContent.includes("prisma://") || 
                       clientContent.includes("prisma+") || 
                       clientContent.includes("dataproxy") ||
                       clientContent.includes("DataProxy");
  
  if (hasDataProxy) {
    console.error("\n❌ ERRO: Prisma Client foi gerado com Data Proxy habilitado!");
    console.error("Conteúdo suspeito encontrado no index.js");
    console.error("Isso não deveria acontecer. Verifique as configurações.");
    
    // Mostrar trecho do código onde foi detectado
    const lines = clientContent.split('\n');
    lines.forEach((line, index) => {
      if (line.includes("prisma://") || line.includes("prisma+") || line.includes("dataproxy")) {
        console.error(`Linha ${index + 1}: ${line.substring(0, 100)}`);
      }
    });
    
    process.exit(1);
  }
  
  // Verificar se está usando library engine
  if (clientContent.includes("engineType") && !clientContent.includes("library")) {
    console.warn("\n⚠ Aviso: Engine type pode não estar configurado como 'library'");
  }
  
  // Verificar se o runtime library existe (indica que não está usando Data Proxy)
  if (fs.existsSync(clientRuntimePath)) {
    console.log("✓ Runtime library encontrado (indica uso de library engine, não Data Proxy)");
  } else {
    console.warn("⚠ Runtime library não encontrado - pode indicar uso de Data Proxy");
  }
  
  console.log("✓ Verificação: Prisma Client não está usando Data Proxy");
} else {
  console.error("\n❌ Arquivo index.js não encontrado após geração!");
  console.error("O Prisma Client não foi gerado corretamente.");
  process.exit(1);
}

// Criar/atualizar arquivo enums.ts
const enumsFile = path.join(generatedPrismaPath, "enums.ts");
const enumsContent = `/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
* This file exports all enum related types from the schema.
*
* 🟢 You can import this file directly.
*/

// Re-export enums from the main Prisma client
export {
  Role,
  type Role as RoleType,
  EstablishmentPlan,
  type EstablishmentPlan as EstablishmentPlanType,
  DeliveryStatus,
  type DeliveryStatus as DeliveryStatusType,
  AssignmentStatus,
  type AssignmentStatus as AssignmentStatusType,
} from './index';
`;

try {
  fs.writeFileSync(enumsFile, enumsContent, "utf8");
  console.log("✓ Arquivo enums.ts criado/atualizado");
} catch (error) {
  console.error("❌ Erro ao criar enums.ts:", error.message);
  process.exit(1);
}

console.log("\n");
console.log("=".repeat(80));
console.log("✅ CONCLUÍDO: force-prisma-generate.js");
console.log("=".repeat(80));
console.log("\n");

