// greenpath-api/src/routes/cities.ts
import express from "express";
import { getCities } from "../controllers/citiesController";

const router = express.Router();

// GET /cities
router.get("/", getCities);

export default router;
