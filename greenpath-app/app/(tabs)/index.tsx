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
  Text,
  Dimensions,
  Platform,
  TouchableOpacity,
  LayoutAnimation, 
  UIManager,
  SafeAreaView, 
  StatusBar,
  
} from "react-native";
import { useRouter } from "expo-router";
import { fetchCountries, Country } from "../../services/apiClient";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useUser } from "../UserContext";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from '@expo/vector-icons';

// تفعيل الأنيميشن على أجهزة أندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// تعريف واجهة البيانات لـ TypeScript
interface TravelAIData {
  priceRating: "$" | "$$" | "$$$" | "$$$$"; // الرمز البصري
  priceLabel: string; // وصف بالعربي (مثلاً: رخيصة نسبياً)
  category: "Cultural Hub" | "Quiet Nature" | "Shopping Center" | "Historical Depth";
  vibeDescription: string;
  topSpots: string[];
  vibe: string;
  upcomingEvents: string;
  dosAndDonts: string[];
  weatherInfo: string;
  //happeningNow: string; // المهرجانات، الدوريات، المواسم
  priceQuality: string;
  budgetSuitability: {
    limited: string;
    medium: string;
    luxury: string;
  };
  safetyAnalysis: string; // القسم التابع للامان
  bookingIntelligence: string; // نصيحة التوقيت والحجز
  headsUp: string; // التنبيه الذكي المطور

}

const screenWidth = Dimensions.get("window").width;

// --- الثوابت (بقيت كما هي) ---
const HERO_IMAGES: Record<string, string> = {
  TR: "https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg",
  IL: "https://images.pexels.com/photos/1722183/pexels-photo-1722183.jpeg",
  GR: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg",
  IT: "https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg",
  ES: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
  FR: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg",
  US: "https://images.pexels.com/photos/356844/pexels-photo-356844.jpeg",
};

const RECOMMENDED_SPOTS = [
  { id: "spot-istanbul", name: "Istanbul", countryCode: "TR", countryName: "Turkey", image: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg" },
  { id: "spot-tel-aviv", name: "Tel Aviv", countryCode: "IL", countryName: "Israel", image: "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg" },
  { id: "spot-santorini", name: "Santorini", countryCode: "GR", countryName: "Greece", image: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg" },
  { id: "spot-rome", name: "Rome", countryCode: "IT", countryName: "Italy", image: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg" },
];


// --- المكونات الفرعية ---
const TopNavBar = ({ onAvatarPress }: { onAvatarPress: () => void }) => {
  const router = useRouter();
  const { user } = useUser();
  const firstLetter = user?.userName?.trim().charAt(0).toUpperCase() || "U";

  
  return (
    <View style={styles.navBar}>
      {/* 1. الجانب الأيسر: الشعار فقط دائماً */}
      <View style={styles.navLeft}>
        <Text style={styles.logoText}>GreenPath</Text>
      </View>

      {/* 2. الجانب الأيمن: يتغير بناءً على حالة تسجيل الدخول */}
      <View style={styles.navRight}>
        {user ? (
          // ✅ الحالة الأولى: المستخدم مسجل دخول (اظهر اسمه وصورة رمزية)
          <TouchableOpacity 
            style={styles.userProfileBtn} 
            onPress={() => router.push('/profile')}
          >
            <View style={styles.userInfoText}>
              <Text style={styles.welcomeText}>Hello,</Text>
              <Text style={styles.userNameText}>{user.userName}</Text> 
            </View>
            {/* دائرة خضراء بها أول حرف من الاسم إذا لم توجد صورة */}
            {user?.profilePicture ? (
              <Image 
                source={{ uri: user.profilePicture }} 
                style={{ width: 40, height: 40, borderRadius: 20 }} 
              />
            ) : (
             <View style={styles.avatarCircle}>
                 <Text style={styles.avatarLetter}>
                    {user.userName.charAt(0).toUpperCase()}
                  </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          // ❌ الحالة الثانية: لم يسجل دخول (اظهر أزرار الدخول)
          <View style={styles.navButtonsRow}>
            <TouchableOpacity 
              style={styles.navButtonOutline} 
              onPress={() => router.push("/(auth)/landing")}
            >
              <Text style={styles.navButtonOutlineText}>Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push("/(auth)/landing")}
            >
              <Text style={styles.navButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  // States للذكاء الاصطناعي
  // const [aiData, setAiData] = useState<any>(null);
  const [aiData, setAiData] = useState<TravelAIData | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null); // هذا سيحل خطأ TypeScript
  const [isAiVisible, setIsAiVisible] = useState(false);

  // 2. دالة التعامل مع الضغط
  const handlePlanTripPress = () => {
    if (user) {
      // إذا سجل دخول، اذهب لصفحة التخطيط
      router.push('/(tabs)/plan'); 
    } else {
      // إذا لم يسجل، اذهب لصفحة الدخول
      router.push('/(auth)/landing');
    }
  };
  const toggleExplanation = () => {
    // هذا السطر يخبر النظام: "أي تغيير قادم في الواجهة، اجعله ينزلق بسلاسة"
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setIsAiVisible(!isAiVisible);
  };

  // 1. وظيفة جلب بيانات الذكاء الاصطناعي (تم تصحيح الرابط والبرومبت)
 const fetchTravelAI = async (countryName: string) => {
  if (!countryName || isAiLoading) return;
  // إذا كانت البيانات محملة مسبقاً لنفس الدولة، لا تطلبها مجدداً
  //if (aiData && selectedCountry?.name === countryName) return;
  //if (!countryName) return; 
  //      "vibe": "Describe nature, people's lifestyle, and why to go (engaging tone)",
  //      "weatherInfo": "Average temperature and typical weather (sunny/snowy/rainy) for the current and upcoming months in the mentioned spots.",


  setIsAiLoading(true);
  setAiError(null); // يفضل إضافة State جديد للأخطاء
  // البرومبت الجديد باللغة الإنجليزية لضمان أفضل دقة في استخراج البيانات
  const prompt = `
    Act as a professional travel expert for ${countryName}. 
    Provide a JSON object with this exact structure:
    {
      "priceRating": "Choose one: $ (Cheap), $$ (Moderate), $$$ (Expensive), $$$$ (Very Luxury)",
      "priceLabel": "Write a short label (Relatively cheap, mid-range, or luxury destination depending on the overall economic level  e.g of ${countryName}.)",
      "category": "Choose one or get me your suggestions about what is the place famous for?: Cultural Hub, Quiet Nature, Shopping Center, or Historical Depth or another..",
      "vibeDescription": "A captivating short paragraph intro creating an emotional impression of the country's soul. Describe nature, people's lifestyle, and why to go (engaging tone)",
      "topSpots": ["3-4 must-visit places with a short reason why"],
      "upcomingEvents": "Mention specific festivals, sports leagues, or shopping seasons currently active or upcoming. 
                        Mention a famous upcoming festival, match, or show. Include if it has a fee (convert the value to dollars).",
      "dosAndDonts": ["Etiquette/gestures to avoid to respect local culture"],
      "weatherInfo": "Average temperature and typical weather (sunny/snowy/rainy) for the current and upcoming months in the mentioned spots.
               and end with new line about Current climate status and temperatures mention converting to (°C).",
      "priceQuality": "Be brutally honest about prices. Is it overpriced? Is the quality worth the cost? Mention typical costs (low vs high end).",
      "budgetSuitability": {
            "limited": "How to survive on a low budget here.",
            "medium": "The experience for a standard traveler.",
            "luxury": "What high-end luxury looks like here."
      },
    
       "safetyAnalysis": {
         write one cohesive, professional paragraph (narrative style).       
          Follow this gradual flow:
          1. Start with the general feel of safety and highlight the highly recommended "Safe Zones" where tourists can feel worry-free.
          2. Discuss Political Stability ONLY if there are current risks (protests/tensions), including a professional outlook on when things might settle mention reliable assessments based on.
          3. Mention Natural risks Seasonal disasters (quakes, floods)/Health  health outbreaks if applicable only if they exist. If there are no risks  , conclude with one short, comforting sentence stating that the destination requires no specific health natural concerns.
          Critical: "Highlight very safe areas where tourists feel highly recommended and worry-free. 
          Importatnt: Do NOT mention theft, pickpocketing, or scams in this section (keep them for the 'Heads-up' section). Use a calm, advisory tone.      
      },
            
  "bookingIntelligence": "Professional advice: Based on weather and seasons, when exactly to book to save money vs when is the peak.
                        Do not allow it to clash with your news in safetyLevel , meaning give time to address what we talked about in safetyLevel."
      "headsUp": "Follow this logic strictly: in a  2 sentences 
                1. If risks are low/moderate: Give a short advisory on general precautions meaninig one minor negative or caution point (e.g., pickpockets, traffic, or tourist traps). 
                2. If risks are CRITICAL (war, coup, major disaster): 
                Start exactly with 'Despite the country’s strong tourism appeal, we do not recommend visiting during the period [dates] due to [risk].
                Current assessments suggest conditions may improve by [month], based on reports from [Reliable Source]'.
                Don't based on weather and seasons because we explain it on bookingIntelligence part!",
            }
        Response must be ONLY JSON.`;

  try {
    //const URI = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;   
    
    const GROQ_API_KEY = "PRIVATE_CODE"; // يبدأ بـ gsk_

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      /*body: JSON.stringify({
        contents: [{
          parts: [{ text: `Give me 3 locations and 3 eco-tips for ${countryName} as JSON: {"locations": [], "tips": []}` }]
        }],
        //generationConfig: { response_mime_type: "application/json" }
      })*/
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // موديل قوي جداً ومجاني حالياً
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    
    /*if (response.status === 429) {    // فحص إذا كان هناك خطأ "كثير من الطلبات"
      setAiError("Halt! Too many requests. Please wait 60 seconds.");
      // بدلاً من الـ alert المزعج، سنكتفي بعرض رسالة نصية في الواجهة
      setIsAiLoading(false);
      return;
    }*/

    const data = await response.json();
    console.log("Full API Response:", data); // راقبي هذا في الـ Console
    
   if (data.choices && data.choices[0].message.content) {
      // نقوم بتحديد النوع هنا أيضاً لضمان السلامة  
      const content = JSON.parse(data.choices[0].message.content);
      //console.log("Parsed Content:", content);
      setAiData(content); // تحديث الحالة لعرض البيانات
    } else {
      setAiError("API returned empty content.");
    }
  } catch (error) {
      console.error("Fetch Error:", error);
      //setAiError("Connection error. Try again later.");
      setAiError("Groq Error: Check connection or Key.");
  } finally {
    setIsAiLoading(false); // هذا يضمن توقف الدائرة الخضراء
  }
};
  // 2. وظيفة موحدة لاختيار الدولة (تُستدعى من البحث ومن القائمة السفلية)
  const onSelectCountry = (country: any) => {
    if (selectedCountry?.name === country.name) {
      // إذا كانت نفس الدولة، اعكس الحالة فقط (إظهار/إخفاء)
      setIsAiVisible(!isAiVisible);
    } else {
      // إذا كانت دولة جديدة، حمّل البيانات واجعلها ظاهرة
      setSelectedCountry(country); // لتحديث واجهة العرض (العلم والاسم)
      setSearchQuery("");
      setFilteredResults([]);
      setIsAiVisible(true);
      // استدعاء الذكاء الاصطناعي مرة واحدة فقط عند الضغط
      fetchTravelAI(country.name);
    }
  };
  

  /*const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      const filtered = countries.filter((item) =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredResults(filtered);
    } else {
      setFilteredResults([]);
    }
  };*/
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // تأكدي أن countries مصفوفة قبل عمل الفلترة
    if (text.trim().length > 0 && Array.isArray(countries)) {
      const filtered = countries.filter((item) =>
        item.name?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredResults(filtered);
    } else {
      setFilteredResults([]);
    }
  };

  
  /*useEffect(() => {
    fetchCountries().then(setCountries).finally(() => setLoading(false));
  }, []);جدييييييييييييد*/

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchCountries();
      // التحقق من أن البيانات وصلت فعلاً وهي مصفوفة
    if (data && Array.isArray(data)) {
      setCountries(data);
      console.log("✅ تم تحميل الدول بنجاح، عددها:", data.length);
    }
      else {
        console.warn("⚠️ البيانات وصلت ولكنها ليست مصفوفة:", data);
        setCountries([]);
      }
    } catch (err) {
      console.error("❌ خطأ في جلب البيانات:", err);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
  // تجهيز بيانات الهيرو
  //const heroCountries = countries.filter((c) => HERO_IMAGES[c.code]);
  // تجهيز بيانات الهيرو مع حماية للتأكد أنها مصفوفة
  // أضفنا التحقق Array.isArray لضمان عدم اختفاء قسم الصور
  const heroCountries = Array.isArray(countries) ? countries.filter((c) => HERO_IMAGES[c.code]) : [];
  const currentHero = heroCountries.length > 0 ? heroCountries[heroIndex % heroCountries.length] : undefined;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <ThemedView style={styles.screen}>
        <TopNavBar onAvatarPress={() => {}} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Hero Section */}
          {currentHero && (
            <ImageBackground source={{ uri: HERO_IMAGES[currentHero.code] }} style={styles.hero} imageStyle={styles.heroImage}>
              <View style={styles.heroOverlay}>
                <ThemedText type="title" style={styles.heroTitle}>Guide to GreenPath 🗺️</ThemedText>
                <ThemedText style={styles.heroSubtitle}>Discover green places and tips!</ThemedText>
                <ThemedText style={styles.heroCountryName}>{currentHero.flag ?? "🌍"} {currentHero.name}</ThemedText>
              </View>
            </ImageBackground>
          )}

          {/* Smart Search Card */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>Choose a country and let's start! </ThemedText>
            <TextInput
              style={styles.searchInput}
              placeholder="Search a country ..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && Array.isArray(filteredResults) && filteredResults.map((item) => (
              <Pressable key={item.code} style={styles.listItem} onPress={() => onSelectCountry(item)}>
                <ThemedText style={styles.listFlag}>{item.flag ?? "🌍"}</ThemedText>
                <ThemedText style={styles.listCountry}>{item.name}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>

          {/* AI Explanation Box (Bento Box) */}
          {/* */}
          {selectedCountry && (
            <View style={styles.richBentoContainer}>
              {/*   الاظهار  والاخفاء والهيدر: العلم واسم الدولة وزر الإغلاق  العنصر الاول*/}
              <View style={styles.richHeader}>
                <ThemedText style={styles.countryMainTitle}>
                  {selectedCountry.flag} {selectedCountry.name}
                </ThemedText>

                {/* العنصر الثاني: حاوية الأزرار  اغلاق او اخفاء واظهار(ستذهب لأقصى اليمين ومعها كل ما بداخلها) */}
                {/* زر الـ Hide / Show الذكي */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                    onPress={toggleExplanation} 
                    activeOpacity={0.7}
                    style={{ marginRight: 15 }} // مسافة بسيطة بين الزرين
                  >
                    {isAiVisible ? (
                      // إذا كان الشرح ظاهراً، نعرض كلمة Hide
                      // زر Hide على شكل كبسولة
                      <View style={styles.hideCapsule}>
                        <Text style={styles.hideText}>HIDE</Text>
                      </View>
                    ) : (
                      // إذا كان الشرح مخفياً، نعرض أيقونة العين
                      <Ionicons name="eye-outline" size={26} color="#10B981" />
                )}
              </TouchableOpacity>
              
              {/* زر الإغلاق النهائي */}
                <Pressable onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedCountry(null);
                  setAiData(null); // تصفير البيانات عند الإغلاق
                  setIsAiVisible(false); // إخفاء عند المسح أيضاً
                }}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </Pressable>
          </View>
        </View>


              {/* محتوى الشرح (يظهر فقط إذا كان isAiVisible صحيحاً) */}
              

              {/* حالة التحميل */}
              {isAiLoading && (
                <View style={{ padding: 20 }}>
                  <ActivityIndicator size="large" color="#1f9d55" />
                  <Text style={{ textAlign: 'center', marginTop: 10 }}>Fetching green insights...</Text>
                </View>
              )}
              
            {/* اختبار سريع لظهور البيانات */}
              {aiData && !isAiLoading  &&isAiVisible &&(
                <View style={{ 
                  marginTop: 10, 
                  overflow: 'hidden', // يمنع النص من القفز قبل اكتمال الحركة
                }}>
                <View style={{ padding: 15, backgroundColor: '#fff', borderRadius: 15 }}>
                  {/* القسم الأول: الانطباع الأولي الذكي */}
                                    {/* نمط الحياة والطبيعة */}
                    <ThemedText  type="defaultSemiBold" style={{ fontSize: 16, color: '#059669' }}> ✨ Why ${selectedCountry?.name}? </ThemedText> 
                    <ThemedText type="defaultSemiBold" style={{ color: '#025339ff', fontWeight: 'bold', fontSize: 12 }}> {aiData.priceRating}  ({aiData.priceLabel}) :{aiData.category.toUpperCase()}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ fontStyle: 'italic', marginVertical: 8 ,color: '#475569'}}>{aiData.vibeDescription}</ThemedText>
                  
                  {/* نمط الحياة والطبيعة 
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 18, color: '#059669' }}>✨ Why ${selectedCountry?.name}?</ThemedText>
                  <ThemedText style={{ fontStyle: 'italic', marginVertical: 8 }}>{aiData.vibe}</ThemedText>*/}

                  {/* الأماكن المقترحة */}
                  <ThemedText type="defaultSemiBold" style={{ marginTop: 10 ,color: '#475569'}}>📍 Top Experiences:</ThemedText>
                  {aiData.topSpots?.map((spot, i) => (
                    <ThemedText key={i} style={{ fontSize: 14 ,color: '#475569'}}>• {spot}</ThemedText>
                  ))}

                  {/* الفعاليات القادمة */}
                  <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10, marginTop: 15 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#047857' }}>🗓️ Don't Miss:</ThemedText>
                    <ThemedText style={{ fontSize: 14 ,color: '#475569'}}>{aiData.upcomingEvents}</ThemedText>
                  </View>

                  {/* العادات والتقاليد */}
                  <ThemedText type="defaultSemiBold" style={{ marginTop: 15 ,color: '#047857'}}>🤝 Local Etiquette:</ThemedText>
                  {aiData.dosAndDonts?.map((item, i) => (
                    <ThemedText key={i} style={{ fontSize: 14,color: '#475569' }}>🚫 {item}</ThemedText>
                  ))}

                  {/* قسم الطقس الجديد */}
                  <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, marginVertical: 10 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#0284C7' }}>🌡️ Climate & Weather:</ThemedText>
                    <ThemedText style={{ fontSize: 14, marginTop: 4 ,color: '#475569'}}>{aiData.weatherInfo}</ThemedText>
                  </View>

                  {/* ... (upcomingEvents) ... */}

                  {/* قسم الأسعار المعدل (بشكل حيادي) */}
                  <View style={{ borderLeftWidth: 3, borderColor: '#F59E0B', paddingLeft: 10, marginVertical: 10 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#B45309' }}>💰 Cost & Value Analysis:</ThemedText>
                    <ThemedText style={{ fontSize: 14 , color: '#475569'}}>{aiData.priceQuality}</ThemedText>
                  </View>

                    {/* قسم الميزانية - إزالة الخوف المالي */}
                    <View style={{ backgroundColor: '#F9FAFB', padding: 15, borderRadius: 15, marginBottom: 15 }}>
                      <ThemedText type="defaultSemiBold" style={{ marginBottom: 10 , color: '#B45309'}}> Budget Planning:</ThemedText>
                      <ThemedText style={{ fontSize: 13, marginBottom: 5,color: '#475569' }}>• <Text style={{ fontWeight: 'bold' ,color: '#475569'}}>Limited:</Text> {aiData.budgetSuitability.limited}</ThemedText>
                      <ThemedText style={{ fontSize: 13, marginBottom: 5,color: '#475569' }}>• <Text style={{ fontWeight: 'bold',color: '#475569' }}>Medium:</Text> {aiData.budgetSuitability.medium}</ThemedText>
                      <ThemedText style={{ fontSize: 13,color: '#475569' }}>• <Text style={{ fontWeight: 'bold' ,color: '#475569'}}>Luxury:</Text> {aiData.budgetSuitability.luxury}</ThemedText>
                    </View>
                  
                    {/* الاستقرار السياسي ** السلامة العامة والمناطق الآمنة * المخاطر الطبيعية */}
                      {/* قسم تحليل الأمان الموحد */}
                  <View style={{ marginTop: 8, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 15, borderLeftWidth: 4, borderColor: '#64748B' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="shield-checkmark" size={20} color="#475569" />
                      <ThemedText type="defaultSemiBold" style={{ marginLeft: 8, color: '#1E293B' }}>Safety  & Comfort Level Analysis</ThemedText>
                    </View>
                    
                    <ThemedText style={{ 
                      fontSize: 14, 
                      color: '#334155', 
                      lineHeight: 22, 
                      textAlign: 'justify' // لجعل النص متناسق الحواف
                    }}>
                      {aiData.safetyAnalysis}
                    </ThemedText>
                  </View>

                  {/* ذكاء الحجز - التميز الحقيقي */}
                  <View style={{ backgroundColor: '#FFFBEB',marginTop: 15, padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#F59E0B' }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#B45309', fontSize: 14 }}>✈️ Smart Booking Advice:</ThemedText>
                    <ThemedText style={{ fontSize: 13, color: '#92400E', lineHeight: 18 }}>{aiData.bookingIntelligence}</ThemedText>
                  </View>

                  {/* التحذير (الجانب السلبي البسيط) 
                  <View style={{ borderTopWidth: 1, borderColor: '#eee', marginTop: 15, paddingTop: 10 }}>
                    <ThemedText style={{ fontSize: 13, color: '#991B1B' }}>
                      ⚠️ <ThemedText type="defaultSemiBold">Heads up: </ThemedText>{aiData.headsUp}
                    </ThemedText>
                  </View>*/}
                  {/* التنبيه الذكي المطور - Heads-up   - حيث ستظهر تفاصيل السرقة والحذر */}
                  <View style={{ 
                    marginTop: 15, 
                    padding: 15, 
                    backgroundColor: aiData.headsUp.includes('not recommend') ? '#FFF1F2' : '#F0F9FF', 
                    borderRadius: 12 
                  }}>
                    <ThemedText style={{ fontWeight: 'bold', color: aiData.headsUp.includes('not recommend') ? '#9F1239' : '#0369A1' }}>
                      💡 Smart Traveler Alert
                    </ThemedText>
                    <ThemedText style={{ fontSize: 13, marginTop: 5, lineHeight: 20, color: '#374151' }}>
                      {aiData.headsUp}
                    </ThemedText>
                  </View>
              </View>

          </View>
      )}

              {/* رسالة الخطأ في حال حدوثه */}
              {/* داخل الـ return تحت قسم الـ AI */}
              {aiError && (
                <View style={{ padding: 15, backgroundColor: '#FEF2F2', borderRadius: 10, marginVertical: 10 }}>
                  <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: 'bold' }}>
                    ⚠️ {aiError}
                  </Text>
                </View>
              )}

            {/* زر التخطيط للرحلة */}
              <Pressable 
                style={[styles.primaryActionBtn, { marginTop: 20 }]} 
                onPress={handlePlanTripPress}
              >
                <ThemedText style={styles.primaryActionBtnText}>Plan Green Trip 🧭</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Analytics Section */}
          <View style={styles.header}>
            <ThemedText style={styles.mainTitle}>Tourism Analytics</ThemedText>
            <Ionicons name="stats-chart" size={24} color="#10B981" />
          </View>
          <View style={styles.sectionCard}>
            <LineChart
              data={{
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{ data: [80, 85, 90, 88, 95, 100], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` }]
              }}
              width={screenWidth - 80}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 16 }}
            />
          </View>

          {/* Inspiration */}
          <ThemedText style={styles.sectionLabel}>Green inspiration ✨</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spotsRow}>
            {RECOMMENDED_SPOTS.map((spot) => (
              <Pressable key={spot.id} style={styles.spotCard}>
                <Image source={{ uri: spot.image }} /*resizeMode="cover"  أضفها هنا كـ Prop*/ style={styles.heroImage} />
                <View style={styles.spotInfo}>
                  <ThemedText style={styles.spotName}>{spot.name}</ThemedText>
                  <ThemedText style={styles.spotCountry}>{spot.countryName}</ThemedText>
                </View> 
              </Pressable>
            ))}
          </ScrollView>

          {/* All Countries List (Fixed Selection) */}
          <ThemedText style={styles.sectionLabel}>All available countries</ThemedText>
          {/*{countries.slice(0, 10).map((item) => ( جدييييييييد*/}
          {Array.isArray(countries) && countries.slice(0, 10).map((country) => (
            <Pressable key={country.code} style={styles.countryCard} onPress={() => onSelectCountry(country)}>
              <ThemedText style={styles.flag}>{country.flag ?? "🌍"}</ThemedText>
              <View style={styles.countryTextContainer}>
                <ThemedText type="defaultSemiBold" style={{ color: '#475569'}}>{country.name}</ThemedText>
                <ThemedText style={styles.countryDetails}>{country.region} · {country.currency}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))}

        </ScrollView>
      </ThemedView>
      </ScrollView>
  </SafeAreaView>
    );
}

// --- التنسيقات (تم الحفاظ على تنسيقاتك وإضافة المفقود) ---
const chartConfig = {
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
};

const styles: any = StyleSheet.create({
 safeArea: {
    flex: 1,
    backgroundColor: '#fff', // أو نفس لون خلفية تطبيقك
    // هذا السطر مهم للأندرويد لترك مسافة تحت الساعة
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screen: { flex: 1, backgroundColor: "#f3f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  richBentoContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    padding: 20, 
    marginHorizontal: 20, 
    marginVertical: 15,    
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' },
      default: { elevation: 5 }
    })
  },
  // شريط التنقل - NavBar
  // 1. تنسيقات شريط التنقل (التي كانت تسبب أخطاء)
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButtonsRow: { flexDirection: 'row', gap: 10 },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#004d40',
  },
  
  navButtonOutline: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#004d40',
  },
 
  navWelcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#004d40',
  },
  navBar: { height: 60, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "white" },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfoText: {
    alignItems: 'flex-end',
  },
  welcomeText: { fontSize: 10, color: '#94A3B8' },
  userNameText: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#22C55E', // اللون الأخضر الخاص بك
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  navButtonOutlineText: {
    color: '#004d40',
    fontSize: 14,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  navLogoText: { fontSize: 14, fontWeight: 'bold', color: '#04140aff' },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  navUserContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarInitial: { color: "white", fontWeight: "700" },
  
  // قسم الـ Hero
  hero: { height: 200, width: "100%" },
  heroImage: {
    //  transformOrigin هنا أيضاً لتجنب تحذير المتصفح
    //resizeMode: 'cover',
  },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", padding: 20, justifyContent: 'flex-end' },
  heroTitle: { color: 'white', fontSize: 22,textShadowColor: 'rgba(0, 0, 0, 0.75)', },
  heroSubtitle: { color: 'white', opacity: 0.8 },
  heroCountryName: { color: 'white', fontWeight: 'bold', marginTop: 5 },
  
  // البطاقات والبحث
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 15, marginHorizontal: 20, marginBottom: 15, elevation: 2,color: '#475569' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, color:'#004d40' },
  searchInput: { backgroundColor: "#f1f5f9", padding: 12, borderRadius: 12,color:'#030807ff' },
  countryDetails: {
    padding: 15,
    marginTop: 10,
    color: '#475569',
  },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  listFlag: { fontSize: 20, marginRight: 10 },
  listCountry: { flex: 1,color: '#475569' },
  
  richHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6',marginBottom: 10 },
  countryMainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15,color: '#475569' },
  cardMainText: { fontSize: 14, color: '#475569', marginBottom: 15 },
  bentoRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  bentoCard: { flex: 1, padding: 15, borderRadius: 18, backgroundColor: '#f8fafc' },
  cardSmallTitle: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 5 },
  bulletText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  primaryActionBtn: { backgroundColor: '#0F172A', padding: 15, borderRadius: 15, alignItems: 'center' },
  primaryActionBtnText: { color: '#fff', fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 10 },
  mainTitle: { fontSize: 18, fontWeight: 'bold' ,color: '#10B981'},
  sectionLabel: { marginHorizontal: 20, fontWeight: 'bold', marginTop: 10 , color: '#475569'},
  spotsRow: { paddingLeft: 20 },
  spotCard: { width: 160, marginRight: 15, borderRadius: 15, backgroundColor: '#fff', overflow: 'hidden' },
  spotImage: { width: '100%', height: 100 ,resizeMode: 'cover' },// تأكدي أن هذا السطر غير معلق (Not Commented)
  spotInfo: { padding: 8 },
  spotName: { fontSize: 13, fontWeight: 'bold' ,color: '#475569'},
  spotCountry: { fontSize: 11, color: '#333333',fontWeight: "600" },// إضافة سماكة بسيطة 
  countryCard: { flexDirection: "row",color: '#475569', alignItems: "center", padding: 15, marginHorizontal: 20, marginTop: 10, borderRadius: 15, backgroundColor: "#fff" },
  flag: { fontSize: 24, marginRight: 15 },
  countryTextContainer: { flex: 1,color: '#475569' },
  scrollContent: { paddingBottom: 30 },
  hideCapsule: {
    backgroundColor: '#FEF2F2', // أحمر فاتح جداً للخلفية
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20, // لجعلها دائرية الأطراف (كبسولة)
    borderWidth: 1,
    borderColor: '#FECDD3', // إطار أحمر خفيف
    marginRight: 8,
  },
  hideText: {
    color: '#666', // لون النص أحمر واضح
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5, // مسافة بسيطة بين الحروف لتعطي مظهراً عصرياً
  },

pathText: {
  fontSize: 12,
  fontWeight: "800",
  letterSpacing: 1.5,
  color: "#111",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,

  // ظل خفيف (3D)
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
},

greenText: {
  marginTop: 2,
  fontSize: 9,
  fontWeight: "600",
  letterSpacing: 1,
  color: "#2E7D32", // أخضر أنيق (اختياري)
},


});