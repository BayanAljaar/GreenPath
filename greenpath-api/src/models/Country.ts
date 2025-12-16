// src/models/Country.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICountry extends Document {
  code: string;         // TR, IL, FR...
  name: string;         // Turkey, Israel...
  region?: string;      // Europe, Middle East...
  mainLanguage?: string;
  currency?: string;    // TRY, ILS, EUR...
  flag?: string;        // 🇹🇷 🇮🇱 ...
}

const CountrySchema = new Schema<ICountry>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    region: { type: String },
    mainLanguage: { type: String },
    currency: { type: String },
    flag: { type: String },
  },
  { timestamps: true }
);

export const Country = mongoose.model<ICountry>("Country", CountrySchema);
