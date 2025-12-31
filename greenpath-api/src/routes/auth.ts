// src/routes/auth.ts
import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user";

const router = express.Router();

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
        profilePicture: user.profilePicture, // ⬅️ أضيفي هذا السطر هنا لكي تعود الصورة عند تسجيل الدخول
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

// backend/routes/auth.ts

// 1. مسار تحديث البيانات
router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // ستحتوي على userName أو email
    const { profilePicture, userName } = req.body;
    const updatedUser = await User.findByIdAndUpdate(id, { profilePicture, userName }, { new: true });
    
    res.json({ ok: true, 
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        userName: updatedUser.userName,
        profilePicture: updatedUser.profilePicture // إرجاع الصورة الجديدة
       }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error during update" });
  }
});

// 2. مسار حذف الحساب
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    // يمكنك هنا أيضاً حذف جميع منشورات المستخدم المرتبطة به
    res.json({ ok: true, message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error during deletion" });
  }
});

// backend/routes/auth.js
// مسار واحد لتحديث أي بيانات في البروفايل (اسم، صورة، إلخ)
router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, profilePicture, fullName } = req.body;

    // نقوم بتحديث الحقول التي وصلت فقط في ה-body
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { userName, profilePicture, fullName },
      { new: true, runValidators: true } // new: true تعيد البيانات بعد التعديل
    );

    if (!updatedUser) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({
      ok: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        userName: updatedUser.userName,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture // ⬅️ مهم جداً لكي تظهر الصورة في التطبيق
      }
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ ok: false, message: "Server error during update" });
  }
});



// جلب بيانات مستخدم معين بواسطة الـ ID
router.get("/me/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    res.json({
      ok: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        email: user.email,
        profilePicture: user.profilePicture // ⬅️ الصورة تعود من هنا
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error" });
  }
});



export default router;
