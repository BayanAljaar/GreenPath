// app/(tabs)/index.tsx
// app/(tabs)/index.tsx

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ImageBackground,
  Image,
  View,
  Keyboard,
  StyleSheet as RNStyleSheet,
  Dimensions, // ⬅️ استيراد Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { fetchCountries, Country } from "../../services/apiClient";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { LineChart } from "react-native-chart-kit";// 🏆 استيراد مكتبة الرسم البياني

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4001";

// 💡 تحديد عرض الشاشة لجعله متجاوباً
const screenWidth = Dimensions.get("window").width;
// 🏆 تحديث البيانات الوهمية لتناسب Line Chart
// في Line Chart، يجب أن تكون جميع البيانات في datasets واحدة، والـ labels تمثل التدرج.
const BEST_VALUE_DATA = {
  // يمثل الـ labels الدول أو نقاط زمنية، سنستخدم هنا الدول كنقاط
  labels: ["Italy", "Turkey", "Greece", "Portugal", "Croatia"], 
  datasets: [
    {
      data: [95, 88, 79, 75, 68], // النقاط (Scores)
      color: (opacity = 1) => `rgba(60, 140, 255, ${opacity})`,      
      strokeWidth: 2 // زيادة سمك الخط
    },
  ],
  legend: ["Best Value Score"] // تسمية الخط (اختياري)
};
const HERO_IMAGES: Record<string, string> = {
  TR: "https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg", // Istanbul
  IL: "https://images.pexels.com/photos/1722183/pexels-photo-1722183.jpeg", // Jerusalem
  GR: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg", // Santorini
  IT: "https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg", // Rome
  ES: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg", // Barcelona
  FR: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg", // Paris
  US: "https://images.pexels.com/photos/356844/pexels-photo-356844.jpeg", // NYC
};

type CityInfo = {
  id: string;
  name: string;
  description: string;
};

const COUNTRY_CITIES_INLINE: Record<string, CityInfo[]> = {
  TR: [
    {
      id: "istanbul",
      name: "Istanbul",
      description: "Historic city with Bosphorus views, markets and culture.",
    },
    {
      id: "antalya",
      name: "Antalya",
      description: "Beaches, waterfalls and green mountains.",
    },
  ],
  IL: [
    {
      id: "tel-aviv",
      name: "Tel Aviv",
      description: "Beach, nightlife and bike-friendly city.",
    },
    {
      id: "haifa",
      name: "Haifa",
      description: "Green city on the Carmel mountain, views and sea.",
    },
  ],
  GR: [
    {
      id: "athens",
      name: "Athens",
      description: "History, city vibes and nearby nature trips.",
    },
    {
      id: "santorini",
      name: "Santorini",
      description: "Iconic island with cliffs and slow travel vibes.",
    },
  ],
};

// תיאור קצר לכל מדינה
const COUNTRY_DESCRIPTIONS: Record<string, string> = {
  IL: "ישראל משלבת ים, מדבר והרים במרחקי נסיעה קצרים – חופים, מסלולי טבע, ערים תוססות ואוכל מקומי עשיר.",
  TR: "טורקיה היא שילוב של היסטוריה, תרבות ושווקים חיים – מאיסטנבול ועד קו החוף של אנטליה וקפדוקיה.",
  GR: "יוון מציעה איים, כפרים לבנים והרים ירוקים – מושלם לטיולי טבע רגועים ולחופשה איטית.",
  IT: "איטליה מלאה בערים היסטוריות, כפרים ירוקים ואוכל מעולה – רומא, טוסקנה, דולומיטים ועוד.",
  US: "ארצות הברית מלאה בפארקים לאומיים, ערים גדולות ונופים מגוונים – מהחוף המזרחי עד הקניונים במערב.",
  ES: "ספרד משלבת חופים, ערים תוססות ותרבות עשירה – ברצלונה, מדריד, דרום ספרד ועוד.",
  FR: "צרפת היא שילוב של פריז האורבנית, כפרים ירוקים ועמקים מלאי כרמים ופסטורליה.",
};

// אפקט הקלדה
type TypingTextProps = {
  text: string;
  style?: any;
  speedMs?: number;
};

const TypingText: React.FC<TypingTextProps> = ({
  text,
  style,
  speedMs = 30,
}) => {
  const [displayed, setDisplayed] = React.useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, speedMs]);

  return <ThemedText style={style}>{displayed}</ThemedText>;
};

// כרטיסי השראה אופקיים
const RECOMMENDED_SPOTS = [
  {
    id: "spot-istanbul",
    name: "Istanbul",
    countryCode: "TR",
    countryName: "Turkey",
    image: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg",
    label: "Historic streets & Bosphorus views",
  },
  {
    id: "spot-tel-aviv",
    name: "Tel Aviv",
    countryCode: "IL",
    countryName: "Israel",
    image: "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg",
    label: "Beach, nightlife & bike-friendly city",
  },
  {
    id: "spot-santorini",
    name: "Santorini",
    countryCode: "GR",
    countryName: "Greece",
    image: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg",
    label: "Iconic views & slow travel vibes",
  },
  {
    id: "spot-rome",
    name: "Rome",
    countryCode: "IT",
    countryName: "Italy",
    image: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    label: "History, piazzas and espresso walks",
  },
];

// 🔹 Navbar עם פרופיל – רק עיגול + שם
type TopNavBarProps = {
  onAvatarPress: () => void;
};

const TopNavBar: React.FC<TopNavBarProps> = ({ onAvatarPress }) => {
  const router = useRouter();
  const { user } = useUser();

  const firstLetter =
    user?.name && user.name.trim().length > 0
      ? user.name.trim().charAt(0).toUpperCase()
      : "U";

  return (
    <View style={styles.navBar}>
      <View style={styles.navLeft}>
        <ThemedText type="title" style={styles.navLogoText}>
          GreenPath 🌿
        </ThemedText>
      </View>

      <View style={styles.navRight}>
        {!user && (
          <View style={styles.navButtonsRow}>
            <Pressable
              style={styles.navButtonOutline}
              onPress={() => router.push("/(auth)/landing")}
            >
              <ThemedText style={styles.navButtonOutlineText}>
                כניסה
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.navButton}
              onPress={() => router.push("/(auth)/landing")}
            >
              <ThemedText style={styles.navButtonText}>הרשמה</ThemedText>
            </Pressable>
          </View>
        )}

        {user && (
          <View style={styles.navUserContainer}>
            <ThemedText style={styles.navWelcomeText}>
              שלום, {user.name}
            </ThemedText>
            <Pressable onPress={onAvatarPress}>
              <View style={styles.avatarCircle}>
                <ThemedText style={styles.avatarInitial}>
                  {firstLetter}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useUser();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [heroIndex, setHeroIndex] = useState(0);

  // מדינה נבחרת
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // ערים
  const [showCities, setShowCities] = useState(false);
  const [apiCities, setApiCities] = useState<CityInfo[] | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  // מודאל פרופיל
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const firstLetter =
    user?.name && user.name.trim().length > 0
      ? user.name.trim().charAt(0).toUpperCase()
      : "U";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCountries();
        setCountries(data);
      } catch (err) {
        console.error("Failed to fetch countries:", err);
        setError("حدث خلل בטעינת המדינות. נסי שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // חילוף מדינות ב-Hero – ממשיך לעבוד גם אחרי הרשמה
  useEffect(() => {
    if (!countries.length) return;

    const heroCountriesLocal = countries.filter((c) => HERO_IMAGES[c.code]);
    if (!heroCountriesLocal.length) return;

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroCountriesLocal.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [countries]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.infoText}>טוען מדינות... 🌍</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  const heroCountries = countries.filter((c) => HERO_IMAGES[c.code]);
  const currentHero =
    heroCountries.length > 0
      ? heroCountries[heroIndex % heroCountries.length]
      : undefined;

  // סינון לפי חיפוש
  const searchLower = search.toLowerCase();
  const filtered = countries.filter((c) => {
    if (!searchLower) return true;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.code.toLowerCase().includes(searchLower) ||
      (c.region ?? "").toLowerCase().includes(searchLower) ||
      (c.mainLanguage ?? "").toLowerCase().includes(searchLower)
    );
  });

  // חיפוש חכם – Enter
  const handleSearchSubmit = () => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      setSelectedCountry(null);
      return;
    }

    const match = countries.find((c) => {
      const name = c.name.toLowerCase();
      const code = c.code.toLowerCase();
      return (
        name === trimmed ||
        name.startsWith(trimmed) ||
        code === trimmed ||
        code.startsWith(trimmed)
      );
    });

    if (match) {
      setSelectedCountry(match);
      Keyboard.dismiss();
    }
  };


  const handlePlanTrip = () => {
    if (!selectedCountry) return;
    if (!user) {
      router.push("/(auth)/landing");
    } else {
      router.push({
        pathname: "/(tabs)/plan",
        params: {
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
        },
      });
    }
  };

  const handleProfileSave = () => {
    setProfileSaved(true);
    setTimeout(() => {
      setProfileSaved(false);
      setProfileModalVisible(false);
    }, 1200);
  };

  return (
    <ThemedView style={styles.screen}>
      {/* NAVBAR */}
      <TopNavBar onAvatarPress={() => setProfileModalVisible(true)} />

      {/* כאן הכל בגלילה – כולל ה-Hero */}
      <ScrollView
        style={styles.contentWrapper}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero כחלק מהגלילה */}
        {currentHero && (
          <ImageBackground
            source={{ uri: HERO_IMAGES[currentHero.code] }}
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <View style={styles.heroOverlay}>
              <ThemedText type="title" style={styles.heroTitle}>
                Guide to GreenPath 🌿
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Discover green places, recomended cities and tips for your next
                trip!
              </ThemedText>
              <ThemedText style={styles.heroCountryName}>
                {currentHero.flag ?? "🌍"} {currentHero.name}
              </ThemedText>
            </View>
          </ImageBackground>
        )}

        {/* כרטיס לבן וכל שאר התוכן */}
        <ThemedView style={styles.contentCard}>
          {/* ברכה לפי משתמש */}
          {user && (
            <ThemedText style={{ marginBottom: 8 }}>
                🌿 Choose a country and let's make a worthwhile trip...
            </ThemedText>
          )}
            {/* 🏆 إضافة زر تسجيل الخروج هنا */}
          
          {/* חיפוש */}
          <TextInput
            placeholder="Search a country (Turkey, Israel, Greece...)"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {/* 🏆 1. الرسم البياني الكلاسيكي الزجاجي */}
          <ThemedText style={styles.chartTitleClassic}>
            📈 Top 5: Best Value Index 
          </ThemedText>
          <ThemedText style={styles.chartSubtitleClassic}>
            أفضل الوجهات حالياً حسب التكلفة والطقس والتقييم الثقافي
          </ThemedText>
          {/* 🏆 🏆 حاوية الرسم البياني الزجاجية */}
          <View style={styles.chartContainerNeon}> 
            <LineChart
              data={BEST_VALUE_DATA}
              width={screenWidth - 120} // عرض مناسب للبطاقة
              height={200} // ارتفاع مناسب
              yAxisLabel="" 
              yAxisSuffix="" 
              
              // 🏆 تفعيل كل الخطوط والتسميات للمظهر الكلاسيكي
              withDots={true}          // إظهار النقاط
              //bezier                   // ⬅️ نعم، LineChart Glassy عادة ما يكون ناعماً
              withVerticalLabels={true}  // إظهار أسماء X-axis (الدول)
              withHorizontalLabels={true} // إظهار أرقام Y-axis
              withInnerLines={false}     // إظهار خطوط الشبكة
              withOuterLines={false}     // إخفاء الإطار الخارجي
              withShadow={false}         // إضافة ظل داخلي خفيف
              
              chartConfig={{
                // 🏆 خلفية شفافة للرسم البياني نفسه
                backgroundColor: "transparent", 
                backgroundGradientFrom: "transparent", 
                backgroundGradientTo: "transparent", 
                decimalPlaces: 0,
                // 🏆 لون الخط والتعبئة الزجاجي الكلاسيكي
                color: (opacity = 1) => `rgba(60, 140, 255, ${opacity})`, // لون الخط (أزرق)
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, // لون التسميات (رمادي)
                // 🏆 لون خطوط الشبكة (رمادي فاتح)
                propsForBackgroundLines: {
                    stroke: "rgba(180, 180, 180, 0.3)", // رمادي فاتح شفاف
                    strokeWidth: "0.5", 
                    strokeOpacity: 0.5, // لتبدو متوهجة
                },
                style: {
                  borderRadius: 16,
                },
                /*propsForDots: {
                  r: "4",
                  strokeWidth: "1",
                  stroke: "#3c8cff", // نقاط زرقاء
                  fill: "#ffffff", // تعبئة بيضاء للنقطة
                },*/
              }}
              style={styles.chartNeon}            />
          </View>
          <ThemedText style={styles.subtitle}>
            Select a country to plan your trip:
          </ThemedText>

          {/* כרטיסי השראה */}
          <ThemedText style={styles.sectionLabel}>
            Green inspiration for your next trip ✨
          </ThemedText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotsRow}
          >
            {RECOMMENDED_SPOTS.map((spot) => (
              <Pressable
                key={spot.id}
                style={styles.spotCard}
                onPress={() => {
                  router.push({
                    pathname: "/country/[code]",
                    params: {
                      code: spot.countryCode,
                      name: spot.countryName,
                    },
                  });
                }}
              >
                <Image source={{ uri: spot.image }} style={styles.spotImage} />
                <View style={styles.spotInfo}>
                  <ThemedText style={styles.spotName}>{spot.name}</ThemedText>
                  <ThemedText style={styles.spotCountry}>
                    {spot.countryName}
                  </ThemedText>
                  <ThemedText style={styles.spotLabel}>
                    {spot.label}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* מדינה נבחרת */}
          {selectedCountry && (
            <View style={styles.selectedCountryBox}>
              <ThemedText style={styles.selectedParagraph}>
                 {" "} תקציר על המדינה שבחרת 🌿              
                  <ThemedText type="defaultSemiBold">
                  {selectedCountry.flag ?? "🌍"} {selectedCountry.name}
                </ThemedText>
                .
              </ThemedText>

              <TypingText
                style={styles.selectedParagraph}
                speedMs={25}
                text={
                  COUNTRY_DESCRIPTIONS[selectedCountry.code] ??
                  `מדינה עם פוטנציאל למסלולים ירוקים, טבע ותרבות מקומית. בהמשך נחבר את GreenPath לנתונים חיים על מזג אוויר, תחבורה ומסלולי טיול ב-${selectedCountry.name}.`
                }
              />

              {/* כפתור ערים */}
              
              {/* כפתור אחד – תכנון טיול ירוק */}
              <View style={styles.tripActionsRow}>
                <Pressable
                  style={styles.planTripButton}
                  onPress={handlePlanTrip}
                >
                  <ThemedText style={styles.planTripText}>
                    תכנון טיול ירוק למדינה זו🧭
                  </ThemedText>
                </Pressable>
              </View>

              {/* הערים */}
            </View>
          )}

          {/* כותרת לרשימת המדינות */}
          <ThemedText style={styles.sectionLabel}>
            All available countries
          </ThemedText>

          {/* רשימת מדינות */}
          {filtered.map((item) => (
            <Pressable
              key={item._id}
              style={styles.countryCard}
              onPress={() => {
                setSelectedCountry(item);
                setSearch(item.name);
              }}
            >
              <ThemedText style={styles.flag}>{item.flag ?? "🌍"}</ThemedText>
              <ThemedView style={styles.countryTextContainer}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.countryDetails}>
                  {item.region ?? "—"} · {item.mainLanguage ?? "—"} ·{" "}
                  {item.currency ?? "—"}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>

      {/* 🔹 מודאל פרופיל – באמצע המסך מעל הכול */}
      {profileModalVisible && (
        <View style={styles.profileModalOverlay}>
          <Pressable
            style={RNStyleSheet.absoluteFill}
            onPress={() => setProfileModalVisible(false)}
          />
          <View style={styles.profileModalContent}>
            <View style={styles.profileBigAvatar}>
              <ThemedText style={styles.profileBigAvatarInitial}>
                {firstLetter}
              </ThemedText>
            </View>
            <ThemedText style={styles.profileModalTitle}>
              תמונת פרופיל
            </ThemedText>

            <ThemedText style={styles.profileModalSubtitle}>
              כאן בהמשך תוכלי לבחור תמונה מהגלריה, לשנות ולשמור.
            </ThemedText>

            <View style={styles.profileModalButtonsRow}>
              <Pressable
                style={styles.profileModalButtonSecondary}
                onPress={() => {
                  console.log("Delete avatar (בהמשך נחבר לשרת)");
                  setProfileModalVisible(false);
                }}
              >
                <ThemedText style={styles.profileModalButtonSecondaryText}>
                  מחיקה
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.profileModalButtonPrimary}
                onPress={handleProfileSave}
              >
                <ThemedText style={styles.profileModalButtonPrimaryText}>
                  עריכה ושמירה
                </ThemedText>
              </Pressable>
            </View>

            {profileSaved && (
              <ThemedText style={styles.profileModalSavedText}>
                ✅ התמונה נשמרה בהצלחה
              </ThemedText>
            )}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f7fb",
  },
  contentWrapper: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f7fb",
  },
  infoText: {
    marginTop: 12,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    paddingHorizontal: 16,
  },

  // NAVBAR
  navBar: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  navLogoText: {
    fontSize: 18,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  navButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1f9d55",
  },
  navButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  navButtonOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f9d55",
    backgroundColor: "white",
  },
  navButtonOutlineText: {
    color: "#1f9d55",
    fontSize: 13,
    fontWeight: "500",
  },
  navUserContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navWelcomeText: {
    fontSize: 13,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1f9d55",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  hero: {
    height: 220,
    width: "100%",
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 60,
    justifyContent: "flex-end",
  },
  heroTitle: {
    color: "white",
    fontSize: 26,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "white",
    opacity: 0.9,
    marginBottom: 12,
    textAlign: "left",
  },
  heroCountryName: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  scrollContent: {
    paddingBottom: 32,
  },

  contentCard: {
    marginTop: -8,
    marginHorizontal: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d0d7e2",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    marginTop: 6,
    backgroundColor: "#f9fbff",
  },
  subtitle: {
    marginBottom: 8,
    textAlign: "left",
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  spotsRow: {
    paddingVertical: 4,
  },
  spotCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: "#f2f6ff",
    overflow: "hidden",
  },
  spotImage: {
    width: "100%",
    height: 110,
  },
  spotInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  spotName: {
    fontWeight: "600",
    fontSize: 14,
  },
  spotCountry: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  spotLabel: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },

  countryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1e5ee",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  countryTextContainer: {
    flex: 1,
  },
  countryDetails: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },

  selectedCountryBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#e6f6ec",
    borderWidth: 1,
    borderColor: "#c2e5d1",
  },
  selectedTitle: {
    marginBottom: 8,
    textAlign: "right",
  },
  selectedParagraph: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "right",
    marginBottom: 8,
  },
  selectedButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1f9d55",
  },
  selectedButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  tripActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  planTripButton: {
    minWidth: 220,
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  planTripText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },

  cityCardInline: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f4fbf6",
    borderWidth: 1,
    borderColor: "#cde9d7",
  },
  cityDescriptionInline: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "right",
  },
  cityError: {
    marginTop: 8,
    color: "#c53030",
    fontSize: 12,
    textAlign: "right",
  },
  helperPill: {
    marginTop: 10,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1faf2",
    borderWidth: 1,
    borderColor: "#c7e9d3",
  },
  helperPillText: {
    fontSize: 12,
    textAlign: "center",
    color: "#2d6a4f",
  },

  // מודאל פרופיל
  profileModalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  profileModalContent: {
    width: "80%",
    borderRadius: 24,
    backgroundColor: "white",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  profileBigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1f9d55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileBigAvatarInitial: {
    color: "white",
    fontSize: 42,
    fontWeight: "700",
  },
  profileModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileModalSubtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#4b5563",
    marginBottom: 10,
  },
  profileModalButtonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  profileModalButtonPrimary: {
    flex: 1,
    backgroundColor: "#1f9d55",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  profileModalButtonPrimaryText: {
    color: "white",
    fontWeight: "600",
  },
  profileModalButtonSecondary: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  profileModalButtonSecondaryText: {
    color: "#374151",
    fontWeight: "500",
  },
  profileModalSavedText: {
    marginTop: 10,
    fontSize: 12,
    color: "#059669",
  },
  // 🏆 إضافة ستايل لزر تسجيل الخروج
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 30,
    backgroundColor: "#ef4444", // لون أحمر
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
// 🏆 🏆 ستايل الحاوية الداكنة (النيون) - تصغير الحجم والمركزية
  chartContainerNeon: {
    alignItems: 'center', 
    paddingVertical: 1, // ⬅️ تقليل التباعد الداخلي ليلائم الرسم بإحكام
    paddingHorizontal: 1, // ⬅️ تقليل التباعد الداخلي
    marginTop: 10, 
    marginBottom: 10,
    marginHorizontal: 40, // ⬅️ زيادة الهامش الأفقي لجعل البطاقة أصغر ومركزة جداً
    borderRadius: 16,
    backgroundColor: '#000000', // الخلفية السوداء
    overflow: 'hidden', 
    
    // 🏆 🏆 تضخيم تأثير التوهج (الظل)
    shadowColor: "#00FFC0", 
    shadowOpacity: 1.0, 
    shadowRadius: 20, 
    shadowOffset: { width: 0, height: 0 }, 
    elevation: 20, 
  },
  // 🏆 ستايلات العنوان والوصف للرسم البياني الجديد
  chartTitleClassic: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 5,
    color: "#374151", // لون رمادي داكن
    marginHorizontal: 16,
  },
  chartSubtitleClassic: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 10,
    textAlign: "right",
    marginHorizontal: 16,
  },
  chartNeon: { 
    marginVertical: 8,
    borderRadius: 16,
  },
  // ... (بقية الـ styles) ...
});
