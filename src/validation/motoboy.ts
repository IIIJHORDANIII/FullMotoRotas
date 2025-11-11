import { z } from "zod";

export const motoboySchema = z.object({
  fullName: z.string().min(3),
  cpf: z.string().min(11).max(14),
  cnhNumber: z.string().min(5),
  cnhCategory: z.string().min(1),
  vehicleType: z.string().min(2),
  phone: z.string().optional(),
  isAvailable: z.boolean().optional(),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
  workSchedule: z.record(z.any()).optional(),
});

export const motoboyUpdateSchema = motoboySchema.partial();
