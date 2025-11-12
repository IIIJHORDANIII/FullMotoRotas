import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBootstrap } from "@/lib/bootstrap";
import { comparePassword, signJwt } from "@/lib/auth";
import { loginSchema } from "@/validation/auth";
import { AppError, unauthorized } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    console.log("[Login] Iniciando processo de login...");
    
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error("[Login] ❌ DATABASE_URL não está configurada!");
      throw new Error("DATABASE_URL não está configurada");
    }
    
    console.log("[Login] DATABASE_URL configurada:", process.env.DATABASE_URL.substring(0, 30) + "...");
    
    await ensureBootstrap();
    console.log("[Login] Bootstrap concluído");

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    console.log(`[Login] Tentando login para: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`[Login] Usuário não encontrado: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    if (!user.isActive) {
      console.log(`[Login] Usuário inativo: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      console.log(`[Login] Senha inválida para usuário: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    console.log(`[Login] ✅ Login bem-sucedido: ${email}`);

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });

    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    
    // Log detalhado do erro para debug (sempre logar para debug na Vercel)
    console.error("[Login] ❌ Erro no login:", error);
    if (error instanceof Error) {
      console.error("[Login] Mensagem:", error.message);
      console.error("[Login] Stack:", error.stack);
      
      // Verificar se é erro de Data Proxy
      if (error.message.includes("prisma://") || error.message.includes("prisma+") || error.message.includes("must start with the protocol")) {
        console.error("[Login] ⚠️ ERRO DE DATA PROXY DETECTADO!");
        console.error("[Login] O Prisma Client foi gerado com Data Proxy habilitado.");
        console.error("[Login] Verifique se o script force-prisma-generate.js foi executado durante o build.");
        return errorResponse(
          new AppError(
            "Erro de configuração do Prisma: Data Proxy detectado. Verifique os logs de build.",
            500,
            "PRISMA_DATA_PROXY_ERROR"
          )
        );
      }
      
      // Verificar se é erro de conexão
      if (error.message.includes("DATABASE_URL") || error.message.includes("connection")) {
        console.error("[Login] ⚠️ ERRO DE CONEXÃO COM BANCO DE DADOS!");
        return errorResponse(
          new AppError(
            "Erro ao conectar com o banco de dados. Verifique a configuração da DATABASE_URL.",
            500,
            "DATABASE_CONNECTION_ERROR"
          )
        );
      }
    }
    
    return errorResponse(
      new AppError(
        error instanceof Error ? error.message : "Falha ao autenticar",
        500
      )
    );
  }
}
