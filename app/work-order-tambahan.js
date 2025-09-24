// WorkOrderTambahan.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE, KEY_TOKEN } from "../src/config";

// Format angka ala Indonesia: 1.234,5
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined) return "-";
  const fixed = Number(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const withThousand = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart ? `${withThousand},${decPart}` : withThousand;
};

// YYYY-MM-DD (local)
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const T_GREEN = "#03AC0E";
const BORDER = "#E5E7EB";

export default function WorkOrderTambahan() {
  // ====== DATE PICKER STATE ======
  const [dateObj, setDateObj] = useState(() => new Date());
  const [tanggal, setTanggal] = useState(() => toYMD(new Date()));
  const [showPicker, setShowPicker] = useState(false);

  // ====== DATA STATE ======
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState([]); // [{tambahan_ke, detail:[...], sum_tong, sum_pcs}]
  const [items, setItems] = useState([]);     // fallback lama
  const [meta, setMeta] = useState({ rows: 0, sum_tong: 0, sum_pcs: 0 });

  // ====== FETCH ======
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 15000);

    const base = API_BASE.replace(/\/+$/, "");
    const perBatchUrls = [
      `${base}/api/produksi/load-produks?tanggal=${encodeURIComponent(tanggal)}`,
      `${base}/produksi/load-produks?tanggal=${encodeURIComponent(tanggal)}`,
    ];
    const legacyUrl = `${base}/api/produks/tambahan?tanggal=${encodeURIComponent(tanggal)}&per_page=500&page=1`;

    const token = await AsyncStorage.getItem(KEY_TOKEN);
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const tryFetchJson = async (url) => {
      const res = await fetch(url, { signal: controller.signal, headers });
      const text = await res.text();
      if (!res.ok) {
        const snippet = text.slice(0, 200).replace(/\s+/g, " ");
        throw new Error(`HTTP ${res.status} at ${url}: ${snippet}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const snippet = text.slice(0, 200).replace(/\s+/g, " ");
        throw new Error(`Non-JSON response at ${url}: ${snippet}`);
      }
      return JSON.parse(text);
    };

    try {
      // 1) Coba endpoint per-gilingan
      let json = null;
      for (let i = 0; i < perBatchUrls.length; i++) {
        try {
          json = await tryFetchJson(perBatchUrls[i]);
          if (json) break;
        } catch {}
      }

      if (json) {
        const rawGroups = json?.summary?.tambahan_by_ke ?? json?.summary?.tambahan_tables ?? [];
        const normalized = (Array.isArray(rawGroups) ? rawGroups : [])
          .map((g) => {
            const detail = Array.isArray(g.detail) ? g.detail : [];
            const sumTong = g?.sum_tong ?? detail.reduce((a, d) => a + (Number(d.qty_tong) || 0), 0);
            const sumPcs  = g?.sum_pcs  ?? detail.reduce((a, d) => a + (Number(d.konversi) || 0), 0);
            return {
              tambahan_ke: g?.tambahan_ke ?? 0,
              detail,
              sum_tong: sumTong,
              sum_pcs: sumPcs,
            };
          })
          .sort((a, b) => (a.tambahan_ke ?? 0) - (b.tambahan_ke ?? 0));

        const flat = normalized
          .flatMap((g) => g.detail || [])
          .map((d, idx) => ({
            id: String(d.mproducts_id ?? idx),
            nama: d.nama ?? "-",
            patokan: Number(d.patokan ?? 0),
            total_tambahan: Number(d.qty_tong ?? 0),
            konversi_tambahan: Number(d.konversi ?? 0),
          }));

        const totalTong = normalized.reduce((a, g) => a + (Number(g.sum_tong) || 0), 0);
        const totalPcs  = normalized.reduce((a, g) => a + (Number(g.sum_pcs)  || 0), 0);

        setBatches(normalized);
        setItems(flat);
        setMeta({ rows: flat.length, sum_tong: totalTong, sum_pcs: totalPcs });
      } else {
        // 2) Fallback legacy
        const legacy = await tryFetchJson(legacyUrl);
        const mapped = (legacy?.data ?? []).map((it) => ({
          id: String(it.mproducts_id ?? it.id ?? Math.random()),
          nama: it.nama ?? "-",
          patokan: Number(it.patokan ?? 0),
          total_tambahan: Number(it.total_tambahan ?? it.qty_tong ?? 0),
          konversi_tambahan: Number(it.konversi_tambahan ?? it.konversi ?? 0),
        }));
        const metaSafe = {
          rows: legacy?.meta?.rows ?? mapped.length,
          sum_tong: legacy?.meta?.sum_tong ?? mapped.reduce((a, b) => a + (Number(b.total_tambahan) || 0), 0),
          sum_pcs: legacy?.meta?.sum_pcs ?? mapped.reduce((a, b) => a + (Number(b.konversi_tambahan) || 0), 0),
        };
        setBatches([]);
        setItems(mapped);
        setMeta(metaSafe);
      }
    } catch (e) {
      setError(String(e.message || e));
      setBatches([]);
      setItems([]);
      setMeta({ rows: 0, sum_tong: 0, sum_pcs: 0 });
    } finally {
      clearTimeout(to);
      setLoading(false);
      setRefreshing(false);
    }
  }, [tanggal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ====== DATE PICKER HANDLER ======
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

  // ====== HEADER (tanggal + actions) ======
  const DateHeader = useMemo(
    () => (
      <>
        <View style={s.topBar}>
          <Text style={s.title}>Work Order Tambahan</Text>
          <Pressable style={s.iconBtn} onPress={onRefresh} android_ripple={{ color: "#DCFCE7" }}>
            <Ionicons name="refresh" size={18} color={T_GREEN} />
            <Text style={s.iconBtnTxt}>Muat Ulang</Text>
          </Pressable>
        </View>

        <View style={s.dateRow}>
          <View style={s.dateLeft}>
            <Ionicons name="calendar-outline" size={18} color={T_GREEN} />
            <Text style={s.dateLabel}>Tanggal</Text>
            <Pressable onPress={() => setShowPicker(true)} style={s.dateButton}>
              <Ionicons name="calendar" size={14} color={T_GREEN} />
              <Text style={s.dateText}>{tanggal}</Text>
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </Pressable>
          </View>
          <Pressable onPress={resetToday} style={s.todayBtn} android_ripple={{ color: "#DCFCE7" }}>
            <Ionicons name="time-outline" size={16} color={T_GREEN} />
            <Text style={s.todayTxt}>Hari ini</Text>
          </Pressable>
        </View>

        {Platform.OS === "ios" && showPicker && (
          <DateTimePicker value={dateObj} mode="date" display="inline" onChange={onChangeDate} />
        )}

        {/* Summary cards */}
        <View style={s.summaryWrap}>
          <View style={s.card}>
            <View style={[s.cardIcon, { backgroundColor: "#E9FAF0" }]}>
              <Ionicons name="beaker-outline" size={18} color={T_GREEN} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardLabel}>Total Tong (Tambahan)</Text>
              <Text style={s.cardValue}>{meta.sum_tong === 0 ? "-" : fmt(meta.sum_tong, 1)}</Text>
            </View>
          </View>
          <View style={s.card}>
            <View style={[s.cardIcon, { backgroundColor: "#FFF7D6" }]}>
              <Ionicons name="grid-outline" size={18} color="#B45309" />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardLabel}>Konversi (Pcs)</Text>
              <Text style={s.cardValue}>{meta.sum_pcs === 0 ? "-" : fmt(meta.sum_pcs, 0)}</Text>
            </View>
          </View>
        </View>
      </>
    ),
    [tanggal, showPicker, dateObj, meta.sum_tong, meta.sum_pcs]
  );

  // ====== RENDER TABEL PER GILINGAN (baru) ======
  const renderBatchTable = (batch) => {
    const { tambahan_ke, detail = [], sum_tong = 0, sum_pcs = 0 } = batch || {};
    return (
      <View key={`batch-${tambahan_ke}`} style={s.batchCard}>
        <View style={s.batchHeader}>
          <Text style={s.batchTitle}>Tambahan {tambahan_ke}</Text>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{detail.length} item</Text>
          </View>
        </View>

        {/* Header kolom */}
        <View style={[s.row, s.headerRow]}>
          <Text style={[s.cell, s.colNo, s.headerText]}>No</Text>
          <Text style={[s.cell, s.colProduk, s.headerText]}>Produk</Text>
          <Text style={[s.cell, s.colRight, s.headerText]}>Jumlah Tong</Text>
          <Text style={[s.cell, s.colRight, s.headerText]}>Standar/Tong</Text>
          <Text style={[s.cell, s.colRight, s.headerText]}>Konversi (Pcs)</Text>
        </View>

        {detail.length === 0 ? (
          <View style={s.emptyWrap}><Text style={s.empty}>Tidak ada data pada tambahan ini.</Text></View>
        ) : (
          detail.map((item, index) => (
            <View
              key={`${tambahan_ke}-${item.mproducts_id ?? index}`}
              style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}
            >
              <Text style={[s.cell, s.colNo, s.center]}>{index + 1}</Text>
              <Text style={[s.cell, s.colProduk]} numberOfLines={2}>{item.nama}</Text>
              <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>{fmt(item.qty_tong, 1)}</Text>
              <Text style={[s.cell, s.colRight]}>{fmt(item.patokan, 0)}</Text>
              <Text style={[s.cell, s.colRight]}>{item.konversi === 0 ? "-" : fmt(item.konversi, 0)}</Text>
            </View>
          ))
        )}

        {/* Footer total batch */}
        <View style={[s.row, s.footerRow]}>
          <Text style={[s.cell, s.colProduk, s.center, s.semibold]}>Total</Text>
          <Text style={[s.cell, s.hidden]} />
          <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>
            {sum_tong === 0 ? "-" : fmt(sum_tong, 1)}
          </Text>
          <Text style={[s.cell, s.colRight]}>—</Text>
          <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>
            {sum_pcs === 0 ? "-" : fmt(sum_pcs, 0)}
          </Text>
        </View>
      </View>
    );
  };

  // ====== RENDER ======
  const usingBatches = batches && batches.length > 0;

  return (
    <View style={s.container}>
      {/* Android DatePicker modal */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker value={dateObj} mode="date" display="calendar" onChange={onChangeDate} />
      )}

      {DateHeader}

      {loading && !refreshing && !usingBatches && items.length === 0 ? (
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
      ) : usingBatches ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {batches.map(renderBatchTable)}
        </ScrollView>
      ) : (
        // Fallback lama: satu tabel
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
              <Text style={[s.cell, s.colNo, s.center]}>{index + 1}</Text>
              <Text style={[s.cell, s.colProduk]} numberOfLines={2}>{item.nama}</Text>
              <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>
                {fmt(item.total_tambahan, 1)}
              </Text>
              <Text style={[s.cell, s.colRight]}>{fmt(item.patokan, 0)}</Text>
              <Text style={[s.cell, s.colRight]}>
                {item.konversi_tambahan === 0 ? "-" : fmt(item.konversi_tambahan, 0)}
              </Text>
            </View>
          )}
          ListHeaderComponent={
            <View style={[s.row, s.headerRow]}>
              <Text style={[s.cell, s.colNo, s.headerText]}>No</Text>
              <Text style={[s.cell, s.colProduk, s.headerText]}>Produk</Text>
              <Text style={[s.cell, s.colRight, s.headerText]}>Tong</Text>
              <Text style={[s.cell, s.colRight, s.headerText]}>Target</Text>
              <Text style={[s.cell, s.colRight, s.headerText]}>Pcs</Text>
            </View>
          }
          ListFooterComponent={
            <View style={[s.row, s.footerRow]}>
              <Text style={[s.cell, s.colProduk, s.center, s.semibold]}>Total</Text>
              <Text style={[s.cell, s.hidden]} />
              <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>
                {meta.sum_tong === 0 ? "-" : fmt(meta.sum_tong, 1)}
              </Text>
              <Text style={[s.cell, s.colRight]}>—</Text>
              <Text style={[s.cell, s.colRight, s.semibold, s.primaryTxt]}>
                {meta.sum_pcs === 0 ? "-" : fmt(meta.sum_pcs, 0)}
              </Text>
            </View>
          }
          ListEmptyComponent={<View style={s.emptyWrap}><Text style={s.empty}>Tidak ada data.</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          stickyHeaderIndices={[0]} // header tabel lengket
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8FA", padding: 12 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },

  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBtnTxt: { color: T_GREEN, fontWeight: "800", fontSize: 12 },

  // Date row
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
    justifyContent: "space-between",
  },
  dateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateLabel: { fontSize: 13, color: "#374151", fontWeight: "800" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: T_GREEN,
    borderRadius: 999,
  },
  dateText: { fontSize: 12, fontWeight: "900", color: T_GREEN },

  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E9FAF0",
    borderWidth: 1,
    borderColor: "#CDEFD6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  todayTxt: { color: T_GREEN, fontWeight: "900", fontSize: 12 },

  // Summary cards
  summaryWrap: { flexDirection: "row", gap: 8, marginTop: 2, marginBottom: 10 },
  card: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 11, color: "#64748B", fontWeight: "700" },
  cardValue: { fontSize: 14, color: "#0F172A", fontWeight: "900", marginTop: 2 },

  // Batch card
  batchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  batchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  batchTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  badge: { backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB" },
  badgeTxt: { fontSize: 12, color: "#334155", fontWeight: "800" },

  // Table-like
  row: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  headerRow: { backgroundColor: "#EAF7EE", borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER },
  rowOdd: { backgroundColor: "#FFFFFF" },
  rowEven: { backgroundColor: "#FAFAFA" },
  footerRow: { backgroundColor: "#F1F5F9", borderBottomWidth: 1, borderTopWidth: 1, borderColor: BORDER },

  cell: { paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderColor: BORDER, flexShrink: 1 },
  headerText: { fontSize: 12, fontWeight: "900", color: T_GREEN, textTransform: "uppercase", letterSpacing: 0.3 },

  colNo: { width: 48, color: "#111827" },
  colProduk: { flex: 1, minWidth: 120 },
  colRight: { width: 120, textAlign: "right" },

  center: { textAlign: "center" },
  semibold: { fontWeight: "700" },
  primaryTxt: { color: T_GREEN },

  // States
  emptyWrap: { alignItems: "center", paddingVertical: 16 },
  empty: { textAlign: "center", color: "#6B7280", fontWeight: "700" },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadingTxt: { color: "#6B7280", fontSize: 12 },
  errorWrap: {
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
  },
  errorText: { color: "#B91C1C", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },

  hidden: { width: 48, color: "transparent" },
});
