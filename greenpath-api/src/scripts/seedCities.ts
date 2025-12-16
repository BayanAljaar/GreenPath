// src/scripts/seedCities.ts
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { City } from "../models/City";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

async function run() {
  try {
    // חיבור למונגו
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB (seedCities)");

    // קריאת קובץ ה־JSON
    const filePath = path.join(__dirname, "../../seed/cities.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const cities = JSON.parse(fileContent);

    console.log(`ℹ️ Loaded ${cities.length} cities from JSON`);

    // ניקוי קולקציה קיימת והכנסה מחדש
    await City.deleteMany({});
    await City.insertMany(cities);

    console.log("✅ Seeded cities successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding cities:", err);
    process.exit(1);
  }
}

run();
