import type { Role } from "@/generated/prisma/enums";

export type AllowedRoles = Role | Role[];

export function roleMatches(role: Role, allowed?: AllowedRoles): boolean {
  if (!allowed) return true;
  if (Array.isArray(allowed)) {
    return allowed.includes(role);
  }
  return role === allowed;
}
