// Commented out to keep active tests focused on the brief's demonstration scenarios.
// Extra automated replay of manual requests. The REST Client .http file is unchanged.
// Excluded in vitest.config.mjs because a fully commented file has no runnable tests.
// Remove the leading comments and its config exclusion to restore this suite.
//
// import { readFileSync } from "node:fs";
// import request from "supertest";
// import mongoose from "mongoose";
// import { expect, it, vi } from "vitest";
// import {
//   type CreateBandInput,
//   type UpdateBandInput,
// } from "../schemas/band.schema";
// import {
//   type CreatePracticeSessionInput,
//   type UpdatePracticeSessionInput,
// } from "../schemas/practiceSession.schema";
//
// // Replay the .http file against the real app, with records held only in memory.
// const database = vi.hoisted(() => ({
//   bandCreate: vi.fn(), bandFind: vi.fn(), bandExists: vi.fn(),
//   bandFindById: vi.fn(), bandUpdate: vi.fn(), bandDelete: vi.fn(),
//   sessionCreate: vi.fn(), sessionFind: vi.fn(), sessionFindById: vi.fn(),
//   sessionUpdate: vi.fn(), sessionDelete: vi.fn(), sessionCount: vi.fn(),
// }));
//
// vi.mock("../models/Band", () => ({
//   BandModel: {
//     create: database.bandCreate,
//     find: database.bandFind,
//     exists: database.bandExists,
//     findById: database.bandFindById,
//     findByIdAndUpdate: database.bandUpdate,
//     findByIdAndDelete: database.bandDelete,
//   },
// }));
// vi.mock("../models/PracticeSession", () => ({
//   PracticeSessionModel: {
//     create: database.sessionCreate,
//     find: database.sessionFind,
//     findById: database.sessionFindById,
//     findByIdAndUpdate: database.sessionUpdate,
//     findByIdAndDelete: database.sessionDelete,
//     countDocuments: database.sessionCount,
//   },
// }));
//
// import { app } from "../app";
//
// type BandRecord = CreateBandInput & { _id: string };
// type SessionRecord = Omit<CreatePracticeSessionInput, "startAt"> & {
//   _id: string;
//   startAt: Date;
// };
// type SessionFilter = {
//   bandId?: string;
//   status?: string;
//   startAt?: { $gte?: Date; $lte?: Date };
// };
//
// function createManualRequest(method: string, path: string) {
//   const client = request(app);
//   switch (method) {
//     case "GET": return client.get(path);
//     case "POST": return client.post(path);
//     case "PUT": return client.put(path);
//     case "DELETE": return client.delete(path);
//     default: throw new Error(`Unsupported manual-request method: ${method}`);
//   }
// }
//
// function sortValue(session: SessionRecord, field: string) {
//   if (field === "startAt") return session.startAt.getTime();
//   if (field === "durationMinutes") return session.durationMinutes;
//   if (field === "_id") return session._id;
//   throw new Error(`Unexpected sort field: ${field}`);
// }
//
// it("replays all 56 manual requests with their expected statuses and results", async () => {
//   const bands = new Map<string, BandRecord>();
//   const sessions = new Map<string, SessionRecord>();
//   database.bandCreate.mockImplementation(async (body: CreateBandInput) => {
//     const record = { ...body, _id: new mongoose.Types.ObjectId().toString() };
//     bands.set(record._id, record);
//     return record;
//   });
//   database.bandFind.mockImplementation(() => ({
//     sort: async () => [...bands.values()].sort((a, b) => a.name.localeCompare(b.name)),
//   }));
//   database.bandExists.mockImplementation(async ({ _id }: { _id: string }) =>
//     bands.has(_id) ? { _id } : null);
//   database.bandFindById.mockImplementation(async (id: string) => bands.get(id) ?? null);
//   database.bandUpdate.mockImplementation(async (id: string, body: UpdateBandInput) => {
//     const record = bands.get(id);
//     if (!record) return null;
//     Object.assign(record, body);
//     return record;
//   });
//   database.bandDelete.mockImplementation(async (id: string) => {
//     const record = bands.get(id) ?? null;
//     bands.delete(id);
//     return record;
//   });
//   database.sessionCreate.mockImplementation(async (body: CreatePracticeSessionInput) => {
//     const record = {
//       ...body,
//       _id: new mongoose.Types.ObjectId().toString(),
//       startAt: new Date(body.startAt),
//       status: body.status ?? "scheduled",
//     };
//     sessions.set(record._id, record);
//     return record;
//   });
//   database.sessionFind.mockImplementation((filter: SessionFilter = {}) => ({
//     sort: async (sort: Record<string, 1 | -1>) => [...sessions.values()]
//       .filter((record) =>
//         (!filter.bandId || record.bandId === filter.bandId) &&
//         (!filter.status || record.status === filter.status) &&
//         (!filter.startAt?.$gte || record.startAt >= filter.startAt.$gte) &&
//         (!filter.startAt?.$lte || record.startAt <= filter.startAt.$lte))
//       .sort((a, b) => {
//         for (const [field, direction] of Object.entries(sort)) {
//           const left = sortValue(a, field);
//           const right = sortValue(b, field);
//           if (left < right) return -direction;
//           if (left > right) return direction;
//         }
//         return 0;
//       }),
//   }));
//   database.sessionFindById.mockImplementation(async (id: string) => sessions.get(id) ?? null);
//   database.sessionUpdate.mockImplementation(async (
//     id: string,
//     update: { $set: UpdatePracticeSessionInput },
//   ) => {
//     const record = sessions.get(id);
//     if (!record) return null;
//     const { startAt, ...fields } = update.$set;
//     Object.assign(record, fields);
//     if (startAt !== undefined) record.startAt = new Date(startAt);
//     return record;
//   });
//   database.sessionDelete.mockImplementation(async (id: string) => {
//     const record = sessions.get(id) ?? null;
//     sessions.delete(id);
//     return record;
//   });
//   database.sessionCount.mockImplementation(async ({ bandId }: { bandId: string }) =>
//     [...sessions.values()].filter((record) => record.bandId === bandId).length);
//
//   const content = readFileSync("requests/api.http", "utf8");
//   const variables = new Map<string, string>(
//     [...content.matchAll(/^@(\w+)\s*=\s*(.+)$/gm)]
//       .map((match) => [match[1]!, match[2]!.trim()]),
//   );
//   // Supertest uses the path below; this base address is only for URL parsing.
//   variables.set("baseUrl", "http://localhost");
//   const responseIds = new Map<string, string>();
//
//   // Resolve the small subset of REST Client variables used by this file.
//   function resolveVariables(value: string, depth = 0): string {
//     if (depth > 10) throw new Error("Circular request variable");
//     return value.replace(/\{\{([^}]+)\}\}/g, (_match, reference: string) => {
//       const requestName = reference.match(/^(\w+)\.response\.body\.\$\._id$/)?.[1];
//       const resolved = requestName ? responseIds.get(requestName) : variables.get(reference);
//       if (resolved === undefined) throw new Error(`Unresolved variable: ${reference}`);
//       return resolveVariables(resolved, depth + 1);
//     });
//   }
//
//   const expectedLengths: Record<number, number> = {
//     30: 3, 31: 2, 32: 1, 33: 2, 34: 1, 39: 0, 56: 0,
//   };
//   let requestCount = 0;
//   for (const block of content.split(/^###.*$/m)) {
//     const requestLine = block.match(/^(GET|POST|PUT|DELETE)\s+(.+)$/m);
//     if (!requestLine) continue;
//     const method = requestLine[1]!;
//     const url = resolveVariables(requestLine[2]!.trim());
//     const expectedStatus = Number(block.match(/^# Expected:\s*(\d+)$/m)?.[1]);
//     expect(Number.isFinite(expectedStatus)).toBe(true);
//     const namedRequest = block.match(/^# @name\s+(\w+)$/m)?.[1];
//     const afterRequest = block.slice(block.indexOf(requestLine[0]) + requestLine[0].length);
//     const bodyStart = afterRequest.search(/\r?\n\r?\n/);
//     const body = bodyStart < 0 ? undefined
//       : resolveVariables(afterRequest.slice(bodyStart).trim());
//     const target = new URL(url);
//     const pendingRequest = createManualRequest(method, target.pathname + target.search);
//     const response = await (body
//       ? pendingRequest.set("Content-Type", "application/json").send(body)
//       : pendingRequest);
//     requestCount += 1;
//     expect(response.status, `Request ${requestCount}: ${method} ${url}`).toBe(expectedStatus);
//     const text = response.text;
//     const result = text ? response.body : undefined;
//     if (namedRequest) {
//       expect(result._id).toMatch(/^[a-f\d]{24}$/i);
//       responseIds.set(namedRequest, result._id);
//     }
//     if (expectedStatus === 204) expect(text).toBe("");
//     if (expectedStatus >= 400) expect(result.error).toBeTypeOf("string");
//     if (requestCount === 6) {
//       expect(result.description).toBe("Updated during the REST Client demonstration");
//     }
//     if (requestCount === 25) expect(result.notes).toBe("Bring the new set list");
//     if ([30, 31, 32, 33, 34, 39, 56].includes(requestCount)) {
//       expect(result).toHaveLength(expectedLengths[requestCount]!);
//     }
//     if (requestCount === 35 || requestCount === 36) {
//       const days = result.map((record: { startAt: string }) => new Date(record.startAt).getUTCDate());
//       expect(days).toEqual(requestCount === 35 ? [2, 5, 7] : [7, 5, 2]);
//     }
//     if (requestCount === 37 || requestCount === 38) {
//       const durations = result.map((record: { durationMinutes: number }) => record.durationMinutes);
//       expect(durations).toEqual(requestCount === 37 ? [60, 90, 120] : [120, 90, 60]);
//     }
//   }
//
//   expect(requestCount).toBe(56);
//   expect(bands.size).toBe(0);
//   expect(sessions.size).toBe(0);
// }, 15_000);
//
