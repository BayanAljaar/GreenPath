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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from '@react-native-community/datetimepicker';
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
    cityName?: string;
  }>();

  const countryCode = params.countryCode ?? "";
  const countryName = params.countryName ?? "Selected country";
  const cityName = params.cityName;

  const [form, setForm] = useState<TripFormState>({
    tripName: cityName ? `${cityName}, ${countryName} – Green trip` : `${countryName} – Green trip`,
    startDate: "",
    endDate: "",
    travelStyle: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date>(new Date());
  const [endDateValue, setEndDateValue] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });

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

      // التأكد من أن التاريخ في الصيغة الصحيحة YYYY-MM-DD
      let formattedStartDate = form.startDate.trim();
      let formattedEndDate = form.endDate.trim();
      
      // تحويل التاريخ من DD/MM/YYYY إلى YYYY-MM-DD إذا لزم الأمر
      if (formattedStartDate && /^\d{2}\/\d{2}\/\d{4}$/.test(formattedStartDate)) {
        const [day, month, year] = formattedStartDate.split('/');
        formattedStartDate = `${year}-${month}-${day}`;
      }
      
      if (formattedEndDate && /^\d{2}\/\d{2}\/\d{4}$/.test(formattedEndDate)) {
        const [day, month, year] = formattedEndDate.split('/');
        formattedEndDate = `${year}-${month}-${day}`;
      }
      
      console.log('>>> Saving trip with dates:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        originalStartDate: form.startDate,
        originalEndDate: form.endDate,
      });
      
      await saveTrip({
        userName: user.userName,
        countryCode,
        countryName,
        title: form.tripName || (cityName ? `${cityName}, ${countryName} – Green trip` : `${countryName} – Green trip`),
        startDate: formattedStartDate || undefined,
        endDate: formattedEndDate || undefined,
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
              {cityName ? `${cityName}, ${countryName}` : countryName}
            </ThemedText>
            <ThemedText style={styles.countrySubtitle}>
              כאן נבנה ביחד את המסלול הירוק שלך {cityName ? `ב־${cityName}` : `ב־${countryName}`}. בהמשך נוסיף
              המלצות דינמיות, תחבורה ירוקה ומקומות לינה ידידותיים לסביבה.
            </ThemedText>

            {user && (
              <ThemedText style={styles.userLine}>
                מתכנן/ת:{" "}
                <ThemedText type="defaultSemiBold" style={styles.userName}>
                  {user.name}
                </ThemedText>
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
                <Pressable
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <ThemedText style={styles.dateInputText}>
                    {form.startDate || "Select start date"}
                  </ThemedText>
                  <ThemedText style={styles.dateInputIcon}>📅</ThemedText>
                </Pressable>
                {Platform.OS === 'ios' ? (
                  <Modal
                    visible={showStartDatePicker}
                    transparent={true}
                    animationType="slide"
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Pressable onPress={() => setShowStartDatePicker(false)}>
                            <ThemedText style={styles.modalButton}>Cancel</ThemedText>
                          </Pressable>
                          <ThemedText style={styles.modalTitle}>Select Start Date</ThemedText>
                          <Pressable
                            onPress={() => {
                              if (startDateValue) {
                                const formattedDate = startDateValue.toISOString().split('T')[0];
                                updateField("startDate", formattedDate);
                              }
                              setShowStartDatePicker(false);
                            }}
                          >
                            <ThemedText style={[styles.modalButton, styles.modalButtonDone]}>Done</ThemedText>
                          </Pressable>
                        </View>
                        <View style={styles.pickerContainer}>
                          <DateTimePicker
                            value={startDateValue}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                              if (selectedDate) {
                                setStartDateValue(selectedDate);
                              }
                            }}
                            minimumDate={new Date()}
                            style={styles.picker}
                            textColor="#000000"
                          />
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  showStartDatePicker && (
                    <DateTimePicker
                      value={startDateValue || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setStartDateValue(selectedDate);
                          const formattedDate = selectedDate.toISOString().split('T')[0];
                          updateField("startDate", formattedDate);
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )
                )}
              </View>

              <View style={styles.rowItem}>
                <ThemedText style={styles.label}>תאריך חזרה</ThemedText>
                <Pressable
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <ThemedText style={styles.dateInputText}>
                    {form.endDate || "Select end date"}
                  </ThemedText>
                  <ThemedText style={styles.dateInputIcon}>📅</ThemedText>
                </Pressable>
                {Platform.OS === 'ios' ? (
                  <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="slide"
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Pressable onPress={() => setShowEndDatePicker(false)}>
                            <ThemedText style={styles.modalButton}>Cancel</ThemedText>
                          </Pressable>
                          <ThemedText style={styles.modalTitle}>Select End Date</ThemedText>
                          <Pressable
                            onPress={() => {
                              if (endDateValue) {
                                const formattedDate = endDateValue.toISOString().split('T')[0];
                                updateField("endDate", formattedDate);
                              }
                              setShowEndDatePicker(false);
                            }}
                          >
                            <ThemedText style={[styles.modalButton, styles.modalButtonDone]}>Done</ThemedText>
                          </Pressable>
                        </View>
                        <View style={styles.pickerContainer}>
                          <DateTimePicker
                            value={endDateValue}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                              if (selectedDate) {
                                setEndDateValue(selectedDate);
                              }
                            }}
                            minimumDate={startDateValue}
                            style={styles.picker}
                            textColor="#000000"
                          />
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  showEndDatePicker && (
                    <DateTimePicker
                      value={endDateValue || (startDateValue || new Date())}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setEndDateValue(selectedDate);
                          const formattedDate = selectedDate.toISOString().split('T')[0];
                          updateField("endDate", formattedDate);
                        }
                      }}
                      minimumDate={startDateValue || new Date()}
                    />
                  )
                )}
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  countryCard: {
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  countryTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1e40af",
  },
  countrySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    color: "#1e3a8a",
    opacity: 0.9,
  },
  userLine: {
    marginTop: 12,
    fontSize: 15,
    color: "#1e40af",
    fontWeight: "500",
  },
  userName: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  formCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1f2937",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#374151",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    fontSize: 15,
    color: "#1f2937",
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateInputText: {
    fontSize: 15,
    color: "#1f2937",
    flex: 1,
  },
  dateInputIcon: {
    fontSize: 18,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "white",
  },
  chipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  actionsRow: {
    marginTop: 24,
    alignItems: "center",
  },
  saveButton: {
    minWidth: 240,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#0f766e",
    alignItems: "center",
    shadowColor: "#0f766e",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  savedMessage: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    padding: 12,
    backgroundColor: "#d1fae5",
    borderRadius: 12,
    color: "#065f46",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalButton: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  modalButtonDone: {
    color: "#0f766e",
    fontWeight: "700",
  },
  pickerContainer: {
    height: 250,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  picker: {
    width: "100%",
    height: 250,
  },
});
