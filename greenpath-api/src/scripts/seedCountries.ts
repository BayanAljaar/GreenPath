// src/scripts/seedCountries.ts
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { Country } from "../models/Country";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

async function run() {
  try {
    // חיבור ל־MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB (seedCountries)");

    // קריאת קובץ ה־JSON
    const filePath = path.join(__dirname, "../../seed/countries.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const countries = JSON.parse(fileContent);

    console.log(`ℹ️ Loaded ${countries.length} countries from JSON`);

    // ניקוי טבלה קיימת והכנסה מחדש
    await Country.deleteMany({});
    await Country.insertMany(countries);

    console.log("✅ Seeded countries successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding countries:", err);
    process.exit(1);
  }
}

run();
