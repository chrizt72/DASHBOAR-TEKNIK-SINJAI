import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SurveyK3Item, StikerK3Item, CcvItem, CcvObserverRanking, DesaItem, K3LData } from '../types';
import { parseCoordinate } from '../utils/coordinateParser';

export const K3L_STORAGE_KEY = 'pln_sinjai_k3l_custom_data_v4';

// Re-export Master Desa and Data Desa Tersurvey
export { MASTER_DESA_SINJAI, DEFAULT_DESA_TERSEDIA_SOSIALISASI } from '../data/desaK3Data';
export { DEFAULT_SURVEY_K3 } from '../data/surveyK3Data';
export { DEFAULT_STIKER_K3 } from '../data/stikerK3Data';

import { MASTER_DESA_SINJAI, DEFAULT_DESA_TERSEDIA_SOSIALISASI } from '../data/desaK3Data';
import { DEFAULT_SURVEY_K3 } from '../data/surveyK3Data';
import { DEFAULT_STIKER_K3 } from '../data/stikerK3Data';
import { DEFAULT_CCV_2331 } from '../data/ccvK3Data';

/**
 * Filter Helper: Validates if a unit name belongs to Sinjai,
 * matching "SINJAI", "ULP SINJAI", and "ULPSINJAI" (case-insensitive & space-tolerant).
 */
export function isSinjaiUnit(_val?: string | undefined | null): boolean {
  // Tanpa filter unit: tampilkan seluruh entri dari spreadsheet tanpa pengecualian
  return true;
}

// ==========================================
// 4. DATA CCV TERVERIFIKASI ULP SINJAI (2.331 DATA PERIODE JANUARI - SEPTEMBER 2026)
// ==========================================
export const DEFAULT_CCV: CcvItem[] = DEFAULT_CCV_2331;

// ==========================================
// ==========================================
// 5. HELPER UNTUK MENGGABUNGKAN DATA DESA (SHEET "DESA" & SHEET "DATA")
// ==========================================

export function cleanVillageName(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/\b(desa|kelurahan|kel|ds|kp|kampung|dusun)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extracts survey ID from row data or headers, with fallback to clean auto-id.
 */
export function extractIdSurvey(row: any[], headers?: string[], index = 0): string {
  if (headers && headers.length > 0) {
    const idIdx = headers.findIndex(h => {
      const u = (h || '').toUpperCase();
      return (
        u === 'ID SURVEY' ||
        u === 'ID_SURVEY' ||
        u === 'ID_TEMUAN' ||
        u === 'NO SURVEY' ||
        u === 'KODE SURVEY' ||
        u === 'ID TIANG' ||
        u === 'NO TIANG' ||
        u === 'ID LAPORAN' ||
        u === 'ID' ||
        u === 'KODE'
      );
    });
    if (idIdx !== -1 && row[idIdx] !== undefined) {
      const val = String(row[idIdx]).trim();
      if (val && val !== '-' && val !== '#N/A') return val;
    }
  }

  // Scan early columns for ID formats like SRV-..., S-..., TG-..., etc.
  for (let c = 0; c < Math.min(row.length, 5); c++) {
    const val = String(row[c] || '').trim();
    if (/^(SRV|SURVEY|TG|TNG|K3|ID)[-_0-9]/i.test(val)) {
      return val;
    }
  }

  return `SRV-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Extracts stiker/rambu ID from row data or headers, with fallback to clean auto-id.
 */
export function extractIdStiker(row: any[], headers?: string[], index = 0): string {
  if (headers && headers.length > 0) {
    const idIdx = headers.findIndex(h => {
      const u = (h || '').toUpperCase();
      return (
        u === 'ID STIKER' ||
        u === 'ID_STIKER' ||
        u === 'ID RAMBU' ||
        u === 'ID_RAMBU' ||
        u === 'NO STIKER' ||
        u === 'KODE RAMBU' ||
        u === 'ID' ||
        u === 'KODE'
      );
    });
    if (idIdx !== -1 && row[idIdx] !== undefined) {
      const val = String(row[idIdx]).trim();
      if (val && val !== '-' && val !== '#N/A') return val;
    }
  }

  for (let c = 0; c < Math.min(row.length, 5); c++) {
    const val = String(row[c] || '').trim();
    if (/^(STK|STIKER|RMB|RAMBU|K3)[-_0-9]/i.test(val)) {
      return val;
    }
  }

  return `STK-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Counts items by unique ID Survey
 */
export function countUniqueSurveyIds(items: SurveyK3Item[]): number {
  const ids = new Set(
    items.map(s => (s.idSurvey || s.id || '').trim()).filter(Boolean)
  );
  return ids.size > 0 ? ids.size : items.length;
}

/**
 * Counts items by unique ID Stiker/Rambu
 */
export function countUniqueStikerIds(items: StikerK3Item[]): number {
  const ids = new Set(
    items.map(s => (s.idStiker || s.id || '').trim()).filter(Boolean)
  );
  return ids.size > 0 ? ids.size : items.length;
}

export interface ExtractedCoordinates {
  primaryRaw: string;
  secondaryRaw?: string;
  lat: number | null;
  lng: number | null;
  latLain?: number | null;
  lngLain?: number | null;
  hasValidCoordinate: boolean;
}

/**
 * Multi-source coordinate extraction:
 * Checks primary column, secondary/alternative column ("titik koordinat yang lain"),
 * separate LAT/LONG columns, and scans ALL other cells in the row so no valid coordinates are missed.
 */
export function extractCoordinatesFromRow(
  row: any[],
  headers?: string[],
  primaryColIdx = -1,
  secondaryColIdx = -1,
  locationHint = ''
): ExtractedCoordinates {
  let primaryRaw = '';
  let secondaryRaw = '';

  if (primaryColIdx >= 0 && row[primaryColIdx] !== undefined) {
    primaryRaw = String(row[primaryColIdx] || '').trim();
  }
  if (secondaryColIdx >= 0 && row[secondaryColIdx] !== undefined) {
    secondaryRaw = String(row[secondaryColIdx] || '').trim();
  }

  if (headers && headers.length > 0) {
    if (!primaryRaw) {
      const pIdx = headers.findIndex(h => {
        const u = (h || '').toUpperCase();
        return (
          u.includes('TITIK KOORDINAT') ||
          u.includes('KOORDINAT') ||
          u.includes('LAT/LONG') ||
          u.includes('LAT LONG') ||
          u.includes('GPS')
        ) && !u.includes('LAIN') && !u.includes('2') && !u.includes('AKHIR');
      });
      if (pIdx !== -1 && row[pIdx]) {
        primaryRaw = String(row[pIdx]).trim();
      }
    }

    if (!secondaryRaw) {
      const sIdx = headers.findIndex(h => {
        const u = (h || '').toUpperCase();
        return (
          u.includes('KOORDINAT LAIN') ||
          u.includes('TITIK LAIN') ||
          u.includes('TITIK KOORDINAT LAIN') ||
          u.includes('KOORDINAT 2') ||
          u.includes('KOORDINAT ALTERNATIF') ||
          u.includes('GPS 2') ||
          u.includes('KOORDINAT AKHIR')
        );
      });
      if (sIdx !== -1 && row[sIdx]) {
        secondaryRaw = String(row[sIdx]).trim();
      }
    }

    // Check separate LATITUDE and LONGITUDE columns
    if (!primaryRaw) {
      const latIdx = headers.findIndex(h => {
        const u = (h || '').toUpperCase();
        return u === 'LAT' || u === 'LATITUDE' || u === 'LINTANG' || u === 'Y';
      });
      const lngIdx = headers.findIndex(h => {
        const u = (h || '').toUpperCase();
        return u === 'LONG' || u === 'LNG' || u === 'LONGITUDE' || u === 'BUJUR' || u === 'X';
      });
      if (latIdx !== -1 && lngIdx !== -1 && row[latIdx] && row[lngIdx]) {
        primaryRaw = `${row[latIdx]}, ${row[lngIdx]}`;
      }
    }
  }

  // Scan all cells in the row for any coordinates
  const foundCoords: { raw: string; lat: number; lng: number }[] = [];
  for (let c = 0; c < row.length; c++) {
    const val = String(row[c] || '').trim();
    if (!val || val === '-' || val === '#N/A' || val.length < 5) continue;
    if (!/\d/.test(val)) continue;

    const parsed = parseCoordinate(val);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      const exists = foundCoords.some(
        fc => Math.abs(fc.lat - parsed.lat) < 0.00001 && Math.abs(fc.lng - parsed.lng) < 0.00001
      );
      if (!exists) {
        foundCoords.push({ raw: val, lat: parsed.lat, lng: parsed.lng });
      }
    }
  }

  let parsedPrimary = primaryRaw ? parseCoordinate(primaryRaw) : null;
  if (!parsedPrimary && foundCoords.length > 0) {
    primaryRaw = foundCoords[0].raw;
    parsedPrimary = { lat: foundCoords[0].lat, lng: foundCoords[0].lng };
  }

  let parsedSecondary = secondaryRaw ? parseCoordinate(secondaryRaw) : null;
  if (!parsedSecondary && foundCoords.length > 1) {
    secondaryRaw = foundCoords[1].raw;
    parsedSecondary = { lat: foundCoords[1].lat, lng: foundCoords[1].lng };
  } else if (!parsedSecondary && secondaryRaw) {
    parsedSecondary = parseCoordinate(secondaryRaw);
  }

  if (!parsedPrimary && parsedSecondary) {
    parsedPrimary = parsedSecondary;
    primaryRaw = secondaryRaw;
    parsedSecondary = null;
    secondaryRaw = '';
  }

  // Fallback to location/village coordinates if still without coordinates
  if (!parsedPrimary && locationHint) {
    const fallback = parseCoordinate('', locationHint);
    if (fallback) {
      parsedPrimary = fallback;
      primaryRaw = `Perkiraan (${locationHint})`;
    }
  }

  return {
    primaryRaw: primaryRaw || (parsedPrimary ? `${parsedPrimary.lat.toFixed(6)}, ${parsedPrimary.lng.toFixed(6)}` : '-'),
    secondaryRaw: secondaryRaw || (parsedSecondary ? `${parsedSecondary.lat.toFixed(6)}, ${parsedSecondary.lng.toFixed(6)}` : undefined),
    lat: parsedPrimary?.lat ?? null,
    lng: parsedPrimary?.lng ?? null,
    latLain: parsedSecondary?.lat ?? null,
    lngLain: parsedSecondary?.lng ?? null,
    hasValidCoordinate: Boolean(parsedPrimary),
  };
}

/**
 * Merges Sheet "DESA" and Sheet "DATA" into a complete deduplicated list.
 * Recalculates unsurveyed villages (desaBelum) and surveyed villages (desaSudah).
 */
export function mergeDesaData(
  sheetDataRows: any[],
  sheetDesaRows: any[],
  surveyItems?: SurveyK3Item[]
): DesaItem[] {
  // 1. Build Kecamatan lookup from master data
  const kecamatanLookup = new Map<string, string>();
  for (const m of MASTER_DESA_SINJAI) {
    kecamatanLookup.set(cleanVillageName(m.namaDesa), m.kecamatan);
  }

  // Merged village map by cleaned name
  const mergedMap = new Map<string, DesaItem>();

  // Helper to extract clean object from row or raw item
  const processDataEntry = (item: any) => {
    let namaDesa = '';
    let kecamatan = '';
    let statusRaw = '';
    let tanggal = '';

    if (Array.isArray(item)) {
      namaDesa = String(item[0] || item[1] || '').trim();
      kecamatan = String(item[1] || item[2] || '').trim();
      statusRaw = String(item[3] || item[4] || '').trim();
      tanggal = String(item[2] || item[3] || '').trim();
    } else if (typeof item === 'object' && item !== null) {
      namaDesa = String(item.namaDesa || item.desa || item.nama || '').trim();
      kecamatan = String(item.kecamatan || '').trim();
      statusRaw = String(item.status || '').trim();
      tanggal = String(item.tanggal || item.tanggalSosialisasi || '').trim();
    }

    if (!namaDesa) return;
    const cleanKey = cleanVillageName(namaDesa);
    if (!cleanKey) return;

    const resolvedKec = kecamatan || kecamatanLookup.get(cleanKey) || 'Sinjai';
    const isSudah = statusRaw.toUpperCase().includes('SUDAH') ||
      statusRaw.toUpperCase().includes('TERLAKSANA') ||
      statusRaw.toUpperCase().includes('SELESAI');

    mergedMap.set(cleanKey, {
      id: `desa-${cleanKey}`,
      no: 0,
      namaDesa,
      kecamatan: resolvedKec,
      status: isSudah ? 'SUDAH' : 'BELUM',
      tanggalSosialisasi: isSudah && tanggal ? tanggal : undefined,
      lokasiKegiatan: `Kantor Desa / Balai Warga ${namaDesa}`,
      sumberData: 'DATA',
      keterangan: isSudah ? 'Tersurvey / Terlaksana' : 'Belum tersurvey dalam agenda lapangan',
      rekomendasiJadwal: isSudah ? 'Telah disurvey' : 'Target Triwulan Berikutnya',
    });
  };

  // Process rows from Sheet "DATA"
  const safeDataRows = Array.isArray(sheetDataRows) && sheetDataRows.length > 0
    ? sheetDataRows
    : MASTER_DESA_SINJAI;

  for (const item of safeDataRows) {
    processDataEntry(item);
  }

  // Helper to process entries from Sheet "DESA"
  const processDesaEntry = (item: any) => {
    let namaDesa = '';
    let kecamatan = '';
    let tanggal = '';
    let lokasiKegiatan = '';
    let jumlahPeserta = 35;
    let materi = 'Bahaya Listrik & Jarak Aman K3';
    let petugas = 'Tim K3 ULP Sinjai';
    let statusRaw = '';

    if (Array.isArray(item)) {
      namaDesa = String(item[0] || item[1] || '').trim();
      tanggal = String(item[2] || 'Tersosialisasi').trim();
      lokasiKegiatan = String(item[3] || '').trim();
      jumlahPeserta = parseInt(String(item[4] || '35'), 10) || 35;
      materi = String(item[5] || 'Bahaya Listrik & K3 Lingkungan').trim();
      petugas = String(item[6] || 'Tim K3').trim();
      statusRaw = String(item[7] || item[3] || '').trim();
    } else if (typeof item === 'object' && item !== null) {
      namaDesa = String(item.namaDesa || item.desa || item.nama || '').trim();
      tanggal = String(item.tanggal || item.tanggalSosialisasi || 'Tersosialisasi').trim();
      lokasiKegiatan = String(item.lokasiKegiatan || '').trim();
      jumlahPeserta = typeof item.jumlahPeserta === 'number' ? item.jumlahPeserta : 35;
      materi = String(item.materi || 'Bahaya Listrik & Jarak Aman K3').trim();
      petugas = String(item.petugas || 'Tim K3 ULP Sinjai').trim();
      statusRaw = String(item.status || '').trim();
    }

    if (!namaDesa) return;
    const cleanKey = cleanVillageName(namaDesa);
    if (!cleanKey) return;

    // Check if status is explicitly marked BELUM
    const isExplicitlyBelum = statusRaw.toUpperCase().includes('BELUM') ||
      tanggal.toUpperCase().includes('BELUM');

    const existing = mergedMap.get(cleanKey);

    if (existing) {
      // Merge with existing record from Sheet "DATA"
      const finalStatus = isExplicitlyBelum ? 'BELUM' : 'SUDAH';
      mergedMap.set(cleanKey, {
        ...existing,
        status: finalStatus,
        sumberData: 'GABUNGAN',
        tanggalSosialisasi: finalStatus === 'SUDAH' ? (tanggal || 'Tersosialisasi') : undefined,
        lokasiKegiatan: lokasiKegiatan || existing.lokasiKegiatan || `Kantor Desa ${namaDesa}`,
        jumlahPeserta,
        materi,
        petugas,
        keterangan: finalStatus === 'SUDAH' ? 'Terdata pada gabungan Sheet DESA & DATA' : 'Belum tersurvey',
      });
    } else {
      // New village present in Sheet "DESA"
      const resolvedKec = kecamatan || kecamatanLookup.get(cleanKey) || 'Sinjai';
      const finalStatus = isExplicitlyBelum ? 'BELUM' : 'SUDAH';
      mergedMap.set(cleanKey, {
        id: `desa-${cleanKey}`,
        no: 0,
        namaDesa,
        kecamatan: resolvedKec,
        status: finalStatus,
        tanggalSosialisasi: finalStatus === 'SUDAH' ? (tanggal || 'Tersosialisasi') : undefined,
        lokasiKegiatan: lokasiKegiatan || `Kantor Desa ${namaDesa}`,
        jumlahPeserta,
        materi,
        petugas,
        sumberData: 'DESA',
        keterangan: finalStatus === 'SUDAH' ? 'Tersurvey / Tersosialisasi (Sheet DESA)' : 'Belum tersurvey',
        rekomendasiJadwal: finalStatus === 'SUDAH' ? 'Telah disurvey' : 'Target Triwulan Berikutnya',
      });
    }
  };

  const safeDesaRows = Array.isArray(sheetDesaRows) && sheetDesaRows.length > 0
    ? sheetDesaRows
    : DEFAULT_DESA_TERSEDIA_SOSIALISASI;

  for (const item of safeDesaRows) {
    processDesaEntry(item);
  }

  // Cross-reference with surveyItems if provided
  if (Array.isArray(surveyItems) && surveyItems.length > 0) {
    for (const s of surveyItems) {
      const locationText = `${s.lokasi || ''} ${s.penyulang || ''}`.toLowerCase();
      mergedMap.forEach((desaItem, key) => {
        if (locationText.includes(desaItem.namaDesa.toLowerCase()) || locationText.includes(key)) {
          if (desaItem.status === 'BELUM') {
            desaItem.keterangan = `Titik survey potensi K3 terdeteksi (${s.jenisTiang || 'Tiang'})`;
          }
        }
      });
    }
  }

  // Sort by kecamatan, then by namaDesa
  const result = Array.from(mergedMap.values()).sort((a, b) => {
    const kecCompare = a.kecamatan.localeCompare(b.kecamatan);
    if (kecCompare !== 0) return kecCompare;
    return a.namaDesa.localeCompare(b.namaDesa);
  });

  // Assign clean sequential numbers and IDs
  return result.map((item, idx) => ({
    ...item,
    no: idx + 1,
    id: `desa-gabungan-${idx + 1}`,
  }));
}

// ==========================================
// 6. CALCULATOR SUMMARY & RANKING CCV OBSERVER
// ==========================================
export function calculateCcvRankings(ccvList: CcvItem[]): CcvObserverRanking[] {
  const map = new Map<string, { count: number; lastInput?: string; patuh: number; temuan: number }>();

  for (const item of ccvList) {
    const name = item.namaObserver.trim();
    if (!name) continue;

    const existing = map.get(name) || { count: 0, patuh: 0, temuan: 0 };
    existing.count += 1;
    if (item.statusKepatuhan === 'PATUH') existing.patuh += 1;
    else existing.temuan += 1;

    if (item.tanggal) {
      existing.lastInput = item.tanggal;
    }
    map.set(name, existing);
  }

  const total = ccvList.length || 1;
  const rankings: CcvObserverRanking[] = [];

  map.forEach((val, name) => {
    rankings.push({
      namaObserver: name,
      totalCcv: val.count,
      persentase: Number(((val.count / total) * 100).toFixed(1)),
      terakhirInput: val.lastInput,
      patuhCount: val.patuh,
      temuanCount: val.temuan,
    });
  });

  return rankings.sort((a, b) => b.totalCcv - a.totalCcv);
}

// ==========================================
// 7. INITIALIZE DEFAULT K3L DATA
// ==========================================
export function getInitialK3LData(): K3LData {
  try {
    const cached = localStorage.getItem(K3L_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        parsed &&
        Array.isArray(parsed.surveyK3) &&
        parsed.surveyK3.length >= 209 &&
        Array.isArray(parsed.stikerK3) &&
        parsed.stikerK3.length >= 382 &&
        Array.isArray(parsed.ccv) &&
        parsed.ccv.length >= 50 &&
        !parsed.ccv.some((c: any) => c.namaObserver?.toLowerCase().includes('christian')) &&
        Array.isArray(parsed.desaList)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached K3L data:', e);
  }

  const surveyK3 = DEFAULT_SURVEY_K3;
  const stikerK3 = DEFAULT_STIKER_K3;
  const ccv = DEFAULT_CCV;
  const desaList = mergeDesaData(MASTER_DESA_SINJAI, DEFAULT_DESA_TERSEDIA_SOSIALISASI, surveyK3);

  const totalSurveyK3 = countUniqueSurveyIds(surveyK3);
  const totalStikerK3 = countUniqueStikerIds(stikerK3);

  const rankings = calculateCcvRankings(ccv);
  const topObserver = rankings.length > 0 ? { nama: rankings[0].namaObserver, count: rankings[0].totalCcv } : null;

  const desaSudah = desaList.filter(d => d.status === 'SUDAH').length;
  const desaBelum = desaList.filter(d => d.status === 'BELUM').length;
  const persenSosialisasi = desaList.length > 0 ? Number(((desaSudah / desaList.length) * 100).toFixed(1)) : 0;

  return {
    surveyK3,
    stikerK3,
    ccv,
    desaList,
    summary: {
      totalSurveyK3,
      totalSurveyValidCoord: surveyK3.filter(s => s.hasValidCoordinate).length,
      totalStikerK3,
      totalStikerValidCoord: stikerK3.filter(s => s.hasValidCoordinate).length,
      totalCcv: ccv.length,
      topObserver,
      totalDesa: desaList.length,
      desaSudah,
      desaBelum,
      persenSosialisasi,
    },
  };
}

// ==========================================
// 8. EXCEL (.XLSX) / CSV WORKBOOK PARSER
// ==========================================
export async function parseExcelWorkbookK3L(file: File): Promise<K3LData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  let parsedSurveyK3: SurveyK3Item[] = [];
  let parsedStikerK3: StikerK3Item[] = [];
  let parsedCcv: CcvItem[] = [];
  let parsedSocializedDesas: any[] = [];
  let parsedMasterDesas: any[] = [];

  // Match sheet names flexibly (case-insensitive)
  const sheetMap: Record<string, string> = {};
  for (const sName of workbook.SheetNames) {
    const clean = sName.trim().toUpperCase();
    sheetMap[clean] = sName;
  }

  // 1. SUB-SECTION 1: "DATA SURVEY K3"
  const surveySheetName =
    sheetMap['DATA SURVEY K3'] ||
    sheetMap['SURVEY K3'] ||
    sheetMap['DATA SURVEY'] ||
    sheetMap['SURVEY TIANG'] ||
    sheetMap['SURVEY'];

  if (surveySheetName) {
    const sheet = workbook.Sheets[surveySheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let startRow = 1;
    let headers: string[] = [];

    if (rows.length > 0) {
      headers = (rows[0] || []).map(h => String(h || '').trim());
      const firstRowStr = headers.join(' ').toUpperCase();
      if (firstRowStr.includes('TIMESTAMP') || firstRowStr.includes('UNIT') || firstRowStr.includes('KOORDINAT') || firstRowStr.includes('ID')) {
        startRow = 1;
      }
    }

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.length === 0 || !row.some(cell => String(cell || '').trim())) continue;

      const idSurvey = extractIdSurvey(row, headers, parsedSurveyK3.length);
      const colK = String(row[10] || row[11] || '').trim();
      const jenisTiang = String(row[1] || row[2] || 'Tiang Beton').trim();
      const tinggiTiang = String(row[2] || row[3] || '12 Meter').trim();
      const potensiBahaya = String(row[4] || row[5] || 'Potensi Bahaya K3').trim();
      const penyulang = String(row[7] || row[8] || '').trim();
      const lokasi = String(row[8] || row[9] || '').trim();

      // Extract coordinates: check primary (index 6), secondary columns, separate Lat/Lng, and scan all row cells
      const coordResult = extractCoordinatesFromRow(row, headers, 6, -1, lokasi || penyulang || 'Sinjai');

      parsedSurveyK3.push({
        id: `srv-uploaded-${i}`,
        no: parsedSurveyK3.length + 1,
        idSurvey,
        unit: colK || 'ULP SINJAI',
        jenisTiang,
        tinggiTiang,
        potensiBahaya,
        koordinatRaw: coordResult.primaryRaw,
        koordinatLainRaw: coordResult.secondaryRaw,
        lat: coordResult.lat,
        lng: coordResult.lng,
        latLain: coordResult.latLain,
        lngLain: coordResult.lngLain,
        hasValidCoordinate: coordResult.hasValidCoordinate,
        penyulang: penyulang || undefined,
        lokasi: lokasi || undefined,
      });
    }
  }

  // 2. SUB-SECTION 2: "DATA STIKER K3"
  const stikerSheetName =
    sheetMap['DATA STIKER K3'] ||
    sheetMap['STIKER K3'] ||
    sheetMap['DATA STIKER'] ||
    sheetMap['DATA RAMBU'] ||
    sheetMap['STIKER & RAMBU'] ||
    sheetMap['STIKER'];

  if (stikerSheetName) {
    const sheet = workbook.Sheets[stikerSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let startRow = 1;
    let headers: string[] = [];

    if (rows.length > 0) {
      headers = (rows[0] || []).map(h => String(h || '').trim());
      const firstRowStr = headers.join(' ').toUpperCase();
      if (firstRowStr.includes('UNIT') || firstRowStr.includes('RAMBU') || firstRowStr.includes('KOORDINAT') || firstRowStr.includes('ID')) {
        startRow = 1;
      }
    }

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.length === 0 || !row.some(cell => String(cell || '').trim())) continue;

      const idStiker = extractIdStiker(row, headers, parsedStikerK3.length);
      const colC = String(row[2] || '').trim();
      const jenisRambu = String(row[0] || row[1] || 'Rambu Bahaya Listrik').trim();
      const potensiBahaya = String(row[4] || row[5] || 'Bahaya Sentuh Langsung').trim();
      const lokasi = String(row[1] || row[2] || '').trim();

      // Extract coordinates: check primary (index 3), secondary columns, and scan all row cells
      const coordResult = extractCoordinatesFromRow(row, headers, 3, -1, lokasi || 'Sinjai');

      parsedStikerK3.push({
        id: `stk-uploaded-${i}`,
        no: parsedStikerK3.length + 1,
        idStiker,
        unit: colC || 'ULP SINJAI',
        jenisRambu,
        potensiBahaya,
        koordinatRaw: coordResult.primaryRaw,
        koordinatLainRaw: coordResult.secondaryRaw,
        lat: coordResult.lat,
        lng: coordResult.lng,
        latLain: coordResult.latLain,
        lngLain: coordResult.lngLain,
        hasValidCoordinate: coordResult.hasValidCoordinate,
        lokasi: lokasi || undefined,
      });
    }
  }

  // 3. SUB-SECTION 3: "MONITORING CCV"
  let ccvSheetName =
    sheetMap['CCV'] ||
    sheetMap['MONITORING CCV'] ||
    sheetMap['DATA CCV'] ||
    sheetMap['445508288'] ||
    sheetMap['FORM RESPONSES 1'] ||
    sheetMap['RESPON FORM 1'];

  if (!ccvSheetName) {
    for (const sName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sName];
      const sample = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, range: 0 });
      const firstRow = (sample[0] || []).map(c => String(c || '').toUpperCase()).join(' ');
      if (firstRow.includes('OBSERVER') || firstRow.includes('CRITICAL') || firstRow.includes('CCV')) {
        ccvSheetName = sName;
        break;
      }
    }
  }

  if (ccvSheetName) {
    const sheet = workbook.Sheets[ccvSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let startRow = 1;
    let headers: string[] = [];

    if (rows.length > 0) {
      headers = (rows[0] || []).map(h => String(h || '').trim().toUpperCase());
      const headerStr = headers.join(' ');
      if (headerStr.includes('OBSERVER') || headerStr.includes('TIMESTAMP') || headerStr.includes('UNIT')) {
        startRow = 1;
      }
    }

    const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    const ulpIdx = findCol(['ULP', 'UNIT']);
    const observerIdx = findCol(['OBSERVER', 'NAMA OBSERVER', 'PENGINPUT', 'PENGAWAS']);
    const tanggalIdx = findCol(['TANGGAL', 'TIMESTAMP', 'WAKTU', 'DATE']);
    const lokasiIdx = findCol(['LOKASI', 'LOKASI PEKERJAAN', 'FEEDER', 'PENYULANG', 'GARDU']);
    const aktivitasIdx = findCol(['AKTIVITAS', 'PEKERJAAN', 'KEGIATAN']);
    const kepatuhanIdx = findCol(['KEPATUHAN', 'STATUS', 'PATUH', 'HASIL']);
    const catatanIdx = findCol(['CATATAN', 'TEMUAN', 'SARAN', 'KETERANGAN']);

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.length === 0 || !row.some(cell => String(cell || '').trim())) continue;

      const colH = ulpIdx !== -1 ? String(row[ulpIdx] || '').trim() : String(row[7] || '').trim();
      const colCName = observerIdx !== -1 ? String(row[observerIdx] || '').trim() : String(row[2] || 'Observer ULP Sinjai').trim();
      const tanggal = tanggalIdx !== -1 ? String(row[tanggalIdx] || '').trim() : String(row[0] || row[1] || '').trim();
      const lokasiPekerjaan = lokasiIdx !== -1 ? String(row[lokasiIdx] || '').trim() : String(row[3] || row[4] || '').trim();
      const aktivitasPekerjaan = aktivitasIdx !== -1 ? String(row[aktivitasIdx] || '').trim() : 'Inspeksi K3 Lapangan';
      const catatanObserver = catatanIdx !== -1 ? String(row[catatanIdx] || '').trim() : String(row[5] || row[6] || '').trim();
      
      const rawStatus = kepatuhanIdx !== -1 ? String(row[kepatuhanIdx] || '').trim().toUpperCase() : String(row[8] || '').toUpperCase();
      const statusKepatuhan: 'PATUH' | 'TIDAK PATUH' | 'PERLU PERBAIKAN' =
        rawStatus.includes('TIDAK') ? 'TIDAK PATUH' :
        rawStatus.includes('PERLU') || rawStatus.includes('PERBAIKAN') ? 'PERLU PERBAIKAN' : 'PATUH';

      parsedCcv.push({
        id: `ccv-uploaded-${i}`,
        no: parsedCcv.length + 1,
        ulp: colH || 'ULP SINJAI',
        namaObserver: colCName,
        tanggal: tanggal || undefined,
        lokasiPekerjaan: lokasiPekerjaan || undefined,
        aktivitasPekerjaan: aktivitasPekerjaan || undefined,
        catatanObserver: catatanObserver || undefined,
        statusKepatuhan,
        score: statusKepatuhan === 'PATUH' ? 100 : statusKepatuhan === 'PERLU PERBAIKAN' ? 85 : 70,
      });
    }
  }

  // 4. SUB-SECTION 4: "SOSIALISASI DESA" (GABUNGAN SHEET "DESA" & SHEET "DATA")
  const desaSheetName =
    sheetMap['DESA'] ||
    sheetMap['DATA DESA TERSEDIA'] ||
    sheetMap['DESA SOSIALISASI'] ||
    sheetMap['SOSIALISASI DESA'];

  if (desaSheetName) {
    const sheet = workbook.Sheets[desaSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const namaDesa = String(row[0] || row[1] || '').trim();
      if (!namaDesa) continue;
      parsedSocializedDesas.push({
        namaDesa,
        tanggal: String(row[2] || 'Tersosialisasi').trim(),
        lokasiKegiatan: String(row[3] || `Kantor Desa ${namaDesa}`).trim(),
        jumlahPeserta: parseInt(String(row[4] || '35'), 10) || 35,
        materi: String(row[5] || 'Bahaya Listrik & K3 Lingkungan').trim(),
        petugas: String(row[6] || 'Tim K3').trim(),
        status: String(row[7] || row[3] || '').trim(),
      });
    }
  }

  const masterDataSheetName =
    sheetMap['DATA'] ||
    sheetMap['DATA DESA'] ||
    sheetMap['MASTER DESA'] ||
    sheetMap['MASTER DATA'];

  if (masterDataSheetName) {
    const sheet = workbook.Sheets[masterDataSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const namaDesa = String(row[0] || row[1] || '').trim();
      const kecamatan = String(row[1] || row[2] || 'Sinjai').trim();
      const statusDesa = String(row[3] || '').trim();
      if (!namaDesa) continue;
      parsedMasterDesas.push({ namaDesa, kecamatan, status: statusDesa });
    }
  }

  // Fallbacks if some sheets were missing from the uploaded file
  const surveyK3 = parsedSurveyK3.length > 0 ? parsedSurveyK3 : DEFAULT_SURVEY_K3;
  const stikerK3 = parsedStikerK3.length > 0 ? parsedStikerK3 : DEFAULT_STIKER_K3;
  const ccv = parsedCcv.length > 0 ? parsedCcv : DEFAULT_CCV;

  // Merge combined data from Sheet "DESA" and Sheet "DATA"
  const desaList = mergeDesaData(parsedMasterDesas, parsedSocializedDesas, surveyK3);

  // Recalculate IDs and Village status
  const totalSurveyK3 = countUniqueSurveyIds(surveyK3);
  const totalStikerK3 = countUniqueStikerIds(stikerK3);
  const rankings = calculateCcvRankings(ccv);
  const topObserver = rankings.length > 0 ? { nama: rankings[0].namaObserver, count: rankings[0].totalCcv } : null;

  // Exact recalculation of surveyed vs unsurveyed villages
  const desaSudah = desaList.filter(d => d.status === 'SUDAH').length;
  const desaBelum = desaList.filter(d => d.status === 'BELUM').length;
  const persenSosialisasi = desaList.length > 0 ? Number(((desaSudah / desaList.length) * 100).toFixed(1)) : 0;

  const finalData: K3LData = {
    surveyK3,
    stikerK3,
    ccv,
    desaList,
    summary: {
      totalSurveyK3,
      totalSurveyValidCoord: surveyK3.filter(s => s.hasValidCoordinate).length,
      totalStikerK3,
      totalStikerValidCoord: stikerK3.filter(s => s.hasValidCoordinate).length,
      totalCcv: ccv.length,
      topObserver,
      totalDesa: desaList.length,
      desaSudah,
      desaBelum,
      persenSosialisasi,
    },
  };

  try {
    localStorage.setItem(K3L_STORAGE_KEY, JSON.stringify(finalData));
  } catch (e) {
    console.warn('Failed to save K3L to localStorage:', e);
  }

  return finalData;
}

export function resetK3LToDefault(): K3LData {
  try {
    localStorage.removeItem(K3L_STORAGE_KEY);
    localStorage.removeItem('pln_sinjai_k3l_custom_data_v2');
    localStorage.removeItem('pln_sinjai_k3l_custom_data_v1');
  } catch {}
  return getInitialK3LData();
}

/**
 * Parses raw CSV fetched from Google Sheets (GID 445508288) for Section K3
 */
// Helper to parse individual Survey K3 CSV
export function parseSurveyK3Csv(csvContent: string): SurveyK3Item[] {
  if (!csvContent || csvContent.trim().length === 0) return [];
  const parsed = Papa.parse<string[]>(csvContent, { header: false, skipEmptyLines: true });
  const rows = parsed.data || [];
  if (rows.length < 2) return [];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const rowStr = rows[i].join(' ').toUpperCase();
    if (rowStr.includes('TIANG') || rowStr.includes('BAHAYA') || rowStr.includes('SURVEY') || rowStr.includes('UNIT') || rowStr.includes('ID')) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = rows[headerRowIndex].map(h => (h || '').trim());
  const headers = rawHeaders.map(h => h.toUpperCase());
  const dataRows = rows.slice(headerRowIndex + 1);

  const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const unitIdx = findCol(['UNIT', 'ULP']);
  const coordIdx = findCol(['KOORDINAT', 'TITIK', 'LAT/LONG', 'LAT LONG', 'GPS']);
  const coordLainIdx = findCol(['KOORDINAT LAIN', 'TITIK LAIN', 'TITIK KOORDINAT LAIN', 'KOORDINAT 2', 'ALTERNATIF']);
  const tiangIdx = findCol(['JENIS TIANG', 'TIANG']);
  const tinggiIdx = findCol(['TINGGI', 'TINGGI TIANG']);
  const bahayaIdx = findCol(['POTENSI BAHAYA', 'BAHAYA', 'TEMUAN']);
  const penyulangIdx = findCol(['PENYULANG', 'FEEDER']);
  const lokasiIdx = findCol(['LOKASI', 'ALAMAT']);
  const tanggalIdx = findCol(['TANGGAL', 'TIMESTAMP', 'WAKTU']);

  const items: SurveyK3Item[] = [];
  dataRows.forEach((row, i) => {
    if (!row || row.length === 0 || !row.join('').trim()) return;
    const idSurvey = extractIdSurvey(row, rawHeaders, items.length);
    const unit = unitIdx !== -1 ? String(row[unitIdx] || '').trim() : 'ULP SINJAI';
    const jenisTiang = tiangIdx !== -1 ? String(row[tiangIdx] || '').trim() : String(row[1] || 'Tiang Beton').trim();
    const tinggiTiang = tinggiIdx !== -1 ? String(row[tinggiIdx] || '').trim() : String(row[2] || '12 Meter').trim();
    const potensiBahaya = bahayaIdx !== -1 ? String(row[bahayaIdx] || '').trim() : String(row[4] || 'Potensi Bahaya K3').trim();
    const penyulang = penyulangIdx !== -1 ? String(row[penyulangIdx] || '').trim() : String(row[7] || '').trim();
    const lokasi = lokasiIdx !== -1 ? String(row[lokasiIdx] || '').trim() : String(row[8] || '').trim();
    const tgl = tanggalIdx !== -1 ? String(row[tanggalIdx] || '').trim() : String(row[0] || '').trim();

    const coordResult = extractCoordinatesFromRow(row, rawHeaders, coordIdx, coordLainIdx, lokasi || penyulang || 'Sinjai');

    items.push({
      id: `srv-live-${i + 1}`,
      no: items.length + 1,
      idSurvey,
      unit: unit || 'ULP SINJAI',
      jenisTiang: jenisTiang || 'Tiang Beton',
      tinggiTiang: tinggiTiang || '12 Meter',
      potensiBahaya: potensiBahaya || 'Potensi Bahaya K3',
      koordinatRaw: coordResult.primaryRaw,
      koordinatLainRaw: coordResult.secondaryRaw,
      lat: coordResult.lat,
      lng: coordResult.lng,
      latLain: coordResult.latLain,
      lngLain: coordResult.lngLain,
      hasValidCoordinate: coordResult.hasValidCoordinate,
      penyulang: penyulang || undefined,
      lokasi: lokasi || undefined,
      tanggalSurvey: tgl || undefined,
    });
  });

  return items;
}

// Helper to parse individual Stiker K3 CSV
export function parseStikerK3Csv(csvContent: string): StikerK3Item[] {
  if (!csvContent || csvContent.trim().length === 0) return [];
  const parsed = Papa.parse<string[]>(csvContent, { header: false, skipEmptyLines: true });
  const rows = parsed.data || [];
  if (rows.length < 2) return [];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const rowStr = rows[i].join(' ').toUpperCase();
    if (rowStr.includes('STIKER') || rowStr.includes('RAMBU') || rowStr.includes('UNIT') || rowStr.includes('KOORDINAT') || rowStr.includes('ID')) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = rows[headerRowIndex].map(h => (h || '').trim());
  const headers = rawHeaders.map(h => h.toUpperCase());
  const dataRows = rows.slice(headerRowIndex + 1);

  const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const unitIdx = findCol(['UNIT', 'ULP']);
  const coordIdx = findCol(['KOORDINAT', 'TITIK', 'LAT/LONG', 'LAT LONG', 'GPS']);
  const coordLainIdx = findCol(['KOORDINAT LAIN', 'TITIK LAIN', 'TITIK KOORDINAT LAIN', 'KOORDINAT 2', 'ALTERNATIF']);
  const rambuIdx = findCol(['JENIS RAMBU', 'RAMBU', 'STIKER', 'JENIS STIKER']);
  const bahayaIdx = findCol(['POTENSI BAHAYA', 'BAHAYA', 'KETERANGAN']);
  const lokasiIdx = findCol(['LOKASI', 'ALAMAT']);
  const kondisiIdx = findCol(['KONDISI', 'KONDISI RAMBU']);
  const tanggalIdx = findCol(['TANGGAL', 'TANGGAL PASANG', 'WAKTU']);
  const petugasIdx = findCol(['PETUGAS', 'SURVEYOR', 'TIM']);

  const items: StikerK3Item[] = [];
  dataRows.forEach((row, i) => {
    if (!row || row.length === 0 || !row.join('').trim()) return;
    const idStiker = extractIdStiker(row, rawHeaders, items.length);
    const unit = unitIdx !== -1 ? String(row[unitIdx] || '').trim() : 'ULP SINJAI';
    const jenisRambu = rambuIdx !== -1 ? String(row[rambuIdx] || '').trim() : String(row[1] || 'Rambu Bahaya Listrik').trim();
    const potensiBahaya = bahayaIdx !== -1 ? String(row[bahayaIdx] || '').trim() : String(row[2] || 'Awas Tegangan Tinggi').trim();
    const lokasi = lokasiIdx !== -1 ? String(row[lokasiIdx] || '').trim() : String(row[5] || '').trim();
    const kondisi = kondisiIdx !== -1 ? String(row[kondisiIdx] || '').trim() : 'Baik Terpasang';
    const tgl = tanggalIdx !== -1 ? String(row[tanggalIdx] || '').trim() : '';
    const petugas = petugasIdx !== -1 ? String(row[petugasIdx] || '').trim() : 'Tim K3 Sinjai';

    const coordResult = extractCoordinatesFromRow(row, rawHeaders, coordIdx, coordLainIdx, lokasi || 'Sinjai');

    items.push({
      id: `stk-live-${i + 1}`,
      no: items.length + 1,
      idStiker,
      unit: unit || 'ULP SINJAI',
      jenisRambu: jenisRambu || 'Rambu Bahaya Listrik',
      potensiBahaya: potensiBahaya || 'Awas Tegangan Tinggi',
      koordinatRaw: coordResult.primaryRaw,
      koordinatLainRaw: coordResult.secondaryRaw,
      lat: coordResult.lat,
      lng: coordResult.lng,
      latLain: coordResult.latLain,
      lngLain: coordResult.lngLain,
      hasValidCoordinate: coordResult.hasValidCoordinate,
      lokasi: lokasi || undefined,
      kondisiRambu: kondisi || undefined,
      tanggalPasang: tgl || undefined,
      petugas: petugas || undefined,
    });
  });

  return items;
}

// Helper to parse individual CCV CSV
export function parseCcvCsv(csvContent: string): CcvItem[] {
  if (!csvContent || csvContent.trim().length === 0) return [];
  const parsed = Papa.parse<string[]>(csvContent, { header: false, skipEmptyLines: true });
  const rows = parsed.data || [];
  if (rows.length < 2) return [];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const rowStr = rows[i].join(' ').toUpperCase();
    if (rowStr.includes('OBSERVER') || rowStr.includes('CCV') || rowStr.includes('KEPATUHAN') || rowStr.includes('ULP')) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rows[headerRowIndex].map(h => (h || '').trim().toUpperCase());
  const dataRows = rows.slice(headerRowIndex + 1);

  const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const ulpIdx = findCol(['ULP', 'UNIT']);
  const observerIdx = findCol(['OBSERVER', 'NAMA OBSERVER', 'PENGAWAS']);
  const tanggalIdx = findCol(['TANGGAL', 'TIMESTAMP', 'WAKTU']);
  const lokasiIdx = findCol(['LOKASI', 'LOKASI PEKERJAAN']);
  const aktivitasIdx = findCol(['AKTIVITAS', 'PEKERJAAN', 'KEGIATAN']);
  const kepatuhanIdx = findCol(['KEPATUHAN', 'STATUS KEPATUHAN', 'PATUH']);
  const apdIdx = findCol(['APD', 'KEPATUHAN APD']);
  const criticalIdx = findCol(['CRITICAL', 'CRITICAL CONTROL', 'KONTROL']);
  const catatanIdx = findCol(['CATATAN', 'TEMUAN', 'SARAN', 'KETERANGAN']);

  const items: CcvItem[] = [];
  dataRows.forEach((row, i) => {
    if (!row || row.length === 0 || !row.join('').trim()) return;
    const ulp = ulpIdx !== -1 ? String(row[ulpIdx] || '').trim() : 'ULP SINJAI';

    const namaObserver = observerIdx !== -1 ? String(row[observerIdx] || '').trim() : String(row[2] || 'Observer ULP Sinjai').trim();
    const tgl = tanggalIdx !== -1 ? String(row[tanggalIdx] || '').trim() : String(row[1] || '').trim();
    const lokasi = lokasiIdx !== -1 ? String(row[lokasiIdx] || '').trim() : String(row[3] || '').trim();
    const aktivitas = aktivitasIdx !== -1 ? String(row[aktivitasIdx] || '').trim() : String(row[4] || 'Inspeksi K3 Lapangan').trim();
    const kepatuhanStr = kepatuhanIdx !== -1 ? String(row[kepatuhanIdx] || '').trim().toUpperCase() : 'PATUH';
    const statusKepatuhan: 'PATUH' | 'TIDAK PATUH' | 'PERLU PERBAIKAN' = 
      kepatuhanStr.includes('TIDAK') ? 'TIDAK PATUH' :
      kepatuhanStr.includes('PERLU') || kepatuhanStr.includes('PERBAIKAN') ? 'PERLU PERBAIKAN' : 'PATUH';
    const apd = apdIdx !== -1 ? String(row[apdIdx] || '').trim() : 'Lengkap';
    const critical = criticalIdx !== -1 ? String(row[criticalIdx] || '').trim() : 'Terpenuhi';
    const catatan = catatanIdx !== -1 ? String(row[catatanIdx] || '').trim() : '';

    items.push({
      id: `ccv-live-${i + 1}`,
      no: items.length + 1,
      ulp: ulp || 'ULP SINJAI',
      namaObserver: namaObserver || 'Observer ULP Sinjai',
      tanggal: tgl || undefined,
      lokasiPekerjaan: lokasi || undefined,
      aktivitasPekerjaan: aktivitas || undefined,
      kepatuhanApd: apd,
      criticalControl: critical,
      catatanObserver: catatan || undefined,
      statusKepatuhan,
      score: statusKepatuhan === 'PATUH' ? 100 : statusKepatuhan === 'PERLU PERBAIKAN' ? 85 : 70,
    });
  });

  return items;
}

export function parseCsvK3L(csvContent: string): K3LData {
  if (!csvContent || csvContent.trim().length === 0) {
    return getInitialK3LData();
  }

  const parsed = Papa.parse<string[]>(csvContent, { header: false, skipEmptyLines: true });
  const rows = parsed.data || [];
  if (rows.length < 2) {
    return getInitialK3LData();
  }

  // Detect if the CSV is a dedicated CCV export (e.g., GID 445508288 or Form Responses)
  const sampleText = rows.slice(0, 15).map(r => r.join(' ').toUpperCase()).join(' ');
  const isDedicatedCcv = (
    (sampleText.includes('OBSERVER') || sampleText.includes('CRITICAL CONTROL') || sampleText.includes('CCV') || sampleText.includes('STATUS KEPATUHAN')) &&
    !sampleText.includes('JENIS TIANG') &&
    !sampleText.includes('JENIS RAMBU')
  );

  if (isDedicatedCcv) {
    const ccvOnly = parseCcvCsv(csvContent);
    if (ccvOnly.length > 0) {
      const initial = getInitialK3LData();
      const rankings = calculateCcvRankings(ccvOnly);
      const topObserver = rankings.length > 0 ? { nama: rankings[0].namaObserver, count: rankings[0].totalCcv } : null;
      return {
        ...initial,
        ccv: ccvOnly,
        summary: {
          ...initial.summary,
          totalCcv: ccvOnly.length,
          topObserver,
        },
      };
    }
  }

  const parsedSurveyK3: SurveyK3Item[] = [];
  const parsedStikerK3: StikerK3Item[] = [];
  const parsedCcv: CcvItem[] = [];
  const parsedDesa: { namaDesa: string; kecamatan: string; status: 'SUDAH' | 'BELUM'; tanggal?: string }[] = [];

  // Track active section when parsing unified multi-section sheets
  let currentSection: 'AUTO' | 'SURVEY' | 'STIKER' | 'CCV' | 'DESA' = 'AUTO';
  let sectionHeaderRow: string[] | null = null;

  // Scan rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.length === 0) continue;
    const rowText = row.join(' ').trim();
    if (!rowText) continue;
    const upperText = rowText.toUpperCase();

    // Check for Section Divider / Title Row
    if (upperText.includes('DATA SURVEY K3') || upperText.includes('SURVEY K3') || upperText.includes('SURVEY TIANG')) {
      currentSection = 'SURVEY';
      sectionHeaderRow = null;
      continue;
    }
    if (upperText.includes('DATA STIKER K3') || upperText.includes('STIKER K3') || upperText.includes('RAMBU K3') || upperText.includes('PASANG STIKER')) {
      currentSection = 'STIKER';
      sectionHeaderRow = null;
      continue;
    }
    if (upperText.includes('MONITORING CCV') || upperText.includes('DATA CCV') || upperText.includes('CONTROL OBSERVATION') || upperText.includes('OBSERVER')) {
      currentSection = 'CCV';
      sectionHeaderRow = null;
      continue;
    }
    if (upperText.includes('SOSIALISASI DESA') || upperText.includes('DATA DESA') || upperText.includes('KECAMATAN SINJAI')) {
      currentSection = 'DESA';
      sectionHeaderRow = null;
      continue;
    }

    // Check if this row is a column header row
    if (
      upperText.includes('JENIS TIANG') ||
      upperText.includes('JENIS RAMBU') ||
      upperText.includes('NAMA OBSERVER') ||
      upperText.includes('NAMA DESA') ||
      upperText.includes('KOORDINAT') ||
      upperText.includes('POTENSI BAHAYA')
    ) {
      sectionHeaderRow = row.map(h => (h || '').trim().toUpperCase());
      if (upperText.includes('JENIS TIANG')) currentSection = 'SURVEY';
      else if (upperText.includes('JENIS RAMBU') || upperText.includes('STIKER')) currentSection = 'STIKER';
      else if (upperText.includes('OBSERVER') || upperText.includes('CCV')) currentSection = 'CCV';
      else if (upperText.includes('DESA')) currentSection = 'DESA';
      continue;
    }

    // Determine row classification
    const formTypeCol = row.find(c => {
      const u = String(c || '').toUpperCase();
      return u.includes('SURVEY') || u.includes('STIKER') || u.includes('CCV') || u.includes('DESA');
    });
    const formType = formTypeCol ? String(formTypeCol).toUpperCase() : '';

    let rowTarget = currentSection;
    if (formType.includes('STIKER') || formType.includes('RAMBU')) {
      rowTarget = 'STIKER';
    } else if (formType.includes('CCV') || formType.includes('OBSERVER')) {
      rowTarget = 'CCV';
    } else if (formType.includes('DESA')) {
      rowTarget = 'DESA';
    } else if (formType.includes('SURVEY')) {
      rowTarget = 'SURVEY';
    }

    // If still AUTO, detect by content patterns
    if (rowTarget === 'AUTO') {
      if (upperText.includes('STIKER') || upperText.includes('RAMBU')) {
        rowTarget = 'STIKER';
      } else if (upperText.includes('OBSERVER') || upperText.includes('KEPATUHAN') || upperText.includes('SAFETY') || upperText.includes('CCV')) {
        rowTarget = 'CCV';
      } else if (upperText.includes('KECAMATAN') || upperText.includes('KELURAHAN') || upperText.includes('DESA')) {
        rowTarget = 'DESA';
      } else {
        // Default to Survey if it has coordinates or pole data
        rowTarget = 'SURVEY';
      }
    }

    // Extract fields based on target
    if (rowTarget === 'SURVEY') {
      const idSurvey = extractIdSurvey(row, undefined, parsedSurveyK3.length);
      const unit = String(row[10] || row[2] || row[0] || 'ULP SINJAI').trim();
      const jenisTiang = String(row[1] || 'Tiang Beton').trim();
      const tinggiTiang = String(row[2] || '12 Meter').trim();
      const potensiBahaya = String(row[4] || row[5] || 'Potensi Bahaya K3').trim();
      const penyulang = String(row[7] || '').trim();
      const lokasi = String(row[8] || '').trim();
      const tgl = String(row[0] || '').trim();

      const coordResult = extractCoordinatesFromRow(row, undefined, 6, -1, lokasi || penyulang || 'Sinjai');

      parsedSurveyK3.push({
        id: `srv-live-${i + 1}`,
        no: parsedSurveyK3.length + 1,
        idSurvey,
        unit: unit || 'ULP SINJAI',
        jenisTiang,
        tinggiTiang,
        potensiBahaya,
        koordinatRaw: coordResult.primaryRaw,
        koordinatLainRaw: coordResult.secondaryRaw,
        lat: coordResult.lat,
        lng: coordResult.lng,
        latLain: coordResult.latLain,
        lngLain: coordResult.lngLain,
        hasValidCoordinate: coordResult.hasValidCoordinate,
        penyulang: penyulang || undefined,
        lokasi: lokasi || undefined,
        tanggalSurvey: tgl || undefined,
      });
    } else if (rowTarget === 'STIKER') {
      const idStiker = extractIdStiker(row, undefined, parsedStikerK3.length);
      const unit = String(row[2] || row[0] || 'ULP SINJAI').trim();
      const jenisRambu = String(row[1] || 'Rambu Bahaya Listrik').trim();
      const potensiBahaya = String(row[2] || 'Awas Tegangan Tinggi').trim();
      const lokasi = String(row[5] || row[4] || '').trim();
      const kondisi = String(row[6] || 'Baik Terpasang').trim();
      const tgl = String(row[0] || '').trim();
      const petugas = String(row[7] || 'Tim K3 Sinjai').trim();

      const coordResult = extractCoordinatesFromRow(row, undefined, 3, -1, lokasi || 'Sinjai');

      parsedStikerK3.push({
        id: `stk-live-${i + 1}`,
        no: parsedStikerK3.length + 1,
        idStiker,
        unit: unit || 'ULP SINJAI',
        jenisRambu,
        potensiBahaya,
        koordinatRaw: coordResult.primaryRaw,
        koordinatLainRaw: coordResult.secondaryRaw,
        lat: coordResult.lat,
        lng: coordResult.lng,
        latLain: coordResult.latLain,
        lngLain: coordResult.lngLain,
        hasValidCoordinate: coordResult.hasValidCoordinate,
        lokasi: lokasi || undefined,
        kondisiRambu: kondisi || undefined,
        tanggalPasang: tgl || undefined,
        petugas: petugas || undefined,
      });
    } else if (rowTarget === 'CCV') {
      const unit = String(row[7] || row[1] || 'ULP SINJAI').trim();
      const namaObserver = String(row[2] || row[1] || 'Observer ULP Sinjai').trim();
      const kepatuhanStr = upperText.includes('TIDAK PATUH') ? 'TIDAK PATUH' : 'PATUH';

      parsedCcv.push({
        id: `ccv-live-${i + 1}`,
        no: parsedCcv.length + 1,
        ulp: unit || 'ULP SINJAI',
        namaObserver: namaObserver || 'Observer ULP Sinjai',
        tanggal: String(row[0] || '').trim() || undefined,
        lokasiPekerjaan: String(row[3] || '').trim() || undefined,
        aktivitasPekerjaan: String(row[4] || 'Inspeksi K3 Lapangan').trim() || undefined,
        kepatuhanApd: 'Lengkap Standar',
        criticalControl: 'Terkendali',
        catatanObserver: String(row[5] || '').trim() || undefined,
        statusKepatuhan: kepatuhanStr,
        score: kepatuhanStr === 'PATUH' ? 100 : 70,
      });
    } else if (rowTarget === 'DESA') {
      const namaDesa = String(row[0] || row[1] || '').trim();
      const kec = String(row[1] || row[2] || 'Sinjai').trim();
      const isSudah = upperText.includes('SUDAH');
      if (namaDesa) {
        parsedDesa.push({
          namaDesa,
          kecamatan: kec,
          status: isSudah ? 'SUDAH' : 'BELUM',
          tanggal: String(row[3] || '').trim() || undefined,
        });
      }
    }
  }

  const baseDefaults = getInitialK3LData();
  const surveyK3 = parsedSurveyK3.length > 0 ? parsedSurveyK3 : baseDefaults.surveyK3;
  const stikerK3 = parsedStikerK3.length > 0 ? parsedStikerK3 : baseDefaults.stikerK3;
  const ccv = parsedCcv.length > 0 ? parsedCcv : baseDefaults.ccv;

  const desaList = parsedDesa.length > 0
    ? mergeDesaData(MASTER_DESA_SINJAI, parsedDesa, surveyK3)
    : baseDefaults.desaList;

  const totalSurveyK3 = countUniqueSurveyIds(surveyK3);
  const totalStikerK3 = countUniqueStikerIds(stikerK3);
  const rankings = calculateCcvRankings(ccv);
  const topObserver = rankings.length > 0 ? { nama: rankings[0].namaObserver, count: rankings[0].totalCcv } : null;
  const desaSudah = desaList.filter(d => d.status === 'SUDAH').length;
  const desaBelum = desaList.filter(d => d.status === 'BELUM').length;
  const persenSosialisasi = desaList.length > 0 ? Number(((desaSudah / desaList.length) * 100).toFixed(1)) : 0;

  const finalData: K3LData = {
    surveyK3,
    stikerK3,
    ccv,
    desaList,
    summary: {
      totalSurveyK3,
      totalSurveyValidCoord: surveyK3.filter(s => s.hasValidCoordinate).length,
      totalStikerK3,
      totalStikerValidCoord: stikerK3.filter(s => s.hasValidCoordinate).length,
      totalCcv: ccv.length,
      topObserver,
      totalDesa: desaList.length,
      desaSudah,
      desaBelum,
      persenSosialisasi,
    },
  };

  try {
    localStorage.setItem(K3L_STORAGE_KEY, JSON.stringify(finalData));
  } catch (e) {
    console.warn('Failed to save live parsed K3L data:', e);
  }

  return finalData;
}

