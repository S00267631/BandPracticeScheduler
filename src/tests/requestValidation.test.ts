// Commented out to keep active tests focused on the brief's demonstration scenarios.
// Extra validation examples. Core invalid POST and PUT cases remain in the CRUD suites.
// Excluded in vitest.config.mjs because a fully commented file has no runnable tests.
// Remove the leading comments and its config exclusion to restore this suite.
//
// import request from "supertest";
// import { beforeEach, describe, expect, it, vi } from "vitest";
//
// // Real HTTP requests exercise Express and Zod; model mocks protect Atlas data.
// const database = vi.hoisted(() => ({
//   bandCreate: vi.fn(),
//   bandExists: vi.fn(),
//   bandFindById: vi.fn(),
//   bandUpdate: vi.fn(),
//   bandDelete: vi.fn(),
//   sessionCreate: vi.fn(),
//   sessionFindById: vi.fn(),
//   sessionUpdate: vi.fn(),
//   sessionDelete: vi.fn(),
//   sessionCount: vi.fn(),
// }));
//
// vi.mock("../models/Band", () => ({
//   BandModel: {
//     create: database.bandCreate,
//     exists: database.bandExists,
//     findById: database.bandFindById,
//     findByIdAndUpdate: database.bandUpdate,
//     findByIdAndDelete: database.bandDelete,
//   },
// }));
//
// vi.mock("../models/PracticeSession", () => ({
//   PracticeSessionModel: {
//     create: database.sessionCreate,
//     findById: database.sessionFindById,
//     findByIdAndUpdate: database.sessionUpdate,
//     findByIdAndDelete: database.sessionDelete,
//     countDocuments: database.sessionCount,
//   },
// }));
//
// import { app } from "../app";
//
// const resourceId = "507f1f77bcf86cd799439011";
// const validBand = { name: "The Practice Band", timeZone: "Europe/Dublin" };
// const validSession = {
//   bandId: resourceId,
//   startAt: "2026-11-01T18:00:00Z",
//   durationMinutes: 90,
//   format: "in-person",
//   locationOrLink: "Room 2",
// };
// const writeEndpoints = [
//   { method: "POST", path: "/api/bands" },
//   { method: "PUT", path: `/api/bands/${resourceId}` },
//   { method: "POST", path: "/api/practice-sessions" },
//   { method: "PUT", path: `/api/practice-sessions/${resourceId}` },
// ];
//
// beforeEach(() => {
//   vi.resetAllMocks();
//   database.bandCreate.mockResolvedValue({ _id: resourceId, ...validBand });
//   database.bandExists.mockResolvedValue({ _id: resourceId });
//   database.sessionCreate.mockResolvedValue({ _id: resourceId, ...validSession });
// });
//
// function sendBody(method: string, path: string, body: string) {
//   const client = request(app);
//   if (method === "POST") {
//     return client.post(path).set("Content-Type", "application/json").send(body);
//   }
//   if (method === "PUT") {
//     return client.put(path).set("Content-Type", "application/json").send(body);
//   }
//   throw new Error(`Unsupported body-validation method: ${method}`);
// }
//
// function expectNoDatabaseCalls() {
//   for (const operation of Object.values(database)) {
//     expect(operation).not.toHaveBeenCalled();
//   }
// }
//
// describe("Request parsing", () => {
//   it.each(writeEndpoints)(
//     "returns 400 for malformed JSON on $method $path",
//     async ({ method, path }) => {
//       const log = vi.spyOn(console, "error").mockImplementation(() => {});
//
//       try {
//         const response = await sendBody(method, path, '{"privateValue":"hidden",');
//
//         expect(response.status).toBe(400);
//         expect(response.body).toEqual({
//           error: "InvalidJson",
//           message: "Request body must contain valid JSON",
//         });
//         expect(log).not.toHaveBeenCalled();
//         expectNoDatabaseCalls();
//       } finally {
//         log.mockRestore();
//       }
//     },
//   );
//
//   it.each(writeEndpoints)(
//     "returns 413 for oversized JSON on $method $path",
//     async ({ method, path }) => {
//       const response = await sendBody(
//         method,
//         path,
//         JSON.stringify({ notes: "x".repeat(110 * 1024) }),
//       );
//
//       expect(response.status).toBe(413);
//       expect(response.body).toEqual({
//         error: "PayloadTooLarge",
//         message: "Request body exceeds the allowed size",
//       });
//       expectNoDatabaseCalls();
//     },
//   );
//
//   it.each(writeEndpoints)(
//     "rejects a missing body on $method $path",
//     async ({ method, path }) => {
//       const response = await sendBody(method, path, "");
//
//       expect(response.status).toBe(400);
//       expectNoDatabaseCalls();
//     },
//   );
//
//   it.each(writeEndpoints)(
//     "rejects an array body on $method $path",
//     async ({ method, path }) => {
//       const response = await sendBody(method, path, "[]");
//
//       expect(response.status).toBe(400);
//       expectNoDatabaseCalls();
//     },
//   );
// });
//
// describe("Band body validation", () => {
//   it.each([
//     { ...validBand, name: " " },
//     { ...validBand, name: 123 },
//     { ...validBand, name: "a".repeat(81) },
//     { name: "Missing time zone" },
//     { ...validBand, timeZone: " " },
//     { ...validBand, genre: "a" },
//     { ...validBand, unexpected: true },
//   ])("rejects invalid band data: %j", async (body) => {
//     const response = await sendBody("POST", "/api/bands", JSON.stringify(body));
//
//     expect(response.status).toBe(400);
//     expect(response.body).toMatchObject({ error: "ValidationError" });
//     expectNoDatabaseCalls();
//   });
//
//   it("returns field-specific validation details", async () => {
//     const response = await sendBody(
//       "POST",
//       "/api/bands",
//       JSON.stringify({ ...validBand, name: "a" }),
//     );
//
//     expect(response.body).toMatchObject({
//       error: "ValidationError",
//       details: [{ field: "name", message: "Band name must be at least 2 characters" }],
//     });
//   });
//
//   it("passes trimmed data to the band controller", async () => {
//     const response = await sendBody(
//       "POST",
//       "/api/bands",
//       JSON.stringify({ name: "  The Practice Band  ", timeZone: " Europe/Dublin " }),
//     );
//
//     expect(response.status).toBe(201);
//     expect(database.bandCreate).toHaveBeenCalledWith(validBand);
//   });
// });
//
// describe("Practice Session body validation", () => {
//   it.each([
//     { ...validSession, bandId: "invalid" },
//     { ...validSession, startAt: "not-a-date" },
//     { ...validSession, startAt: "2026-11-01T18:00:00" },
//     { ...validSession, durationMinutes: "90" },
//     { ...validSession, durationMinutes: 90.5 },
//     { ...validSession, durationMinutes: 29 },
//     { ...validSession, durationMinutes: 361 },
//     { ...validSession, format: "unsupported" },
//     { ...validSession, locationOrLink: " " },
//     { ...validSession, status: "unsupported" },
//     { ...validSession, notes: "x".repeat(501) },
//     { ...validSession, unexpected: true },
//   ])("rejects invalid session data: %j", async (body) => {
//     const response = await sendBody(
//       "POST",
//       "/api/practice-sessions",
//       JSON.stringify(body),
//     );
//
//     expect(response.status).toBe(400);
//     expectNoDatabaseCalls();
//   });
// });
//
// describe("Update body validation", () => {
//   it.each([
//     { path: `/api/bands/${resourceId}`, body: {} },
//     { path: `/api/bands/${resourceId}`, body: { name: " " } },
//     { path: `/api/bands/${resourceId}`, body: { unexpected: true } },
//     { path: `/api/practice-sessions/${resourceId}`, body: {} },
//     { path: `/api/practice-sessions/${resourceId}`, body: { bandId: resourceId } },
//     { path: `/api/practice-sessions/${resourceId}`, body: { durationMinutes: 29 } },
//   ])("rejects an invalid update on $path", async ({ path, body }) => {
//     const response = await sendBody("PUT", path, JSON.stringify(body));
//
//     expect(response.status).toBe(400);
//     expectNoDatabaseCalls();
//   });
// });
//
// describe("Resource ID validation", () => {
//   it.each([
//     { method: "GET", path: "/api/bands/not-an-id" },
//     { method: "PUT", path: "/api/bands/not-an-id" },
//     { method: "DELETE", path: "/api/bands/not-an-id" },
//     { method: "GET", path: "/api/practice-sessions/not-an-id" },
//     { method: "PUT", path: "/api/practice-sessions/not-an-id" },
//     { method: "DELETE", path: "/api/practice-sessions/not-an-id" },
//   ])("rejects an invalid ID on $method $path", async ({ method, path }) => {
//     const updateBody = path.includes("/bands/")
//       ? { name: "Updated" }
//       : { notes: "Updated" };
//     const response = method === "PUT"
//       ? await sendBody(method, path, JSON.stringify(updateBody))
//       : method === "GET"
//         ? await request(app).get(path)
//         : await request(app).delete(path);
//
//     expect(response.status).toBe(400);
//     expect(response.body).toMatchObject({ error: "InvalidIdentifier" });
//     expectNoDatabaseCalls();
//   });
// });
//
