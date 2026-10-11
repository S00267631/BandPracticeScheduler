import { z } from "zod";
import {
  PRACTICE_FORMATS,
  PRACTICE_STATUSES,
} from "../constants/practice";

// Define a schema for validating MongoDB ObjectId strings
const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Band ID must be a valid MongoDB ObjectId");

export const createPracticeSessionSchema = z
  .object({
    bandId: mongoIdSchema,
    startAt: z
      .string()
      .datetime({ offset: true, message: "Start time must be an ISO date-time with a time zone" }),
    durationMinutes: z
      .number()
      .int("Duration must be a whole number")
      .min(30, "Practice must last at least 30 minutes")
      .max(360, "Practice cannot last more than 360 minutes"),
    format: z.enum(PRACTICE_FORMATS),
    locationOrLink: z
      .string()
      .trim()
      .min(2, "Location or link must be at least 2 characters")
      .max(200, "Location or link cannot exceed 200 characters"),
    status: z.enum(PRACTICE_STATUSES).optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .optional(),
  })
  .strict();

export const updatePracticeSessionSchema = createPracticeSessionSchema
  .omit({ bandId: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be supplied for an update",
  );

export type CreatePracticeSessionInput = z.infer<
  typeof createPracticeSessionSchema
>;
export type UpdatePracticeSessionInput = z.infer<
  typeof updatePracticeSessionSchema
>;