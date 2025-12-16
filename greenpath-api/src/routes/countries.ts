// greenpath-api/src/routes/countries.ts
// greenpath-api/src/routes/countries.ts
import express from "express";
import axios from "axios";
import { Country } from "../models/Country";

const router = express.Router();

/**
 * GET /countries
 * מחזיר את כל המדינות מה־MongoDB
 */
router.get("/", async (_req, res) => {
  try {
    const countries = await Country.find();
    res.json(countries);
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

/**
 * GET /countries/:code/cities
 * מחזיר רשימת ערים למדינה לפי קוד (IL, TR, GR...)
 * משתמש ב-CountriesNow API
 */
router.get("/:code/cities", async (req, res) => {
  const { code } = req.params;

  try {
    // מחפשים את המדינה לפי code כדי לקבל את השם המלא (Israel, Turkey...)
    const country = await Country.findOne({ code: code.toUpperCase() });

    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }

    // ⬅⬅⬅  כאן התיקון: מוסיפים <any> כדי שלא יהיה unknown
    const apiResponse = await axios.post<any>(
      "https://countriesnow.space/api/v0.1/countries/cities",
      { country: country.name }
    );

    if (!apiResponse.data || !apiResponse.data.data) {
      return res
        .status(500)
        .json({ error: "Failed to fetch cities from external API" });
    }

    const citiesRaw: string[] = apiResponse.data.data;

    // ניקח רק 12 ערים ראשונות כדי לא להציף את המסך
    const cities = citiesRaw.slice(0, 12).map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      description: `אחד המקומות המרכזיים לביקור ב-${country.name}.`,
    }));

    res.json({
      countryCode: country.code,
      countryName: country.name,
      cities,
    });
  } catch (error) {
    console.error("Error fetching cities by country:", error);
    res.status(500).json({ error: "Failed to fetch cities for this country" });
  }
});

export default router;
