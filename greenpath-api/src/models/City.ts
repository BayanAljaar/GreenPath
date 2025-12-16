// src/models/City.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICity extends Document {
  name: string;         // Istanbul
  countryCode: string;  // TR, IL, FR...
  description?: string;
  mainLanguage?: string;
  currency?: string;    // TRY, ILS, EUR...
  location?: {
    lat: number;
    lng: number;
  };
  tags?: string[];
}

const CitySchema = new Schema<ICity>(
  {
    name: { type: String, required: true },
    countryCode: { type: String, required: true },
    description: { type: String },
    mainLanguage: { type: String },
    currency: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const City = mongoose.model<ICity>("City", CitySchema);
