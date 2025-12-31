// services/apiClient.ts
import axios from "axios";
import { Platform } from "react-native";

// تحديد عنوان API حسب المنصة
// على الويب: localhost يعمل
// على التلفون: يجب استخدام IP address للكمبيوتر
// غيّر هذا العنوان إلى IP address لجهازك على الشبكة المحلية
// يمكنك معرفته من: ipconfig (Windows) أو ifconfig (Mac/Linux)
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return "http://localhost:4001";
  }
  // على الأجهزة المحمولة، استخدم IP address للكمبيوتر
  // غيّر هذا إلى IP address لجهازك (مثال: 192.168.1.100 أو 172.18.53.94)
  return "http://172.18.50.111:4001"; // IP address الحالي للكمبيوتر
};

const API_BASE_URL = getApiBaseUrl();

console.log(">>> API_BASE_URL (inside apiClient) =", API_BASE_URL, "Platform:", Platform.OS);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
});

// מודל בסיסי למדינה
export interface Country {
  _id: string;
  code: string;
  name: string;
  region?: string;
  mainLanguage?: string;
  currency?: string;
  flag?: string;
}

// בקשה שמביאה את כל המדינות
export async function fetchCountries(): Promise<Country[]> {
  try {
    console.log(">>> calling /countries from:", API_BASE_URL);
    const res = await api.get<Country[]>("/countries", {
      timeout: 30000, // 30 seconds
    });
    console.log(">>> /countries status =", res.status, "len =", res.data.length);
    return res.data;
  } catch (err: any) {
    console.error(
      ">>> axios error in fetchCountries:",
      err?.message,
      err?.code,
      err?.response?.status,
      err?.response?.data,
      "API_BASE_URL:", API_BASE_URL
    );
    
    // إذا كان الخطأ timeout، أضف رسالة مفيدة
    if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
      console.error(">>> Timeout error - Make sure the API server is running on", API_BASE_URL);
    }
    
    throw err;
  }
}

// מודל בסיסי לעיר
export interface City {
  _id: string;
  name: string;
  countryCode: string;
  description?: string;
  mainLanguage?: string;
  currency?: string;
  tags?: string[];
}


// בקשה שמביאה ערים לפי קוד מדינה (IL, TR, FR...)
export async function fetchCitiesByCountry(countryCode: string): Promise<City[]> {
  const res = await api.get<City[]>("/cities", {
    params: { country: countryCode },
  });
  return res.data;
}
// מודל טיול
export interface Trip {
  _id: string;
  userName: string;
  countryCode: string;
  countryName: string;
  title: string;
  startDate?: string;
  endDate?: string;
  style?: string;
  notes?: string;
  createdAt: string;
}

// למעלה ליד ה־types:
export type TripPayload = {
  userName: string;
  countryCode: string;
  countryName: string;
  title: string;
  startDate: string;
  endDate: string;
  style: string;
  notes?: string;
};

export type SaveTripPayload = {
  userName: string;
  countryCode: string;
  countryName: string;
  title: string;
  startDate?: string;
  endDate?: string;
  style?: string;
  notes?: string;
};

// جلب جميع رحلات المستخدم
export async function fetchUserTrips(userName: string): Promise<Trip[]> {
  try {
    const res = await api.get<{ ok: boolean; trips: Trip[] }>(`/trips/user/${userName}`);
    if (res.data.ok && res.data.trips) {
      return res.data.trips;
    }
    return [];
  } catch (err: any) {
    console.error(">>> axios error in fetchUserTrips:", err?.message);
    throw err;
  }
}

// ---------- AUTH ----------

export type RegisterPayload = {
  fullName: string;
  userName: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  ok: boolean;
  message?: string; // ✅ أضيفيها
  user: {
    id: string;
    fullName: string;
    userName: string;
    email: string;
    token: string; // ⬅️ تأكد من أن هذا الحقل موجود في الـ API، وهو ضروري لـ UserContext
  };
};

export async function registerUser(
  payload: RegisterPayload
): Promise<NonNullable<RegisterResponse["user"]>> {
  const res = await api.post<RegisterResponse>("/auth/register", payload);
  if (!res.data.ok) {
    throw new Error(res.data.message ?? "Registration failed");
  }

  if (!res.data.user) {
    throw new Error("Registration succeeded but user is missing in response");
  }
  console.log("REGISTER API RAW:", res.data);
  return res.data.user;
}



export async function saveTrip(payload: SaveTripPayload) {
  const res = await fetch(`${API_BASE_URL}/trips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to save trip");
  }
  
  const data = await res.json();
  return data.trip; // إرجاع الرحلة المحفوظة مع _id
}

// تحديث رحلة موجودة
export async function updateTrip(
  tripId: string,
  updates: {
    startDate?: string;
    endDate?: string;
    style?: string;
    notes?: string;
  }
): Promise<Trip> {
  try {
    const res = await api.put<{ ok: boolean; trip: Trip }>(`/trips/${tripId}`, updates);
    if (res.data.ok && res.data.trip) {
      return res.data.trip;
    }
    throw new Error("Failed to update trip");
  } catch (err: any) {
    console.error(">>> axios error in updateTrip:", err?.message);
    throw err;
  }
}
