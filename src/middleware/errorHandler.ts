import { type ErrorRequestHandler } from "express";
import mongoose from "mongoose";

function isRequestBodyError(
  error: unknown,
  type: string,
  status: number,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === type &&
    "status" in error &&
    error.status === status
  );
}

// Keeps unexpected server errors consistent and avoids exposing stack traces.
export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  // Match Express parser errors specifically, not unrelated programming errors.
  if (isRequestBodyError(error, "entity.parse.failed", 400)) {
    response.status(400).json({
      error: "InvalidJson",
      message: "Request body must contain valid JSON",
    });
    return;
  }

  if (isRequestBodyError(error, "entity.too.large", 413)) {
    response.status(413).json({
      error: "PayloadTooLarge",
      message: "Request body exceeds the allowed size",
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      error: "ValidationError",
      message: "Database validation failed",
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({
      error: "InvalidIdentifier",
      message: "A supplied identifier is invalid",
    });
    return;
  }

  // Parser errors can contain the original body, so only log unexpected errors.
  console.error(error);
  response.status(500).json({
    error: "InternalServerError",
    message: "An unexpected server error occurred",
  });
};
