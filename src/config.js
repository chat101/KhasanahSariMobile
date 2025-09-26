// src/config.js
import Constants from "expo-constants";

export const ANDROID_CHANNEL_ID = "alerts"

// Ambil dari app.json → expo.extra.eas.apiBase
export const API_BASE =
  Constants.expoConfig?.extra?.eas?.apiBase ??
  "https://hoks.khasanah-bakery.com";
  // "http://192.168.0.108:8000";

console.log("API_BASE =", API_BASE);

// Storage keys
// const PREFIX = "ksapp:";
export const LAST_SEEN_KEY = "last_seen_wo_main";
export const KEY_USER   = "user";
export const KEY_TOKEN  = "token";
export const KEY_WO_UT  = "seen_wo_utama_key";
export const KEY_WO_TMB = "seen_wo_tambahan_key";

// Interval polling (detik)
export const POLL_SECS = 60;
