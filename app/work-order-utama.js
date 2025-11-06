// WorkOrderUtama.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, KEY_TOKEN } from "../src/config";

/* ========= Helpers ========= */
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined) return "-";
  const fixed = Number(n).toFixed(decimals);
  const [i, d] = fixed.split(".");
  const withThousand = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${withThousand},${d}` : withThousand;
};
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/* ========= Theme: Tokopedia-ish ========= */
const COLORS = {
  page: "#F2FBF4",
  card: "#FFFFFF",
  text: "#0B1D14",
  sub: "#6B7280",
  border: "#E6F4EA",
  head: "#EAF8EC",
  rowEven: "#FAFCFB",
  rowOdd: "#FFFFFF",
  primary: "#03AC0E",
  primaryDark: "#1F7A28",
  info: "#0284C7",
  violet: "#7C3AED",
  danger: "#EF4444",
};
const BORDER = COLORS.border;

export default function WorkOrderUtama() {
  const insets = useSafeAreaInsets();

  // ===== Date picker =====
  const [dateObj, setDateObj] = useState(() => new Date());
  const [tanggal, setTanggal] = useState(() => toYMD(new Date()));
  const [showPicker, setShowPicker] = useState(false);

  // ===== Data state =====
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ rows: 0, sum_tong: 0, sum_pcs: 0 });

  // ===== Fetch =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 15000);

    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      const url = `${API_BASE}/api/produks/utama?tanggal=${encodeURIComponent(
        tanggal
      )}&per_page=500&page=1`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      const json = await res.json();

      const mapped = (json?.data ?? []).map((it) => ({
        id: String(it.mproducts_id ?? it.id ?? Math.random()),
        nama: it.nama ?? "-",
        patokan: Number(it.patokan ?? 0),
        total_utama: Number(it.total_utama ?? 0),
        konversi_utama: Number(it.konversi_utama ?? it.konversiutama ?? 0),
      }));

      const metaSafe = {
        rows: json?.meta?.rows ?? mapped.length,
        sum_tong:
          json?.meta?.sum_tong ??
          mapped.reduce((a, b) => a + (Number(b.total_utama) || 0), 0),
        sum_pcs:
          json?.meta?.sum_pcs ??
          mapped.reduce((a, b) => a + (Number(b.konversi_utama) || 0), 0),
      };

      setItems(mapped);
      setMeta(metaSafe);
    } catch (e) {
      setError(e.name === "AbortError" ? "Timeout" : String(e.message || e));
      setItems([]);
      setMeta({ rows: 0, sum_tong: 0, sum_pcs: 0 });
    } finally {
      clearTimeout(to);
      setLoading(false);
      setRefreshing(false);
    }
  }, [tanggal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ===== Date picker handler =====
  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event?.type === "dismissed") return;
    const d = selectedDate ?? dateObj;
    setDateObj(d);
    setTanggal(toYMD(d));
  };
  const resetToday = () => {
    const d = new Date();
    setDateObj(d);
    setTanggal(toYMD(d));
  };

  // ===== Header (control + summary + table header) =====
  const ListHeader = useMemo(
    () => (
      <View>
        {/* Title + actions */}
        <View style={s.topBar}>
          <Text style={s.title}>Work Order Utama</Text>
          <Pressable style={s.iconBtn} onPress={onRefresh} android_ripple={{ color: "#E7F3E9" }}>
            <Ionicons name="refresh" size={18} color={COLORS.primaryDark} />
            <Text style={s.iconBtnTxt}>Muat Ulang</Text>
          </Pressable>
        </View>

        {/* Date control */}
        <View style={s.dateRow}>
          <View style={s.dateLeft}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primaryDark} />
            <Text style={s.dateLabel}></Text>
            <Pressable onPress={() => setShowPicker(true)} style={s.dateButton}>
              <Text style={s.dateText}>{tanggal}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
            </Pressable>
          </View>
          <Pressable onPress={resetToday} style={s.todayBtn} android_ripple={{ color: "#DCF7E2" }}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={s.todayTxt}>Hari ini</Text>
          </Pressable>
        </View>

        {/* iOS inline picker */}
        {Platform.OS === "ios" && showPicker && (
          <DateTimePicker value={dateObj} mode="date" display="inline" onChange={onChangeDate} />
        )}

        {/* Summary Cards */}
        <View style={s.summaryWrap}>
          <View style={s.card}>
            <View style={[s.cardIcon, { backgroundColor: "#EAF8FC" }]}>
              <Ionicons name="cube-outline" size={20} color={COLORS.info} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardLabel}>Total Tong</Text>
              <Text style={s.cardValue}>{meta.sum_tong === 0 ? "-" : fmt(meta.sum_tong, 1)}</Text>
            </View>
          </View>
          <View style={s.card}>
            <View style={[s.cardIcon, { backgroundColor: "#F2ECFE" }]}>
              <Ionicons name="layers-outline" size={20} color={COLORS.violet} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardLabel}>Konversi (Pcs)</Text>
              <Text style={s.cardValue}>{meta.sum_pcs === 0 ? "-" : fmt(meta.sum_pcs, 0)}</Text>
            </View>
          </View>
        </View>

        {/* Table header */}
        <View style={[s.row, s.headerRow]}>
          <Text style={[s.cell, s.colNo, s.headerText, s.center]}>No</Text>
          <Text style={[s.cell, s.colProduk, s.headerText]} numberOfLines={1}>Produk</Text>
          <Text style={[s.cell, s.colRight, s.headerText, s.center]} numberOfLines={2}>Jumlah Tong</Text>
          <Text style={[s.cell, s.colRight, s.headerText, s.center]} numberOfLines={2}>Standar/Tong</Text>
          <Text style={[s.cell, s.colRight, s.headerText, s.center, s.noRightBorder]} numberOfLines={2}>
            Konversi (Pcs)
          </Text>
        </View>
      </View>
    ),
    [tanggal, showPicker, dateObj, meta.sum_tong, meta.sum_pcs]
  );

  const renderItem = ({ item, index }) => (
    <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
      <Text style={[s.cell, s.colNo, s.center]}>{index + 1}</Text>
      <Text style={[s.cell, s.colProduk]} numberOfLines={2}>{item.nama}</Text>
      <Text style={[s.cell, s.colRight, s.semibold, s.primaryDark]}>{fmt(item.total_utama, 1)}</Text>
      <Text style={[s.cell, s.colRight]}>{fmt(item.patokan, 0)}</Text>
      <Text style={[s.cell, s.colRight, s.noRightBorder]}>
        {item.konversi_utama === 0 ? "-" : fmt(item.konversi_utama, 0)}
      </Text>
    </View>
  );

  const ListFooter = useMemo(
    () => (
      <View style={[s.row, s.footerRow]}>
        <Text style={[s.cell, s.colProduk, s.center, s.semibold]}>Total</Text>
        <Text style={[s.cell, s.hidden]} />
        <Text style={[s.cell, s.colRight, s.semibold, s.primaryDark]}>
          {meta.sum_tong === 0 ? "-" : fmt(meta.sum_tong, 1)}
        </Text>
        <Text style={[s.cell, s.colRight]}>—</Text>
        <Text style={[s.cell, s.colRight, s.noRightBorder]}>
          {meta.sum_pcs === 0 ? "-" : fmt(meta.sum_pcs, 0)}
        </Text>
      </View>
    ),
    [meta.sum_tong, meta.sum_pcs]
  );

  return (
    <SafeAreaView style={[s.page, { paddingBottom: Math.max(insets.bottom, 16) }]} edges={["bottom"]}>
      {/* Android date picker */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker value={dateObj} mode="date" display="calendar" onChange={onChangeDate} />
      )}

      {loading && items.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={s.loadingTxt}>Memuat data...</Text>
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <Ionicons name="warning-outline" size={18} color="#b91c1c" />
          <Text style={s.errorText}>Gagal memuat data: {error}</Text>
          <Pressable style={s.retryBtn} onPress={fetchData}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.retryTxt}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        // ===== Card pembungkus tabel =====
        <View style={s.tableCard}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="document-text-outline" size={28} color="#9ca3af" />
                <Text style={s.empty}>Tidak ada data.</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

/* ========= Styles ========= */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.page, padding: 8 },

  // Card pembungkus tabel
  tableCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden", // penting untuk radius
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
    marginLeft:6,
  },
  title: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F4F8F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  iconBtnTxt: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 12 },

  // Date row
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
    justifyContent: "space-between",
  },
  dateLeft: { flexDirection: "row", alignItems: "center", gap: 8,marginLeft:6 },
  dateLabel: { fontSize: 14, color: COLORS.text, fontWeight: "800" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderWidth: 5,
    borderColor: BORDER,
    borderRadius: 10,
  },
  dateText: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E7F3E9",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  todayTxt: { color: COLORS.primary, fontWeight: "800", fontSize: 12 },

  // Summary cards
  summaryWrap: { flexDirection: "row", gap: 12, marginTop: 1, marginBottom: 15 },
  card: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 12, color: COLORS.sub, fontWeight: "700" },
  cardValue: { fontSize: 18, color: COLORS.text, fontWeight: "900", marginTop: 1 },

  // Table-like
  row: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,      // garis antar-baris
    borderColor: BORDER,
  },
  headerRow: {
    backgroundColor: COLORS.head,
    borderBottomWidth: 1,      // garis bawah header
    borderColor: BORDER,
  },
  rowOdd: { backgroundColor: COLORS.rowOdd },
  rowEven: { backgroundColor: COLORS.rowEven },
  footerRow: {
    backgroundColor: "#F6FAF7",
    borderTopWidth: 1,         // garis atas footer
    borderColor: BORDER,
  },

  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 1,
  },
  noRightBorder: { borderRightWidth: 0 },

  colNo: { width: 60, textAlign: "center" },
  colProduk: { flex: 1, minWidth: 120,fontSize:12 },
  colRight: { width: 130, textAlign: "center" },
  headerText: { fontSize: 12, fontWeight: "900", color: COLORS.primaryDark },

  center: { textAlign: "center" },
  semibold: { fontWeight: "800" },
  primaryDark: { color: COLORS.primaryDark },

  // States
  emptyWrap: { alignItems: "center", paddingVertical: 24, gap: 8 },
  empty: { textAlign: "center", color: COLORS.sub, fontWeight: "700" },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadingTxt: { color: COLORS.sub, fontSize: 12 },
  errorWrap: {
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 10,
    alignItems: "center",
    margin: 16,
  },
  errorText: { color: "#B91C1C", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },

  hidden: { width: 48, color: "transparent" },
});
