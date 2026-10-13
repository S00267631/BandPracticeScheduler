import { Router } from "express";
import {
  createPracticeSession,
  deletePracticeSession,
  getPracticeSessionById,
  getPracticeSessions,
  updatePracticeSession,
} from "../controllers/practiceSession.controller";
import { validateBody } from "../middleware/validateBody";
import {
  createPracticeSessionSchema,
  updatePracticeSessionSchema,
} from "../schemas/practiceSession.schema";

export const practiceSessionRouter = Router();

practiceSessionRouter
  .route("/")
  .post(validateBody(createPracticeSessionSchema), createPracticeSession)
  .get(getPracticeSessions);

practiceSessionRouter
  .route("/:id")
  .get(getPracticeSessionById)
  .put(validateBody(updatePracticeSessionSchema), updatePracticeSession)
  .delete(deletePracticeSession);
