import { z } from "zod";

export const createBandSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Band name must be at least 2 characters")
      .max(80, "Band name cannot exceed 80 characters"),
    genre: z
      .string()
      .trim()
      .min(2, "Genre must be at least 2 characters")
      .max(50, "Genre cannot exceed 50 characters")
      .optional(),
    timeZone: z
      .string()
      .trim()
      .min(1, "Time zone is required")
      .max(64, "Time zone cannot exceed 64 characters"),
    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  })
  .strict();

export const updateBandSchema = createBandSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be supplied for an update",
);

export type CreateBandInput = z.infer<typeof createBandSchema>;
export type UpdateBandInput = z.infer<typeof updateBandSchema>;