// selesai-divisi.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { API_BASE, KEY_TOKEN } from "../src/config";

/* ===== Helpers ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const toHHMMString = (val) => {
  if (!val) return "";
  const m = String(val).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return m ? `${pad2(+m[1])}:${m[2]}` : String(val);
};
const isTimeValid = (val) =>
  /^(\d{1,2}):(\d{2})(?::\d{2})?$/.test(String(val || ""));
const normalizeTimeObject = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).map(([k, v]) => [k, toHHMMString(v)])
  );
const parseTimeStringToDate = (val) => {
  const now = new Date();
  if (!val) return now;
  const m = String(val).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return now;
  const h = parseInt(m[1], 10),
    mi = parseInt(m[2], 10);
  const d = new Date(now);
  d.setHours(isNaN(h) ? 0 : h, isNaN(mi) ? 0 : mi, 0, 0);
  return d;
};

/* ===== Theme: Tokopedia-ish ===== */
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
  textLight: "#6B7280",
  violet: "#7C3AED",
  danger: "#EF4444",
};
const BORDER = COLORS.border;

export default function SelesaiDivisi({ route }) {
  const { width } = useWindowDimensions();

  // Lebar kolom (compact & responsif)
  const COLS = useMemo(() => {
    if (width < 360) return { nama: 110, jam: 80, ket: 160, aksi: 88 };
    if (width < 400) return { nama: 130, jam: 90, ket: 180, aksi: 96 };
    return { nama: 180, jam: 100, ket: 220, aksi: 104 };
  }, [width]);

  const TABLE_W = Math.max(
    COLS.nama + COLS.jam + COLS.ket + COLS.aksi,
    Math.floor(width - 24)
  );

  // Metric responsif font/padding
  const M = useMemo(
    () => ({
      colTimeW: COLS.jam,
      colAksiW: COLS.aksi,
      colKetMin: width < 360 ? 150 : 180,
      cellPadV: width < 360 ? 4 : 6,
      cellPadH: width < 360 ? 4 : 6,
      font: width < 360 ? 11 : 12,
      headFont: 11,
      titleFont: width < 360 ? 18 : 20,
      timeBtnFont: width < 360 ? 11 : 12,
      btnFont: 12,
    }),
    [COLS, width]
  );

  /* ===== Styles ===== */
  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.page, paddingTop: 8 },

        // Top bar
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingBottom: 6,
        },
        title: { fontSize: M.titleFont, fontWeight: "900", color: COLORS.text },
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
        iconBtnTxt: {
          color: COLORS.primaryDark,
          fontWeight: "800",
          fontSize: 12,
        },

        // Date bar
        dateBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingBottom: 8,
          gap: 8,
        },
        dateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
        label: {
          fontSize: M.font - 1,
          color: COLORS.primaryDark,
          fontWeight: "900",
        },
        dateBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 10,
        },
        dateTxt: {
          fontSize: M.font - 1,
          fontWeight: "800",
          color: COLORS.text,
        },
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
          marginRight: 12,
        },
        todayTxt: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },

        // Notice
        noticeBox: {
          marginHorizontal: 12,
          marginBottom: 8,
          backgroundColor: "#FEF3C7",
          borderColor: "#F59E0B",
          borderWidth: 1,
          borderRadius: 10,
          padding: 10,
        },
        noticeTxt: { color: "#92400E" },

        // Summary cards container
        summaryRow: {
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 12,
          marginBottom: 10,
        },

        // Table card (pembungkus tabel)
        tableOuterPad: { paddingHorizontal: 12, paddingBottom: 28 },
        tableCard: {
          width: TABLE_W,
          backgroundColor: COLORS.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: BORDER,
          overflow: "hidden",
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },

        // Header tabel
        tableHead: {
          backgroundColor: COLORS.head,
          borderBottomWidth: 1,
          borderColor: BORDER,
          flexDirection: "row",
        },
        th: {
          paddingVertical: M.cellPadV,
          paddingHorizontal: M.cellPadH,
          fontSize: M.headFont,
          fontWeight: "900",
          color: COLORS.primaryDark,
          borderRightWidth: 1,
          borderColor: BORDER,
        },

        // Row & cell (hindari garis dobel: pakai bottom border saja)
        row: {
          flexDirection: "row",
          backgroundColor: COLORS.card,
          borderBottomWidth: 1,
          borderColor: BORDER,
        },
        rowOdd: { backgroundColor: COLORS.rowOdd },
        rowEven: { backgroundColor: COLORS.rowEven },
        groupRow: { backgroundColor: "#FFF7ED" },

        cell: {
          paddingVertical: M.cellPadV,
          paddingHorizontal: M.cellPadH,
          borderRightWidth: 1,
          borderColor: BORDER,
        },

        // Kolom
        colNama: { width: COLS.nama, fontSize:12 },
        colTime: { width: M.colTimeW },
        colKet: { width: COLS.ket, minWidth: M.colKetMin },
        colAksi: { width: M.colAksiW, alignItems: "stretch" },

        // Input / Time button
        input: {
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 6,
          fontSize: M.font,
          color: COLORS.text,
        },
        timeBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 6,
          alignItems: "center",
        },
        timeText: {
          fontSize: M.timeBtnFont,
          fontWeight: "900",
          color: COLORS.text,
        },

        // Buttons
        btn: {
          backgroundColor: COLORS.primary,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 6,
          width: "100%",
        },
        btnSecondary: { backgroundColor: "#10B981" },
        btnDisabled: { backgroundColor: "#A7F3D0" },
        btnText: { color: "#fff", fontWeight: "900", fontSize: M.btnFont },

        hint: {
          marginTop: 4,
          fontSize: M.font - 2,
          color: COLORS.sub,
          textAlign: "center",
        },
        badgeOk: {
          color: "#059669",
          fontWeight: "900",
          fontSize: M.font - 2,
          textAlign: "center",
        },

        // States
        loadingWrap: { padding: 16, alignItems: "center", gap: 8 },
        loadingTxt: { color: COLORS.sub, fontSize: 12 },
        errorBox: {
          padding: 12,
          margin: 12,
          backgroundColor: "#FEE2E2",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#FECACA",
          gap: 8,
          alignItems: "center",
        },
        errorTxt: { color: "#B91C1C", textAlign: "center" },
        retryBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: COLORS.danger,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
        },
        retryTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },
      }),
    [M, COLS, width]
  );

  /* ===== Optional: perintah_id dari route ===== */
  const perintahIdParam = route?.params?.perintah_id ?? null;

  /* ===== State utama ===== */
  const [dateObj, setDateObj] = useState(() => new Date());
  const [tanggal, setTanggal] = useState(() => toYMD(new Date()));
  const [showDate, setShowDate] = useState(false);
  const [perintahId, setPerintahId] = useState(perintahIdParam);
  const [notice, setNotice] = useState("");

  // Data
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [displayRows, setDisplayRows] = useState([]);
  const [groupMembers, setGroupMembers] = useState({});
  const [groupKeyMap, setGroupKeyMap] = useState({});

  // Input row
  const [jamSelesai, setJamSelesai] = useState({});
  const [keterangan, setKeterangan] = useState({});
  const [saved, setSaved] = useState({});

  // Input group
  const [jamSelesaiGroup, setJamSelesaiGroup] = useState({});
  const [keteranganGroup, setKeteranganGroup] = useState({});
  const [savedGroup, setSavedGroup] = useState({});

  // Time Picker
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState(() => new Date());
  const [timePickerTarget, setTimePickerTarget] = useState({
    kind: null,
    key: null,
  });

  const openTimePickerForRow = (jobId) => {
    setTimePickerValue(parseTimeStringToDate(jamSelesai[jobId]));
    setTimePickerTarget({ kind: "row", key: jobId });
    setTimePickerVisible(true);
  };
  const openTimePickerForGroup = (gkey) => {
    setTimePickerValue(parseTimeStringToDate(jamSelesaiGroup[gkey]));
    setTimePickerTarget({ kind: "group", key: gkey });
    setTimePickerVisible(true);
  };
  const onTimePicked = (event, selected) => {
    if (event.type === "dismissed") {
      setTimePickerVisible(false);
      return;
    }
    const d = selected || timePickerValue;
    const hhmm = toHHMM(d);
    if (timePickerTarget.kind === "row") {
      setJamSelesai((prev) => ({ ...prev, [timePickerTarget.key]: hhmm }));
    } else if (timePickerTarget.kind === "group") {
      setJamSelesaiGroup((prev) => ({ ...prev, [timePickerTarget.key]: hhmm }));
    }
    setTimePickerVisible(false);
  };

  const noDataMessage = (byTanggal) =>
    byTanggal
      ? "Belum ada perintah produksi pada tanggal ini."
      : "Perintah produksi tidak ditemukan.";

  /* ===== Fetch index ===== */
  const fetchIndex = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    const byTanggal = !perintahId;
    try {
      const qs = perintahId
        ? `perintah_id=${encodeURIComponent(perintahId)}`
        : `tanggal=${encodeURIComponent(tanggal)}`;
      const url = `${API_BASE}/api/selesai-divisi?${qs}`;

      const token = await AsyncStorage.getItem(KEY_TOKEN);
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 404) {
        setPerintahId(null);
        setDisplayRows([]);
        setGroupMembers({});
        setGroupKeyMap({});
        setJamSelesai({});
        setKeterangan({});
        setSaved({});
        setJamSelesaiGroup({});
        setKeteranganGroup({});
        setSavedGroup({});
        setNotice(noDataMessage(byTanggal));
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      const json = await res.json();

      if (json.ok === false || !json.perintah) {
        setPerintahId(null);
        setDisplayRows(json.displayRows || []);
        setGroupMembers(json.groupMembers || {});
        setGroupKeyMap(json.groupKeyMap || {});
        setJamSelesai({});
        setKeterangan({});
        setSaved({});
        setJamSelesaiGroup({});
        setKeteranganGroup({});
        setSavedGroup({});
        setNotice(noDataMessage(byTanggal));
        return;
      }

      // Sukses
      setPerintahId(json?.perintah?.id ?? perintahId);
      setDisplayRows(json.displayRows || []);
      setGroupMembers(json.groupMembers || {});
      setGroupKeyMap(json.groupKeyMap || {});
      setJamSelesai(normalizeTimeObject(json.jamSelesai));
      setKeterangan(json.keterangan || {});
      setSaved(json.statusTersimpan || {});
      setJamSelesaiGroup(normalizeTimeObject(json.jamSelesaiGroup));
      setKeteranganGroup(json.keteranganGroup || {});
      setSavedGroup(json.statusTersimpanGroup || {});
    } catch (e) {
      setError(String(e.message || e));
      setDisplayRows([]);
      setGroupMembers({});
      setGroupKeyMap({});
      setJamSelesai({});
      setKeterangan({});
      setSaved({});
      setJamSelesaiGroup({});
      setKeteranganGroup({});
      setSavedGroup({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tanggal, perintahId]);

  useEffect(() => {
    fetchIndex();
  }, [fetchIndex]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIndex();
  }, [fetchIndex]);

  // Date picker handler
  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDate(false);
    if (event.type === "dismissed") return;
    const d = selectedDate ?? dateObj;
    setDateObj(d);
    setTanggal(toYMD(d));
    if (!route?.params?.perintah_id) setPerintahId(null);
  };

  /* ===== Save ===== */
  const [savingKey, setSavingKey] = useState(""); // "row:ID" | "group:gkey"

  const saveRow = async (jobId) => {
    const jam = jamSelesai[jobId];
    if (!perintahId)
      return Alert.alert("Info", "perintah_id belum ditentukan.");
    if (!isTimeValid(jam)) return Alert.alert("Validasi", "Pilih jam (HH:MM).");

    setSavingKey(`row:${jobId}`);
    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      const res = await fetch(`${API_BASE}/api/selesai-divisi/row`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          perintah_id: perintahId,
          job_id: jobId,
          waktu_selesai: toHHMMString(jam),
          keterangan: keterangan[jobId] || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false)
        throw new Error(json.message || "Gagal simpan row");
      setSaved((prev) => ({ ...prev, [jobId]: true }));
      Alert.alert("Sukses", "Tersimpan.");
    } catch (e) {
      Alert.alert("Error", String(e.message || e));
    } finally {
      setSavingKey("");
    }
  };

  const saveGroup = async (gkey) => {
    const jam = jamSelesaiGroup[gkey];
    if (!perintahId)
      return Alert.alert("Info", "perintah_id belum ditentukan.");
    if (!isTimeValid(jam))
      return Alert.alert("Validasi", "Pilih jam grup (HH:MM).");

    setSavingKey(`group:${gkey}`);
    try {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      const res = await fetch(`${API_BASE}/api/selesai-divisi/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          perintah_id: perintahId,
          gkey,
          waktu_selesai: toHHMMString(jam),
          keterangan: keteranganGroup[gkey] || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false)
        throw new Error(json.message || "Gagal simpan grup");

      const members = groupMembers[gkey] || [];
      setSaved((prev) => {
        const next = { ...prev };
        members.forEach((id) => (next[id] = true));
        return next;
      });
      setSavedGroup((prev) => ({ ...prev, [gkey]: true }));
      Alert.alert("Sukses", "Jam selesai grup disimpan.");
    } catch (e) {
      Alert.alert("Error", String(e.message || e));
    } finally {
      setSavingKey("");
    }
  };

  /* ===== Summary mini-cards ===== */
  const SummaryBar = useMemo(() => {
    const totalRows = displayRows.filter((r) => r.type !== "group").length;
    const totalGroups = displayRows.filter((r) => r.type === "group").length;
    const savedRows = Object.values(saved).filter(Boolean).length;
    const savedGroups = Object.values(savedGroup).filter(Boolean).length;
    return (
      <View style={s.summaryRow}>
        <View style={card.card}>
          <View style={[card.cardIcon, { backgroundColor: "#EAF8FC" }]}>
            <Ionicons name="people-outline" size={18} color={COLORS.info} />
          </View>
          <View style={card.cardBody}>
            <Text style={card.cardLabel}>Divisi (Group)</Text>
            <Text style={card.cardValue}>
              {totalGroups} • Selesai {savedGroups}
            </Text>
          </View>
        </View>
        <View style={card.card}>
          <View style={[card.cardIcon, { backgroundColor: "#F2ECFE" }]}>
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={COLORS.violet}
            />
          </View>
          <View style={card.cardBody}>
            <Text style={card.cardLabel}>Item Pekerjaan</Text>
            <Text style={card.cardValue}>
              {totalRows} • Selesai {savedRows}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [displayRows, saved, savedGroup, s.summaryRow]);

  /* ===== Render ===== */
  return (
    <View style={s.container}>
      {/* Android: Date Modal */}
      {Platform.OS === "android" && showDate && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
        />
      )}

      {/* Time Picker */}
      {timePickerVisible && (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={onTimePicked}
        />
      )}

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.title}>Selesai Divisi</Text>
        <Pressable
          style={s.iconBtn}
          onPress={onRefresh}
          android_ripple={{ color: "#DCF7E2" }}
        >
          <Ionicons name="refresh" size={18} color={COLORS.primaryDark} />
          <Text style={s.iconBtnTxt}>Muat Ulang</Text>
        </Pressable>
      </View>

      {/* Date bar */}
      <View style={s.dateBar}>
        <View style={s.dateLeft}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={COLORS.primaryDark}
          />
          <Text style={s.label}>Tanggal Produksi</Text>
          <Pressable style={s.dateBtn} onPress={() => setShowDate(true)}>
            <Text style={s.dateTxt}>{tanggal}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            const d = new Date();
            setDateObj(d);
            setTanggal(toYMD(d));
            setPerintahId(null);
          }}
          style={s.todayBtn}
          android_ripple={{ color: "#DCF7E2" }}
        >
          <Ionicons name="time-outline" size={16} color={COLORS.primary} />
          <Text style={s.todayTxt}>Hari ini</Text>
        </Pressable>
      </View>

      {/* iOS inline date */}
      {Platform.OS === "ios" && showDate && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="inline"
          onChange={onChangeDate}
        />
      )}

      {!!notice && (
        <View style={s.noticeBox}>
          <Text style={s.noticeTxt}>{notice}</Text>
        </View>
      )}

      {SummaryBar}

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={s.loadingTxt}>Memuat data...</Text>
        </View>
      ) : error ? (
        <View style={s.errorBox}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={s.errorTxt}>Gagal memuat: {error}</Text>
          <Pressable style={s.retryBtn} onPress={fetchIndex}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.retryTxt}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={s.tableOuterPad}
        >
          <View style={s.tableCard}>
            {/* HEADER TABEL */}
            <View style={s.tableHead}>
              <Text style={[s.th, s.colNama]}>Nama Divisi</Text>
              <Text style={[s.th, s.colTime]}>Jam</Text>
              <Text style={[s.th, s.colKet]}>Keterangan</Text>
              <Text style={[s.th, s.colAksi, { textAlign: "center" }]}>
                Aksi
              </Text>
            </View>

            {/* LIST BARIS */}
            <FlatList
              data={displayRows}
              keyExtractor={(it) =>
                it.type === "group" ? `g:${it.gkey}` : `j:${it.id}`
              }
              renderItem={({ item, index }) => {
                const rowBase = [
                  s.row,
                  index % 2 ? s.rowEven : s.rowOdd,
                  item.type === "group" && s.groupRow,
                ];

                if (item.type === "group") {
                  const gkey = item.gkey;
                  const isSaved = !!savedGroup[gkey];
                  const isSaving = savingKey === `group:${gkey}`;
                  const canSave =
                    !!perintahId && isTimeValid(jamSelesaiGroup[gkey]);

                  return (
                    <View style={rowBase}>
                      <Text
                        style={[s.cell, s.colNama, { fontWeight: "900" }]}
                        numberOfLines={1}
                      >
                        {(groupKeyMap[gkey] || gkey).toUpperCase()}
                      </Text>

                      <View style={[s.cell, s.colTime]}>
                        <Pressable
                          style={s.timeBtn}
                          onPress={() => openTimePickerForGroup(gkey)}
                        >
                             <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                          <Text style={s.timeText}>
                            {toHHMMString(jamSelesaiGroup[gkey]) || "Pilih"}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={[s.cell, s.colKet]}>
                        <TextInput
                          placeholder="Keterangan"
                          value={keteranganGroup[gkey] ?? ""}
                          onChangeText={(t) =>
                            setKeteranganGroup((p) => ({ ...p, [gkey]: t }))
                          }
                          style={s.input}
                        />
                      </View>

                      <View style={[s.cell, s.colAksi]}>
                        {isSaved && <Text style={s.badgeOk}>✅ Tersimpan</Text>}
                        <Pressable
                          onPress={() => saveGroup(gkey)}
                          disabled={!canSave || isSaving}
                          style={[s.btn, (!canSave || isSaving) && s.btnDisabled, isSaved && s.btnSecondary]}
                        >
                          <Text style={s.btnText}>{isSaving ? "Menyimpan..." : isSaved ? "Ulang" : "Simpan"}</Text>
                        </Pressable>
                        {!canSave && !isSaved && (
                          <Text style={s.hint}>Pilih jam dulu</Text>
                        )}
                      </View>
                    </View>
                  );
                }

                // Row item pekerjaan
                const jobId = item.id;
                const isSaved = !!saved[jobId];
                const isSaving = savingKey === `row:${jobId}`;
                const canSave = !!perintahId && isTimeValid(jamSelesai[jobId]);

                return (
                  <View style={rowBase}>
                    <Text style={[s.cell, s.colNama]} numberOfLines={1}>
                      {item.nama}
                    </Text>

                    <View style={[s.cell, s.colTime]}>
                      <Pressable
                        style={s.timeBtn}
                        onPress={() => openTimePickerForRow(jobId)}
                      >
                        <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                        <Text style={s.timeText}>
                          {toHHMMString(jamSelesai[jobId]) || "Pilih"}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={[s.cell, s.colKet]}>
                      <TextInput
                        placeholder="Keterangan"
                        value={keterangan[jobId] ?? ""}
                        onChangeText={(t) =>
                          setKeterangan((p) => ({ ...p, [jobId]: t }))
                        }
                        style={s.input}
                      />
                    </View>

                    <View style={[s.cell, s.colAksi]}>
                      {isSaved && <Text style={s.badgeOk}>✅ Tersimpan</Text>}
                      <Pressable
                        onPress={() => saveRow(jobId)}
                        disabled={!canSave || isSaving}
                        style={[
                          s.btn,
                          (!canSave || isSaving) && s.btnDisabled,
                          isSaved && s.btnSecondary,
                        ]}
                      >
                        <Text style={s.btnText}>
                          {isSaving
                            ? "Menyimpan..."
                            : isSaved
                            ? "Ulang"
                            : "Simpan"}
                        </Text>
                      </Pressable>
                      {!canSave && !isSaved && (
                        <Text style={s.hint}>Pilih jam dulu</Text>
                      )}
                    </View>
                  </View>
                );
              }}
              extraData={{
                saved,
                savedGroup,
                jamSelesai,
                jamSelesaiGroup,
                keterangan,
                keteranganGroup,
                savingKey,
              }}
              refreshing={refreshing}
              onRefresh={onRefresh}
              contentContainerStyle={{ paddingBottom: 8 }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ===== Mini-card styles ===== */
const card = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
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
  cardValue: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "900",
    marginTop: 2,
  },
});
