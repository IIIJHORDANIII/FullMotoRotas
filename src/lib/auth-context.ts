import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized, forbidden } from "@/lib/errors";
import { roleMatches, type AllowedRoles } from "@/lib/rbac";
import { Role } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma";

export type AuthContext = {
  user: User;
};

function extractToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  const cookieToken = request.cookies.get("motorotas-token")?.value;
  return cookieToken ?? null;
}

export async function requireAuth(request: NextRequest, allowed?: AllowedRoles): Promise<AuthContext> {
  const token = extractToken(request);

  if (!token) {
    throw unauthorized("Token de autenticação não encontrado");
  }

  let payload: { sub: string; role: Role };

  try {
    payload = verifyJwt(token);
  } catch {
    throw unauthorized("Token inválido ou expirado");
  }

  if (!roleMatches(payload.role, allowed)) {
    throw forbidden("Usuário não possui permissão para acessar este recurso");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user || !user.isActive) {
    throw unauthorized("Usuário não encontrado ou inativo");
  }

  return { user };
}

export function optionalAuth(request: NextRequest): AuthContext | null {
  try {
    const token = extractToken(request);
    if (!token) return null;
    const payload = verifyJwt(token);
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: "",
      } as User,
    };
  } catch {
    return null;
  }
}
