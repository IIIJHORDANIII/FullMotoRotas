#!/usr/bin/env node

/**
 * Script para verificar se o Prisma Client foi gerado corretamente antes do build
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const generatedPrismaPath = path.join(projectRoot, "src", "generated", "prisma");
const enumsFile = path.join(generatedPrismaPath, "enums.ts");
const clientFile = path.join(generatedPrismaPath, "client.ts");

console.log("Verificando se o Prisma Client foi gerado corretamente...");

if (!fs.existsSync(generatedPrismaPath)) {
  console.error("❌ Diretório do Prisma Client não encontrado:", generatedPrismaPath);
  console.error("Execute: npx prisma generate");
  process.exit(1);
}

if (!fs.existsSync(enumsFile)) {
  console.error("❌ Arquivo enums.ts não encontrado:", enumsFile);
  console.error("Execute: npx prisma generate");
  process.exit(1);
}

if (!fs.existsSync(clientFile)) {
  console.error("❌ Arquivo client.ts não encontrado:", clientFile);
  console.error("Execute: npx prisma generate");
  process.exit(1);
}

console.log("✓ Prisma Client gerado corretamente");
console.log(`  - enums.ts: ${enumsFile}`);
console.log(`  - client.ts: ${clientFile}`);

