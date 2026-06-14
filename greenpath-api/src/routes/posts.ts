import express from "express";
import ExplorePostModel from "../models/ExplorePost"; // تأكدي من المسار الصحيح


const router = express.Router();
// افترضي أنكِ أنشأتِ Model للمنشورات باسم Post
// import Post from "../models/Post"; 
// جلب المنشورات
router.get("/", async (req, res) => {
    try {
        //14.30
        const data = await ExplorePostModel.find().sort({ createdAt: -1 });
         res.json(data);
        //14.30
        // res.json(posts);
      //res.json([]); //14.30 مصفوفة فارغة حتى لا يظهر خطأ 404
    } catch (err) {
        console.error("GET Posts Error:", err); //14.30
        res.status(500).json({ ok: false, message: "Error fetching posts" });
    }
}); 

// إنشاء منشور
/*14.30
router.post("/", async (req, res) => {
    try {
        //        const newPost = new Post(req.body);/// استلام البيانات من الموبايل
     //        const savedPost = await newPost.save(); // الحفظ في MongoDB
//        res.status(201).json(savedPost); // إرجاع المنشور المحفوظ

        console.log("Received Post Data:", req.body);
        // هنا يتم حفظ المنشور في MongoDB
        // const newPost = new Post(req.body);
        // await newPost.save();
        res.status(201).json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: "Error saving post" });
    }
});
*///14.30


//14.30
// حفظ منشور جديد
router.post("/", async (req, res) => {
  try {
    const newEntry = new ExplorePostModel(req.body);
    const saved = await newEntry.save();
    res.status(201).json({ ok: true, post: saved });
  } catch (err) {
    console.error("POST Posts Error:", err);
    res.status(500).json({ ok: false, message: "Error saving post" });
  }
});

// routes/posts.ts

// حذف منشور معين بواسطة المعرف (ID)
router.delete("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const deletedPost = await ExplorePostModel.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    res.json({ ok: true, message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete Post Error:", err);
    res.status(500).json({ ok: false, message: "Server error during deletion" });
  }
});

export default router;