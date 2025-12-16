// app/UserContext.tsx
// app/UserContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

// 🏆 النوع الحقيقي: يشمل اسم المستخدم والاسم الكامل والتوكن
export type User = {
  userName: string; // اسم مستخدم فريد
  name: string; // اسم كامل (يُستخدم بدلاً من fullName)
  token: string; // رمز JWT الذي يسمح بالوصول إلى الـ API
} | null;

type UserContextValue = {
  user: User;
  setUser: (user: User) => void;
  // دالة لتسجيل الخروج
  logout: () => void; 
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true); // للتحميل الأولي

  // دالة لتحميل المستخدم من التخزين المحلي
  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUserState(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load user from storage", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // دالة لحفظ/إزالة المستخدم من الحالة والتخزين
  const setUser = async (newUser: User) => {
    setUserState(newUser);
    try {
      if (newUser) {
        // حفظ المستخدم الحقيقي في AsyncStorage
        await AsyncStorage.setItem("user", JSON.stringify(newUser)); 
      } else {
        await AsyncStorage.removeItem("user");
      }
    } catch (e) {
      console.error("Failed to save/remove user from storage", e);
    }
  };

  const logout = async () => {
    await setUser(null);
    router.replace('/(auth)/landing');
  };

  if (isLoading) {
    return null; // يمكن استبدالها بشاشة تحميل
  }
  
  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
};