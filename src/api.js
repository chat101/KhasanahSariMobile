// src/api.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE, KEY_TOKEN } from "./config";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, options = {}) {
  // Bangun URL (dukung absolute URL juga)
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  // Ambil token (pakai KEY_TOKEN; fallback ke "token" jika perlu)
  let token = null;
  try {
    token = await AsyncStorage.getItem(KEY_TOKEN);
    if (!token) token = await AsyncStorage.getItem("token");
  } catch {
    // abaikan
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Timeout via AbortController (default 15 detik)
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log("HTTP →", options.method || "GET", url);

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Baca body sebagai text dulu agar aman untuk non-JSON
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* bukan JSON */ }

    if (!res.ok) {
      // Susun pesan & kode dari server jika tersedia
      const msg =
        data?.message || data?.error || text || `HTTP ${res.status}`;
      const code =
        data?.code || data?.error_code || `HTTP_${res.status}`;

      // Contoh: kalau mau auto-logout saat 401, aktifkan blok ini:
      // if (res.status === 401) {
      //   try { await AsyncStorage.removeItem(KEY_TOKEN); } catch {}
      //   // Bisa juga: navigate ke login di layer pemanggil
      // }

      throw new ApiError(msg, { status: res.status, code, details: data });
    }

    return data ?? {};
  } catch (e) {
    clearTimeout(timer);

    // Timeout
    if (e?.name === "AbortError") {
      throw new ApiError("Permintaan timeout. Periksa koneksi internet Anda.", {
        status: 0,
        code: "TIMEOUT",
      });
    }

    // Network error umum: "Network request failed"
    if (e?.message?.includes("Network request failed")) {
      throw new ApiError(
        "Tidak ada koneksi internet atau server tidak dapat dijangkau.",
        { status: 0, code: "NETWORK_ERROR" }
      );
    }

    // Teruskan ApiError apa adanya
    if (e instanceof ApiError) throw e;

    // Fallback unknown
    console.log("HTTP NET ERR:", url, e?.message || e);
    throw new ApiError(String(e?.message || e), { status: 0, code: "UNKNOWN" });
  }
}
