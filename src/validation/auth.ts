import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
  profile: z.object({}).passthrough().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
