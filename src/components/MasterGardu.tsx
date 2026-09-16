import React, { useState, useMemo } from 'react';
import {
  Server,
  Search,
  Sliders,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Info,
  HelpCircle,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';
import { GarduItem } from '../types';

interface Props {
  garduList: GarduItem[];
}

export const MasterGardu: React.FC<Props> = ({ garduList }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERLOAD' | 'NORMAL' | 'UNDERLOAD'>('ALL');
  const [selectedGardu, setSelectedGardu] = useState<GarduItem | null>(() => {
    // Default pick an overload or first gardu for immediate interactive view
    return garduList.find(g => g.statusBeban === 'OVERLOAD') || garduList[0] || null;
  });

  // Simulation State
  const [tambahanBebanKv, setTambahanBebanKv] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Filtered List
  const filteredGardu = useMemo(() => {
    return garduList.filter(g => {
      const matchSearch =
        searchTerm === '' ||
        g.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.penyulang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.keypoint.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || g.statusBeban === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [garduList, searchTerm, statusFilter]);

  // Statistics
  const totalGardu = garduList.length;
  const totalOverload = garduList.filter(g => g.statusBeban === 'OVERLOAD').length;
  const totalNormal = garduList.filter(g => g.statusBeban === 'NORMAL').length;
  const totalUnderload = garduList.filter(g => g.statusBeban === 'UNDERLOAD').length;

  // Simulation Calculation
  // Total Kapasitas kVA Trafo
  const currentKva = selectedGardu?.kvaTrafo || 50;
  const currentBebanPersen = selectedGardu?.bebanPersen || 0;
  const currentBebanKv = selectedGardu?.bebanKv || (currentBebanPersen * currentKva) / 100;

  // Added load in kVA/kV
  const totalSimulasiKv = Math.max(0, currentBebanKv + (tambahanBebanKv || 0));
  // Resulting percentage
  const totalSimulasiPersen = currentKva > 0 ? (totalSimulasiKv / currentKva) * 100 : 0;

  // Threshold condition: If > 80% -> "BUTUH MANAJEMEN TRAFO", If <= 80% -> "SILAHKAN DI LANJUT"
  const isOverloadThreshold = totalSimulasiPersen > 80;

  const totalPages = Math.ceil(filteredGardu.length / pageSize) || 1;
  const paginatedGardu = filteredGardu.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
            <Server className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
              Master Gardu Distribusi & Simulasi Beban Trafo
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Analisis beban per fasa (R, S, T, N) dan kalkulator rekomendasi pasang baru / tambah daya
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-gardu-input"
            type="text"
            placeholder="Cari Nama Gardu (cth: BS06000, BS59190)..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-xs font-mono"
          />
        </div>
      </div>

      {/* 4 STATS CARDS: TOTAL GARDU, OVERLOAD, NORMAL, UNDERLOAD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gardu */}
        <div
          id="gardu-stat-total"
          onClick={() => setStatusFilter('ALL')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            statusFilter === 'ALL'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/50'
              : 'border-slate-200 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Total Gardu
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 font-mono">
              {totalGardu.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">Unit</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Seluruh wilayah ULP Sinjai</div>
          </div>
        </div>

        {/* Total Overload */}
        <div
          id="gardu-stat-overload"
          onClick={() => setStatusFilter(statusFilter === 'OVERLOAD' ? 'ALL' : 'OVERLOAD')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            statusFilter === 'OVERLOAD'
              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50'
              : 'border-slate-200 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">
              Overload (&gt;80%)
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-red-600 font-mono">
              {totalOverload.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">
                ({totalGardu > 0 ? ((totalOverload / totalGardu) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-xs text-red-600 mt-1 font-medium">
              Butuh Manajemen Trafo Segera
            </div>
          </div>
        </div>

        {/* Total Normal */}
        <div
          id="gardu-stat-normal"
          onClick={() => setStatusFilter(statusFilter === 'NORMAL' ? 'ALL' : 'NORMAL')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            statusFilter === 'NORMAL'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50'
              : 'border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
              Normal (20%-80%)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-emerald-700 font-mono">
              {totalNormal.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">
                ({totalGardu > 0 ? ((totalNormal / totalGardu) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Kapasitas Optimal & Aman
            </div>
          </div>
        </div>

        {/* Total Underload */}
        <div
          id="gardu-stat-underload"
          onClick={() => setStatusFilter(statusFilter === 'UNDERLOAD' ? 'ALL' : 'UNDERLOAD')}
          className={`p-5 rounded-2xl bg-white border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
            statusFilter === 'UNDERLOAD'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/50'
              : 'border-slate-200 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 font-mono">
              Underload (&lt;20%)
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-cyan-700 font-mono">
              {totalUnderload.toLocaleString('id-ID')}
              <span className="text-xs font-normal text-slate-500 ml-1 italic">
                ({totalGardu > 0 ? ((totalUnderload / totalGardu) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Bisa Dilakukan Manuver Beban
            </div>
          </div>
        </div>
      </div>

      {/* SELECTED GARDU DETAIL & INTERACTIVE SIMULATION PANEL */}
      {selectedGardu && (
        <div 
          id="gardu-simulation-panel"
          className="p-6 rounded-2xl bg-white border border-cyan-200 shadow-sm space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                <Server className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 font-mono">
                    {selectedGardu.nama}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      selectedGardu.statusBeban === 'OVERLOAD'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : selectedGardu.statusBeban === 'NORMAL'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    }`}
                  >
                    {selectedGardu.statusBeban} ({selectedGardu.bebanPersen}%)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Penyulang: <span className="font-semibold text-cyan-700">{selectedGardu.penyulang}</span> • Keypoint: <span className="font-semibold text-slate-800">{selectedGardu.keypoint}</span> • Alamat: {selectedGardu.alamat || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTambahanBebanKv(0)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-600" />
                <span>Reset Simulasi</span>
              </button>
            </div>
          </div>

          {/* PARAMETER DATA CARD (KAPASITAS, FASA, IR, IS, IT, IN, FF, FN, BEBAN %) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center font-mono">
            {/* Kapasitas Trafo */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Kapasitas</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.kvaTrafo}
                <span className="text-[10px] font-normal text-slate-500 ml-1">kVA</span>
              </div>
            </div>

            {/* Fasa Trafo */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Fasa</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.fasaTrafo} <span className="text-[10px] font-normal text-slate-500">Fasa</span>
              </div>
            </div>

            {/* Arus IR */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-cyan-700">Arus I (R)</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.ir} <span className="text-[10px] font-normal text-slate-500">A</span>
              </div>
            </div>

            {/* Arus IS */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-amber-700">Arus I (S)</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.is} <span className="text-[10px] font-normal text-slate-500">A</span>
              </div>
            </div>

            {/* Arus IT */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-orange-700">Arus I (T)</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.it} <span className="text-[10px] font-normal text-slate-500">A</span>
              </div>
            </div>

            {/* Arus IN */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Arus I (N)</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedGardu.in} <span className="text-[10px] font-normal text-slate-500">A</span>
              </div>
            </div>

            {/* Tegangan FF & FN */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Tegangan (V)</div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                FF: {selectedGardu.ff}V<br />
                FN: {selectedGardu.fn}V
              </div>
            </div>

            {/* Beban Saat Ini (%) */}
            <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200">
              <div className="text-[10px] uppercase font-bold text-cyan-700">Beban Awal</div>
              <div className="text-base font-bold text-cyan-800 mt-0.5">
                {selectedGardu.bebanPersen}%
              </div>
            </div>
          </div>

          {/* SIMULATION BAR & CALCULATOR */}
          <div className="p-5 rounded-2xl bg-slate-50 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-600" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Kalkulator Simulasi Tambahan Beban Gardu
                </h4>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Ambang Batas Maksimal Rekomendasi:{' '}
                <span className="font-bold text-amber-600">80.0%</span>
              </div>
            </div>

            {/* Input Slider & Number */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-8 space-y-2">
                <div className="flex justify-between text-xs text-slate-700">
                  <span>Geser Tambahan Beban (kVA / kW):</span>
                  <span className="font-bold font-mono text-cyan-700">
                    +{tambahanBebanKv} kVA
                  </span>
                </div>
                <input
                  id="load-simulation-slider"
                  type="range"
                  min="0"
                  max={Math.max(100, currentKva)}
                  step="0.5"
                  value={tambahanBebanKv}
                  onChange={e => setTambahanBebanKv(parseFloat(e.target.value) || 0)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>+0 kVA</span>
                  <span>+{Math.round(currentKva * 0.25)} kVA</span>
                  <span>+{Math.round(currentKva * 0.5)} kVA</span>
                  <span>+{currentKva} kVA</span>
                </div>
              </div>

              <div className="md:col-span-4 flex items-center space-x-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1 font-mono font-medium">
                    Input Manual (kVA):
                  </label>
                  <input
                    id="load-simulation-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={tambahanBebanKv || ''}
                    onChange={e => setTambahanBebanKv(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:border-cyan-500 shadow-xs"
                  />
                </div>
                <div className="flex space-x-1 pt-4">
                  {[5, 10, 20].map(val => (
                    <button
                      key={val}
                      onClick={() => setTambahanBebanKv(prev => prev + val)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-cyan-700 font-mono shadow-xs transition-colors"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Visual Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  Total Beban Hasil Simulasi:
                </span>
                <span className="font-mono font-bold text-sm">
                  {totalSimulasiKv.toFixed(2)} kVA / {currentKva} kVA (
                  <span
                    className={
                      totalSimulasiPersen > 80
                        ? 'text-red-600'
                        : totalSimulasiPersen >= 60
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }
                  >
                    {totalSimulasiPersen.toFixed(2)}%
                  </span>
                  )
                </span>
              </div>

              {/* Progress Container */}
              <div className="relative w-full h-5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                {/* 80% Threshold Marker Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20"
                  style={{ left: '80%' }}
                  title="Batas Kritis 80%"
                />

                <div
                  className={`h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-[10px] font-bold font-mono text-white ${
                    totalSimulasiPersen > 80
                      ? 'bg-red-600'
                      : totalSimulasiPersen >= 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, totalSimulasiPersen))}%` }}
                >
                  {totalSimulasiPersen > 15 && `${totalSimulasiPersen.toFixed(1)}%`}
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0%</span>
                <span className="text-emerald-700">Normal (&lt;60%)</span>
                <span className="text-amber-700">Siaga (60%-80%)</span>
                <span className="text-red-600 font-bold">Batas 80% (Kritis)</span>
                <span>100%</span>
              </div>
            </div>

            {/* STATUS PEMBERITAHUAN (REQUIRED EXACT PHRASING) */}
            <div
              id="simulation-alert-result"
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                isOverloadThreshold
                  ? 'bg-red-50 border-red-300 text-red-900 shadow-xs'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    isOverloadThreshold ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isOverloadThreshold ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80 font-mono">
                    Status Evaluasi Beban Trafo:
                  </div>
                  <div className="text-lg md:text-xl font-mono font-black tracking-tight">
                    {isOverloadThreshold
                      ? '⚠️ BUTUH MANAJEMEN TRAFO'
                      : '✅ SILAHKAN DI LANJUT'}
                  </div>
                </div>
              </div>

              <div className="hidden sm:block text-right text-xs max-w-xs">
                {isOverloadThreshold ? (
                  <span className="text-red-700 font-normal">
                    Beban total mencapai <strong className="font-mono">{totalSimulasiPersen.toFixed(1)}%</strong> (&gt;80%). Disarankan uprating kapasitas trafo, pemerataan fasa, atau manuver beban.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-normal">
                    Beban total berada di <strong className="font-mono">{totalSimulasiPersen.toFixed(1)}%</strong> (&le;80%). Gardu beroperasi dalam batas aman dan andal.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL GARDU TABLE WITH SEARCH & STATUS FILTER */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Daftar Seluruh Gardu Distribusi ({filteredGardu.length} Gardu)
            </h3>
            <p className="text-xs text-slate-500">
              Klik pada baris gardu untuk membuka panel kalkulator simulasi beban di atas
            </p>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            {(['ALL', 'OVERLOAD', 'NORMAL', 'UNDERLOAD'] as const).map(st => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Gardu</th>
                <th className="py-3 px-4">Penyulang</th>
                <th className="py-3 px-4">Kapasitas</th>
                <th className="py-3 px-4">Fasa</th>
                <th className="py-3 px-4">Arus IR / IS / IT</th>
                <th className="py-3 px-4">Beban (%)</th>
                <th className="py-3 px-4">Status Beban</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedGardu.length > 0 ? (
                paginatedGardu.map((item, idx) => {
                  const isSelected = selectedGardu?.nama === item.nama;
                  return (
                    <tr
                      key={item.nama || idx}
                      onClick={() => {
                        setSelectedGardu(item);
                        setTambahanBebanKv(0);
                        // Smooth scroll to top of simulation panel
                        const panel = document.getElementById('gardu-simulation-panel');
                        if (panel) {
                          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-50/70 font-medium'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-400">{item.no || (page - 1) * pageSize + idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                        {item.nama}
                      </td>
                      <td className="py-2.5 px-4 text-cyan-700 font-medium">
                        {item.penyulang}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{item.kvaTrafo} kVA</td>
                      <td className="py-2.5 px-4 text-slate-700">{item.fasaTrafo} Fasa</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {item.ir} / {item.is} / {item.it} A
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        <span
                          className={
                            item.bebanPersen > 80
                              ? 'text-red-600'
                              : item.bebanPersen < 20
                              ? 'text-cyan-700'
                              : 'text-emerald-700'
                          }
                        >
                          {item.bebanPersen}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                            item.statusBeban === 'OVERLOAD'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : item.statusBeban === 'NORMAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          }`}
                        >
                          {item.statusBeban}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-600 hover:text-white shadow-xs transition-colors"
                        >
                          Simulasi
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada data gardu yang sesuai dengan pencarian.
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
