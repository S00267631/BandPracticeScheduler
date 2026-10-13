import { z } from "zod";
import { PRACTICE_STATUSES } from "../constants/practice";

const queryDateSchema = z
  .string()
  .datetime({
    offset: true,
    message: "Date must be an ISO date-time with a time zone",
  })
  .transform((value) => new Date(value));

export const practiceSessionQuerySchema = z
  .object({
    bandId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Band ID must be a valid MongoDB ObjectId")
      .optional(),
    status: z.enum(PRACTICE_STATUSES).optional(),
    from: queryDateSchema.optional(),
    to: queryDateSchema.optional(),
    sortBy: z.enum(["startAt", "durationMinutes"]).default("startAt"),
    order: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict()
  .refine(
    ({ from, to }) => !from || !to || from.getTime() <= to.getTime(),
    { message: "End date must be on or after start date", path: ["to"] },
  );
