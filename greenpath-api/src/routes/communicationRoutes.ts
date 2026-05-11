import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import CommunicationConversation from "../models/CommunicationConversation";

dotenv.config();

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".m4a";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/voice-translate", upload.single("audio"), async (req, res) => {
  try {
    const { fromLanguage, toLanguage } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Audio file is required" });
    }

    const audioPath = req.file.path;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "gpt-4o-mini-transcribe",
    });

    const originalText = transcription.text;

    const translation = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Translate from ${fromLanguage} to ${toLanguage}. Return only the translated text.`,
        },
        {
          role: "user",
          content: originalText,
        },
      ],
    });

    fs.unlinkSync(audioPath);

    return res.json({
      originalText,
      translatedText: translation.choices[0].message.content || "",
      fromLanguage,
      toLanguage,
    });
  } catch (error) {
    console.error("Voice translation error:", error);
    return res.status(500).json({ message: "Voice translation failed" });
  }
});
router.get("/conversations", async (_req, res) => {
  try {
    const conversations = await CommunicationConversation.find()
      .sort({ updatedAt: -1 });

    return res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ message: "Failed to load conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { title, fromLanguage, toLanguage } = req.body;

    const conversation = await CommunicationConversation.create({
      title: title || "New Conversation",
      fromLanguage,
      toLanguage,
      lastMessage: "No messages yet",
      messages: [],
    });

    return res.status(201).json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({ message: "Failed to create conversation" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sender,
      originalText,
      translatedText,
      originalLang,
      translatedLang,
      time,
    } = req.body;

    const conversation = await CommunicationConversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    conversation.messages.push({
      sender,
      originalText,
      translatedText,
      originalLang,
      translatedLang,
      time,
      createdAt: new Date(),
    });

    conversation.lastMessage = translatedText;
    if (
  conversation.title === "New Conversation" &&
  translatedText
) {
  conversation.title =
    translatedText.length > 30
      ? translatedText.slice(0, 30) + "..."
      : translatedText;
}
    conversation.fromLanguage = originalLang;
    conversation.toLanguage = translatedLang;

    await conversation.save();

    return res.json(conversation);
  } catch (error) {
    console.error("Add message error:", error);
    return res.status(500).json({ message: "Failed to save message" });
  }
});
router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await CommunicationConversation.findByIdAndDelete(id);

    return res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return res.status(500).json({ message: "Failed to delete conversation" });
  }
});
router.put("/conversations/:conversationId/messages/:messageId", async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { originalText, fromLanguage, toLanguage } = req.body;

    const conversation = await CommunicationConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

const message = conversation.messages.find(
  (msg: any) => msg._id?.toString() === messageId
);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const translation = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Translate from ${fromLanguage} to ${toLanguage}. Return only the translated text.`,
        },
        {
          role: "user",
          content: originalText,
        },
      ],
    });

    message.originalText = originalText;
    message.translatedText = translation.choices[0].message.content || "";
    message.originalLang = fromLanguage;
    message.translatedLang = toLanguage;

    conversation.lastMessage = message.translatedText;

    await conversation.save();

    return res.json(conversation);
  } catch (error) {
    console.error("Edit message error:", error);
    return res.status(500).json({ message: "Failed to edit message" });
  }
});
export default router;