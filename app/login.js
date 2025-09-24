import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable, StyleSheet, Text,
  TextInput,
  View
} from "react-native";

import { api } from "../src/api";
import { API_BASE, KEY_TOKEN, KEY_USER } from "../src/config";

// // ---- fungsi test ----
// async function testPing() {
//   const url = `${API_BASE}/api/ping`;
//   try {
//     console.log("TEST GET →", url);
//     const r = await fetch(url);
//     const t = await r.text();
//     console.log("TEST GET STATUS:", r.status, t);
//     Alert.alert("GET /ping", `status: ${r.status}\nbody: ${t}`);
//   } catch (e) {
//     console.log("TEST GET ERR:", e.message);
//     Alert.alert("GET /ping ERR", String(e.message));
//   }
// }
async function testPostEcho() {
  const url = `${API_BASE}/api/debug/echo`;
  try {
    console.log("TEST POST →", url);
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });
    const t = await r.text();
    console.log("TEST POST STATUS:", r.status, t);
    Alert.alert("POST /debug/echo", `status: ${r.status}\nbody: ${t}`);
  } catch (e) {
    console.log("TEST POST ERR:", e.message);
    Alert.alert("POST /debug/echo ERR", String(e.message));
  }
}
// ----------------------

export default function LoginScreen() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert("Validasi", "Isi email/username dan password.");
      return;
    }
    setBusy(true);
    try {
      console.log("LOGIN →", `${API_BASE}/api/auth/login`);
      const json = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password, device_name: "expo-app" }),
      });
      await AsyncStorage.setItem(KEY_TOKEN, json.token);
      await AsyncStorage.setItem(KEY_USER, JSON.stringify(json.user || {}));
      router.replace("/");
    } catch (e) {
      Alert.alert("Gagal", String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={["#e0f7fa", "#ffffff"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Already have an Account?</Text>
        <Image
          source={require(".././assets/images/KS.png")} // sesuaikan relatif path-nya
          style={styles.illustration}
        />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email / Username</Text>
        <TextInput
          style={styles.input}
          placeholder="username atau email"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="********"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.button, busy && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>

        {/* ⬇️ tombol test HARUS di dalam return */}
        {/* <View style={testStyles.row}>
          <Pressable onPress={testPing} style={testStyles.btn}>
            <Text style={testStyles.txt}>Test GET</Text>
          </Pressable>
          <Pressable
            onPress={testPostEcho}
            style={[testStyles.btn, testStyles.ml8]}
          >
            <Text style={testStyles.txt}>Test POST</Text>
          </Pressable>
        </View> */}
        {/* ⬆️ */}

        <Pressable
          onPress={() => Alert.alert("Info", "Register belum tersedia")}
        >
          <Text style={styles.register}>New user? Register Now</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>Use other Methods</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialContainer}>
          <Pressable style={styles.socialBtn} disabled>
            <FontAwesome name="facebook" size={24} color="#1877f2" />
          </Pressable>
          <Pressable style={styles.socialBtn} disabled>
            <FontAwesome name="google" size={24} color="#db4437" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const testStyles = StyleSheet.create({
  row: { marginTop: 12, flexDirection: "row" },
  btn: {
    flex: 1,
    backgroundColor: "#888",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ml8: { marginLeft: 8, backgroundColor: "#555" },
  txt: { color: "#fff", fontWeight: "600" },
});

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#333" },
  illustration: { width: 120, height: 120, resizeMode: "contain" },
  form: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    elevation: 3,
  },
  label: { fontSize: 14, color: "#555", marginBottom: 5, marginTop: 10 },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 8,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#00bcd4",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 25,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  register: {
    textAlign: "center",
    marginTop: 15,
    color: "#00bcd4",
    fontWeight: "500",
  },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "#ddd" },
  orText: { marginHorizontal: 10, color: "#777" },
  socialContainer: { flexDirection: "row", justifyContent: "center" },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    marginHorizontal: 10,
  },
});
