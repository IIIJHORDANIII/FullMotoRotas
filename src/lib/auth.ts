import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

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
  return bcrypt.compare(password, hash);
}

export function signJwt(payload: JwtPayload, expiresIn = "12h"): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error("Token inválido ou expirado");
  }
}
