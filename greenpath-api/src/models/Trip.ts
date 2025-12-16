// src/models/Trip.ts
// server/src/models/trip.ts (או איפה ששאר המודלים שלך)
import mongoose, { Schema, Document } from "mongoose";

export interface ITrip extends Document {
  userName: string;
  countryCode: string;
  countryName: string;
  title: string;
  startDate?: string;
  endDate?: string;
  style?: string;
  notes?: string;
  createdAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userName: { type: String, required: true },
    countryCode: { type: String, required: true },
    countryName: { type: String, required: true },
    title: { type: String, required: true },
    startDate: { type: String },
    endDate: { type: String },
    style: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Trip = mongoose.model<ITrip>("Trip", TripSchema);
