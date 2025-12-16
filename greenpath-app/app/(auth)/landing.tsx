// app/(auth)/landing.tsx
import React from "react";
import { StyleSheet, View, ImageBackground, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <ImageBackground
        source={{
          uri: "https://images.pexels.com/photos/5726889/pexels-photo-5726889.jpeg",
        }}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <ThemedText type="title" style={styles.title}>
            GreenPath 🌿
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            תכנון טיולים ירוקים, חכמים ונוחים – במקום אחד.
          </ThemedText>
        </View>
      </ImageBackground>

      <ScrollView
        style={styles.contentWrapper}
        contentContainerStyle={styles.contentInner}
      >
        {/* כותרת קצרה */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          למה שווה להירשם?
        </ThemedText>

        {/* שלוש “קוביות יתרון” */}
        <View style={styles.benefitsRow}>
          <View style={styles.benefitCard}>
            <ThemedText style={styles.benefitIcon}>🌿</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.benefitTitle}>
              טיולים ירוקים
            </ThemedText>
            <ThemedText style={styles.benefitText}>
              מסלולים שמתחשבים בתחבורה ציבורית, הליכה ומקומות טבע נעימים.
            </ThemedText>
          </View>

          <View style={styles.benefitCard}>
            <ThemedText style={styles.benefitIcon}>📚</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.benefitTitle}>
              ידע לכל יעד
            </ThemedText>
            <ThemedText style={styles.benefitText}>
              תקציר על המדינה, ערים וכפרים ירוקים וטיפים חשובים לפני נסיעה.
            </ThemedText>
          </View>

          <View style={styles.benefitCard}>
            <ThemedText style={styles.benefitIcon}>💾</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.benefitTitle}>
              שמירת הטיולים
            </ThemedText>
            <ThemedText style={styles.benefitText}>
              הרשמה מאפשרת לשמור תכניות טיול, לחזור אליהן ולהמשיך מאיפה שעצרת.
            </ThemedText>
          </View>
        </View>

        {/* כפתורי פעולה */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={[styles.mainButton, styles.primaryButton]}
            onPress={() => router.push("/(auth)/register")}
          >
            <ThemedText style={styles.mainButtonText}>
              יצירת חשבון חדש
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.mainButton, styles.secondaryButton]}
            onPress={() => router.push("/(auth)/login")}
          >
            <ThemedText style={styles.secondaryButtonText}>
              יש לי כבר חשבון – כניסה
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.ghostButton}
            onPress={() => {
              // כניסה כאורחת – הולכים ישר למסך הבית (tabs)
              router.replace("/(tabs)");
            }}
          >
            <ThemedText style={styles.ghostButtonText}>
              להמשיך כאורחת ללא שמירת טיולים
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f7fb",
  },
  hero: {
    height: 260,
    width: "100%",
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    color: "white",
    fontSize: 30,
    marginBottom: 4,
  },
  subtitle: {
    color: "white",
    fontSize: 15,
    opacity: 0.92,
  },
  contentWrapper: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  benefitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  benefitIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  benefitTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  buttonsContainer: {
    marginTop: 8,
    gap: 10,
  },
  mainButton: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#1f9d55",
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#1f9d55",
  },
  mainButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#1f9d55",
    fontWeight: "600",
    fontSize: 14,
  },
  ghostButton: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: 12,
    opacity: 0.75,
  },
});
