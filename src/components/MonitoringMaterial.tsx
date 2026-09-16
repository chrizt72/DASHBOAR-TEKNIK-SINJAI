import React, { useState, useMemo, useRef } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Package,
  Layers,
  ArrowDownToLine,
  Upload,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Building2,
  ShieldCheck,
  Zap,
  Cable,
  Warehouse,
  Flame,
  PieChart,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  BarChart3,
  Settings,
  Link2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { MaterialItem, MaterialSummary } from '../types';
import {
  getInitialMaterialData,
  calculateMaterialSummary,
  parseExcelMaterialWorkbook,
  resetMaterialToDefault,
  exportMaterialsToCsv,
  parseCsvMaterial,
  saveMaterialData,
} from '../services/materialService';
import { normalizeGoogleSheetUrl, fetchCsvWithTimeout } from '../services/sheetService';

interface MonitoringMaterialProps {
  materialList?: MaterialItem[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const MonitoringMaterial: React.FC<MonitoringMaterialProps> = ({
  materialList,
  onRefresh,
  isLoading,
}) => {
  // Main dataset state
  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    if (materialList && materialList.length > 0) return materialList;
    return getInitialMaterialData();
  });

  // Effect to update materials if materialList changes (e.g., from Google Sheets)
  React.useEffect(() => {
    if (materialList && materialList.length > 0) {
      setMaterials(materialList);
    }
  }, [materialList]);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'READY' | 'MTR' | 'MCB' | 'FUSE' | 'CABLE' | 'ISOLATOR' | 'BOX' | 'HABIS'>('ALL');
  const [selectedSatuan, setSelectedSatuan] = useState<string>('ALL');
  const [selectedSektor, setSelectedSektor] = useState<'ALL' | 'DIST' | 'AGA' | 'TE'>('ALL');
  const [sortBy, setSortBy] = useState<'stokDesc' | 'stokAsc' | 'namaAsc' | 'noAsc'>('stokDesc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<MaterialItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheet custom URL & live sync state
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem('pln_custom_material_sheet_url') || '';
    } catch {
      return '';
    }
  });
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Chart view mode: 'masuk' | 'keluar' | 'perbandingan'
  const [chartTab, setChartTab] = useState<'masuk' | 'keluar' | 'perbandingan'>('masuk');

  // Derived summary calculations
  const summary: MaterialSummary = useMemo(() => {
    return calculateMaterialSummary(materials);
  }, [materials]);

  // Dynamic calculations for Key Category Summary Strip directly from spreadsheet data
  const categorySummaryMap = useMemo(() => {
    const map: Record<string, { total: number; unit: string; desc: string }> = {
      'KWh Meter': { total: 0, unit: 'BH', desc: 'Prabayar & Pasca 1P/3P' },
      'MCB & Pembatas': { total: 0, unit: 'BH', desc: '1P 2A s/d 50A & 3P' },
      'Fuse & Cut Out': { total: 0, unit: 'BH', desc: 'Fuse Link 20kV & NH' },
      'Kabel & Konduktor': { total: 0, unit: 'M / BH', desc: 'NFA2X & Suspension' },
      'Isolator & Klem': { total: 0, unit: 'BH', desc: 'Linepost, Susp, Joint AL' },
      'Panel & Box APP': { total: 0, unit: 'SET', desc: 'LVSB 250A, AMR, SPLU' },
    };
    materials.forEach((m) => {
      if (map[m.kategori]) {
        map[m.kategori].total += m.stokAkhir.total;
      }
    });
    return map;
  }, [materials]);

  // List of materials that have incoming movements (Material Masuk)
  const itemsMasuk = useMemo(() => {
    return materials
      .filter((m) => m.materialMasuk.total > 0)
      .sort((a, b) => b.materialMasuk.total - a.materialMasuk.total);
  }, [materials]);

  // List of materials that have outgoing movements (Material Keluar)
  const itemsKeluar = useMemo(() => {
    return materials
      .filter((m) => m.materialKeluar.total > 0)
      .sort((a, b) => b.materialKeluar.total - a.materialKeluar.total);
  }, [materials]);

  // Sektor breakdown for material masuk
  const mutasiMasukBySektor = useMemo(() => {
    let dist = 0, aga = 0, te = 0;
    materials.forEach((m) => {
      dist += m.materialMasuk.dist;
      aga += m.materialMasuk.aga;
      te += m.materialMasuk.te;
    });
    return { dist, aga, te, total: dist + aga + te };
  }, [materials]);

  // Sektor breakdown for material keluar
  const mutasiKeluarBySektor = useMemo(() => {
    let dist = 0, aga = 0, te = 0;
    materials.forEach((m) => {
      dist += m.materialKeluar.dist;
      aga += m.materialKeluar.aga;
      te += m.materialKeluar.te;
    });
    return { dist, aga, te, total: dist + aga + te };
  }, [materials]);

  // Masuk vs Keluar per Category for Recharts
  const categoryMutasiData = useMemo(() => {
    const map = new Map<string, { masuk: number; keluar: number }>();
    materials.forEach((m) => {
      const kat = m.kategori || 'Lainnya';
      const cur = map.get(kat) || { masuk: 0, keluar: 0 };
      cur.masuk += m.materialMasuk.total;
      cur.keluar += m.materialKeluar.total;
      map.set(kat, cur);
    });
    return Array.from(map.entries())
      .map(([kategori, val]) => ({
        name: kategori,
        Masuk: val.masuk,
        Keluar: val.keluar,
        TotalMutasi: val.masuk + val.keluar,
      }))
      .filter((d) => d.TotalMutasi > 0)
      .sort((a, b) => b.TotalMutasi - a.TotalMutasi);
  }, [materials]);

  // Top Masuk Chart data (up to 8 items)
  const topMasukChartData = useMemo(() => {
    return itemsMasuk.slice(0, 8).map((m) => {
      const shortName = m.namaMaterial.length > 20 ? m.namaMaterial.substring(0, 18) + '…' : m.namaMaterial;
      return {
        name: shortName,
        fullName: m.namaMaterial,
        noMaterial: m.noMaterial,
        satuan: m.satuan,
        Total: m.materialMasuk.total,
        DIST: m.materialMasuk.dist,
        AGA: m.materialMasuk.aga,
        TE: m.materialMasuk.te,
      };
    });
  }, [itemsMasuk]);

  // Top Keluar Chart data (up to 8 items)
  const topKeluarChartData = useMemo(() => {
    return itemsKeluar.slice(0, 8).map((m) => {
      const shortName = m.namaMaterial.length > 20 ? m.namaMaterial.substring(0, 18) + '…' : m.namaMaterial;
      return {
        name: shortName,
        fullName: m.namaMaterial,
        noMaterial: m.noMaterial,
        satuan: m.satuan,
        Total: m.materialKeluar.total,
        DIST: m.materialKeluar.dist,
        AGA: m.materialKeluar.aga,
        TE: m.materialKeluar.te,
      };
    });
  }, [itemsKeluar]);

  // Unique satuan list for dropdown
  const uniqueSatuans = useMemo(() => {
    const s = new Set<string>();
    materials.forEach((m) => {
      if (m.satuan) s.add(m.satuan);
    });
    return Array.from(s).sort();
  }, [materials]);

  // Filtered & Sorted items
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((item) => {
        // Tab filter
        if (activeTab === 'READY' && item.stokAkhir.total === 0) return false;
        if (activeTab === 'HABIS' && item.stokAkhir.total > 0) return false;
        if (activeTab === 'MTR' && !item.namaMaterial.toUpperCase().startsWith('MTR')) return false;
        if (activeTab === 'MCB' && !item.namaMaterial.toUpperCase().startsWith('MCB')) return false;
        if (
          activeTab === 'FUSE' &&
          !item.namaMaterial.toUpperCase().startsWith('FUSE') &&
          !item.namaMaterial.toUpperCase().startsWith('CUT OUT')
        )
          return false;
        if (
          activeTab === 'CABLE' &&
          !item.namaMaterial.toUpperCase().startsWith('CABLE') &&
          !item.namaMaterial.toUpperCase().startsWith('COND')
        )
          return false;
        if (activeTab === 'ISOLATOR' && !item.namaMaterial.toUpperCase().startsWith('ISOLATOR')) return false;
        if (activeTab === 'BOX' && !item.namaMaterial.toUpperCase().startsWith('BOX') && !item.namaMaterial.toUpperCase().startsWith('LVSB')) return false;

        // Satuan filter
        if (selectedSatuan !== 'ALL' && item.satuan !== selectedSatuan) return false;

        // Sektor filter
        if (selectedSektor === 'DIST' && item.stokAkhir.dist === 0) return false;
        if (selectedSektor === 'AGA' && item.stokAkhir.aga === 0) return false;
        if (selectedSektor === 'TE' && item.stokAkhir.te === 0) return false;

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesName = item.namaMaterial.toLowerCase().includes(q);
          const matchesCode = item.noMaterial.toLowerCase().includes(q);
          const matchesNo = item.no.toString().includes(q);
          const matchesSatuan = item.satuan.toLowerCase().includes(q);
          const matchesKat = item.kategori.toLowerCase().includes(q);
          return matchesName || matchesCode || matchesNo || matchesSatuan || matchesKat;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'stokDesc') return b.stokAkhir.total - a.stokAkhir.total || a.no - b.no;
        if (sortBy === 'stokAsc') return a.stokAkhir.total - b.stokAkhir.total || a.no - b.no;
        if (sortBy === 'namaAsc') return a.namaMaterial.localeCompare(b.namaMaterial);
        if (sortBy === 'noAsc') return a.no - b.no;
        return 0;
      });
  }, [materials, activeTab, selectedSatuan, selectedSektor, searchTerm, sortBy]);

  // Paginated records
  const totalPages = Math.ceil(filteredMaterials.length / pageSize) || 1;
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, currentPage, pageSize]);

  // Adjust page when filter changes
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    setUploadFeedback(null);

    try {
      const parsed = await parseExcelMaterialWorkbook(file);
      setMaterials(parsed);
      setUploadFeedback({
        type: 'success',
        message: `Berhasil memproses ${parsed.length} baris material dari ${file.name}! Terdeteksi ${parsed.filter((m) => m.stokAkhir.total > 0).length} item dengan stok fisik siap pakai.`,
      });
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFeedback(null);
      }, 2000);
    } catch (err: any) {
      console.error('Material upload error:', err);
      setUploadFeedback({
        type: 'error',
        message: `Gagal membaca spreadsheet: ${err.message || 'Format tidak cocok dengan standar logistik PLN.'}`,
      });
    } finally {
      setIsProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (confirm('Kembalikan data material ke 42 data inventaris fisik terverifikasi Gd Ry Sinjai?')) {
      const def = resetMaterialToDefault();
      setMaterials(def);
      setSyncFeedback({
        type: 'success',
        message: 'Data material berhasil di-reset ke 42 item inventaris fisik siap pakai ULP Sinjai.',
      });
    }
  };

  const handleLiveSync = async (customUrlOverride?: string) => {
    const urlToUse = (customUrlOverride !== undefined ? customUrlOverride : sheetUrlInput).trim();
    setIsLiveSyncing(true);
    setSyncFeedback({ type: 'info', message: 'Menghubungkan ke Google Sheets dan memvalidasi baris material...' });

    try {
      let finalUrl = '';
      if (urlToUse) {
        finalUrl = normalizeGoogleSheetUrl(urlToUse);
        try {
          localStorage.setItem('pln_custom_material_sheet_url', urlToUse);
        } catch {}
      } else {
        try {
          localStorage.removeItem('pln_custom_material_sheet_url');
        } catch {}
        finalUrl =
          'https://docs.google.com/spreadsheets/d/e/2PACX-1vR47zCs1WFP_fsT5O1ml8MtmEo9AmBHTh7Q8Bnquyldge1DgUXHEHJJ-NL57JbWFuv7QdzV5z736gUh/pub?gid=1993230416&single=true&output=csv';
      }

      const csvText = await fetchCsvWithTimeout(finalUrl, 25000, 1);
      const parsed = parseCsvMaterial(csvText);

      if (parsed.length === 0) {
        throw new Error('Data spreadsheet kosong atau format kolom tidak sesuai standar logistik PLN.');
      }

      saveMaterialData(parsed);
      setMaterials(parsed);
      const readyCount = parsed.filter((m) => m.stokAkhir.total > 0).length;
      setSyncFeedback({
        type: 'success',
        message: `Sinkronisasi berhasil! Berhasil membaca ${parsed.length} jenis material (${readyCount} item ready stock).`,
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Material live sync error:', err);
      setSyncFeedback({
        type: 'error',
        message: `Sinkronisasi Google Sheet belum berhasil: ${err.message || 'Koneksi gagal'}. Sistem mempertahankan 42 item data fisik terverifikasi ULP Sinjai.`,
      });
    } finally {
      setIsLiveSyncing(false);
    }
  };

  return (
    <div id="monitoring-material-section" className="space-y-6 animate-fadeIn pb-16">
      {/* 1. HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gudang Rayon Sinjai (Gd Ry Sinjai)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                title="Klik untuk melihat / mengganti URL Google Sheet"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 font-mono transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                <span>{sheetUrlInput ? 'Google Sheet (Custom Link)' : 'Google Sheet (GID: 1993230416)'}</span>
                <Settings className="w-3 h-3 text-cyan-700" />
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>SAP ERP Terkoneksi</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Boxes className="w-6 h-6 text-indigo-600 flex-shrink-0" />
              <span>Monitoring Material & Logistik Gudang</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Pemantauan persediaan stok material fisik ULP Sinjai. Melacak stok awal, mutasi masuk, pemakaian keluar, serta
              alokasi per fungsi akun: <strong>DIST</strong> (Distribusi/Jaringan), <strong>AGA</strong> (Pelayanan Pelanggan/Niaga),
              dan <strong>TE</strong> (Transaksi Energi).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-sync-material-sheet"
              onClick={() => handleLiveSync()}
              disabled={isLiveSyncing || isLoading}
              title="Sinkronisasi Data Langsung dari Google Sheet"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing || isLoading ? 'animate-spin' : ''}`} />
              <span>{isLiveSyncing ? 'Sinkronisasi...' : 'Sinkron Google Sheet'}</span>
            </button>

            <button
              id="btn-config-material-sheet"
              onClick={() => setShowConfigModal(true)}
              title="Konfigurasi URL Google Sheet"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>Pengaturan Link</span>
            </button>

            <button
              id="btn-upload-material-excel"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs hover:shadow cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Spreadsheet</span>
            </button>

            <button
              id="btn-export-material-csv"
              onClick={() => exportMaterialsToCsv(filteredMaterials)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-reset-material"
              onClick={handleReset}
              title="Reset ke data terverifikasi awal (42 item ready)"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Sync Banner Feedback */}
        {syncFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : syncFeedback.type === 'error'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : syncFeedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-cyan-600 flex-shrink-0 animate-spin" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Terdaftar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">TOTAL ITEM</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {summary.totalItem.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Item Terdaftar SAP</div>
        </div>

        {/* KPI 2: Ready Stock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">READY STOK</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
            {summary.totalReadyItem.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">Jenis Material Ready</div>
        </div>

        {/* KPI 3: Fisik Stok Akhir */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">FISIK AKHIR</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 tracking-tight">
            {summary.totalFisikStokAkhir.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1 font-semibold">Total Unit / Meter / Set</div>
        </div>

        {/* KPI 4: Alokasi DIST */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">DIST (JARINGAN)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {summary.totalDist.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Fuse, LVSB, Isolator, Klem</div>
        </div>

        {/* KPI 5: Alokasi AGA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">AGA (PELANGGAN)</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {summary.totalAga.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">MCB, NFA2X, Box AMR/APP</div>
        </div>

        {/* KPI 6: Alokasi TE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">TE (TRANSAKSI ENERGI)</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {summary.totalTe.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">KWh Meter & Transaksi Energi</div>
        </div>
      </div>

      {/* 3. DYNAMIC KEY CATEGORY SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">KWH METER</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['KWh Meter']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">BH</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">Prabayar & Pasca 1P/3P</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">MCB & PEMBATAS</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['MCB & Pembatas']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">BH</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">1P 2A s/d 50A & 3P 20A</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">FUSE & CUT OUT</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['Fuse & Cut Out']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">BH</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">Fuse Link 20kV & Fuse NH</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">KABEL & HANTARAN</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['Kabel & Konduktor']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">M / BH</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">NFA2X 2x10 & Suspension</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">ISOLATOR & KLEM</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['Isolator & Klem']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">BH</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">Linepost, Susp, Joint AL</span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">PANEL & BOX APP</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-slate-800">
              {categorySummaryMap['Panel & Box APP']?.total.toLocaleString('id-ID') || 0}
            </span>
            <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">SET</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">LVSB 250A, AMR, SPLU</span>
        </div>
      </div>

      {/* 3.5. DEDICATED BAGAN MATERIAL MASUK & MATERIAL KELUAR SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                BAGAN MATERIAL MASUK & MATERIAL KELUAR
              </h2>
              <p className="text-xs text-slate-500">
                Visualisasi mutasi logistik pergudangan: item masuk (penerimaan), item keluar (pemakaian), serta perbandingan volume per sektor (DIST / AGA / TE).
              </p>
            </div>
          </div>

          {/* Sub-tab view toggles */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              onClick={() => setChartTab('masuk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartTab === 'masuk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Material Masuk ({itemsMasuk.length})</span>
            </button>

            <button
              onClick={() => setChartTab('keluar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartTab === 'keluar'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Material Keluar ({itemsKeluar.length})</span>
            </button>

            <button
              onClick={() => setChartTab('perbandingan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartTab === 'perbandingan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Perbandingan Kategori</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: MATERIAL MASUK */}
        {chartTab === 'masuk' && (
          <div className="space-y-4">
            {/* Quick Sektor Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-emerald-800 font-mono block">TOTAL FISIK MASUK</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5">
                  {summary.totalFisikMasuk.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-emerald-700">{itemsMasuk.length} jenis material bertambah</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-amber-600 font-mono block">DIST (JARINGAN)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiMasukBySektor.dist.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">Unit material distribusi</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-blue-600 font-mono block">AGA (PELANGGAN)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiMasukBySektor.aga.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">MCB & kabel sambungan</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-purple-600 font-mono block">TE (TRANSAKSI ENERGI)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiMasukBySektor.te.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">KWh meter 1P & 3P</span>
              </div>
            </div>

            {/* Bagan Visual: Recharts Bar Chart & Top Items */}
            {itemsMasuk.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Belum ada catatan material masuk pada data sumber saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Visual Chart */}
                <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Top Material Masuk Terbanyak
                  </h3>
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topMasukChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
                                  <div className="font-bold text-emerald-400">{d.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">SAP: {d.noMaterial}</div>
                                  <div className="text-sm font-black text-white pt-1">
                                    Total Masuk: {d.Total.toLocaleString('id-ID')} {d.satuan}
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] border-t border-slate-800">
                                    <span className="text-amber-400">DIST: {d.DIST}</span>
                                    <span className="text-blue-400">AGA: {d.AGA}</span>
                                    <span className="text-purple-400">TE: {d.TE}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                        />
                        <Bar dataKey="DIST" stackId="a" fill="#f59e0b" name="Distribusi (DIST)" />
                        <Bar dataKey="AGA" stackId="a" fill="#3b82f6" name="Pelanggan (AGA)" />
                        <Bar dataKey="TE" stackId="a" fill="#8b5cf6" name="Transaksi Energi (TE)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Material Masuk Ranking List */}
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Daftar Mutasi Masuk
                    </h3>
                    <span className="text-[11px] text-slate-500">{itemsMasuk.length} item</span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {itemsMasuk.slice(0, 10).map((m, idx) => {
                      const pct = summary.totalFisikMasuk > 0 ? Math.round((m.materialMasuk.total / summary.totalFisikMasuk) * 100) : 0;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedItem(m)}
                          className="p-2.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">#{idx + 1}</span>
                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                                  {m.namaMaterial}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                <span>{m.noMaterial}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-medium">{m.kategori}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-700 block">
                                +{m.materialMasuk.total.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">{m.satuan}</span>
                            </div>
                          </div>

                          {/* Progress Meter */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MATERIAL KELUAR */}
        {chartTab === 'keluar' && (
          <div className="space-y-4">
            {/* Quick Sektor Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-rose-800 font-mono block">TOTAL FISIK KELUAR</span>
                <div className="text-xl sm:text-2xl font-black text-rose-950 mt-0.5">
                  {summary.totalFisikKeluar.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-rose-700">{itemsKeluar.length} jenis material terpakai</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-amber-600 font-mono block">DIST (JARINGAN)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiKeluarBySektor.dist.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">Pemeliharaan & perbaikan</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-blue-600 font-mono block">AGA (PELANGGAN)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiKeluarBySektor.aga.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">Pasang baru & tambah daya</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-purple-600 font-mono block">TE (TRANSAKSI ENERGI)</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {mutasiKeluarBySektor.te.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">Penggantian meter rusak</span>
              </div>
            </div>

            {/* Bagan Visual: Recharts Bar Chart & Top Items */}
            {itemsKeluar.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Belum ada catatan material keluar pada data sumber saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Visual Chart */}
                <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Top Material Keluar / Terpakai
                  </h3>
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topKeluarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
                                  <div className="font-bold text-rose-400">{d.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">SAP: {d.noMaterial}</div>
                                  <div className="text-sm font-black text-white pt-1">
                                    Total Keluar: {d.Total.toLocaleString('id-ID')} {d.satuan}
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] border-t border-slate-800">
                                    <span className="text-amber-400">DIST: {d.DIST}</span>
                                    <span className="text-blue-400">AGA: {d.AGA}</span>
                                    <span className="text-purple-400">TE: {d.TE}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                        />
                        <Bar dataKey="DIST" stackId="b" fill="#f59e0b" name="Distribusi (DIST)" />
                        <Bar dataKey="AGA" stackId="b" fill="#0ea5e9" name="Pelanggan (AGA)" />
                        <Bar dataKey="TE" stackId="b" fill="#6366f1" name="Transaksi Energi (TE)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Material Keluar Ranking List */}
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Daftar Mutasi Keluar
                    </h3>
                    <span className="text-[11px] text-slate-500">{itemsKeluar.length} item</span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {itemsKeluar.slice(0, 10).map((m, idx) => {
                      const pct = summary.totalFisikKeluar > 0 ? Math.round((m.materialKeluar.total / summary.totalFisikKeluar) * 100) : 0;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedItem(m)}
                          className="p-2.5 rounded-xl border border-slate-200/80 hover:border-rose-300 bg-white hover:bg-rose-50/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">#{idx + 1}</span>
                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-700 transition-colors">
                                  {m.namaMaterial}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                <span>{m.noMaterial}</span>
                                <span>•</span>
                                <span className="text-rose-600 font-medium">{m.kategori}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-rose-700 block">
                                -{m.materialKeluar.total.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">{m.satuan}</span>
                            </div>
                          </div>

                          {/* Progress Meter */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: PERBANDINGAN MASUK VS KELUAR */}
        {chartTab === 'perbandingan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono block">TOTAL MASUK</span>
                  <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                    +{summary.totalFisikMasuk.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase font-mono block">TOTAL KELUAR</span>
                  <span className="text-2xl font-black text-rose-900 mt-0.5 block">
                    -{summary.totalFisikKeluar.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase font-mono block">NET MUTASI (SELISIH)</span>
                  <span className={`text-2xl font-black mt-0.5 block ${summary.totalFisikMasuk >= summary.totalFisikKeluar ? 'text-indigo-900' : 'text-amber-900'}`}>
                    {(summary.totalFisikMasuk - summary.totalFisikKeluar >= 0 ? '+' : '') + (summary.totalFisikMasuk - summary.totalFisikKeluar).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Volume Material Masuk vs Keluar per Kategori
              </h3>
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryMutasiData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
                              <div className="font-bold text-indigo-300">{d.name}</div>
                              <div className="text-emerald-400 font-semibold">Masuk: +{d.Masuk.toLocaleString('id-ID')}</div>
                              <div className="text-rose-400 font-semibold">Keluar: -{d.Keluar.toLocaleString('id-ID')}</div>
                              <div className="text-slate-300 text-[10px] pt-1 border-t border-slate-800">
                                Selisih: {(d.Masuk - d.Keluar >= 0 ? '+' : '') + (d.Masuk - d.Keluar).toLocaleString('id-ID')}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="Masuk" fill="#10b981" name="Material Masuk (+)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Keluar" fill="#f43f5e" name="Material Keluar (-)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. FILTER CONTROLS & SEARCH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua Material ({materials.length.toLocaleString('id-ID')})
          </button>

          <button
            onClick={() => handleTabChange('READY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Stok Ready ({summary.totalReadyItem})
          </button>

          <button
            onClick={() => handleTabChange('MTR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'MTR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            KWh Meter (MTR)
          </button>

          <button
            onClick={() => handleTabChange('MCB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'MCB'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            MCB & Pembatas
          </button>

          <button
            onClick={() => handleTabChange('FUSE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'FUSE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Fuse & Cut Out
          </button>

          <button
            onClick={() => handleTabChange('CABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'CABLE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Kabel & Konduktor
          </button>

          <button
            onClick={() => handleTabChange('ISOLATOR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ISOLATOR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Isolator & Klem
          </button>

          <button
            onClick={() => handleTabChange('BOX')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'BOX'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Panel & Box APP
          </button>

          <button
            onClick={() => handleTabChange('HABIS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'HABIS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Stok 0 / Pengadaan ({summary.totalHabisItem.toLocaleString('id-ID')})
          </button>
        </div>

        {/* Search, Sektor, Satuan, and Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Live Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama material, kode SAP (e.g. 000000000002190502), atau no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sektor Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Sektor:</span>
            <select
              value={selectedSektor}
              onChange={(e) => {
                setSelectedSektor(e.target.value as any);
                setCurrentPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Sektor (DIST, AGA, TE)</option>
              <option value="DIST">Hanya DIST (Distribusi)</option>
              <option value="AGA">Hanya AGA (Pelayanan Pelanggan)</option>
              <option value="TE">Hanya TE (Transaksi Energi)</option>
            </select>
          </div>

          {/* Satuan Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Satuan:</span>
            <select
              value={selectedSatuan}
              onChange={(e) => {
                setSelectedSatuan(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Satuan ({uniqueSatuans.length})</option>
              {uniqueSatuans.map((sat) => (
                <option key={sat} value={sat}>
                  {sat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="stokDesc">Stok Fisik Terbanyak</option>
              <option value="stokAsc">Stok Terkecil (0 duluan)</option>
              <option value="namaAsc">Nama Material (A-Z)</option>
              <option value="noAsc">Nomor Urut (1-1.827)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. MATERIAL DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Daftar Inventaris Material Gudang
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Menampilkan {filteredMaterials.length.toLocaleString('id-ID')} material
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              <span className="text-amber-700 font-bold">DIST</span>=Distribusi •{' '}
              <span className="text-blue-700 font-bold">AGA</span>=Pelayanan Pelanggan •{' '}
              <span className="text-purple-700 font-bold">TE</span>=Transaksi Energi
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (
            {pageSize} per halaman)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Baris Header 1: Kategori Utama Sesuai Sheet */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none text-center">
                <th rowSpan={2} className="py-2.5 px-3 text-center w-12 font-mono border-r border-slate-200 bg-slate-100">
                  NO
                </th>
                <th rowSpan={2} className="py-2.5 px-3 font-mono border-r border-slate-200 bg-slate-100 whitespace-nowrap">
                  NO MATERIAL (SAP)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[260px] text-left border-r border-slate-200 bg-slate-100">
                  NAMA MATERIAL
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 text-center w-14 border-r border-slate-200 bg-slate-100">
                  SAT
                </th>

                {/* STOK AWAL (DIST, AGA, TE, TOTAL) */}
                <th colSpan={4} className="py-1.5 px-2 text-center border-r border-slate-300 bg-slate-200/80 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                  STOK AWAL
                </th>

                {/* STOK MASUK (DIST, AGA, TE, TOTAL) */}
                <th colSpan={4} className="py-1.5 px-2 text-center border-r border-emerald-300 bg-emerald-100/80 text-emerald-950 font-extrabold uppercase tracking-wider text-[11px]">
                  STOK MASUK
                </th>

                {/* STOK KELUAR (DIST, AGA, TE, TOTAL) */}
                <th colSpan={4} className="py-1.5 px-2 text-center border-r border-rose-300 bg-rose-100/80 text-rose-950 font-extrabold uppercase tracking-wider text-[11px]">
                  STOK KELUAR
                </th>

                {/* STOK AKHIR (DIST, AGA, TE, TOTAL) */}
                <th colSpan={4} className="py-1.5 px-2 text-center border-r border-indigo-300 bg-indigo-100 text-indigo-950 font-black uppercase tracking-wider text-[11px]">
                  STOK AKHIR
                </th>

                <th rowSpan={2} className="py-2.5 px-2.5 text-center w-16 bg-slate-100">
                  AKSI
                </th>
              </tr>

              {/* Baris Header 2: Subkolom DIST, AGA, TE, TOTAL di bawah masing-masing blok */}
              <tr className="bg-slate-50 text-[10px] font-bold border-b-2 border-slate-300 select-none">
                {/* Di bawah STOK AWAL */}
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200/60 bg-slate-100 text-slate-700" title="Distribusi / Jaringan">
                  DIST
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200/60 bg-slate-100 text-slate-700" title="Pelayanan Pelanggan">
                  AGA
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200/60 bg-slate-100 text-purple-700" title="Transaksi Energi">
                  TE
                </th>
                <th className="py-1.5 px-2 text-right font-mono border-r border-slate-300 bg-slate-200/70 text-slate-900 font-extrabold">
                  TOTAL
                </th>

                {/* Di bawah STOK MASUK */}
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-emerald-200/60 bg-emerald-50 text-emerald-800" title="Distribusi / Jaringan">
                  DIST
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-emerald-200/60 bg-emerald-50 text-emerald-800" title="Pelayanan Pelanggan">
                  AGA
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-emerald-200/60 bg-emerald-50 text-emerald-800" title="Transaksi Energi">
                  TE
                </th>
                <th className="py-1.5 px-2 text-right font-mono border-r border-slate-300 bg-emerald-100/70 text-emerald-950 font-extrabold">
                  TOTAL
                </th>

                {/* Di bawah STOK KELUAR */}
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-rose-200/60 bg-rose-50 text-rose-800" title="Distribusi / Jaringan">
                  DIST
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-rose-200/60 bg-rose-50 text-rose-800" title="Pelayanan Pelanggan">
                  AGA
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-rose-200/60 bg-rose-50 text-rose-800" title="Transaksi Energi">
                  TE
                </th>
                <th className="py-1.5 px-2 text-right font-mono border-r border-slate-300 bg-rose-100/70 text-rose-950 font-extrabold">
                  TOTAL
                </th>

                {/* Di bawah STOK AKHIR */}
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-indigo-200/60 bg-indigo-50/70 text-amber-800 font-bold" title="Distribusi / Jaringan">
                  DIST
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-indigo-200/60 bg-indigo-50/70 text-blue-800 font-bold" title="Pelayanan Pelanggan">
                  AGA
                </th>
                <th className="py-1.5 px-1.5 text-right font-mono border-r border-indigo-200/60 bg-indigo-50/70 text-purple-800 font-bold" title="Transaksi Energi">
                  TE
                </th>
                <th className="py-1.5 px-2.5 text-right font-mono border-r border-slate-300 bg-indigo-100 text-indigo-950 font-black">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={21} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-medium text-sm">Tidak ada data material yang cocok dengan filter pencarian.</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setActiveTab('ALL');
                        setSelectedSatuan('ALL');
                        setSelectedSektor('ALL');
                      }}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Reset Semua Filter
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedMaterials.map((item) => {
                  const hasStock = item.stokAkhir.total > 0;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasStock ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-medium border-r border-slate-100">
                        {item.no}
                      </td>

                      {/* No Material (SAP) */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap font-medium border-r border-slate-100">
                        {item.noMaterial}
                      </td>

                      {/* Nama Material */}
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-900 leading-snug line-clamp-2">
                          {item.namaMaterial}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {item.kategori}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.gudang}
                          </span>
                        </div>
                      </td>

                      {/* Satuan */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-200">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {item.satuan}
                        </span>
                      </td>

                      {/* STOK AWAL: DIST */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-100">
                        {item.stokAwal.dist > 0 ? item.stokAwal.dist.toLocaleString('id-ID') : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK AWAL: AGA */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-100">
                        {item.stokAwal.aga > 0 ? item.stokAwal.aga.toLocaleString('id-ID') : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK AWAL: TE */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-100">
                        {item.stokAwal.te > 0 ? item.stokAwal.te.toLocaleString('id-ID') : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK AWAL: TOTAL */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-800 font-semibold bg-slate-50/70 border-r border-slate-200">
                        {item.stokAwal.total > 0 ? item.stokAwal.total.toLocaleString('id-ID') : <span className="text-slate-300">0</span>}
                      </td>

                      {/* STOK MASUK: DIST */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                        {item.materialMasuk.dist > 0 ? `+${item.materialMasuk.dist.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK MASUK: AGA */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                        {item.materialMasuk.aga > 0 ? `+${item.materialMasuk.aga.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK MASUK: TE */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                        {item.materialMasuk.te > 0 ? `+${item.materialMasuk.te.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK MASUK: TOTAL */}
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-800 font-bold bg-emerald-50/30 border-r border-slate-200">
                        {item.materialMasuk.total > 0 ? `+${item.materialMasuk.total.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK KELUAR: DIST */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-rose-700 border-r border-slate-100 bg-rose-50/10">
                        {item.materialKeluar.dist > 0 ? `-${item.materialKeluar.dist.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK KELUAR: AGA */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-rose-700 border-r border-slate-100 bg-rose-50/10">
                        {item.materialKeluar.aga > 0 ? `-${item.materialKeluar.aga.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK KELUAR: TE */}
                      <td className="py-2.5 px-1.5 text-right font-mono text-rose-700 border-r border-slate-100 bg-rose-50/10">
                        {item.materialKeluar.te > 0 ? `-${item.materialKeluar.te.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK KELUAR: TOTAL */}
                      <td className="py-2.5 px-2 text-right font-mono text-rose-800 font-bold bg-rose-50/30 border-r border-slate-200">
                        {item.materialKeluar.total > 0 ? `-${item.materialKeluar.total.toLocaleString('id-ID')}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* STOK AKHIR: DIST */}
                      <td className="py-2.5 px-1.5 text-right font-mono border-r border-slate-100 bg-indigo-50/10">
                        {item.stokAkhir.dist > 0 ? (
                          <span className="font-bold text-amber-700">{item.stokAkhir.dist.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* STOK AKHIR: AGA */}
                      <td className="py-2.5 px-1.5 text-right font-mono border-r border-slate-100 bg-indigo-50/10">
                        {item.stokAkhir.aga > 0 ? (
                          <span className="font-bold text-blue-700">{item.stokAkhir.aga.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* STOK AKHIR: TE */}
                      <td className="py-2.5 px-1.5 text-right font-mono border-r border-slate-100 bg-indigo-50/10">
                        {item.stokAkhir.te > 0 ? (
                          <span className="font-bold text-purple-700">{item.stokAkhir.te.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* STOK AKHIR: TOTAL */}
                      <td className="py-2.5 px-3 text-right font-mono bg-indigo-50/40 border-r border-slate-200">
                        {hasStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                            {item.stokAkhir.total.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Lihat Rincian Stok"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. MATERIAL DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleUp p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 font-mono">
                    No. {selectedItem.no}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                    {selectedItem.kategori}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      selectedItem.stokAkhir.total > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedItem.stokAkhir.total > 0 ? 'READY STOK' : 'STOK 0'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-2 leading-snug">
                  {selectedItem.namaMaterial}
                </h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  SAP Material No: <strong>{selectedItem.noMaterial}</strong> • Gudang: <strong>{selectedItem.gudang}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Matrix Card: STOK AWAL, MASUK, KELUAR, AKHIR */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Matriks Mutasi & Alokasi Akuntansi Stok (Satuan: {selectedItem.satuan})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2 px-3">TAHAP MUTASI</th>
                      <th className="py-2 px-3 text-right text-amber-700">DIST (Jaringan)</th>
                      <th className="py-2 px-3 text-right text-blue-700">AGA (Pelanggan)</th>
                      <th className="py-2 px-3 text-right text-purple-700">TE (Transaksi Energi)</th>
                      <th className="py-2 px-3 text-right text-slate-900 font-extrabold">TOTAL FISIK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-mono">
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-600">STOK AWAL</td>
                      <td className="py-2 px-3 text-right">{selectedItem.stokAwal.dist}</td>
                      <td className="py-2 px-3 text-right">{selectedItem.stokAwal.aga}</td>
                      <td className="py-2 px-3 text-right">{selectedItem.stokAwal.te}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">{selectedItem.stokAwal.total}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-emerald-700">MATERIAL MASUK</td>
                      <td className="py-2 px-3 text-right text-emerald-700">+{selectedItem.materialMasuk.dist}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">+{selectedItem.materialMasuk.aga}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">+{selectedItem.materialMasuk.te}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">+{selectedItem.materialMasuk.total}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-rose-700">MATERIAL KELUAR</td>
                      <td className="py-2 px-3 text-right text-rose-700">-{selectedItem.materialKeluar.dist}</td>
                      <td className="py-2 px-3 text-right text-rose-700">-{selectedItem.materialKeluar.aga}</td>
                      <td className="py-2 px-3 text-right text-rose-700">-{selectedItem.materialKeluar.te}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-800">-{selectedItem.materialKeluar.total}</td>
                    </tr>
                    <tr className="bg-indigo-50/70 font-extrabold text-indigo-950">
                      <td className="py-2.5 px-3 font-sans">STOK AKHIR READY</td>
                      <td className="py-2.5 px-3 text-right text-amber-800">{selectedItem.stokAkhir.dist}</td>
                      <td className="py-2.5 px-3 text-right text-blue-800">{selectedItem.stokAkhir.aga}</td>
                      <td className="py-2.5 px-3 text-right text-purple-800">{selectedItem.stokAkhir.te}</td>
                      <td className="py-2.5 px-3 text-right text-indigo-900 text-sm">{selectedItem.stokAkhir.total} {selectedItem.satuan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations & Notes */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Status & Rekomendasi Logistik</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {selectedItem.stokAkhir.total > 0
                  ? `Material ini memiliki ${selectedItem.stokAkhir.total} ${selectedItem.satuan} fisik tersedia di Gudang Rayon Sinjai. Siap digunakan untuk pemeliharaan preventif, penanganan gangguan, atau pasang baru.`
                  : 'Stok material saat ini kosong di Gudang Rayon Sinjai. Apabila dibutuhkan untuk pekerjaan lapangan, mohon ajukan bon permintaan material (TUG 9) ke Gudang Area / UP3 Bulukumba.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. UPLOAD SPREADSHEET MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 animate-scaleUp p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Upload Spreadsheet Material Gudang</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Unggah file Excel (<strong>.xlsx</strong> / <strong>.xls</strong>) atau <strong>.csv</strong> inventaris
                material Gudang Rayon Sinjai dengan format kolom standar:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed overflow-x-auto">
                No | Gudang | No Material | Nama Material | Satuan | STOK AWAL (DIST, AGA, TE, TOTAL) | MATERIAL MASUK | MATERIAL KELUAR | STOK AKHIR
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-8 text-center bg-indigo-50/30 hover:bg-indigo-50/60 transition-all cursor-pointer space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Klik untuk memilih file spreadsheet (.xlsx / .csv)
              </p>
              <p className="text-[11px] text-slate-400">Atau seret dan lepas file Anda ke sini</p>
            </div>

            {isProcessingUpload && (
              <div className="flex items-center justify-center gap-2 py-2 text-indigo-600 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses dan memvalidasi baris material...</span>
              </div>
            )}

            {uploadFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                  uploadFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {uploadFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{uploadFeedback.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFeedback(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. GOOGLE SHEET CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 animate-scaleUp p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">Pengaturan Google Sheet Material</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Tentukan tautan langsung (URL) Google Sheets tempat inventaris monitoring material disimpan. Mendukung link editor biasa (<code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-800">/edit#gid=...</code>) maupun link publikasi web (<code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-800">/pub?...</code>).
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-cyan-600" />
                  <span>URL Google Sheet Material:</span>
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=1993230416"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 leading-normal">
                  Kosongkan jika ingin menggunakan URL default Google Sheet PLN Sinjai (GID: 1993230416).
                </p>
              </div>

              <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 space-y-1.5 text-[11px] text-cyan-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Petunjuk Akses Google Sheets:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-cyan-800 leading-relaxed">
                  <li>Pastikan file memiliki izin akses: <strong>Anyone with link can view</strong> (Siapa saja yang memiliki link dapat melihat).</li>
                  <li>Atau gunakan menu <strong>File → Share → Publish to web</strong> untuk tab sheet material.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSheetUrlInput('');
                  try {
                    localStorage.removeItem('pln_custom_material_sheet_url');
                  } catch {}
                  handleReset();
                  setShowConfigModal(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Reset ke 42 Item Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isLiveSyncing}
                  onClick={() => {
                    handleLiveSync(sheetUrlInput);
                    setShowConfigModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin' : ''}`} />
                  <span>Simpan & Sinkronkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
