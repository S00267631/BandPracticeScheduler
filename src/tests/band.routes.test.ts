import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Supertest runs real Express routes; mocks keep database calls controlled.
const database = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  exists: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
  countSessions: vi.fn(),
}));

vi.mock("../models/Band", () => ({
  BandModel: {
    create: database.create,
    find: database.find,
    exists: database.exists,
    findById: database.findById,
    findByIdAndUpdate: database.findByIdAndUpdate,
    findByIdAndDelete: database.findByIdAndDelete,
  },
}));
vi.mock("../models/PracticeSession", () => ({
  PracticeSessionModel: { countDocuments: database.countSessions },
}));

import { app } from "../app";

const bandId = "507f1f77bcf86cd799439011";
const validBody = { name: "Practice Band", timeZone: "Europe/Dublin" };
const savedBand = { _id: bandId, ...validBody };
const basePath = "/api/bands";
const bandPath = `${basePath}/${bandId}`;

beforeEach(() => {
  vi.resetAllMocks();
  database.create.mockResolvedValue(savedBand);
  database.find.mockReturnValue({ sort: database.sort });
  database.sort.mockResolvedValue([savedBand]);
  database.exists.mockResolvedValue({ _id: bandId });
  database.findById.mockResolvedValue(savedBand);
  database.findByIdAndUpdate.mockResolvedValue({ ...savedBand, name: "Updated Band" });
  database.findByIdAndDelete.mockResolvedValue(savedBand);
  database.countSessions.mockResolvedValue(0);
});

describe("Band CRUD with Supertest", () => {
  it("creates a band and returns JSON with status 201", async () => {
    const response = await request(app)
      .post(basePath)
      .send(validBody)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual(savedBand);
    expect(database.create).toHaveBeenCalledWith(validBody);
  });

  it("trims band fields before saving", async () => {
    await request(app)
      .post(basePath)
      .send({ name: "  Practice Band  ", timeZone: " Europe/Dublin " })
      .expect(201);

    expect(database.create).toHaveBeenCalledWith(validBody);
  });

  it.each([
    { ...validBody, name: "a" },
    { name: "Missing Time Zone" },
    { ...validBody, unknownField: true },
  ])("rejects invalid creation data: %j", async (body) => {
    const response = await request(app).post(basePath).send(body).expect(400);

    expect(response.body.error).toBe("ValidationError");
    expect(database.create).not.toHaveBeenCalled();
  });

  it("lists bands with alphabetical sorting", async () => {
    const response = await request(app).get(basePath).expect(200);

    expect(response.body).toEqual([savedBand]);
    expect(database.sort).toHaveBeenCalledWith({ name: 1 });
  });

  it("returns an empty list when no bands exist", async () => {
    database.sort.mockResolvedValue([]);
    const response = await request(app).get(basePath).expect(200);

    expect(response.body).toEqual([]);
  });

  it("gets an individual band", async () => {
    const response = await request(app).get(bandPath).expect(200);

    expect(response.body).toEqual(savedBand);
    expect(database.findById).toHaveBeenCalledWith(bandId);
  });

  it("returns 404 for a missing band", async () => {
    database.findById.mockResolvedValue(null);
    const response = await request(app).get(bandPath).expect(404);

    expect(response.body).toEqual({ error: "NotFound", message: "Band not found" });
  });

  it.each(["GET", "PUT", "DELETE"])("rejects invalid IDs on %s", async (method) => {
    const client = request(app);
    const invalidPath = `${basePath}/bad-id`;
    const response = method === "GET"
      ? await client.get(invalidPath).expect(400)
      : method === "PUT"
        ? await client.put(invalidPath).send({ name: "Updated Band" }).expect(400)
        : await client.delete(invalidPath).expect(400);

    expect(response.body.error).toBe("InvalidIdentifier");
    expect(database.findById).not.toHaveBeenCalled();
    expect(database.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(database.exists).not.toHaveBeenCalled();
    expect(database.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("updates a band and returns the updated data", async () => {
    const response = await request(app)
      .put(bandPath)
      .send({ name: "Updated Band" })
      .expect(200);

    expect(response.body).toEqual({ ...savedBand, name: "Updated Band" });
    expect(database.findByIdAndUpdate).toHaveBeenCalledWith(
      bandId,
      { name: "Updated Band" },
      { returnDocument: "after", runValidators: true },
    );
  });

  it("returns 404 when updating a missing band", async () => {
    database.findByIdAndUpdate.mockResolvedValue(null);
    const response = await request(app)
      .put(bandPath)
      .send({ name: "Updated Band" })
      .expect(404);

    expect(response.body.message).toBe("Band not found");
  });

  it.each([{}, { name: " " }, { unknownField: true }])(
    "rejects invalid update data: %j",
    async (body) => {
      await request(app).put(bandPath).send(body).expect(400);
      expect(database.findByIdAndUpdate).not.toHaveBeenCalled();
    },
  );

  it("deletes a band with no sessions and returns an empty 204", async () => {
    const response = await request(app).delete(bandPath).expect(204);

    expect(response.text).toBe("");
    expect(database.countSessions).toHaveBeenCalledWith({ bandId });
    expect(database.findByIdAndDelete).toHaveBeenCalledWith(bandId);
  });

  it("returns 404 without querying sessions when the band is missing", async () => {
    database.exists.mockResolvedValue(null);
    await request(app).delete(bandPath).expect(404);

    expect(database.countSessions).not.toHaveBeenCalled();
    expect(database.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("returns 409 without deleting a band that has sessions", async () => {
    database.countSessions.mockResolvedValue(1);
    const response = await request(app).delete(bandPath).expect(409);

    expect(response.body.error).toBe("Conflict");
    expect(database.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("returns 404 if the band disappears before deletion completes", async () => {
    database.findByIdAndDelete.mockResolvedValue(null);
    await request(app).delete(bandPath).expect(404);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await request(app)
      .post(basePath)
      .set("Content-Type", "application/json")
      .send('{"name":"Invalid JSON",}')
      .expect(400);

    expect(response.body.error).toBe("InvalidJson");
    expect(database.create).not.toHaveBeenCalled();
  });

  it("returns a safe 500 response when the database fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    database.create.mockRejectedValue(new Error("Private connection details"));

    try {
      const response = await request(app).post(basePath).send(validBody).expect(500);
      expect(response.body).toEqual({
        error: "InternalServerError",
        message: "An unexpected server error occurred",
      });
    } finally {
      log.mockRestore();
    }
  });
});
