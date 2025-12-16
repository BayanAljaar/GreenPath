// app/(tabs)/_layout.tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
// 🏆 نستخدم الأيقونات مباشرةً من هنا
import { MaterialCommunityIcons, FontAwesome, Ionicons } from '@expo/vector-icons'; 


// 💡 تم حذف:
// import { TabBarIcon } from "../../components/TabBarIcon";
// import { Colors } from "../../constants/Colors";
// import { useColorScheme } from "../../hooks/useColorScheme"; 


// 💡 ملاحظة: سنستخدم لون ثابت ('#1f9d55' وهو اللون الأخضر الأساسي) بدلاً من useColorScheme المفقود.
const ACTIVE_TINT_COLOR = '#1f9d55'; 

export default function TabLayout() {
  // 💡 تم حذف: const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_TINT_COLOR, // نستخدم اللون الثابت
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 5 }, // لتحسين مظهر الشريط السفلي
      }}
    >
      {/* 1. Home / דף הבית */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            // استخدام Ionicons
            <Ionicons name="home" size={26} color={color} /> 
          ),
        }}
      />

      {/* 2. מסלול / תכנון טיול ירוק (Plan) */}
      <Tabs.Screen
        name="plan" 
        options={{
          title: "PlanPath",
          tabBarIcon: ({ color }) => (
            // استخدام Ionicons
            <Ionicons name="map" size={26} color={color} />
          ),
        }}
      />

      {/* 3. زياراتي / הטיולים השמורים (Trips) */}
      <Tabs.Screen
        name="trips"
        options={{
          title: "MyTrips",
          tabBarIcon: ({ color }) => (
            // استخدام MaterialCommunityIcons
            <MaterialCommunityIcons name="map-marker-path" size={26} color={color} />
          ),
        }}
      />

      {/* 4. Share / קהילה ושיתופים */}
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color }) => (
            // استخدام Ionicons
            <Ionicons name="share-social" size={26} color={color} />
          ),
        }}
      />
      
      {/* 5. Profile / פרופיל */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            // استخدام FontAwesome
            <FontAwesome name="user-circle" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
