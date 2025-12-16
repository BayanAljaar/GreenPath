// app/country/[code]/cities.tsx

// app/country/[code]/cities.tsx
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Image,
  View,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "../../../components/themed-view";
import { ThemedText } from "../../../components/themed-text";

type City = {
  name: string;
  description: string;
  image: string;
};

const CITY_DATA: Record<string, City[]> = {
  TR: [
    {
      name: "Istanbul",
      description: "A beautiful historical city with Bosphorus, bazaars and culture.",
      image: "https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg",
    },
    {
      name: "Antalya",
      description: "Beaches, waterfalls and green mountains.",
      image: "https://images.pexels.com/photos/386148/pexels-photo-386148.jpeg",
    },
  ],
  IL: [
    {
      name: "Jerusalem",
      description: "Historic city with spiritual energy and unique architecture.",
      image: "https://images.pexels.com/photos/672451/pexels-photo-672451.jpeg",
    },
    {
      name: "Tel Aviv",
      description: "Modern coastal city with nightlife, food and beaches.",
      image: "https://images.pexels.com/photos/1722183/pexels-photo-1722183.jpeg",
    },
  ],
  GR: [
    {
      name: "Athens",
      description: "Ancient history, food culture and warm atmosphere.",
      image: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg",
    },
    {
      name: "Santorini",
      description: "Iconic white houses, blue sea and amazing sunsets.",
      image: "https://images.pexels.com/photos/3601453/pexels-photo-3601453.jpeg",
    },
  ],
};

export default function CitiesScreen() {
  const router = useRouter();
  const { code, name } = useLocalSearchParams<{ code: string; name?: string }>();
  const upperCode = (code || "").toUpperCase();

  const cities = CITY_DATA[upperCode] || [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <ThemedText type="title" style={styles.title}>
          {name} — Recommended Cities
        </ThemedText>

        {cities.map((city, idx) => (
          <Pressable
            key={idx}
            style={styles.cityCard}
            onPress={() =>{
            // כאן בהמשך ננווט למסך עיר, כשתהיה לנו כתובת חוקית
            // לעכשיו – רק נציג הודעה קטנה
                    alert(`City screen for ${city.name} – coming soon ✨`);
                }
            }
          >
            <Image source={{ uri: city.image }} style={styles.cityImage} />
            <View style={styles.cityTextContainer}>
              <ThemedText type="defaultSemiBold">{city.name}</ThemedText>
              <ThemedText style={styles.cityDesc}>{city.description}</ThemedText>
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>⬅ Back to country</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  title: {
    marginTop: 20,
    marginLeft: 16,
    marginBottom: 10,
  },
  cityCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
    overflow: "hidden",
  },
  cityImage: {
    width: "100%",
    height: 160,
  },
  cityTextContainer: {
    padding: 12,
  },
  cityDesc: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
  },
  backBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  backText: {
    opacity: 0.8,
    textDecorationLine: "underline",
  },
});
