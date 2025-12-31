// app/(auth)/login.tsx
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable,Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { api } from '../../services/apiClient';
import { loginUser } from '../../services/apiClient';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState("");

  // 2. أضيفي هذه الدالة المساعدة خارج المكون أو في آخره
  const showNotify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      // في المتصفح نستخدم alert العادية
      alert(`${title}: ${message}`);
    } else {
      // في الموبايل نستخدم Alert الخاصة بـ React Native
      Alert.alert(title, message);
    }
  }
  const handleSignIn = async () => {
    if (!emailOrUser || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      // 1. طلب تسجيل الدخول من السيرفر
      const response = await loginUser({ 
        userNameOrEmail: emailOrUser, 
        password: password 
      });

      // 2. التحقق من رد السيرفر (بناءً على ملف auth.ts الخاص بك)
      if (response.ok) {
        // ✅ إذا البيانات صحيحة، نحفظ المستخدم الحقيقي القادم من MongoDB
        await setUser(response.user); 
        router.replace('/(tabs)');
      } else {
        // ❌ إذا البيانات خاطئة، نظهر رسالة الخطأ القادمة من السيرفر
        Alert.alert("Login Failed", response.message || "Invalid credentials");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Connection to server failed");
    }
  };
  return (
    <ThemedView style={styles.screen}>
      <ThemedText type="title" style={styles.title}>
        LOGIN  
      </ThemedText>

      <View style={styles.form}>
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
      onPress={async () => {
        // 1. التحقق من إدخال البيانات
        if (!email || !password) {
          showNotify("Missing Info", "Please enter email and password");
          //Alert.alert("Error", "Please enter email and password");
          return;
        }

        try {
          // 2. استدعاء السيرفر (تأكدي من استيراد api من apiClient)
          const response = await api.post("/auth/login", {
            userNameOrEmail: email,
            password: password
          });

         const serverData = response.data;

          if (serverData.ok) {
            // ✅ نجح الدخول: نحفظ البيانات الحقيقية من MongoDB
            setUser({
              id: serverData.user.id,
              userName: serverData.user.userName,
              fullName: serverData.user.fullName, // استخدام المسمى الصحيح fullName
              email: serverData.user.email,
              token: serverData.user.token,
              profilePicture: serverData.user.profilePicture, // ⬅️ هذا السطر هو مفتاح الحل عند إعادة الدخول!
            });
            console.log("البيانات القادمة من السيرفر:", serverData.user);
            Alert.alert("Welcome!", "Login successful");
            router.replace("/(tabs)"); 
          } else {
            showNotify("Login Failed", serverData.message || "Invalid credentials");
          }
        } catch (error: any) {
          // 💡 هنا يكمن السر: نتحقق إذا كان السيرفر قد أرسل رداً فعلياً
          if (error.response) {
            // السيرفر رد ولكن بحالة خطأ (مثل 401 للرمز الخاطئ)
            const serverMessage = error.response.data.message || "Invalid Credentials";
            showNotify("Login Failed", serverMessage);
          } else if (error.request) {
            // تم إرسال الطلب ولكن لم يصل رد (مشكلة إنترنت أو سيرفر طافئ)
            showNotify("Error", "Server is down. Please check your backend terminal.");
          } else {
            // خطأ آخر غير متوقع
            showNotify("Error", "An unexpected error occurred.");
          }
        }
      }}
    >

  <ThemedText style={styles.submitText}>Login</ThemedText>
</Pressable>

        <Pressable onPress={() => router.push("/(auth)/register")}>
          <ThemedText style={styles.linkText}>
           Don't have an account? Sign up! 
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
    
  );
}

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
    borderWidth: 2,
    borderColor: "#1f9d55",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "#1f9d55",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  submitText: {
    color: "white",
    fontWeight: "600",
  },
  linkText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
});
