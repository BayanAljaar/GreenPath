import mongoose, { Schema, Document } from "mongoose";

export interface ICommunicationMessage {
  sender: "me" | "other";
  originalText: string;
  translatedText: string;
  originalLang: string;
  translatedLang: string;
  time: string;
  createdAt: Date;
}

export interface ICommunicationConversation extends Document {
  userId?: string;
  title: string;
  fromLanguage: string;
  toLanguage: string;
  lastMessage: string;
  messages: ICommunicationMessage[];
}

const CommunicationMessageSchema = new Schema<ICommunicationMessage>({
  sender: { type: String, enum: ["me", "other"], required: true },
  originalText: { type: String, required: true },
  translatedText: { type: String, required: true },
  originalLang: { type: String, required: true },
  translatedLang: { type: String, required: true },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const CommunicationConversationSchema =
  new Schema<ICommunicationConversation>(
    {
      userId: { type: String },
      title: { type: String, required: true },
      fromLanguage: { type: String, required: true },
      toLanguage: { type: String, required: true },
      lastMessage: { type: String, default: "No messages yet" },
      messages: [CommunicationMessageSchema],
    },
    { timestamps: true }
  );

export default mongoose.model<ICommunicationConversation>(
  "CommunicationConversation",
  CommunicationConversationSchema
);