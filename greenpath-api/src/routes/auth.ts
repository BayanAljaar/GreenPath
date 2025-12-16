// src/routes/auth.ts
import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user";

const router = express.Router();

/**
 * POST /auth/register
 * גוף הבקשה:
 * {
 *   fullName: string,
 *   username: string,
 *   email: string,
 *   password: string
 * }
 */
router.post("/register", async (req, res) => {
  try {
    const { fullName, userName, email, password } = req.body;

    if (!fullName || !userName || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "חסרים שדות חובה",
      });
    }

    // בדיקה אם שם משתמש או מייל כבר קיימים
    const existingUser = await User.findOne({
      $or: [{ userName }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "שם משתמש או מייל כבר רשומים במערכת",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      userName,
      email,
      passwordHash,
    });

    return res.status(201).json({
      ok: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in POST /auth/register:", err);
    return res.status(500).json({
      ok: false,
      message: "שגיאת שרת בהרשמה",
    });
  }
});

/**
 * POST /auth/login
 * גוף הבקשה:
 * {
 *   userNameOrEmail: string,
 *   password: string
 * }
 */
router.post("/login", async (req, res) => {
  try {
    const { userNameOrEmail, password } = req.body;

    if (!userNameOrEmail || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "נא למלא שם משתמש/מייל וסיסמה" });
    }

    // חיפוש לפי username או email
    const user = await User.findOne({
      $or: [{ userName: userNameOrEmail }, { email: userNameOrEmail }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ ok: false, message: "שם משתמש או סיסמה שגויים" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ ok: false, message: "שם משתמש או סיסמה שגויים" });
    }

    // בשלב זה אפשר גם להחזיר JWT – כרגע נחזיר רק פרטי משתמש
    return res.json({
      ok: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in POST /auth/login:", err);
    return res.status(500).json({
      ok: false,
      message: "שגיאת שרת בהתחברות",
    });
  }
});

export default router;
