import { type ErrorRequestHandler } from "express";
import mongoose from "mongoose";

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

  console.error(error);

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

  response.status(500).json({
    error: "InternalServerError",
    message: "An unexpected server error occurred",
  });
};