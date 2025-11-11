import { z } from "zod";
import { DeliveryStatus } from "@/generated/prisma/enums";

export const deliveryOrderSchema = z.object({
  establishmentId: z.string().cuid(),
  customerName: z.string().min(3),
  customerPhone: z.string().optional(),
  pickupAddress: z.string().min(3),
  deliveryAddress: z.string().min(3),
  notes: z.string().optional(),
  distanceKm: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const deliveryOrderUpdateSchema = deliveryOrderSchema.partial().extend({
  status: z.nativeEnum(DeliveryStatus).optional(),
});

export const assignmentSchema = z.object({
  motoboyId: z.string().cuid(),
});

export const statusEventSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const reviewSchema = z.object({
  orderId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  targetId: z.string().cuid(),
});
