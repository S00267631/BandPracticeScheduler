import { type RequestHandler } from "express";
import { z } from "zod";

// Validates request JSON before a controller uses it.
export function validateBody(schema: z.ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        error: "ValidationError",
        message: "Request body is invalid",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    // Replace the original body with the validated and trimmed data.
    request.body = result.data;
    next();
  };
}