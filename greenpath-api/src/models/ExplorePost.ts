import mongoose from "mongoose";

const ExplorePostSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  images: [String], // مصفوفة نصوص لتخزين الـ Base64
  location: String,
  comment: String,
  rating: Number,
  category: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("ExplorePost", ExplorePostSchema);