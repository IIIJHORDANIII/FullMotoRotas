#!/usr/bin/env node

/**
 * Script para gerar o Prisma Client habilitado para o Data Proxy.
 *
 * Ele garante:
 *  - Carregamento do .env antes da geração;
 *  - Execução do `prisma generate --data-proxy`;
 *  - Criação dos arquivos bridge em `src/generated/prisma`;
 *  - Verificação básica se o client gerado está usando o runtime do Data Proxy.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const clientIndexPath = path.join(projectRoot, "node_modules", "@prisma", "client", "index.js");

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (!match) return;

      const key = match[1];
      let value = match[2];

      const hashIndex = value.indexOf("#");
      if (hashIndex !== -1) {
        value = value.slice(0, hashIndex);
      }

      value = value.trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn(
      "⚠ Não foi possível carregar variáveis do .env:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

loadEnvFromFile(path.join(projectRoot, ".env"));

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ ERRO: schema.prisma não encontrado em: ${schemaPath}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL não está definida. Defina a URL do Data Proxy antes de gerar o Prisma Client.");
  process.exit(1);
}

console.log(`✓ DATABASE_URL detectada: ${process.env.DATABASE_URL.substring(0, 40)}...`);
if (!process.env.DATABASE_URL.startsWith("prisma")) {
  console.warn("⚠ DATABASE_URL não parece ser uma URL de Data Proxy (prisma:// ou prisma+postgres://).");
}

const env = {
  ...process.env,
  PRISMA_GENERATE_DATAPROXY: "true",
  PRISMA_CLIENT_USE_DATAPROXY: "true",
  PRISMA_CLIENT_DATAPROXY: "true",
  // Ignorar verificação de checksum dos binários (não necessário para Data Proxy/Accelerate)
  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1",
  // Não baixar binários desnecessários
  PRISMA_SKIP_POSTINSTALL_GENERATE: "true",
  // Forçar uso de library engine (sem binários locais)
  PRISMA_CLIENT_ENGINE_TYPE: "library",
  // Desabilitar download de binários
  PRISMA_SKIP_DOWNLOAD: "true",
};

// Limpar diretório gerado para garantir artefatos atualizados
if (fs.existsSync(generatedPrismaPath)) {
  console.log(`🧹 Limpando diretório gerado: ${generatedPrismaPath}`);
  fs.rmSync(generatedPrismaPath, { recursive: true, force: true });
}

try {
  console.log("\n📦 Executando: npx prisma generate --data-proxy\n");
  console.log("📝 Variáveis de ambiente configuradas:");
  console.log("   - PRISMA_GENERATE_DATAPROXY:", env.PRISMA_GENERATE_DATAPROXY);
  console.log("   - PRISMA_CLIENT_USE_DATAPROXY:", env.PRISMA_CLIENT_USE_DATAPROXY);
  console.log("   - PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING:", env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING);
  
  execSync("npx prisma generate --data-proxy", {
    cwd: projectRoot,
    stdio: "inherit",
    env,
  });
  console.log("\n✓ Prisma Client gerado com suporte a Data Proxy\n");
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("❌ Erro ao executar prisma generate:", errorMessage);
  
  // Se for erro de checksum, informar que foi ignorado
  if (errorMessage.includes("checksum")) {
    console.error("\n💡 Nota: Erro de checksum ignorado com PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1");
    console.error("   Isso é normal ao usar Prisma Data Proxy, que não requer binários locais.");
    console.error("   O Prisma Client deve ter sido gerado corretamente mesmo com este aviso.\n");
  }
  
  process.exit(1);
}

// Criar arquivos bridge (caso tenham sido limpos)
fs.mkdirSync(generatedPrismaPath, { recursive: true });
const indexTsPath = path.join(generatedPrismaPath, "index.ts");
const enumsTsPath = path.join(generatedPrismaPath, "enums.ts");

// Não criar index.ts - usar diretamente o index.js gerado pelo Prisma
const indexTsContent = null;

const enumsTsContent = `/* Reexporta enums do Prisma Client gerado localmente. */
// Re-export enums diretamente do módulo gerado pelo Prisma
export {
  Role,
  EstablishmentPlan,
  DeliveryStatus,
  AssignmentStatus,
  type Role as RoleType,
  type EstablishmentPlan as EstablishmentPlanType,
  type DeliveryStatus as DeliveryStatusType,
  type AssignmentStatus as AssignmentStatusType,
} from "./index.js";
`;

if (indexTsContent) {
  fs.writeFileSync(indexTsPath, indexTsContent, "utf8");
}
fs.writeFileSync(enumsTsPath, enumsTsContent, "utf8");
console.log("✓ Arquivos bridge atualizados em src/generated/prisma");

// Verificação básica do client gerado
if (fs.existsSync(clientIndexPath)) {
  const clientContent = fs.readFileSync(clientIndexPath, "utf8");
  const usesDataProxyRuntime = clientContent.includes("runtime/data-proxy");

  if (usesDataProxyRuntime) {
    console.log("✓ Prisma Client está usando o runtime do Data Proxy");
  } else {
    console.warn("⚠ Não foi possível detectar runtime do Data Proxy em @prisma/client/index.js");
  }
} else {
  console.warn("⚠ @prisma/client/index.js não encontrado após a geração. Verifique a instalação do pacote.");
}

console.log("\n");
console.log("=".repeat(80));
console.log("✅ CONCLUÍDO: force-prisma-generate.js");
console.log("=".repeat(80));
console.log("\n");

