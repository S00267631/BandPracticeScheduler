import { model, Schema } from "mongoose";
import {
  PRACTICE_FORMATS,
  PRACTICE_STATUSES,
} from "../constants/practice";

const practiceSessionSchema = new Schema(
  {
    bandId: {
      type: Schema.Types.ObjectId,
      ref: "Band",
      required: [true, "A practice session must belong to a band"],
    },
    startAt: {
      type: Date,
      required: [true, "Practice start date and time is required"],
    },
    durationMinutes: {
      type: Number,
      required: [true, "Practice duration is required"],
      min: [30, "Practice must last at least 30 minutes"],
      max: [360, "Practice cannot last more than 360 minutes"],
    },
    format: {
      type: String,
      required: [true, "Practice format is required"],
      enum: [...PRACTICE_FORMATS],
    },
    locationOrLink: {
      type: String,
      required: [true, "A location or online meeting link is required"],
      trim: true,
      minlength: [2, "Location or link must be at least 2 characters"],
      maxlength: [200, "Location or link cannot exceed 200 characters"],
    },
    status: {
      type: String,
      enum: [...PRACTICE_STATUSES],
      default: "scheduled",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

//filter by date functionality
practiceSessionSchema.index({ bandId: 1, startAt: 1 });

export const PracticeSessionModel = model(
  "PracticeSession",
  practiceSessionSchema,
);