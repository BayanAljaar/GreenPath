// services/apiClient.ts
import axios from "axios";

// במקום לייבא מ ../constants/api – נגדיר כאן ישירות
//const API_BASE_URL = "http://localhost:4001";
//const API_BASE_URL = "http://http://10.0.0.16::4001";
// الرابط الجديد الذي حصلتِ عليه من ngrok
const API_BASE_URL = "https://nonvehement-crestless-aaliyah.ngrok-free.dev";

console.log(">>> API_BASE_URL (inside apiClient) =", API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    "ngrok-skip-browser-warning": "any-value", // ⬅️ هذا الرقم أو كلمة "true" ضرورية جداً // ⬅️ هذا السطر سيجعل البيانات تظهر فوراً
  },
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
    console.log(">>> calling /countries ...");
    const res = await api.get<Country[]>("/countries");
    console.log(">>> /countries status =", res.status, "len =", res.data.length);
    return res.data;
  } catch (err: any) {
    console.error(
      ">>> axios error in fetchCountries:",
      err?.message,
      err?.response?.status,
      err?.response?.data
    );
    //throw err;
    return []; // إرجاع مصفوفة فارغة في حال الخطأ لمنع الانهيار
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

// ---------- AUTH ----------

export type RegisterPayload = {
  id: string;
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
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify(payload),
  });


  if (!res.ok) {
    const text = await res.text(); // כדי לראות שגיאה אמיתית בלוג
    console.error("saveTrip failed:", res.status, text);
    throw new Error(`Failed to save trip: ${res.status}`);
  }

  return res.json();
}

// services/apiClient.ts

// دالة تحديث بيانات المستخدم
export const updateUserInfo = async (userId: string, data: any) => {
  // افترضنا أن المسار في السيرفر هو /auth/update/:id
  const response = await api.patch(`/auth/update/${userId}`, data);
  return response.data;
};

// دالة حذف الحساب
export const deleteAccount = async (userId: string) => {
  const response = await api.delete(`/auth/delete/${userId}`);
  return response.data;
};


// services/apiClient.ts
export async function loginUser(payload: any) {
  // نرسل userNameOrEmail و password كما يتوقع السيرفر في ملف auth.ts
  const res = await api.post("/auth/login", payload); 
  return res.data; // سيعيد { ok: true, user: {...} } أو { ok: false, message: "..." }
}