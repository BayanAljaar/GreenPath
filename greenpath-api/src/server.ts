// greenpath-api/src/server.ts
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import citiesRouter from "./routes/cities";
import countriesRouter from "./routes/countries";

import tripsRouter from "./routes/trips";   // ⭐ חדש
import authRouter from "./routes/auth";
import communicationRoutes from "./routes/communicationRoutes";


import postsRouter from "./routes/posts"; // 1. استيراد الملف الجديد11.5 

dotenv.config();
console.log("OPENAI key loaded:", process.env.OPENAI_API_KEY ? "YES" : "NO");
const app = express();
//<<<<<<< HEAD
const PORT = process.env.PORT || 4001;
const MONGO = process.env.MONGODB_URI as string;
// ارفعي الحد إلى 50 ميجابايت مثلاً بدلاً من 1 ميجابايت الافتراضي
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
//ME
//app.use(cors());
//=======
// تحسين CORS للسماح بالاتصالات من التلفون
app.use(cors({
  origin: '*', // في الإنتاج، حدد المنافذ المسموحة
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
//>>>>>>> main
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ראוטים אמיתיים
app.use("/cities", citiesRouter);
app.use("/countries", countriesRouter);
app.use("/cities", citiesRouter);
app.use("/trips", tripsRouter);            // ⭐ חדש
app.use("/posts", postsRouter); // 2. تفعيل مسار المنشورات11.5 


/// 2. ثم الـ CORS (إذا كنتِ تستخدمينه)
app.use(cors());
app.use("/auth", authRouter);
app.use("/api/communication", communicationRoutes);

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
