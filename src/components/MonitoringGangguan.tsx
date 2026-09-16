import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  Filter,
  BarChart2,
  PieChart as PieIcon,
  Search,
  Activity,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Info,
  TrendingUp,
  Waves,
  ShieldCheck,
  Flame,
  Zap,
} from 'lucide-react';
import { PlnLogo } from './icons/PlnLogo';
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
  AreaChart,
  Area,
} from 'recharts';
import { GangguanItem } from '../types';

interface Props {
  gangguanList: GangguanItem[];
}

const DONUT_COLORS = [
  '#0284C7', // PLN Cyan / Blue
  '#EAB308', // PLN Yellow
  '#10B981', // PLN Light Green
  '#F97316', // Orange
  '#06B6D4', // Sky Cyan
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

const MONTH_NAMES_INDO = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Filter Pengecualian Khusus Sesuai SOP:
 * Abaikan status penyebab manuver, pekerjaan tragi, penormalan sistem,
 * pengujian & scada, sebagian beban.
 * Berlaku untuk SELURUH data pada section Monitoring Gangguan.
 */
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

export const MonitoringGangguan: React.FC<Props> = ({ gangguanList }) => {
  // Filters
  const [dateFilterMode, setDateFilterMode] = useState<'all' | '30days' | '7days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedKeypointSearch, setSelectedKeypointSearch] = useState<string>('');
  const [selectedTipeFilter, setSelectedTipeFilter] = useState<'ALL' | 'TEMPORER' | 'PERMANEN'>('ALL');
  const [searchTable, setSearchTable] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // 1. Base Filter: Keypoint valid (P_, REC_, SEC_) & EKSKLUSI Penyebab Non-Gangguan (Manuver, TRAGI, Penormalan, SCADA, Sebagian Beban)
  const { pureGangguanList, totalExcludedCount } = useMemo(() => {
    let excluded = 0;
    const pure: GangguanItem[] = [];

    gangguanList.forEach(item => {
      // Cek validitas keypoint
      if (!item.isKeypointValid) return;

      // Cek pengecualian penyebab operasional non-gangguan
      if (isExcludedFaultCause(item)) {
        excluded++;
        return;
      }

      pure.push(item);
    });

    return {
      pureGangguanList: pure,
      totalExcludedCount: excluded,
    };
  }, [gangguanList]);

  // 2. Filter Tanggal & Filter Tipe/Keypoint Berlaku untuk SEMUA Data
  const filteredData = useMemo(() => {
    const now = new Date();
    return pureGangguanList.filter(item => {
      // Keypoint filter
      if (selectedKeypointSearch && !item.keypoint.toLowerCase().includes(selectedKeypointSearch.toLowerCase())) {
        return false;
      }
      // Tipe filter (TEMPORER / PERMANEN)
      if (selectedTipeFilter !== 'ALL' && item.tipeGangguan !== selectedTipeFilter) {
        return false;
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
  }, [pureGangguanList, dateFilterMode, startDate, endDate, selectedKeypointSearch, selectedTipeFilter]);

  // Key metrics calculated strictly from filteredData
  const totalTrip = filteredData.length;
  const totalPermanen = filteredData.filter(g => g.tipeGangguan === 'PERMANEN').length;
  const totalTemporer = filteredData.filter(g => g.tipeGangguan === 'TEMPORER').length;

  // 3. Dynamic Wave Trend Chart (Adapts to Date Filter: Daily if <= 35 days, Monthly if > 35 days or 'all')
  const { trendWaveData, trendStats, trendGroupingType } = useMemo(() => {
    // Determine whether to group by day or by month
    const isDaily = dateFilterMode === '7days' || dateFilterMode === '30days' || (dateFilterMode === 'custom' && startDate && endDate && (new Date(endDate).getTime() - new Date(startDate).getTime() <= 35 * 24 * 3600 * 1000));

    const bucketMap: Record<
      string,
      {
        key: string;
        label: string;
        timestamp: number;
        permanen: number;
        temporer: number;
        totalMurni: number;
      }
    > = {};

    let totalMurniCount = 0;
    let totalPermanenCount = 0;
    let totalTemporerCount = 0;

    filteredData.forEach(item => {
      let dateObj = item.tanggalParsed;
      if (dateObj && !(dateObj instanceof Date)) {
        dateObj = new Date(dateObj);
      }
      if (!dateObj || typeof dateObj.getTime !== 'function' || isNaN(dateObj.getTime())) return;

      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth();
      const day = dateObj.getDate();

      let key = '';
      let label = '';
      let timestamp = 0;

      if (isDaily) {
        key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        label = `${day} ${MONTH_NAMES_INDO[monthIndex]}`;
        timestamp = new Date(year, monthIndex, day).getTime();
      } else {
        key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        label = `${MONTH_NAMES_INDO[monthIndex]} ${year}`;
        timestamp = new Date(year, monthIndex, 1).getTime();
      }

      if (!bucketMap[key]) {
        bucketMap[key] = {
          key,
          label,
          timestamp,
          permanen: 0,
          temporer: 0,
          totalMurni: 0,
        };
      }

      if (item.tipeGangguan === 'PERMANEN') {
        bucketMap[key].permanen += 1;
        totalPermanenCount += 1;
      } else {
        bucketMap[key].temporer += 1;
        totalTemporerCount += 1;
      }

      bucketMap[key].totalMurni += 1;
      totalMurniCount += 1;
    });

    const sortedList = Object.values(bucketMap).sort((a, b) => a.timestamp - b.timestamp);

    // Peak and average calculation
    let peakPeriod = { label: '-', totalMurni: 0, permanen: 0, temporer: 0 };
    sortedList.forEach(m => {
      if (m.totalMurni > peakPeriod.totalMurni) {
        peakPeriod = {
          label: m.label,
          totalMurni: m.totalMurni,
          permanen: m.permanen,
          temporer: m.temporer,
        };
      }
    });

    const periodCount = sortedList.length || 1;
    const avgPerPeriod = (totalMurniCount / periodCount).toFixed(1);

    return {
      trendWaveData: sortedList,
      trendGroupingType: isDaily ? 'Harian' : 'Bulanan',
      trendStats: {
        totalMurni: totalMurniCount,
        totalPermanen: totalPermanenCount,
        totalTemporer: totalTemporerCount,
        avgPerPeriod,
        peakPeriod,
        periodCount,
      },
    };
  }, [filteredData, dateFilterMode, startDate, endDate]);

  // 4. Ranking 10 Keypoint Paling Sering Trip (Stacked Bar Chart from filteredData)
  const top10Keypoints = useMemo(() => {
    const map: Record<string, { keypoint: string; temporer: number; permanen: number; total: number }> = {};

    filteredData.forEach(item => {
      const kp = item.keypoint || 'Tidak Terdefinisi';
      if (!map[kp]) {
        map[kp] = { keypoint: kp, temporer: 0, permanen: 0, total: 0 };
      }
      if (item.tipeGangguan === 'PERMANEN') {
        map[kp].permanen += 1;
      } else {
        map[kp].temporer += 1;
      }
      map[kp].total += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredData]);

  // 5. Donut Chart Penyebab Trip (dari kolom Keterangan / Penyebab pada filteredData)
  const penyebabTripData = useMemo(() => {
    const map: Record<string, number> = {};

    filteredData.forEach(item => {
      let rawKet = (item.keterangan || item.penyebabPadam || 'Lain-lain').trim();

      // Normalize common phrases
      if (rawKet.toLowerCase().includes('belum ditemukan') || rawKet.toLowerCase().includes('tidak jelas')) {
        rawKet = 'GANGGUAN BELUM DITEMUKAN';
      } else if (rawKet.toLowerCase().includes('pohon') || rawKet.toLowerCase().includes('ranting')) {
        rawKet = 'POHON / TANAMAN REBAH';
      } else if (rawKet.toLowerCase().includes('kuskus') || rawKet.toLowerCase().includes('hewan') || rawKet.toLowerCase().includes('binatang')) {
        rawKet = 'SENTUHAN HEWAN / KUSKUS';
      } else if (rawKet.toLowerCase().includes('cuaca') || rawKet.toLowerCase().includes('hujan') || rawKet.toLowerCase().includes('petir')) {
        rawKet = 'CUACA EKSTRIM & PETIR';
      } else if (rawKet.length > 35) {
        rawKet = rawKet.substring(0, 35) + '...';
      }

      map[rawKet] = (map[rawKet] || 0) + 1;
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top7 = entries.slice(0, 7).map(([name, value]) => ({ name, value }));
    const rest = entries.slice(7).reduce((acc, curr) => acc + curr[1], 0);

    if (rest > 0) {
      top7.push({ name: 'Lain-lain', value: rest });
    }

    return top7;
  }, [filteredData]);

  // Table search & pagination
  const tableData = useMemo(() => {
    if (!searchTable) return filteredData;
    const q = searchTable.toLowerCase();
    return filteredData.filter(
      item =>
        item.keypoint.toLowerCase().includes(q) ||
        item.penyulang.toLowerCase().includes(q) ||
        item.keterangan.toLowerCase().includes(q) ||
        item.relay.toLowerCase().includes(q) ||
        item.tanggal.includes(q)
    );
  }, [filteredData, searchTable]);

  const totalPages = Math.ceil(tableData.length / pageSize) || 1;
  const paginatedRows = tableData.slice((page - 1) * pageSize, page * pageSize);

  // Date Filter label description
  const filterPeriodLabel = useMemo(() => {
    if (dateFilterMode === '7days') return '7 Hari Terakhir';
    if (dateFilterMode === '30days') return '30 Hari Terakhir';
    if (dateFilterMode === 'custom') {
      if (startDate && endDate) return `${startDate} s/d ${endDate}`;
      if (startDate) return `Sejak ${startDate}`;
      if (endDate) return `Sampai ${endDate}`;
      return 'Kustom';
    }
    return 'Semua Data (1 Tahun)';
  }, [dateFilterMode, startDate, endDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 flex items-center justify-center">
              <PlnLogo className="w-8 h-10 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight font-sans">
                  Monitoring Gangguan JTM (20 kV)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300 font-mono">
                  {filterPeriodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Rekapitulasi trip permanen dan temporer jaringan tegangan menengah 20kV
              </p>
            </div>
          </div>
        </div>

        {/* Date Filters Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              id="filter-date-all"
              onClick={() => {
                setDateFilterMode('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua (1 Thn)
            </button>
            <button
              id="filter-date-30days"
              onClick={() => {
                setDateFilterMode('30days');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateFilterMode === '30days'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              id="filter-date-7days"
              onClick={() => {
                setDateFilterMode('7days');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateFilterMode === '7days'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              id="filter-date-custom"
              onClick={() => {
                setDateFilterMode('custom');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
                onChange={e => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-cyan-500 shadow-xs"
              />
              <span className="text-xs text-slate-400 font-mono">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-cyan-500 shadow-xs"
              />
            </div>
          )}
        </div>
      </div>


      {/* GRAFIK GELOMBANG TREN TRIP PERMANEN & TEMPORER (MENGIKUTI FILTER TANGGAL AKTIF) */}
      <div 
        id="wave-chart-container"
        className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6"
      >
        {/* Title, Filters & Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  Grafik Gelombang Tren Trip Permanen & Temporer
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">
                    {filterPeriodLabel} • Agregasi {trendGroupingType}
                  </span>
                </h3>
              </div>
            </div>
          </div>

          {/* Exclusion Notice Badge */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <span className="text-emerald-700 font-semibold">Filter Murni:</span> Mengabaikan Manuver, TRAGI, Penormalan, SCADA, & Sebagian Beban
            </span>
          </div>
        </div>

        {/* 4 Mini KPI Cards for Wave Trend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-bold">
              Total Trip ({filterPeriodLabel})
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {trendStats.totalMurni.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1">Trip</span>
            </div>
            <div className="text-[10px] text-emerald-600 mt-1 font-medium">
              Data terfilter aktif
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-200 flex flex-col justify-between">
            <span className="text-[10px] text-cyan-800 uppercase font-bold flex items-center justify-between">
              <span>Temporer Murni</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
            </span>
            <div className="text-xl sm:text-2xl font-black text-cyan-700 mt-1">
              {trendStats.totalTemporer.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({trendStats.totalMurni > 0 ? ((trendStats.totalTemporer / trendStats.totalMurni) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Trip sesaat non-permanen
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
            <span className="text-[10px] text-amber-800 uppercase font-bold flex items-center justify-between">
              <span>Permanen Murni</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
              {trendStats.totalPermanen.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({trendStats.totalMurni > 0 ? ((trendStats.totalPermanen / trendStats.totalMurni) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Padam butuh perbaikan
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-yellow-50/60 border border-yellow-200 flex flex-col justify-between">
            <span className="text-[10px] text-yellow-800 uppercase font-bold flex items-center justify-between">
              <span>Puncak Periode</span>
              <Flame className="w-3.5 h-3.5 text-yellow-600" />
            </span>
            <div className="text-lg sm:text-xl font-black text-yellow-800 mt-1 truncate">
              {trendStats.peakPeriod.label}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {trendStats.peakPeriod.totalMurni} Trip (Rata-rata: {trendStats.avgPerPeriod}/{trendGroupingType === 'Harian' ? 'hari' : 'bln'})
            </div>
          </div>
        </div>

        {/* Wave Chart Canvas */}
        <div className="h-80 sm:h-96 w-full pt-2">
          {trendWaveData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendWaveData}
                margin={{ top: 20, right: 25, left: 0, bottom: 10 }}
              >
                <defs>
                  {/* Wave Gradient for Temporer (PLN Cyan) */}
                  <linearGradient id="waveGradientTemporer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Wave Gradient for Permanen (PLN Yellow/Amber) */}
                  <linearGradient id="waveGradientPermanen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                
                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />

                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickFormatter={val => `${val}`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const tot = data.totalMurni || 0;
                      const temp = data.temporer || 0;
                      const perm = data.permanen || 0;
                      const tempPct = tot > 0 ? ((temp / tot) * 100).toFixed(1) : 0;
                      const permPct = tot > 0 ? ((perm / tot) * 100).toFixed(1) : 0;

                      return (
                        <div className="p-4 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 text-xs space-y-2.5 font-mono min-w-[220px]">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                              {label}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">
                              Total {tot} Trip
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-700 flex items-center gap-1.5 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
                                Trip Temporer:
                              </span>
                              <span className="font-bold text-slate-900">
                                {temp} <span className="text-slate-400 text-[10px]">({tempPct}%)</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-amber-700 flex items-center gap-1.5 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                                Trip Permanen:
                              </span>
                              <span className="font-bold text-slate-900">
                                {perm} <span className="text-slate-400 text-[10px]">({permPct}%)</span>
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 text-[10px] text-emerald-600 font-semibold italic">
                            ✓ Telah dieksklusi dari Manuver / TRAGI / SCADA
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Smooth Monotone Waves */}
                <Area
                  type="monotone"
                  dataKey="temporer"
                  name="Trip Temporer (Murni)"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waveGradientTemporer)"
                />

                <Area
                  type="monotone"
                  dataKey="permanen"
                  name="Trip Permanen (Murni)"
                  stroke="#EAB308"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waveGradientPermanen)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
              Tidak ada data gangguan untuk rentang tanggal terpilih.
            </div>
          )}
        </div>

        {/* Wave Chart Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded bg-cyan-600" />
              <span className="text-slate-700 font-semibold">Gelombang Trip Temporer</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded bg-yellow-500" />
              <span className="text-slate-700 font-semibold">Gelombang Trip Permanen</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Periode: {filterPeriodLabel}
          </div>
        </div>
      </div>

      {/* 2 MAIN CHARTS: STACKED BAR (TOP 10 KEYPOINTS) & DONUT (PENYEBAB TRIP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. RANKING 10 KEYPOINT PALING SERING TRIP (STACKED BAR) */}
        <div 
          id="top-keypoint-chart-card"
          className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Top 10 Keypoint Paling Sering Trip ({filterPeriodLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Perbandingan gangguan temporer dan permanen
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600" />
                <span className="text-slate-700">Temporer</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                <span className="text-slate-700">Permanen</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            {top10Keypoints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top10Keypoints}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="keypoint"
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const temp = payload.find(p => p.dataKey === 'temporer')?.value || 0;
                        const perm = payload.find(p => p.dataKey === 'permanen')?.value || 0;
                        const tot = Number(temp) + Number(perm);
                        return (
                          <div className="p-3 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1 font-mono">
                            <div className="font-bold text-cyan-700 text-sm border-b border-slate-100 pb-1">
                              {label}
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-cyan-600 font-semibold">Temporer:</span>
                              <span className="font-bold">{temp} kali</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-amber-600 font-semibold">Permanen:</span>
                              <span className="font-bold">{perm} kali</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 font-bold">
                              <span>Total Trip:</span>
                              <span className="text-slate-900">{tot} kali</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="temporer" name="Gangguan Temporer" stackId="a" fill="#0284C7" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="permanen" name="Gangguan Permanen" stackId="a" fill="#EAB308" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                Tidak ada data keypoint untuk periode ini.
              </div>
            )}
          </div>
        </div>

        {/* 2. GRAFIK DONAT PENYEBAB TRIP */}
        <div 
          id="causes-donut-chart-card"
          className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Penyebab Trip JTM ({filterPeriodLabel})
              </h3>
              <p className="text-xs text-slate-500">
                Distribusi klasifikasi penyebab padam
              </p>
            </div>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            {penyebabTripData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={penyebabTripData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {penyebabTripData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const pct = totalTrip > 0 ? ((Number(data.value) / totalTrip) * 100).toFixed(1) : 0;
                          return (
                            <div className="p-2.5 bg-white text-slate-800 rounded-xl text-xs shadow-xl border border-slate-200 font-mono">
                              <div className="font-bold text-slate-900">{data.name}</div>
                              <div className="text-cyan-700 font-bold">
                                {data.value} Kejadian ({pct}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
                  <span className="text-2xl font-black text-slate-900">
                    {totalTrip}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Total Trip
                  </span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-xs font-mono">
                Tidak ada data penyebab untuk periode ini.
              </div>
            )}
          </div>

          {/* Donut Legend */}
          <div className="mt-2 space-y-1.5 overflow-y-auto max-h-36 pr-1 text-xs">
            {penyebabTripData.map((item, idx) => {
              const pct = totalTrip > 0 ? ((item.value / totalTrip) * 100).toFixed(1) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between py-1 font-mono text-[11px] border-b border-slate-100 last:border-0">
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className="w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length], height: '8px' }}
                    />
                    <span className="text-slate-700 truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 ml-2 flex-shrink-0">
                    {item.value}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DETAIL LOG TABLE OF GANGGUAN JTM (Filtered to pure trips & selected dates) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Log Kejadian Gangguan JTM ({tableData.length} Data • {filterPeriodLabel})
            </h3>
            <p className="text-xs text-slate-500">
              Keypoint terverifikasi (P_, REC_, SEC_) • Eksklusi manuver, TRAGI, penormalan, SCADA, & sebagian beban
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari keypoint, penyulang, penyebab..."
                value={searchTable}
                onChange={e => {
                  setSearchTable(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Penyulang</th>
                <th className="py-3 px-4">Keypoint</th>
                <th className="py-3 px-4">Relay</th>
                <th className="py-3 px-4">Sifat Gangguan</th>
                <th className="py-3 px-4">Keterangan / Penyebab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {item.tanggal}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-cyan-700">
                      {item.penyulang}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                      {item.keypoint}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                        {item.relay || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                          item.tipeGangguan === 'PERMANEN'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                        }`}
                      >
                        {item.tipeGangguan}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate" title={item.keterangan}>
                      {item.keterangan}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data gangguan yang sesuai dengan filter.
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
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white disabled:opacity-40 hover:border-cyan-500 text-slate-700 font-semibold"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white disabled:opacity-40 hover:border-cyan-500 text-slate-700 font-semibold"
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
