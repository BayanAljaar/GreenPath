// app/(tabs)/plan.tsx

import React, { useState, useEffect } from "react";
import { StyleSheet, View, TextInput, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router"; // لاستقبال اسم الدولة
import { ThemedView } from "../../components/themed-view";
import { ThemedText } from "../../components/themed-text";
import { Ionicons } from "@expo/vector-icons";

export default function PlanScreen() {
  const params = useLocalSearchParams();
  const initialCountry = params.selectedCountry as string || ""; // الدولة القادمة من الصفحة الرئيسية

  const [searchQuery, setSearchQuery] = useState("");
  const [currentCountry, setCurrentCountry] = useState(initialCountry);
  const [loading, setLoading] = useState(false);
  
  // بيانات وهمية للمناطق التابعة للدولة (سيتم ربطها بـ API لاحقاً)
  const [areas, setAreas] = useState([
    { id: '1', name: 'البلدة القديمة', type: 'تاريخي', country: initialCountry },
    { id: '2', name: 'الحديقة الوطنية', type: 'طبيعة', country: initialCountry },
    { id: '3', name: 'وسط المدينة', type: 'تسوق', country: initialCountry },
  ]);

  return (
    <ThemedView style={styles.container}>
      
      {/* 🏆 شريط المنطقة (الدولة المختارة) */}
      <View style={styles.regionHeader}>
        <View style={styles.countryBadge}>
          <Ionicons name="location" size={16} color="#10B981" />
          <ThemedText style={styles.countryBadgeText}>
            {currentCountry ? `تخطيط الرحلة لـ ${currentCountry}` : "تخطيط رحلة عامة"}
          </ThemedText>
        </View>
        <ThemedText style={styles.mainTitle}>أين تريد الذهاب؟</ThemedText>
      </View>

      {/* 🔍 شريط البحث الذكي */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="بحث عن منطقة سياحية..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        
        {/* قسم الاقتراحات بناءً على الدولة */}
        {currentCountry ? (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>اقتراحات في {currentCountry}</ThemedText>
              <Pressable><ThemedText style={styles.viewAll}>رؤية الكل</ThemedText></Pressable>
            </View>
            
            {areas.map((area) => (
              <Pressable key={area.id} style={styles.areaCard}>
                <View style={styles.areaInfo}>
                  <ThemedText style={styles.areaName}>{area.name}</ThemedText>
                  <View style={styles.tag}>
                    <ThemedText style={styles.tagText}>{area.type}</ThemedText>
                  </View>
                </View>
                <View style={styles.countryLabel}>
                  <ThemedText style={styles.countryLabelText}>{area.country}</ThemedText>
                </View>
                <Ionicons name="add-circle" size={24} color="#10B981" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.noCountryState}>
            <Ionicons name="map-outline" size={60} color="#E5E7EB" />
            <ThemedText style={styles.noCountryText}>اختر دولة من الرئيسية لبدء التخطيط المخصص</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* 🚀 الزر العائم للتأكيد */}
      <Pressable style={styles.fab}>
        <ThemedText style={styles.fabText}>متابعة المسار</ThemedText>
        <Ionicons name="chevron-forward" size={20} color="#FFF" />
      </Pressable>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  
  // ستايل شريط الدولة
  regionHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  countryBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-end", // ليكون جهة اليمين
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  countryBadgeText: { color: "#166534", fontSize: 13, fontWeight: "600", marginRight: 5 },
  mainTitle: { fontSize: 28, fontWeight: "800", color: "#111827", textAlign: "right" },

  // البحث
  searchContainer: { paddingHorizontal: 24, marginTop: 20 },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 55,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  input: { flex: 1, textAlign: "right", fontSize: 16, color: "#111827", marginRight: 10 },

  scrollBody: { paddingHorizontal: 24, paddingTop: 25, paddingBottom: 100 },
  
  // ستايل كروت المناطق
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  viewAll: { color: "#10B981", fontSize: 13, fontWeight: "600" },
  
  areaCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  areaInfo: { flex: 1, alignItems: "flex-end" },
  areaName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  tag: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  tagText: { fontSize: 11, color: "#6B7280" },
  
  countryLabel: {
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    marginHorizontal: 15,
  },
  countryLabelText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },

  noCountryState: { alignItems: "center", marginTop: 100 },
  noCountryText: { color: "#9CA3AF", textAlign: "center", marginTop: 15, fontSize: 14, paddingHorizontal: 40 },

  // الزر العائم
  fab: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
    backgroundColor: "#111827",
    height: 60,
    borderRadius: 20,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginLeft: 10 },
});