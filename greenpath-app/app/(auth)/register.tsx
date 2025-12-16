// app/(auth)/register.tsx
// app/(auth)/register.tsx
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { registerUser } from "../../services/apiClient"; // ⬅️ استيراد الدالة الجديدة

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useUser();

  const [fullName, setFullName] = useState("");  
  const [userName, setUserName] = useState(""); // ⬅️ إضافة هذا
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ⬅️ جديد: حالة التحميل
  
  const handleRegister = async () => {
    if (!fullName || !userName || !email || !password) {
      Alert.alert("خطأ", "الرجاء تعبئة جميع الحقول المطلوبة.");
      return;
    }

    setLoading(true);
    try {
      // 🏆 الاتصال الحقيقي بمسار /auth/register
      const newUserResponse = await registerUser({
        fullName,
        userName, // تمرير اسم المستخدم
        email,
        password,
      });

      // ✅ نجاح التسجيل: حفظ المستخدم في السياق والانتقال
      // 🏆 حفظ البيانات الحقيقية (fullName, userName, token)
      const userToSave = {
        name: newUserResponse.fullName, 
        userName: newUserResponse.userName,
        token: newUserResponse.token, // يُفترض أنه تم إرجاعه من الخادم
      };

      setUser(userToSave); // يتم حفظه في Context و AsyncStorage
      
      router.replace("/(tabs)"); // الانتقال إلى الصفحة الرئيسية
      
    }catch (error: any) {
      console.error("Registration failed:", error.message);
      Alert.alert(
        "فشل التسجيل",
        error.message || "حدث خطأ أثناء محاولة التسجيل. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedText type="title" style={styles.title}>
        יצירת חשבון GreenPath
      </ThemedText>

      <View style={styles.form}>
        <TextInput
          placeholder="Full name"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          placeholder="Username" // ⬅️ إضافة هذا الحقل
          style={styles.input}
          value={userName}
          onChangeText={setUserName}
        />
        <TextInput
          placeholder="Email"
          style={styles.input}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={styles.submitButton}
          onPress={handleRegister} // ⬅️ استدعاء الدالة الجديدة
          disabled={loading}
        >
          <ThemedText style={styles.submitText}>
            {loading ? "جاري الإرسال..." : "הרשמה והמשך"}
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/login")}>
          <ThemedText style={styles.linkText}>
            יש לך כבר חשבון? כניסה
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

// styles  אפשר להשאיר.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f3f7fb",
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7e2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "white",
  },
  submitButton: {
    backgroundColor: "#1f9d55",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    textAlign: "center",
    marginTop: 10,
    color: "#1f9d55",
    fontSize: 14,
  },
});