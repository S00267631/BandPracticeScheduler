import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real Express routes and Zod validation without using Atlas.
const database = vi.hoisted(() => ({
  bandExists: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));

vi.mock("../models/Band", () => ({
  BandModel: { exists: database.bandExists },
}));

vi.mock("../models/PracticeSession", () => ({
  PracticeSessionModel: {
    create: database.create,
    find: database.find,
    findById: database.findById,
    findByIdAndUpdate: database.findByIdAndUpdate,
    findByIdAndDelete: database.findByIdAndDelete,
  },
}));

import { app } from "../app";

const bandId = "507f1f77bcf86cd799439011";
const sessionId = "507f1f77bcf86cd799439012";
const validBody = {
  bandId,
  startAt: "2026-11-01T18:00:00Z",
  durationMinutes: 90,
  format: "in-person",
  locationOrLink: "Rehearsal room 2",
};
const savedSession = { _id: sessionId, ...validBody, status: "scheduled" };

const basePath = "/api/practice-sessions";

beforeEach(() => {
  vi.resetAllMocks();
  database.bandExists.mockResolvedValue({ _id: bandId });
  database.create.mockResolvedValue(savedSession);
  database.find.mockReturnValue({ sort: database.sort });
  database.sort.mockResolvedValue([savedSession]);
  database.findById.mockResolvedValue(savedSession);
  database.findByIdAndUpdate.mockResolvedValue({
    ...savedSession,
    durationMinutes: 120,
  });
  database.findByIdAndDelete.mockResolvedValue(savedSession);
});

function writeRequest(method: "POST" | "PUT", body: object, path = "") {
  const client = request(app);
  const pendingRequest = method === "POST"
    ? client.post(`${basePath}${path}`)
    : client.put(`${basePath}${path}`);
  return pendingRequest.send(body);
}

describe("Practice Session CRUD", () => {
  it("creates a session for an existing band", async () => {
    const response = await writeRequest("POST", validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(savedSession);
    expect(database.bandExists).toHaveBeenCalledWith({ _id: bandId });
    expect(database.create).toHaveBeenCalledWith(validBody);
  });

  it("rejects a session when its band does not exist", async () => {
    database.bandExists.mockResolvedValue(null);
    const response = await writeRequest("POST", validBody);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "NotFound",
      message: "Band not found",
    });
    expect(database.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid duration before querying the database", async () => {
    const response = await writeRequest("POST", {
      ...validBody,
      durationMinutes: 10,
    });

    expect(response.status).toBe(400);
    expect(database.bandExists).not.toHaveBeenCalled();
    expect(database.create).not.toHaveBeenCalled();
  });

  it("rejects a malformed band ID", async () => {
    const response = await writeRequest("POST", { ...validBody, bandId: "bad" });

    expect(response.status).toBe(400);
    expect(database.bandExists).not.toHaveBeenCalled();
  });

  it("lists sessions in chronological order", async () => {
    const response = await request(app).get(basePath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([savedSession]);
    expect(database.sort).toHaveBeenCalledWith({ startAt: 1, _id: 1 });
  });

  it("returns an empty array when there are no sessions", async () => {
    database.sort.mockResolvedValue([]);
    const response = await request(app).get(basePath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("retrieves an individual session", async () => {
    const response = await request(app).get(`${basePath}/${sessionId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(savedSession);
    expect(database.findById).toHaveBeenCalledWith(sessionId);
  });

  it("returns 404 for a missing individual session", async () => {
    database.findById.mockResolvedValue(null);
    const response = await request(app).get(`${basePath}/${sessionId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "NotFound",
      message: "Practice session not found",
    });
  });

  it.each(["GET", "PUT", "DELETE"])(
    "rejects a malformed session ID for %s",
    async (method) => {
      const response = method === "PUT"
        ? await writeRequest(method, { durationMinutes: 120 }, "/bad-id")
        : method === "GET"
          ? await request(app).get(`${basePath}/bad-id`)
          : await request(app).delete(`${basePath}/bad-id`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "InvalidIdentifier",
        message: "Practice session ID must be a valid MongoDB ObjectId",
      });
      expect(database.findById).not.toHaveBeenCalled();
      expect(database.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(database.findByIdAndDelete).not.toHaveBeenCalled();
    },
  );

  it("updates supplied fields and returns the updated session", async () => {
    const response = await writeRequest(
      "PUT",
      { durationMinutes: 120 },
      `/${sessionId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...savedSession, durationMinutes: 120 });
    expect(database.findByIdAndUpdate).toHaveBeenCalledWith(
      sessionId,
      { $set: { durationMinutes: 120 } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("returns 404 when updating a missing session", async () => {
    database.findByIdAndUpdate.mockResolvedValue(null);
    const response = await writeRequest(
      "PUT",
      { durationMinutes: 120 },
      `/${sessionId}`,
    );

    expect(response.status).toBe(404);
  });

  it.each([{}, { durationMinutes: 10 }, { bandId }])(
    "rejects an invalid or disallowed update: %j",
    async (body) => {
      const response = await writeRequest("PUT", body, `/${sessionId}`);

      expect(response.status).toBe(400);
      expect(database.findByIdAndUpdate).not.toHaveBeenCalled();
    },
  );

  it("deletes a session with an empty 204 response", async () => {
    const response = await request(app).delete(`${basePath}/${sessionId}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(database.findByIdAndDelete).toHaveBeenCalledWith(sessionId);
  });

  it("returns 404 when deleting a missing session", async () => {
    database.findByIdAndDelete.mockResolvedValue(null);
    const response = await request(app).delete(`${basePath}/${sessionId}`);

    expect(response.status).toBe(404);
  });

  it("passes database errors to the existing error handler", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    database.sort.mockRejectedValue(new Error("Database unavailable"));

    try {
      const response = await request(app).get(basePath);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "InternalServerError",
        message: "An unexpected server error occurred",
      });
    } finally {
      log.mockRestore();
    }
  });
});
