import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureBootstrap } from "@/lib/bootstrap";
import { comparePassword, signJwt } from "@/lib/auth";
import { loginSchema } from "@/validation/auth";
import { AppError, unauthorized } from "@/lib/errors";
import { errorResponse, jsonResponse } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    await ensureBootstrap();

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

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
    
    // Log detalhado do erro para debug
    console.error("Erro no login:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    }
    
    return errorResponse(
      new AppError(
        error instanceof Error ? error.message : "Falha ao autenticar",
        500
      )
    );
  }
}
