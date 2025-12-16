// src/models/user.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  userName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    userName: { type: String,required: [true, 'Username is required'], unique: true, sparse: true, trim: true,lowercase: true,},
          // 🏆 الحل: طبق خاصية unique فقط على الوثائق التي تحتوي على الحقل
                    // 🏆 الحل: اجعل الحقل مطلوبًا
           // חייב להיות ייחודי
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);

