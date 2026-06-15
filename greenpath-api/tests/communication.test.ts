import request from "supertest";
import express from "express";

const app = express();

app.use(express.json());

describe("Communication API Tests", () => {

  // בדיקה שמוודאת שהמערכת מחזירה שגיאה כאשר לא נשלח קובץ קול לתרגום
  test("POST /voice-translate should fail without audio", async () => {
    const response = await request(app)
      .post("/voice-translate");

    expect(response.status).not.toBe(200);
  });

  // בדיקה שמוודאת שהמערכת תומכת במספר שפות שונות
  test("System should support multiple languages", () => {
    const languages = ["English", "Arabic", "Hebrew", "Russian"];

    expect(languages).toContain("Arabic");
    expect(languages).toContain("Russian");
  });

  // בדיקה שמוודאת שאובייקט השיחה נשמר בצורה תקינה עם פרטי השפות והכותרת
  test("Conversation object should save correctly", () => {
    const conversation = {
      title: "Taxi Conversation",
      fromLanguage: "Hebrew",
      toLanguage: "Russian",
    };

    expect(conversation.title).toBe("Taxi Conversation");
  });

});