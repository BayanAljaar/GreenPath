// app/city/[name].tsx

import React from "react";
import {
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "../../components/themed-view";
import { ThemedText } from "../../components/themed-text";

// מידע לדוגמה לכל עיר – אפשר להרחיב בהמשך
const CITY_EXTRA: Record<
  string,
  {
    hero: string;
    description: string;
    ecoTips: string[];
    highlights: { title: string; description: string }[];
  }
> = {
  Jerusalem: {
    hero: "https://images.pexels.com/photos/672451/pexels-photo-672451.jpeg",
    description:
      "עיר היסטורית עם טבע מדברי מסביב, שווקים, סמטאות, מסלולים ומוזיאונים.",
    ecoTips: [
      "השתמשי ברכבת הקלה כדי להפחית זיהום.",
      "בקרי בפארקים עירוניים – גן סאקר, עמק הצבאים.",
      "תמכי בעסקים ירוקים ובמסעדות מקומיות.",
    ],
    highlights: [
      {
        title: "עמק הצבאים",
        description:
          "שמורת טבע עירונית נדירה – מושלם לטיול רגוע, ציפורים וצל.",
      },
      {
        title: "העיר העתיקה",
        description:
          "היסטוריה, תרבות ורוחניות – מומלץ להגיע בשעות הבוקר.",
      },
    ],
  },

  TelAviv: {
    hero: "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg",
    description:
      "עיר חוף צעירה ואנרגטית עם סצנה ירוקה – שבילי אופניים, חופים ושווקים.",
    ecoTips: [
      "לכי ברגל לאורך הטיילת – נקי, נעים וחוסך דלק.",
      "בקרי בשוק לוינסקי או הכרמל – תמיכה בעסקים מקומיים.",
      "שיקלי אופניים של תל־אופן – נוח וירוק.",
    ],
    highlights: [
      {
        title: "נמל תל אביב",
        description: "טיילת מדהימה עם מסעדות ונוף לים.",
      },
      {
        title: "נווה צדק",
        description: "רחובות ציוריים, גלריות וחנויות בוטיק.",
      },
    ],
  },
};

export default function CityScreen() {
  const router = useRouter();

  const { name, image, desc } = useLocalSearchParams<{
    name: string;
    image?: string;
    desc?: string;
  }>();

  const cityName = name?.toString() ?? "";
  const info = CITY_EXTRA[cityName] || {
    hero: image || "",
    description:
      desc || "עיר מעניינת עם טבע, תרבות ופוטנציאל למסלול ירוק 🌱",
    ecoTips: [
      "לכי ברגל כשאפשר – זה בריא וחוסך זיהום.",
      "תמכי בעסקים מקומיים ובאוכל טרי.",
    ],
    highlights: [],
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* תמונת עליונה */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: info.hero }}
            style={styles.hero}
          />
          <View style={styles.overlay} />
          <View style={styles.heroContent}>
            <ThemedText type="title" style={styles.cityTitle}>
              {cityName}
            </ThemedText>
            <ThemedText style={styles.citySubtitle}>
              Eco-Friendly City Guide 🌱
            </ThemedText>
          </View>
        </View>

        {/* תאור */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          למה לבקר בעיר?
        </ThemedText>
        <ThemedText style={styles.text}>{info.description}</ThemedText>

        {/* טיפים ירוקים */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          טיפים ירוקים בעיר 🌿
        </ThemedText>
        {info.ecoTips.map((t, i) => (
          <View key={i} style={styles.row}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.text}>{t}</ThemedText>
          </View>
        ))}

        {/* מקומות מיוחדים */}
        {info.highlights.length > 0 && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              מקומות שחייבים לראות
            </ThemedText>

            {info.highlights.map((h, i) => (
              <View key={i} style={styles.card}>
                <ThemedText type="defaultSemiBold">{h.title}</ThemedText>
                <ThemedText style={styles.text}>{h.description}</ThemedText>
              </View>
            ))}
          </>
        )}

        {/* כפתור מסלול ירוק */}
        <Pressable
          style={styles.routeBtn}
          onPress={() =>
            Alert.alert("בקרוב", "ניצור עבורך מסלול ירוק בעיר ✨")
          }
        >
          <ThemedText style={styles.routeBtnText}>
            בנה לי מסלול ירוק בעיר זו 🧭🌱
          </ThemedText>
        </Pressable>

        {/* Back */}
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backText}>⬅ חזרה</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  heroWrap: {
    margin: 16,
    borderRadius: 22,
    overflow: "hidden",
  },
  hero: {
    width: "100%",
    height: 220,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  cityTitle: {
    color: "white",
    fontSize: 28,
  },
  citySubtitle: {
    color: "white",
    opacity: 0.8,
  },
  sectionTitle: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  text: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 6,
  },
  bullet: {
    fontSize: 16,
    marginRight: 6,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  routeBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#1f9d55",
    alignItems: "center",
  },
  routeBtnText: {
    color: "white",
    fontSize: 15,
  },
  back: {
    marginTop: 16,
    alignItems: "center",
  },
  backText: {
    opacity: 0.7,
    textDecorationLine: "underline",
  },
});
