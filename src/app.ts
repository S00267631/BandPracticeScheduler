import express from "express";

export const app = express();

// Allows Express to read JSON requests.
app.use(express.json());

// Temporary route proving that the application is running.
app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});