// app/(auth)/login.tsx
import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ThemedView style={styles.screen}>
      <ThemedText type="title" style={styles.title}>
        כניסה לחשבון
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
          onPress={() => {
            // בעתיד: בדיקת סיסמה ב־API. עכשיו – דמו:
            const nameFromEmail =
              email.split("@")[0] || "Green traveler";
            setUser({ 
              name: nameFromEmail, 
              userName: nameFromEmail.replace(/\s/g, '_'), // דמו
              token: "dummy-login-token-123", // דמו
            });
            router.replace("/(tabs)");
          }}
        >
          <ThemedText style={styles.submitText}>כניסה</ThemedText>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/register")}>
          <ThemedText style={styles.linkText}>
            עדיין אין לך חשבון? הרשמה
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
