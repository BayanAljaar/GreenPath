// services/apiClient.ts
import axios from "axios";

// במקום לייבא מ ../constants/api – נגדיר כאן ישירות
const API_BASE_URL = "http://localhost:4001";


console.log(">>> API_BASE_URL (inside apiClient) =", API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
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
    const text = await res.text(); // כדי לראות שגיאה אמיתית בלוג
    console.error("saveTrip failed:", res.status, text);
    throw new Error(`Failed to save trip: ${res.status}`);
  }

  return res.json();
}
