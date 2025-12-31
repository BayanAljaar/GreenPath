// greenpath-api/src/server.ts
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import citiesRouter from "./routes/cities";
import countriesRouter from "./routes/countries";

import tripsRouter from "./routes/trips";   // ⭐ חדש
import authRouter from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const MONGO = process.env.MONGODB_URI as string;


app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ראוטים אמיתיים
app.use("/cities", citiesRouter);
app.use("/countries", countriesRouter);
app.use("/cities", citiesRouter);
app.use("/trips", tripsRouter);            // ⭐ חדש

// ارفعي الحد إلى 50 ميجابايت مثلاً بدلاً من 1 ميجابايت الافتراضي
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
/// 2. ثم الـ CORS (إذا كنتِ تستخدمينه)
app.use(cors());
app.use("/auth", authRouter);

if (!MONGO) {
  console.error("MONGODB_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(4001, "0.0.0.0", () => {
      console.log(`✅ API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
