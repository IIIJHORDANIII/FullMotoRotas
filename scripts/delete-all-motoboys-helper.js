// Script helper para executar o script de deletar motoboys
// Agora usa PostgreSQL direto, não precisa gerar Prisma Client
const { execSync } = require("child_process");
const path = require("path");

try {
  console.log("🚀 Executando script de deletar motoboys...\n");
  
  // Executar o script TypeScript diretamente (usa PostgreSQL direto)
  execSync(
    `npx tsx scripts/delete-all-motoboys.ts`,
    { 
      stdio: "inherit", 
      cwd: path.join(__dirname, "..")
    }
  );
} catch (error) {
  console.error("❌ Erro:", error.message);
  process.exit(1);
}

