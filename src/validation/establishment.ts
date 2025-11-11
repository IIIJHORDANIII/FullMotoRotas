import { z } from "zod";
import { EstablishmentPlan } from "@/generated/prisma/enums";

export const establishmentSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().min(14).max(18),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string().length(2),
  postalCode: z.string(),
  deliveryRadiusKm: z.number().nonnegative().default(5),
  baseDeliveryFee: z.number().nonnegative().default(0),
  additionalPerKm: z.number().nonnegative().default(0),
  estimatedDeliveryTimeMinutes: z.number().int().positive().default(30),
  plan: z.nativeEnum(EstablishmentPlan).default(EstablishmentPlan.BASIC),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export const establishmentUpdateSchema = establishmentSchema.partial();
