import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { bandRouter } from "./routes/band.routes";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/api/bands", bandRouter);

// A missing route is not an unexpected server error.
app.use((request, response) => {
  response.status(404).json({
    error: "NotFound",
    message: `No route matches ${request.method} ${request.originalUrl}`,
  });
});

// Error middleware must be registered last.
app.use(errorHandler);