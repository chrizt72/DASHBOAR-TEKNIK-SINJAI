import Papa from 'papaparse';
import { GangguanItem, GarduItem, RowItem, PengaduanItem, AsetItem, KandangAyamItem, MaterialItem, K3LData } from '../types';
import { parseCoordinate } from '../utils/coordinateParser';
import { detectMaterialCategory, getInitialMaterialData, parseCsvMaterial, saveMaterialData } from './materialService';
import { parseCsvK3L, getInitialK3LData } from './k3lService';

export const DEFAULT_SHEET_GIDS = {
  GGN_JTM: '346145252',           // REKAP GGN JTM
  MASTER_GARDU: '1618656994',     // MASTER GARDU
  LAPORAN_ROW: '27601002',        // LAPORAN_ROW_HARIAN
  PENGADUAN_INDIVIDU: '1994127869', // PENGADUAN INDIVIDU
  DATA_ASET: '1321978908',        // DATA ASET JTM
  KANDANG_AYAM: '1552602706',      // PETA KANDANG AYAM
  MONITORING_MATERIAL: '1993230416', // Section Monitoring Material
  K3: '445508288',                // Section K3
  PENGUKURAN_MAIP: '718819836',    // PENGUKURAN MAIP UP3
  FL_DASHBOARD: '996919191',       // FL DASHBOARD
  FORM_RESPONSES: '1245736398',   // Form_Responses_1
};

export function getActiveGids(): Record<string, string> {
  try {
    const saved = localStorage.getItem('pln_custom_sheet_gids');
    if (saved) {
      return { ...DEFAULT_SHEET_GIDS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...DEFAULT_SHEET_GIDS };
}

export function saveActiveGids(gids: Record<string, string>): void {
  try {
    localStorage.setItem('pln_custom_sheet_gids', JSON.stringify(gids));
  } catch (e) {
    console.warn('Failed to save custom GIDs', e);
  }
}

export function resetGidsToDefault(): void {
  try {
    localStorage.removeItem('pln_custom_sheet_gids');
  } catch (e) {
    console.warn('Failed to reset custom GIDs', e);
  }
}

export const SHEET_GIDS = getActiveGids();

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR47zCs1WFP_fsT5O1ml8MtmEo9AmBHTh7Q8Bnquyldge1DgUXHEHJJ-NL57JbWFuv7QdzV5z736gUh/pub';

export interface AllDashboardData {
  gangguan: GangguanItem[];
  gardu: GarduItem[];
  rowHarian: RowItem[];
  pengaduan: PengaduanItem[];
  aset: AsetItem[];
  kandangAyam: KandangAyamItem[];
  material: MaterialItem[];
  k3: K3LData;
  lastUpdated: Date;
  summary: {
    totalKmsAset: number;
    totalGardu: number;
    totalTebangPohon: number;
    totalPerampalanPohon: number;
    totalKmsInspeksi: number;
    totalTrip1Tahun: number;
    totalGangguanPermanen: number;
    totalGangguanTemporer: number;
    totalGarduOverload: number;
    totalGarduUnderload: number;
    totalGarduNormal: number;
    totalWoPengaduan: number;
    totalAutoDispatch: number;
    totalManualDispatch: number;
    totalKandangAyam: number;
    totalKandangValidCoord: number;
  };
}

export function parseIndoNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/['"\s]/g, '');
  if (!str || str === '#REF!' || str === '-' || str === 'NaN') return 0;
  // Replace comma decimal with dot
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

export function parseDate(dateStr: string): Date | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;
  const clean = dateStr.trim();

  // Try standard DD/MM/YYYY or DD/MM/YY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // Try ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  const timestamp = Date.parse(clean);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }
  return undefined;
}

export function normalizeGoogleSheetUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  const clean = rawUrl.trim();

  // If already a direct CSV export / pub URL
  if (clean.includes('output=csv') || clean.includes('format=csv')) {
    return clean;
  }

  // Format 1: https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID} or /edit?gid={GID}
  const editMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*gid=([0-9]+)/);
  if (editMatch) {
    const sheetId = editMatch[1];
    const gid = editMatch[2];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  // Format 2: https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pubhtml?gid={GID}
  const pubMatch = clean.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pubhtml.*gid=([0-9]+)/);
  if (pubMatch) {
    const pubId = pubMatch[1];
    const gid = pubMatch[2];
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`;
  }

  // Format 3: https://docs.google.com/spreadsheets/d/{ID}/... without gid
  const idOnlyMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idOnlyMatch) {
    const sheetId = idOnlyMatch[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  return clean;
}

export async function fetchCsvWithTimeout(
  url: string,
  timeoutMs: number = 25000,
  maxRetries: number = 2,
  bypassCache: boolean = false
): Promise<string> {
  let lastError: any = null;
  const requestUrl = bypassCache
    ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : url;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timerId = setTimeout(() => {
      try {
        controller.abort(new DOMException(`Timeout after ${timeoutMs}ms`, 'AbortError'));
      } catch {
        controller.abort();
      }
    }, timeoutMs);

    try {
      const res = await fetch(requestUrl, {
        signal: controller.signal,
        cache: bypassCache ? 'no-store' : 'default',
        headers: bypassCache
          ? {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            }
          : undefined,
      });
      clearTimeout(timerId);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const text = await res.text();
      const trimmed = text.trim();
      // Detect if Google returned an HTML error/login page instead of real CSV
      if (
        trimmed.startsWith('<!DOCTYPE') ||
        trimmed.startsWith('<html') ||
        trimmed.includes('Sorry, unable to open the file') ||
        trimmed.includes('Google Docs') ||
        trimmed.includes('<body')
      ) {
        throw new Error(`Google Sheets mengembalikan halaman HTML/Error bukan data CSV (${trimmed.slice(0, 80)}...)`);
      }
      return text;
    } catch (err: any) {
      clearTimeout(timerId);
      lastError = err;
      // If retries left and not manually aborted by user
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  // Resilient fallback for Google Sheets via CORS proxy if direct fetch was blocked
  if (url.includes('docs.google.com') || url.includes('google.com')) {
    const proxies = [
      `https://corsproxy.io/?url=${encodeURIComponent(requestUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(requestUrl)}`,
    ];
    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 12000);
        const pRes = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(tId);
        if (pRes.ok) {
          const pText = await pRes.text();
          const pTrim = pText.trim();
          if (
            pTrim.length > 50 &&
            !pTrim.startsWith('<!DOCTYPE') &&
            !pTrim.startsWith('<html') &&
            !pTrim.includes('Sorry, unable to open')
          ) {
            return pText;
          }
        }
      } catch {
        // continue to next proxy
      }
    }
  }

  throw lastError || new Error(`Failed to fetch from ${url}`);
}

export async function fetchWithStorageFallback(key: string, url: string, bypassCache: boolean = false): Promise<string> {
  const STORAGE_KEY = `pln_raw_csv_${key}`;
  try {
    const csv = await fetchCsvWithTimeout(url, 25000, 2, bypassCache);
    if (csv && csv.trim().length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, csv);
      } catch {
        // ignore localStorage quota errors
      }
      return csv;
    }
  } catch (err) {
    console.warn(`Fetch ${key} error, trying cached raw data:`, err);
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (
        cached &&
        cached.trim().length > 0 &&
        !cached.startsWith('<!DOCTYPE') &&
        !cached.startsWith('<html') &&
        !cached.includes('Sorry, unable to open') &&
        !cached.includes('Google Docs')
      ) {
        return cached;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

export const LAP_HAR_BULANAN_RAW_CSV = `TANGGAL ,PENYULANG,ZONA PROTEKSI,SECTION 1,SECTION 2,DETAIL PEKERJAAN,SATUAN,VOLUME ROW,VOLUME TEKNIK,KOORDINAT TITIK AWAL,KOORIDINAT TITIK AKHIR,REAL RAMPAL SECT 1,REAL RAMPAL SECT 2,REAL TBG SECT 1,REAL TBG SECT 2
6/2/2026,P_BULUPODDO,REC_BULUPODDO,SECT_SAHARU,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"11,00",,"-5.101943,120.156645","-5.100587,120.146968",,0,11,
6/2/2026,P_BULUPODDO,REC_BULUPODDO,SECT_SAHARU,,Pekerjaan perampalan pohon,kms,"1,80",,"-5.101943,120.156645","-5.100587,120.146968","1,8",,,
6/2/2026,P_BULUPODDO,REC_BULUPODDO,SECT_SAHARU,,Perbaikan penghantar terburai,titik,"0,00","2,00","-5.101943,120.156645","-5.100587,120.146968",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Perbaikan penghantar terburai,titik,"0,00","3,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan isolator tumpu 20 kV,buah,"0,00","9,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Perbaikan posisi travers tunggal miring,set,"0,00","3,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pengencangan (perbaikan andongan),gawang,"0,00","8,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan joint sleeve,buah,"0,00","5,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/3/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pembongkaran isolator aspan 20 kV,set,"0,00","9,00","-5.117166, 120.262695","-5.100629, 120.14659",,,,
6/4/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00",,"-5.381136, 120.1663","-5.38121, 120.16623","3,8",,3,
6/4/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"2,00",,"-5.381136, 120.1663","-5.38121, 120.16623",2,,,
6/4/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Perbaikan penghantar terburai,titik,"0,00","1,00","-5.381136, 120.1663","-5.38121, 120.16623",,,,
6/6/2026,P_LITHA,REC_TONDONG,REC_TONDONG,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"11,00",,"-5.15144, 120.2207","-5.16133, 120.22729","2,6",,11,
6/6/2026,P_LITHA,REC_TONDONG,REC_TONDONG,,Pekerjaan perampalan pohon,kms,"2,60",,"-5.15144, 120.2207","-5.16133, 120.22729","2,6",,,
6/8/2026,P_MATUMPU,REC_MARANA,CO_TURUNENG,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"10,00",,"-5.117119, 120.26244","-5.263081, 120.27874",,,10,
6/8/2026,P_MATUMPU,REC_MARANA,CO_TURUNENG,,Pekerjaan perampalan pohon,kms,"15,00",,"-5.117119, 120.26244","-5.263081, 120.27874",15,,,
6/9/2026,P_MATUMPU,GH SINJAI OUT_MANGARABOMBANG,GH SINJAI OUT_MANGARABOMBANG,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00",,"-5.117172, 120.26245","-5.12051, 120.24774","3,3",,3,
6/9/2026,P_MATUMPU,GH SINJAI OUT_MANGARABOMBANG,GH SINJAI OUT_MANGARABOMBANG,,Pekerjaan perampalan pohon,kms,"0,00",,"-5.117172, 120.26245","-5.12051, 120.24774",,,,
6/10/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"15,00",,"-5.345602, 120.028885","-5.343641, 120.02585",,,15,
6/10/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"3,90",,"-5.345602, 120.028885","-5.343641, 120.02585","3,9",,,
6/11/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"15,00",,"-5.396002, 120.08243","-5.39599, 120.08237",,,15,
6/11/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"2,70",,"-5.396002, 120.08243","-5.39599, 120.08237","2,7",,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pekerjaan perampalan pohon,kms,"0,20",,"-5.168757°,120.151018°","-5.168757°,120.151018°","0,2",,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Menegakkan tiang beton yang miring,batang,"0,00","2,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Perbaikan tupang tarik,buah,"0,00","3,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pembongkaran isolator aspan 20 kV,set,"0,00","2,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan isolator aspan 20 kV,buah,"0,00","6,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan isolator tumpu 20 kV,buah,"0,00","9,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pengencangan (perbaikan andongan),gawang,"0,00","4,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan joint sleeve,buah,"0,00","8,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/12/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,"Pengencangan baut-baut sambungan ( Konector, skun, terminal, dll )",buah,"0,00","2,00","-5.168757°,120.151018°","-5.168757°,120.151018°",,,,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"7,00",,"-5.097787, 120.15579","-5.100263, 120.157455",,,7,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,Pekerjaan perampalan pohon,kms,"0,50",,"-5.097787, 120.15579","-5.100263, 120.157455","0,5",,,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,Menegakkan tiang beton yang miring,batang,"0,00","2,00","-5.097787, 120.15579","-5.100263, 120.157455",,,,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","9,00","-5.097787, 120.15579","-5.100263, 120.157455",,,,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,Pengencangan (perbaikan andongan),gawang,"0,00","5,00","-5.097787, 120.15579","-5.100263, 120.157455",,,,
6/13/2026,P_BULUPODDO,REC_BULUPODDO,CO_BARANG,,"Pengencangan baut-baut sambungan ( Konector, skun, terminal, dll )",buah,"0,00","1,00","-5.097787, 120.15579","-5.100263, 120.157455",,,,
6/15/2026,P_LEPPAKOMAI,P_LEPPAKOMAI,P_LEPPAKOMAI,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","3,00","-5.273428, 120.16186","-5.273386, 120.161835",,,,
6/15/2026,P_LEPPAKOMAI,P_LEPPAKOMAI,P_LEPPAKOMAI,,Pemasangan isolator tumpu 20 kV,buah,"0,00","3,00","-5.273428, 120.16186","-5.273386, 120.161835",,,,
6/15/2026,P_HARUE,REC_BALANGPESOANG,REC_BALANGPESOANG,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","3,00","-5.273428, 120.16186","-5.273386, 120.161835",,,,
6/15/2026,P_HARUE,REC_BALANGPESOANG,REC_BALANGPESOANG,,Pemasangan isolator tumpu 20 kV,buah,"0,00","3,00","-5.273428, 120.16186","-5.273386, 120.161835",,,,
6/16/2026,P_HARUE,REC_KALOBBA,CO_TORIBI,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","6,00","-5.182044, 120.2112","-5.182048, 120.21116",,,,
6/16/2026,P_HARUE,REC_KALOBBA,CO_TORIBI,,Pemasangan isolator tumpu 20 kV,buah,"0,00","6,00","-5.182044, 120.2112","-5.182048, 120.21116",,,,
6/16/2026,P_HARUE,REC_KALOBBA,CO_TORIBI,,Pengencangan (perbaikan andongan),gawang,"0,00","4,00","-5.182044, 120.2112","-5.182048, 120.21116",,,,
6/16/2026,P_HARUE,REC_KALOBBA,CO_TORIBI,,Pemasangan joint sleeve,buah,"0,00","2,00","-5.182044, 120.2112","-5.182048, 120.21116",,,,
6/16/2026,P_LITHA,REC_TONDONG,LBS_PAKITTA,,Pemasangan isolator tumpu 20 kV,buah,"0,00","6,00","-5.168571°,120.228646°","-5.168571°,120.228646°",,,,
6/16/2026,P_LITHA,REC_TONDONG,LBS_PAKITTA,,Pengencangan (perbaikan andongan),gawang,"0,00","8,00","-5.168571°,120.228646°","-5.168571°,120.228646°",,,,
6/16/2026,P_LITHA,REC_TONDONG,LBS_PAKITTA,,Menegakkan tiang beton yang miring,batang,"0,00","3,00","-5.168571°,120.228646°","-5.168571°,120.228646°",,,,
6/17/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"13,00",,"-5.405812, 120.359635","-5.405812, 120.359635",,,13,
6/17/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"2,00",,"-5.405812, 120.359635","-5.405812, 120.359635",2,,,
6/18/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"13,00",,"-5.405812, 120.359635","-5.405812, 120.359635",,,13,
6/20/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"11,00",,"-5.209904, 120.079903","-5.227638, 120.064176",,,11,
6/20/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pekerjaan perampalan pohon,kms,"0,50",," -5.240917°,120.242200°"," -5.240917°,120.242200°","0,5",,,
6/20/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pengencangan (perbaikan andongan),gawang,"0,00","1,00"," -5.240917°,120.242200°"," -5.240917°,120.242200°",,,,
6/20/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pemasangan isolator tumpu 20 kV,buah,"0,00","5,00"," -5.240917°,120.242200°"," -5.240917°,120.242200°",,,,
6/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Menegakkan tiang beton yang miring,batang,"0,00","7,00"," -5.240917°,120.242200°"," -5.240917°,120.242200°",,,,
6/22/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"10,00",,"-5. 090433, 120.235542"," -5. 123506, 120.236273",,,10,
6/22/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,"2,50",,"-5. 090433, 120.235542"," -5. 123506, 120.236273","2,5",,,
6/23/2026,P_MATUMPU,P_MATUMPU,P_MATUMPU,,Pekerjaan perampalan pohon,kms,"2,50",,"-5.120764, 120.249488","-5.116924, 120.24652","2,5",,,
6/23/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,"5,30",," -5.095878, 120.231901"," -5.100112, 120.232288","5,3",,,
6/24/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"30,00",," -5.095878, 120.231901"," -5.100112, 120.232288",,,30,
6/24/2026,P_BULUPODDO,P_BULUPODDO,P_BULUPODDO,,Pemasangan isolator aspan 20 kV,buah,"0,00","3,00"," -5.095878, 120.231901"," -5.100112, 120.232288",,,,
6/24/2026,P_BULUPODDO,P_BULUPODDO,P_BULUPODDO,,Pemasangan Fuse Cut Out 20 kV,buah,"0,00","3,00"," -5.095878, 120.231901"," -5.100112, 120.232288",,,,
6/24/2026,P_BULUPODDO,P_BULUPODDO,P_BULUPODDO,,Pemasangan joint sleeve,buah,"0,00","3,00"," -5.095878, 120.231901"," -5.100112, 120.232288",,,,
6/24/2026,P_BULUPODDO,P_BULUPODDO,P_BULUPODDO,,Pemasangan isolator tumpu 20 kV,buah,"0,00","3,00"," -5.095878, 120.231901"," -5.100112, 120.232288",,,,
6/24/2026,P_BULUPODDO,P_BULUPODDO,P_BULUPODDO,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","3,00"," -5.095878, 120.231901"," -5.100112, 120.232288",,,,
6/25/2026,P_TIELINE TANGKA,REC_MUSABAQAH,REC_MUSABAQAH,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00",," -5.095878, 120.231902"," -5.100112, 120.232289",,,3,
6/27/2026,P_MATUMPU,REC_MARANA,CO_TALISE,CO_TALISE,Menegakkan tiang beton yang miring,batang,"0,00","4,00"," -5.095878, 120.231903"," -5.100112, 120.232290",,,,
6/27/2026,P_MATUMPU,REC_MARANA,CO_TALISE,,Pengencangan (perbaikan andongan),gawang,"0,00","8,00"," -5.095878, 120.231904"," -5.100112, 120.232291",,,,
6/27/2026,P_MATUMPU,REC_MARANA,CO_TALISE,,Pemasangan isolator tumpu 20 kV,buah,"0,00","10,00"," -5.095878, 120.231905"," -5.100112, 120.232292",,,,
6/27/2026,P_MATUMPU,REC_MARANA,CO_TALISE,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","10,00"," -5.095878, 120.231906"," -5.100112, 120.232293",,,,
6/28/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,REC_KAROBBI,Menegakkan tiang beton yang miring,batang,"0,00","1,00"," -5.095878, 120.231907"," -5.100112, 120.232294",,,,
6/28/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan isolator tumpu 20 kV,buah,"0,00","6,00"," -5.095878, 120.231908"," -5.100112, 120.232295",,,,
6/28/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pembongkaran isolator tumpu 20 kV,buah,"0,00","6,00"," -5.095878, 120.231909"," -5.100112, 120.232296",,,,
6/28/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pengencangan (perbaikan andongan),gawang,"0,00","10,00"," -5.095878, 120.231910"," -5.100112, 120.232297",,,,
6/28/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan joint sleeve,buah,"0,00","3,00"," -5.095878, 120.231911"," -5.100112, 120.232298",,,,
6/29/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan Lemari Bagi TR 3 phasa 2-3 Jurusan lengkap,set,"0,00","1,00"," -5.095878, 120.231912"," -5.100112, 120.232299",,,,
6/29/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pembongkaran Lemari Bagi TR 3 phasa 2-3 Jurusan lengkap,set,"0,00","1,00"," -5.095878, 120.231913"," -5.100112, 120.232300",,,,
6/30/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,CO_TERASA,CO_TERASA,Pekerjaan perampalan pohon,kms,"4,90",," -5.095878, 120.231914"," -5.100112, 120.232301","4,9",,,
6/30/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,CO_TERASA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"9,00",," -5.095878, 120.231915"," -5.100112, 120.232302",,,9,
7/1/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,CO_BONDU,,Pekerjaan perampalan pohon,kms,"5,40",," -5.232569, 120.014092","-5.196555, 120.02885","5,4",,,
7/1/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,CO_BONDU,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"14,00",," -5.232569, 120.014092","-5.196555, 120.02885",,,14,
7/2/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pengencangan (perbaikan andongan),gawang,,"16,00","-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/2/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pemasangan Trafo 3 fasa 100 - 160 kVA,set,,"4,00","-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/2/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pengencangan (perbaikan andongan),gawang,,"16,00","-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/2/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pemasangan Trafo 3 fasa 100 - 160 kVA,set,,"4,00","-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/3/2026,P_MATUMPU,REC_MARANA,CO_PASISIKAN,,Pekerjaan perampalan pohon,kms,"1,00",,"-5.248257, 120.292325","2. -5.251341, 120.296138",,,,
7/4/2026,P_MATUMPU,REC_MARANA,CO_PASISIKAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"20,00",,"-5.248257, 120.292325","2. -5.251341, 120.296138",,,,
7/6/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,Pekerjaan perampalan pohon,kms,"1,00",,"-5.128978, 120.253562","-5.127822, 120.254907",,,,
7/6/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"2,00",,"-5.128978, 120.253562","-5.127822, 120.254907",,,,
7/8/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pekerjaan perampalan pohon,kms,"8,50",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/8/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"65,00",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/9/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,3,,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/9/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,20,,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/13/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,,"1,70"," -5.091742, 120.234716","-5.120363, 120.230168",,,,
7/13/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,,"7,00"," -5.091742, 120.234716","-5.120363, 120.230168",,,,
7/13/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Menegakkan tiang beton yang miring,batang,,"1,00"," -5.091742, 120.234716","-5.120363, 120.230168",,,,
7/13/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pengencangan (perbaikan andongan),gawang,,"2,00"," -5.091742, 120.234716","-5.120363, 120.230168",,,,
7/13/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pemasangan joint sleeve,buah,,"6,00"," -5.091742, 120.234716","-5.120363, 120.230168",,,,
7/14/2026,P_TIELINE TANGKA,REC_MUSABAQAH,REC_MUSABAQAH,,Pekerjaan perampalan pohon,kms,"2,30",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/15/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"3,80",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/15/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/16/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"1,60",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/16/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"7,00",,"-5.209904, 120.079903","-5.227638, 120.064176",,,,
7/18/2026,P_MATUMPU,REC_MARANA,CO_BANOA,,Pekerjaan perampalan pohon,kms,"3,00",," -5.248687, 120.264417","-5.230257, 120.265272",,,,
7/18/2026,P_MATUMPU,REC_MARANA,CO_BANOA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"21,00",," -5.248687, 120.264417","-5.230257, 120.265272",,,,
7/20/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pekerjaan perampalan pohon,kms,"1,40",," -5.108148, 120.20027","-5.102116, 120.190304",,,,
7/20/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pemasangan paralel groove,buah,,"6,00"," -5.108148, 120.20027","-5.102116, 120.190304",,,,
7/20/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pemasangan joint sleeve,buah,,"3,00"," -5.108148, 120.20027","-5.102116, 120.190304",,,,
7/20/2026,P_BULUPODDO,REC_BULUPODDO,LBS_CINRANAE,,Pengencangan (perbaikan andongan),gawang,,"1,00"," -5.108148, 120.20027","-5.102116, 120.190304",,,,
7/21/2026,P_MATUMPU,REC_MARANA,SECT_SUKAMAJU,,Pekerjaan perampalan pohon,kms,"2,50",,"-5.248878, 120.26595","-5.266746, 120.256616",,,,
7/22/2026,P_MATUMPU,REC_MARANA,SECT_SUKAMAJU,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"7,00",,"-5.420245, 120.240365","-5.409141,120.253658",,,,
7/22/2026,P_MATUMPU,REC_MARANA,SECT_SUKAMAJU,,Pekerjaan perampalan pohon,kms,"3,20",,"-5.420245, 120.240365","-5.409141,120.253658",,,,
7/23/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00",,"-5.351295, 120.297854","-5.34224,120.286231",,,,
7/27/2026,P_BULUPODDO,REC_BULUPODDO,CO_SATENGNGAH,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"1,00",,"-5.351295, 120.297854","-5.34224,120.286231",,,,
7/27/2026,P_BULUPODDO,REC_BULUPODDO,CO_SATENGNGAH,,Menegakkan tiang beton yang miring,batang,,"7,00","-5.351295, 120.297854","-5.34224,120.286231",,,,
7/27/2026,P_BULUPODDO,REC_BULUPODDO,CO_SATENGNGAH,,Pengencangan (perbaikan andongan),gawang,,"6,00","-5.351295, 120.297854","-5.34224,120.286231",,,,
7/28/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,Pengencangan (perbaikan andongan),gawang,,"2,00","-5.351295, 120.297854","-5.34224,120.286231",,,,
7/28/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,1,0,"2,00","2,00","-5.351295, 120.297854","-5.34224,120.286231",,,,
7/28/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,Pekerjaan perampalan pohon,kms,"0,20","2,00","-5.351295, 120.297854","-5.34224,120.286231",,,,
7/29/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"15,00","2,00","-5.48832, 120.431866","-5.469589, 120.423743",,,,
7/29/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"21,00","2,00","-5.394177, 120.394332","-5.3737, 120.386776",,,,
8/1/2026,P_LITHA,GH SINJAI OUT_BIKERU,CO_BONGKI LENGKESE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"20,00","2,00","-5.1276696, 120.2086984","-5.1276696, 120.2086984",,,,
8/4/2026,P_HARUE,REC_BALANGPESOANG,CO_BT PEDDA,,Pekerjaan perampalan pohon,kms,"0,21","2,00","-5.264335, 120.158046","-5.271112, 120.15334",,,,
8/4/2026,P_HARUE,REC_BALANGPESOANG,CO_BT PEDDA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"7,00","2,00","-5.264335, 120.158046","-5.271112, 120.15334",,,,
8/5/2026,P_HARUE,REC_BALANGPESOANG,SECT_SONGING,,Pekerjaan perampalan pohon,kms,"0,60","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/5/2026,P_HARUE,REC_BALANGPESOANG,SECT_SONGING,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"16,00","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/6/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pekerjaan perampalan pohon,kms,"3,00","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/6/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"12,00","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/6/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pengencangan (perbaikan andongan),gawang,"2,00","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/6/2026,P_LITHA,REC_KAROBBI,REC_KAROBBI,,Pemasangan joint sleeve,buah,"9,00","2,00","-5.254654, 120.156955"," -5.255794, 120. 147226",,,,
8/8/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,"0,40","2,00","-5.127634, 120.246718","-5.119319, 120.243642",,,,
8/8/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"5,00","2,00","-5.127634, 120.246718","-5.119319, 120.243642",,,,
8/10/2026,P_MATUMPU,GH SINJAI OUT_MANGARABOMBANG,GH SINJAI OUT_MANGARABOMBANG,,Pekerjaan perampalan pohon,kms,"3,50","2,00"," -5.12977, 120.251485","2. -5.145829, 120.262505",,,,
8/10/2026,P_LAPPA,REC_PERSATUAN RAYA,REC_PERSATUAN RAYA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"20,00","2,00","-5.12977, 120.251485","-5.145829, 120.262505",,,,
8/11/2026,P_LITHA,REC_TONDONG,CO_BIRORO,,Pekerjaan perampalan pohon,kms,"1,50","2,00","-5.206269, 120.249227","-5.214829, 120.241334",,,,
8/11/2026,P_LITHA,REC_TONDONG,CO_BIRORO,,Pemasangan Tupang tarik,set,"1,00","2,00","-5.206269, 120.249227","-5.214829, 120.241334",,,,
8/12/2026,P_BONTO BULAENG,REC_MUNTE,REC_MUNTE,,Pekerjaan perampalan pohon,kms,"1,30","2,00","-5.352181, 120.074061","-5.36987, 120.101058",,,,
8/12/2026,P_BONTO BULAENG,REC_MUNTE,REC_MUNTE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"20,00","2,00","-5.352181, 120.074061","-5.36987, 120.101058",,,,
8/15/2026,P_HARUE,REC_BALANGPESOANG,CO_KORONG,,Pekerjaan perampalan pohon,kms,"2,50","2,00","-5.262484, 120.167697","-5.258138, 120.168613",,,,
8/15/2026,P_HARUE,REC_BALANGPESOANG,CO_KORONG,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"5,00","2,00","-5.262484, 120.167697","-5.258138, 120.168613",,,,
8/18/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan perampalan pohon,kms,"2,10","2,00","-5.12977, 120.251485","-5.145829, 120.262505",,,,
8/18/2026,P_TIELINE TANGKA,P_TIELINE TANGKA,P_TIELINE TANGKA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"4,00","2,00","-5.12977, 120.251485","-5.145829, 120.262505",,,,
8/19/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"0,70","2,00","-5.384201, 120.360829","-5.372652, 120.383154",,,,
8/19/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"7,00","2,00","-5.384201, 120.360829","-5.372652, 120.383154",,,,
8/20/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"6,00","2,00","-5.49345, 120.20278","-5.425572, 120.084396",,,,
8/20/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"20,00","2,00","-5.49345, 120.20278","-5.425572, 120.084396",,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pekerjaan perampalan pohon,kms,"0,50","2,00",,,,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"1,00","2,00",,,,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pengencangan (perbaikan andongan),gawang,"7,00","2,00",,,,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Menegakkan tiang beton yang miring,batang,"1,00","2,00",,,,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pemasangan Tupang tarik,set,"1,00","2,00",,,,,,
8/21/2026,P_HARUE,REC_KALOBBA,CO_LEMBANG LOHE,,Pemasangan joint sleeve,buah,"2,00","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Pekerjaan perampalan pohon,kms,"0,50","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"3,00","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Pengencangan (perbaikan andongan),gawang,"2,00","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Perbaikan posisi travers tunggal miring,set,"4,00","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Pemasangan isolator tumpu 20 kV,buah,"3,00","2,00",,,,,,
8/22/2026,P_MATUMPU,REC_MARANA,LBS_TAKALALA,,Pemasangan joint sleeve,buah,"2,00","2,00",,,,,,
8/24/2026,P_LEPPAKOMAI,P_LEPPAKOMAI,P_LEPPAKOMAI,,Pengencangan (perbaikan andongan),gawang,"8,00","2,00",,,,,,
8/24/2026,P_LEPPAKOMAI,P_LEPPAKOMAI,P_LEPPAKOMAI,,Perbaikan penghantar terburai,titik,"120,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan Penghalang Binatang/hewan,buah,"54,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pembongkaran isolator tumpu 20 kV,buah,"3,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Perbaikan posisi travers tunggal miring,set,"3,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan isolator tumpu 20 kV,buah,"1,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan isolator aspan 20 kV,buah,"6,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan Fuse Cut Out 20 kV,buah,"3,00","2,00",,,,,,
8/26/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pemasangan joint sleeve,buah,"12,00","2,00",,,,,,
8/27/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan perampalan pohon,kms,"0,50","2,00",,,,,,
8/27/2026,PTT GABUNGAN,PTT GABUNGAN,PTT GABUNGAN,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"11,00","2,00",,,,,,
8/29/2026,P_LAPPA,REC_PERSATUAN RAYA,SECT_BIRING ERE,,Pekerjaan perampalan pohon,kms,"1,20","2,00",,,,,,
8/29/2026,P_LAPPA,REC_PERSATUAN RAYA,SECT_BIRING ERE,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"11,00","2,00",,,,,,
8/31/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,REC_GUNUNG PERAK,,Pekerjaan Tebang Pohon (setara pohon kelapa/pohon berkayu dengan diameter diatas 30 cm/pohon produktif),pohon,"10,00","2,00",,,,,,
8/31/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,REC_GUNUNG PERAK,,Perbaikan posisi travers tunggal miring,set,"3,00","2,00",,,,,,
8/31/2026,P_TIELINE TANGKA,REC_GUNUNG PERAK,REC_GUNUNG PERAK,,Pembongkaran isolator tumpu 20 kV,buah,"6,00","2,00",,,,,,`;

export function parseLapHarBulananCsv(csvString: string): RowItem[] {
  const parsed = Papa.parse<any>(csvString, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  const results: RowItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tgl = (r['TANGGAL '] || r['TANGGAL'] || r['Tanggal'] || '').trim();
    if (!tgl || tgl === '#REF!' || tgl === 'TANGGAL') continue;

    const penyulang = (r['PENYULANG'] || '').trim();
    const zonaProteksi = (r['ZONA PROTEKSI'] || '').trim();
    const section1 = (r['SECTION 1'] || '').trim();
    const section2 = (r['SECTION 2'] || '').trim();
    const detailPekerjaan = (r['DETAIL PEKERJAAN'] || '').trim();
    const satuan = (r['SATUAN'] || '').trim();
    const volumeRow = parseIndoNumber(r['VOLUME ROW']);
    const volumeTeknik = parseIndoNumber(r['VOLUME TEKNIK']);
    const koordinatAwal = (r['KOORDINAT TITIK AWAL'] || '').trim();
    const koordinatAkhir = (r['KOORIDINAT TITIK AKHIR'] || r['KOORDINAT TITIK AKHIR'] || '').trim();
    const realRampalSect1 = parseIndoNumber(r['REAL RAMPAL SECT 1']);
    const realRampalSect2 = parseIndoNumber(r['REAL RAMPAL SECT 2']);
    const realTbgSect1 = parseIndoNumber(r['REAL TBG SECT 1']);
    const realTbgSect2 = parseIndoNumber(r['REAL TBG SECT 2']);

    const detLower = detailPekerjaan.toLowerCase();
    let tebang = 0;
    let perampalan = 0;
    let temuanButuhPadam = 0;
    let kmsInspeksi = 0;

    if (detLower.includes('tebang') || detLower.includes('penebangan')) {
      tebang = volumeRow || realTbgSect1 || realTbgSect2 || 0;
    } else if (detLower.includes('rampal') || detLower.includes('pangkas') || detLower.includes('perampalan')) {
      perampalan = volumeRow || realRampalSect1 || realRampalSect2 || 0;
      kmsInspeksi = perampalan;
    } else if (volumeTeknik > 0) {
      temuanButuhPadam = volumeTeknik;
    }

    const keypoint = zonaProteksi || section1 || penyulang;
    const segment = section1 || section2 || zonaProteksi || penyulang;

    results.push({
      timestamp: tgl,
      tanggal: tgl,
      tanggalParsed: parseDate(tgl),
      tim: 'Unit 21 Sinjai',
      penyulang,
      keypoint,
      segment,
      tebang,
      perampalan,
      temuanButuhPadam,
      kmsInspeksi,
      zonaProteksi,
      section1,
      section2,
      detailPekerjaan,
      satuan,
      volumeRow,
      volumeTeknik,
      koordinatAwal,
      koordinatAkhir,
      realRampalSect1,
      realRampalSect2,
      realTbgSect1,
      realTbgSect2,
    });
  }

  return results;
}

// Realistic baseline ROW data representing Sinjai units
const SAMPLE_ROW_DATA: RowItem[] = parseLapHarBulananCsv(LAP_HAR_BULANAN_RAW_CSV);

export function isExcludedFaultCause(item: { penyebabPadam?: string; keterangan?: string; relay?: string }): boolean {
  const p = (item.penyebabPadam || '').toLowerCase();
  const k = (item.keterangan || '').toLowerCase();
  const r = (item.relay || '').toLowerCase();
  const combined = `${p} ${k} ${r}`;

  // 1. Manuver beban / sistem
  if (combined.includes('manuver')) return true;

  // 2. Pekerjaan TRAGI / Gardu Induk
  if (combined.includes('tragi')) return true;

  // 3. Penormalan sistem
  if (combined.includes('penormalan')) return true;

  // 4. Pengujian & SCADA / Senam PMT / Pengetesan RC SCADA
  if (
    combined.includes('scada') ||
    combined.includes('pengujian') ||
    combined.includes('pengetesan') ||
    combined.includes('senam pmt') ||
    combined.includes('uji scada')
  ) {
    return true;
  }

  // 5. Sebagian beban
  if (combined.includes('sebagian beban')) return true;

  // 6. MLS
  if (combined.includes('mls')) return true;

  return false;
}

export function hydrateDashboardData(data: any): AllDashboardData {
  if (!data) return data;
  data.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();

  if (Array.isArray(data.gangguan)) {
    data.gangguan.forEach((item: any) => {
      if (item.tanggalParsed && typeof item.tanggalParsed === 'string') {
        item.tanggalParsed = new Date(item.tanggalParsed);
      } else if (!item.tanggalParsed && item.tanggal) {
        item.tanggalParsed = parseDate(item.tanggal);
      }
    });
  }

  if (Array.isArray(data.rowHarian)) {
    data.rowHarian.forEach((item: any) => {
      if (item.tanggalParsed && typeof item.tanggalParsed === 'string') {
        item.tanggalParsed = new Date(item.tanggalParsed);
      } else if (!item.tanggalParsed && (item.tanggal || item.timestamp)) {
        item.tanggalParsed = parseDate(item.tanggal || item.timestamp);
      }
    });
  }

  if (Array.isArray(data.pengaduan)) {
    data.pengaduan.forEach((item: any) => {
      if (item.tanggalParsed && typeof item.tanggalParsed === 'string') {
        item.tanggalParsed = new Date(item.tanggalParsed);
      } else if (!item.tanggalParsed && (item.tanggal || item.tglLapor)) {
        item.tanggalParsed = parseDate(item.tanggal || item.tglLapor);
      }
    });
  }

  return data as AllDashboardData;
}

export type DashboardData = AllDashboardData;

export async function fetchAllDashboardData(forceRefresh: boolean = false): Promise<AllDashboardData> {
  const CACHE_KEY = 'pln_sinjai_dashboard_data_v3';
  const CACHE_TIME_KEY = 'pln_sinjai_dashboard_time_v3';

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      if (cached && cachedTime) {
        const timeDiff = Date.now() - parseInt(cachedTime, 10);
        // Cache valid for 3 minutes unless forced
        if (timeDiff < 3 * 60 * 1000) {
          const parsed = JSON.parse(cached);
          return hydrateDashboardData(parsed);
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  } else {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIME_KEY);
    } catch {}
  }

  // Get current active GIDs (supports custom saved GIDs)
  const currentGids = getActiveGids();

  // Determine Material Sheet URL (check custom configured URL first, fallback to BASE_URL + GID)
  let resolvedMaterialUrl = '';
  try {
    const customMatUrl = localStorage.getItem('pln_custom_material_sheet_url');
    if (customMatUrl && customMatUrl.trim()) {
      resolvedMaterialUrl = normalizeGoogleSheetUrl(customMatUrl);
    }
  } catch {}
  if (!resolvedMaterialUrl && currentGids.MONITORING_MATERIAL) {
    resolvedMaterialUrl = `${BASE_URL}?gid=${currentGids.MONITORING_MATERIAL}&single=true&output=csv`;
  }

  // Determine K3L Sheet URL (check custom configured URL first, fallback to BASE_URL + GID)
  let resolvedK3Url = '';
  try {
    const customK3Url = localStorage.getItem('pln_custom_k3l_sheet_url');
    if (customK3Url && customK3Url.trim()) {
      resolvedK3Url = normalizeGoogleSheetUrl(customK3Url);
    }
  } catch {}
  if (!resolvedK3Url && currentGids.K3) {
    resolvedK3Url = `${BASE_URL}?gid=${currentGids.K3}&single=true&output=csv`;
  }

  // Fetch all CSV files in parallel with resilient timeout, retry, and cached raw storage fallback
  const [ggnCsv, garduCsv, rowCsv, pengaduanCsv, asetCsv, kandangCsv, materialCsv, k3Csv] = await Promise.all([
    fetchWithStorageFallback('ggn', `${BASE_URL}?gid=${currentGids.GGN_JTM}&single=true&output=csv`, forceRefresh),
    fetchWithStorageFallback('gardu', `${BASE_URL}?gid=${currentGids.MASTER_GARDU}&single=true&output=csv`, forceRefresh),
    fetchWithStorageFallback('row', `${BASE_URL}?gid=${currentGids.LAPORAN_ROW}&single=true&output=csv`, forceRefresh),
    fetchWithStorageFallback('pengaduan', `${BASE_URL}?gid=${currentGids.PENGADUAN_INDIVIDU}&single=true&output=csv`, forceRefresh),
    fetchWithStorageFallback('aset', `${BASE_URL}?gid=${currentGids.DATA_ASET}&single=true&output=csv`, forceRefresh),
    fetchWithStorageFallback('kandang', `${BASE_URL}?gid=${currentGids.KANDANG_AYAM}&single=true&output=csv`, forceRefresh),
    resolvedMaterialUrl ? fetchWithStorageFallback('material', resolvedMaterialUrl, forceRefresh) : Promise.resolve(''),
    resolvedK3Url ? fetchWithStorageFallback('k3', resolvedK3Url, forceRefresh) : Promise.resolve(''),
  ]);

  // 1. Process GGN JTM
  const ggnParsed = Papa.parse<any>(ggnCsv, { header: true, skipEmptyLines: true });
  const rawGgnList = ggnParsed.data || [];
  const gangguan: GangguanItem[] = rawGgnList.map(r => {
    const keypoint = (r.KEYPOINT || '').trim();
    const kpUpper = keypoint.toUpperCase();
    const isValid = kpUpper.includes('P_') || kpUpper.includes('REC_') || kpUpper.includes('SEC_');
    const tpRaw = (r['T/P APKT'] || '').trim().toUpperCase();
    let tipe: 'TEMPORER' | 'PERMANEN' | 'LAINNYA' = 'LAINNYA';
    if (tpRaw.includes('PERM')) tipe = 'PERMANEN';
    else if (tpRaw.includes('TEMP')) tipe = 'TEMPORER';

    const tgl = (r.TANGGAL || '').trim();
    return {
      tanggal: tgl,
      tanggalParsed: parseDate(tgl),
      up3: (r.UP3 || '').trim(),
      gi: (r.GI || '').trim(),
      penyulang: (r.PENYULANG || '').trim(),
      keypoint: keypoint,
      relay: (r.RELAY || '').trim(),
      penyebabPadam: (r['PENYEBAB PADAM'] || '').trim(),
      keterangan: (r.KETERANGAN || r['PENYEBAB PADAM'] || 'Tidak Ada Keterangan').trim(),
      ulp: (r.ULP || '').trim(),
      tipeGangguan: tipe,
      isKeypointValid: isValid,
    };
  });

  // 2. Process MASTER GARDU
  const garduParsed = Papa.parse<any>(garduCsv, { header: true, skipEmptyLines: true });
  const rawGarduList = garduParsed.data || [];
  const gardu: GarduItem[] = rawGarduList
    .filter(r => r.NAMA && r.NAMA.trim() !== '')
    .map((r, idx) => {
      const kva = parseIndoNumber(r['KVA TRAFO']);
      const ir = parseIndoNumber(r['I  R'] ?? r['IR']);
      const isVal = parseIndoNumber(r['I  S'] ?? r['IS']);
      const it = parseIndoNumber(r['I  T'] ?? r['IT']);
      const inVal = parseIndoNumber(r['I  N'] ?? r['IN']);
      const ff = parseIndoNumber(r.FF);
      const fn = parseIndoNumber(r.FN);
      const bebanPersen = parseIndoNumber(r['BEBAN (%)']);
      const bebanKv = parseIndoNumber(r['BEBAN (KV)']);

      let statusBeban: 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD' | 'TIDAK TERDEFINISI' = 'NORMAL';
      const rawStatus = (r['STATUS BEBAN'] || '').trim().toUpperCase();
      if (rawStatus.includes('OVER') || bebanPersen > 80) {
        statusBeban = 'OVERLOAD';
      } else if (rawStatus.includes('UNDER') || bebanPersen < 20) {
        statusBeban = 'UNDERLOAD';
      } else if (rawStatus.includes('NORM') || (bebanPersen >= 20 && bebanPersen <= 80)) {
        statusBeban = 'NORMAL';
      }

      return {
        no: parseInt(r.NO, 10) || idx + 1,
        nama: (r.NAMA || '').trim(),
        namaGdMaip: (r['NAMA GD MAIP'] || '').trim(),
        maip: (r.MAIP || '').trim(),
        status: (r.STATUS || '').trim(),
        konstruksi: (r.KONSTRUKSI || '').trim(),
        merk: (r.MERK || '').trim(),
        namaEam: (r['NAMA EAM'] || '').trim(),
        lat: (r.LAT || '').trim(),
        lon: (r.LON || '').trim(),
        penyulang: (r.PENYULANG || '').trim(),
        zonaProteksi: (r['ZONA PROTEKSI'] || '').trim(),
        keypoint: (r.KEYPOINT || '').trim(),
        alamat: (r.ALAMAT || '').trim(),
        kvaTrafo: kva,
        fasaTrafo: r['FASA TRAFO'] || '3',
        pengukuranTerakhir: (r['PENGUKURAN TERAKHIR'] || '').trim(),
        statusPengukuran: (r['STATUS PENGUKURAN'] || '').trim(),
        ir,
        is: isVal,
        it,
        in: inVal,
        ff,
        fn,
        jurusan: (r.JURUSAN || '').trim(),
        statusTegangan: (r['STATUS TEGANGAN'] || '').trim(),
        bebanPersen,
        bebanKv,
        statusBeban,
        pic: (r.PIC || '').trim(),
        penginput: (r.PENGINPUT || '').trim(),
      };
    });

  // 3. Process ROW Harian (Sheet: LAPORAN_ROW / LAPORAN_HAR_HARIAN / LAP HAR BULANAN)
  let rowHarian: RowItem[] = [];

  // Check if CSV format is the 15-column "Lap Har Bulanan" sheet
  if (
    rowCsv &&
    (rowCsv.includes('ZONA PROTEKSI') || rowCsv.includes('DETAIL PEKERJAAN') || rowCsv.includes('VOLUME ROW') || rowCsv.includes('REAL RAMPAL') || rowCsv.includes('REAL TBG'))
  ) {
    rowHarian = parseLapHarBulananCsv(rowCsv);
  }

  if (!rowHarian || rowHarian.length === 0) {
    const rawRowArrays = Papa.parse<string[]>(rowCsv, { header: false, skipEmptyLines: false }).data || [];
    
    // Try to find header indices dynamically if a header row exists
    let colIndexTanggal = 0;
    let colIndexTim = 1;
    let colIndexPenyulang = 2;
    let colIndexKeypoint = 3;
    let colIndexSegment = 4;
    let colIndexTebang = 6; // Default Kolom G (index 6)
    let colIndexRampal = 7; // Default Kolom H (index 7)
    let colIndexPadam = 8;  // Default Kolom I (index 8)
    let colIndexKms = 9;    // Default Kolom J (index 9)

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, rawRowArrays.length); i++) {
      const row = rawRowArrays[i] || [];
      const joined = row.map(c => String(c || '').toUpperCase()).join(' | ');
      if (
        (joined.includes('TIM') || joined.includes('PENYULANG') || joined.includes('TANGGAL') || joined.includes('TIMESTAMP')) &&
        (joined.includes('TEBANG') || joined.includes('RAMPAL') || joined.includes('PANGKAS') || joined.includes('PENEBANGAN') || row.length >= 7)
      ) {
        headerRowIndex = i;
        row.forEach((cellVal, idx) => {
          const val = String(cellVal || '').toUpperCase().trim();
          if (val.includes('TIMESTAMP') || (val.includes('TANGGAL') && !val.includes('UPDATE'))) colIndexTanggal = idx;
          else if (val.includes('TIM') || val.includes('REGU') || val.includes('PELAKSANA')) colIndexTim = idx;
          else if (val.includes('PENYULANG') || val.includes('FEEDER')) colIndexPenyulang = idx;
          else if (val.includes('KEYPOINT') || val.includes('LOKASI')) colIndexKeypoint = idx;
          else if (val.includes('SEGMEN')) colIndexSegment = idx;
          else if (val.includes('TEBANG') || val.includes('PENEBANGAN')) colIndexTebang = idx;
          else if (val.includes('RAMPAL') || val.includes('PANGKAS') || val.includes('PERAMPALAN') || val.includes('PEMANGKASAN')) colIndexRampal = idx;
          else if (val.includes('PADAM') || val.includes('TEMUAN')) colIndexPadam = idx;
          else if (val.includes('KMS') || val.includes('INSPEKSI')) colIndexKms = idx;
        });
        break;
      }
    }

    // Ensure default strict Kolom G & Kolom H if not explicitly found by name
    if (colIndexTebang === colIndexRampal) {
      colIndexTebang = 6; // Kolom G
      colIndexRampal = 7; // Kolom H
    }

    const parsedRowList: RowItem[] = [];
    for (let i = 0; i < rawRowArrays.length; i++) {
      if (i === headerRowIndex) continue;
      const row = rawRowArrays[i];
      if (!row || row.length === 0) continue;

      const colA = String(row[colIndexTanggal] ?? row[0] ?? '').trim(); // Timestamp / Tanggal
      const colB = String(row[colIndexTim] ?? row[1] ?? '').trim(); // Tim / Unit Pelaksana
      const colC = String(row[colIndexPenyulang] ?? row[2] ?? '').trim(); // Penyulang
      const colD = String(row[colIndexKeypoint] ?? row[3] ?? '').trim(); // Keypoint
      const colE = String(row[colIndexSegment] ?? row[4] ?? '').trim(); // Segment

      // Kolom G (index 6) untuk Penebangan, Kolom H (index 7) untuk Perampalan/Pemangkasan
      const rawTebangVal = row[colIndexTebang] !== undefined ? row[colIndexTebang] : row[6];
      const rawRampalVal = row[colIndexRampal] !== undefined ? row[colIndexRampal] : row[7];
      const rawPadamVal = row[colIndexPadam] !== undefined ? row[colIndexPadam] : row[8];
      const rawKmsVal = row[colIndexKms] !== undefined ? row[colIndexKms] : (row[9] ?? (row.length === 9 ? row[8] : ''));

      // Skip header text row
      const colAUpper = colA.toUpperCase();
      const colBUpper = colB.toUpperCase();
      if (colAUpper === 'TIMESTAMP' || colAUpper === 'TANGGAL' || colBUpper === 'TIM') continue;
      if (colAUpper.includes('REALISASI') || colBUpper.includes('REALISASI')) continue;

      // Skip completely empty rows
      const hasAnyContent = row.some(cell => String(cell || '').trim() !== '');
      if (!hasAnyContent) continue;

      const tebang = parseIndoNumber(rawTebangVal);
      const perampalan = parseIndoNumber(rawRampalVal);
      const temuanButuhPadam = parseIndoNumber(rawPadamVal);
      const kmsInspeksi = parseIndoNumber(rawKmsVal);

      parsedRowList.push({
        timestamp: colA,
        tanggal: colA,
        tanggalParsed: parseDate(colA),
        tim: colB || 'Unit 21 Sinjai',
        penyulang: colC,
        keypoint: colD,
        segment: colE,
        tebang, // Kolom G: Penebangan Pohon
        perampalan, // Kolom H: Perampalan / Pemangkasan
        temuanButuhPadam,
        kmsInspeksi,
      });
    }

    rowHarian = parsedRowList.length > 0 
      ? parsedRowList 
      : SAMPLE_ROW_DATA.map(item => ({
          ...item,
          tanggalParsed: parseDate(item.tanggal),
        }));
  }

  // 4. Process PENGADUAN INDIVIDU
  const pengaduanParsed = Papa.parse<any>(pengaduanCsv, { header: true, skipEmptyLines: true });
  const rawPengaduanList = (pengaduanParsed.data || []).filter(
    r => r.Tanggal || r['Nama Pelapor'] || r['No. HP Pelapor']
  );
  const pengaduan: PengaduanItem[] = rawPengaduanList.map(r => {
    const tgl = (r.Tanggal || '').trim();
    let dispatch = (r.Dispatch || '').trim();
    if (!dispatch || dispatch === '-') {
      dispatch = 'Manual';
    }
    return {
      tanggal: tgl,
      tanggalParsed: parseDate(tgl),
      namaPelapor: (r['Nama Pelapor'] || 'Pelanggan').trim(),
      idPelanggan: (r['Id Pelanggan'] || '').trim(),
      alamatPengaduan: (r['Alamat Pengaduan'] || '').trim(),
      noHpPelapor: (r['No. HP Pelapor'] || '').trim(),
      laporanVia: (r['Laporan Via'] || 'Lainnya').trim(),
      statusInput: (r['STATUS INPUT'] || '').trim(),
      jenisGangguan: (r['Jenis Gangguan'] || '').trim(),
      dispatch,
      unitPelaksana: (r['Unit Pelaksana'] || 'Unit 21 Sinjai').trim(),
      waktuPelaksanaan: (r['Waktu Pelaksanaan'] || '').trim(),
      noPengaduan: (r['No. Pengaduan'] || '').trim(),
      detailGangguan: (r['Detail Gangguan'] || '').trim(),
      status: (r.Status || 'Selesai').trim(),
      rating: (r.Rating || '').trim(),
    };
  });

  // 5. Process DATA ASET JTM
  const asetParsed = Papa.parse<any>(asetCsv, { header: true, skipEmptyLines: true });
  const rawAsetList = (asetParsed.data || []).filter(r => r.PENYULANG || r.KEYPOINT || r['PANJANG KMS']);
  const aset: AsetItem[] = rawAsetList.map((r, idx) => ({
    no: parseInt(r.NO, 10) || idx + 1,
    up3: (r.UP3 || '').trim(),
    ulp: (r.ULP || '').trim(),
    penyulang: (r.PENYULANG || '').trim(),
    keypoint: (r.KEYPOINT || '').trim(),
    segment: (r.SEGMENT || '').trim(),
    panjangKms: parseIndoNumber(r['PANJANG KMS']),
  }));

  // 6. Process PETA KANDANG AYAM
  const kandangParsed = Papa.parse<any>(kandangCsv, { header: true, skipEmptyLines: true });
  const rawKandangList = (kandangParsed.data || []).filter(r => {
    const name = (r['Nama Peternak'] || r['NAMA PETERNAK'] || '').trim();
    const desa = (r['Desa/Kelurahan'] || r['DESA/KELURAHAN'] || '').trim();
    const coord = (r['Titik Koordinat Lokasi Peternakan'] || r['Titik Koordinat'] || r['KOORDINAT'] || '').trim();
    return (name && name !== '-' && name !== '44') || (desa && desa !== '-') || coord;
  });

  let currentKecamatan = 'Sinjai Utara';
  const kandangAyam: KandangAyamItem[] = rawKandangList.map((r, idx) => {
    const rawKec = (r.Kecamatan || r.KECAMATAN || '').trim();
    if (rawKec && rawKec !== '-' && isNaN(Number(rawKec))) {
      currentKecamatan = rawKec;
    }

    const namaPeternak = (r['Nama Peternak'] || r['NAMA PETERNAK'] || `Peternak ${idx + 1}`).trim();
    const desaKelurahan = (r['Desa/Kelurahan'] || r['DESA/KELURAHAN'] || '-').trim();
    const noHp = (r['No. HP'] || r['NO HP'] || r['NO. HP'] || '-').trim();
    const rawCoord = (r['Titik Koordinat Lokasi Peternakan'] || r['Titik Koordinat'] || r['KOORDINAT'] || '').trim();
    const parsedCoords = parseCoordinate(rawCoord, desaKelurahan);

    return {
      id: `kandang-${idx + 1}-${namaPeternak.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      kecamatan: currentKecamatan,
      no: parseInt(r.No || r.NO, 10) || idx + 1,
      namaPeternak,
      desaKelurahan,
      noHp,
      titikKoordinatRaw: rawCoord,
      lat: parsedCoords ? parsedCoords.lat : null,
      lng: parsedCoords ? parsedCoords.lng : null,
      hasValidCoordinate: Boolean(parsedCoords),
    };
  });

  // Calculations for summary metrics
  const totalKmsAset = aset.reduce((acc, cur) => acc + (cur.panjangKms || 0), 0);
  const totalGardu = gardu.length;
  const totalTebangPohon = rowHarian.reduce((acc, cur) => acc + cur.tebang, 0);
  const totalPerampalanPohon = rowHarian.reduce((acc, cur) => acc + cur.perampalan, 0);
  const totalKmsInspeksi = rowHarian.reduce((acc, cur) => acc + cur.kmsInspeksi, 0);

  // Filtered GGN according to requirement: Keypoint containing P_, REC_, SEC_ & exclude non-fault operational causes
  const filteredGgn = gangguan.filter(g => g.isKeypointValid && !isExcludedFaultCause(g));
  const totalTrip1Tahun = filteredGgn.length;
  const totalGangguanPermanen = filteredGgn.filter(g => g.tipeGangguan === 'PERMANEN').length;
  const totalGangguanTemporer = filteredGgn.filter(g => g.tipeGangguan === 'TEMPORER').length;

  const totalGarduOverload = gardu.filter(g => g.statusBeban === 'OVERLOAD').length;
  const totalGarduUnderload = gardu.filter(g => g.statusBeban === 'UNDERLOAD').length;
  const totalGarduNormal = gardu.filter(g => g.statusBeban === 'NORMAL').length;

  const totalWoPengaduan = pengaduan.length;
  const totalAutoDispatch = pengaduan.filter(p => p.dispatch.toLowerCase().includes('auto')).length;
  const totalManualDispatch = pengaduan.filter(p => !p.dispatch.toLowerCase().includes('auto')).length;

  const totalKandangAyam = kandangAyam.length;
  const totalKandangValidCoord = kandangAyam.filter(k => k.hasValidCoordinate).length;

  // 7. Process Material (if available)
  let material: MaterialItem[] = [];
  if (materialCsv) {
    try {
      material = parseCsvMaterial(materialCsv);
      if (material.length > 0) {
        saveMaterialData(material);
      }
    } catch (e) {
      console.warn('Failed to parse material CSV with universal parser, trying raw fallback:', e);
    }
  }

  // Fallback to initial material stock catalog if sheet is empty or unavailable
  if (material.length === 0) {
    material = getInitialMaterialData();
  }

  // 8. Process K3 (Section K3 - gid=445508288)
  let k3: K3LData;
  if (k3Csv && k3Csv.trim().length > 0) {
    try {
      k3 = parseCsvK3L(k3Csv);
    } catch (e) {
      console.warn('Error parsing K3 CSV from Google Sheet, fallback to cached/default data:', e);
      k3 = getInitialK3LData();
    }
  } else {
    k3 = getInitialK3LData();
  }

  const result: AllDashboardData = {
    gangguan,
    gardu,
    rowHarian,
    pengaduan,
    aset,
    kandangAyam,
    material,
    k3,
    lastUpdated: new Date(),
    summary: {
      totalKmsAset: Number(totalKmsAset.toFixed(2)),
      totalGardu,
      totalTebangPohon,
      totalPerampalanPohon,
      totalKmsInspeksi: Number(totalKmsInspeksi.toFixed(2)),
      totalTrip1Tahun,
      totalGangguanPermanen,
      totalGangguanTemporer,
      totalGarduOverload,
      totalGarduUnderload,
      totalGarduNormal,
      totalWoPengaduan,
      totalAutoDispatch,
      totalManualDispatch,
      totalKandangAyam,
      totalKandangValidCoord,
    },
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  return result;
}

export const fetchDashboardData = fetchAllDashboardData;
