// src/controllers/citiesController.ts
import { Request, Response } from "express";
import { City } from "../models/City";

// GET /cities – מחזיר רשימת ערים, עם אפשרות סינון
export const getCities = async (req: Request, res: Response) => {
  try {
    const { q, country } = req.query;

    const filter: any = {};

    if (country) {
      filter.countryCode = String(country).toUpperCase();
    }

    if (q) {
      const regex = new RegExp(String(q), "i"); // חיפוש לא רגיש לאותיות
      filter.$or = [
        { name: regex },
        { countryName: regex },
      ];
    }

    const cities = await City.find(filter).sort({ name: 1 }).lean();
    res.json(cities);
  } catch (err) {
    console.error("Error fetching cities:", err);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
};
