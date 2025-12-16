// src/routes/trips.ts
// server/src/routes/trips.ts
import express from "express";
import { Trip } from "../models/Trip";

const router = express.Router();

// POST /trips – יצירת טיול
router.post("/", async (req, res) => {
  try {
    const {
      userName,
      countryCode,
      countryName,
      title,
      startDate,
      endDate,
      style,
      notes,
    } = req.body;

    if (!userName || !countryCode || !countryName || !title) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields",
      });
    }

    const trip = await Trip.create({
      userName,
      countryCode,
      countryName,
      title,
      startDate,
      endDate,
      style,
      notes,
    });

    return res.status(201).json({ ok: true, trip });
  } catch (err) {
    console.error("Error in POST /trips:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error while saving trip",
    });
  }
});

// GET /trips/user/:userName – כל הטיולים של משתמש
router.get("/user/:userName", async (req, res) => {
  try {
    const trips = await Trip.find({
      userName: req.params.userName,
    }).sort({ createdAt: -1 });

    return res.json({ ok: true, trips });
  } catch (err) {
    console.error("Error in GET /trips/user:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error while loading trips",
    });
  }
});

export default router;
