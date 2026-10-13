import { type RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import { BandModel } from "../models/Band";
import { PracticeSessionModel } from "../models/PracticeSession";
import { type CreatePracticeSessionInput } from "../schemas/practiceSession.schema";

function getValidatedPracticeSessionId(
  id: string | string[] | undefined,
  response: Parameters<RequestHandler>[1],
): string | undefined {
  if (typeof id !== "string" || !isValidObjectId(id)) {
    response.status(400).json({
      error: "InvalidIdentifier",
      message: "Practice session ID must be a valid MongoDB ObjectId",
    });
    return undefined;
  }

  return id;
}

export const createPracticeSession: RequestHandler<
  Record<string, never>,
  unknown,
  CreatePracticeSessionInput
> = async (request, response, next) => {
  try {
    // A Mongoose reference alone does not check whether the band exists.
    const bandExists = await BandModel.exists({ _id: request.body.bandId });

    if (!bandExists) {
      response.status(404).json({
        error: "NotFound",
        message: "Band not found",
      });
      return;
    }

    // Omit absent optional fields so Mongoose can apply its defaults.
    const { status, notes, ...sessionData } = request.body;
    const practiceSession = await PracticeSessionModel.create({
      ...sessionData,
      ...(status === undefined ? {} : { status }),
      ...(notes === undefined ? {} : { notes }),
    });
    response.status(201).json(practiceSession);
  } catch (error) {
    next(error);
  }
};

export const getPracticeSessions: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    // The ID breaks ties when two sessions have the same start time.
    const practiceSessions = await PracticeSessionModel.find().sort({
      startAt: 1,
      _id: 1,
    });
    response.status(200).json(practiceSessions);
  } catch (error) {
    next(error);
  }
};

export const getPracticeSessionById: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const practiceSessionId = getValidatedPracticeSessionId(
      request.params.id,
      response,
    );

    if (!practiceSessionId) {
      return;
    }

    const practiceSession = await PracticeSessionModel.findById(practiceSessionId);

    if (!practiceSession) {
      response.status(404).json({
        error: "NotFound",
        message: "Practice session not found",
      });
      return;
    }

    response.status(200).json(practiceSession);
  } catch (error) {
    next(error);
  }
};

export const updatePracticeSession: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const practiceSessionId = getValidatedPracticeSessionId(
      request.params.id,
      response,
    );

    if (!practiceSessionId) {
      return;
    }

    // Zod allows only editable fields; $set preserves the remaining fields.
    const practiceSession = await PracticeSessionModel.findByIdAndUpdate(
      practiceSessionId,
      { $set: request.body },
      { returnDocument: "after", runValidators: true },
    );

    if (!practiceSession) {
      response.status(404).json({
        error: "NotFound",
        message: "Practice session not found",
      });
      return;
    }

    response.status(200).json(practiceSession);
  } catch (error) {
    next(error);
  }
};

export const deletePracticeSession: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const practiceSessionId = getValidatedPracticeSessionId(
      request.params.id,
      response,
    );

    if (!practiceSessionId) {
      return;
    }

    const deletedPracticeSession = await PracticeSessionModel.findByIdAndDelete(
      practiceSessionId,
    );

    if (!deletedPracticeSession) {
      response.status(404).json({
        error: "NotFound",
        message: "Practice session not found",
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
