import { type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Check real query parsing and generated MongoDB filters without using Atlas.
const database = vi.hoisted(() => ({ find: vi.fn(), sort: vi.fn() }));

vi.mock("../models/Band", () => ({ BandModel: {} }));
vi.mock("../models/PracticeSession", () => ({
  PracticeSessionModel: { find: database.find },
}));

import { app } from "../app";

const bandId = "507f1f77bcf86cd799439011";
const from = "2026-11-01T00:00:00Z";
const to = "2026-11-30T23:59:59Z";
const session = {
  _id: "507f1f77bcf86cd799439012",
  bandId,
  startAt: "2026-11-05T18:00:00Z",
  durationMinutes: 90,
  status: "scheduled",
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not receive a TCP port");
  }

  baseUrl = `http://127.0.0.1:${address.port}/api/practice-sessions`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

beforeEach(() => {
  vi.resetAllMocks();
  database.find.mockReturnValue({ sort: database.sort });
  database.sort.mockResolvedValue([session]);
});

function getSessions(parameters: Record<string, string> = {}) {
  return fetch(`${baseUrl}?${new URLSearchParams(parameters)}`);
}

describe("Practice Session filters", () => {
  it("uses chronological sorting when no parameters are supplied", async () => {
    const response = await getSessions();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([session]);
    expect(database.find).toHaveBeenCalledWith({});
    expect(database.sort).toHaveBeenCalledWith({ startAt: 1, _id: 1 });
  });

  it("filters by band ID", async () => {
    const response = await getSessions({ bandId });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({ bandId });
  });

  it.each(["scheduled", "completed", "cancelled"])(
    "filters by status %s",
    async (status) => {
      const response = await getSessions({ status });

      expect(response.status).toBe(200);
      expect(database.find).toHaveBeenCalledWith({ status });
    },
  );

  it("supports an inclusive lower date boundary", async () => {
    const response = await getSessions({ from });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({ startAt: { $gte: new Date(from) } });
  });

  it("supports an inclusive upper date boundary", async () => {
    const response = await getSessions({ to });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({ startAt: { $lte: new Date(to) } });
  });

  it("combines band, status and date filters", async () => {
    const response = await getSessions({ bandId, status: "scheduled", from, to });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({
      bandId,
      status: "scheduled",
      startAt: { $gte: new Date(from), $lte: new Date(to) },
    });
  });

  it("accepts identical date boundaries", async () => {
    const response = await getSessions({ from, to: from });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({
      startAt: { $gte: new Date(from), $lte: new Date(from) },
    });
  });

  it("normalizes encoded timezone offsets to UTC dates", async () => {
    const response = await getSessions({ from: "2026-11-01T09:00:00+02:00" });

    expect(response.status).toBe(200);
    expect(database.find).toHaveBeenCalledWith({
      startAt: { $gte: new Date("2026-11-01T07:00:00Z") },
    });
  });

  it("returns an empty array when no sessions match", async () => {
    database.sort.mockResolvedValue([]);
    const response = await getSessions({ bandId });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("Practice Session sorting", () => {
  it.each([
    { sortBy: "startAt", order: "asc", direction: 1 },
    { sortBy: "startAt", order: "desc", direction: -1 },
    { sortBy: "durationMinutes", order: "asc", direction: 1 },
    { sortBy: "durationMinutes", order: "desc", direction: -1 },
  ])("sorts by $sortBy in $order order", async ({ sortBy, order, direction }) => {
    const response = await getSessions({ sortBy, order });

    expect(response.status).toBe(200);
    expect(database.sort).toHaveBeenCalledWith({ [sortBy]: direction, _id: 1 });
  });

  it("uses ascending order when only a sort field is supplied", async () => {
    const response = await getSessions({ sortBy: "durationMinutes" });

    expect(response.status).toBe(200);
    expect(database.sort).toHaveBeenCalledWith({ durationMinutes: 1, _id: 1 });
  });
});

describe("Invalid Practice Session queries", () => {
  it.each([
    { bandId: "bad-id" },
    { bandId: "" },
    { status: "unknown" },
    { status: "" },
    { from: "not-a-date" },
    { to: "not-a-date" },
    { from: "2026-11-01" },
    { from: "2026-11-01T09:00:00" },
    { from: "2026-02-30T09:00:00Z" },
    { from: to, to: from },
    { sortBy: "unknownField" },
    { order: "sideways" },
    { unexpected: "value" },
    { "bandId[$ne]": "value" },
  ])("rejects invalid query %j before accessing the database", async (parameters) => {
    const response = await getSessions(parameters);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "ValidationError",
      message: "Query parameters are invalid",
    });
    expect(database.find).not.toHaveBeenCalled();
  });

  it("returns a field-specific error for a reversed date range", async () => {
    const response = await getSessions({ from: to, to: from });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      details: [{ field: "to", message: "End date must be on or after start date" }],
    });
  });

  it("rejects repeated values rather than selecting one silently", async () => {
    const response = await fetch(`${baseUrl}?status=scheduled&status=completed`);

    expect(response.status).toBe(400);
    expect(database.find).not.toHaveBeenCalled();
  });
});
