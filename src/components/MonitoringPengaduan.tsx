import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Radio,
  Send,
  Calendar,
  Filter,
  PieChart as PieIcon,
  BarChart2,
  TrendingUp,
  Search,
  CheckCircle,
  Clock,
  Star,
  Smartphone,
  Trophy,
  Award,
  Flame,
  Activity,
  ChevronDown,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PengaduanItem } from '../types';

interface Props {
  pengaduanList: PengaduanItem[];
}

const VIA_COLORS = [
  '#0284C7', // PLN Mobile (Sky/Blue)
  '#10B981', // WhatsApp (Emerald)
  '#F59E0B', // OTS Kantor (Amber)
  '#8B5CF6', // CC 123 (Purple)
  '#EC4899', // Ponsel (Pink)
  '#64748B', // Lainnya (Slate)
];

const DISPATCH_COLORS = ['#3B82F6', '#64748B'];

export interface UnitWoRankItem {
  rank: number;
  unit: string;
  totalWo: number;
  pct: number;
  autoDispatch: number;
  manualDispatch: number;
  activeDays: number;
  avgPerActiveDay: number;
  avgPerPeriodDay: number;
  maxInSingleDay: number;
}

export const MonitoringPengaduan: React.FC<Props> = ({ pengaduanList }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedDispatch, setSelectedDispatch] = useState<'ALL' | 'Auto' | 'Manual'>('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | '30days' | '7days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTable, setSearchTable] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [rankingSortBy, setRankingSortBy] = useState<'totalWo' | 'avgPerDay'>('totalWo');
  const pageSize = 10;

  // Extract unique units
  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    pengaduanList.forEach(p => {
      if (p.unitPelaksana) set.add(p.unitPelaksana);
    });
    return Array.from(set).sort();
  }, [pengaduanList]);

  // Filter data
  const filteredData = useMemo(() => {
    const now = new Date();
    return pengaduanList.filter(item => {
      // Unit filter
      if (selectedUnit !== 'ALL' && item.unitPelaksana !== selectedUnit) {
        return false;
      }
      // Dispatch filter
      if (selectedDispatch !== 'ALL') {
        const isAuto = item.dispatch.toLowerCase().includes('auto');
        if (selectedDispatch === 'Auto' && !isAuto) return false;
        if (selectedDispatch === 'Manual' && isAuto) return false;
      }

      // Date filtering
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
  }, [pengaduanList, selectedUnit, selectedDispatch, dateFilterMode, startDate, endDate]);

  // Summary Metrics
  const totalWo = filteredData.length;
  const totalAutoDispatch = filteredData.filter(p => p.dispatch.toLowerCase().includes('auto')).length;
  const totalManualDispatch = filteredData.filter(p => !p.dispatch.toLowerCase().includes('auto')).length;
  const autoDispatchRate = totalWo > 0 ? ((totalAutoDispatch / totalWo) * 100).toFixed(1) : '0';

  // 1. Grafik Laporan Via (Distribution by Channel)
  const laporanViaData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(p => {
      const v = p.laporanVia || 'Lainnya';
      map[v] = (map[v] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // 2. Dispatch Breakdown (Auto vs Manual)
  const dispatchBreakdownData = useMemo(() => {
    return [
      { name: 'Auto Dispatch', value: totalAutoDispatch, color: '#3B82F6' },
      { name: 'Manual Dispatch', value: totalManualDispatch, color: '#94A3B8' },
    ];
  }, [totalAutoDispatch, totalManualDispatch]);

  // 3. Unit Ranking & Average WO per Day Calculation
  const unitRankingData = useMemo(() => {
    // Filter base items according to date & dispatch mode (ignoring selectedUnit so all units can be compared)
    const baseItems = pengaduanList.filter(item => {
      // Dispatch filter
      if (selectedDispatch !== 'ALL') {
        const isAuto = item.dispatch.toLowerCase().includes('auto');
        if (selectedDispatch === 'Auto' && !isAuto) return false;
        if (selectedDispatch === 'Manual' && isAuto) return false;
      }

      // Date filtering
      if (!item.tanggalParsed) return true;
      const itemDate = item.tanggalParsed instanceof Date ? item.tanggalParsed : new Date(item.tanggalParsed);
      if (isNaN(itemDate.getTime())) return true;
      const now = new Date();
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

    const totalBaseWo = baseItems.length || 1;
    const allPeriodDates = new Set<string>();

    const unitMap: Record<
      string,
      {
        totalWo: number;
        autoDispatch: number;
        manualDispatch: number;
        dailyCounts: Record<string, number>;
      }
    > = {};

    baseItems.forEach(p => {
      const u = (p.unitPelaksana || 'Unit Tidak Terdefinisi').trim();
      let dateKey = 'Unknown';
      const parsedDate = p.tanggalParsed instanceof Date ? p.tanggalParsed : p.tanggalParsed ? new Date(p.tanggalParsed) : undefined;
      if (parsedDate && typeof parsedDate.getTime === 'function' && !isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        dateKey = `${y}-${m}-${d}`;
      } else if (p.tanggal) {
        dateKey = p.tanggal.split(' ')[0];
      }

      if (dateKey !== 'Unknown') {
        allPeriodDates.add(dateKey);
      }

      if (!unitMap[u]) {
        unitMap[u] = {
          totalWo: 0,
          autoDispatch: 0,
          manualDispatch: 0,
          dailyCounts: {},
        };
      }

      unitMap[u].totalWo += 1;
      if (p.dispatch.toLowerCase().includes('auto')) {
        unitMap[u].autoDispatch += 1;
      } else {
        unitMap[u].manualDispatch += 1;
      }

      unitMap[u].dailyCounts[dateKey] = (unitMap[u].dailyCounts[dateKey] || 0) + 1;
    });

    const totalPeriodDays = Math.max(1, allPeriodDates.size);

    const list: UnitWoRankItem[] = Object.entries(unitMap).map(([unit, data]) => {
      const activeDays = Math.max(1, Object.keys(data.dailyCounts).length);
      const avgPerActiveDay = Number((data.totalWo / activeDays).toFixed(2));
      const avgPerPeriodDay = Number((data.totalWo / totalPeriodDays).toFixed(2));
      const maxInSingleDay = Math.max(...Object.values(data.dailyCounts), 0);
      const pct = Number(((data.totalWo / totalBaseWo) * 100).toFixed(1));

      return {
        rank: 0,
        unit,
        totalWo: data.totalWo,
        pct,
        autoDispatch: data.autoDispatch,
        manualDispatch: data.manualDispatch,
        activeDays,
        avgPerActiveDay,
        avgPerPeriodDay,
        maxInSingleDay,
      };
    });

    if (rankingSortBy === 'avgPerDay') {
      list.sort((a, b) => b.avgPerActiveDay - a.avgPerActiveDay || b.totalWo - a.totalWo);
    } else {
      list.sort((a, b) => b.totalWo - a.totalWo || b.avgPerActiveDay - a.avgPerActiveDay);
    }

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [pengaduanList, selectedDispatch, dateFilterMode, startDate, endDate, rankingSortBy]);

  // Table search & pagination
  const tableData = useMemo(() => {
    if (!searchTable) return filteredData;
    const q = searchTable.toLowerCase();
    return filteredData.filter(
      p =>
        p.namaPelapor.toLowerCase().includes(q) ||
        p.alamatPengaduan.toLowerCase().includes(q) ||
        p.jenisGangguan.toLowerCase().includes(q) ||
        p.detailGangguan.toLowerCase().includes(q) ||
        p.noPengaduan.toLowerCase().includes(q) ||
        p.unitPelaksana.toLowerCase().includes(q)
    );
  }, [filteredData, searchTable]);

  const totalPages = Math.ceil(tableData.length / pageSize) || 1;
  const paginatedRows = tableData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
            <MessageSquare className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
              Monitoring Pengaduan Individu & Dispatch WO
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pelaporan aduan pelanggan, kanal pelaporan, pemantauan otomatisasi dispatch, dan evaluasi unit
            </p>
          </div>
        </div>

        {/* Filter Controls: Unit & Date */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Pelaksana Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-pengaduan-unit"
              value={selectedUnit}
              onChange={e => {
                setSelectedUnit(e.target.value);
                setPage(1);
              }}
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
        </div>
      </div>

      {/* 3 SUMMARY STAT CARDS: TOTAL WO, TOTAL AUTO DISPATCH, TOTAL MANUAL DISPATCH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total WO */}
        <div 
          id="stat-total-wo"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Total Work Order (WO)
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 font-mono">
              {totalWo.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">Laporan</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tingkat Otomasi: <strong className="text-cyan-700 font-mono">{autoDispatchRate}%</strong>
            </div>
          </div>
        </div>

        {/* Total Auto Dispatch */}
        <div 
          id="stat-auto-dispatch"
          onClick={() => setSelectedDispatch(selectedDispatch === 'Auto' ? 'ALL' : 'Auto')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            selectedDispatch === 'Auto'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/50'
              : 'border-slate-200 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 font-mono">
              Total Auto Dispatch
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-cyan-700 font-mono">
              {totalAutoDispatch.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">
                ({autoDispatchRate}%)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Diteruskan otomatis ke regu</span>
              <span className="text-[10px] text-cyan-700 font-mono uppercase font-bold">Filter</span>
            </div>
          </div>
        </div>

        {/* Total Manual Dispatch */}
        <div 
          id="stat-manual-dispatch"
          onClick={() => setSelectedDispatch(selectedDispatch === 'Manual' ? 'ALL' : 'Manual')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            selectedDispatch === 'Manual'
              ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-100'
              : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
              Total Manual Dispatch
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-slate-800 font-mono">
              {totalManualDispatch.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">
                ({totalWo > 0 ? ((totalManualDispatch / totalWo) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Penugasan manual dispatcher</span>
              <span className="text-[10px] text-slate-600 font-mono uppercase font-bold">Filter</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2 MAIN CHARTS: GRAFIK LAPORAN VIA & DISPATCH PROPORTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. GRAFIK LAPORAN VIA (BAR CHART) */}
        <div 
          id="laporan-via-chart-card"
          className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Grafik Saluran Masuk (Laporan Via)
                </h3>
                <p className="text-xs text-slate-500">
                  Distribusi aduan berdasarkan media pelaporan pelanggan
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={laporanViaData}
                margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      const pct = totalWo > 0 ? ((Number(d.value) / totalWo) * 100).toFixed(1) : 0;
                      return (
                        <div className="p-2.5 bg-white text-slate-800 rounded-xl text-xs shadow-xl border border-slate-200 font-mono">
                          <div className="font-bold text-cyan-700">{d.payload.name}</div>
                          <div className="font-semibold text-slate-700 mt-0.5">
                            {d.value} Laporan ({pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" name="Jumlah Aduan" radius={[6, 6, 0, 0]}>
                  {laporanViaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VIA_COLORS[index % VIA_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. AUTO VS MANUAL DISPATCH (DONUT) */}
        <div 
          id="dispatch-donut-chart-card"
          className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Komposisi Dispatching Regu
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan Auto Dispatch vs Manual Dispatch
              </p>
            </div>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dispatchBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#0284C7" />
                  <Cell fill="#94A3B8" />
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const pct = totalWo > 0 ? ((Number(data.value) / totalWo) * 100).toFixed(1) : 0;
                      return (
                        <div className="p-2 bg-white text-slate-800 rounded-xl text-xs shadow-xl border border-slate-200 font-mono">
                          <div className="font-bold text-slate-900">{data.name}</div>
                          <div className="text-cyan-700 mt-0.5">
                            {data.value} WO ({pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black font-mono text-slate-900">
                {autoDispatchRate}%
              </span>
              <span className="text-[10px] uppercase font-bold text-cyan-700 font-mono">
                Otomatis
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                <span className="text-slate-700 font-medium">Auto Dispatch</span>
              </div>
              <span className="font-bold text-slate-900">
                {totalAutoDispatch} WO ({autoDispatchRate}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-slate-700 font-medium">Manual Dispatch</span>
              </div>
              <span className="font-bold text-slate-700">
                {totalManualDispatch} WO ({totalWo > 0 ? ((totalManualDispatch / totalWo) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RANKING UNIT DENGAN WO TERBANYAK & RATA-RATA HARIAN */}
      <div 
        id="unit-ranking-section"
        className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6"
      >
        {/* Section Header with Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Peringkat Unit Pelaksana & Beban Harian
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {unitRankingData.length} Unit
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Peringkat unit dengan volume Work Order (WO) terbanyak serta analisis rata-rata aduan per hari
              </p>
            </div>
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Urutkan:</span>
            <button
              type="button"
              onClick={() => setRankingSortBy('totalWo')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                rankingSortBy === 'totalWo'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total WO Terbanyak
            </button>
            <button
              type="button"
              onClick={() => setRankingSortBy('avgPerDay')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                rankingSortBy === 'avgPerDay'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rata-Rata / Hari Tertinggi
            </button>
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {unitRankingData.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rank 1 - Gold */}
            {unitRankingData[0] && (
              <div 
                className="p-5 rounded-2xl bg-gradient-to-b from-amber-500 via-amber-600 to-yellow-600 text-white relative overflow-hidden shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-100 uppercase tracking-wider">
                    <span className="text-base">🥇</span> Juara 1 WO Terbanyak
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                    {unitRankingData[0].pct}% Total
                  </span>
                </div>
                <div className="text-lg font-bold text-white truncate">
                  {unitRankingData[0].unit}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black font-mono text-white">
                      {unitRankingData[0].totalWo.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-amber-100 ml-1">WO</span>
                    </div>
                    <div className="text-[11px] text-amber-100">
                      Dari {unitRankingData[0].activeDays} hari aktif
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-yellow-100">
                      ~{unitRankingData[0].avgPerActiveDay} <span className="text-[10px] text-amber-100">WO/hari</span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-100">
                      Puncak: {unitRankingData[0].maxInSingleDay} WO/hari
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 2 - Silver */}
            {unitRankingData[1] && (
              <div 
                className="p-5 rounded-2xl bg-gradient-to-b from-cyan-600 to-sky-700 text-white relative overflow-hidden shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-100 uppercase tracking-wider">
                    <span className="text-base">🥈</span> Peringkat 2
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                    {unitRankingData[1].pct}% Total
                  </span>
                </div>
                <div className="text-lg font-bold text-white truncate">
                  {unitRankingData[1].unit}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black font-mono text-white">
                      {unitRankingData[1].totalWo.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-sky-100 ml-1">WO</span>
                    </div>
                    <div className="text-[11px] text-sky-100">
                      Dari {unitRankingData[1].activeDays} hari aktif
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-sky-100">
                      ~{unitRankingData[1].avgPerActiveDay} <span className="text-[10px] text-sky-100">WO/hari</span>
                    </div>
                    <div className="text-[10px] font-mono text-sky-100">
                      Puncak: {unitRankingData[1].maxInSingleDay} WO/hari
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {unitRankingData[2] && (
              <div 
                className="p-5 rounded-2xl bg-gradient-to-b from-emerald-600 to-teal-700 text-white relative overflow-hidden shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-100 uppercase tracking-wider">
                    <span className="text-base">🥉</span> Peringkat 3
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                    {unitRankingData[2].pct}% Total
                  </span>
                </div>
                <div className="text-lg font-bold text-white truncate">
                  {unitRankingData[2].unit}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black font-mono text-white">
                      {unitRankingData[2].totalWo.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-emerald-100 ml-1">WO</span>
                    </div>
                    <div className="text-[11px] text-emerald-100">
                      Dari {unitRankingData[2].activeDays} hari aktif
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-emerald-100">
                      ~{unitRankingData[2].avgPerActiveDay} <span className="text-[10px] text-emerald-100">WO/hari</span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-100">
                      Puncak: {unitRankingData[2].maxInSingleDay} WO/hari
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Chart: Perbandingan Beban WO & Rata-Rata Tiap Unit */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-600" />
              Grafik Komparasi Beban WO & Rata-Rata Harian Unit
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Berdasarkan filter tanggal & dispatch aktif
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={unitRankingData}
                margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="unit"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis yAxisId="left" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10B981"
                  fontSize={10}
                  tickLine={false}
                  unit=" /hr"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as UnitWoRankItem;
                      return (
                        <div className="p-3 bg-white text-slate-800 rounded-xl text-xs shadow-xl border border-slate-200 font-mono space-y-1">
                          <div className="font-bold text-amber-700 flex items-center gap-1.5">
                            <span>#{d.rank}</span> {d.unit}
                          </div>
                          <div className="text-slate-700">
                            Total WO: <strong className="text-slate-900">{d.totalWo.toLocaleString('id-ID')}</strong> ({d.pct}%)
                          </div>
                          <div className="text-emerald-700 font-semibold">
                            Rata-rata: <strong>{d.avgPerActiveDay} WO / hari aktif</strong>
                          </div>
                          <div className="text-cyan-700 font-semibold">
                            Rata-rata: <strong>{d.avgPerPeriodDay} WO / hari kalender</strong>
                          </div>
                          <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                            Auto: {d.autoDispatch} | Manual: {d.manualDispatch} | Puncak: {d.maxInSingleDay} WO/hr
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
                <Bar yAxisId="left" dataKey="totalWo" name="Total Work Order (WO)" fill="#0284c7" radius={[6, 6, 0, 0]}>
                  {unitRankingData.map((entry, index) => (
                    <Cell
                      key={`rank-cell-${index}`}
                      fill={
                        index === 0
                          ? '#f59e0b'
                          : index === 1
                          ? '#0284c7'
                          : index === 2
                          ? '#10b981'
                          : '#94a3b8'
                      }
                    />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="avgPerActiveDay" name="Rata-rata WO/Hari Aktif" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Unit Ranking & Daily Average Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Unit Pelaksana</th>
                <th className="py-3 px-4 text-right">Total WO</th>
                <th className="py-3 px-4 text-center">% Kontribusi</th>
                <th className="py-3 px-4 text-right">Rata-Rata / Hari Aktif</th>
                <th className="py-3 px-4 text-right">Rata-Rata / Hari Periode</th>
                <th className="py-3 px-4 text-center">Hari Aktif</th>
                <th className="py-3 px-4 text-center">Puncak 1 Hari</th>
                <th className="py-3 px-4 text-center">Auto / Manual</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitRankingData.map((item) => {
                const isSelected = selectedUnit === item.unit;
                return (
                  <tr
                    key={item.unit}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-cyan-50/70 border-l-4 border-l-cyan-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                          🥇
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs">
                          🥈
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="text-slate-500">#{item.rank}</span>
                      )}
                    </td>

                    {/* Unit Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {item.unit}
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold">
                            Aktif
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total WO */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {item.totalWo.toLocaleString('id-ID')}
                    </td>

                    {/* % Kontribusi */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-xs text-slate-700 font-bold">
                        {item.pct}%
                      </span>
                    </td>

                    {/* Average WO per active day */}
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                        {item.avgPerActiveDay} WO / hr
                      </span>
                    </td>

                    {/* Average WO per period day */}
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {item.avgPerPeriodDay} WO / hr
                    </td>

                    {/* Active Days */}
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {item.activeDays} hari
                    </td>

                    {/* Max in single day */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                      {item.maxInSingleDay} WO
                    </td>

                    {/* Auto vs Manual */}
                    <td className="py-3 px-4 text-center font-mono text-[11px]">
                      <span className="text-cyan-700 font-semibold">{item.autoDispatch}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-slate-600">{item.manualDispatch}</span>
                    </td>

                    {/* Action Filter Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedUnit === item.unit) {
                            setSelectedUnit('ALL');
                          } else {
                            setSelectedUnit(item.unit);
                          }
                          setPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                          selectedUnit === item.unit
                            ? 'bg-cyan-600 text-white font-bold shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs'
                        }`}
                      >
                        {selectedUnit === item.unit ? 'Hapus Filter' : 'Filter Unit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEARCHABLE WO TABLE */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Daftar Log Pengaduan Individu ({tableData.length} WO)
            </h3>
            <p className="text-xs text-slate-500">
              Rincian laporan pelanggan, unit eksekutor, status penanganan, dan rating
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelapor, alamat, gangguan..."
              value={searchTable}
              onChange={e => {
                setSearchTable(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-sans shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Pelapor & Alamat</th>
                <th className="py-3 px-4">Laporan Via</th>
                <th className="py-3 px-4">Jenis & Detail Gangguan</th>
                <th className="py-3 px-4">Unit Pelaksana</th>
                <th className="py-3 px-4">Dispatch</th>
                <th className="py-3 px-4 text-center">Status & Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono whitespace-nowrap text-slate-500">
                      {item.tanggal}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{item.namaPelapor}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.alamatPengaduan}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {item.laporanVia}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800">{item.jenisGangguan}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.detailGangguan}</div>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-emerald-700">
                      {item.unitPelaksana}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                          item.dispatch.toLowerCase().includes('auto')
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.dispatch}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                        {item.status || 'Selesai'}
                      </span>
                      {item.rating && (
                        <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                          {item.rating}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada pengaduan yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs text-slate-500 font-mono">
            <div>
              Halaman <span className="font-bold text-slate-900">{page}</span> dari{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex space-x-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-700 shadow-xs"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-700 shadow-xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
