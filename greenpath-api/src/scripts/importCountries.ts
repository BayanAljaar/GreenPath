// src/scripts/importCountries.ts

import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import { Country } from "../models/Country";

dotenv.config();

const MONGO = process.env.MONGODB_URI as string;

if (!MONGO) {
  console.error("❌ MONGODB_URI is missing in .env");
  process.exit(1);
}

async function importCountries() {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB");

    // ❗ כאן חשוב – אנחנו מוסיפים fields בפרמטרים
    const response = await axios.get("https://restcountries.com/v3.1/all", {
      params: {
        fields: "cca2,name,region,languages,currencies,flag",
      },
    });

    const data = response.data as any[];

    console.log(`ℹ️ Fetched ${data.length} countries from API`);

    for (const c of data) {
      const code: string = c.cca2;
      const name: string = c.name?.common || code;
      const region: string | undefined = c.region;

      // שפה ראשית (לוקחים את הערך הראשון במילון languages)
      let mainLanguage: string | undefined = undefined;
      if (c.languages && typeof c.languages === "object") {
        const langs = Object.values(c.languages) as string[];
        if (langs.length > 0) {
          mainLanguage = langs[0];
        }
      }

      // מטבע ראשי (לוקחים את המפתח הראשון במילון currencies)
      let currency: string | undefined = undefined;
      if (c.currencies && typeof c.currencies === "object") {
        const currCodes = Object.keys(c.currencies) as string[];
        if (currCodes.length > 0) {
          currency = currCodes[0];
        }
      }

      const flag: string | undefined = c.flag; // ברוב המקרים יש emoji

      await Country.updateOne(
        { code },
        {
          $set: {
            name,
            region,
            mainLanguage,
            currency,
            flag,
          },
        },
        { upsert: true }
      );
    }

    console.log("✅ Imported / updated countries successfully");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error importing countries:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importCountries();
