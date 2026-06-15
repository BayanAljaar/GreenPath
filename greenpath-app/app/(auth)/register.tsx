// app/(auth)/register.tsx
// app/(auth)/register.tsx
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { registerUser } from "../../services/apiClient"; // ⬅️ استيراد الدالة الجديدة
// نقوم باستخدام ../ للعودة من مجلد (auth) إلى مجلد app الرئيسي

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
        userName, 
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

setUser(userToSave);
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
        Creating GreenPath Account
      </ThemedText>

      <View style={styles.form}>
        <TextInput
          placeholder="Full name"
          placeholderTextColor="#999"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          placeholder="Username"
          placeholderTextColor="#999"
          style={styles.input}
          value={userName}
          onChangeText={setUserName}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          style={styles.input}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
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
            {loading ? "Sending..." : "Save and Continue "}
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/login")}>
          <ThemedText style={styles.linkText}>
            Already have a account ? LOGIN...
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
    marginBottom: 20,
    color: "#668172ff",
  },
  form: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: "#1f9d55",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
    shadowColor: "#145a1aff",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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