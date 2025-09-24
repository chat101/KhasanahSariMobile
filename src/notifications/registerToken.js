// src/notifications/registerToken.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE, KEY_TOKEN } from "../config";

export async function registerAndUploadPushToken() {
  try {
    // --- izin notif (harusnya sudah kamu panggil di Home) ---
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") {
        console.log("push: permission not granted");
        return;
      }
    }

    // --- ambil Expo push token (butuh projectId) ---
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.projectId;

    const expoResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoToken = expoResp.data;

    // --- (opsional) ambil device FCM/APNS token mentah ---
    let nativeToken = null;
    try {
      if (Platform.OS === "android") {
        const dev = await Notifications.getDevicePushTokenAsync(); // FCM
        nativeToken = dev.data;
      } else if (Platform.OS === "ios") {
       
        nativeToken = dev.data;
      }
    } catch (e) {
      console.log("push: getDevicePushToken error:", e?.message || e);
    }

    // --- info device untuk catatan server ---
    const deviceInfo = {
      brand: Device.brand ?? "",
      model: Device.modelName ?? "",
      os_name: Device.osName ?? Platform.OS,
      os_version: String(Device.osVersion ?? ""),
      is_emulator: !Device.isDevice,
    };

    // --- kirim ke backend ---
    const bearer = await AsyncStorage.getItem(KEY_TOKEN);
    if (!bearer) {
      console.log("push: no auth token; skip upload");
      return;
    }

    const url = `${API_BASE}/api/push/register`;
    const body = {
      expo_token: expoToken,
      native_token: nativeToken,
      device: deviceInfo,
    };

    console.log("push: uploading token →", url, body);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("push: server response", res.status, text);

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    return true;
  } catch (e) {
    console.log("push: register/upload error:", e?.message || e);
    return false;
  }
}
