// Commented out to keep active tests focused on the brief's demonstration scenarios.
// Duplicate missing-record checks and extra relationship/database-error cases.
// Excluded in vitest.config.mjs because a fully commented file has no runnable tests.
// Remove the leading comments and its config exclusion to restore this suite.
//
// import request from "supertest";
// import mongoose from "mongoose";
// import { beforeEach, describe, expect, it, vi } from "vitest";
//
// // Test HTTP responses with controlled model results, without changing Atlas.
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
// const bandId = "507f1f77bcf86cd799439011";
// const sessionId = "507f1f77bcf86cd799439012";
// const band = { _id: bandId, name: "Practice Band", timeZone: "Europe/Dublin" };
// const sessionBody = {
//   bandId,
//   startAt: "2026-11-01T18:00:00Z",
//   durationMinutes: 90,
//   format: "in-person",
//   locationOrLink: "Room 2",
// };
// const session = { _id: sessionId, ...sessionBody, status: "scheduled" };
// const bandPath = `/api/bands/${bandId}`;
// const sessionPath = `/api/practice-sessions/${sessionId}`;
// const missingRecordCases = [
//   { method: "GET", path: bandPath, operation: "bandFindById", message: "Band not found" },
//   { method: "PUT", path: bandPath, operation: "bandUpdate", message: "Band not found" },
//   { method: "DELETE", path: bandPath, operation: "bandExists", message: "Band not found" },
//   { method: "GET", path: sessionPath, operation: "sessionFindById", message: "Practice session not found" },
//   { method: "PUT", path: sessionPath, operation: "sessionUpdate", message: "Practice session not found" },
//   { method: "DELETE", path: sessionPath, operation: "sessionDelete", message: "Practice session not found" },
// ] as const;
//
// beforeEach(() => {
//   vi.resetAllMocks();
//   database.bandCreate.mockResolvedValue(band);
//   database.bandExists.mockResolvedValue({ _id: bandId });
//   database.bandFindById.mockResolvedValue(band);
//   database.bandUpdate.mockResolvedValue({ ...band, name: "Updated Band" });
//   database.bandDelete.mockResolvedValue(band);
//   database.sessionCreate.mockResolvedValue(session);
//   database.sessionFindById.mockResolvedValue(session);
//   database.sessionUpdate.mockResolvedValue({ ...session, notes: "Updated" });
//   database.sessionDelete.mockResolvedValue(session);
//   database.sessionCount.mockResolvedValue(0);
// });
//
// function sendRequest(method: string, path: string, body?: object) {
//   const client = request(app);
//   switch (method) {
//     case "GET": return client.get(path);
//     case "DELETE": return client.delete(path);
//     case "POST": return body === undefined ? client.post(path) : client.post(path).send(body);
//     case "PUT": return body === undefined ? client.put(path) : client.put(path).send(body);
//     default: throw new Error(`Unsupported resource-test method: ${method}`);
//   }
// }
//
// function updateBodyFor(path: string) {
//   return path.includes("/bands/") ? { name: "Updated Band" } : { notes: "Updated" };
// }
//
// describe("Missing records", () => {
//   it.each(missingRecordCases)(
//     "returns 404 for a missing record on $method $path",
//     async ({ method, path, operation, message }) => {
//       database[operation].mockResolvedValue(null);
//       const response = await sendRequest(
//         method,
//         path,
//         method === "PUT" ? updateBodyFor(path) : undefined,
//       );
//
//       expect(response.status).toBe(404);
//       expect(response.body).toEqual({ error: "NotFound", message });
//     },
//   );
//
//   it("returns 404 before checking sessions for a missing band", async () => {
//     database.bandExists.mockResolvedValue(null);
//     database.sessionCount.mockResolvedValue(2);
//     const response = await sendRequest("DELETE", bandPath);
//
//     expect(response.status).toBe(404);
//     expect(database.sessionCount).not.toHaveBeenCalled();
//     expect(database.bandDelete).not.toHaveBeenCalled();
//   });
//
//   it("returns 404 if the band disappears before its delete completes", async () => {
//     database.bandDelete.mockResolvedValue(null);
//     const response = await sendRequest("DELETE", bandPath);
//
//     expect(response.status).toBe(404);
//     expect(response.body).toEqual({
//       error: "NotFound",
//       message: "Band not found",
//     });
//   });
//
//   it("returns a clear 404 for an unregistered API route", async () => {
//     const response = await sendRequest("GET", "/api/unknown-resource");
//
//     expect(response.status).toBe(404);
//     expect(response.body).toEqual({
//       error: "NotFound",
//       message: "No route matches GET /api/unknown-resource",
//     });
//   });
// });
//
// describe("Band and Practice Session relationships", () => {
//   it("does not create a session for a missing band", async () => {
//     database.bandExists.mockResolvedValue(null);
//     const response = await sendRequest("POST", "/api/practice-sessions", sessionBody);
//
//     expect(response.status).toBe(404);
//     expect(response.body).toEqual({ error: "NotFound", message: "Band not found" });
//     expect(database.sessionCreate).not.toHaveBeenCalled();
//   });
//
//   it("blocks band deletion while related sessions exist", async () => {
//     database.sessionCount.mockResolvedValue(1);
//     const response = await sendRequest("DELETE", bandPath);
//
//     expect(response.status).toBe(409);
//     expect(response.body).toEqual({
//       error: "Conflict",
//       message: "Delete the band's practice sessions before deleting the band",
//     });
//     expect(database.bandExists).toHaveBeenCalledWith({ _id: bandId });
//     expect(database.sessionCount).toHaveBeenCalledWith({ bandId });
//     expect(database.bandDelete).not.toHaveBeenCalled();
//     expect(database.sessionDelete).not.toHaveBeenCalled();
//   });
//
//   it("allows band deletion after its remaining session is deleted", async () => {
//     database.sessionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
//
//     const blockedDelete = await sendRequest("DELETE", bandPath);
//     expect(blockedDelete.status).toBe(409);
//     expect(database.bandDelete).not.toHaveBeenCalled();
//
//     const deleteSession = await sendRequest("DELETE", sessionPath);
//     expect(deleteSession.status).toBe(204);
//     expect(deleteSession.text).toBe("");
//
//     const deleteBand = await sendRequest("DELETE", bandPath);
//     expect(deleteBand.status).toBe(204);
//     expect(deleteBand.text).toBe("");
//     expect(database.bandDelete).toHaveBeenCalledWith(bandId);
//   });
//
//   it("preserves a session's band relationship during updates", async () => {
//     const response = await sendRequest("PUT", sessionPath, { notes: "Updated" });
//
//     expect(response.status).toBe(200);
//     expect(response.body).toMatchObject({ bandId, notes: "Updated" });
//     expect(database.sessionUpdate).toHaveBeenCalledWith(
//       sessionId,
//       { $set: { notes: "Updated" } },
//       { returnDocument: "after", runValidators: true },
//     );
//   });
//
//   it("rejects reassignment of a session to another band", async () => {
//     const response = await sendRequest("PUT", sessionPath, {
//       bandId: "507f1f77bcf86cd799439013",
//     });
//
//     expect(response.status).toBe(400);
//     expect(database.sessionUpdate).not.toHaveBeenCalled();
//   });
// });
//
// describe("Database errors", () => {
//   it.each([
//     ...missingRecordCases,
//     { method: "POST", path: "/api/bands", operation: "bandCreate" },
//     { method: "POST", path: "/api/practice-sessions", operation: "sessionCreate" },
//     { method: "DELETE", path: bandPath, operation: "sessionCount" },
//     { method: "DELETE", path: bandPath, operation: "bandDelete" },
//   ] as const)(
//     "returns a safe 500 when $operation fails",
//     async ({ method, path, operation }) => {
//       const log = vi.spyOn(console, "error").mockImplementation(() => {});
//       database[operation].mockRejectedValue(new Error("Private database details"));
//
//       try {
//         const body = method === "PUT" ? updateBodyFor(path)
//           : method === "POST" ? (path === "/api/bands"
//             ? { name: band.name, timeZone: band.timeZone } : sessionBody)
//             : undefined;
//         const response = await sendRequest(method, path, body);
//
//         expect(response.status).toBe(500);
//         expect(response.body).toEqual({
//           error: "InternalServerError",
//           message: "An unexpected server error occurred",
//         });
//       } finally {
//         log.mockRestore();
//       }
//     },
//   );
//
//   it("returns 400 for a database validation error", async () => {
//     database.bandUpdate.mockRejectedValue(new mongoose.Error.ValidationError());
//     const response = await sendRequest("PUT", bandPath, { name: "Updated Band" });
//
//     expect(response.status).toBe(400);
//     expect(response.body).toEqual({
//       error: "ValidationError",
//       message: "Database validation failed",
//     });
//   });
//
//   it("returns 400 for a database identifier cast error", async () => {
//     database.sessionFindById.mockRejectedValue(
//       new mongoose.Error.CastError("ObjectId", "invalid", "_id"),
//     );
//     const response = await sendRequest("GET", sessionPath);
//
//     expect(response.status).toBe(400);
//     expect(response.body).toEqual({
//       error: "InvalidIdentifier",
//       message: "A supplied identifier is invalid",
//     });
//   });
// });
//
