import React, { useState, useMemo } from 'react';
import {
  Zap,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Layers,
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { GarduItem, PenyulangBebanItem, GarduBebanDetail } from '../types';
import { calculateBeban20kv, Beban20kvSummary } from '../utils/beban20kvCalculator';
import { exportBeban20kvExcel, exportBeban20kvCsv } from '../utils/beban20kvExporter';

interface Props {
  garduList: GarduItem[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

const BAR_COLORS = [
  '#0284c7', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#6366f1'
];

export const Beban20kvSection: React.FC<Props> = ({
  garduList,
  onRefresh,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeederInduk, setSelectedFeederInduk] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD'>('ALL');
  const [sortBy, setSortBy] = useState<'beban_desc' | 'beban_asc' | 'gardu_desc' | 'name_asc'>('beban_desc');
  const [expandedKeypoint, setExpandedKeypoint] = useState<string | null>(null);
  const [selectedGarduModal, setSelectedGarduModal] = useState<PenyulangBebanItem | null>(null);
  const [garduSearchQuery, setGarduSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');

  // Kalkulasi rekap beban 20kV
  const { items: allPenyulangItems, summary: globalSummary } = useMemo(() => {
    return calculateBeban20kv(garduList);
  }, [garduList]);

  // Daftar unik induk feeder (Kolom K)
  const uniqueFeederIndukList = useMemo(() => {
    const set = new Set<string>();
    allPenyulangItems.forEach(item => {
      if (item.penyulangInduk && item.penyulangInduk !== 'TIDAK TERDEFINISI') {
        set.add(item.penyulangInduk);
      }
    });
    return Array.from(set).sort();
  }, [allPenyulangItems]);

  // Filter dan sorting
  const filteredItems = useMemo(() => {
    let result = allPenyulangItems.filter(item => {
      // Filter search
      const matchesSearch =
        searchTerm === '' ||
        item.keypoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.penyulangInduk.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.garduList.some(g => g.nama.toLowerCase().includes(searchTerm.toLowerCase()) || g.namaGdMaip.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter induk feeder
      const matchesFeeder =
        selectedFeederInduk === 'ALL' || item.penyulangInduk === selectedFeederInduk;

      // Filter status
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OVERLOAD' && item.overloadCount > 0) ||
        (statusFilter === 'UNDERLOAD' && item.underloadCount > 0) ||
        (statusFilter === 'NORMAL' && item.overloadCount === 0 && item.underloadCount === 0);

      return matchesSearch && matchesFeeder && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'beban_desc') return b.totalBebanKv - a.totalBebanKv;
      if (sortBy === 'beban_asc') return a.totalBebanKv - b.totalBebanKv;
      if (sortBy === 'gardu_desc') return b.totalGardu - a.totalGardu;
      if (sortBy === 'name_asc') return a.keypoint.localeCompare(b.keypoint);
      return 0;
    });

    return result;
  }, [allPenyulangItems, searchTerm, selectedFeederInduk, statusFilter, sortBy]);

  // Data untuk Top 10 Bar Chart
  const top10ChartData = useMemo(() => {
    return allPenyulangItems.slice(0, 10).map(item => ({
      name: item.keypoint.replace('REC_', '').replace('LBS_', '').replace('CO_', '').replace('GH SINJAI ', '').replace('GH TANGKA ', ''),
      fullName: item.keypoint,
      bebanKv: item.totalBebanKv,
      totalGardu: item.totalGardu,
      penyulangInduk: item.penyulangInduk,
    }));
  }, [allPenyulangItems]);

  // Data untuk Komposisi Induk Feeder
  const feederIndukComposition = useMemo(() => {
    const feederMap = new Map<string, { name: string; value: number; count: number }>();
    allPenyulangItems.forEach(item => {
      const feeder = item.penyulangInduk || 'Lainnya';
      const existing = feederMap.get(feeder);
      if (existing) {
        existing.value += item.totalBebanKv;
        existing.count += item.totalGardu;
      } else {
        feederMap.set(feeder, { name: feeder, value: item.totalBebanKv, count: item.totalGardu });
      }
    });
    return Array.from(feederMap.values())
      .map(d => ({ ...d, value: Number(d.value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [allPenyulangItems]);

  // Export handlers
  const handleExportExcel = () => {
    exportBeban20kvExcel(
      filteredItems,
      globalSummary,
      selectedFeederInduk === 'ALL' ? 'Semua Penyulang' : selectedFeederInduk
    );
  };

  const handleExportCsv = () => {
    exportBeban20kvCsv(filteredItems);
  };

  const toggleExpand = (keypoint: string) => {
    setExpandedKeypoint(prev => (prev === keypoint ? null : keypoint));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-800/40 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">Beban 20kV</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-500/20 border border-sky-400/30 text-sky-200 rounded-full">
                  Sistem Distribusi 20kV
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Data Terkini
                </span>
              </div>
              <p className="text-sm text-sky-200/80 mt-1 max-w-2xl leading-relaxed">
                Monitoring dan rekapitulasi beban 20kV tiap penyulang dan gardu distribusi.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-900/50 hover:bg-sky-800/50 border border-sky-700/50 text-sky-200 text-xs font-medium transition shadow-sm disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition shadow-sm"
              title="Download Format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-700/30"
              title="Download Format Excel Lengkap (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Beban 20kV */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Beban 20kV
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {globalSummary.totalBebanKv.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-500">KV</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-slate-400">Total Trafo:</span>
            <span className="font-semibold text-slate-700">{globalSummary.totalKvaTrafo.toLocaleString('id-ID')} kVA</span>
          </div>
        </div>

        {/* Card 2: Total Gardu Terdistribusi */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Gardu Terkoneksi
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {globalSummary.totalGardu.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-500">Unit Trafo</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-slate-400">Rata-rata:</span>
            <span className="font-semibold text-slate-700">{globalSummary.avgBebanKvPerGardu.toLocaleString('id-ID')} KV / gardu</span>
          </div>
        </div>

        {/* Card 3: Keypoint / Penyulang Aktif */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Keypoint / Zona
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {globalSummary.totalKeypoint}
            </span>
            <span className="text-xs font-bold text-slate-500">Titik Pantau</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 truncate" title={`Puncak: ${globalSummary.peakKeypoint}`}>
            <span className="text-slate-400">Puncak:</span>{' '}
            <span className="font-semibold text-slate-800">{globalSummary.peakKeypoint}</span>
            <span className="text-amber-600 font-bold ml-1">({globalSummary.peakKeypointBeban} KV)</span>
          </div>
        </div>

        {/* Card 4: Status Gardu Overload */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gardu Overload (&gt;80%)
            </span>
            <div className={`w-8 h-8 rounded-lg ${globalSummary.totalOverloadGardu > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center`}>
              {globalSummary.totalOverloadGardu > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight ${globalSummary.totalOverloadGardu > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {globalSummary.totalOverloadGardu}
            </span>
            <span className="text-xs font-bold text-slate-500">Gardu Kritis</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-2">
            <span className="text-emerald-600 font-medium">{globalSummary.totalNormalGardu} Normal</span>
            <span>•</span>
            <span className="text-blue-600 font-medium">{globalSummary.totalUnderloadGardu} Underload</span>
          </div>
        </div>
      </div>

      {/* TABS: TABEL VS GRAFIK */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'table'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tabel Beban Penyulang ({filteredItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'charts'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analisis Grafik Beban</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> dari {allPenyulangItems.length} Keypoint / Penyulang
        </div>
      </div>

      {/* GRAFIK VIEW */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 10 Keypoint Bar Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Top 10 Penyulang / Keypoint Beban Tertinggi</h3>
                <p className="text-xs text-slate-500">Akumulasi Beban KV dari seluruh gardu terpasang</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-sky-50 text-sky-700 font-semibold rounded-lg">
                Satuan: KV
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10ChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickFormatter={val => `${val} KV`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                          <p className="font-bold text-amber-300">{data.fullName}</p>
                          <p className="text-slate-300 mt-1">Induk: {data.penyulangInduk}</p>
                          <p className="text-slate-100 font-semibold mt-1">Total Beban: {data.bebanKv.toLocaleString('id-ID')} KV</p>
                          <p className="text-slate-400">Jumlah Gardu: {data.totalGardu} unit</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="bebanKv" radius={[6, 6, 0, 0]}>
                    {top10ChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Beban per Induk Feeder */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-slate-800">Distribusi Induk Feeder</h3>
              <p className="text-xs text-slate-500">Beban total per jaringan induk</p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feederIndukComposition}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {feederIndukComposition.map((_, index) => (
                      <Cell key={`pie-cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString('id-ID')} KV`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {feederIndukComposition.map((f, i) => (
                <div key={f.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                    ></span>
                    <span className="font-medium text-slate-700">{f.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{f.value.toLocaleString('id-ID')} KV</span>
                    <span className="text-slate-400 ml-1">({f.count} GD)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTER & CONTROLS TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari Keypoint, Induk, atau Gardu..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
          </div>

          {/* Filter Induk Feeder */}
          <div className="relative">
            <select
              value={selectedFeederInduk}
              onChange={e => setSelectedFeederInduk(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white appearance-none cursor-pointer"
            >
              <option value="ALL">Semua Induk Feeder</option>
              {uniqueFeederIndukList.map(feeder => (
                <option key={feeder} value={feeder}>
                  {feeder}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Filter Status Overload / Normal */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white appearance-none cursor-pointer"
            >
              <option value="ALL">Semua Status Beban</option>
              <option value="OVERLOAD">Hanya Ada Gardu Overload (&gt;80%)</option>
              <option value="NORMAL">Normal Beban</option>
              <option value="UNDERLOAD">Ada Gardu Underload (&lt;20%)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sorting */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white appearance-none cursor-pointer"
            >
              <option value="beban_desc">Beban 20kV Tertinggi (Puncak)</option>
              <option value="beban_asc">Beban 20kV Terendah</option>
              <option value="gardu_desc">Jumlah Gardu Terbanyak</option>
              <option value="name_asc">Nama Keypoint A - Z</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE: BEBAN 20KV TIAP PENYULANG */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3">Penyulang / Keypoint</th>
                <th className="py-3 px-3">Induk Feeder</th>
                <th className="py-3 px-3 text-center">Jumlah Gardu</th>
                <th className="py-3 px-3 text-right">Total Beban (KV)</th>
                <th className="py-3 px-3 text-right">Rata-rata / GD (KV)</th>
                <th className="py-3 px-3 text-right">Kapasitas (kVA)</th>
                <th className="py-3 px-3 text-center">Rata-rata Beban (%)</th>
                <th className="py-3 px-3 text-center">Kondisi Gardu</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada data penyulang/keypoint yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isExpanded = expandedKeypoint === item.keypoint;
                  const hasOverload = item.overloadCount > 0;

                  return (
                    <React.Fragment key={item.keypoint}>
                      <tr
                        className={`hover:bg-sky-50/50 transition cursor-pointer ${
                          isExpanded ? 'bg-sky-50/70 border-l-4 border-l-sky-500' : ''
                        }`}
                        onClick={() => toggleExpand(item.keypoint)}
                      >
                        <td className="py-3 px-3 text-center font-medium text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{item.keypoint}</span>
                            {hasOverload && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                                {item.overloadCount} OL
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {item.penyulangInduk}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-800">
                          {item.totalGardu}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          <span className="text-amber-600 font-black text-sm">
                            {item.totalBebanKv.toLocaleString('id-ID')}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 font-semibold">KV</span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-medium">
                          {item.avgBebanKv.toLocaleString('id-ID')} KV
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {item.totalKvaTrafo.toLocaleString('id-ID')} kVA
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.avgBebanPersen > 80
                                    ? 'bg-red-500'
                                    : item.avgBebanPersen < 20
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, item.avgBebanPersen)}%` }}
                              ></div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {item.avgBebanPersen}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px]">
                            {item.overloadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
                                {item.overloadCount} OL
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                              {item.normalCount} Norm
                            </span>
                            {item.underloadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                {item.underloadCount} Under
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedGarduModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-semibold transition"
                          >
                            Detail Gardu
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED ROW ACCORDION */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={10} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-800 text-xs">
                                    Daftar Gardu di {item.keypoint} ({item.garduList.length} Unit)
                                  </h4>
                                  <span className="text-[11px] text-slate-500">
                                    Beban Tertinggi: <strong>{item.maxBebanGardu}</strong> ({item.maxBebanKv} KV)
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedGarduModal(item)}
                                  className="text-[11px] text-sky-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Buka Tampilan Penuh</span>
                                </button>
                              </div>

                              <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                      <th className="py-1.5 px-2">Nama Gardu</th>
                                      <th className="py-1.5 px-2">Nama GD MAIP</th>
                                      <th className="py-1.5 px-2 text-right">KVA Trafo</th>
                                      <th className="py-1.5 px-2 text-right">Beban (KV)</th>
                                      <th className="py-1.5 px-2 text-center">Beban (%)</th>
                                      <th className="py-1.5 px-2 text-center">Status</th>
                                      <th className="py-1.5 px-2">Alamat / Lokasi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {item.garduList.map(g => (
                                      <tr key={g.nama} className="hover:bg-sky-50/40">
                                        <td className="py-1.5 px-2 font-bold text-slate-900">{g.nama}</td>
                                        <td className="py-1.5 px-2 text-slate-600">{g.namaGdMaip || '-'}</td>
                                        <td className="py-1.5 px-2 text-right font-medium text-slate-700">{g.kvaTrafo} kVA</td>
                                        <td className="py-1.5 px-2 text-right font-black text-amber-600">{g.bebanKv.toFixed(2)} KV</td>
                                        <td className="py-1.5 px-2 text-center font-semibold text-slate-800">{g.bebanPersen}%</td>
                                        <td className="py-1.5 px-2 text-center">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              g.statusBeban === 'OVERLOAD'
                                                ? 'bg-red-100 text-red-700'
                                                : g.statusBeban === 'UNDERLOAD'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}
                                          >
                                            {g.statusBeban}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-slate-500 truncate max-w-xs">{g.alamat || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FULL DETAIL DAFTAR GARDU */}
      {selectedGarduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Detail Gardu: {selectedGarduModal.keypoint}
                  </h3>
                  <p className="text-xs text-sky-200">
                    Induk Feeder: <strong>{selectedGarduModal.penyulangInduk}</strong> | Total Beban:{' '}
                    <strong>{selectedGarduModal.totalBebanKv} KV</strong> ({selectedGarduModal.totalGardu} Gardu)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGarduModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Subheader / Search */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={garduSearchQuery}
                  onChange={e => setGarduSearchQuery(e.target.value)}
                  placeholder="Cari gardu dalam keypoint ini..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {selectedGarduModal.garduList.filter(g =>
                  g.nama.toLowerCase().includes(garduSearchQuery.toLowerCase()) ||
                  g.namaGdMaip.toLowerCase().includes(garduSearchQuery.toLowerCase()) ||
                  g.alamat.toLowerCase().includes(garduSearchQuery.toLowerCase())
                ).length}{' '}
                Gardu ditemukan
              </span>
            </div>

            {/* Modal Table Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2.5 text-center w-10">No</th>
                    <th className="py-2 px-2.5">Kode Gardu</th>
                    <th className="py-2 px-2.5">Nama GD MAIP</th>
                    <th className="py-2 px-2.5 text-right">Daya (kVA)</th>
                    <th className="py-2 px-2.5 text-right">Beban (KV) [AB]</th>
                    <th className="py-2 px-2.5 text-center">Beban (%) [AA]</th>
                    <th className="py-2 px-2.5 text-center">Status</th>
                    <th className="py-2 px-2.5 text-center">Fasa</th>
                    <th className="py-2 px-2.5">Alamat / Lokasi</th>
                    <th className="py-2 px-2.5">PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGarduModal.garduList
                    .filter(g =>
                      g.nama.toLowerCase().includes(garduSearchQuery.toLowerCase()) ||
                      g.namaGdMaip.toLowerCase().includes(garduSearchQuery.toLowerCase()) ||
                      g.alamat.toLowerCase().includes(garduSearchQuery.toLowerCase())
                    )
                    .map((g, idx) => (
                      <tr key={g.nama} className="hover:bg-sky-50/50">
                        <td className="py-2 px-2.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">{g.nama}</td>
                        <td className="py-2 px-2.5 text-slate-600">{g.namaGdMaip || '-'}</td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700">{g.kvaTrafo}</td>
                        <td className="py-2 px-2.5 text-right font-black text-amber-600">{g.bebanKv.toFixed(2)} KV</td>
                        <td className="py-2 px-2.5 text-center font-semibold text-slate-800">{g.bebanPersen}%</td>
                        <td className="py-2 px-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              g.statusBeban === 'OVERLOAD'
                                ? 'bg-red-100 text-red-700'
                                : g.statusBeban === 'UNDERLOAD'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {g.statusBeban}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-500">{g.fasaTrafo}</td>
                        <td className="py-2 px-2.5 text-slate-600 truncate max-w-[180px]">{g.alamat || '-'}</td>
                        <td className="py-2 px-2.5 text-slate-500">{g.pic || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total {selectedGarduModal.garduList.length} gardu distribusi
              </span>
              <button
                onClick={() => setSelectedGarduModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
