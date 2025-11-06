// app/ops/proyeksivsmapping.js
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useMemo, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const CATEGORIES = [
  "Roti Manis",
  "Brownies",
  "Cake",
  "Disert",
  "Pastry",
  "Lain",
];

const toNum = (v) => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const clean = String(v).replace(/[^\d-]/g, "");
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
};

const idr = (n) => "Rp " + toNum(n).toLocaleString("id-ID");
const pct = (n) => `${(n ?? 0).toFixed(1)}%`;

export default function ProyeksiVsMappingScreen() {
      // ⬇️ Tambahkan ini di sini
  useEffect(() => {
    // Saat halaman dibuka, paksa ke landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Saat halaman ditutup, kembalikan ke portrait
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, []);
  const [rows, setRows] = useState(
    CATEGORIES.map((name, i) => ({
      id: i + 1,
      name,
      proyeksi: 0,
      realisasi: 0,
      kasirSales: 0,
      kasirAdmin: 0,
      bakerRoti: 0,
      bakerUltah: 0,
      bakerBrownies: 0,
    }))
  );

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const devRph = toNum(r.realisasi) - toNum(r.proyeksi);
        const devPct =
          toNum(r.proyeksi) === 0
            ? 0
            : (devRph / toNum(r.proyeksi)) * 100;
        const pt =
          toNum(r.proyeksi) === 0
            ? 0
            : (toNum(r.realisasi) / toNum(r.proyeksi)) * 100;
        const totalSDM = [
          r.kasirSales,
          r.kasirAdmin,
          r.bakerRoti,
          r.bakerUltah,
          r.bakerBrownies,
        ]
          .map(toNum)
          .reduce((a, b) => a + b, 0);
        const ratioPerJuta =
          toNum(r.realisasi) === 0
            ? 0
            : totalSDM / (toNum(r.realisasi) / 1_000_000);
        return { ...r, devRph, devPct, pt, totalSDM, ratioPerJuta };
      }),
    [rows]
  );

  const totals = useMemo(() => {
    const base = {
      proyeksi: 0,
      realisasi: 0,
      devRph: 0,
      kasirSales: 0,
      kasirAdmin: 0,
      bakerRoti: 0,
      bakerUltah: 0,
      bakerBrownies: 0,
      totalSDM: 0,
    };
    const agg = computed.reduce((acc, r) => {
      acc.proyeksi += toNum(r.proyeksi);
      acc.realisasi += toNum(r.realisasi);
      acc.devRph += r.devRph;
      acc.kasirSales += toNum(r.kasirSales);
      acc.kasirAdmin += toNum(r.kasirAdmin);
      acc.bakerRoti += toNum(r.bakerRoti);
      acc.bakerUltah += toNum(r.bakerUltah);
      acc.bakerBrownies += toNum(r.bakerBrownies);
      acc.totalSDM += toNum(r.totalSDM);
      return acc;
    }, base);

    const devPct =
      agg.proyeksi === 0 ? 0 : (agg.devRph / agg.proyeksi) * 100;
    const pt =
      agg.proyeksi === 0 ? 0 : (agg.realisasi / agg.proyeksi) * 100;
    const ratioPerJuta =
      agg.realisasi === 0
        ? 0
        : agg.totalSDM / (agg.realisasi / 1_000_000);

    return { ...agg, devPct, pt, ratioPerJuta };
  }, [computed]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerBox}>
        <Text style={styles.title}>
          DATA MAPPING PROYEKSI VS OMZET DAN KOMPOSISI SDM
        </Text>
        <Text style={styles.subtitle}>
        TOKO :
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* HEADER */}
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.th, styles.no]}>NO</Text>
            <Text style={[styles.cell, styles.th, styles.kategori]}>
              KATEGORI
            </Text>
            <Text style={[styles.cell, styles.th, styles.money]}>
              PROYEKSI
            </Text>
            <Text style={[styles.cell, styles.th, styles.money]}>
              REALISASI
            </Text>
            <View style={styles.group}>
              <Text style={styles.groupTitle}>DEVIASI</Text>
              <View style={styles.groupInner}>
                <Text style={[styles.cell, styles.th, styles.money]}>
                  Rph.
                </Text>
                <Text style={[styles.cell, styles.th, styles.tiny]}>%</Text>
                <Text style={[styles.cell, styles.th, styles.tiny]}>PT</Text>
              </View>
            </View>
            <View style={styles.group}>
              <Text style={styles.groupTitle}>KOMPOSISI SDM</Text>
              <View style={styles.groupInner}>
                <Text style={[styles.cell, styles.th, styles.sdmCol]}>
                  Kasir{"\n"}Sales
                </Text>
                <Text style={[styles.cell, styles.th, styles.sdmCol]}>
                  Kasir{"\n"}Admin
                </Text>
                <Text style={[styles.cell, styles.th, styles.sdmCol]}>
                  Baker{"\n"}Roti
                </Text>
                <Text style={[styles.cell, styles.th, styles.sdmCol]}>
                  Baker{"\n"}Ultah
                </Text>
                <Text style={[styles.cell, styles.th, styles.sdmCol]}>
                  Baker{"\n"}Brownies
                </Text>
              </View>
            </View>
            <Text style={[styles.cell, styles.th, styles.totalSdm]}>
              TOTAL SDM
            </Text>
            <Text style={[styles.cell, styles.th, styles.ratio]}>
              RASIO SDM VS OMZET{"\n"}(SDM per Rp1jt)
            </Text>
          </View>

          {/* BODY */}
          {computed.map((r, idx) => (
            <View
              key={r.id}
              style={[styles.row, idx % 2 ? styles.altRow : null]}
            >
              <Text style={[styles.cell, styles.no]}>{r.id}</Text>
              <Text style={[styles.cell, styles.kategori, styles.bold]}>
                {r.name}
              </Text>

              {/* Input Proyeksi */}
              <TextInput
                keyboardType="number-pad"
                value={String(r.proyeksi || "")}
                onChangeText={(t) => updateRow(r.id, { proyeksi: toNum(t) })}
                placeholder="0"
                style={[styles.cell, styles.money, styles.cellInput]}
              />

              {/* Input Realisasi */}
              <TextInput
                keyboardType="number-pad"
                value={String(r.realisasi || "")}
                onChangeText={(t) => updateRow(r.id, { realisasi: toNum(t) })}
                placeholder="0"
                style={[styles.cell, styles.money, styles.cellInput]}
              />

              {/* Deviasi */}
              <Text style={[styles.cell, styles.money, styles.right]}>
                {idr(r.devRph)}
              </Text>
              <Text style={[styles.cell, styles.tiny, styles.right]}>
                {pct(r.devPct)}
              </Text>
              <Text style={[styles.cell, styles.tiny, styles.right]}>
                {pct(r.pt)}
              </Text>

              {/* Komposisi SDM */}
              {["kasirSales", "kasirAdmin", "bakerRoti", "bakerUltah", "bakerBrownies"].map((k) => (
                <TextInput
                  key={k}
                  keyboardType="number-pad"
                  value={String(r[k] || "")}
                  onChangeText={(t) => updateRow(r.id, { [k]: toNum(t) })}
                  placeholder="0"
                  style={[styles.cell, styles.sdmCol, styles.cellInput]}
                />
              ))}

              {/* Total dan Rasio */}
              <Text style={[styles.cell, styles.totalSdm, styles.right]}>
                {r.totalSDM}
              </Text>
              <Text style={[styles.cell, styles.ratio, styles.right]}>
                {r.ratioPerJuta.toFixed(2)}
              </Text>
            </View>
          ))}

          {/* TOTAL */}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.no, styles.bold]}>Σ</Text>
            <Text style={[styles.cell, styles.kategori, styles.bold]}>
              TOTAL
            </Text>
            <Text style={[styles.cell, styles.money, styles.right, styles.bold]}>
              {idr(totals.proyeksi)}
            </Text>
            <Text style={[styles.cell, styles.money, styles.right, styles.bold]}>
              {idr(totals.realisasi)}
            </Text>
            <Text style={[styles.cell, styles.money, styles.right, styles.bold]}>
              {idr(totals.devRph)}
            </Text>
            <Text style={[styles.cell, styles.tiny, styles.right, styles.bold]}>
              {pct(totals.devPct)}
            </Text>
            <Text style={[styles.cell, styles.tiny, styles.right, styles.bold]}>
              {pct(totals.pt)}
            </Text>
            <Text style={[styles.cell, styles.sdmCol, styles.right, styles.bold]}>
              {totals.kasirSales}
            </Text>
            <Text style={[styles.cell, styles.sdmCol, styles.right, styles.bold]}>
              {totals.kasirAdmin}
            </Text>
            <Text style={[styles.cell, styles.sdmCol, styles.right, styles.bold]}>
              {totals.bakerRoti}
            </Text>
            <Text style={[styles.cell, styles.sdmCol, styles.right, styles.bold]}>
              {totals.bakerUltah}
            </Text>
            <Text style={[styles.cell, styles.sdmCol, styles.right, styles.bold]}>
              {totals.bakerBrownies}
            </Text>
            <Text style={[styles.cell, styles.totalSdm, styles.right, styles.bold]}>
              {totals.totalSDM}
            </Text>
            <Text style={[styles.cell, styles.ratio, styles.right, styles.bold]}>
              {totals.ratioPerJuta.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  headerBox: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#475569", marginTop: 2 },

  row: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 44,
    backgroundColor: "#fff",
  },
  altRow: { backgroundColor: "#f9fbff" },
  header: {
    backgroundColor: "#eef2ff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#c7d2fe",
  },
  totalRow: {
    backgroundColor: "#e2e8f0",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#94a3b8",
  },
  th: { fontWeight: "700", color: "#0f172a" },
  bold: { fontWeight: "700" },
  right: { textAlign: "right" },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 110,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 12,
    color: "#0f172a",
  },
  cellInput: { backgroundColor: "#fff" },
  no: { minWidth: 48, textAlignVertical: "center" },
  kategori: { minWidth: 150 },
  money: { minWidth: 140 },
  tiny: { minWidth: 80 },
  totalSdm: { minWidth: 120 },
  ratio: { minWidth: 150 },
  sdmCol: { minWidth: 110 },
  group: { flexDirection: "column" },
  groupTitle: {
    textAlign: "center",
    fontWeight: "700",
    color: "#0f172a",
    paddingTop: 6,
  },
  groupInner: { flexDirection: "row" },
});
