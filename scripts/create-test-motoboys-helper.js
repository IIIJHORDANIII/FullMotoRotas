// Script helper para gerar Prisma Client sem Data Proxy antes de executar o script TypeScript
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const tempSchemaPath = path.join(__dirname, "../prisma/schema.temp.prisma");

try {
  // Ler o schema original
  const originalSchema = fs.readFileSync(schemaPath, "utf8");
  
  // Criar schema temporário sem Data Proxy
  // Remover completamente a linha engineType e mudar o output
  let tempSchema = originalSchema;
  
  // Remover a linha engineType completa (incluindo comentários)
  // Pode estar em formato: engineType = "library" // comentário
  tempSchema = tempSchema.replace(/^\s*engineType\s*=\s*"library"[^\n]*$/gm, '');
  
  // Mudar o output para o local padrão
  tempSchema = tempSchema.replace(/output\s*=\s*"\.\.\/src\/generated\/prisma"/g, 'output = "../node_modules/.prisma/client"');
  
  // Verificar se ainda há referências a engineType (apenas como aviso, não erro)
  if (tempSchema.includes('engineType')) {
    console.warn("⚠️  Aviso: engineType ainda presente no schema temporário");
  }
  
  fs.writeFileSync(tempSchemaPath, tempSchema);
  
  console.log("📝 Gerando Prisma Client sem Data Proxy...");
  
  // Gerar Prisma Client sem Data Proxy usando o schema temporário
  execSync(
    `PRISMA_CLIENT_USE_DATAPROXY=false PRISMA_GENERATE_DATAPROXY=false PRISMA_CLIENT_DATAPROXY=false npx prisma generate --schema=${tempSchemaPath}`,
    { stdio: "inherit", cwd: path.join(__dirname, "..") }
  );
  
  console.log("✅ Prisma Client gerado sem Data Proxy");
  
  // Não executar create-test-motoboys.ts aqui - apenas gerar o cliente
  // O script run-test-motoboys.ts vai criar/atualizar os motoboys
} catch (error) {
  console.error("❌ Erro:", error.message);
  process.exit(1);
} finally {
  // Limpar schema temporário
  if (fs.existsSync(tempSchemaPath)) {
    fs.unlinkSync(tempSchemaPath);
  }
}

