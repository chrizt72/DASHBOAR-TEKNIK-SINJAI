import { GarduItem, PenyulangBebanItem, GarduBebanDetail } from '../types';

export interface Beban20kvSummary {
  totalBebanKv: number;
  totalGardu: number;
  totalKvaTrafo: number;
  avgBebanKvPerGardu: number;
  avgBebanPersen: number;
  totalKeypoint: number;
  peakKeypoint: string;
  peakKeypointBeban: number;
  peakPenyulangInduk: string;
  lowestKeypoint: string;
  lowestKeypointBeban: number;
  totalOverloadGardu: number;
  totalNormalGardu: number;
  totalUnderloadGardu: number;
}

/**
 * Menghitung rekap beban 20kV tiap penyulang berdasarkan data gardu.
 * Sesuai instruksi:
 * - Data penyulang diambil dari sheet "master gardu" kolom M "keypoint"
 * - Beban kv gardu diambil dari kolom AB "BEBAN (KV)"
 */
export function calculateBeban20kv(garduList: GarduItem[]): {
  items: PenyulangBebanItem[];
  summary: Beban20kvSummary;
} {
  const map = new Map<string, {
    keypoint: string;
    penyulangInduk: string;
    totalGardu: number;
    totalBebanKv: number;
    totalKvaTrafo: number;
    totalBebanPersen: number;
    maxBebanKv: number;
    maxBebanGardu: string;
    overloadCount: number;
    normalCount: number;
    underloadCount: number;
    garduList: GarduBebanDetail[];
  }>();

  let globalTotalBebanKv = 0;
  let globalTotalGardu = 0;
  let globalTotalKva = 0;
  let globalTotalOverload = 0;
  let globalTotalNormal = 0;
  let globalTotalUnderload = 0;
  let globalSumBebanPersen = 0;

  garduList.forEach((g, idx) => {
    // Pastikan gardu valid
    if (!g.nama || g.nama.trim() === '') return;

    // Kolom M: KEYPOINT (sebagai data penyulang)
    const keypoint = (g.keypoint || '').trim() || 'NON_KEYPOINT';
    // Kolom K: PENYULANG (induk feeder)
    const penyulangInduk = (g.penyulang || '').trim() || 'TIDAK TERDEFINISI';
    // Kolom AB: BEBAN (KV)
    const bebanKv = typeof g.bebanKv === 'number' && !isNaN(g.bebanKv) ? g.bebanKv : 0;
    const kva = typeof g.kvaTrafo === 'number' && !isNaN(g.kvaTrafo) ? g.kvaTrafo : 0;
    const bebanPersen = typeof g.bebanPersen === 'number' && !isNaN(g.bebanPersen) ? g.bebanPersen : 0;

    globalTotalBebanKv += bebanKv;
    globalTotalGardu += 1;
    globalTotalKva += kva;
    globalSumBebanPersen += bebanPersen;

    let isOverload = g.statusBeban === 'OVERLOAD' || bebanPersen > 80;
    let isUnderload = g.statusBeban === 'UNDERLOAD' || (bebanPersen > 0 && bebanPersen < 20);
    let isNormal = !isOverload && !isUnderload;

    if (isOverload) globalTotalOverload += 1;
    else if (isUnderload) globalTotalUnderload += 1;
    else globalTotalNormal += 1;

    let current = map.get(keypoint);
    if (!current) {
      current = {
        keypoint,
        penyulangInduk,
        totalGardu: 0,
        totalBebanKv: 0,
        totalKvaTrafo: 0,
        totalBebanPersen: 0,
        maxBebanKv: -1,
        maxBebanGardu: '',
        overloadCount: 0,
        normalCount: 0,
        underloadCount: 0,
        garduList: [],
      };
      map.set(keypoint, current);
    }

    current.totalGardu += 1;
    current.totalBebanKv += bebanKv;
    current.totalKvaTrafo += kva;
    current.totalBebanPersen += bebanPersen;

    if (bebanKv > current.maxBebanKv) {
      current.maxBebanKv = bebanKv;
      current.maxBebanGardu = g.nama;
    }

    if (isOverload) current.overloadCount += 1;
    else if (isUnderload) current.underloadCount += 1;
    else current.normalCount += 1;

    current.garduList.push({
      no: g.no || idx + 1,
      nama: g.nama,
      namaGdMaip: g.namaGdMaip,
      penyulang: g.penyulang,
      keypoint: g.keypoint,
      zonaProteksi: g.zonaProteksi,
      kvaTrafo: g.kvaTrafo,
      bebanKv,
      bebanPersen,
      statusBeban: g.statusBeban,
      fasaTrafo: g.fasaTrafo,
      konstruksi: g.konstruksi,
      alamat: g.alamat,
      jurusan: g.jurusan,
      ir: g.ir,
      is: g.is,
      it: g.it,
      in: g.in,
      pic: g.pic,
    });
  });

  const items: PenyulangBebanItem[] = Array.from(map.values()).map(item => {
    const avgBebanKv = item.totalGardu > 0 ? item.totalBebanKv / item.totalGardu : 0;
    const avgBebanPersen = item.totalGardu > 0 ? item.totalBebanPersen / item.totalGardu : 0;

    let statusBebanDominan: 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD' | 'TIDAK TERDEFINISI' = 'NORMAL';
    if (item.overloadCount > 0 && item.overloadCount >= item.totalGardu * 0.3) {
      statusBebanDominan = 'OVERLOAD';
    } else if (item.underloadCount > item.normalCount && item.underloadCount > item.overloadCount) {
      statusBebanDominan = 'UNDERLOAD';
    } else {
      statusBebanDominan = 'NORMAL';
    }

    // Sort gardu inside by bebanKv descending
    item.garduList.sort((a, b) => b.bebanKv - a.bebanKv);

    return {
      keypoint: item.keypoint,
      penyulangInduk: item.penyulangInduk,
      totalGardu: item.totalGardu,
      totalBebanKv: Number(item.totalBebanKv.toFixed(2)),
      totalKvaTrafo: Number(item.totalKvaTrafo.toFixed(1)),
      avgBebanKv: Number(avgBebanKv.toFixed(2)),
      avgBebanPersen: Number(avgBebanPersen.toFixed(1)),
      maxBebanKv: Number(item.maxBebanKv.toFixed(2)),
      maxBebanGardu: item.maxBebanGardu,
      overloadCount: item.overloadCount,
      normalCount: item.normalCount,
      underloadCount: item.underloadCount,
      statusBebanDominan,
      garduList: item.garduList,
    };
  });

  // Urutkan default berdasarkan beban total tertinggi
  items.sort((a, b) => b.totalBebanKv - a.totalBebanKv);

  const peak = items.length > 0 ? items[0] : null;
  const lowest = items.length > 0 ? items[items.length - 1] : null;

  const summary: Beban20kvSummary = {
    totalBebanKv: Number(globalTotalBebanKv.toFixed(2)),
    totalGardu: globalTotalGardu,
    totalKvaTrafo: Number(globalTotalKva.toFixed(1)),
    avgBebanKvPerGardu: globalTotalGardu > 0 ? Number((globalTotalBebanKv / globalTotalGardu).toFixed(2)) : 0,
    avgBebanPersen: globalTotalGardu > 0 ? Number((globalSumBebanPersen / globalTotalGardu).toFixed(1)) : 0,
    totalKeypoint: items.length,
    peakKeypoint: peak ? peak.keypoint : '-',
    peakKeypointBeban: peak ? peak.totalBebanKv : 0,
    peakPenyulangInduk: peak ? peak.penyulangInduk : '-',
    lowestKeypoint: lowest ? lowest.keypoint : '-',
    lowestKeypointBeban: lowest ? lowest.totalBebanKv : 0,
    totalOverloadGardu: globalTotalOverload,
    totalNormalGardu: globalTotalNormal,
    totalUnderloadGardu: globalTotalUnderload,
  };

  return { items, summary };
}
