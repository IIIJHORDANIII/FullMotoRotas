#!/usr/bin/env node

/**
 * Script para copiar os binários do Prisma Query Engine para o diretório de build do Next.js
 * Isso resolve o problema de "Query Engine not found" em deployments como Vercel
 */

const fs = require("fs");
const path = require("path");

// Função para copiar arquivos recursivamente
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return false;

  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
  return true;
}

// Função para encontrar arquivos recursivamente
function findFiles(dir, pattern, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, pattern, fileList);
    } else if (pattern.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Função para encontrar e copiar binários do Query Engine
function copyPrismaBinaries() {
  console.log("Copiando binários do Prisma Query Engine...");

  const buildPath = path.join(__dirname, "..", ".next", "server", "chunks");
  const generatedPrismaPath = path.join(__dirname, "..", "src", "generated", "prisma");
  const prismaClientPath = path.join(__dirname, "..", "node_modules", "@prisma", "client");
  const dotPrismaPath = path.join(__dirname, "..", "node_modules", ".prisma", "client");

  // Verificar se o diretório de build existe
  if (!fs.existsSync(buildPath)) {
    console.log(`Diretório de build não encontrado: ${buildPath}`);
    console.log("Execute 'npm run build' primeiro.");
    return;
  }

  // Locais onde o Prisma procura os binários
  const searchPaths = [
    generatedPrismaPath,
    prismaClientPath,
    dotPrismaPath,
  ];

  // Padrão para encontrar binários do Query Engine
  const binaryPattern = /(libquery_engine|query_engine|query-engine).*\.(node|so)$/i;

  let copiedCount = 0;

  // Procurar e copiar binários
  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) {
      continue;
    }

    console.log(`Procurando em: ${searchPath}`);
    const binaries = findFiles(searchPath, binaryPattern);

    if (binaries.length > 0) {
      console.log(`Encontrados ${binaries.length} binário(s)`);
      for (const binaryPath of binaries) {
        const fileName = path.basename(binaryPath);
        const destPath = path.join(buildPath, fileName);

        try {
          copyRecursiveSync(binaryPath, destPath);
          console.log(`✓ Copiado: ${fileName}`);
          copiedCount++;
        } catch (error) {
          console.error(`✗ Erro ao copiar ${fileName}:`, error.message);
        }
      }
    }
  }

  // Copiar o diretório completo do Prisma Client gerado para garantir acesso completo
  if (fs.existsSync(generatedPrismaPath)) {
    const prismaDestPath = path.join(buildPath, "prisma");
    try {
      copyRecursiveSync(generatedPrismaPath, prismaDestPath);
      console.log(`✓ Copiado diretório Prisma Client completo`);
      copiedCount++;
    } catch (error) {
      console.error(`✗ Erro ao copiar diretório Prisma:`, error.message);
    }
  }

  // Também copiar para outros locais que o Prisma pode procurar
  const additionalDestPaths = [
    path.join(__dirname, "..", ".next", "server"),
    path.join(__dirname, "..", ".next"),
  ];

  for (const additionalDest of additionalDestPaths) {
    if (fs.existsSync(additionalDest) && fs.existsSync(generatedPrismaPath)) {
      const destPrismaPath = path.join(additionalDest, "prisma");
      try {
        copyRecursiveSync(generatedPrismaPath, destPrismaPath);
        console.log(`✓ Copiado para: ${destPrismaPath}`);
      } catch (error) {
        // Ignorar erros silenciosamente para destinos opcionais
      }
    }
  }

  if (copiedCount > 0) {
    console.log(`\n✓ Concluído! ${copiedCount} arquivo(s) copiado(s).`);
  } else {
    console.log("\n⚠ Nenhum binário encontrado. Verifique se o Prisma Client foi gerado corretamente.");
  }
}

copyPrismaBinaries();

