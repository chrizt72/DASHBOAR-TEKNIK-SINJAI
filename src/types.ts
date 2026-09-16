export interface GangguanItem {
  tanggal: string;
  tanggalParsed?: Date;
  up3: string;
  gi: string;
  penyulang: string;
  keypoint: string;
  relay: string;
  penyebabPadam: string;
  keterangan: string;
  ulp: string;
  tipeGangguan: 'TEMPORER' | 'PERMANEN' | 'LAINNYA';
  isKeypointValid: boolean; // Contains P_, REC_, or SEC_
}

export interface GarduItem {
  no: number;
  nama: string;
  namaGdMaip: string;
  maip: string;
  status: string;
  konstruksi: string;
  merk: string;
  namaEam: string;
  lat: string;
  lon: string;
  penyulang: string;
  zonaProteksi: string;
  keypoint: string;
  alamat: string;
  kvaTrafo: number;
  fasaTrafo: number | string;
  pengukuranTerakhir: string;
  statusPengukuran: string;
  ir: number;
  is: number;
  it: number;
  in: number;
  ff: number;
  fn: number;
  jurusan: string;
  statusTegangan: string;
  bebanPersen: number;
  bebanKv: number;
  statusBeban: 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD' | 'TIDAK TERDEFINISI';
  pic: string;
  penginput: string;
}

export interface RowItem {
  timestamp: string;
  tanggal: string;
  tanggalParsed?: Date;
  tim: string;
  penyulang: string;
  keypoint: string;
  segment: string;
  tebang: number;
  perampalan: number;
  temuanButuhPadam: number;
  kmsInspeksi: number;
  // Extended fields from "Lap Har Bulanan"
  zonaProteksi?: string;
  section1?: string;
  section2?: string;
  detailPekerjaan?: string;
  satuan?: string;
  volumeRow?: number;
  volumeTeknik?: number;
  koordinatAwal?: string;
  koordinatAkhir?: string;
  realRampalSect1?: number;
  realRampalSect2?: number;
  realTbgSect1?: number;
  realTbgSect2?: number;
}

export interface LapHarBulananItem {
  tanggal: string;
  tanggalParsed?: Date;
  penyulang: string;
  zonaProteksi: string;
  section1: string;
  section2: string;
  detailPekerjaan: string;
  satuan: string;
  volumeRow: number;
  volumeTeknik: number;
  koordinatAwal: string;
  koordinatAkhir: string;
  realRampalSect1?: number;
  realRampalSect2?: number;
  realTbgSect1?: number;
  realTbgSect2?: number;
}

export interface PengaduanItem {
  tanggal: string;
  tanggalParsed?: Date;
  namaPelapor: string;
  idPelanggan: string;
  alamatPengaduan: string;
  noHpPelapor: string;
  laporanVia: string;
  statusInput: string;
  jenisGangguan: string;
  dispatch: 'Auto' | 'Manual' | string;
  unitPelaksana: string;
  waktuPelaksanaan: string;
  noPengaduan: string;
  detailGangguan: string;
  status: string;
  rating: string;
}

export interface AsetItem {
  no: number;
  up3: string;
  ulp: string;
  penyulang: string;
  keypoint: string;
  segment: string;
  panjangKms: number;
}

export interface KandangAyamItem {
  id: string;
  kecamatan: string;
  no: number;
  namaPeternak: string;
  desaKelurahan: string;
  noHp: string;
  titikKoordinatRaw: string;
  lat: number | null;
  lng: number | null;
  hasValidCoordinate: boolean;
}

export interface OfficerDuty {
  date: Date;
  dateString: string;
  officer: 'Christian' | 'Ragil' | 'Alamsyah';
  isWeekend: boolean;
  dayName: string;
}

export interface GarduBebanDetail {
  no: number;
  nama: string;
  namaGdMaip: string;
  penyulang: string; // Kolom K PENYULANG
  keypoint: string; // Kolom M KEYPOINT
  zonaProteksi?: string;
  kvaTrafo: number;
  bebanKv: number; // Kolom AB BEBAN (KV)
  bebanPersen: number; // Kolom AA BEBAN (%)
  statusBeban: 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD' | 'TIDAK TERDEFINISI';
  fasaTrafo: number | string;
  konstruksi: string;
  alamat: string;
  jurusan: string;
  ir: number;
  is: number;
  it: number;
  in: number;
  pic: string;
}

export interface PenyulangBebanItem {
  keypoint: string; // Ambil dari Kolom M "KEYPOINT"
  penyulangInduk: string; // Ambil dari Kolom K "PENYULANG"
  totalGardu: number;
  totalBebanKv: number; // Akumulasi Kolom AB "BEBAN (KV)"
  totalKvaTrafo: number;
  avgBebanKv: number;
  avgBebanPersen: number;
  maxBebanKv: number;
  maxBebanGardu: string;
  overloadCount: number;
  normalCount: number;
  underloadCount: number;
  statusBebanDominan: 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD' | 'TIDAK TERDEFINISI';
  garduList: GarduBebanDetail[];
}

// ==========================================
// MONITORING K3L (KESEHATAN, KESELAMATAN KERJA & LINGKUNGAN)
// ==========================================

export interface SurveyK3Item {
  id: string;
  no: number;
  idSurvey?: string; // ID Survey dari spreadsheet (e.g. Kolom ID SURVEY / ID)
  unit: string;
  jenisTiang: string; // Jenis Tiang (Tiang Beton, Tiang Besi, Tiang Kayu)
  tinggiTiang: string; // Tinggi Tiang (e.g. 11 Meter, 12 Meter, 13 Meter)
  potensiBahaya: string; // Potensi Bahaya
  koordinatRaw: string; // Kolom G / Titik Koordinat Utama
  koordinatLainRaw?: string; // Titik koordinat lain dari spreadsheet
  lat: number | null;
  lng: number | null;
  latLain?: number | null;
  lngLain?: number | null;
  hasValidCoordinate: boolean;
  penyulang?: string;
  lokasi?: string;
  tanggalSurvey?: string;
  surveyor?: string;
  tindakanSaran?: string;
  statusPenanganan?: 'SELESAI' | 'DALAM PROSES' | 'BELUM TINDAK LANJUT';
}

export interface StikerK3Item {
  id: string;
  no: number;
  idStiker?: string; // ID Stiker / ID Rambu dari spreadsheet (e.g. Kolom ID STIKER / ID RAMBU / ID)
  unit: string;
  jenisRambu: string; // Jenis Rambu / Stiker (e.g. Rambu Bahaya Listrik, Rambu Awas Tegangan Tinggi)
  potensiBahaya: string; // Potensi Bahaya
  koordinatRaw: string; // Kolom D / Titik Koordinat Utama
  koordinatLainRaw?: string; // Titik koordinat lain dari spreadsheet
  lat: number | null;
  lng: number | null;
  latLain?: number | null;
  lngLain?: number | null;
  hasValidCoordinate: boolean;
  lokasi?: string;
  kondisiRambu?: string;
  tanggalPasang?: string;
  petugas?: string;
}

export interface CcvItem {
  id: string;
  no: number;
  ulp: string; // Kolom H (Filter: "ULP SINJAI")
  namaObserver: string; // Kolom C (NAMA OBSERVER)
  tanggal?: string;
  lokasiPekerjaan?: string;
  aktivitasPekerjaan?: string;
  jenisPekerjaan?: string;
  kepatuhanApd?: string;
  criticalControl?: string;
  catatanObserver?: string;
  statusKepatuhan?: 'PATUH' | 'TIDAK PATUH' | 'PERLU PERBAIKAN';
  score?: number;
}

export interface CcvObserverRanking {
  namaObserver: string;
  totalCcv: number;
  persentase: number;
  terakhirInput?: string;
  patuhCount: number;
  temuanCount: number;
}

export interface DesaItem {
  id: string;
  no: number;
  namaDesa: string; // Nama Desa / Kelurahan
  kecamatan: string; // Kecamatan
  status: 'SUDAH' | 'BELUM'; // Status Tersurvey / Sosialisasi
  tanggalSosialisasi?: string;
  lokasiKegiatan?: string;
  jumlahPeserta?: number;
  materi?: string;
  petugas?: string;
  kontakKades?: string;
  keterangan?: string;
  rekomendasiJadwal?: string;
  sumberData?: 'DATA' | 'DESA' | 'GABUNGAN';
}

export interface K3LData {
  surveyK3: SurveyK3Item[];
  stikerK3: StikerK3Item[];
  ccv: CcvItem[];
  desaList: DesaItem[];
  summary: {
    totalSurveyK3: number;
    totalSurveyValidCoord: number;
    totalStikerK3: number;
    totalStikerValidCoord: number;
    totalCcv: number;
    topObserver: { nama: string; count: number } | null;
    totalDesa: number;
    desaSudah: number;
    desaBelum: number;
    persenSosialisasi: number;
  };
}

export interface MaterialStockDetail {
  dist: number;
  aga: number;
  te: number;
  total: number;
}

export interface MaterialItem {
  id: string;
  no: number;
  gudang: string;
  noMaterial: string;
  namaMaterial: string;
  satuan: string;
  kategori: string;
  stokAwal: MaterialStockDetail;
  materialMasuk: MaterialStockDetail;
  materialKeluar: MaterialStockDetail;
  stokAkhir: MaterialStockDetail;
  keterangan?: string;
  statusStok: 'READY' | 'HABIS';
}

export interface MaterialSummary {
  totalItem: number;
  totalReadyItem: number;
  totalHabisItem: number;
  totalFisikStokAkhir: number;
  totalFisikStokAwal: number;
  totalFisikMasuk: number;
  totalFisikKeluar: number;
  totalDist: number;
  totalAga: number;
  totalTe: number;
  kategoriBreakdown: { kategori: string; count: number; totalFisik: number }[];
  satuanBreakdown: { satuan: string; count: number; totalFisik: number }[];
}

export interface CustomDataSourceConfig {
  materialGid?: string;
  materialCustomUrl?: string;
  k3Gid?: string;
  k3CustomUrl?: string;
  k3SurveyGid?: string;
  k3StikerGid?: string;
  k3CcvGid?: string;
  googleSheetDocUrl?: string;
}

export interface SheetFetchStatus {
  key: string;
  status: 'IDLE' | 'SUCCESS' | 'ERROR' | 'HTTP_400';
  url: string;
  timestamp?: string;
  rowCount?: number;
  errorMessage?: string;
}



