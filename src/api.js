// src/api.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./config";

export async function api(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = await AsyncStorage.getItem("token"); // KEY_TOKEN kalau kamu pakai konstanta

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    console.log("HTTP →", options.method || "GET", url);
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();

    if (!res.ok) {
      console.log("HTTP ✕", res.status, url, text.slice(0, 300));
      throw new Error(`HTTP ${res.status}`);
      // opsional: jika 401, hapus token dan arahkan ke login
    }
    try { return JSON.parse(text); } catch { return {}; }
  
  } catch (e) {
    console.log("HTTP NET ERR:", url, e.message);
    throw e;
  }
}
