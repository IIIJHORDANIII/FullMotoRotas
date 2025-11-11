import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter pelo menos 16 caracteres."),
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
  console.error("Variáveis de ambiente inválidas:", formatted);
  throw new Error("Falha ao validar variáveis de ambiente");
}

export const env = parsed.data;
