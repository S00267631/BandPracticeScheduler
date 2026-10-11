import { Router } from "express";
import {
  createBand,
  deleteBand,
  getBandById,
  getBands,
  updateBand,
} from "../controllers/band.controller";
import { validateBody } from "../middleware/validateBody";
import {
  createBandSchema,
  updateBandSchema,
} from "../schemas/band.schema";

export const bandRouter = Router();

bandRouter
  .route("/")
  .post(validateBody(createBandSchema), createBand)
  .get(getBands);

bandRouter
  .route("/:id")
  .get(getBandById)
  .put(validateBody(updateBandSchema), updateBand)
  .delete(deleteBand);