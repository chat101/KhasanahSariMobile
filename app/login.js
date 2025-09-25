import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, ApiError } from "../src/api";
import { API_BASE, KEY_TOKEN, KEY_USER } from "../src/config";

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
      if (e instanceof ApiError) {
        if (e.code === "NETWORK_ERROR" || e.code === "TIMEOUT") {
          Alert.alert("Koneksi", e.message);
        } else {
          switch (e.status) {
            case 401:
              Alert.alert("Login gagal", "Password salah. Silakan coba lagi.");
              break;
            case 404:
              Alert.alert("Tidak ditemukan", "UID/Email tidak terdaftar.");
              break;
            case 422: {
              const fieldMsg =
                typeof e.details === "object"
                  ? Object.values(e.details?.errors || {}).flat().join("\n")
                  : "";
              Alert.alert("Validasi", fieldMsg || e.message);
              break;
            }
            case 429:
              Alert.alert("Terlalu sering", "Terlalu banyak percobaan. Coba lagi beberapa saat.");
              break;
            case 500:
            default:
              Alert.alert("Kesalahan Server", e.message || "Terjadi kesalahan pada server.");
              break;
          }
        }
      } else {
        Alert.alert("Gagal", String(e?.message || e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.gradient}>
        
        {/* Fixed Container - Tidak ada scroll sama sekali */}
        <View style={styles.fixedContainer}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require(".././assets/images/KS.png")}
                style={styles.illustration}
              />
            </View>
            <Text style={styles.welcome}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Login to Your Account</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email / Username</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome 
                  name="user" 
                  size={18} 
                  color="#999" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="username atau email"
                  value={login}
                  onChangeText={setLogin}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome 
                  name="lock" 
                  size={20} 
                  color="#999" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            <Pressable style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginButton, busy && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>

            <Pressable 
              onPress={() => Alert.alert("Info", "Register belum tersedia")}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                Don't have an account? <Text style={styles.registerHighlight}>Sign Up</Text>
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <Pressable style={styles.socialButton}>
                <FontAwesome name="facebook" size={20} color="#1877f2" />
                <Text style={styles.socialText}>Facebook</Text>
              </Pressable>
              <Pressable style={styles.socialButton}>
                <FontAwesome name="google" size={20} color="#db4437" />
                <Text style={styles.socialText}>Google</Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 Your App Name. All rights reserved.</Text>
          </View>
        </View>
        
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  fixedContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoContainer: {
    marginBottom: 15,
  },
  illustration: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    paddingHorizontal: 12,
    height: 45,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: "#667eea",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerLink: {
    alignItems: 'center',
    marginBottom: 15,
  },
  registerText: {
    color: "#666",
    fontSize: 14,
  },
  registerHighlight: {
    color: "#667eea",
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#999",
    fontSize: 13,
    fontWeight: "500",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
  },
  socialText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    textAlign: 'center',
  },
});