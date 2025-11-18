import bcryptjs from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "@/lib/env";

// Compatibilidade com diferentes formas de importação do bcryptjs
const bcrypt = bcryptjs.default || bcryptjs;
const SALT_ROUNDS = 10;

export type JwtPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "ESTABLISHMENT" | "MOTOBOY";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!password || !hash) {
      console.error("[Auth] comparePassword: password ou hash vazio");
      return false;
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("[Auth] Erro ao comparar senha:", error);
    throw error;
  }
}

export function signJwt(payload: JwtPayload, expiresIn: string | number = "12h"): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as SignOptions);
}

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error("Token inválido ou expirado");
  }
}
