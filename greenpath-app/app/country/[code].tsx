// app/country/[code].tsx
// app/country/[code].tsx

import React from "react";
import {
  ScrollView,
  StyleSheet,
  Image,
  View,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "../../components/themed-view";
import { ThemedText } from "../../components/themed-text";

// מידע נוסף לכל מדינה (תמונות, טקסטים, טיפים וכו')
type ExtraInfo = {
  heroImage: string;
  description: string;
  ecoTips: string[];
  highlights: { title: string; description: string }[];
  bestSeason?: string;
};

const EXTRA_COUNTRY_INFO: Record<string, ExtraInfo> = {
  TR: {
    heroImage:
      "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg",
    description:
      "טורקיה משלבת טבע, היסטוריה וים – נופים הרריים, קו חוף ארוך ושווקים צבעוניים.",
    bestSeason: "אביב וסתיו – מזג אוויר נעים ופחות צפוף.",
    ecoTips: [
      "העדיפי מלונות ירוקים שמצהירים על שימוש באנרגיה מתחדשת.",
      "בנסיעות קצרות בתוך העיר – לכי ברגל או השתמשי בתחבורה ציבורית.",
      "הביאי בקבוק רב־פעמי במקום לקנות בקבוקי פלסטיק.",
    ],
    highlights: [
      {
        title: "אנטליה – קו חוף וטבע",
        description:
          "עיר חוף מלאה בריזורטים, מסלולי הליכה והרבה חופים יפים – אפשר לשלב מנוחה עם טיולי טבע.",
      },
      {
        title: "קפדוקיה",
        description:
          "נוף ייחודי עם סלעים מעוצבים ובלוני אוויר חם – מושלם לזריחה ירוקה ושקטה.",
      },
    ],
  },
  IL: {
    heroImage:
      "https://images.pexels.com/photos/672451/pexels-photo-672451.jpeg",
    description:
      "ישראל מציעה שילוב נדיר של טבע, היסטוריה, ים ומדבר – במרחקי נסיעה קצרים.",
    bestSeason: "אביב וסתיו – פחות חם ויותר נעים לטיולים רגליים.",
    ecoTips: [
      "העדיפי תחבורה ציבורית או רכבת בין ערים במקום רכב פרטי.",
      "הצטרפי למסלולים מסומנים ושמרי על החי והצומח.",
      "הקפידי לקחת את הזבל איתך ולהשאיר את הטבע נקי יותר ממה שהיה.",
    ],
    highlights: [
      {
        title: "הגליל והגולן",
        description:
          "מגוון מסלולי מים, יערות ונקודות תצפית – גן עדן לחובבי טבע.",
      },
      {
        title: "מדבר יהודה",
        description:
          "נוף מדברי עוצמתי, שקיעות מדהימות ומסלולים קצרים וארוכים.",
      },
    ],
  },
  GR: {
    heroImage:
      "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg",
    description:
      "יוון היא שילוב של איים, כפרים לבנים וים טורקיז – מושלם לטיולי טבע רגועים.",
    bestSeason: "מאי–יוני או ספטמבר–אוקטובר.",
    ecoTips: [
      "תני עדיפות לכפרים קטנים ולא רק ליעדים תיירותיים מוצפים.",
      "תמכי בעסקים מקומיים – אוכל, לינה וסיורים.",
      "שמרי על החופים נקיים – במיוחד פלסטיק.",
    ],
    highlights: [
      {
        title: "איי יוון",
        description:
          "איים ירוקים וכפרים שקטים – מושלם לחופשה איטית וירוקה.",
      },
      {
        title: "הרי יוון",
        description:
          "מסלולי הליכה, נהרות ונקודות תצפית – מושלם למי שמחפש טבע ולא רק ים.",
      },
    ],
  },
  // אפשר להוסיף כאן מדינות נוספות בהמשך...
};

export default function CountryScreen() {
  const router = useRouter();

  // פרמטרים מה־URL (הגיעו ממסך הבית)
  const { code, name, region, language, currency, flag } =
    useLocalSearchParams<{
      code: string;
      name?: string;
      region?: string;
      language?: string;
      currency?: string;
      flag?: string;
    }>();

  const upperCode = (code || "").toString().toUpperCase();

  // אם אין מידע ב־EXTRA_COUNTRY_INFO – נשתמש בברירת מחדל
  const info: ExtraInfo =
    EXTRA_COUNTRY_INFO[upperCode] || {
      heroImage:
        "https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg",
      description:
        "מדינה עם פוטנציאל למסלולים ירוקים, טבע, תרבות ואוכל מקומי.",
      bestSeason: undefined,
      ecoTips: [
        "העדיפי תחבורה ציבורית, רכיבה על אופניים והליכה.",
        "בדקי אפשרויות לינה אקולוגיות או משפחתיות מקומיות.",
      ],
      highlights: [],
    };

  const displayName = (name || upperCode).toString();

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* אזור עליון – תמונת Hero */}
        {/*<View style={styles.heroWrapper}>
          <Image source={{ uri: info.heroImage }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <ThemedText style={styles.flagText}>
              {flag || "🌍"}
            </ThemedText>
            <ThemedText type="title" style={styles.countryName}>
              {displayName}
            </ThemedText>
            <ThemedText style={styles.metaText}>
              {[region, language, currency].filter(Boolean).join(" · ")}
            </ThemedText>
          </View>
        </View>*/}

        {/* תיאור כללי */}
        {/*<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          למה לטייל כאן?
        </ThemedText>
        <ThemedText style={styles.paragraph}>{info.description}</ThemedText>
        */}
        {/* עונה מומלצת */}
        {/*{info.bestSeason && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              עונה מומלצת
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              {info.bestSeason}
            </ThemedText>
          </>
        )}*/}

        {/* טיפים ירוקים */}
        {/*<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          טיפים ירוקים למסע שלך 🌱
        </ThemedText>
        {info.ecoTips.map((tip, idx) => (
          <View key={idx} style={styles.tipRow}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.tipText}>{tip}</ThemedText>
          </View>
        ))}*/}

        {/* מוקדים ירוקים */}
        {/*{info.highlights.length > 0 && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              מוקדים ירוקים מומלצים
            </ThemedText>
            {info.highlights.map((h, idx) => (
              <View key={idx} style={styles.card}>
                <ThemedText type="defaultSemiBold">{h.title}</ThemedText>
                <ThemedText style={styles.cardText}>
                  {h.description}
                </ThemedText>
              </View>
            ))}
          </>
        )}*/}

        {/* כפתור מסלול ירוק */}
        {/*<Pressable
          style={styles.routeButton}
          onPress={() => {
            Alert.alert(
              "בקרוב ✨",
              "נבנה עבורך מסלול ירוק חכם בעזרת AI – לפי זמן, תקציב והעדפות (טבע, ים, עיר)."
            );
          }}
        >*/}
        {/* כפתור לעמוד הערים במדינה */}
        {/*<Pressable
        style={styles.citiesButton}
        onPress={() => {
            router.push({
            pathname: "/country/[code]/cities" as const,
            params: {
                code: upperCode,
                name: displayName,
                flag: flag || "🌍",
            },
            });
        }}
>
        <ThemedText style={styles.citiesButtonText}>
            הציגי ערים מומלצות במדינה זו 🏙️
        </ThemedText>
        </Pressable>*/}
                    {/* כפתור מעבר למסך ערים במדינה */}
        {/*<Pressable
          style={styles.routeButton}
          onPress={() => {
            router.push({
              pathname: "/country/[code]/cities",
              params: { code: upperCode },
            });
          }}
        >
          <ThemedText style={styles.routeButtonText}>
            הצג ערים ירוקות במדינה זו 🏙️🌿
          </ThemedText>
        </Pressable>

          <ThemedText style={styles.routeButtonText}>
            בני לי מסלול ירוק למדינה זו 🧭🌱
          </ThemedText>
        </Pressable>*/}
        {/*<Pressable
            style={styles.routeButton}
            onPress={() =>
                router.push({
                pathname: "/country/[code]/cities",
                params: { code, name },
                })
            }
            >
            <ThemedText style={styles.routeButtonText}>
                הצג ערים במדינה זו 🏙️
            </ThemedText>
            </Pressable>*/}

            {/* 🏆 زر واحد واضح: التوجيه لبناء المسار في صفحة plan.tsx */}
        <Pressable
          style={styles.routeButton} // استخدام نفس ستايل الزر الرئيسي
          onPress={() => {
            router.push({
              // ⬅️ التوجيه إلى المسار plan
              pathname: "/(tabs)/plan", 
              params: {
                countryCode: upperCode,
                countryName: displayName,
              },
            });
          }}
        >
          <ThemedText style={styles.routeButtonText}>
            Planning and creating a tourist route in {displayName} 🧭🌱
          </ThemedText>
        </Pressable>
        {/* כפתור חזרה קטן (אופציונלי) */}
        <Pressable
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backLinkText}>⬅ חזרה לרשימת המדינות</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  heroWrapper: {
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroContent: {
    position: "absolute",
    left: 16,
    bottom: 16,
  },
  flagText: {
    fontSize: 32,
    marginBottom: 4,
  },
  countryName: {
    fontSize: 26,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    opacity: 0.8,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  paragraph: {
    marginHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 4,
  },
  bullet: {
    marginRight: 6,
    fontSize: 16,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  routeButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#1f9d55",
    alignItems: "center",
    justifyContent: "center",
  },
  routeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  backLink: {
    marginTop: 16,
    alignItems: "center",
  },
  backLinkText: {
    fontSize: 13,
    opacity: 0.8,
    textDecorationLine: "underline",
  },
  /*citiesButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f9d55",
    alignItems: "center",
    justifyContent: "center",
   },
  citiesButtonText: {
    color: "#1f9d55",
    fontWeight: "600",
    fontSize: 14,
   },*/
});
