// app/index.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ANDROID_CHANNEL_ID,
  API_BASE,
  KEY_TOKEN,
  KEY_USER,
  KEY_WO_TMB,
  KEY_WO_UT,
  POLL_SECS,
} from "../src/config";
import { registerAndUploadPushToken } from "../src/notifications/registerToken";
// simpan “last seen” khusus pengurangan (lokal; aman walau belum ada di config)
const KEY_WO_KRG = "KEY_WO_KRG";
/* ===== Theme: Tokopedia-ish ===== */
const COLORS = {
  bgTop: "#F2FBF4",
  bgBottom: "#FFFFFF",
  primary: "#03AC0E",
  danger: "#EF4444",
  text: "#0B1D14",
  muted: "#6B7280",
  card: "#FFFFFF",
  border: "#E6F4EA",
  shadow: "#0F172A",
  badgeGreen: "#16A34A",
  badgePink: "#EC4899",
  dot: "#D1E7D5",
  dotActive: "#03AC0E",
};
const RADIUS = 16;

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 18 },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  leftHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF8EC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 18, fontWeight: "900", color: COLORS.primary },
  headerTitleWrap: { gap: 3 },
  hello: { color: COLORS.muted, fontSize: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  roleChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F4F8F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleChipTxt: { fontSize: 12, fontWeight: "700", color: "#476A52" },
  logoutBtn: {
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutText: { color: "#fff", fontWeight: "800" },
    logoutGrad: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: "#ef4444",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
        minWidth: 120,
        alignItems: "center",
      },
      logoutContent: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },

  /* === Carousel === */
  carouselWrap: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    marginBottom: 14,
  },
  slideImg: { width: "100%", height: 170 },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.dot },
  dotActive: {
    width: 18,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.dotActive,
  },

  /* === Categories === */
  catCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  catTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  catItem: { width: "23%", alignItems: "center", marginBottom: 14, gap: 8 },
  catIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#F7FBF8",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  catText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
    textAlign: "center",
  },
  catBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catBadgeTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.2,
  },

  catIconWrapPressed: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catTextPressed: {
    color: COLORS.text,
    fontWeight: "800",
  },
  

  /* Utility */
  center: { justifyContent: "center", alignItems: "center" },

  /* === Section Header (Menu Utama) === */
  sectionHeaderWrap: { marginTop: 6, marginBottom: 10 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF8EC",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  sectionSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  sectionDividerGrad: { height: 6, borderRadius: 999, marginTop: 10 },
});

/* ===== Notif helper ===== */
async function setupNotifications() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "WO Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "alarm",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") await Notifications.requestPermissionsAsync();
    return true;
  } catch (e) {
    console.log("notif setup error:", e?.message || e);
    return false;
  }
}

async function scheduleRepeatingReminder(key, title, body) {
  if (Platform.OS === "web") return;
  const existing = await AsyncStorage.getItem(`notif-${key}`);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing);
    } catch {}
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: title ?? "Work Order Baru",
      body: body ?? "Ada perintah produksi baru hari ini 🚀",
      data: { type: key },
    },
    trigger: { seconds: 60, repeats: true, channelId: ANDROID_CHANNEL_ID },
  });
  await AsyncStorage.setItem(`notif-${key}`, id);
}

/* ====== Slider (tanpa library) ====== */
// const SLIDES = [
//   { id: "1", uri: "https://picsum.photos/1200/600?random=1" },
//   { id: "2", uri: "https://picsum.photos/1200/600?random=2" },
//   { id: "3", uri: "https://picsum.photos/1200/600?random=3" },
// ];
function AutoCarousel({ slides, refreshing = false, onRefresh }) {
  const width = Dimensions.get("window").width - 36; // padding 18 kiri/kanan
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);

  // auto-scroll aman jika slides >= 2
  useEffect(() => {
    if (!slides || slides.length < 2) return;
    const id = setInterval(() => {
      setIdx((curr) => {
        const next = (curr + 1) % slides.length;
        ref.current?.scrollToIndex?.({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [slides?.length]);

  if (!slides || slides.length === 0) {
    return (
      <View style={[styles.carouselWrap, { width }]}>
        <View style={[styles.slideImg, { width, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: COLORS.muted }}>Belum ada slide</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.carouselWrap, { width }]}>
      <FlatList
        ref={ref}
        data={slides}
        keyExtractor={(it) => String(it.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={[styles.slideImg, { width }]} resizeMode="cover" />
        )}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIdx(i);
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View key={i} style={i === idx ? styles.dotActive : styles.dot} />
        ))}
      </View>
    </View>
  );
}


function HapticPressable({ onPress, children, style, androidRipple, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const pressIn = () => {
    setPressed(true);
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  };

  const pressOut = () => {
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  };

  const handlePress = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
    onPress && onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={handlePress}
        onHoverIn={() => Platform.OS === "web" && setPressed(true)}
        onHoverOut={() => Platform.OS === "web" && setPressed(false)}
        android_ripple={androidRipple ?? { color: "#E7F3E9", borderless: true }}
        {...rest}
      >
        {typeof children === "function" ? children({ pressed }) : children}
      </Pressable>
    </Animated.View>
  );
}

/* ====== Categories (dengan badge) ====== */
function CategoryGrid({ items }) {
  return (
    <View style={styles.catCard}>
      <Text style={styles.catTitle}>Categories</Text>
      <View style={styles.catGrid}>
        {items.map((it) => (
          <HapticPressable
            key={it.key}
            onPress={it.onPress || (() => {})}
            style={styles.catItem}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.catIconWrap,
                    pressed && styles.catIconWrapPressed,
                  ]}
                >
                  {!!it.badge && (
                    <View
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: it.badgeColor ?? (it.badgePink ? COLORS.badgePink : COLORS.badgeGreen),
                        },
                      ]}
                    >
                      <Text style={styles.catBadgeTxt} numberOfLines={1}>
                        {it.badge}
                      </Text>
                    </View>
                  )}

                  <Ionicons
                    name={it.icon}
                    size={26}
                    color={pressed ? "#FFFFFF" : COLORS.primary}
                  />
                </View>

                <Text
                  style={[styles.catText, pressed && styles.catTextPressed]}
                  numberOfLines={1}
                >
                  {it.label}
                </Text>
              </>
            )}
          </HapticPressable>
        ))}
      </View>
    </View>
  );
}
function LogoutButton({ onPress, loading = false }) {
    const scale = useRef(new Animated.Value(1)).current;
    const pressIn  = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();
  
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={onPress}
          disabled={loading}
          android_ripple={{ color: "#fecaca" }}
          style={{ borderRadius: 12, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#f87171", "#ef4444", "#dc2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.logoutContent}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutText}>Logout</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }
  
export default function HomeScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [utamaRows, setUtamaRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [hasNewUtama, setHasNewUtama] = useState(false);
  const [maxTambahan, setMaxTambahan] = useState(0);
  const [maxPengurangan, setMaxPengurangan] = useState(0);
  const pollRef = useRef(null);

  //slide
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [slidesRefreshing, setSlidesRefreshing] = useState(false); // <— tambah ini
  // Animasi
  const aFade = useRef(new Animated.Value(0)).current;
  const aTrans = useRef(new Animated.Value(10)).current;
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(aFade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(aTrans, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // --- helpers izin menu
  const allowed = (key) => {
    const r = (role || "").toLowerCase();
    if (!r) return false;
    if (r === "admin") return true;
    if (key === "work-order-utama")
      return ["adminproduksi", "leaderproduksi"].includes(r);
    if (key === "work-order-tambahan")
      return ["adminproduksi", "leaderproduksi", "admin"].includes(r);
      if (key === "work-order-pengurangan")
          return ["adminproduksi", "leaderproduksi", "admin"].includes(r);
    if (key === "selesai-divisi")
      return ["adminproduksi", "leaderproduksi", "gudang"].includes(r);
    if (key === "hasil-giling")
      return ["leaderproduksi", "gudang"].includes(r);
    if (key === "hasil-giling-admin")
      return ["adminproduksi" ].includes(r);
    return false;
  };

  // --- util tanggal
  const ymdTodayLocal = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`;
  };
  const ymd = ymdTodayLocal;

  // --- Aksi navigasi (DIDEFINISIKAN SEBELUM dipakai di useMemo)
  async function markUtamaSeenAndGo() {
    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      if (token) {
        const today = ymd();
        const res = await fetch(
          `${API_BASE}/api/produks/utama?tanggal=${today}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        if (res.ok) {
          const jut = await res.json();
          const rowsUt = jut?.meta?.rows ?? 0;
          const sumUt = jut?.meta?.sum_tong ?? 0;
          await AsyncStorage.setItem(
            KEY_WO_UT,
            `${jut.date}|rows=${rowsUt}|sum=${sumUt}`
          );
          setHasNewUtama(false);
          setUtamaRows(0);
        }
      }
      setHasNewUtama(false);
      const existing = await AsyncStorage.getItem("notif-wo-utama");
      if (existing) {
        try {
          await Notifications.cancelScheduledNotificationAsync(existing);
        } catch {}
        await AsyncStorage.removeItem("notif-wo-utama");
      }
    } catch {}
    router.push("/work-order-utama");
  }

  async function goTambahanAndStop() {
    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      if (token) {
        const today = ymd();
        const res = await fetch(
          `${API_BASE}/api/produks/tambahan-max?tanggal=${today}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        if (res.ok) {
          const jtb = await res.json();
          const maxKe = jtb?.tambahan_ke ?? 0;
          await AsyncStorage.setItem(KEY_WO_TMB, `${jtb.date}|max=${maxKe}`);
        }
      }
      const existing = await AsyncStorage.getItem("notif-wo-tambahan");
      if (existing) {
        try {
          await Notifications.cancelScheduledNotificationAsync(existing);
        } catch {}
        await AsyncStorage.removeItem("notif-wo-tambahan");
      }
    } catch {}
    router.push("/work-order-tambahan");
  }

  async function goPenguranganAndStop() {
      try {
        const token = await AsyncStorage.getItem(KEY_TOKEN);
        if (token) {
          const today = ymd();
          const res = await fetch(
            `${API_BASE}/api/pengurangan/max?tanggal=${today}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
          );
          if (res.ok) {
            const j = await res.json();
            const maxKe = j?.pengurangan_ke ?? 0;
            await AsyncStorage.setItem(KEY_WO_KRG, `${j.date}|max=${maxKe}`);
          }
        }
        const existing = await AsyncStorage.getItem("notif-wo-pengurangan");
        if (existing) {
          try { await Notifications.cancelScheduledNotificationAsync(existing); } catch {}
          await AsyncStorage.removeItem("notif-wo-pengurangan");
        }
      } catch {}
      router.push("/work-order-pengurangan");
    }


      const handleLogout = useCallback(() => {
          Alert.alert(
            "Keluar akun?",
            "Anda yakin ingin logout dari aplikasi ini?",
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                  try {
                    setLoggingOut(true);
                    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
      
                    const token = await AsyncStorage.getItem(KEY_TOKEN);
                    if (token) {
                      await fetch(`${API_BASE}/api/auth/logout`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                      }).catch(() => {});
                    }
                    await AsyncStorage.multiRemove([
                      KEY_TOKEN,
                      KEY_USER,
                      KEY_WO_UT,
                      KEY_WO_TMB,
                      KEY_WO_KRG,
                      "notif-wo-utama",
                      "notif-wo-tambahan",
                      "notif-wo-pengurangan",
                    ]);
                    router.replace("/login");
                  } catch (e) {
                    Alert.alert("Error", String(e.message || e));
                  } finally {
                    setLoggingOut(false);
                  }
                },
              },
            ]
          );
        }, [router]);
      
  // === Kategori utama (dengan badge notifikasi) ===

     const categories = useMemo(() => {
          const canHasilAdmin = allowed("hasil-giling-admin");     // adminproduksi (dan admin super)
          const canHasilNonAdmin = allowed("hasil-giling");        // leaderproduksi, gudang
         const showHasil = canHasilAdmin || canHasilNonAdmin;
    const list = [
      allowed("work-order-utama") && {
        key: "wo_utama",
        label: "WO Utama",
        icon: "clipboard-outline",
        onPress: markUtamaSeenAndGo,
        badge: hasNewUtama ? "BARU" : undefined,
        badgePink: true,
      },
      allowed("work-order-tambahan") && {
        key: "wo_tmb",
        label: "WO Tambahan",
        icon: "add-circle-outline",
        onPress: goTambahanAndStop,
        badge: maxTambahan > 0 ? `Max ${maxTambahan}` : undefined,
        badgePink: true,
      },
      allowed("work-order-pengurangan") && {
        key: "wo_krg",
        label: "WO Pengurangan",
        icon: "cube-outline",
        onPress: goPenguranganAndStop,
        badge: maxPengurangan > 0 ? `Max ${maxPengurangan}` : undefined,
        badgeColor: "#3B82F6", // biru opsional
      },
      allowed("selesai-divisi") && {
        key: "selesai",
        label: "Selesai",
        icon: "time-outline",
        onPress: () => router.push("/selesai-divisi"),
      },
            showHasil && {
        key: "hasil",
        label: "Hasil",
        icon: "pie-chart-outline",
                onPress: () => router.push(
                    canHasilAdmin ? "/hasil-giling-admin" : "/hasil-giling"
                  ),
      },
      {
        key: "lap",
        label: "Laporan",
        icon: "document-text-outline",
        onPress: () => {},
      },
      // { key: "gud", label: "Gudang", icon: "cube-outline", onPress: () => {} },
      {
        key: "scan",
        label: "Scan",
        icon: "qr-code-outline",
        onPress: () => {},
      },
      {
        key: "set",
        label: "Pengaturan",
        icon: "settings-outline",
        onPress: () => {},
      },
  
      ].filter(Boolean);
    return list.slice(0, 8);
  }, [role, hasNewUtama, maxTambahan, maxPengurangan, utamaRows, router]);
  //slide
  const fetchSlides = useCallback(async () => {
    try {
      // pastikan tidak dobel slash saat join
      const base = String(API_BASE || "").replace(/\/+$/, "");
      const url = `${base}/api/slides`; // <-- sesuai route kamu: Route::get('/slides', ...)
      console.log("Fetching slides from:", url);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
  
      // backend kamu mengembalikan array langsung: [{id, uri}, ...]
      const norm = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
  
      const cleaned = norm
        .filter((x) => x && x.id != null && x.uri)
        .map((x) => ({ id: String(x.id), uri: String(x.uri) }));
  
      setSlides(cleaned);
    } catch (e) {
      console.log("slides fetch error:", e?.message || e);
      // fallback dummy agar UI tetap hidup (opsional)
      setSlides([
        { id: "1", uri: "https://picsum.photos/1200/600?random=1" },
        { id: "2", uri: "https://picsum.photos/1200/600?random=2" },
        { id: "3", uri: "https://picsum.photos/1200/600?random=3" },
      ]);
    } finally {
      setSlidesLoading(false);
    }
  }, []);
  const handleRefreshSlides = useCallback(async () => {
    try {
      setSlidesRefreshing(true);
      await fetchSlides();
    } finally {
      setSlidesRefreshing(false);
    }
  }, [fetchSlides]);
  // ===== efek & polling =====
  useEffect(() => {
    (async () => {
      try {
        await Notifications.getNotificationChannelAsync(ANDROID_CHANNEL_ID);
      } catch {}
    })();
  }, []);

  const checkOverview = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      if (!token) return;
      const today = ymdTodayLocal();
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [resUt, resTmb, resKrg] = await Promise.all([
        fetch(`${API_BASE}/api/produks/utama?tanggal=${today}`, { headers }),
        fetch(`${API_BASE}/api/produks/tambahan-max?tanggal=${today}`, {
          headers,
        }),
        fetch(`${API_BASE}/api/pengurangan/max?tanggal=${today}`, { headers }),
      ]);

      if (!resUt.ok) throw new Error(`utama HTTP ${resUt.status}`);
      const jut = await resUt.json();
      const rowsUt = jut?.meta?.rows ?? 0;
      const sumUt = jut?.meta?.sum_tong ?? 0;
      setUtamaRows(rowsUt);
      const nowKeyUt = `${jut.date}|rows=${rowsUt}|sum=${sumUt}`;
      const seenUt = (await AsyncStorage.getItem(KEY_WO_UT)) || "";
      const isNewUtama = rowsUt > 0 && nowKeyUt !== seenUt;
      setHasNewUtama(isNewUtama);
      if (isNewUtama) {
        await scheduleRepeatingReminder(
          "wo-utama",
          "Data Baru di Work Order Utama",
          `Tanggal ${jut.date} (total item: ${rowsUt}, total tong: ${sumUt})`
        );
      }

      if (resTmb.ok) {
        const jtb = await resTmb.json();
        const maxKe = jtb?.tambahan_ke ?? 0;
        setMaxTambahan(maxKe);

        const nowKeyTmb = `${jtb.date}|max=${maxKe}`;
        const seenTmb = (await AsyncStorage.getItem(KEY_WO_TMB)) || "";
        if (maxKe > 0 && nowKeyTmb !== seenTmb) {
          await scheduleRepeatingReminder(
            "wo-tambahan",
            "Perintah Tambahan Terbaru",
            `Tanggal ${jtb.date}, tambahan ke-${maxKe}`
          );
        }
      }
      
      if (resKrg.ok) {
        const jkrg = await resKrg.json();
        const maxKeKrg = jkrg?.pengurangan_ke ?? 0;
        setMaxPengurangan(maxKeKrg);
        const nowKeyKrg = `${jkrg.date}|max=${maxKeKrg}`;
        const seenKrg = (await AsyncStorage.getItem(KEY_WO_KRG)) || "";
        if (maxKeKrg > 0 && nowKeyKrg !== seenKrg) {
          await scheduleRepeatingReminder(
            "wo-pengurangan",
            "Pengurangan Produksi Terbaru",
            `Tanggal ${jkrg.date}, pengurangan ke-${maxKeKrg}`
          );
        }
      }
    } catch (e) {
      console.log("overview error:", e?.message || e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(KEY_TOKEN);
        if (!token) {
          router.replace("/login");
          return;
        }
        const raw = await AsyncStorage.getItem(KEY_USER);
        const user = raw ? JSON.parse(raw) : {};
        setRole(String(user.role || ""));
        setName(user.name || "");
        animateIn();
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  //slide
  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  useEffect(() => {
    (async () => {
      const auth = await AsyncStorage.getItem(KEY_TOKEN);
      if (auth) {
        const ok = await setupNotifications();
        if (ok) await registerAndUploadPushToken();
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subRecv = Notifications.addNotificationReceivedListener(
      async (notif) => {
        const data = notif?.request?.content?.data || {};
        if (data.type === "wo_utama_created") {
          setHasNewUtama(true);
          try {
            await checkOverview();
          } catch {}
        }
        if (data.type === "wo_tambahan_created") {
          const ke = Number(data.ke || 0);
          if (ke > 0) setMaxTambahan(ke);
          try {
            await checkOverview();
          } catch {}
        }
                if (data.type === "wo_pengurangan_created") {
                    const ke = Number(data.ke || 0);
                    if (ke > 0) setMaxPengurangan(ke);
                    try { await checkOverview(); } catch {}
                  }
      }
    );
    return () => subRecv.remove();
  }, [checkOverview]);

  useEffect(() => {
    checkOverview();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(checkOverview, POLL_SECS * 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkOverview]);

  if (loading) {
    return (
      <LinearGradient
      colors={["#E6F9EC", "#FFFFFF"]} // hijau muda → putih halus
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" />
      </LinearGradient>
    );
  }

  const initial = (name || "K").trim().slice(0, 1).toUpperCase();
  const roleLabel = (role || "").replace(/(^|\s)\S/g, (t) => t.toUpperCase());

  return (
    <LinearGradient
      colors={[COLORS.bgTop, COLORS.bgBottom]}
      style={styles.container}
    >
      <SafeAreaView
        style={{ flex: 0.1, backgroundColor: "#F2FBF4" }}
      ></SafeAreaView>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* MENU UTAMA – header cantik */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionChip}>
              <Ionicons name="home-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Menu Utama</Text>
          </View>
          {/* <Text style={styles.sectionSub}>Akses cepat fitur produksi</Text> */}

          {/* garis dekoratif lembut */}
          <LinearGradient
            colors={["#E6F4EA", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionDividerGrad}
          />
        </View>
        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.leftHead}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initial}</Text>
              </View>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.hello}>Selamat datang </Text>
                <Text style={styles.headerTitle}>
                  Halo{name ? `, ${name}` : ""}
                </Text>
                {!!role && (
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipTxt}>{roleLabel}</Text>
                  </View>
                )}
              </View>
            </View>

            <LogoutButton onPress={handleLogout} loading={loggingOut} />
          </View>

          {/* SLIDER */}
          {/* SLIDER */}
          {slidesLoading ? (
  <View style={[styles.carouselWrap, { width: Dimensions.get("window").width - 36 }]}>
    <View style={[styles.slideImg, { alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  </View>
) : (
  <AutoCarousel
    slides={slides}
    refreshing={slidesRefreshing}
    onRefresh={handleRefreshSlides}
  />
)}


          {/* KATEGORI (dengan badge) */}
          <Animated.View
            style={{ opacity: aFade, transform: [{ translateY: aTrans }] }}
          >
            <CategoryGrid items={categories} />
          </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
