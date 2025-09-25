// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../src/api";
import { ANDROID_CHANNEL_ID, API_BASE, LAST_SEEN_KEY, POLL_SECS } from "../src/config";

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason?.message || e?.reason || "");
    if (msg.includes("Unable to activate keep awake")) {
      e.preventDefault(); // swallow error keep-awake di web
    }
  });
}
// util
function ymdTodayLocal() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
const Storage = {
  async get(key) { return AsyncStorage.getItem(String(key)); },
  async set(key, value) {
    if (value == null) return AsyncStorage.removeItem(String(key));
    return AsyncStorage.setItem(String(key), String(value));
  },
  async multiRemove(keys = []) { return AsyncStorage.multiRemove(keys.filter(Boolean).map(String)); },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermissionsAndChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "alarm",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") await Notifications.requestPermissionsAsync();
  }
}

async function notifyNewWorkOrder(count) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "WO Utama: Data baru",
      body: `${count} item baru tersedia`,
      data: { url: "/work-order-utama" },
      sound: "default",
    },
    trigger: null,
  });
}

async function fetchLatestWorkOrderMeta() {
  try {
    const today = ymdTodayLocal();
    const url = `${API_BASE}/api/produks/utama?tanggal=${encodeURIComponent(today)}&per_page=1&page=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    if (!res.ok || !ct.includes("application/json")) {
      const snippet = text.slice(0, 160).replace(/\s+/g, " ");
      throw new Error(`HTTP ${res.status} non-JSON: ${snippet}`);
    }
    const json = JSON.parse(text);
    const rows = json?.meta?.rows ?? 0;
    const sumTong = json?.meta?.sum_tong ?? 0;
    const date = json?.date ?? today;
    const digest = `${date}|rows=${rows}|sum=${sumTong}`;
    return { digest, newCount: rows };
  } catch (e) {
    console.log("fetchLatestWorkOrderMeta error:", e);
    return null;
  }
}

async function checkWorkOrderBaru() {
  const latest = await fetchLatestWorkOrderMeta();
  if (!latest) return;
  const lastSeen = (await Storage.get(LAST_SEEN_KEY)) || "";
  if (latest.digest && latest.digest !== lastSeen) {
    if ((latest.newCount || 0) > 0) await notifyNewWorkOrder(latest.newCount);
    await Storage.set(LAST_SEEN_KEY, latest.digest);
  }
}

export default function Layout() {
  const intervalRef = useRef(null);

  useEffect(() => {
    ensurePermissionsAndChannel().catch(() => {});
    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(checkWorkOrderBaru, POLL_SECS * 1000);
    };
    const stopPolling = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    startPolling();
    const appStateSub = AppState.addEventListener("change", (s) => {
      if (s === "active") startPolling(); else stopPolling();
    });

    api("/api/ping").then((r) => console.log("PING OK", r)).catch((e) => console.log("PING ERR", e.message));

    return () => { stopPolling(); appStateSub.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subTap = Notifications.addNotificationResponseReceivedListener((resp) => {
      const url = resp?.notification?.request?.content?.data?.url;
      if (url) router.push(url);
    });
    return () => { subTap.remove(); };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: "Menu Utama" }} />
        <Stack.Screen name="work-order-utama" options={{ title: "Work Order Utama" }} />
        <Stack.Screen name="work-order-tambahan" options={{ title: "Work Order Tambahan" }} />
        <Stack.Screen name="work-order-pengurangan" options={{ title: "Work Order Pengurangan" }} />

        {/* ✅ tambahkan route hasil-divisi */}
        <Stack.Screen name="hasil-giling" options={{ title: "Hasil Divisi" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
