import { z } from "zod";

// Validação mais flexível para DATABASE_URL em produção
const databaseUrlSchema = z
  .string()
  .min(1, "DATABASE_URL é obrigatória")
  .refine(
    (url) => {
      // Em produção, aceitar qualquer string não vazia
      // A validação de formato será feita em runtime
      if (process.env.NODE_ENV === "production") {
        return true;
      }
      // Em desenvolvimento, validar formato
      return /^prisma(\+[a-z]+)?:\/\//i.test(url);
    },
    {
      message: "DATABASE_URL deve apontar para o Prisma Data Proxy (ex: prisma+postgres://...).",
    }
  );

const envSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  JWT_SECRET: z
    .string()
    .min(1, "JWT_SECRET é obrigatória")
    .refine(
      (secret) => {
        // Em produção, aceitar qualquer string não vazia (mas avisar se muito curta)
        if (process.env.NODE_ENV === "production") {
          if (secret.length < 16) {
            console.warn("⚠️ JWT_SECRET tem menos de 16 caracteres. Recomenda-se usar uma chave mais segura.");
          }
          return true;
        }
        // Em desenvolvimento, validar tamanho mínimo
        return secret.length >= 16;
      },
      {
        message: "JWT_SECRET deve ter pelo menos 16 caracteres.",
      }
    ),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@motorotas.com"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default("Admin@123"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET ?? "local-development-secret",
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
});

if (!parsed.success) {
  const formatted = parsed.error.format();
  console.error("❌ Variáveis de ambiente inválidas:", formatted);
  console.error("📝 Certifique-se de configurar todas as variáveis de ambiente na Vercel:");
  console.error("   - DATABASE_URL (obrigatória, Prisma Data Proxy)");
  console.error("     Formato esperado: prisma+postgres://YOUR_WORKSPACE.prisma-data.net/?api_key=YOUR_API_KEY");
  console.error("   - JWT_SECRET (obrigatória, mínimo 16 caracteres)");
  console.error("   - DEFAULT_ADMIN_EMAIL (opcional)");
  console.error("   - DEFAULT_ADMIN_PASSWORD (opcional)");
  
  // Em produção, não quebrar o build, apenas logar o erro e usar valores padrão
  if (process.env.NODE_ENV === "production") {
    console.error("⚠️ Continuando em produção, mas a aplicação pode não funcionar corretamente.");
    console.error("⚠️ Usando valores padrão para variáveis não configuradas.");
  } else {
    throw new Error("Falha ao validar variáveis de ambiente");
  }
}

// Sempre exportar valores válidos, mesmo se a validação falhar
export const env = parsed.success ? parsed.data : {
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "fallback-secret-key-min-16-chars" : "local-development-secret"),
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || "admin@motorotas.com",
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123",
};
