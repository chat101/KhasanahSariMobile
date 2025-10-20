// app/hasil-giling.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
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
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { API_BASE, KEY_TOKEN, KEY_USER } from "../src/config";
/* ===== Upload Foto Reject (multipart) ===== */
async function uploadRejectPhoto(hasilRejectId, photoUri, base, token) {
  if (!hasilRejectId || !photoUri) return null;

  const form = new FormData();

  // deteksi nama & mime sederhana
  const filename = (photoUri.split("/").pop() || `reject_${Date.now()}.jpg`);
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    ext === "heic" ? "image/heic" :
    "image/jpeg";

  form.append("hasil_reject_id", String(hasilRejectId));
  form.append("photo", {
    uri: photoUri,
    name: filename,
    type: mime,
  });

  // PENTING: jangan set Content-Type manual; biar React Native yg set boundary
  const r = await fetch(`${base}/api/rejects/photos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j?.data ?? j;
}

/* ===== cache helper: simpan field user ke KEY_USER (merge) ===== */
async function cacheUserPatch(patch) {
  try {
    const cur = await AsyncStorage.getItem(KEY_USER);
    const obj = cur ? JSON.parse(cur) : {};
    await AsyncStorage.setItem(KEY_USER, JSON.stringify({ ...obj, ...patch }));
  } catch {}
}

/* ===== Helpers ===== */
const fmt = (n, decimals = 0) => {
  if (n == null) return "0";
  const fixed = Number(n).toFixed(decimals);
  const [i, d] = fixed.split(".");
  const withThousand = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${withThousand},${d}` : withThousand;
};
const parseDigits = (s) => {
  if (s == null) return null;
  const raw = String(s).replace(/\D+/g, "");
  return raw === "" ? null : Number(raw);
};
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/* ===== Theme ===== */
const COLORS = {
  page: "#F2FBF4",
  card: "#FFFFFF",
  text: "#0B1D14",
  sub: "#6B7280",
  border: "#E6F4EA",
  head: "#EAF8EC",
  rowEven: "#FAFCFB",
  rowOdd: "#FFFFFF",
  danger: "#EF4444",
  primary: "#03AC0E",
  primaryDark: "#1F7A28",
  success: "#16A34A",
};
const BORDER = COLORS.border;

export default function HasilDivisiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- user/divisi
  const [divisiId, setDivisiId] = useState(null);
  const [divisiName, setDivisiName] = useState("");

  // Date picker
  const [dateObj, setDateObj] = useState(() => new Date());
  const [tanggal, setTanggal] = useState(() => toYMD(new Date()));
  const [showPicker, setShowPicker] = useState(false);

  // Data
  const [perintahId, setPerintahId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [serverTotals, setServerTotals] = useState(null); // ← totals dari API kalau ada

  // Input per-row (nilai divisi ini)
  const [vals, setVals] = useState({});
  const [rowSaving, setRowSaving] = useState({});
  const [rowSavedOk, setRowSavedOk] = useState({});
  const [lastSaved, setLastSaved] = useState({});

  // Reject
  const [rejOpenId, setRejOpenId] = useState(null);
  const [rejProdName, setRejProdName] = useState("");
  const [rejForm, setRejForm] = useState({ qty: "", note: "" });
  const [rejPhoto, setRejPhoto] = useState(null); // uri foto (opsional)
  const [camPerm, requestCamPerm] = ImagePicker.useCameraPermissions();
  // --- List reject (master + UI)
  const [listRejects, setListRejects] = useState([]); // [{id, keterangan}]
  const [listOpen, setListOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null); // { id, keterangan } | null
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  // Detail history untuk modal: map String(mproducts_id) -> array of {id?, qty, note, listreject_*}
  const [rejects, setRejects] = useState({});
  // Summary untuk badge/total: map String(mproducts_id) -> {qty, n}
  const [rejectSummary, setRejectSummary] = useState({});

  const inputRefs = useRef({});
  const tokenRef = useRef(null);
  const base = API_BASE.replace(/\/+$/, "");
  const MODAL_TOP = 80;

  /* ===== ambil profil (divisi_id + divisi_nama), cache ke KEY_USER ===== */
  const ensureProfile = useCallback(
    async (token) => {
      if (divisiId != null && divisiName) return divisiId;

      try {
        const cached = await AsyncStorage.getItem(KEY_USER);
        if (cached) {
          const u = JSON.parse(cached);
          if (u?.divisi_id != null) setDivisiId(Number(u.divisi_id));
          if (u?.divisi_nama) setDivisiName(String(u.divisi_nama));
          if (u?.divisi_id != null && u?.divisi_nama)
            return Number(u.divisi_id);
        }
      } catch {}

      const tryUrls = [
        `${base}/api/auth/me`,
        `${base}/api/user`,
        `${base}/api/me`,
        `${base}/api/profile`,
      ];

      for (const url of tryUrls) {
        try {
          const r = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (!r.ok) continue;
          const j = await r.json();

          const u = j?.user ?? j?.data?.user ?? j?.data ?? j ?? {};
          const id = u?.divisi_id ?? u?.divisi?.id ?? null;
          const name =
            u?.divisi_nama ?? u?.divisi?.nama_divisi ?? u?.divisi?.nama ?? null;

          if (id != null) setDivisiId(Number(id));
          if (name) setDivisiName(String(name));

          const patch = {};
          if (id != null) patch.divisi_id = Number(id);
          if (name) patch.divisi_nama = String(name);
          if (Object.keys(patch).length) await cacheUserPatch(patch);

          if (id != null) return Number(id);
        } catch {}
      }

      return divisiId;
    },
    [divisiId, divisiName, base]
  );

  /* ===== Loader summary semua produk ===== */
  const loadRejectSummary = useCallback(
    async (perintahIdArg) => {
      try {
        const token =
          tokenRef.current || (await AsyncStorage.getItem(KEY_TOKEN));
        if (!token) return;

        const dId = await ensureProfile(token);
        const pidNow = perintahIdArg ?? perintahId;
        if (!pidNow) return;

        const q = new URLSearchParams({
          perintah_id: String(pidNow),
          ...(dId != null ? { divisi_id: String(dId) } : {}),
        }).toString();

        const r = await fetch(`${base}/api/rejects/summary?${q}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) return;

        const j = await r.json().catch(() => ({}));
        const data = j?.data || {};

        // normalisasi -> { [mId]: { qty, n } }
        const mapped = {};
        if (Array.isArray(data)) {
          for (const it of data) {
            const key = String(it.mproducts_id);
            mapped[key] = { qty: Number(it.qty) || 0, n: Number(it.n) || 0 };
          }
        } else if (data && typeof data === "object") {
          for (const k of Object.keys(data)) {
            const v = data[k] || {};
            mapped[String(k)] = {
              qty: Number(v.qty) || 0,
              n: Number(v.n) || 0,
            };
          }
        }
        setRejectSummary(mapped);
      } catch {}
    },
    [base, ensureProfile, perintahId]
  );

  /* ===== Loader master list reject ===== */
  const loadRejectLists = useCallback(async () => {
    try {
      const token = tokenRef.current || (await AsyncStorage.getItem(KEY_TOKEN));
      if (!token) return;
      setListLoading(true);
      const r = await fetch(`${base}/api/rejects/lists`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return;
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.data) ? j.data : [];
      const normalized = arr
        .map((it) => ({
          id: Number(it.id),
          keterangan: String(it.keterangan || ""),
        }))
        .sort((a, b) => a.keterangan.localeCompare(b.keterangan));
      setListRejects(normalized);
    } catch {
    } finally {
      setListLoading(false);
    }
  }, [base]);

  /* ===== Loader history satu produk (buat modal) ===== */
  const loadRejectHistory = useCallback(
    async (mId, perintahIdArg) => {
      try {
        const token =
          tokenRef.current || (await AsyncStorage.getItem(KEY_TOKEN));
        if (!token) return;

        const dId = await ensureProfile(token);
        const pidNow = perintahIdArg ?? perintahId;
        if (!pidNow || !mId) return;

        const q = new URLSearchParams({
          perintah_id: String(pidNow),
          mproducts_id: String(mId),
          ...(dId != null ? { divisi_id: String(dId) } : {}),
        }).toString();

        const r = await fetch(`${base}/api/rejects?${q}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) return;

        const j = await r.json().catch(() => ({}));
        const arr = Array.isArray(j?.data) ? j.data : [];
        const list = arr.map((it) => ({
          id: it.id,
          qty: Number(it.qty_reject) || 0,
          note: it.keterangan || "",
          listreject_id: it.listreject_id ?? null,
          listreject_name: it.listreject_name || "",
        }));
        setRejects((prev) => ({ ...prev, [String(mId)]: list }));
      } catch {}
    },
    [base, ensureProfile, perintahId]
  );

  /* ===== Fetch list ===== */
  const fetchData = useCallback(
    async (d) => {
      const date = d || tanggal;
      try {
        setLoading(true);
        setError("");
        setServerTotals(null);

        const token = await AsyncStorage.getItem(KEY_TOKEN);
        tokenRef.current = token;
        if (!token) {
          router.replace("/login");
          return;
        }

        const dId = await ensureProfile(token);

        // Tambah baseline_divisi_id=2 bila bukan divisi giling
        const url =
          `${base}/api/hasil-giling?date=${encodeURIComponent(date)}` +
          `&only_net_positive=true&include_totals=true` +
          (dId != null ? `&divisi_id=${dId}` : "") +
          (dId !== 2 ? `&baseline_divisi_id=2` : "");

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.status === 404) {
          setPerintahId(null);
          setRows([]);
          setVals({});
          setRejects({});
          setRejectSummary({});
          setRowSaving({});
          setRowSavedOk({});
          setLastSaved({});
          return;
        }
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
        }

        const json = await res.json();
        const pId = json?.perintah_id ?? null;
        setPerintahId(pId);

        const data = Array.isArray(json?.data) ? json.data : [];
        setRows(data);

        // Prefill nilai input divisi ini dari realisasi_divisi (bukan display)
        const init = {};
        const savedInit = {};
        for (const r of data) {
          init[r.mproducts_id] = r?.realisasi_divisi ?? null;
          savedInit[r.mproducts_id] = r?.realisasi_divisi ?? null;
        }
        setVals(init);
        setLastSaved(savedInit);
        setRowSaving({});
        setRowSavedOk({});

        // totals dari server (jika ada)
        if (json?.totals) setServerTotals(json.totals);

        // muat summary untuk badge & total reject
        setRejectSummary({});
        await loadRejectSummary(pId);
      } catch (e) {
        setError(e?.message || String(e));
        setPerintahId(null);
        setRows([]);
        setVals({});
        setRejects({});
        setRejectSummary({});
        setServerTotals(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tanggal, router, ensureProfile, base, loadRejectSummary]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // load divisi dari cache saat mount
  useEffect(() => {
    (async () => {
      const cached = await AsyncStorage.getItem(KEY_USER);
      if (cached) {
        try {
          const u = JSON.parse(cached);
          if (u?.divisi_id != null) setDivisiId(Number(u.divisi_id));
          if (u?.divisi_nama) setDivisiName(String(u.divisi_nama));
        } catch {}
      }
    })();
  }, []);

  // refresh profil awal
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(KEY_TOKEN);
      if (token) await ensureProfile(token);
    })();
  }, [ensureProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /* ===== Totals ===== */
  const totals = useMemo(() => {
    if (serverTotals) {
      return {
        qty_total: Number(serverTotals.qty_total || 0),
        target_giling: Number(serverTotals.target_giling || 0),
        realisasi: Number(serverTotals.realisasi || 0),
        selisih: Number(serverTotals.selisih || 0),
      };
    }
    const qty_total = rows.reduce((a, b) => a + (b?.qty_total || 0), 0);
    const target_giling = rows.reduce((a, b) => a + (b?.target_giling || 0), 0);
    const realisasi = rows.reduce((a, b) => a + (b?.realisasi || 0), 0);
    const selisih = rows.reduce((a, b) => a + (b?.selisih || 0), 0);
    return { qty_total, target_giling, realisasi, selisih };
  }, [rows, serverTotals]);

  const totalRejectQty = useMemo(() => {
    return rows.reduce((sum, r) => {
      const s = rejectSummary[String(r.mproducts_id)];
      return sum + (s?.qty || 0);
    }, 0);
  }, [rows, rejectSummary]);

  /* ===== Input handlers (nilai divisi ini) ===== */
  const handleChange = (mproducts_id, text) => {
    const n = parseDigits(text);
    setVals((prev) => ({ ...prev, [mproducts_id]: n }));
  };

  const saveRow = useCallback(
    async (mproducts_id) => {
      try {
        if (!perintahId) return;
        const v = vals[mproducts_id];
        if (v === null || v === undefined) return;
        if (lastSaved[mproducts_id] === v) return;

        setRowSaving((s) => ({ ...s, [mproducts_id]: true }));

        const token =
          tokenRef.current || (await AsyncStorage.getItem(KEY_TOKEN));
        if (!token) {
          router.replace("/login");
          return;
        }

        const dId = await ensureProfile(token);

        const res = await fetch(`${base}/api/hasil-giling`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            perintah_id: perintahId,
            ...(dId != null ? { divisi_id: dId } : {}),
            items: [
              {
                mproducts_id,
                qty_hasil: Number(v),
                ...(dId != null ? { divisi_id: dId } : {}),
              },
            ],
          }),
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);

        setLastSaved((s) => ({ ...s, [mproducts_id]: v }));
        setRowSavedOk((s) => ({ ...s, [mproducts_id]: true }));
        setTimeout(() => {
          setRowSavedOk((s) => {
            const n = { ...s };
            delete n[mproducts_id];
            return n;
          });
        }, 1200);

        await fetchData();
      } catch (e) {
        Alert.alert("Gagal menyimpan", e?.message || String(e));
      } finally {
        setRowSaving((s) => ({ ...s, [mproducts_id]: false }));
      }
    },
    [perintahId, vals, lastSaved, router, ensureProfile, base, fetchData]
  );

  const handleSubmitEditing = (index) => {
    const cur = rows[index];
    if (cur) saveRow(cur.mproducts_id);
    const next = rows[index + 1];
    if (next) inputRefs.current[next.mproducts_id]?.focus?.();
  };

  /* ===== Reject modal handlers ===== */
  const openReject = useCallback((item) => {
    setRejOpenId(item.mproducts_id);
    setRejProdName(item.product_name || "");
    setRejForm({ qty: "", note: "" });
    setRejPhoto(null);
  }, []);

  const takeRejectPhoto = React.useCallback(async () => {
    try {
      Keyboard.dismiss();

      // 1) izin kamera
      let granted = camPerm?.granted;
      if (!granted) {
        const r = await requestCamPerm();
        granted = !!r?.granted;
      }
      if (!granted) {
        Alert.alert(
          "Izin Kamera",
          "Aktifkan izin kamera untuk mengambil foto."
        );
        return;
      }

      // 2) opsi aman
      const opts = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        cameraType: ImagePicker.CameraType.back,
      };

      // 3) web fallback: di web, camera biasanya jatuh ke file picker
      const result =
        Platform.OS === "web"
          ? await ImagePicker.launchImageLibraryAsync({ ...opts })
          : await ImagePicker.launchCameraAsync(opts);

      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (asset?.uri) setRejPhoto(asset.uri);
    } catch (e) {
      const msg = String(e?.message || e);
      // 4) fallback bila native modul belum ada (dev client belum rebuild)
      if (/ExponentImagePicker|Native module.*ImagePicker/i.test(msg)) {
        try {
          router.push("/camera");
          return;
        } catch {}
      }
      Alert.alert("Kamera", msg);
    }
  }, [camPerm, requestCamPerm, router]);

  useEffect(() => {
    if (rejOpenId && perintahId) {
      loadRejectHistory(rejOpenId, perintahId);
    }
  }, [rejOpenId, perintahId, loadRejectHistory]);

  const closeReject = () => {
    setRejOpenId(null);
    setRejProdName("");
    setRejForm({ qty: "", note: "" });
    setRejPhoto(null);
  };

  // saat modal terbuka: muat list + reset pilihan
  useEffect(() => {
    if (rejOpenId) {
      if (!listRejects.length) loadRejectLists();
      setSelectedList(null);
      setListOpen(false);
      setListError(false);
    }
  }, [rejOpenId, listRejects.length, loadRejectLists]);

  const saveReject = useCallback(async () => {
    const qty = Number((rejForm.qty || "").toString().replace(/\D+/g, "")) || 0;
    const note = String(rejForm.note || "").trim();
    if (!rejOpenId) return;
  
    if (qty <= 0) {
      Alert.alert("Validasi", "Jumlah harus lebih dari 0.");
      return;
    }
    if (!selectedList?.id) {
      setListError(true);
      Alert.alert("Validasi", "Pilih jenis reject terlebih dahulu.");
      return;
    }
    setListError(false);
  
    const token = await AsyncStorage.getItem(KEY_TOKEN);
    const dId = await ensureProfile(token);
    const listId = selectedList.id;
  
    // Optimistic UI
    setRejects((p) => {
      const key = String(rejOpenId);
      const cur = p[key] || [];
      return {
        ...p,
        [key]: [
          ...cur,
          { qty, note, listreject_id: listId, listreject_name: selectedList?.keterangan || "" },
        ],
      };
    });
  
    try {
      if (!token || !perintahId) return;
  
      // 1) simpan reject item
      const r = await fetch(`${base}/api/rejects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          perintah_id: perintahId,
          mproducts_id: rejOpenId,
          ...(dId != null ? { divisi_id: dId } : {}),
          items: [{ qty, note, listreject_id: listId }],
        }),
      });
  
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  
      // 2) pastikan kita punya id hasil_reject yang baru
      let createdId = j?.data?.items?.[0]?.id ?? j?.data?.id ?? j?.id ?? null;
  
      // kalau tidak ada di response -> ambil lagi history item ini lalu cari baris yang baru dibuat
      if (!createdId) {
        const q = new URLSearchParams({
          perintah_id: String(perintahId),
          mproducts_id: String(rejOpenId),
          ...(dId != null ? { divisi_id: String(dId) } : {}),
        }).toString();
  
        const r2 = await fetch(`${base}/api/rejects?${q}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const j2 = await r2.json().catch(() => ({}));
        const arr = Array.isArray(j2?.data) ? j2.data : [];
  
        // cari dari belakang dengan signature qty/note/listreject_id yg sama
        const found = [...arr].reverse().find(
          (x) =>
            Number(x?.qty_reject) === qty &&
            String(x?.keterangan || "") === note &&
            (x?.listreject_id == listId)
        );
        createdId = found?.id ?? null;
      }
  
      // 3) kalau ada foto & sudah punya id -> upload fotonya (multipart)
      if (rejPhoto && createdId) {
        await uploadRejectPhoto(createdId, rejPhoto, base, token);
      }
  
      // 4) refresh ringkasan & history
      await Promise.all([
        loadRejectSummary(perintahId),
        loadRejectHistory(rejOpenId, perintahId),
      ]);
  
      // 5) reset form
      setRejForm({ qty: "", note: "" });
      setSelectedList(null);
      setListOpen(false);
      setRejPhoto(null);
    } catch (e) {
      Alert.alert("Gagal simpan reject", e?.message || String(e));
    }
  }, [
    rejForm, rejOpenId, rejPhoto, base, perintahId,
    ensureProfile, loadRejectSummary, loadRejectHistory, selectedList
  ]);
  

  const removeReject = useCallback(
    async (index) => {
      if (!rejOpenId) return;
      const key = String(rejOpenId);
      const arr = rejects[key] || [];
      const row = arr[index];

      if (row?.id) {
        try {
          const token =
            tokenRef.current || (await AsyncStorage.getItem(KEY_TOKEN));
          if (!token) return;
          const r = await fetch(`${base}/api/rejects/${row.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j?.message || `HTTP ${r.status}`);
          }
          await Promise.all([
            loadRejectSummary(perintahId),
            loadRejectHistory(rejOpenId, perintahId),
          ]);
          return;
        } catch (e) {
          Alert.alert("Gagal hapus reject", e?.message || String(e));
        }
      }

      setRejects((p) => {
        const next = [...(p[key] || [])];
        next.splice(index, 1);
        return { ...p, [key]: next };
      });
    },
    [rejOpenId, rejects, base, loadRejectSummary, loadRejectHistory, perintahId]
  );

  /* ===== Date handlers ===== */
  const onChangeDate = useCallback(
    (event, selectedDate) => {
      if (Platform.OS === "android") setShowPicker(false);
      if (event?.type === "dismissed") return;
      const d = selectedDate ?? dateObj;
      setDateObj(d);
      const ymd = toYMD(d);
      setTanggal(ymd);
      fetchData(ymd);
    },
    [dateObj, fetchData]
  );

  const resetToday = useCallback(() => {
    const d = new Date();
    setDateObj(d);
    const ymd = toYMD(d);
    setTanggal(ymd);
    fetchData(ymd);
  }, [fetchData]);

  const isGiling = divisiId === 2;
  const leftColHeaderLabel = useMemo(
    () => (isGiling ? "Tong" : "Real. Giling"),
    [isGiling]
  );

  /* ===== UI ===== */
  const HeaderBar = (
    <>
      <View style={s.topBar}>
        <Text style={s.title}>
          Divisi {divisiName || (divisiId != null ? `#${divisiId}` : "—")}
        </Text>

        <View style={[s.iconBtn, { marginRight: 8 }]}>
          <Ionicons
            name="people-outline"
            size={16}
            color={COLORS.primaryDark}
          />
          <Text style={s.iconBtnTxt}>
            {divisiName ? divisiName : `Divisi #${divisiId ?? "—"}`}
          </Text>
        </View>

        <Pressable
          style={s.iconBtn}
          onPress={onRefresh}
          android_ripple={{ color: "#E7F3E9" }}
        >
          <Ionicons name="refresh" size={18} color={COLORS.primaryDark} />
          <Text style={s.iconBtnTxt}>Muat Ulang</Text>
        </Pressable>
      </View>

      <View style={s.dateRow}>
        <View style={s.dateLeft}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={COLORS.primaryDark}
          />
          <Text style={s.dateLabel}>Tanggal</Text>
          <Pressable onPress={() => setShowPicker(true)} style={s.dateButton}>
            <Text style={s.dateText}>{tanggal}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
          </Pressable>
        </View>
        <Pressable
          onPress={resetToday}
          style={s.todayBtn}
          android_ripple={{ color: "#DCF7E2" }}
        >
          <Ionicons name="time-outline" size={16} color={COLORS.primary} />
          <Text style={s.todayTxt}>Hari ini</Text>
        </Pressable>
      </View>

      {Platform.OS === "ios" && showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="inline"
          onChange={onChangeDate}
        />
      )}

      {/* Summary */}
      <View style={s.summaryWrap}>
        <View style={s.card}>
          <View style={[s.cardIcon, { backgroundColor: "#EAF8FC" }]}>
            <Ionicons name="beaker-outline" size={20} color="#0284C7" />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>Produksi (tong)</Text>
            <Text style={s.cardValue}>{fmt(totals.qty_total, 0)}</Text>
          </View>
        </View>
        <View style={s.card}>
          <View style={[s.cardIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="analytics-outline" size={20} color="#CA8A04" />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>Target Giling</Text>
            <Text style={s.cardValue}>{fmt(totals.target_giling, 0)}</Text>
          </View>
        </View>
      </View>

      <View style={s.summaryWrap}>
        <View style={s.card}>
          <View style={[s.cardIcon, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons
              name="checkmark-done-outline"
              size={20}
              color={COLORS.success}
            />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>Realisasi</Text>
            <Text style={s.cardValue}>{fmt(totals.realisasi, 0)}</Text>
          </View>
        </View>
        <View style={s.card}>
          <View style={[s.cardIcon, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons
              name="swap-vertical-outline"
              size={20}
              color={totals.selisih < 0 ? "#B91C1C" : COLORS.primaryDark}
            />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>Selisih</Text>
            <Text
              style={[
                s.cardValue,
                {
                  color:
                    totals.selisih < 0 ? COLORS.danger : COLORS.primaryDark,
                },
              ]}
            >
              {fmt(totals.selisih, 0)}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  // Header tabel
  const TableHeader = (
    <View style={[s.row, s.headerRow]}>
      <Text style={[s.cell, s.colNo, s.headerText, s.center]}>No</Text>
      <Text style={[s.cell, s.colProduk, s.headerText]}>Nama</Text>
      <Text style={[s.cell, s.colRight, s.headerText, s.center]}>
        {leftColHeaderLabel}
      </Text>
      <Text style={[s.cell, s.colReal, s.headerText, s.center]}>Realisasi</Text>
      <Text style={[s.cell, s.colReject, s.headerText, s.center]}>Reject</Text>
      <Text
        style={[s.cell, s.colSelisih, s.headerText, s.center, s.noRightBorder]}
      >
        Selisih
      </Text>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const mId = item.mproducts_id;
    const myInput = vals[mId] ?? null;

    return (
      <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
        <Text style={[s.cell, s.colNo, s.center]}>{index + 1}</Text>

        <Text style={[s.cell, s.colProduk]} numberOfLines={2}>
          {item?.product_name || "-"}
        </Text>

        <Text style={[s.cell, s.colRight, s.semibold, s.primaryDarkTxt]}>
          {fmt(
            divisiId === 2
              ? item?.qty_total || 0
              : item?.realisasi_baseline ?? item?.realisasi ?? 0,
            0
          )}
        </Text>

        <View style={[s.cell, s.colReal, { paddingVertical: 8 }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <TextInput
              ref={(el) => (inputRefs.current[mId] = el)}
              placeholder="0"
              value={
                myInput == null
                  ? ""
                  : String(myInput).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              onChangeText={(txt) => handleChange(mId, txt)}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => handleSubmitEditing(index)}
              onBlur={() => saveRow(mId)}
              style={s.input}
            />
          </View>
        </View>

        <View style={[s.cell, s.colReject, s.center]}>
          {(() => {
            const sum = rejectSummary[String(mId)] || { qty: 0, n: 0 };
            const badgeCount = sum.n || 0;
            const rejQtySum = sum.qty || 0;
            return (
              <>
                <Pressable style={s.rejBtn} onPress={() => openReject(item)}>
                  <MaterialCommunityIcons
                    name={
                      badgeCount ? "clipboard-off" : "clipboard-off-outline"
                    }
                    size={20}
                    color={badgeCount ? "#B91C1C" : COLORS.sub}
                  />
                  {!!badgeCount && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{badgeCount}</Text>
                    </View>
                  )}
                </Pressable>
                {!!rejQtySum && (
                  <Text style={s.rejQtySum}>{fmt(rejQtySum, 0)}</Text>
                )}
              </>
            );
          })()}
        </View>

        <Text
          style={[
            s.cell,
            s.colSelisih,
            s.noRightBorder,
            {
              color: (item?.selisih || 0) < 0 ? COLORS.danger : COLORS.text,
              fontWeight: (item?.selisih || 0) < 0 ? "800" : "400",
            },
          ]}
        >
          {fmt(item?.selisih || 0, 0)}
        </Text>
      </View>
    );
  };

  // Footer (tampil total Reject qty di bawah kolom Reject)
  const TableFooter = (
    <View style={[s.row, s.footerRow]}>
      <Text style={[s.cell, s.colNo, s.center]}>—</Text>
      <Text style={[s.cell, s.colProduk, s.semibold, s.center]}>Total</Text>

      <Text style={[s.cell, s.colRight, s.semibold, s.primaryDarkTxt]}>
        {fmt(divisiId === 2 ? totals.qty_total : totals.realisasi, 0)}
      </Text>

      <Text style={[s.cell, s.colReal]}>{fmt(totals.realisasi, 0)}</Text>
      <Text
        style={[
          s.cell,
          s.colReject,
          s.center,
          {
            color: totalRejectQty > 0 ? COLORS.danger : COLORS.text,
            fontWeight: "800",
          },
        ]}
      >
        {fmt(totalRejectQty, 0)}
      </Text>
      <Text
        style={[
          s.cell,
          s.colSelisih,
          s.noRightBorder,
          {
            color: totals.selisih < 0 ? COLORS.danger : COLORS.primaryDark,
            fontWeight: "900",
          },
        ]}
      >
        {fmt(totals.selisih, 0)}
      </Text>
    </View>
  );

  const FooterWithSpacer = () => (
    <>
      {TableFooter}
      <View style={{ height: Math.max(insets.bottom, 16) + 120 }} />
    </>
  );

  /* ===== Modal Reject ===== */
  const RejectModal = (
    <Modal
      visible={!!rejOpenId}
      transparent
      animationType="fade"
      onRequestClose={closeReject}
      statusBarTranslucent
    >
      <View style={[s.modalOverlayTop, { paddingTop: insets.top + MODAL_TOP }]}>
        <View style={s.modalCardTop}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Input Reject</Text>
            <Pressable onPress={closeReject}>
              <Ionicons name="close" size={22} />
            </Pressable>
          </View>
          <Text style={s.modalSubTitle}>
            {rejProdName || `Produk #${rejOpenId ?? ""}`}
          </Text>

          {/* ==== FORM (dibungkus KAV hanya di iOS) ==== */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top + MODAL_TOP + 12}
          >
            <View>
              <Text style={s.fieldLabel}>Jumlah</Text>
              <View style={s.rowInputWithBtn}>
                <TextInput
                  style={[s.modalInput, { flex: 1, marginRight: 8 }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={rejForm.qty}
                  onChangeText={(t) =>
                    setRejForm((f) => ({ ...f, qty: t.replace(/\D+/g, "") }))
                  }
                />
                {rejPhoto ? (
                  <Image source={{ uri: rejPhoto }} style={s.photoThumb} />
                ) : null}

                <Pressable
                  onPress={takeRejectPhoto}
                  style={s.cameraBtn}
                  android_ripple={{ color: "#E5E7EB", borderless: true }}
                >
                  <Ionicons name="camera-outline" size={18} color="#111827" />
                  {/* badge kecil hijau kalau sudah ada foto */}
                  {rejPhoto ? <View style={s.camBadge} /> : null}
                </Pressable>
              </View>
              {/* Jenis Reject – trigger modal list */}
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>
                Jenis Reject <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss(); // ← tutup keyboard agar tidak memicu relayout besar
                  setListOpen(true);
                }}
                style={[
                  s.modalInput,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: listError ? COLORS.danger : BORDER,
                  },
                ]}
              >
                <Text
                  style={{ color: selectedList ? COLORS.text : COLORS.sub }}
                >
                  {selectedList
                    ? selectedList.keterangan
                    : listLoading
                    ? "Memuat..."
                    : "Pilih jenis reject"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
              </Pressable>
              {listError && (
                <Text
                  style={{ color: COLORS.danger, fontSize: 11, marginTop: 4 }}
                >
                  Jenis reject wajib dipilih.
                </Text>
              )}

              <Text style={s.fieldLabel}>Keterangan</Text>
              <TextInput
                style={[s.modalInput, { height: 84, textAlignVertical: "top" }]}
                placeholder="Catatan (opsional)"
                multiline
                value={rejForm.note}
                onChangeText={(t) => setRejForm((f) => ({ ...f, note: t }))}
              />

              <Pressable style={s.saveBtn} onPress={saveReject}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={s.saveBtnTxt}>Simpan</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>

          {/* ==== HISTORY LIST (DI LUAR KAV -> no flicker) ==== */}
          <View style={{ marginTop: 10, maxHeight: 320 }}>
            <FlatList
              data={rejects[String(rejOpenId)] || []}
              keyExtractor={(_, idx) => String(idx)}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              nestedScrollEnabled
              removeClippedSubviews={false} // ← penting untuk cegah blink di Android
              ListEmptyComponent={
                <Text style={s.emptySmall}>
                  Belum ada reject untuk item ini.
                </Text>
              }
              renderItem={({ item, index }) => (
                <View style={s.rejRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rejName}>Jumlah: {fmt(item.qty, 0)}</Text>
                    {!!item.listreject_name && (
                      <Text style={s.rejNote}>
                        Jenis: {item.listreject_name}
                      </Text>
                    )}
                    {!!item.note && <Text style={s.rejNote}>{item.note}</Text>}
                  </View>
                  <Pressable
                    style={s.rejDelBtn}
                    onPress={() => removeReject(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                  </Pressable>
                </View>
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
  /* ===== Modal Dropdown List Reject (terpisah) ===== */
  const ListRejectModal = (
    <Modal
      visible={listOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setListOpen(false)}
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          paddingTop: insets.top + MODAL_TOP, // sejajar dgn modal atas
        }}
        onPress={() => setListOpen(false)}
      >
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: BORDER,
            maxHeight: 420,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              backgroundColor: "#F8FAFC",
            }}
          >
            <Text style={{ fontWeight: "900", color: COLORS.text }}>
              Pilih Jenis Reject
            </Text>
          </View>

          {listLoading ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 6, color: COLORS.sub, fontSize: 12 }}>
                Memuat daftar...
              </Text>
            </View>
          ) : listRejects.length ? (
            <ScrollView
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {listRejects.map((item) => {
                const active = selectedList?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSelectedList(item);
                      setListError(false);
                      setListOpen(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: BORDER,
                      backgroundColor: active ? "#F1F5F9" : "#fff",
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.text,
                        fontWeight: active ? "800" : "400",
                      }}
                    >
                      {item.keterangan}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: COLORS.sub, fontSize: 12 }}>
                Daftar kosong.
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[s.page, { paddingBottom: Math.max(insets.bottom, 16) }]}
      edges={["bottom"]}
    >
      <StatusBar barStyle="dark-content" />

      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
        />
      )}

      {HeaderBar}

      {/* Card pembungkus tabel */}
      <View style={s.tableCard}>
        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === "ios" ? "padding" : "position"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator
            contentContainerStyle={s.hScrollContent}
          >
            {loading && !refreshing ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" />
                <Text style={s.loadingTxt}>Memuat data...</Text>
              </View>
            ) : error ? (
              <View style={s.errorWrap}>
                <Ionicons name="warning-outline" size={18} color="#b91c1c" />
                <Text style={s.errorText}>Gagal memuat data: {error}</Text>
                <Pressable style={s.retryBtn} onPress={() => fetchData()}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={s.retryTxt}>Coba Lagi</Text>
                </Pressable>
              </View>
            ) : rows.length === 0 ? (
              <View style={{ width: "100%" }}>
                {TableHeader}
                <View style={s.emptyWrap}>
                  <View style={s.emptyIcon}>
                    <Ionicons
                      name="file-tray-outline"
                      size={24}
                      color={COLORS.sub}
                    />
                  </View>
                  <Text style={s.emptyTxt}>Tidak ada data</Text>
                </View>
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item, idx) =>
                  `${item?.mproducts_id || "row"}-${idx}`
                }
                renderItem={renderItem}
                ListHeaderComponent={TableHeader}
                ListFooterComponent={FooterWithSpacer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                removeClippedSubviews={false}
                nestedScrollEnabled
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {RejectModal}
      {ListRejectModal}
    </SafeAreaView>
  );
}

/* ===== Styles ===== */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.page, padding: 16 },

  tableCard: {
    flex: 1,
    minHeight: 0,
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
  kav: { flex: 1, minHeight: 0 },

  hScrollContent: { minWidth: 520 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "900", color: COLORS.text },

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

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
    justifyContent: "space-between",
  },
  dateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateLabel: { fontSize: 14, color: COLORS.text, fontWeight: "800" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
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

  summaryWrap: {
    flexDirection: "row",
    gap: 12,
    marginTop: 0.5,
    marginBottom: 2,
  },
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
    width: 30,
    height: 30,
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

  row: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  headerRow: {
    backgroundColor: COLORS.head,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  rowOdd: { backgroundColor: COLORS.rowOdd },
  rowEven: { backgroundColor: COLORS.rowEven },
  footerRow: {
    backgroundColor: "#F6FAF7",
    borderTopWidth: 1,
    borderColor: BORDER,
  },

  cell: {
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 1,
  },
  noRightBorder: { borderRightWidth: 0 },

  headerText: { fontSize: 12, fontWeight: "900", color: COLORS.primaryDark },

  colNo: { width: 48, color: COLORS.text },
  colProduk: { width: 140, flexShrink: 1, color: COLORS.text },
  colRight: { width: 70, textAlign: "center", color: COLORS.text },
  colReal: {
    width: 120,
    textAlign: "center",
    alignItems: "center",
    color: COLORS.text,
  },
  colReject: { width: 90, justifyContent: "center", alignItems: "center" },
  colSelisih: { width: 80, textAlign: "right", color: COLORS.text },

  center: { textAlign: "center" },
  semibold: { fontWeight: "800" },
  primaryDarkTxt: { color: COLORS.primaryDark },

  input: {
    width: 64,
    textAlign: "center",
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: 12,
    color: COLORS.text,
  },

  // reject icon & badge
  rejBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    alignSelf: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },
  rejQtySum: { marginTop: 4, fontSize: 11, color: COLORS.sub },

  // modal atas (dipakai)
  modalOverlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
  },
  modalCardTop: {
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: "100%",
    flexShrink: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  modalSubTitle: { marginTop: 4, color: COLORS.sub, fontWeight: "700" },

  fieldLabel: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  modalInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 13,
    color: COLORS.text,
  },
  rowInputWithBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  camBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },

  saveBtn: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnTxt: { color: "#fff", fontWeight: "900" },

  modalList: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  emptySmall: { color: COLORS.sub, textAlign: "center", paddingVertical: 8 },
  rejRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rejName: { fontWeight: "900", color: COLORS.text },
  rejNote: { color: COLORS.sub, marginTop: 2 },

  rejDelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  modalScroll: { paddingTop: 8, paddingBottom: 16 },

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
    borderRadius: 999,
  },
  retryTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },

  emptyWrap: { alignItems: "center", paddingVertical: 22, gap: 8 },
  emptyTxt: { color: COLORS.sub, fontWeight: "700" },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});
