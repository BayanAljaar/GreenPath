// app/trip/plan.tsx
// app/trip/plan.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { saveTrip } from "../../services/apiClient";

type TripFormState = {
  tripName: string;
  startDate: string;
  endDate: string;
  travelStyle: string;
  notes: string;
};

export default function TripPlanScreen() {
  const router = useRouter();
  const { user } = useUser();

  const params = useLocalSearchParams<{
    countryCode?: string;
    countryName?: string;
  }>();

  const countryCode = params.countryCode ?? "";
  const countryName = params.countryName ?? "Selected country";

  const [form, setForm] = useState<TripFormState>({
    tripName: `${countryName} – Green trip`,
    startDate: "",
    endDate: "",
    travelStyle: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // אם אין משתמש – נחזיר למסך ההרשמה/כניסה
  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/landing");
    }
  }, [user, router]);

  const updateField = (key: keyof TripFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickStyle = (style: string) => {
    updateField("travelStyle", style);
  };
  

  // ⭐ פה אנחנו באמת שומרים טיול בבקאנד – POST /trips
  const handleSaveDraft = async () => {
    if (!user) {
      router.replace("/(auth)/landing");
      return;
    }

    try {
      setSaving(true);
      setSavedMessage(null);

      await saveTrip({
        userName: user.name,
        countryCode,
        countryName,
        title: form.tripName || `${countryName} – Green trip`,
        startDate: form.startDate,
        endDate: form.endDate,
        style: form.travelStyle || "כללי",
        notes: form.notes,
      });

      setSavedMessage("✅ הטיול נשמר בהצלחה בבקאנד.");
    } catch (err) {
      console.error("Failed to save trip:", err);
      setSavedMessage("❌ אירעה שגיאה בשמירת הטיול. נסי שוב מאוחר יותר.");
    } finally {
      setSaving(false);
      // אחרי ~2.5 שניות נעלים את ההודעה
      setTimeout(() => setSavedMessage(null), 2500);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={styles.screen}>
        {/* כותרת עליונה של המסך */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>
            תכנון טיול ירוק
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* תיבה עם מידע על המדינה והמשתמש */}
          <ThemedView style={styles.countryCard}>
            <ThemedText type="defaultSemiBold" style={styles.countryTitle}>
              {countryName}
            </ThemedText>
            <ThemedText style={styles.countrySubtitle}>
              כאן נבנה ביחד את המסלול הירוק שלך ב־{countryName}. בהמשך נוסיף
              המלצות דינמיות, תחבורה ירוקה ומקומות לינה ידידותיים לסביבה.
            </ThemedText>

            {user && (
              <ThemedText style={styles.userLine}>
                מתכנן/ת:{" "}
                <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
              </ThemedText>
            )}
          </ThemedView>

          {/* פרטי הטיול */}
          <ThemedView style={styles.formCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              פרטי טיול בסיסיים
            </ThemedText>

            <ThemedText style={styles.label}>שם הטיול</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="למשל: טיול אביב ירוק ביוון"
              value={form.tripName}
              onChangeText={(text) => updateField("tripName", text)}
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>תאריך יציאה</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="2025-04-10"
                  value={form.startDate}
                  onChangeText={(text) => updateField("startDate", text)}
                />
              </View>

              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>תאריך חזרה</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="2025-04-18"
                  value={form.endDate}
                  onChangeText={(text) => updateField("endDate", text)}
                />
              </View>
            </View>

            <ThemedText style={styles.label}>סגנון הטיול</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="למשל: הליכות בטבע, כפרים שקטים, חופים רגועים..."
              value={form.travelStyle}
              onChangeText={(text) => updateField("travelStyle", text)}
            />

            {/* צ'יפים מהירים לסגנון */}
            <View style={styles.chipsRow}>
              {["טבע רגוע", "עירוני ירוק", "משולב", "משפחתי"].map((chip) => (
                <Pressable
                  key={chip}
                  style={[
                    styles.chip,
                    form.travelStyle === chip && styles.chipSelected,
                  ]}
                  onPress={() => handleQuickStyle(chip)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      form.travelStyle === chip && styles.chipTextSelected,
                    ]}
                  >
                    {chip}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={styles.label}>
              הערות ורעיונות למסלול
            </ThemedText>
            <TextInput
              style={[styles.input, styles.notesInput]}
              multiline
              placeholder="איזה סוג חוויות חשוב לך? מה חשוב שנזכור כשנבנה את המסלול?"
              value={form.notes}
              onChangeText={(text) => updateField("notes", text)}
            />
          </ThemedView>

          {/* כפתור שמירה */}
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.saveButton}
              onPress={handleSaveDraft}
              disabled={saving}
            >
              <ThemedText style={styles.saveButtonText}>
                {saving ? "שומר טיול..." : "שמירת טיול כטיוטה"}
              </ThemedText>
            </Pressable>
          </View>

          {savedMessage && (
            <ThemedText style={styles.savedMessage}>{savedMessage}</ThemedText>
          )}

          {/* בהמשך נוסיף פה: רשימת ימים, הצעת מסלולים, תחבורה ירוקה וכו' */}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f7fb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "white",
  },
  backButtonText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  countryCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
  },
  countryTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  countrySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  userLine: {
    marginTop: 10,
    fontSize: 13,
  },
  formCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    fontSize: 13,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowItem: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
  },
  chipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  chipText: {
    fontSize: 11,
    color: "#374151",
  },
  chipTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  actionsRow: {
    marginTop: 16,
    alignItems: "center",
  },
  saveButton: {
    minWidth: 220,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#0f766e",
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  savedMessage: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
});
