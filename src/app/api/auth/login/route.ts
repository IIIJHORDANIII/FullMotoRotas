import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBootstrap } from "@/lib/bootstrap";
import { comparePassword, signJwt } from "@/lib/auth";
import { loginSchema } from "@/validation/auth";
import { AppError, unauthorized } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    console.log("[Login] ========================================");
    console.log("[Login] Iniciando processo de login...");
    console.log("[Login] Timestamp:", new Date().toISOString());
    
    // Verificar se Prisma Client está disponível
    try {
      console.log("[Login] Verificando Prisma Client...");
      console.log("[Login] Prisma Client disponível:", !!prisma);
      if (prisma) {
        console.log("[Login] ✓ Prisma Client está disponível");
      } else {
        console.error("[Login] ❌ Prisma Client não está disponível!");
        return errorResponse(
          new AppError(
            "Prisma Client não está disponível. Verifique os logs do servidor.",
            500,
            "PRISMA_CLIENT_UNAVAILABLE"
          )
        );
      }
    } catch (prismaCheckError) {
      console.error("[Login] ❌ Erro ao verificar Prisma Client:", prismaCheckError);
      if (prismaCheckError instanceof Error) {
        console.error("[Login] Mensagem:", prismaCheckError.message);
        console.error("[Login] Stack:", prismaCheckError.stack);
      }
      return errorResponse(
        new AppError(
          `Erro ao inicializar Prisma Client: ${prismaCheckError instanceof Error ? prismaCheckError.message : "Erro desconhecido"}`,
          500,
          "PRISMA_INIT_ERROR"
        )
      );
    }
    
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error("[Login] ❌ DATABASE_URL não está configurada!");
      return errorResponse(
        new AppError(
          "DATABASE_URL não está configurada. Configure a variável de ambiente DATABASE_URL com a URL do Prisma Data Proxy (prisma+postgres://...).",
          500,
          "DATABASE_URL_MISSING"
        )
      );
    }
    
    // Verificar formato da URL
    const dbUrl = process.env.DATABASE_URL;
    const isPrismaProxy = dbUrl.startsWith("prisma://") || dbUrl.startsWith("prisma+");
    
    console.log("[Login] DATABASE_URL configurada:", dbUrl.substring(0, 40) + "...");
    console.log("[Login] É Prisma Data Proxy?", isPrismaProxy);
    
    if (!isPrismaProxy) {
      console.warn("[Login] ⚠️ DATABASE_URL não parece ser uma URL do Prisma Data Proxy");
      console.warn("[Login] Formato esperado: prisma+postgres://... ou prisma://...");
    }
    
    try {
      await ensureBootstrap();
      console.log("[Login] Bootstrap concluído");
    } catch (bootstrapError) {
      console.error("[Login] ❌ Erro no bootstrap:", bootstrapError);
      if (bootstrapError instanceof Error) {
        console.error("[Login] Mensagem do bootstrap:", bootstrapError.message);
        console.error("[Login] Stack do bootstrap:", bootstrapError.stack);
        
        // Se o erro do bootstrap for de conexão com banco, retornar erro específico
        const errorMsg = bootstrapError.message.toLowerCase();
        if (
          errorMsg.includes("database") ||
          errorMsg.includes("connect") ||
          errorMsg.includes("prisma") ||
          errorMsg.includes("dataproxy")
        ) {
          return errorResponse(
            new AppError(
              "Erro ao conectar com o banco de dados. Verifique a configuração da DATABASE_URL.",
              500,
              "DATABASE_CONNECTION_ERROR"
            )
          );
        }
      }
      // Continuar mesmo se o bootstrap falhar (pode ser que o admin já exista)
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[Login] ❌ Erro ao fazer parse do JSON:", parseError);
      return errorResponse(
        new AppError("Corpo da requisição inválido", 400, "INVALID_BODY")
      );
    }

    let email: string;
    let password: string;
    try {
      const parsed = loginSchema.parse(body);
      email = parsed.email;
      password = parsed.password;
      console.log(`[Login] Tentando login para: ${email}`);
    } catch (validationError) {
      console.error("[Login] ❌ Erro de validação:", validationError);
      return errorResponse(
        new AppError("Email ou senha inválidos", 400, "VALIDATION_ERROR")
      );
    }

    let user;
    try {
      console.log("[Login] Tentando buscar usuário no banco...");
      console.log("[Login] Email:", email);
      console.log("[Login] Executando prisma.user.findUnique...");
      
      // Tentar executar a query
      user = await prisma.user.findUnique({ where: { email } });
      
      console.log("[Login] Query executada com sucesso");
      console.log("[Login] Usuário encontrado:", !!user);
    } catch (dbError) {
      console.error("[Login] ========================================");
      console.error("[Login] ❌ ERRO AO CONSULTAR BANCO DE DADOS");
      console.error("[Login] ========================================");
      console.error("[Login] Erro completo:", dbError);
      
      if (dbError instanceof Error) {
        console.error("[Login] Tipo do erro:", dbError.constructor.name);
        console.error("[Login] Mensagem do erro:", dbError.message);
        console.error("[Login] Stack completo:");
        console.error(dbError.stack);
        
        // Verificar se é erro de conexão
        const errorMsgLower = dbError.message.toLowerCase();
        if (
          errorMsgLower.includes("connect") ||
          errorMsgLower.includes("econnrefused") ||
          errorMsgLower.includes("enotfound") ||
          errorMsgLower.includes("timeout") ||
          errorMsgLower.includes("authentication failed") ||
          errorMsgLower.includes("postgres") ||
          errorMsgLower.includes("prisma") ||
          errorMsgLower.includes("dataproxy") ||
          errorMsgLower.includes("api key") ||
          errorMsgLower.includes("invalid url") ||
          errorMsgLower.includes("network") ||
          errorMsgLower.includes("fetch")
        ) {
          console.error("[Login] Tipo detectado: Erro de conexão com banco de dados");
          return errorResponse(
            new AppError(
              "Erro ao conectar com o banco de dados. Verifique a configuração da DATABASE_URL e se a API key do Prisma Data Proxy está correta.",
              500,
              "DATABASE_CONNECTION_ERROR"
            )
          );
        }
        
        // Outros erros do Prisma
        console.error("[Login] Tipo detectado: Erro desconhecido do Prisma");
        return errorResponse(
          new AppError(
            `Erro ao acessar o banco de dados: ${dbError.message}`,
            500,
            "DATABASE_ERROR"
          )
        );
      }
      
      console.error("[Login] ========================================");
      throw dbError;
    }

    if (!user) {
      console.log(`[Login] Usuário não encontrado: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    if (!user.isActive) {
      console.log(`[Login] Usuário inativo: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    let valid = false;
    try {
      console.log("[Login] Comparando senha...");
      valid = await comparePassword(password, user.password);
      console.log("[Login] Comparação de senha concluída:", valid);
    } catch (compareError) {
      console.error("[Login] ❌ Erro ao comparar senha:", compareError);
      if (compareError instanceof Error) {
        console.error("[Login] Mensagem:", compareError.message);
        console.error("[Login] Stack:", compareError.stack);
      }
      throw unauthorized("Credenciais inválidas");
    }

    if (!valid) {
      console.log(`[Login] Senha inválida para usuário: ${email}`);
      throw unauthorized("Credenciais inválidas");
    }

    console.log(`[Login] ✅ Login bem-sucedido: ${email}`);

    let token: string;
    try {
      console.log("[Login] Gerando token JWT...");
      token = signJwt({ sub: user.id, email: user.email, role: user.role });
      console.log("[Login] Token gerado com sucesso");
    } catch (jwtError) {
      console.error("[Login] ❌ Erro ao gerar token JWT:", jwtError);
      if (jwtError instanceof Error) {
        console.error("[Login] Mensagem:", jwtError.message);
        console.error("[Login] Stack:", jwtError.stack);
      }
      throw new AppError("Erro ao gerar token de autenticação", 500, "JWT_ERROR");
    }

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
