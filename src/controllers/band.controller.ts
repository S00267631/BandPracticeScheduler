import { type RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import { BandModel } from "../models/Band";
import { PracticeSessionModel } from "../models/PracticeSession";

function getValidatedBandId(
  id: string | string[] | undefined,
  response: Parameters<RequestHandler>[1],
): string | undefined {
  if (typeof id !== "string" || !isValidObjectId(id)) {
    response.status(400).json({
      error: "InvalidIdentifier",
      message: "Band ID must be a valid MongoDB ObjectId",
    });
    return undefined;
  }

  return id;
}

export const createBand: RequestHandler = async (request, response, next) => {
  try {
    const band = await BandModel.create(request.body);
    response.status(201).json(band);
  } catch (error) {
    next(error);
  }
};

export const getBands: RequestHandler = async (_request, response, next) => {
  try {
    const bands = await BandModel.find().sort({ name: 1 });
    response.status(200).json(bands);
  } catch (error) {
    next(error);
  }
};

export const getBandById: RequestHandler = async (request, response, next) => {
  try {
    const bandId = getValidatedBandId(request.params.id, response);

    if (!bandId) {
      return;
    }

    const band = await BandModel.findById(bandId);

    if (!band) {
      response.status(404).json({
        error: "NotFound",
        message: "Band not found",
      });
      return;
    }

    response.status(200).json(band);
  } catch (error) {
    next(error);
  }
};

export const updateBand: RequestHandler = async (request, response, next) => {
  try {
    const bandId = getValidatedBandId(request.params.id, response);

    if (!bandId) {
      return;
    }

    const band = await BandModel.findByIdAndUpdate(
      bandId,
      request.body,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!band) {
      response.status(404).json({
        error: "NotFound",
        message: "Band not found",
      });
      return;
    }

    response.status(200).json(band);
  } catch (error) {
    next(error);
  }
};

export const deleteBand: RequestHandler = async (request, response, next) => {
  try {
    const bandId = getValidatedBandId(request.params.id, response);

    if (!bandId) {
      return;
    }

    const practiceCount = await PracticeSessionModel.countDocuments({
      bandId,
    });

    if (practiceCount > 0) {
      response.status(409).json({
        error: "Conflict",
        message: "Delete the band's practice sessions before deleting the band",
      });
      return;
    }

    const deletedBand = await BandModel.findByIdAndDelete(bandId);

    if (!deletedBand) {
      response.status(404).json({
        error: "NotFound",
        message: "Band not found",
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};