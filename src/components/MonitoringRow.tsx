import React, { useState, useMemo } from 'react';
import {
  Scissors,
  TreePine,
  Layers,
  Trophy,
  Award,
  Calendar,
  Filter,
  BarChart2,
  TrendingUp,
  AlertCircle,
  Medal,
  Sparkles,
  Search,
  Download,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { RowItem, AsetItem } from '../types';
import { RowExecutionExportModal } from './RowExecutionExportModal';
import {
  buildRowExecutionReportData,
  buildLapHarBulananExportData,
  exportRowExecutionToStyledXLS,
  exportRowExecutionToXLSX,
  exportLapHarBulananToXLSX,
  exportLapHarBulananToStyledXLS,
} from '../utils/rowExecutionExporter';

interface Props {
  rowList: RowItem[];
  asetList?: AsetItem[];
}

export const MonitoringRow: React.FC<Props> = ({ rowList, asetList }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | '30days' | '7days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchLog, setSearchLog] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Extract unique units
  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    rowList.forEach(r => {
      if (r.tim) set.add(r.tim);
    });
    // Ensure all standard Sinjai units are represented
    ['Unit 21 Sinjai', 'Unit 22', 'Unit 23 Bikeru', 'Unit 24 Samaenre', 'Unit 25 Sinjai Barat'].forEach(u => set.add(u));
    return Array.from(set).sort();
  }, [rowList]);

  // Filtered ROW records
  const filteredData = useMemo(() => {
    const now = new Date();
    return rowList.filter(item => {
      // Search keyword filter
      if (searchLog) {
        const q = searchLog.toLowerCase();
        const match =
          item.tim.toLowerCase().includes(q) ||
          item.penyulang.toLowerCase().includes(q) ||
          item.keypoint.toLowerCase().includes(q) ||
          item.segment.toLowerCase().includes(q) ||
          item.tanggal.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Unit filter
      if (selectedUnit !== 'ALL' && item.tim !== selectedUnit) {
        return false;
      }

      // Date filter
      if (!item.tanggalParsed) return true;
      const itemDate = item.tanggalParsed instanceof Date ? item.tanggalParsed : new Date(item.tanggalParsed);
      if (isNaN(itemDate.getTime())) return true;

      if (dateFilterMode === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }

      if (dateFilterMode === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return itemDate >= thirtyDaysAgo;
      }

      if (dateFilterMode === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      return true;
    });
  }, [rowList, selectedUnit, dateFilterMode, startDate, endDate, searchLog]);

  // Metrics
  const totalTebang = filteredData.reduce((acc, curr) => acc + curr.tebang, 0);
  const totalPerampalan = filteredData.reduce((acc, curr) => acc + curr.perampalan, 0);
  const totalKmsInspeksi = Number(
    filteredData.reduce((acc, curr) => acc + curr.kmsInspeksi, 0).toFixed(2)
  );
  const totalTemuanButuhPadam = filteredData.reduce((acc, curr) => acc + curr.temuanButuhPadam, 0);

  // Unit Rankings by Execution Total (Tebang + Perampalan)
  const unitRankings = useMemo(() => {
    const map: Record<
      string,
      { unit: string; tebang: number; perampalan: number; totalEksekusi: number; kms: number; butuhPadam: number }
    > = {};

    // Initialize all known units with 0
    availableUnits.forEach(u => {
      map[u] = { unit: u, tebang: 0, perampalan: 0, totalEksekusi: 0, kms: 0, butuhPadam: 0 };
    });

    filteredData.forEach(item => {
      const u = item.tim || 'Unit 21 Sinjai';
      if (!map[u]) {
        map[u] = { unit: u, tebang: 0, perampalan: 0, totalEksekusi: 0, kms: 0, butuhPadam: 0 };
      }
      map[u].tebang += item.tebang;
      map[u].perampalan += item.perampalan;
      map[u].totalEksekusi += item.tebang + item.perampalan;
      map[u].kms += item.kmsInspeksi;
      map[u].butuhPadam += item.temuanButuhPadam;
    });

    return Object.values(map).sort((a, b) => b.totalEksekusi - a.totalEksekusi);
  }, [filteredData, availableUnits]);

  // Best Unit of the Month (Rank #1)
  const bestUnit = unitRankings[0] || {
    unit: 'Unit 25 Sinjai Barat',
    totalEksekusi: 0,
    tebang: 0,
    perampalan: 0,
    kms: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
            <TreePine className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
              Monitoring ROW (Right of Way) & Pemeliharaan JTM
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pelaporan pembersihan jalur, tebang pohon kritis, dan pemangkasan ranting di sekitar jaringan
            </p>
          </div>
        </div>

        {/* Filter Controls: Search, Unit & Date */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Unit / Penyulang..."
              value={searchLog}
              onChange={e => setSearchLog(e.target.value)}
              className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-36 sm:w-44 font-sans"
            />
            {searchLog && (
              <button
                type="button"
                onClick={() => setSearchLog('')}
                className="text-[10px] text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Unit Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-row-unit"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white text-slate-800">Semua Unit Pelaksana</option>
              {availableUnits.map(u => (
                <option key={u} value={u} className="bg-white text-slate-800">
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Date Period Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterMode === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setDateFilterMode('30days')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterMode === '30days'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setDateFilterMode('7days')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterMode === '7days'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilterMode === 'custom'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kustom
            </button>
          </div>

          {dateFilterMode === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-mono shadow-xs"
              />
              <span className="text-xs text-slate-400 font-mono">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-mono shadow-xs"
              />
            </div>
          )}

          {/* TOMBOL DOWNLOAD DATA EKSEKUSI (FORMAT LAMPIRAN) */}
          <div className="flex items-center gap-1.5 pl-1">
            <button
              id="btn-open-row-execution-export"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-98"
              title="Download Data Eksekusi ROW Per Segmen (Sesuai Format Lampiran)"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-200" />
              <span>Download Data Eksekusi</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK TOAST NOTIFICATION */}
      {quickToast && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-between text-xs font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{quickToast}</span>
          </div>
          <button onClick={() => setQuickToast(null)} className="text-emerald-700 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* 4 PRIMARY METRICS (JUMLAH PENEBANGAN, PERAMPALAN, KMS INSPEKSI, BUTUH PADAM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Penebangan */}
        <div 
          id="stat-penebangan"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 font-mono">
              Penebangan Pohon
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <TreePine className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-700 font-mono">
              {totalTebang.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">Pohon</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Pohon rawan rebah ke jaringan</div>
          </div>
        </div>

        {/* Perampalan */}
        <div 
          id="stat-perampalan"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
              Perampalan / Pangkas
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-emerald-700 font-mono">
              {totalPerampalan.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">Titik</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Ranting & dahan mendekati kabel</div>
          </div>
        </div>

        {/* KMS Inspeksi Total */}
        <div 
          id="stat-kms-inspeksi"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 font-mono">
              KMS Inspeksi Total
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-cyan-700 font-mono">
              {totalKmsInspeksi.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">KMS</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Jalur jaringan disisir tim</div>
          </div>
        </div>

        {/* Temuan Butuh Padam */}
        <div 
          id="stat-temuan-padam"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 font-mono">
              Temuan Butuh Padam
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-rose-700 font-mono">
              {totalTemuanButuhPadam.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">Titik</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Jadwal pemadaman terencana</div>
          </div>
        </div>
      </div>

      {/* VISUAL UNIT TERBAIK BULAN INI (CHAMPION CARD) & RANKING UNIT EKSEKUSI TERBANYAK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1. VISUAL UNIT TERBAIK BULAN INI */}
        <div 
          id="best-unit-champion-card"
          className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white shadow-md flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/30 text-xs font-extrabold tracking-wide text-white shadow-sm">
                <Trophy className="w-4 h-4 text-yellow-200" />
                <span>UNIT TERBAIK BULAN INI</span>
              </div>
              <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {bestUnit.unit}
              </h3>
              <p className="text-xs text-amber-100 mt-1">
                Peringkat #1 Eksekusi ROW & Pembersihan Jalur JTM Terbanyak
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-black/20 backdrop-blur-sm border border-white/20 text-center font-mono">
              <div>
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Tebang</div>
                <div className="text-lg font-bold text-white">{bestUnit.tebang}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Perampalan</div>
                <div className="text-lg font-bold text-white">{bestUnit.perampalan}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Total Eksekusi</div>
                <div className="text-lg font-bold text-yellow-200">{bestUnit.totalEksekusi}</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/20 mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-100 font-mono">
              <Medal className="w-4 h-4 text-yellow-200" />
              <span>Inspeksi: {bestUnit.kms} KMS</span>
            </div>
            <span className="font-semibold px-2.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-mono">
              Kinerja Unggul
            </span>
          </div>
        </div>

        {/* 2. RANGKING UNIT DENGAN EKSEKUSI TERBANYAK (BAR CHART) */}
        <div 
          id="unit-ranking-chart-card"
          className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Ranking Unit Eksekusi ROW Terbanyak
                </h3>
                <p className="text-xs text-slate-500">
                  Total Eksekusi = Tebang Pohon + Perampalan Titik
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono">
              {unitRankings.length} Unit
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={unitRankings}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 90, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="unit"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="p-3 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1 font-mono">
                          <div className="font-bold text-amber-700 text-sm border-b border-slate-100 pb-1">
                            {label}
                          </div>
                          <div className="flex justify-between gap-4 text-slate-600">
                            <span className="text-amber-700 font-semibold">Tebang Pohon:</span>
                            <span>{item.tebang} pohon</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-600">
                            <span className="text-emerald-700 font-semibold">Perampalan:</span>
                            <span>{item.perampalan} titik</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-600">
                            <span className="text-cyan-700 font-semibold">KMS Inspeksi:</span>
                            <span>{item.kms} KMS</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 font-bold">
                            <span className="text-slate-900">Total Eksekusi:</span>
                            <span className="text-amber-700">{item.totalEksekusi}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalEksekusi" name="Total Eksekusi" fill="#EAB308" radius={[0, 6, 6, 0]}>
                  {unitRankings.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#EAB308' : index === 1 ? '#0284C7' : index === 2 ? '#10B981' : '#94A3B8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETAILED ROW EXECUTION LOG TABLE */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Log Realisasi P0 & Eksekusi ROW Harian
            </h3>
            <p className="text-xs text-slate-500">
              Rincian laporan pembersihan jalur penyulang dan segment
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-quick-download-lap-har"
              type="button"
              onClick={() => {
                const lapHarData = buildLapHarBulananExportData(rowList);
                exportLapHarBulananToXLSX(lapHarData);
                setQuickToast('Laporan Harian Bulanan berhasil diunduh (.xlsx)');
                setTimeout(() => setQuickToast(null), 4000);
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-102 active:scale-98"
              title="Download Laporan Harian Bulanan (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Lap Har Bulanan (.xlsx)</span>
            </button>

            <button
              id="btn-preview-export-modal"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-700" />
              <span>Preview & Ekspor Lengkap</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tanggal / Waktu</th>
                <th className="py-3 px-4">Tim / Unit Pelaksana</th>
                <th className="py-3 px-4">Penyulang</th>
                <th className="py-3 px-4">Keypoint / Segment</th>
                <th className="py-3 px-4 text-center">Penebangan (Pohon)</th>
                <th className="py-3 px-4 text-center">Perampalan / Pemangkasan (Titik)</th>
                <th className="py-3 px-4 text-center">KMS Inspeksi</th>
                <th className="py-3 px-4 text-center">Butuh Padam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">{item.tanggal || item.timestamp || '-'}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {item.tim}
                    </td>
                    <td className="py-2.5 px-4 text-cyan-700 font-medium">
                      {item.penyulang || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{item.keypoint || item.segment || '-'}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                      {item.tebang}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">
                      {item.perampalan}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-700">{item.kmsInspeksi} KMS</td>
                    <td className="py-2.5 px-4 text-center">
                      {item.temuanButuhPadam > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full font-mono bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px]">
                          {item.temuanButuhPadam} Titik
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada data ROW yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EKSPOR DATA EKSEKUSI FORMAT LAMPIRAN */}
      <RowExecutionExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        rowList={rowList}
        asetList={asetList}
      />
    </div>
  );
};
