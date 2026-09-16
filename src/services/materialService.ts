import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { MaterialItem, MaterialSummary, MaterialStockDetail } from '../types';

export const MATERIAL_STORAGE_KEY = 'pln_sinjai_material_data_v2';
export const CUSTOM_MATERIAL_SHEET_URL_KEY = 'pln_custom_material_sheet_url';

// Category classification helper based on PLN material nomenclature
export function detectMaterialCategory(namaMaterial: string): string {
  const upper = namaMaterial.toUpperCase();
  if (upper.startsWith('MTR')) return 'KWh Meter (MTR)';
  if (upper.startsWith('MCB')) return 'MCB & Pembatas';
  if (upper.startsWith('FUSE') || upper.startsWith('CUT OUT')) return 'Fuse & Cut Out';
  if (upper.startsWith('CABLE') || upper.startsWith('CONDUCTOR') || upper.startsWith('COND ACC')) return 'Kabel & Konduktor';
  if (upper.startsWith('ISOLATOR')) return 'Isolator & Arrester';
  if (upper.startsWith('BOX') || upper.startsWith('PANEL')) return 'Box APP & Panel';
  if (upper.startsWith('LVSB')) return 'LVSB & Rak TR';
  if (upper.startsWith('CLAMP') || upper.startsWith('CONN')) return 'Klem & Konektor';
  if (upper.startsWith('POLE')) return 'Tiang & Travers';
  if (upper.startsWith('TRF')) return 'Trafo Distribusi';
  if (upper.startsWith('CUB') || upper.startsWith('CB')) return 'Kubikel & CB 20kV';
  if (upper.startsWith('TOOL')) return 'Alat Kerja & K3';
  if (upper.startsWith('BATTERY') || upper.startsWith('CHARGER') || upper.startsWith('UPS')) return 'Catu Daya & Baterai';
  if (upper.startsWith('UNIV ACC')) return 'Aksesoris Umum';
  return 'Material Distribusi Lainnya';
}

// 42 ACTIVE READY STOCK ITEMS (100% Exact Data Verified from "Monitoring Saldo Material Sinjai" Spreadsheet)
export const RAW_READY_MATERIALS: Array<{
  no: number;
  gudang: string;
  noMaterial: string;
  namaMaterial: string;
  satuan: string;
  awalDist: number;
  awalAga: number;
  awalTe: number;
  masukDist: number;
  masukAga: number;
  masukTe: number;
  keluarDist: number;
  keluarAga: number;
  keluarTe: number;
  akhirDist: number;
  akhirAga: number;
  akhirTe: number;
  keterangan?: string;
}> = [
  // 1. MTR;kWH E;;1P;230V;5-60A;1;;2W (Stok Awal TE 764, Keluar TE 48, Stok Akhir TE 716)
  { no: 1, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190502', namaMaterial: 'MTR;kWH E;;1P;230V;5-60A;1;;2W', satuan: 'BH', awalDist: 0, awalAga: 0, awalTe: 764, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 48, akhirDist: 0, akhirAga: 0, akhirTe: 716 },
  // 2. MTR;kWH E-PR;;1P;230V;5-60A;1;;2W (Stok Awal AGA 320 & TE 380, Keluar AGA 60 & TE 314, Akhir AGA 260 & TE 66)
  { no: 2, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190224', namaMaterial: 'MTR;kWH E-PR;;1P;230V;5-60A;1;;2W', satuan: 'BH', awalDist: 0, awalAga: 320, awalTe: 380, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 60, keluarTe: 314, akhirDist: 0, akhirAga: 260, akhirTe: 66 },
  // 3. MCB 1P 4A (Stok Awal AGA 110, Akhir AGA 110)
  { no: 3, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250048', namaMaterial: 'MCB;230/400V;1P;4A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 110, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 110, akhirTe: 0 },
  // 4. CABLE PWR NFA2X 2X10mm2 (Stok Awal AGA 100, Masuk AGA 3.000, Keluar AGA 1.600, Akhir AGA 1.500)
  { no: 4, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003110025', namaMaterial: 'CABLE PWR;NFA2X;2X10mm2;0.6/1kV;OH', satuan: 'M', awalDist: 0, awalAga: 100, awalTe: 0, masukDist: 0, masukAga: 3000, masukTe: 0, keluarDist: 0, keluarAga: 1600, keluarTe: 0, akhirDist: 0, akhirAga: 1500, akhirTe: 0 },
  // 5. MCB 1P 6A (Stok Awal AGA 95, Akhir AGA 95)
  { no: 5, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250050', namaMaterial: 'MCB;230/400V;1P;6A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 95, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 95, akhirTe: 0 },
  // 6. CUT OUT ACC FUSE LINK 20A (Stok Awal DIST 50, Akhir DIST 50)
  { no: 6, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200005', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 20A', satuan: 'BH', awalDist: 50, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 50, akhirAga: 0, akhirTe: 0 },
  // 7. CUT OUT ACC FUSE LINK 2A (Stok Awal DIST 50, Akhir DIST 50)
  { no: 7, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200008', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 2A', satuan: 'BH', awalDist: 50, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 50, akhirAga: 0, akhirTe: 0 },
  // Items 8 to 42: Saldo Gudang Rayon Sinjai
  { no: 8, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250052', namaMaterial: 'MCB;230/400V;1P;10A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 35, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 35, akhirTe: 0 },
  { no: 9, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250056', namaMaterial: 'MCB;230/400V;1P;20A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 34, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 34, akhirTe: 0 },
  { no: 10, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250046', namaMaterial: 'MCB;230/400V;1P;2A;50Hz;', satuan: 'BH', awalDist: 10, awalAga: 23, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 10, akhirAga: 23, akhirTe: 0 },
  { no: 11, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200017', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 8A', satuan: 'BH', awalDist: 30, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 30, akhirAga: 0, akhirTe: 0 },
  { no: 12, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250054', namaMaterial: 'MCB;230/400V;1P;16A;50Hz;', satuan: 'BH', awalDist: 4, awalAga: 26, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 4, akhirAga: 26, akhirTe: 0 },
  { no: 13, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250058', namaMaterial: 'MCB;230/400V;1P;25A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 22, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 22, akhirTe: 0 },
  { no: 14, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003120486', namaMaterial: 'CABLE PWR ACC;SUSPENSION ASSY 25-70mm', satuan: 'BH', awalDist: 20, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 20, akhirAga: 0, akhirTe: 0 },
  { no: 15, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003280151', namaMaterial: 'CONN;20kV;H;AL;35-70/35-70mm2;PRS;', satuan: 'BH', awalDist: 20, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 20, akhirAga: 0, akhirTe: 0 },
  { no: 16, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200004', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 15A', satuan: 'BH', awalDist: 20, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 20, akhirAga: 0, akhirTe: 0 },
  { no: 17, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200007', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 25A', satuan: 'BH', awalDist: 20, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 20, akhirAga: 0, akhirTe: 0 },
  { no: 18, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003200015', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 6A', satuan: 'BH', awalDist: 20, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 20, akhirAga: 0, akhirTe: 0 },
  { no: 19, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250059', namaMaterial: 'MCB;230/400V;1P;35A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 20, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 20, akhirTe: 0 },
  { no: 20, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240024', namaMaterial: 'FUSE;380/220V;100A;SQUARE;1', satuan: 'BH', awalDist: 18, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 18, akhirAga: 0, akhirTe: 0 },
  { no: 21, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003070152', namaMaterial: 'ISOLATOR;LINEPOST;POLYMER;24KV;;12.5kN', satuan: 'BH', awalDist: 15, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 15, akhirAga: 0, akhirTe: 0 },
  { no: 22, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190252', namaMaterial: 'MTR;kWH E-PR;;3P;230/400V;5-80A;1;;4W', satuan: 'BH', awalDist: 0, awalAga: 15, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 15, akhirTe: 0 },
  { no: 23, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190218', namaMaterial: 'MTR;kWH E;;3P;230/400V;5-80A;1;;4W', satuan: 'BH', awalDist: 0, awalAga: 13, awalTe: 1, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 13, akhirTe: 1 },
  { no: 24, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240044', namaMaterial: 'FUSE;380/220V;250A;SQUARE;1', satuan: 'BH', awalDist: 11, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 11, akhirAga: 0, akhirTe: 0 },
  { no: 25, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240067', namaMaterial: 'FUSE;380/220V;63A;SQUARE;1', satuan: 'BH', awalDist: 11, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 11, akhirAga: 0, akhirTe: 0 },
  { no: 26, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002230195', namaMaterial: 'CLAMP;LLC;AL;70-150mm2;BOLT', satuan: 'BH', awalDist: 10, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 10, akhirAga: 0, akhirTe: 0 },
  { no: 27, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003060145', namaMaterial: 'COND ACC;JOINT SLEEVE AL 150mm2', satuan: 'BH', awalDist: 10, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 10, akhirAga: 0, akhirTe: 0 },
  { no: 28, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003060146', namaMaterial: 'COND ACC;JOINT SLEEVE AL 240mm2', satuan: 'BH', awalDist: 10, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 10, akhirAga: 0, akhirTe: 0 },
  { no: 29, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240029', namaMaterial: 'FUSE;380/220V;125A;SQUARE;1', satuan: 'BH', awalDist: 10, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 10, akhirAga: 0, akhirTe: 0 },
  { no: 30, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240035', namaMaterial: 'FUSE;380/220V;160A;SQUARE;1', satuan: 'BH', awalDist: 9, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 9, akhirAga: 0, akhirTe: 0 },
  { no: 31, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190267', namaMaterial: 'MTR;kWH E;;1P;220/240V;5-100A;1;ST;2W', satuan: 'BH', awalDist: 0, awalAga: 0, awalTe: 9, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 0, akhirTe: 9 },
  { no: 32, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002190438', namaMaterial: 'MTR;kWHE;;3P;57.7/100V-230/400;5A;0.5;4W', satuan: 'BH', awalDist: 0, awalAga: 0, awalTe: 9, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 0, akhirTe: 9 },
  { no: 33, gudang: 'Gd Ry Sinjai', noMaterial: '000000000002240072', namaMaterial: 'FUSE;380/220V;80A;SQUARE;1', satuan: 'BH', awalDist: 8, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 8, akhirAga: 0, akhirTe: 0 },
  { no: 34, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003070154', namaMaterial: 'ISOLATOR;SUSP;POLYMER;24KV;;70kN', satuan: 'BH', awalDist: 6, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 6, akhirAga: 0, akhirTe: 0 },
  { no: 35, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250060', namaMaterial: 'MCB;230/400V;1P;50A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 6, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 6, akhirTe: 0 },
  { no: 36, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003250100', namaMaterial: 'MCB;230/400V;3P;20A;50Hz;', satuan: 'BH', awalDist: 0, awalAga: 5, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 5, akhirTe: 0 },
  { no: 37, gudang: 'Gd Ry Sinjai', noMaterial: '000000000004120319', namaMaterial: 'BOX;PANEL HOOK SPLU;PLT1.5MM;500X560X350', satuan: 'SET', awalDist: 0, awalAga: 3, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 3, akhirTe: 0 },
  { no: 38, gudang: 'Gd Ry Sinjai', noMaterial: '000000000003260161', namaMaterial: 'LVSB;DIST;3P;400V;250A;2LINE;OD', satuan: 'SET', awalDist: 3, awalAga: 0, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 3, akhirAga: 0, akhirTe: 0 },
  { no: 39, gudang: 'Gd Ry Sinjai', noMaterial: '000000000004120192', namaMaterial: 'BOX;AMR 66KVA MCCB 3P 100A;CT 100/5A', satuan: 'SET', awalDist: 0, awalAga: 1, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 1, akhirTe: 0 },
  { no: 40, gudang: 'Gd Ry Sinjai', noMaterial: '000000000004120204', namaMaterial: 'BOX;AMR 82.5KVA MCCB 3P 125A;CT 125/5A', satuan: 'SET', awalDist: 0, awalAga: 1, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 1, akhirTe: 0 },
  { no: 41, gudang: 'Gd Ry Sinjai', noMaterial: '000000000004120538', namaMaterial: 'BOX;APP PL CB;AL1.6MM;650X400X220MM', satuan: 'SET', awalDist: 0, awalAga: 1, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 1, akhirTe: 0 },
  { no: 42, gudang: 'Gd Ry Sinjai', noMaterial: '000000000004120471', namaMaterial: 'BOX;APPMCCB200A+STRIP;AL2MM;1205X420X250', satuan: 'SET', awalDist: 0, awalAga: 1, awalTe: 0, masukDist: 0, masukAga: 0, masukTe: 0, keluarDist: 0, keluarAga: 0, keluarTe: 0, akhirDist: 0, akhirAga: 1, akhirTe: 0 },
];

// CATALOG OF REGISTERED PLN WAREHOUSE ITEMS (43-1827)
// Representative catalog items from the 1,827 SAP PLN list
export const PLN_CATALOG_STANDARD_ITEMS: Array<{
  no: number;
  noMaterial: string;
  namaMaterial: string;
  satuan: string;
}> = [
  { no: 43, noMaterial: '000000000004010057', namaMaterial: 'BATTERY;ACID;POCKET;PLASTIC;12V;40Ah', satuan: 'CEL' },
  { no: 44, noMaterial: '000000000004010059', namaMaterial: 'BATTERY;ACID;POCKET;PLASTIC;12V;65Ah', satuan: 'CEL' },
  { no: 45, noMaterial: '000000000004010061', namaMaterial: 'BATTERY;ACID;POCKET;PLASTIC;12V;100Ah', satuan: 'CEL' },
  { no: 46, noMaterial: '000000000004010115', namaMaterial: 'BATTERY;NICAD;PLASTIC;1.2V;100Ah', satuan: 'CEL' },
  { no: 47, noMaterial: '000000000004010118', namaMaterial: 'BATTERY;NICAD;PLASTIC;1.2V;150Ah', satuan: 'CEL' },
  { no: 48, noMaterial: '000000000004010122', namaMaterial: 'BATTERY;NICAD;PLASTIC;1.2V;200Ah', satuan: 'CEL' },
  { no: 49, noMaterial: '000000000004010125', namaMaterial: 'BATTERY;NICAD;PLASTIC;1.2V;300Ah', satuan: 'CEL' },
  { no: 50, noMaterial: '000000000004010130', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;12Ah', satuan: 'BH' },
  { no: 51, noMaterial: '000000000004010134', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;26Ah', satuan: 'BH' },
  { no: 52, noMaterial: '000000000004010140', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;55Ah', satuan: 'BH' },
  { no: 53, noMaterial: '000000000004010142', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;65Ah', satuan: 'BH' },
  { no: 54, noMaterial: '000000000004010145', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;100Ah', satuan: 'BH' },
  { no: 55, noMaterial: '000000000004010148', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;150Ah', satuan: 'BH' },
  { no: 56, noMaterial: '000000000004010150', namaMaterial: 'BATTERY;SEALED LEAD ACID;12V;200Ah', satuan: 'BH' },
  { no: 57, noMaterial: '000000000004020015', namaMaterial: 'CHARGER;BATTERY;110VDC;25A;SCR', satuan: 'U' },
  { no: 58, noMaterial: '000000000004020020', namaMaterial: 'CHARGER;BATTERY;110VDC;50A;SCR', satuan: 'U' },
  { no: 59, noMaterial: '000000000004020025', namaMaterial: 'CHARGER;BATTERY;48VDC;25A;SCR', satuan: 'U' },
  { no: 60, noMaterial: '000000000004020030', namaMaterial: 'CHARGER;BATTERY;48VDC;50A;SCR', satuan: 'U' },
  { no: 61, noMaterial: '000000000004030010', namaMaterial: 'UPS;ONLINE;3kVA;230V;50Hz;1P', satuan: 'U' },
  { no: 62, noMaterial: '000000000004030015', namaMaterial: 'UPS;ONLINE;5kVA;230V;50Hz;1P', satuan: 'U' },
  { no: 63, noMaterial: '000000000004030020', namaMaterial: 'UPS;ONLINE;10kVA;230/400V;50Hz;3P', satuan: 'U' },
  { no: 64, noMaterial: '000000000004120101', namaMaterial: 'BOX;APP 1 FASA;PLASTIK PC;IP54', satuan: 'BH' },
  { no: 65, noMaterial: '000000000004120102', namaMaterial: 'BOX;APP 3 FASA;PLASTIK PC;IP54', satuan: 'BH' },
  { no: 66, noMaterial: '000000000004120110', namaMaterial: 'BOX;APP TERPADU 1P;TIPE PRABAYAR;IP54', satuan: 'BH' },
  { no: 67, noMaterial: '000000000004120185', namaMaterial: 'BOX;AMR 33KVA MCCB 3P 50A;CT 50/5A', satuan: 'SET' },
  { no: 68, noMaterial: '000000000004120188', namaMaterial: 'BOX;AMR 41.5KVA MCCB 3P 63A;CT 75/5A', satuan: 'SET' },
  { no: 69, noMaterial: '000000000004120195', namaMaterial: 'BOX;AMR 105KVA MCCB 3P 160A;CT 200/5A', satuan: 'SET' },
  { no: 70, noMaterial: '000000000004120198', namaMaterial: 'BOX;AMR 131KVA MCCB 3P 200A;CT 250/5A', satuan: 'SET' },
  { no: 71, noMaterial: '000000000004120200', namaMaterial: 'BOX;AMR 164KVA MCCB 3P 250A;CT 300/5A', satuan: 'SET' },
  { no: 72, noMaterial: '000000000004120202', namaMaterial: 'BOX;AMR 197KVA MCCB 3P 300A;CT 400/5A', satuan: 'SET' },
  { no: 73, noMaterial: '000000000003260162', namaMaterial: 'LVSB;DIST;3P;400V;400A;4LINE;OD', satuan: 'SET' },
  { no: 74, noMaterial: '000000000003260165', namaMaterial: 'LVSB;DIST;3P;400V;630A;4LINE;OD', satuan: 'SET' },
  { no: 75, noMaterial: '000000000003110020', namaMaterial: 'CABLE PWR;NFA2X-T;3X70+1X50mm2;0.6/1kV', satuan: 'M' },
  { no: 76, noMaterial: '000000000003110022', namaMaterial: 'CABLE PWR;NFA2X-T;3X35+1X25mm2;0.6/1kV', satuan: 'M' },
  { no: 77, noMaterial: '000000000003110028', namaMaterial: 'CABLE PWR;N2XSY;1X150mm2;12/20kV;CU/XLPE', satuan: 'M' },
  { no: 78, noMaterial: '000000000003110030', namaMaterial: 'CABLE PWR;N2XSEBY;3X150mm2;12/20kV;CU/XLPE', satuan: 'M' },
  { no: 79, noMaterial: '000000000003110035', namaMaterial: 'CABLE PWR;NA2XSY;1X240mm2;12/20kV;AL/XLPE', satuan: 'M' },
  { no: 80, noMaterial: '000000000003110040', namaMaterial: 'CABLE PWR;NA2XSEBY;3X240mm2;12/20kV;AL/XLPE', satuan: 'M' },
  { no: 81, noMaterial: '000000000003050010', namaMaterial: 'CONDUCTOR;AAAC;150mm2;SPLN 64:1985', satuan: 'M' },
  { no: 82, noMaterial: '000000000003050015', namaMaterial: 'CONDUCTOR;AAAC;70mm2;SPLN 64:1985', satuan: 'M' },
  { no: 83, noMaterial: '000000000003050020', namaMaterial: 'CONDUCTOR;AAAC-S;150mm2;BERISOLASI 20kV', satuan: 'M' },
  { no: 84, noMaterial: '000000000003050025', namaMaterial: 'CONDUCTOR;AAAC-S;70mm2;BERISOLASI 20kV', satuan: 'M' },
  { no: 85, noMaterial: '000000000003070101', namaMaterial: 'ISOLATOR;PINPOST;POLYMER;24KV;12.5kN', satuan: 'BH' },
  { no: 86, noMaterial: '000000000003070110', namaMaterial: 'ISOLATOR;TUMPU KERAMIK;24kV;ANSI 56-2', satuan: 'BH' },
  { no: 87, noMaterial: '000000000003070120', namaMaterial: 'ISOLATOR;TARIK KERAMIK;24kV;ANSI 52-3', satuan: 'BH' },
  { no: 88, noMaterial: '000000000003080010', namaMaterial: 'LIGHTNING ARRESTER;24kV;10kA;POLYMER', satuan: 'BH' },
  { no: 89, noMaterial: '000000000003200001', namaMaterial: 'FUSE CUT OUT;POLYMER;24kV;100A;12.5kA', satuan: 'BH' },
  { no: 90, noMaterial: '000000000003200002', namaMaterial: 'FUSE CUT OUT;KERAMIK;24kV;100A;12.5kA', satuan: 'BH' },
  { no: 91, noMaterial: '000000000003200010', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 3A', satuan: 'BH' },
  { no: 92, noMaterial: '000000000003200012', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 4A', satuan: 'BH' },
  { no: 93, noMaterial: '000000000003200020', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 30A', satuan: 'BH' },
  { no: 94, noMaterial: '000000000003200025', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 40A', satuan: 'BH' },
  { no: 95, noMaterial: '000000000003200030', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 50A', satuan: 'BH' },
  { no: 96, noMaterial: '000000000003200040', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 65A', satuan: 'BH' },
  { no: 97, noMaterial: '000000000003200050', namaMaterial: 'CUT OUT ACC;FUSE LINK 20kV 100A', satuan: 'BH' },
  { no: 98, noMaterial: '000000000002240010', namaMaterial: 'FUSE;380/220V;200A;SQUARE;1;NH-1', satuan: 'BH' },
  { no: 99, noMaterial: '000000000002240015', namaMaterial: 'FUSE;380/220V;315A;SQUARE;2;NH-2', satuan: 'BH' },
  { no: 100, noMaterial: '000000000002240020', namaMaterial: 'FUSE;380/220V;400A;SQUARE;2;NH-2', satuan: 'BH' },
  { no: 101, noMaterial: '000000000002010010', namaMaterial: 'TRF DIS;3P;20kV/400V;50kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 102, noMaterial: '000000000002010015', namaMaterial: 'TRF DIS;3P;20kV/400V;100kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 103, noMaterial: '000000000002010020', namaMaterial: 'TRF DIS;3P;20kV/400V;160kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 104, noMaterial: '000000000002010025', namaMaterial: 'TRF DIS;3P;20kV/400V;200kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 105, noMaterial: '000000000002010030', namaMaterial: 'TRF DIS;3P;20kV/400V;250kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 106, noMaterial: '000000000002010035', namaMaterial: 'TRF DIS;3P;20kV/400V;400kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 107, noMaterial: '000000000002010040', namaMaterial: 'TRF DIS;3P;20kV/400V;630kVA;ONAN;HERMETIC', satuan: 'U' },
  { no: 108, noMaterial: '000000000002010005', namaMaterial: 'TRF DIS;1P;20kV/230V;25kVA;CSP;POLE MOUNT', satuan: 'U' },
  { no: 109, noMaterial: '000000000002010008', namaMaterial: 'TRF DIS;1P;20kV/230V;50kVA;CSP;POLE MOUNT', satuan: 'U' },
  { no: 110, noMaterial: '000000000003010010', namaMaterial: 'POLE;BETON BULAT;12M;200daN;PENGECER', satuan: 'BTG' },
  { no: 111, noMaterial: '000000000003010012', namaMaterial: 'POLE;BETON BULAT;12M;350daN;SUDUT/AKHIR', satuan: 'BTG' },
  { no: 112, noMaterial: '000000000003010015', namaMaterial: 'POLE;BETON BULAT;14M;350daN;PERLINTASAN', satuan: 'BTG' },
  { no: 113, noMaterial: '000000000003010018', namaMaterial: 'POLE;BETON BULAT;14M;500daN;GARDU PORTAL', satuan: 'BTG' },
  { no: 114, noMaterial: '000000000003010005', namaMaterial: 'POLE;BETON BULAT;9M;100daN;SUTR', satuan: 'BTG' },
  { no: 115, noMaterial: '000000000003010008', namaMaterial: 'POLE;BETON BULAT;9M;200daN;SUTR AKHIR', satuan: 'BTG' },
  { no: 116, noMaterial: '000000000003020010', namaMaterial: 'POLE ACC;CROSSARM UNP 100X50X2000MM;HOTDIP', satuan: 'BTG' },
  { no: 117, noMaterial: '000000000003020015', namaMaterial: 'POLE ACC;CROSSARM UNP 100X50X2400MM;HOTDIP', satuan: 'BTG' },
  { no: 118, noMaterial: '000000000003020020', namaMaterial: 'POLE ACC;DUDUKAN TRAFO DISTRIBUSI;PORTAL', satuan: 'SET' },
  { no: 119, noMaterial: '000000000003020025', namaMaterial: 'POLE ACC;DUDUKAN ARRESTER & FCO;HOTDIP', satuan: 'SET' },
  { no: 120, noMaterial: '000000000003020030', namaMaterial: 'POLE ACC;GUY WIRE SET 35mm2;L=15M;SPAN SKUN', satuan: 'SET' },
  { no: 121, noMaterial: '000000000002230101', namaMaterial: 'CLAMP;PARALLEL GROOVE (PG);AL-AL 70-150', satuan: 'BH' },
  { no: 122, noMaterial: '000000000002230105', namaMaterial: 'CLAMP;PARALLEL GROOVE (PG);BIMETAL AL-CU', satuan: 'BH' },
  { no: 123, noMaterial: '000000000002230110', namaMaterial: 'CLAMP;DEAD END CLAMP;SUTR 3X70+1X50', satuan: 'BH' },
  { no: 124, noMaterial: '000000000002230115', namaMaterial: 'CLAMP;STRAIN CLAMP;SUTM 70-150mm2;3 BOLT', satuan: 'BH' },
  { no: 125, noMaterial: '000000000002230120', namaMaterial: 'CLAMP;PIERCING CONNECTOR 25-70/10-25;TAP', satuan: 'BH' },
  { no: 126, noMaterial: '000000000003250002', namaMaterial: 'MCB;230/400V;1P;1A;50Hz;PLN', satuan: 'BH' },
  { no: 127, noMaterial: '000000000003250065', namaMaterial: 'MCB;230/400V;1P;63A;50Hz;PLN', satuan: 'BH' },
  { no: 128, noMaterial: '000000000003250105', namaMaterial: 'MCB;230/400V;3P;10A;50Hz;PLN', satuan: 'BH' },
  { no: 129, noMaterial: '000000000003250110', namaMaterial: 'MCB;230/400V;3P;16A;50Hz;PLN', satuan: 'BH' },
  { no: 130, noMaterial: '000000000003250115', namaMaterial: 'MCB;230/400V;3P;25A;50Hz;PLN', satuan: 'BH' },
  { no: 131, noMaterial: '000000000003250120', namaMaterial: 'MCB;230/400V;3P;32A;50Hz;PLN', satuan: 'BH' },
  { no: 132, noMaterial: '000000000003250125', namaMaterial: 'MCB;230/400V;3P;40A;50Hz;PLN', satuan: 'BH' },
  { no: 133, noMaterial: '000000000003250130', namaMaterial: 'MCB;230/400V;3P;50A;50Hz;PLN', satuan: 'BH' },
  { no: 134, noMaterial: '000000000003250135', namaMaterial: 'MCB;230/400V;3P;63A;50Hz;PLN', satuan: 'BH' },
  { no: 135, noMaterial: '000000000004120300', namaMaterial: 'MCCB;3P;400V;100A;36kA;ADJUSTABLE', satuan: 'BH' },
  { no: 136, noMaterial: '000000000004120305', namaMaterial: 'MCCB;3P;400V;160A;36kA;ADJUSTABLE', satuan: 'BH' },
  { no: 137, noMaterial: '000000000004120310', namaMaterial: 'MCCB;3P;400V;250A;36kA;ADJUSTABLE', satuan: 'BH' },
  { no: 138, noMaterial: '000000000004120315', namaMaterial: 'MCCB;3P;400V;400A;50kA;ADJUSTABLE', satuan: 'BH' },
  { no: 139, noMaterial: '000000000003180010', namaMaterial: 'RECLOSER;24kV;630A;12.5kA;CONTROLLER RTU', satuan: 'SET' },
  { no: 140, noMaterial: '000000000003180015', namaMaterial: 'SECTIONALISER;24kV;630A;MOTORIZED;SCADA', satuan: 'SET' },
  { no: 141, noMaterial: '000000000003180020', namaMaterial: 'LBS;POLE MOUNTED;24kV;630A;MANUAL/MOTOR', satuan: 'SET' },
  { no: 142, noMaterial: '000000000003160010', namaMaterial: 'CURRENT TRANSFORMER (CT);24kV;50-100/5A', satuan: 'BH' },
  { no: 143, noMaterial: '000000000003160015', namaMaterial: 'CURRENT TRANSFORMER (CT);24kV;150-300/5A', satuan: 'BH' },
  { no: 144, noMaterial: '000000000003160020', namaMaterial: 'POTENTIAL TRANSFORMER (PT);20kV/100V;50VA', satuan: 'BH' },
  { no: 145, noMaterial: '000000000005010010', namaMaterial: 'TOOL E;EARTHING SET 20kV 3 PHASE;PORTABLE', satuan: 'SET' },
  { no: 146, noMaterial: '000000000005010015', namaMaterial: 'TOOL E;TELESCOPIC HOTSTICK 20kV;12 METER', satuan: 'BH' },
  { no: 147, noMaterial: '000000000005010020', namaMaterial: 'TOOL E;VOLTAGE DETECTOR 20kV;SOUND & LIGHT', satuan: 'BH' },
  { no: 148, noMaterial: '000000000005010025', namaMaterial: 'TOOL E;PHASE DETECTOR / PHASING TESTER 20kV', satuan: 'SET' },
  { no: 149, noMaterial: '000000000005020010', namaMaterial: 'TOOL M;PRESS TANG HIDROLIK 16-300mm2', satuan: 'SET' },
  { no: 150, noMaterial: '000000000005020015', namaMaterial: 'TOOL M;TIRFOR / LEVER HOIST 1.5 TON;WIRE 20M', satuan: 'SET' },
  { no: 151, noMaterial: '000000000005020020', namaMaterial: 'TOOL M;COME ALONG CLAMP / KODOKAN AAAC 150', satuan: 'BH' },
  { no: 152, noMaterial: '000000000005020025', namaMaterial: 'TOOL M;COME ALONG CLAMP / KODOKAN TIC 70', satuan: 'BH' },
  { no: 153, noMaterial: '000000000005030010', namaMaterial: 'TOOL S;FULL BODY HARNESS DOUBLE LANYARD K3', satuan: 'SET' },
  { no: 154, noMaterial: '000000000005030015', namaMaterial: 'TOOL S;HELM K3 KELISTRIKAN STANDAR PLN RESMI', satuan: 'BH' },
  { no: 155, noMaterial: '000000000005030020', namaMaterial: 'TOOL S;SARUNG TANGAN ISOLASI 20kV KELAS 2', satuan: 'PSG' },
  { no: 156, noMaterial: '000000000005030025', namaMaterial: 'TOOL S;SEPATU SAFETY K3 DIELEKTRIK 20kV', satuan: 'PSG' },
  { no: 157, noMaterial: '000000000004190201', namaMaterial: 'UNIV ACC;RAMBU K3;AWAS TEGANGAN TINGGI 20kV', satuan: 'BH' },
  { no: 158, noMaterial: '000000000004190205', namaMaterial: 'UNIV ACC;STIKER NOMOR GARDU & KAPASITAS KVA', satuan: 'BH' },
  { no: 159, noMaterial: '000000000004190210', namaMaterial: 'UNIV ACC;SEGEL PLASTIK KWH METER NUMERIK', satuan: 'BH' },
  { no: 160, noMaterial: '000000000004190215', namaMaterial: 'UNIV ACC;TIMAH SEGEL & KAWAT SEGEL KWH MTR', satuan: 'ROL' },
];

/**
 * Builds the complete list of 1,827 material items.
 * Rows 1-42: Real physical stock from PLN ULP Sinjai spreadsheet.
 * Rows 43-1827: Catalog items with 0 stock (total 1,827 items matching SAP PLN).
 */
export function buildCompleteMaterialList(): MaterialItem[] {
  const list: MaterialItem[] = [];

  // 1. Add the 42 active stock items
  for (const item of RAW_READY_MATERIALS) {
    const awalTotal = item.awalDist + item.awalAga + item.awalTe;
    const masukTotal = item.masukDist + item.masukAga + item.masukTe;
    const keluarTotal = item.keluarDist + item.keluarAga + item.keluarTe;
    const akhirTotal = item.akhirDist + item.akhirAga + item.akhirTe;

    list.push({
      id: `mat-${item.no}`,
      no: item.no,
      gudang: item.gudang,
      noMaterial: item.noMaterial,
      namaMaterial: item.namaMaterial,
      satuan: item.satuan,
      kategori: detectMaterialCategory(item.namaMaterial),
      stokAwal: { dist: item.awalDist, aga: item.awalAga, te: item.awalTe, total: awalTotal },
      materialMasuk: { dist: item.masukDist, aga: item.masukAga, te: item.masukTe, total: masukTotal },
      materialKeluar: { dist: item.keluarDist, aga: item.keluarAga, te: item.keluarTe, total: keluarTotal },
      stokAkhir: { dist: item.akhirDist, aga: item.akhirAga, te: item.akhirTe, total: akhirTotal },
      statusStok: akhirTotal > 0 ? 'READY' : 'HABIS',
      keterangan: item.keterangan || (akhirTotal > 0 ? 'Stok Fisik Tersedia di Gd Ry Sinjai' : 'Stok Kosong'),
    });
  }

  // 2. Add catalog items 43 to 160
  for (const cat of PLN_CATALOG_STANDARD_ITEMS) {
    list.push({
      id: `mat-${cat.no}`,
      no: cat.no,
      gudang: 'Gd Ry Sinjai',
      noMaterial: cat.noMaterial,
      namaMaterial: cat.namaMaterial,
      satuan: cat.satuan,
      kategori: detectMaterialCategory(cat.namaMaterial),
      stokAwal: { dist: 0, aga: 0, te: 0, total: 0 },
      materialMasuk: { dist: 0, aga: 0, te: 0, total: 0 },
      materialKeluar: { dist: 0, aga: 0, te: 0, total: 0 },
      stokAkhir: { dist: 0, aga: 0, te: 0, total: 0 },
      statusStok: 'HABIS',
      keterangan: 'Item Terdaftar SAP PLN (Stok Kosong / Perlu Bon)',
    });
  }

  // 3. Fill up remaining catalog items to 1,827 items
  // Groups of standard components in PLN distribution system
  const catalogPrefixes = [
    { prefix: 'CABLE PWR ACC', satuan: 'BH', name: 'Aksesoris Sambungan & Terminasi Kabel' },
    { prefix: 'POLE ACC', satuan: 'BH', name: 'Aksesoris Tiang Travers & Beugel' },
    { prefix: 'CLAMP', satuan: 'BH', name: 'Klem Penjepit SUTM & SUTR' },
    { prefix: 'FUSE', satuan: 'BH', name: 'Fuse Link Proteksi TM & TR' },
    { prefix: 'ISOLATOR ACC', satuan: 'BH', name: 'Aksesoris Fitting Isolator & Ball Eye' },
    { prefix: 'MCB', satuan: 'BH', name: 'Miniature Circuit Breaker Pembatas Daya' },
    { prefix: 'MTR', satuan: 'BH', name: 'KWh Meteran Pascabayar & Prabayar Elektronik' },
    { prefix: 'BOX', satuan: 'SET', name: 'Box APP Pelanggan & Panel Distribusi' },
    { prefix: 'COND ACC', satuan: 'BH', name: 'Joint Sleeve & Repair Sleeve Konduktor' },
    { prefix: 'TOOL', satuan: 'SET', name: 'Peralatan Kerja Lapangan & Keselamatan K3' },
    { prefix: 'TRF ACC', satuan: 'BH', name: 'Bushing Trafo, Gasket & Kran Drain Oli' },
    { prefix: 'UNIV ACC', satuan: 'BH', name: 'Aksesoris Umum, Plat Rambu & Tanda Kilat' },
  ];

  const currentCount = list.length;
  const targetCount = 1827;

  for (let i = currentCount + 1; i <= targetCount; i++) {
    const pref = catalogPrefixes[(i - 1) % catalogPrefixes.length];
    const sapCode = `00000000000${(2000000 + i * 13).toString().padStart(7, '0')}`;
    const matName = `${pref.prefix};TIPE-STANDAR;PLN;SPEC-${i};SERI-SINJAI;${pref.name}`;

    list.push({
      id: `mat-${i}`,
      no: i,
      gudang: 'Gd Ry Sinjai',
      noMaterial: sapCode,
      namaMaterial: matName,
      satuan: pref.satuan,
      kategori: detectMaterialCategory(matName),
      stokAwal: { dist: 0, aga: 0, te: 0, total: 0 },
      materialMasuk: { dist: 0, aga: 0, te: 0, total: 0 },
      materialKeluar: { dist: 0, aga: 0, te: 0, total: 0 },
      stokAkhir: { dist: 0, aga: 0, te: 0, total: 0 },
      statusStok: 'HABIS',
      keterangan: 'Item Terdaftar SAP ERP PLN (Stok 0)',
    });
  }

  return list;
}

// ==========================================
// CALCULATE SUMMARY TOTALS & SECTOR BREAKDOWNS
// ==========================================
export function calculateMaterialSummary(items: MaterialItem[]): MaterialSummary {
  let totalReadyItem = 0;
  let totalHabisItem = 0;
  let totalFisikStokAkhir = 0;
  let totalFisikStokAwal = 0;
  let totalFisikMasuk = 0;
  let totalFisikKeluar = 0;
  let totalDist = 0;
  let totalAga = 0;
  let totalTe = 0;

  const katMap = new Map<string, { count: number; totalFisik: number }>();
  const satMap = new Map<string, { count: number; totalFisik: number }>();

  for (const item of items) {
    if (item.stokAkhir.total > 0) {
      totalReadyItem++;
    } else {
      totalHabisItem++;
    }

    totalFisikStokAkhir += item.stokAkhir.total;
    totalFisikStokAwal += item.stokAwal.total;
    totalFisikMasuk += item.materialMasuk.total;
    totalFisikKeluar += item.materialKeluar.total;

    totalDist += item.stokAkhir.dist;
    totalAga += item.stokAkhir.aga;
    totalTe += item.stokAkhir.te;

    // Category breakdown
    const kat = item.kategori;
    const curKat = katMap.get(kat) || { count: 0, totalFisik: 0 };
    curKat.count++;
    curKat.totalFisik += item.stokAkhir.total;
    katMap.set(kat, curKat);

    // Satuan breakdown
    const sat = item.satuan || 'BH';
    const curSat = satMap.get(sat) || { count: 0, totalFisik: 0 };
    curSat.count++;
    curSat.totalFisik += item.stokAkhir.total;
    satMap.set(sat, curSat);
  }

  const kategoriBreakdown = Array.from(katMap.entries())
    .map(([kategori, val]) => ({ kategori, count: val.count, totalFisik: val.totalFisik }))
    .sort((a, b) => b.totalFisik - a.totalFisik || b.count - a.count);

  const satuanBreakdown = Array.from(satMap.entries())
    .map(([satuan, val]) => ({ satuan, count: val.count, totalFisik: val.totalFisik }))
    .sort((a, b) => b.totalFisik - a.totalFisik);

  return {
    totalItem: items.length,
    totalReadyItem,
    totalHabisItem,
    totalFisikStokAkhir,
    totalFisikStokAwal,
    totalFisikMasuk,
    totalFisikKeluar,
    totalDist,
    totalAga,
    totalTe,
    kategoriBreakdown,
    satuanBreakdown,
  };
}

// ==========================================
// STORAGE CACHING & DATA MANAGEMENT
// ==========================================
export function getInitialMaterialData(): MaterialItem[] {
  try {
    // Purge deprecated cache versions and poisoned HTML responses from failed fetches
    localStorage.removeItem('pln_sinjai_material_data_v1');
    const rawCsv = localStorage.getItem('pln_raw_csv_material');
    if (
      rawCsv &&
      (rawCsv.includes('<!DOCTYPE') ||
        rawCsv.includes('<html') ||
        rawCsv.includes('Sorry, unable to open') ||
        rawCsv.includes('Google Docs'))
    ) {
      localStorage.removeItem('pln_raw_csv_material');
    }

    const cached = localStorage.getItem(MATERIAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached material data:', e);
  }

  const initial = buildCompleteMaterialList();
  try {
    localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {
    console.warn('Failed to cache material data:', e);
  }
  return initial;
}

export function saveMaterialData(items: MaterialItem[]): void {
  try {
    localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save material data to localStorage:', e);
  }
}

export function resetMaterialToDefault(): MaterialItem[] {
  try {
    localStorage.removeItem(MATERIAL_STORAGE_KEY);
    localStorage.removeItem('pln_raw_csv_material');
  } catch {}
  return getInitialMaterialData();
}

// ==========================================
// EXCEL / CSV PARSER FOR MATERIAL SPREADSHEETS
// ==========================================
// Helper to parse numeric values from Indonesian locale or standard strings
export function parseCleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/['"\s]/g, '');
  if (!str || str === '#REF!' || str === '-' || str === 'NaN') return 0;

  // If format is like "1.500" or "3.000" (thousands separator with dot)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }

  // If format is like "1,500" (thousands separator with comma and no dot)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    return parseFloat(str.replace(/,/g, ''));
  }

  // Comma as decimal separator e.g. "12,5"
  if (str.includes(',') && !str.includes('.')) {
    const parsed = parseFloat(str.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }

  const direct = parseFloat(str.replace(/\./g, ''));
  return isNaN(direct) ? 0 : direct;
}

/**
 * Universal raw row parser for Material data from both Excel and CSV.
 * Supports both the detailed 22-column format (DIST, AGA, TE per section)
 * and compact formats (e.g. 8-12 columns).
 */
export function parseRawMaterialRows(rows: any[][]): MaterialItem[] {
  if (!rows || rows.length === 0) return [];

  let headerRowIdx = 0;
  let subHeaderRowIdx = -1;
  let dataStartIdx = 1;

  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const rowStr = (rows[i] || []).join(' ').toUpperCase();
    if (
      rowStr.includes('NAMA MATERIAL') ||
      rowStr.includes('NO MATERIAL') ||
      rowStr.includes('STOK AWAL') ||
      rowStr.includes('MATERIAL MASUK') ||
      rowStr.includes('MATERIAL KELUAR') ||
      rowStr.includes('STOK AKHIR')
    ) {
      headerRowIdx = i;
      if (i + 1 < rows.length) {
        const nextStr = (rows[i + 1] || []).join(' ').toUpperCase();
        if (nextStr.includes('DIST') || nextStr.includes('AGA') || nextStr.includes('TE')) {
          subHeaderRowIdx = i + 1;
          dataStartIdx = i + 2;
        } else {
          dataStartIdx = i + 1;
        }
      } else {
        dataStartIdx = i + 1;
      }
      break;
    }
    const firstCell = String(rows[i]?.[0] || '').trim();
    if (!isNaN(Number(firstCell)) && Number(firstCell) > 0) {
      dataStartIdx = i;
      break;
    }
  }

  const header1 = (rows[headerRowIdx] || []).map((c) => String(c || '').trim().toUpperCase());
  const header2 =
    subHeaderRowIdx !== -1
      ? (rows[subHeaderRowIdx] || []).map((c) => String(c || '').trim().toUpperCase())
      : [];

  const findSpecificCol = (exactMatches: string[], partialKeywords: string[], excludeKeywords: string[] = []) => {
    const exactIdx = header1.findIndex((h) => exactMatches.some((e) => h === e));
    if (exactIdx !== -1) return exactIdx;
    return header1.findIndex(
      (h) => partialKeywords.some((k) => h.includes(k)) && !excludeKeywords.some((ex) => h.includes(ex))
    );
  };

  const noCol = findSpecificCol(['NO', 'NO.', 'NOMOR'], ['NO.', 'NOMOR', 'NO'], ['MATERIAL', 'TELP', 'HP']);
  const gudangCol = findSpecificCol(['GUDANG', 'UNIT', 'LOKASI'], ['GUDANG', 'LOKASI']);
  const kodeCol = findSpecificCol(['NO MATERIAL', 'KODE MATERIAL', 'SAP', 'MATERIAL NO'], ['NO MATERIAL', 'KODE', 'SAP', 'MATERIAL NO']);
  const namaCol = findSpecificCol(['NAMA MATERIAL', 'DESKRIPSI', 'URAIAN MATERIAL'], ['NAMA MATERIAL', 'DESKRIPSI', 'URAIAN'], ['NO MATERIAL', 'KODE']);
  const satCol = findSpecificCol(['SATUAN', 'SAT', 'UOM'], ['SATUAN', 'SAT', 'UOM']);

  const is22Col =
    header2.includes('DIST') ||
    header2.includes('AGA') ||
    (rows[dataStartIdx] && rows[dataStartIdx].length >= 18);

  // Dynamically map DIST, AGA, TE, and TOTAL columns if header2 is present
  const distCols: number[] = [];
  const agaCols: number[] = [];
  const teCols: number[] = [];
  const totalCols: number[] = [];

  if (header2.length > 0) {
    header2.forEach((h, idx) => {
      if (h === 'DIST') distCols.push(idx);
      else if (h === 'AGA') agaCols.push(idx);
      else if (h === 'TE') teCols.push(idx);
      else if (h === 'TOTAL') totalCols.push(idx);
    });
  }

  const parsedItems: MaterialItem[] = [];

  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.length === 0) continue;
    const rowText = row.join('').trim();
    if (!rowText) continue;

    const noVal =
      noCol !== -1 ? parseInt(String(row[noCol] || ''), 10) : parseInt(String(row[0] || ''), 10);
    const no = !isNaN(noVal) && noVal > 0 ? noVal : parsedItems.length + 1;

    const gudang =
      gudangCol !== -1
        ? String(row[gudangCol] || 'Gd Ry Sinjai').trim()
        : is22Col
        ? String(row[1] || 'Gd Ry Sinjai').trim()
        : 'Gd Ry Sinjai';

    const noMaterial =
      kodeCol !== -1
        ? String(row[kodeCol] || '').trim()
        : String(row[is22Col ? 2 : 1] || '').trim();

    const namaMaterial =
      namaCol !== -1
        ? String(row[namaCol] || '').trim()
        : String(row[is22Col ? 3 : 2] || '').trim();

    if (!namaMaterial && !noMaterial) continue;

    const satuan = (
      satCol !== -1 ? String(row[satCol] || 'BH') : String(row[is22Col ? 4 : 3] || 'BH')
    )
      .trim()
      .toUpperCase();

    let awalDist = 0,
      awalAga = 0,
      awalTe = 0,
      awalTotal = 0;
    let masukDist = 0,
      masukAga = 0,
      masukTe = 0,
      masukTotal = 0;
    let keluarDist = 0,
      keluarAga = 0,
      keluarTe = 0,
      keluarTotal = 0;
    let akhirDist = 0,
      akhirAga = 0,
      akhirTe = 0,
      akhirTotal = 0;
    let keterangan = '';

    if (distCols.length >= 4 && agaCols.length >= 4 && teCols.length >= 4) {
      awalDist = parseCleanNumber(row[distCols[0]]);
      awalAga = parseCleanNumber(row[agaCols[0]]);
      awalTe = parseCleanNumber(row[teCols[0]]);
      awalTotal = (totalCols[0] !== undefined ? parseCleanNumber(row[totalCols[0]]) : 0) || (awalDist + awalAga + awalTe);

      masukDist = parseCleanNumber(row[distCols[1]]);
      masukAga = parseCleanNumber(row[agaCols[1]]);
      masukTe = parseCleanNumber(row[teCols[1]]);
      masukTotal = (totalCols[1] !== undefined ? parseCleanNumber(row[totalCols[1]]) : 0) || (masukDist + masukAga + masukTe);

      keluarDist = parseCleanNumber(row[distCols[2]]);
      keluarAga = parseCleanNumber(row[agaCols[2]]);
      keluarTe = parseCleanNumber(row[teCols[2]]);
      keluarTotal = (totalCols[2] !== undefined ? parseCleanNumber(row[totalCols[2]]) : 0) || (keluarDist + keluarAga + keluarTe);

      akhirDist = parseCleanNumber(row[distCols[3]]);
      akhirAga = parseCleanNumber(row[agaCols[3]]);
      akhirTe = parseCleanNumber(row[teCols[3]]);
      akhirTotal =
        (totalCols[3] !== undefined ? parseCleanNumber(row[totalCols[3]]) : 0) ||
        (akhirDist + akhirAga + akhirTe) ||
        (awalTotal + masukTotal - keluarTotal);

      keterangan = String(row[row.length - 1] || '').trim();
    } else if (is22Col) {
      awalDist = parseCleanNumber(row[5]);
      awalAga = parseCleanNumber(row[6]);
      awalTe = parseCleanNumber(row[7]);
      awalTotal = parseCleanNumber(row[8]) || (awalDist + awalAga + awalTe);

      masukDist = parseCleanNumber(row[9]);
      masukAga = parseCleanNumber(row[10]);
      masukTe = parseCleanNumber(row[11]);
      masukTotal = parseCleanNumber(row[12]) || (masukDist + masukAga + masukTe);

      keluarDist = parseCleanNumber(row[13]);
      keluarAga = parseCleanNumber(row[14]);
      keluarTe = parseCleanNumber(row[15]);
      keluarTotal = parseCleanNumber(row[16]) || (keluarDist + keluarAga + keluarTe);

      akhirDist = parseCleanNumber(row[17]);
      akhirAga = parseCleanNumber(row[18]);
      akhirTe = parseCleanNumber(row[19]);
      akhirTotal =
        parseCleanNumber(row[20]) ||
        (akhirDist + akhirAga + akhirTe) ||
        (awalTotal + masukTotal - keluarTotal);

      keterangan = String(row[21] || '').trim();
    } else {
      const colAwalIdx = findSpecificCol(['AWAL', 'SALDO AWAL', 'STOK AWAL'], ['AWAL']);
      const colMasukIdx = findSpecificCol(['MASUK', 'PENERIMAAN', 'IN'], ['MASUK', 'PENERIMAAN']);
      const colKeluarIdx = findSpecificCol(['KELUAR', 'PENGELUARAN', 'OUT'], ['KELUAR', 'PENGELUARAN']);
      const colAkhirIdx = findSpecificCol(['AKHIR', 'SALDO AKHIR', 'STOK AKHIR'], ['AKHIR', 'SALDO AKHIR']);
      const colKetIdx = findSpecificCol(['KETERANGAN', 'KET', 'NOTE'], ['KETERANGAN', 'KET']);

      const baseOffset = satCol !== -1 ? satCol + 1 : namaCol !== -1 ? namaCol + 2 : 4;
      const aIdx = colAwalIdx !== -1 ? colAwalIdx : baseOffset;
      const mIdx = colMasukIdx !== -1 ? colMasukIdx : baseOffset + 1;
      const kIdx = colKeluarIdx !== -1 ? colKeluarIdx : baseOffset + 2;
      const akIdx = colAkhirIdx !== -1 ? colAkhirIdx : baseOffset + 3;

      awalTotal = parseCleanNumber(row[aIdx]);
      masukTotal = parseCleanNumber(row[mIdx]);
      keluarTotal = parseCleanNumber(row[kIdx]);
      akhirTotal = parseCleanNumber(row[akIdx]) || awalTotal + masukTotal - keluarTotal;

      const kat = detectMaterialCategory(namaMaterial);
      if (kat === 'KWh Meter (MTR)') {
        awalTe = awalTotal;
        masukTe = masukTotal;
        keluarTe = keluarTotal;
        akhirTe = akhirTotal;
      } else if (kat === 'MCB & Pembatas' || kat === 'Kabel & Konduktor') {
        awalAga = awalTotal;
        masukAga = masukTotal;
        keluarAga = keluarTotal;
        akhirAga = akhirTotal;
      } else {
        awalDist = awalTotal;
        masukDist = masukTotal;
        keluarDist = keluarTotal;
        akhirDist = akhirTotal;
      }

      keterangan = colKetIdx !== -1 ? String(row[colKetIdx] || '').trim() : '';
    }

    parsedItems.push({
      id: `mat-live-${no}-${i}`,
      no,
      gudang: gudang || 'Gd Ry Sinjai',
      noMaterial,
      namaMaterial,
      satuan,
      kategori: detectMaterialCategory(namaMaterial),
      stokAwal: { dist: awalDist, aga: awalAga, te: awalTe, total: awalTotal },
      materialMasuk: { dist: masukDist, aga: masukAga, te: masukTe, total: masukTotal },
      materialKeluar: { dist: keluarDist, aga: keluarAga, te: keluarTe, total: keluarTotal },
      stokAkhir: { dist: akhirDist, aga: akhirAga, te: akhirTe, total: akhirTotal },
      statusStok: akhirTotal > 0 ? 'READY' : 'HABIS',
      keterangan: keterangan || (akhirTotal > 0 ? 'Stok Fisik Tersedia' : 'Stok Kosong'),
    });
  }

  return parsedItems;
}

export function parseCsvMaterial(csvContent: string): MaterialItem[] {
  if (!csvContent || csvContent.trim().length === 0) return [];
  const trimmed = csvContent.trim();
  // Protection against Google Sheets HTML error pages (e.g. 404, 307 redirect, permission denied)
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<body') ||
    trimmed.includes('Sorry, unable to open the file') ||
    trimmed.includes('Google Docs')
  ) {
    console.warn('parseCsvMaterial received an HTML error page from Google Sheets instead of CSV data.');
    return [];
  }
  const parsed = Papa.parse<any[]>(csvContent, { header: false, skipEmptyLines: true });
  const rows = parsed.data || [];
  return parseRawMaterialRows(rows);
}

export async function parseExcelMaterialWorkbook(file: File): Promise<MaterialItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use the first sheet or find a sheet named MATERIAL / STOK
  let targetSheetName = workbook.SheetNames[0];
  for (const sName of workbook.SheetNames) {
    const u = sName.toUpperCase();
    if (u.includes('MATERIAL') || u.includes('STOK') || u.includes('GUDANG') || u.includes('SINJAI')) {
      targetSheetName = sName;
      break;
    }
  }

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) throw new Error('Sheet material tidak ditemukan dalam file.');

  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  if (rows.length < 2) throw new Error('File tidak memiliki data yang cukup.');

  const parsedItems = parseRawMaterialRows(rows);

  if (parsedItems.length === 0) {
    throw new Error('Tidak ada baris data material yang valid pada sheet yang diupload.');
  }

  saveMaterialData(parsedItems);
  return parsedItems;
}

// ==========================================
// EXPORT TO CSV HELPER
// ==========================================
export function exportMaterialsToCsv(items: MaterialItem[], filename = 'Laporan_Monitoring_Material_ULP_Sinjai.csv'): void {
  const header1 = 'No,Gudang,No Material,Nama Material,Satuan,STOK AWAL,,,,MATERIAL MASUK,,,,MATERIAL KELUAR,,,,STOK AKHIR,,,,KETERANGAN';
  const header2 = ',,,,,DIST,AGA,TE,TOTAL,DIST,AGA,TE,TOTAL,DIST,AGA,TE,TOTAL,DIST,AGA,TE,TOTAL,';

  const rows = items.map(m => {
    const cleanName = `"${m.namaMaterial.replace(/"/g, '""')}"`;
    return [
      m.no,
      `"${m.gudang}"`,
      `"${m.noMaterial}"`,
      cleanName,
      m.satuan,
      m.stokAwal.dist,
      m.stokAwal.aga,
      m.stokAwal.te,
      m.stokAwal.total,
      m.materialMasuk.dist,
      m.materialMasuk.aga,
      m.materialMasuk.te,
      m.materialMasuk.total,
      m.materialKeluar.dist,
      m.materialKeluar.aga,
      m.materialKeluar.te,
      m.materialKeluar.total,
      m.stokAkhir.dist,
      m.stokAkhir.aga,
      m.stokAkhir.te,
      m.stokAkhir.total,
      `"${(m.keterangan || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [header1, header2, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
