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
    // Tornar o arquivo executável se necessário
    try {
      fs.chmodSync(dest, 0o755);
    } catch (e) {
      // Ignorar erros de permissão
    }
  }
  return true;
}

// Função para encontrar arquivos recursivamente
function findFiles(dir, pattern, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          findFiles(filePath, pattern, fileList);
        } else if (pattern.test(file)) {
          fileList.push(filePath);
        }
      } catch (e) {
        // Ignorar erros de acesso
      }
    });
  } catch (e) {
    // Ignorar erros de acesso ao diretório
  }

  return fileList;
}

// Função para encontrar e copiar binários do Query Engine
function copyPrismaBinaries() {
  console.log("Copiando binários do Prisma Query Engine...");

  const projectRoot = path.join(__dirname, "..");
  const buildPath = path.join(projectRoot, ".next", "server", "chunks");
  const generatedPrismaPath = path.join(projectRoot, "src", "generated", "prisma");
  const prismaClientPath = path.join(projectRoot, "node_modules", "@prisma", "client");
  const dotPrismaPath = path.join(projectRoot, "node_modules", ".prisma", "client");

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
    path.join(projectRoot, "node_modules", ".prisma"),
  ];

  // Padrão para encontrar binários do Query Engine (especialmente rhel-openssl-3.0.x)
  const binaryPattern = /(libquery_engine|query_engine|query-engine).*\.(node|so)$/i;
  const rhelPattern = /rhel-openssl-3\.0\.x/i;

  let copiedCount = 0;
  const copiedFiles = new Set();

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

        // Priorizar binários rhel-openssl-3.0.x
        const isRhel = rhelPattern.test(fileName);
        if (isRhel || !copiedFiles.has(fileName)) {
          try {
            copyRecursiveSync(binaryPath, destPath);
            console.log(`✓ Copiado: ${fileName}${isRhel ? " (rhel-openssl-3.0.x)" : ""}`);
            copiedFiles.add(fileName);
            copiedCount++;
          } catch (error) {
            console.error(`✗ Erro ao copiar ${fileName}:`, error.message);
          }
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

  // Copiar para todos os locais que o Prisma pode procurar (baseado no erro)
  const additionalDestPaths = [
    path.join(projectRoot, ".next", "server", "chunks"),
    path.join(projectRoot, ".next", "server"),
    path.join(projectRoot, ".next"),
    path.join(projectRoot, "src", "generated"),
  ];

  for (const additionalDest of additionalDestPaths) {
    if (fs.existsSync(additionalDest) && fs.existsSync(generatedPrismaPath)) {
      // Copiar binários individuais
      const binaries = findFiles(generatedPrismaPath, binaryPattern);
      for (const binaryPath of binaries) {
        const fileName = path.basename(binaryPath);
        const destPath = path.join(additionalDest, fileName);
        try {
          copyRecursiveSync(binaryPath, destPath);
          console.log(`✓ Copiado ${fileName} para ${additionalDest}`);
        } catch (error) {
          // Ignorar erros silenciosamente para destinos opcionais
        }
      }

      // Copiar diretório completo
      const destPrismaPath = path.join(additionalDest, "prisma");
      try {
        copyRecursiveSync(generatedPrismaPath, destPrismaPath);
        console.log(`✓ Copiado diretório para: ${destPrismaPath}`);
      } catch (error) {
        // Ignorar erros silenciosamente para destinos opcionais
      }
    }
  }

  if (copiedCount > 0) {
    console.log(`\n✓ Concluído! ${copiedCount} arquivo(s) copiado(s).`);
  } else {
    console.log("\n⚠ Nenhum binário encontrado. Verifique se o Prisma Client foi gerado corretamente.");
    console.log("Execute: npx prisma generate");
  }
}

copyPrismaBinaries();

