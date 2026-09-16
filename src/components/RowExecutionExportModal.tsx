import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  X,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  Sparkles,
  TreePine,
  Scissors,
  Eye,
  Table,
  MapPin,
  Wrench,
  Calendar,
  CalendarRange,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { RowItem, AsetItem } from '../types';
import {
  buildRowExecutionReportData,
  buildLapHarBulananExportData,
  buildLaporanRowHarianExportData,
  exportRowExecutionToStyledXLS,
  exportRowExecutionToXLSX,
  exportRowExecutionToCSV,
  exportLapHarBulananToStyledXLS,
  exportLapHarBulananToXLSX,
  exportLapHarBulananToCSV,
  exportLaporanRowHarianToXLSX,
  exportLaporanRowHarianToStyledXLS,
  exportLaporanRowHarianToCSV,
  formatIndoDecimal,
  parseIndoNumber,
  parseRowDate,
  RowExecutionExportItem,
  LapHarBulananExportItem,
  LaporanRowHarianExportItem,
} from '../utils/rowExecutionExporter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rowList: RowItem[];
  asetList?: AsetItem[];
}

export const RowExecutionExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  rowList,
  asetList,
}) => {
  // Mode: 'rowHarian' (Sheet: Laporan_Row_harian) or 'lapHarBulanan' (15 Kolom Sheet Lap Har Bulanan) or 'sldRekap' (Rekapitulasi SLD Segmen)
  const [reportMode, setReportMode] = useState<'rowHarian' | 'lapHarBulanan' | 'sldRekap'>('rowHarian');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPenyulang, setSelectedPenyulang] = useState('ALL');
  
  // Date filter states
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [exportFormat, setExportFormat] = useState<'xlsx' | 'styled' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Apply date filtering to raw rowList
  const dateFilteredRowList = useMemo(() => {
    if (dateFilterMode === 'ALL' && !startDate && !endDate) {
      return rowList;
    }

    const now = new Date();

    return rowList.filter(item => {
      const d = item.tanggalParsed instanceof Date && !isNaN(item.tanggalParsed.getTime())
        ? item.tanggalParsed
        : parseRowDate(item.tanggal || item.timestamp);

      if (!d) {
        // If date cannot be parsed, include only if mode is ALL
        return dateFilterMode === 'ALL';
      }

      if (dateFilterMode === 'today') {
        const today = new Date();
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      }

      if (dateFilterMode === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return d >= sevenDaysAgo;
      }

      if (dateFilterMode === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return d >= thirtyDaysAgo;
      }

      if (dateFilterMode === 'thisMonth') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }

      if (dateFilterMode === 'custom' || startDate || endDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (d < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [rowList, dateFilterMode, startDate, endDate]);

  // 1. Data directly from Sheet "Laporan_Row_harian"
  const rowHarianData = useMemo(() => {
    return buildLaporanRowHarianExportData(dateFilteredRowList);
  }, [dateFilteredRowList]);

  // 2. Data for Lap Har Bulanan (15 Kolom) from dateFilteredRowList
  const lapHarBulananData = useMemo(() => {
    return buildLapHarBulananExportData(dateFilteredRowList);
  }, [dateFilteredRowList]);

  // 3. Data for SLD Rekap from dateFilteredRowList
  const sldRekapData = useMemo(() => {
    return buildRowExecutionReportData(dateFilteredRowList, asetList);
  }, [dateFilteredRowList, asetList]);

  // Extract unique feeders
  const availableFeeders = useMemo(() => {
    const set = new Set<string>();
    rowHarianData.forEach(d => {
      if (d.penyulang) set.add(d.penyulang);
    });
    lapHarBulananData.forEach(d => {
      if (d.penyulang) set.add(d.penyulang);
    });
    sldRekapData.forEach(d => {
      if (d.penyulang) set.add(d.penyulang);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [rowHarianData, lapHarBulananData, sldRekapData]);

  // Filtered Laporan_Row_harian data
  const displayRowHarianData = useMemo(() => {
    return rowHarianData.filter(item => {
      if (selectedPenyulang !== 'ALL' && item.penyulang !== selectedPenyulang) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.tanggal.toLowerCase().includes(q) ||
          item.timestamp.toLowerCase().includes(q) ||
          item.penyulang.toLowerCase().includes(q) ||
          item.keypoint.toLowerCase().includes(q) ||
          item.segment.toLowerCase().includes(q) ||
          item.tim.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rowHarianData, selectedPenyulang, searchQuery]);

  // Filtered Lap Har Bulanan data (search & penyulang)
  const displayLapHarData = useMemo(() => {
    return lapHarBulananData.filter(item => {
      if (selectedPenyulang !== 'ALL' && item.penyulang !== selectedPenyulang) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          item.tanggal.toLowerCase().includes(q) ||
          item.penyulang.toLowerCase().includes(q) ||
          item.zonaProteksi.toLowerCase().includes(q) ||
          item.section1.toLowerCase().includes(q) ||
          item.section2.toLowerCase().includes(q) ||
          item.detailPekerjaan.toLowerCase().includes(q) ||
          item.koordinatAwal.toLowerCase().includes(q) ||
          item.koordinatAkhir.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [lapHarBulananData, selectedPenyulang, searchQuery]);

  // Filtered SLD Rekap data (search & penyulang)
  const displaySldData = useMemo(() => {
    return sldRekapData.filter(item => {
      if (selectedPenyulang !== 'ALL' && item.penyulang !== selectedPenyulang) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          item.ulp.toLowerCase().includes(q) ||
          item.penyulang.toLowerCase().includes(q) ||
          item.segmen.toLowerCase().includes(q) ||
          item.lokasiSld.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sldRekapData, selectedPenyulang, searchQuery]);

  // Summary Metrics for Row Harian
  const rowHarianTotals = useMemo(() => {
    return {
      totalTebang: displayRowHarianData.reduce((acc, d) => acc + d.tebang, 0),
      totalRampal: displayRowHarianData.reduce((acc, d) => acc + d.perampalan, 0),
      totalTemuan: displayRowHarianData.reduce((acc, d) => acc + d.temuanButuhPadam, 0),
      totalKms: displayRowHarianData.reduce((acc, d) => acc + d.kmsInspeksi, 0),
      totalRows: displayRowHarianData.length,
    };
  }, [displayRowHarianData]);

  // Summary Metrics for Lap Har Bulanan
  const lapHarTotals = useMemo(() => {
    let totVolRow = 0;
    let totVolTeknik = 0;
    let totRealRampal1 = 0;
    let totRealRampal2 = 0;
    let totRealTbg1 = 0;
    let totRealTbg2 = 0;

    displayLapHarData.forEach(d => {
      totVolRow += typeof d.volumeRow === 'number' ? d.volumeRow : parseIndoNumber(d.volumeRow);
      totVolTeknik += typeof d.volumeTeknik === 'number' ? d.volumeTeknik : parseIndoNumber(d.volumeTeknik);
      totRealRampal1 += typeof d.realRampalSect1 === 'number' ? d.realRampalSect1 : parseIndoNumber(d.realRampalSect1);
      totRealRampal2 += typeof d.realRampalSect2 === 'number' ? d.realRampalSect2 : parseIndoNumber(d.realRampalSect2);
      totRealTbg1 += typeof d.realTbgSect1 === 'number' ? d.realTbgSect1 : parseIndoNumber(d.realTbgSect1);
      totRealTbg2 += typeof d.realTbgSect2 === 'number' ? d.realTbgSect2 : parseIndoNumber(d.realTbgSect2);
    });

    return {
      volRow: totVolRow,
      volTeknik: totVolTeknik,
      realRampal: totRealRampal1 + totRealRampal2,
      realTbg: totRealTbg1 + totRealTbg2,
      totalRows: displayLapHarData.length,
    };
  }, [displayLapHarData]);

  // Summary Metrics for SLD Rekap
  const sldTotals = useMemo(() => {
    return {
      perampalan: displaySldData.reduce((acc, d) => acc + d.perampalanKms, 0),
      tebang: displaySldData.reduce((acc, d) => acc + d.tebangPohon, 0),
      pelindung: displaySldData.reduce((acc, d) => acc + d.pemasanganPelindungIsolator, 0),
      yanggu: displaySldData.reduce((acc, d) => acc + d.inspeksiYanggu, 0),
      pembongkaran: displaySldData.reduce((acc, d) => acc + d.pembongkaranIsolator, 0),
    };
  }, [displaySldData]);

  // Date range label for display and filename
  const dateRangeLabel = useMemo(() => {
    if (dateFilterMode === 'today') return 'Hari_Ini';
    if (dateFilterMode === '7days') return '7_Hari_Terakhir';
    if (dateFilterMode === '30days') return '30_Hari_Terakhir';
    if (dateFilterMode === 'thisMonth') return 'Bulan_Ini';
    if (startDate && endDate) return `${startDate}_sd_${endDate}`;
    if (startDate) return `Mulai_${startDate}`;
    if (endDate) return `Sampai_${endDate}`;
    return new Date().toISOString().slice(0, 10);
  }, [dateFilterMode, startDate, endDate]);

  const handleResetDateFilter = () => {
    setDateFilterMode('ALL');
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    const dateSuffix = dateRangeLabel ? `_${dateRangeLabel}` : `_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (reportMode === 'rowHarian') {
        const fileNameBase = `Laporan_Row_harian_ULP_Sinjai${dateSuffix}`;
        if (exportFormat === 'xlsx') {
          exportLaporanRowHarianToXLSX(displayRowHarianData, `${fileNameBase}.xlsx`);
        } else if (exportFormat === 'styled') {
          exportLaporanRowHarianToStyledXLS(displayRowHarianData, `${fileNameBase}.xls`);
        } else {
          exportLaporanRowHarianToCSV(displayRowHarianData, `${fileNameBase}.csv`);
        }
      } else if (reportMode === 'lapHarBulanan') {
        const fileNameBase = `Lap_Har_Bulanan_ULP_Sinjai${dateSuffix}`;
        if (exportFormat === 'xlsx') {
          exportLapHarBulananToXLSX(displayLapHarData, `${fileNameBase}.xlsx`);
        } else if (exportFormat === 'styled') {
          exportLapHarBulananToStyledXLS(displayLapHarData, `${fileNameBase}_Laporan.xls`);
        } else {
          exportLapHarBulananToCSV(displayLapHarData, `${fileNameBase}.csv`);
        }
      } else {
        const fileNameBase = `Data_Eksekusi_ROW_ULP_Sinjai${dateSuffix}`;
        if (exportFormat === 'styled') {
          exportRowExecutionToStyledXLS(displaySldData, `${fileNameBase}_Format_Asli.xls`);
        } else if (exportFormat === 'xlsx') {
          exportRowExecutionToXLSX(displaySldData, `${fileNameBase}.xlsx`);
        } else {
          exportRowExecutionToCSV(displaySldData, `${fileNameBase}.csv`);
        }
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const isDateFiltered = dateFilterMode !== 'ALL' || !!startDate || !!endDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        id="row-execution-export-modal"
        className="relative w-full max-w-7xl max-h-[94vh] flex flex-col rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-sky-900 via-cyan-900 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Ekspor Laporan Pemeliharaan & Eksekusi ROW
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  {reportMode === 'rowHarian'
                    ? 'Laporan Realisasi Harian'
                    : reportMode === 'lapHarBulanan'
                    ? 'Laporan Bulanan'
                    : 'Format Rekapitulasi SLD'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Laporan pekerjaan penebangan, perampalan, dan pemeliharaan teknik jaringan ULP Sinjai
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOAST SUCCESS */}
        {showSuccessToast && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>File laporan berhasil diunduh ke komputer Anda sesuai tanggal realisasi yang dipilih!</span>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* FORMAT MODE TOGGLE & SEARCH BAR */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs: Laporan_Row_harian vs Lap Har Bulanan vs Rekapitulasi SLD */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              id="tab-format-row-harian"
              type="button"
              onClick={() => setReportMode('rowHarian')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'rowHarian'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Laporan ROW Harian</span>
            </button>
            <button
              id="tab-format-lap-har"
              type="button"
              onClick={() => setReportMode('lapHarBulanan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'lapHarBulanan'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Laporan Bulanan</span>
            </button>
            <button
              id="tab-format-rekap-sld"
              type="button"
              onClick={() => setReportMode('sldRekap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'sldRekap'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rekapitulasi Segmen SLD</span>
            </button>
          </div>

          {/* Search & Penyulang Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari tanggal, penyulang, pekerjaan..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 w-52 sm:w-64 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-xs"
              />
            </div>

            {/* Penyulang Filter */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedPenyulang}
                onChange={e => setSelectedPenyulang(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Penyulang ({availableFeeders.length})</option>
                {availableFeeders.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DATE FILTER TOOLBAR (FILTER TANGGAL REALISASI) */}
        <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-sky-950 font-bold mr-1">
              <CalendarRange className="w-4 h-4 text-sky-700" />
              <span>Filter Tanggal Realisasi:</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-sky-200 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === 'ALL' && !startDate && !endDate
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('today');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === 'today'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('7days');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === '7days'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('30days');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === '30days'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('thisMonth');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === 'thisMonth'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('custom')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === 'custom' || startDate || endDate
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Kustom
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="text-xs bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              />
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="text-xs bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Reset Button */}
            {isDateFiltered && (
              <button
                type="button"
                onClick={handleResetDateFilter}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Reset filter tanggal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Date Info Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-sky-800 font-medium">
              Periode Data:
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
              {dateFilterMode === 'ALL' && !startDate && !endDate
                ? `Semua Tanggal (${dateFilteredRowList.length} total baris)`
                : `${dateRangeLabel.replace(/_/g, ' ')} (${dateFilteredRowList.length} baris)`}
            </span>
          </div>
        </div>

        {/* SUMMARY STATS STRIP */}
        <div className="px-6 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          {reportMode === 'rowHarian' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Total Data:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {rowHarianTotals.totalRows} log realisasi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Realisasi Tebang:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {formatIndoDecimal(rowHarianTotals.totalTebang)} pohon
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Realisasi Perampalan:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatIndoDecimal(rowHarianTotals.totalRampal)} titik
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Temuan Butuh Padam:</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {formatIndoDecimal(rowHarianTotals.totalTemuan)} titik
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Total Inspeksi:</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {formatIndoDecimal(rowHarianTotals.totalKms)} kms
                </span>
              </div>
            </>
          ) : reportMode === 'lapHarBulanan' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Total Baris:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {lapHarTotals.totalRows} kegiatan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Realisasi Tebang:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {formatIndoDecimal(lapHarTotals.realTbg)} pohon
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Realisasi Rampal:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatIndoDecimal(lapHarTotals.realRampal)} kms
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Pekerjaan Pemeliharaan Teknik:</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {formatIndoDecimal(lapHarTotals.volTeknik)} unit/titik
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Total Segmen SLD:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {displaySldData.length} segmen
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Perampalan:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {formatIndoDecimal(sldTotals.perampalan)} kms
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Tebang Pohon:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatIndoDecimal(sldTotals.tebang)} btg
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Pelindung Isolator:</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {formatIndoDecimal(sldTotals.pelindung)} bh
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Eksekusi Yanggu:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {formatIndoDecimal(sldTotals.yanggu)} kms
                </span>
              </div>
            </>
          )}
        </div>

        {/* DATA PREVIEW TABLE */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {reportMode === 'rowHarian' ? (
              /* TABEL SHEET LAPORAN_ROW_HARIAN */
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-sky-900 text-white font-bold sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3 border border-sky-800 text-center whitespace-nowrap">NO</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">TIMESTAMP</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">TANGGAL</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">TIM</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">PENYULANG</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">KEYPOINT</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">SEGMENT</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">TEBANG (POHON)</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">PERAMPALAN (TITIK)</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">TEMUAN BUTUH PADAM</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">KMS INSPEKSI</th>
                      <th className="py-2.5 px-3 border border-sky-800 min-w-[160px]">KOORDINAT AWAL</th>
                      <th className="py-2.5 px-3 border border-sky-800 min-w-[160px]">KOORDINAT AKHIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRowHarianData.length > 0 ? (
                      displayRowHarianData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono font-semibold">{item.no}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.timestamp}</td>
                          <td className="py-2 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">{item.tanggal}</td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{item.tim}</td>
                          <td className="py-2 px-3 font-bold text-sky-900 whitespace-nowrap">{item.penyulang}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">{item.keypoint || '-'}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{item.segment || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-bold bg-amber-50/30">
                            {formatIndoDecimal(item.tebang)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold bg-emerald-50/30">
                            {formatIndoDecimal(item.perampalan)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold bg-rose-50/30">
                            {formatIndoDecimal(item.temuanButuhPadam)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-sky-800 font-semibold bg-sky-50/20">
                            {formatIndoDecimal(item.kmsInspeksi)}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.koordinatAwal || '-'}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.koordinatAkhir || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Calendar className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">Tidak ada data realisasi yang sesuai filter tanggal atau kata kunci.</p>
                            {isDateFiltered && (
                              <button
                                type="button"
                                onClick={handleResetDateFilter}
                                className="text-xs text-sky-600 font-bold hover:underline"
                              >
                                Klik untuk melihat Semua Tanggal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : reportMode === 'lapHarBulanan' ? (
              /* TABEL LAP HAR BULANAN (15 KOLOM) */
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-sky-900 text-white font-bold sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">TANGGAL</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">PENYULANG</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">ZONA PROTEKSI</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">SECTION 1</th>
                      <th className="py-2.5 px-3 border border-sky-800 whitespace-nowrap">SECTION 2</th>
                      <th className="py-2.5 px-3 border border-sky-800 min-w-[240px]">DETAIL PEKERJAAN</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-center whitespace-nowrap">SATUAN</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">VOLUME ROW</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">VOLUME TEKNIK</th>
                      <th className="py-2.5 px-3 border border-sky-800 min-w-[170px]">KOORDINAT TITIK AWAL</th>
                      <th className="py-2.5 px-3 border border-sky-800 min-w-[170px]">KOORDINAT TITIK AKHIR</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">REAL RAMPAL SECT 1</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">REAL RAMPAL SECT 2</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">REAL TBG SECT 1</th>
                      <th className="py-2.5 px-3 border border-sky-800 text-right bg-sky-800 whitespace-nowrap">REAL TBG SECT 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayLapHarData.length > 0 ? (
                      displayLapHarData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                          <td className="py-2 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">{item.tanggal}</td>
                          <td className="py-2 px-3 font-bold text-sky-900 whitespace-nowrap">{item.penyulang}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">{item.zonaProteksi || '-'}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{item.section1 || '-'}</td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{item.section2 || '-'}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{item.detailPekerjaan}</td>
                          <td className="py-2 px-3 text-center text-slate-600 font-mono">{item.satuan}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 bg-slate-50/50">
                            {typeof item.volumeRow === 'number' ? formatIndoDecimal(item.volumeRow) : (item.volumeRow || '-')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 bg-slate-50/50">
                            {typeof item.volumeTeknik === 'number' ? formatIndoDecimal(item.volumeTeknik) : (item.volumeTeknik || '-')}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.koordinatAwal || '-'}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.koordinatAkhir || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold bg-emerald-50/30">
                            {typeof item.realRampalSect1 === 'number' ? formatIndoDecimal(item.realRampalSect1) : (item.realRampalSect1 || '-')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold bg-emerald-50/30">
                            {typeof item.realRampalSect2 === 'number' ? formatIndoDecimal(item.realRampalSect2) : (item.realRampalSect2 || '-')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-bold bg-amber-50/30">
                            {typeof item.realTbgSect1 === 'number' ? formatIndoDecimal(item.realTbgSect1) : (item.realTbgSect1 || '-')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-bold bg-amber-50/30">
                            {typeof item.realTbgSect2 === 'number' ? formatIndoDecimal(item.realTbgSect2) : (item.realTbgSect2 || '-')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Calendar className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">Tidak ada data realisasi yang sesuai filter tanggal atau kata kunci.</p>
                            {isDateFiltered && (
                              <button
                                type="button"
                                onClick={handleResetDateFilter}
                                className="text-xs text-sky-600 font-bold hover:underline"
                              >
                                Klik untuk melihat Semua Tanggal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TABEL REKAPITULASI SEGMEN SLD */
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th rowSpan={2} className="py-2.5 px-3 bg-[#0e4952] text-white border border-[#0d424a] font-bold">
                        ULP
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 bg-[#0e4952] text-white border border-[#0d424a] font-bold">
                        PENYULANG
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 bg-[#0e4952] text-white border border-[#0d424a] font-bold">
                        SEGMEN
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 bg-[#0e4952] text-white border border-[#0d424a] font-bold min-w-[200px]">
                        LOKASI SLD
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Perampalan / ROW
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Tebang Pohon
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Pemasangan pelindung isolator
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Inspeksi dan Eksekusi Yanggu
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Inspeksi HI Mobile
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Pembongkaran Isolator
                      </th>
                      <th className="py-1.5 px-3 bg-[#990000] text-white border border-[#800000] text-center font-bold">
                        Perbaikan Jointing
                      </th>
                    </tr>
                    <tr>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">kms</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">btg</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">bh</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">kms</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">kms</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">bh</th>
                      <th className="py-1 px-3 bg-[#eab308] text-black border border-[#ca9a04] text-center font-bold">bh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displaySldData.length > 0 ? (
                      displaySldData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-bold text-red-700 whitespace-nowrap">{item.ulp}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{item.penyulang}</td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{item.segmen}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{item.lokasiSld}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIndoDecimal(item.perampalanKms)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIndoDecimal(item.tebangPohon)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIndoDecimal(item.pemasanganPelindungIsolator)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIndoDecimal(item.inspeksiYanggu)}</td>
                          <td className="py-2 px-3 text-right font-mono">{item.inspeksiHiMobile > 0 ? formatIndoDecimal(item.inspeksiHiMobile) : '-'}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatIndoDecimal(item.pembongkaranIsolator)}</td>
                          <td className="py-2 px-3 text-right font-mono">{item.perbaikanJointing > 0 ? formatIndoDecimal(item.perbaikanJointing) : '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Calendar className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">Tidak ada data segmen yang sesuai filter.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-700">Pilihan Format Ekspor:</span>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  exportFormat === 'xlsx'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('styled')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  exportFormat === 'styled'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Styled (.xls)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              id="btn-confirm-download-row-execution"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-md flex items-center space-x-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting
                  ? 'Memproses Unduhan...'
                  : `Download ${
                      reportMode === 'rowHarian'
                        ? 'Laporan ROW Harian'
                        : reportMode === 'lapHarBulanan'
                        ? 'Laporan Bulanan'
                        : 'Data Eksekusi SLD'
                    }`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
