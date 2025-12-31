// app/UserContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { updateUserInfo, deleteAccount, api } from '../services/apiClient';

export type User = {
  id: string;
  userName: string;
  fullName: string; // تأكدي أنها fullName (N كبيرة)
  email: string;
  token: string;
  profilePicture?: string; // ⬅️ أضيفي هذا السطر (العلامة ? تعني أنه اختياري)
} | null;

type UserContextValue = {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  deleteMyAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser){ 
          //setUserState(JSON.parse(storedUser));
          const parsedUser = JSON.parse(storedUser);
          console.log("تم تحميل المستخدم من الذاكرة:", parsedUser.profilePicture ? "توجد صورة" : "لا توجد صورة");
          setUserState(parsedUser);
        }
        
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    loadUser();
  }, []);

  const setUser = async (newUser: User) => {
    setUserState(newUser);
    if (newUser) await AsyncStorage.setItem("user", JSON.stringify(newUser));
    else await AsyncStorage.removeItem("user");
  };
  

  // دالة تحديث البيانات في الـ Context والـ DB
  const updateUser = async (data: any) => {
    if (!user) return;
    try {
      //const res = await updateUserInfo(user.id, data);
      const res = await api.patch(`/auth/update/${user.id}`, data);

      if (res.data.ok  )  {
        // ⚠️ ملاحظة هامة: نستخدم البيانات العائدة من السيرفر (res.data.user) 
      // لأنها تحتوي على الصورة والاسم الجديدين بشكل مؤكد
        const updatedUserFromDB = { ...user, ...res.data.user };
        const updatedUser = { ...user, ...data };
        //await setUser(updatedUserFromDB); // هذه الدالة تقوم بالتخزين في AsyncStorage تلقائياً
        setUser(updatedUser);// تحديث الحالة والتخزين المحلي
        // 3. حفظ النسخة الجديدة في ذاكرة الهاتف (AsyncStorage)
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        
        console.log("Profile updated and saved to local storage,Image synced with Server and LocalStorage");
      } else {
        throw new Error(res.data.message||"Update failed on server");
      }
    } catch (e:any) { 
      console.error("Update error:", e);
      alert("حدث خطأ أثناء تحديث البيانات: " + (e.response?.data?.message || e.message));
      throw e;
     }
  };


  const logout = async () => {
      // 1. مسح الحالة والتخزين
      setUserState(null);
      await AsyncStorage.clear(); 
      
      // 2. إعادة توجيه قوية (خاصة للويب لمنع الدخول التلقائي)
      if (typeof window !== 'undefined') {
        window.location.href = '/(auth)/landing'; 
      } else {
        router.replace('/(auth)/landing');
      }
  };

  const deleteMyAccount = async () => {
    if (!user) return;
    await deleteAccount(user.id);
    await logout();
  };

  if (isLoading) return null;

  return (
    <UserContext.Provider value={{ user, setUser, logout, updateUser, deleteMyAccount }}>
      {children}
    </UserContext.Provider>
  );
};


export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
};
//export default UserContext;