import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  MapPin,
  AlertTriangle,
  HardHat,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  RefreshCw,
  Upload,
  Download,
  FolderArchive,
  Globe,
  Users,
  Award,
  Activity,
  Building2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  Compass,
  Check,
  Flame,
  HelpCircle,
  Settings,
  Link2,
  Info,
  Calendar,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  SurveyK3Item,
  StikerK3Item,
  CcvItem,
  CcvObserverRanking,
  DesaItem,
  K3LData,
} from '../types';
import {
  getInitialK3LData,
  calculateCcvRankings,
  parseExcelWorkbookK3L,
  resetK3LToDefault,
} from '../services/k3lService';
import { IsoK3L3D } from './icons/IsometricIcons';

// Helper: parse date string to Date object
function parseK3LDate(str?: string): Date | null {
  if (!str) return null;
  const s = str.trim();
  if (!s) return null;

  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: check if date falls in selected filter mode
function isDateInRange(
  dateStr: string | undefined,
  filterMode: 'all' | '7days' | '30days' | 'month' | 'custom',
  startStr: string,
  endStr: string,
  refDates: Date[]
): boolean {
  if (filterMode === 'all') return true;
  if (!dateStr) return false;

  const itemDate = parseK3LDate(dateStr);
  if (!itemDate) return false;

  const itemTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();

  // Determine reference 'now' (anchor to latest dataset date if future or demo data)
  let now = new Date();
  if (refDates.length > 0) {
    const maxTime = Math.max(...refDates.map((d) => d.getTime()));
    if (maxTime > now.getTime()) {
      now = new Date(maxTime);
    }
  }

  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (filterMode === '7days') {
    const sevenDaysAgo = new Date(todayZero);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return itemTime >= sevenDaysAgo.getTime() && itemTime <= todayZero + 86400000;
  }

  if (filterMode === '30days') {
    const thirtyDaysAgo = new Date(todayZero);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return itemTime >= thirtyDaysAgo.getTime() && itemTime <= todayZero + 86400000;
  }

  if (filterMode === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    return itemTime >= startOfMonth && itemTime <= endOfMonth;
  }

  if (filterMode === 'custom') {
    if (startStr) {
      const s = parseK3LDate(startStr);
      if (s && itemTime < new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()) {
        return false;
      }
    }
    if (endStr) {
      const e = parseK3LDate(endStr);
      if (e && itemTime > new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59).getTime()) {
        return false;
      }
    }
    return true;
  }

  return true;
}

// Sinjai regional center
const SINJAI_CENTER: [number, number] = [-5.225, 120.2];

// Tile Layers for Map
const MAP_LAYERS = {
  google_hybrid: {
    name: 'Google Satelit Hybrid',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps',
  },
  google_streets: {
    name: 'Google Maps Standar',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps',
  },
  dark: {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO',
  },
};

// Map Pan Controller
function MapController({ targetLocation }: { targetLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, 16, { duration: 1.2 });
    }
  }, [targetLocation, map]);
  return null;
}

// Custom Marker for Survey K3
function createSurveyPinIcon(isSelected: boolean, jenisTiang: string) {
  const isBeton = jenisTiang.toLowerCase().includes('beton');
  const isBesi = jenisTiang.toLowerCase().includes('besi');
  const baseColor = isSelected ? '#2563EB' : isBeton ? '#0284C7' : isBesi ? '#D97706' : '#DC2626';
  const size = isSelected ? 40 : 32;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size * 1.25}px; cursor: pointer;">
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: ${size * 0.6}px; height: 6px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(2px);"></div>
      <svg viewBox="0 0 384 512" style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size * 1.25}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path fill="${baseColor}" stroke="#ffffff" stroke-width="14" d="M192 0C85.96 0 0 85.96 0 192c0 77.4 55.4 142.9 128 178.6V480c0 17.7 14.3 32 32 32s32-14.3 32-32v-109.4c72.6-35.7 128-101.2 128-178.6C384 85.96 298 0 192 0z"/>
        <circle cx="192" cy="192" r="85" fill="#FFFFFF" />
        <text x="192" y="220" font-size="110" font-weight="900" fill="${baseColor}" text-anchor="middle" font-family="sans-serif">⚡</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'k3-survey-pin',
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25 - 2],
    popupAnchor: [0, -size * 1.25],
  });
}

// Custom Marker for Stiker K3
function createStikerPinIcon(isSelected: boolean) {
  const baseColor = isSelected ? '#2563EB' : '#EA580C';
  const size = isSelected ? 40 : 32;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size * 1.25}px; cursor: pointer;">
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: ${size * 0.6}px; height: 6px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(2px);"></div>
      <svg viewBox="0 0 384 512" style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size * 1.25}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path fill="${baseColor}" stroke="#ffffff" stroke-width="14" d="M192 0C85.96 0 0 85.96 0 192c0 77.4 55.4 142.9 128 178.6V480c0 17.7 14.3 32 32 32s32-14.3 32-32v-109.4c72.6-35.7 128-101.2 128-178.6C384 85.96 298 0 192 0z"/>
        <circle cx="192" cy="192" r="85" fill="#FEF08A" />
        <text x="192" y="222" font-size="100" font-weight="900" fill="#713F12" text-anchor="middle" font-family="sans-serif">⚠️</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'k3-stiker-pin',
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25 - 2],
    popupAnchor: [0, -size * 1.25],
  });
}

// Custom Marker for Secondary / Alternative Coordinates ("Titik Koordinat Lain")
function createSecondaryPinIcon(isSelected: boolean, type: 'survey' | 'stiker') {
  const baseColor = type === 'survey' ? '#9333EA' : '#DB2777'; // Purple for survey, deep pink for stiker
  const size = isSelected ? 38 : 30;
  const iconEmoji = type === 'survey' ? '📍' : '📌';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size * 1.25}px; cursor: pointer;">
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: ${size * 0.6}px; height: 6px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(2px);"></div>
      <svg viewBox="0 0 384 512" style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size * 1.25}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path fill="${baseColor}" stroke="#ffffff" stroke-width="14" stroke-dasharray="14 8" d="M192 0C85.96 0 0 85.96 0 192c0 77.4 55.4 142.9 128 178.6V480c0 17.7 14.3 32 32 32s32-14.3 32-32v-109.4c72.6-35.7 128-101.2 128-178.6C384 85.96 298 0 192 0z"/>
        <circle cx="192" cy="192" r="85" fill="#F3E8FF" />
        <text x="192" y="222" font-size="105" font-weight="900" fill="${baseColor}" text-anchor="middle" font-family="sans-serif">${iconEmoji}</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'k3-secondary-pin',
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25 - 2],
    popupAnchor: [0, -size * 1.25],
  });
}

interface MonitoringK3LProps {
  initialData?: K3LData;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const MonitoringK3L: React.FC<MonitoringK3LProps> = ({
  initialData,
  onRefresh,
  isLoading,
}) => {
  // Main Data State
  const [data, setData] = useState<K3LData>(() => initialData || getInitialK3LData());

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem('pln_custom_k3l_sheet_url') || '';
    } catch {
      return '';
    }
  });
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const [activeTab, setActiveTab] = useState<'survey' | 'stiker' | 'ccv' | 'desa'>('survey');
  const [selectedMapLayer, setSelectedMapLayer] = useState<keyof typeof MAP_LAYERS>('google_hybrid');

  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState<'all' | '7days' | '30days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sub-section 1 states (Data Survey K3)
  const [surveySearch, setSurveySearch] = useState('');
  const [surveyTiangFilter, setSurveyTiangFilter] = useState('ALL');
  const [selectedSurveyItem, setSelectedSurveyItem] = useState<SurveyK3Item | null>(null);

  // Sub-section 2 states (Data Stiker K3)
  const [stikerSearch, setStikerSearch] = useState('');
  const [selectedStikerItem, setSelectedStikerItem] = useState<StikerK3Item | null>(null);

  // Sub-section 3 states (Monitoring CCV)
  const [ccvSearch, setCcvSearch] = useState('');
  const [selectedObserverFilter, setSelectedObserverFilter] = useState('ALL');
  const [ccvPage, setCcvPage] = useState(1);
  const [ccvPerPage, setCcvPerPage] = useState(50);

  // Sub-section 4 states (Sosialisasi Desa)
  const [desaSearch, setDesaSearch] = useState('');
  const [desaStatusFilter, setDesaStatusFilter] = useState<'ALL' | 'SUDAH' | 'BELUM'>('ALL');
  const [desaKecamatanFilter, setDesaKecamatanFilter] = useState('ALL');

  // Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract all valid dates to anchor reference 'now' dynamically
  const allK3Dates = useMemo(() => {
    const dates: Date[] = [];
    data.surveyK3.forEach((s) => {
      const d = parseK3LDate(s.tanggalSurvey);
      if (d) dates.push(d);
    });
    data.stikerK3.forEach((s) => {
      const d = parseK3LDate(s.tanggalPasang);
      if (d) dates.push(d);
    });
    data.ccv.forEach((c) => {
      const d = parseK3LDate(c.tanggal);
      if (d) dates.push(d);
    });
    data.desaList.forEach((d) => {
      const dt = parseK3LDate(d.tanggalSosialisasi);
      if (dt) dates.push(dt);
    });
    return dates;
  }, [data]);

  // CCVs filtered by date for rankings (Matches SINJAI, ULP SINJAI, ULPSINJAI)
  const handleSaveConfig = () => {
    try {
      localStorage.setItem('pln_custom_k3l_sheet_url', sheetUrlInput.trim());
      setShowConfigModal(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to save config', e);
    }
  };

  const dateFilteredCcv = useMemo(() => {
    return data.ccv.filter((item) => {
      const matchesDate = isDateInRange(item.tanggal, dateFilterMode, startDate, endDate, allK3Dates);
      return matchesDate;
    });
  }, [data.ccv, dateFilterMode, startDate, endDate, allK3Dates]);

  // Rankings of CCV Observers (dynamic based on date filter)
  const ccvRankings = useMemo(() => {
    return calculateCcvRankings(dateFilteredCcv);
  }, [dateFilteredCcv]);

  // Top observer info
  const topObserver = useMemo(() => {
    return ccvRankings.length > 0 ? ccvRankings[0] : null;
  }, [ccvRankings]);

  // Filtered Survey Items (Tampilkan semua entri dari spreadsheet tanpa pengecualian unit)
  const filteredSurveyList = useMemo(() => {
    return data.surveyK3.filter((item) => {
      const q = surveySearch.toLowerCase();
      const matchesSearch =
        (item.idSurvey && item.idSurvey.toLowerCase().includes(q)) ||
        item.jenisTiang.toLowerCase().includes(q) ||
        item.potensiBahaya.toLowerCase().includes(q) ||
        (item.penyulang && item.penyulang.toLowerCase().includes(q)) ||
        (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
        (item.koordinatRaw && item.koordinatRaw.toLowerCase().includes(q)) ||
        (item.koordinatLainRaw && item.koordinatLainRaw.toLowerCase().includes(q)) ||
        (item.tanggalSurvey && item.tanggalSurvey.toLowerCase().includes(q));
      const matchesTiang =
        surveyTiangFilter === 'ALL' || item.jenisTiang.toLowerCase().includes(surveyTiangFilter.toLowerCase());
      const matchesDate = isDateInRange(item.tanggalSurvey, dateFilterMode, startDate, endDate, allK3Dates);

      return matchesSearch && matchesTiang && matchesDate;
    });
  }, [data.surveyK3, surveySearch, surveyTiangFilter, dateFilterMode, startDate, endDate, allK3Dates]);

  // Unique ID Survey count & Total coordinate points (including secondary coordinates)
  const uniqueSurveyIdsCount = useMemo(() => {
    const set = new Set(filteredSurveyList.map((s) => (s.idSurvey || s.id || '').trim()).filter(Boolean));
    return set.size;
  }, [filteredSurveyList]);

  const totalSurveyPointsCount = useMemo(() => {
    let count = 0;
    filteredSurveyList.forEach((s) => {
      if (s.hasValidCoordinate && s.lat && s.lng) count++;
      if (s.latLain && s.lngLain) count++;
    });
    return count;
  }, [filteredSurveyList]);

  // Filtered Stiker Items (Tampilkan semua entri dari spreadsheet tanpa pengecualian unit)
  const filteredStikerList = useMemo(() => {
    return data.stikerK3.filter((item) => {
      const q = stikerSearch.toLowerCase();
      const matchesSearch =
        (item.idStiker && item.idStiker.toLowerCase().includes(q)) ||
        item.jenisRambu.toLowerCase().includes(q) ||
        item.potensiBahaya.toLowerCase().includes(q) ||
        (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
        (item.koordinatRaw && item.koordinatRaw.toLowerCase().includes(q)) ||
        (item.koordinatLainRaw && item.koordinatLainRaw.toLowerCase().includes(q)) ||
        (item.tanggalPasang && item.tanggalPasang.toLowerCase().includes(q));
      const matchesDate = isDateInRange(item.tanggalPasang, dateFilterMode, startDate, endDate, allK3Dates);

      return matchesSearch && matchesDate;
    });
  }, [data.stikerK3, stikerSearch, dateFilterMode, startDate, endDate, allK3Dates]);

  // Unique ID Stiker count & Total coordinate points (including secondary coordinates)
  const uniqueStikerIdsCount = useMemo(() => {
    const set = new Set(filteredStikerList.map((s) => (s.idStiker || s.id || '').trim()).filter(Boolean));
    return set.size;
  }, [filteredStikerList]);

  const totalStikerPointsCount = useMemo(() => {
    let count = 0;
    filteredStikerList.forEach((s) => {
      if (s.hasValidCoordinate && s.lat && s.lng) count++;
      if (s.latLain && s.lngLain) count++;
    });
    return count;
  }, [filteredStikerList]);

  // Filtered CCV Items (Tampilkan semua entri dari spreadsheet tanpa pengecualian unit)
  const filteredCcvList = useMemo(() => {
    return data.ccv.filter((item) => {
      const matchesObserver =
        selectedObserverFilter === 'ALL' || item.namaObserver === selectedObserverFilter;
      const matchesSearch =
        item.namaObserver.toLowerCase().includes(ccvSearch.toLowerCase()) ||
        (item.lokasiPekerjaan && item.lokasiPekerjaan.toLowerCase().includes(ccvSearch.toLowerCase())) ||
        (item.catatanObserver && item.catatanObserver.toLowerCase().includes(ccvSearch.toLowerCase())) ||
        (item.tanggal && item.tanggal.toLowerCase().includes(ccvSearch.toLowerCase()));
      const matchesDate = isDateInRange(item.tanggal, dateFilterMode, startDate, endDate, allK3Dates);

      return matchesObserver && matchesSearch && matchesDate;
    });
  }, [data.ccv, selectedObserverFilter, ccvSearch, dateFilterMode, startDate, endDate, allK3Dates]);

  // Reset CCV page to 1 whenever filters change
  useEffect(() => {
    setCcvPage(1);
  }, [ccvSearch, selectedObserverFilter, dateFilterMode, startDate, endDate]);

  const totalCcvPages = Math.max(1, Math.ceil(filteredCcvList.length / ccvPerPage));
  const paginatedCcvList = useMemo(() => {
    const start = (ccvPage - 1) * ccvPerPage;
    return filteredCcvList.slice(start, start + ccvPerPage);
  }, [filteredCcvList, ccvPage, ccvPerPage]);

  // Filtered Desa Items
  const filteredDesaList = useMemo(() => {
    return data.desaList.filter((item) => {
      const matchesSearch =
        item.namaDesa.toLowerCase().includes(desaSearch.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(desaSearch.toLowerCase()) ||
        (item.tanggalSosialisasi && item.tanggalSosialisasi.toLowerCase().includes(desaSearch.toLowerCase()));
      const matchesStatus =
        desaStatusFilter === 'ALL' || item.status === desaStatusFilter;
      const matchesKecamatan =
        desaKecamatanFilter === 'ALL' || item.kecamatan === desaKecamatanFilter;

      let matchesDate = true;
      if (dateFilterMode !== 'all') {
        if (item.status === 'SUDAH' && item.tanggalSosialisasi) {
          matchesDate = isDateInRange(item.tanggalSosialisasi, dateFilterMode, startDate, endDate, allK3Dates);
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesKecamatan && matchesDate;
    });
  }, [data.desaList, desaSearch, desaStatusFilter, desaKecamatanFilter, dateFilterMode, startDate, endDate, allK3Dates]);

  // Unique Kecamatan List for filter
  const uniqueKecamatan = useMemo(() => {
    const set = new Set<string>();
    data.desaList.forEach((d) => set.add(d.kecamatan));
    return Array.from(set).sort();
  }, [data.desaList]);

  // Kecamatan Progress Summary
  const kecamatanProgress = useMemo(() => {
    const map = new Map<string, { total: number; sudah: number }>();
    data.desaList.forEach((d) => {
      const cur = map.get(d.kecamatan) || { total: 0, sudah: 0 };
      cur.total += 1;
      if (d.status === 'SUDAH') cur.sudah += 1;
      map.set(d.kecamatan, cur);
    });

    return Array.from(map.entries()).map(([kec, stat]) => ({
      kecamatan: kec,
      total: stat.total,
      sudah: stat.sudah,
      belum: stat.total - stat.sudah,
      persen: Math.round((stat.sudah / stat.total) * 100),
    })).sort((a, b) => b.persen - a.persen);
  }, [data.desaList]);

  // Handle Excel Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    setUploadFeedback(null);

    try {
      const parsedData = await parseExcelWorkbookK3L(file);
      setData(parsedData);
      setUploadFeedback({
        type: 'success',
        message: `Berhasil memproses data dari ${file.name}! Terdeteksi ${parsedData.summary.totalSurveyK3} Survey K3, ${parsedData.summary.totalStikerK3} Stiker K3, ${parsedData.summary.totalCcv} CCV, dan ${parsedData.summary.totalDesa} Desa.`,
      });
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFeedback(null);
      }, 2500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadFeedback({
        type: 'error',
        message: `Gagal membaca file: ${err.message || 'Format workbook tidak sesuai atau korup.'}`,
      });
    } finally {
      setIsProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan ke data default operasional K3L ULP Sinjai?')) {
      const def = resetK3LToDefault();
      setData(def);
    }
  };

  return (
    <div id="monitoring-k3l-root" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border border-emerald-500/30 p-6 shadow-xl">
        <div className="absolute -right-6 -bottom-8 opacity-40 pointer-events-none">
          <IsoK3L3D className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold tracking-wide">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SISTEM MANAJEMEN K3L & KESELAMATAN KETENAGALISTRIKAN</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                title="Klik untuk melihat / mengganti URL Google Sheet"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 hover:bg-emerald-800 text-emerald-300 border border-emerald-400/30 font-mono transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{sheetUrlInput ? 'Google Sheet (Custom Link)' : 'Google Sheet (GID: 445508288)'}</span>
                <Settings className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              MONITORING K3L ULP SINJAI
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Pemantauan terpadu survey potensi bahaya tiang, sebaran rambu & stiker K3, verifikasi inspeksi CCV, serta progres sosialisasi keselamatan ketenagalistrikan se-Kabupaten Sinjai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Sinkronisasi Data Google Sheet"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-700/80 hover:bg-teal-600 text-white font-medium text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Sinkronisasi...' : 'Sinkron Google Sheet'}</span>
              </button>
            )}
            <button
              onClick={() => setShowConfigModal(true)}
              title="Konfigurasi URL Google Sheet"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-sm shadow-md border border-slate-700 transition-all active:scale-95"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Link</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Impor Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              title="Unduh paket ZIP siap publish"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Unduh ZIP (Publish)</span>
            </button>
            <button
              onClick={handleResetDefault}
              title="Reset ke data default"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Summary Badges Bar */}
        <div className="mt-6 pt-4 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-white">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-emerald-300 block font-medium">Survey Potensi K3</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold">{uniqueSurveyIdsCount}</span>
              <span className="text-xs text-slate-300">
                ID Survey ({totalSurveyPointsCount} Titik Lokasi)
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-amber-300 block font-medium">Stiker & Rambu K3</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold">{uniqueStikerIdsCount}</span>
              <span className="text-xs text-slate-300">
                ID Stiker ({totalStikerPointsCount} Titik Lokasi)
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-sky-300 block font-medium">Monitoring CCV</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold">{filteredCcvList.length}</span>
              <span className="text-xs text-slate-300">
                {dateFilterMode !== 'all' ? `dari ${data.summary.totalCcv}` : 'Inspeksi'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-emerald-300 block font-medium">Desa Didatangi (Gabungan Desa & Data)</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold">{data.summary.desaSudah}/{data.summary.totalDesa}</span>
              <span className="text-xs text-emerald-400 font-semibold">({data.summary.persenSosialisasi}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Section Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('survey')}
          className={`flex-1 min-w-[190px] py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'survey'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>1. DATA SURVEY K3</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'survey'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {uniqueSurveyIdsCount} ID ({totalSurveyPointsCount} Titik)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stiker')}
          className={`flex-1 min-w-[190px] py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'stiker'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>2. DATA STIKER K3</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'stiker'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {uniqueStikerIdsCount} ID ({totalStikerPointsCount} Titik)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ccv')}
          className={`flex-1 min-w-[190px] py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'ccv'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>3. MONITORING CCV</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'ccv'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {filteredCcvList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('desa')}
          className={`flex-1 min-w-[190px] py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'desa'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4. SOSIALISASI DESA</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'desa'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {filteredDesaList.length}
          </span>
        </button>
      </div>

      {/* Filter Tanggal K3L Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Filter Tanggal
              </span>
              {dateFilterMode !== 'all' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Filter Aktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih rentang tanggal pelaksanaan kegiatan K3L
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Period Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setDateFilterMode('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === '7days'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateFilterMode('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === '30days'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kustom
            </button>
          </div>

          {/* Custom Date Pickers */}
          {dateFilterMode === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400 font-medium">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                title="Tanggal Selesai"
              />
            </div>
          )}

          {/* Reset Filter Button */}
          {(dateFilterMode !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setDateFilterMode('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center gap-1"
              title="Reset Filter Tanggal"
            >
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-SECTION 1: DATA SURVEY K3                            */}
      {/* ======================================================== */}
      {activeTab === 'survey' && (
        <div className="space-y-6">
          {/* Top description info bar */}
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold">Survey Potensi Bahaya K3</span>
                <p className="text-xs text-blue-700 dark:text-blue-300/80">
                  Perhitungan berbasis ID Survey unik dan pemetaan komprehensif seluruh titik lokasi (termasuk titik koordinat lain / alternatif).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white w-fit">
              <MapPin className="w-3.5 h-3.5" />
              <span>{uniqueSurveyIdsCount} ID Survey • {totalSurveyPointsCount} Titik Lokasi Peta</span>
            </div>
          </div>

          {/* Interactive Map: PETA SEBARAN SURVEY K3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  PETA SEBARAN POTENSI BAHAYA SURVEY K3
                </h3>
              </div>

              {/* Layer switcher */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
                {(Object.keys(MAP_LAYERS) as Array<keyof typeof MAP_LAYERS>).map((layerKey) => (
                  <button
                    key={layerKey}
                    onClick={() => setSelectedMapLayer(layerKey)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      selectedMapLayer === layerKey
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {MAP_LAYERS[layerKey].name.split(' ')[1] || MAP_LAYERS[layerKey].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div className="relative h-[440px] w-full z-0">
              <MapContainer
                center={SINJAI_CENTER}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  url={MAP_LAYERS[selectedMapLayer].url}
                  attribution={MAP_LAYERS[selectedMapLayer].attribution}
                  maxZoom={MAP_LAYERS[selectedMapLayer].maxZoom}
                  subdomains={MAP_LAYERS[selectedMapLayer].subdomains}
                />
                <MapController
                  targetLocation={
                    selectedSurveyItem && selectedSurveyItem.lat && selectedSurveyItem.lng
                      ? [selectedSurveyItem.lat, selectedSurveyItem.lng]
                      : null
                  }
                />

                {/* Render Survey Points (Primary Coordinates) */}
                {filteredSurveyList
                  .filter((s) => s.hasValidCoordinate && s.lat && s.lng)
                  .map((s) => (
                    <Marker
                      key={`srv-prim-${s.id}`}
                      position={[s.lat!, s.lng!]}
                      icon={createSurveyPinIcon(selectedSurveyItem?.id === s.id, s.jenisTiang)}
                      eventHandlers={{
                        click: () => setSelectedSurveyItem(s),
                      }}
                    >
                      <Popup className="k3-leaflet-popup">
                        <div className="p-1 space-y-2 text-slate-800 min-w-[250px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                            <span className="font-bold text-sm text-emerald-700 flex items-center gap-1">
                              ⚡ {s.jenisTiang} ({s.tinggiTiang})
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              ID: {s.idSurvey || s.id}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-900">Potensi Bahaya:</span>
                              <p className="text-red-600 font-medium mt-0.5 bg-red-50 p-1.5 rounded border border-red-200">
                                {s.potensiBahaya}
                              </p>
                            </div>
                            {s.lokasi && (
                              <div>
                                <span className="font-semibold">Lokasi:</span> {s.lokasi}
                              </div>
                            )}
                            {s.penyulang && (
                              <div>
                                <span className="font-semibold">Penyulang:</span> {s.penyulang}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold">Titik Utama (Kolom G):</span>{' '}
                              <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{s.koordinatRaw}</span>
                            </div>
                            {s.koordinatLainRaw && (
                              <div className="mt-1 p-1.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                                <span className="font-semibold text-[11px] text-purple-700 block">Titik Koordinat Lain / Alternatif:</span>
                                <span className="font-mono text-[11px]">{s.koordinatLainRaw}</span>
                              </div>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-center text-xs font-semibold py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Buka Titik Utama di Google Maps ↗
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Render Secondary / Alternative Survey Points ("Titik Koordinat Lain") */}
                {filteredSurveyList
                  .filter((s) => s.latLain && s.lngLain)
                  .map((s) => (
                    <Marker
                      key={`srv-alt-${s.id}`}
                      position={[s.latLain!, s.lngLain!]}
                      icon={createSecondaryPinIcon(selectedSurveyItem?.id === s.id, 'survey')}
                      eventHandlers={{
                        click: () => setSelectedSurveyItem(s),
                      }}
                    >
                      <Popup className="k3-leaflet-popup">
                        <div className="p-1 space-y-2 text-slate-800 min-w-[250px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                            <span className="font-bold text-sm text-purple-700 flex items-center gap-1">
                              📍 Titik Koordinat Lain
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              ID: {s.idSurvey || s.id}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">Tiang:</span> {s.jenisTiang} ({s.tinggiTiang})
                            </div>
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-900">Potensi Bahaya:</span>
                              <p className="text-purple-700 font-medium mt-0.5 bg-purple-50 p-1.5 rounded border border-purple-200">
                                {s.potensiBahaya}
                              </p>
                            </div>
                            {s.lokasi && (
                              <div>
                                <span className="font-semibold">Lokasi:</span> {s.lokasi}
                              </div>
                            )}
                            <div className="p-1.5 rounded bg-purple-100/70 border border-purple-300">
                              <span className="font-bold text-[11px] text-purple-900 block">Koordinat Terdeteksi Lain:</span>
                              <span className="font-mono text-[11px] text-purple-800">{s.koordinatLainRaw}</span>
                            </div>
                            {s.koordinatRaw && (
                              <div className="text-slate-500 text-[11px]">
                                <span className="font-semibold">Koordinat Utama:</span> {s.koordinatRaw}
                              </div>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${s.latLain},${s.lngLain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-center text-xs font-semibold py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition-colors"
                          >
                            Buka Titik Koordinat Lain di Google Maps ↗
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>

              {/* Map Floating Legend */}
              <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <span className="font-bold block text-slate-800 dark:text-white">Legenda Tiang Survey K3:</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-300">Tiang Beton</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-300">Tiang Besi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-300">Tiang Kayu / Lainnya</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-300 inline-block"></span>
                  <span className="text-purple-700 dark:text-purple-300 font-semibold">Titik Koordinat Lain / Alternatif</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Table: Data Survey K3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  DAFTAR TEMUAN SURVEY POTENSI BAHAYA K3
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan {uniqueSurveyIdsCount} ID Survey unik ({filteredSurveyList.length} baris, {totalSurveyPointsCount} titik koordinat) dari total {data.surveyK3.length} data survey
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari ID / tiang / potensi / koordinat..."
                    value={surveySearch}
                    onChange={(e) => setSurveySearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 w-64 text-slate-800 dark:text-white"
                  />
                </div>

                <select
                  value={surveyTiangFilter}
                  onChange={(e) => setSurveyTiangFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Jenis Tiang</option>
                  <option value="Beton">Tiang Beton</option>
                  <option value="Besi">Tiang Besi</option>
                  <option value="Kayu">Tiang Kayu</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">ID Survey</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-4">Jenis Tiang</th>
                    <th className="py-3 px-3">Tinggi Tiang</th>
                    <th className="py-3 px-4">Potensi Bahaya</th>
                    <th className="py-3 px-3">Koordinat Utama</th>
                    <th className="py-3 px-3">Titik Koordinat Lain</th>
                    <th className="py-3 px-3 text-center">Aksi / Peta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredSurveyList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        selectedSurveyItem?.id === item.id ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-medium text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 whitespace-nowrap">
                          {item.idSurvey || `SRV-${item.no}`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {item.jenisTiang}
                        {item.penyulang && (
                          <span className="block text-[11px] font-normal text-slate-500">{item.penyulang}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                          {item.tinggiTiang}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-xs text-rose-700 dark:text-rose-400 font-medium line-clamp-2">
                          {item.potensiBahaya}
                        </p>
                        {item.lokasi && (
                          <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                            📍 {item.lokasi}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.koordinatRaw || '-'}
                      </td>
                      <td className="py-3 px-3">
                        {item.koordinatLainRaw ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-900">
                            📍 {item.koordinatLainRaw}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.hasValidCoordinate && item.lat && item.lng ? (
                            <button
                              onClick={() => {
                                setSelectedSurveyItem(item);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors inline-flex items-center gap-1"
                              title="Tinjau Titik Utama di Peta"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Utama</span>
                            </button>
                          ) : null}
                          {item.latLain && item.lngLain ? (
                            <button
                              onClick={() => {
                                setSelectedSurveyItem({
                                  ...item,
                                  lat: item.latLain,
                                  lng: item.lngLain,
                                });
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-xs font-medium rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors inline-flex items-center gap-1"
                              title="Tinjau Titik Koordinat Lain di Peta"
                            >
                              <MapPin className="w-3.5 h-3.5 text-purple-600" />
                              <span>Lain</span>
                            </button>
                          ) : null}
                          {!item.hasValidCoordinate && !item.latLain && (
                            <span className="text-xs text-slate-400 italic">No GPS</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSurveyList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                        Tidak ditemukan data survey yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-SECTION 2: DATA STIKER K3                            */}
      {/* ======================================================== */}
      {activeTab === 'stiker' && (
        <div className="space-y-6">
          {/* Top description info bar */}
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold">Pemasangan Rambu & Stiker K3</span>
                <p className="text-xs text-amber-700 dark:text-amber-300/80">
                  Perhitungan berbasis ID Stiker unik dan pemetaan komprehensif seluruh titik pemasangan rambu keselamatan (termasuk titik koordinat lain / alternatif).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white w-fit">
              <MapPin className="w-3.5 h-3.5" />
              <span>{uniqueStikerIdsCount} ID Stiker • {totalStikerPointsCount} Titik Lokasi Peta</span>
            </div>
          </div>

          {/* Interactive Map: PETA SEBARAN STIKER K3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  PETA SEBARAN RAMBU & STIKER K3
                </h3>
              </div>

              {/* Layer switcher */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
                {(Object.keys(MAP_LAYERS) as Array<keyof typeof MAP_LAYERS>).map((layerKey) => (
                  <button
                    key={layerKey}
                    onClick={() => setSelectedMapLayer(layerKey)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      selectedMapLayer === layerKey
                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {MAP_LAYERS[layerKey].name.split(' ')[1] || MAP_LAYERS[layerKey].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div className="relative h-[440px] w-full z-0">
              <MapContainer
                center={SINJAI_CENTER}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  url={MAP_LAYERS[selectedMapLayer].url}
                  attribution={MAP_LAYERS[selectedMapLayer].attribution}
                  maxZoom={MAP_LAYERS[selectedMapLayer].maxZoom}
                  subdomains={MAP_LAYERS[selectedMapLayer].subdomains}
                />
                <MapController
                  targetLocation={
                    selectedStikerItem && selectedStikerItem.lat && selectedStikerItem.lng
                      ? [selectedStikerItem.lat, selectedStikerItem.lng]
                      : null
                  }
                />

                {/* Render Stiker Points (Primary Coordinates) */}
                {filteredStikerList
                  .filter((s) => s.hasValidCoordinate && s.lat && s.lng)
                  .map((s) => (
                    <Marker
                      key={`stk-prim-${s.id}`}
                      position={[s.lat!, s.lng!]}
                      icon={createStikerPinIcon(selectedStikerItem?.id === s.id)}
                      eventHandlers={{
                        click: () => setSelectedStikerItem(s),
                      }}
                    >
                      <Popup className="k3-leaflet-popup">
                        <div className="p-1 space-y-2 text-slate-800 min-w-[250px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                            <span className="font-bold text-sm text-amber-700 flex items-center gap-1">
                              ⚠️ {s.jenisRambu}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              ID: {s.idStiker || s.id}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-900">Potensi Bahaya:</span>
                              <p className="text-slate-800 font-medium mt-0.5 bg-amber-50 p-1.5 rounded border border-amber-200">
                                {s.potensiBahaya}
                              </p>
                            </div>
                            {s.lokasi && (
                              <div>
                                <span className="font-semibold">Lokasi:</span> {s.lokasi}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold">Titik Utama (Kolom D):</span>{' '}
                              <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{s.koordinatRaw}</span>
                            </div>
                            {s.koordinatLainRaw && (
                              <div className="mt-1 p-1.5 rounded bg-pink-50 text-pink-900 border border-pink-200">
                                <span className="font-semibold text-[11px] text-pink-700 block">Titik Koordinat Lain / Alternatif:</span>
                                <span className="font-mono text-[11px]">{s.koordinatLainRaw}</span>
                              </div>
                            )}
                            {s.kondisiRambu && (
                              <div>
                                <span className="font-semibold">Status:</span> {s.kondisiRambu}
                              </div>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-center text-xs font-semibold py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                          >
                            Buka Titik Utama di Google Maps ↗
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Render Secondary / Alternative Stiker Points ("Titik Koordinat Lain") */}
                {filteredStikerList
                  .filter((s) => s.latLain && s.lngLain)
                  .map((s) => (
                    <Marker
                      key={`stk-alt-${s.id}`}
                      position={[s.latLain!, s.lngLain!]}
                      icon={createSecondaryPinIcon(selectedStikerItem?.id === s.id, 'stiker')}
                      eventHandlers={{
                        click: () => setSelectedStikerItem(s),
                      }}
                    >
                      <Popup className="k3-leaflet-popup">
                        <div className="p-1 space-y-2 text-slate-800 min-w-[250px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                            <span className="font-bold text-sm text-pink-700 flex items-center gap-1">
                              📌 Titik Koordinat Lain
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-pink-100 text-pink-800">
                              ID: {s.idStiker || s.id}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">Rambu:</span> {s.jenisRambu}
                            </div>
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-900">Potensi Bahaya:</span>
                              <p className="text-pink-700 font-medium mt-0.5 bg-pink-50 p-1.5 rounded border border-pink-200">
                                {s.potensiBahaya}
                              </p>
                            </div>
                            {s.lokasi && (
                              <div>
                                <span className="font-semibold">Lokasi:</span> {s.lokasi}
                              </div>
                            )}
                            <div className="p-1.5 rounded bg-pink-100/70 border border-pink-300">
                              <span className="font-bold text-[11px] text-pink-900 block">Koordinat Terdeteksi Lain:</span>
                              <span className="font-mono text-[11px] text-pink-800">{s.koordinatLainRaw}</span>
                            </div>
                            {s.koordinatRaw && (
                              <div className="text-slate-500 text-[11px]">
                                <span className="font-semibold">Koordinat Utama:</span> {s.koordinatRaw}
                              </div>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${s.latLain},${s.lngLain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-center text-xs font-semibold py-1.5 px-3 bg-pink-700 hover:bg-pink-800 text-white rounded-lg transition-colors"
                          >
                            Buka Titik Koordinat Lain di Google Maps ↗
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>

              {/* Map Floating Legend */}
              <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <span className="font-bold block text-slate-800 dark:text-white">Legenda Rambu & Stiker:</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-300">Titik Utama Rambu K3</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="w-3 h-3 rounded-full bg-pink-600 border border-pink-300 inline-block"></span>
                  <span className="text-pink-700 dark:text-pink-300 font-semibold">Titik Koordinat Lain / Alternatif</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Table: Data Stiker K3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  DAFTAR PEMASANGAN RAMBU & STIKER K3
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan {uniqueStikerIdsCount} ID Stiker unik ({filteredStikerList.length} baris, {totalStikerPointsCount} titik koordinat) dari total {data.stikerK3.length} data stiker
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ID / jenis rambu / potensi..."
                  value={stikerSearch}
                  onChange={(e) => setStikerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500 w-72 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">ID Stiker</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-4">Jenis Rambu</th>
                    <th className="py-3 px-4">Potensi Bahaya</th>
                    <th className="py-3 px-4">Lokasi Pemasangan</th>
                    <th className="py-3 px-3">Koordinat Utama</th>
                    <th className="py-3 px-3">Titik Koordinat Lain</th>
                    <th className="py-3 px-3 text-center">Aksi / Peta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredStikerList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        selectedStikerItem?.id === item.id ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-medium text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 whitespace-nowrap">
                          {item.idStiker || `STK-${item.no}`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{item.jenisRambu}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.potensiBahaya}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {item.lokasi || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.koordinatRaw || '-'}
                      </td>
                      <td className="py-3 px-3">
                        {item.koordinatLainRaw ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-1.5 py-0.5 rounded border border-pink-200 dark:border-pink-900">
                            📍 {item.koordinatLainRaw}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.hasValidCoordinate && item.lat && item.lng ? (
                            <button
                              onClick={() => {
                                setSelectedStikerItem(item);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
                              title="Tinjau Titik Utama di Peta"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Utama</span>
                            </button>
                          ) : null}
                          {item.latLain && item.lngLain ? (
                            <button
                              onClick={() => {
                                setSelectedStikerItem({
                                  ...item,
                                  lat: item.latLain,
                                  lng: item.lngLain,
                                });
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-xs font-medium rounded-lg bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 hover:bg-pink-200 transition-colors inline-flex items-center gap-1"
                              title="Tinjau Titik Koordinat Lain di Peta"
                            >
                              <MapPin className="w-3.5 h-3.5 text-pink-600" />
                              <span>Lain</span>
                            </button>
                          ) : null}
                          {!item.hasValidCoordinate && !item.latLain && (
                            <span className="text-xs text-slate-400 italic">No GPS</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStikerList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                        Tidak ditemukan data stiker yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-SECTION 3: MONITORING CCV                            */}
      {/* ======================================================== */}
      {activeTab === 'ccv' && (
        <div className="space-y-6">
          {/* Top description info bar */}
          <div className="bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-sky-900 dark:text-sky-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold">Inspeksi Critical Control Verification (CCV)</span>
                <p className="text-xs text-sky-700 dark:text-sky-300/80">
                  Verifikasi kepatuhan kontrol kritis K3, pemenuhan SOP, dan keselamatan kerja teknisi lapangan ULP Sinjai.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white w-fit">
              <Award className="w-3.5 h-3.5" />
              <span>{filteredCcvList.length} Laporan Inspeksi Terverifikasi</span>
            </div>
          </div>

          {/* Leaderboard & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Top Observer Card */}
            <div className="md:col-span-1 bg-gradient-to-br from-amber-50 via-white to-amber-100/50 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900 border border-amber-200/90 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  PENGINPUT CCV TERBANYAK
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-500/30">
                  RANK #1
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-amber-500/20 border border-amber-300/60 dark:border-amber-400/40 shrink-0">
                  🥇
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1 border border-amber-300/70 dark:border-amber-700/50">
                    <span>Kontributor Teraktif</span>
                  </div>
                  <h4 className="text-xl font-extrabold text-amber-950 dark:text-amber-100 tracking-tight break-words">
                    {topObserver ? topObserver.namaObserver : 'Belum Ada Data'}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Observer K3 ULP Sinjai
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-amber-200/80 dark:border-amber-500/20 grid grid-cols-2 gap-3">
                <div className="bg-white/90 dark:bg-slate-800/80 border border-amber-100 dark:border-slate-700/60 rounded-xl p-2.5 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Input</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {topObserver ? topObserver.totalCcv : 0} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Laporan</span>
                  </span>
                </div>
                <div className="bg-white/90 dark:bg-slate-800/80 border border-amber-100 dark:border-slate-700/60 rounded-xl p-2.5 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Kontribusi</span>
                  <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
                    {topObserver ? topObserver.persentase : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Total CCV & Compliance Rate */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                    PERINGKAT OBSERVER CCV ULP SINJAI
                  </h4>
                  <span className="text-xs text-slate-500">
                    Total {filteredCcvList.length} Kegiatan Terverifikasi
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ccvRankings.slice(0, 4).map((rank, idx) => (
                    <div
                      key={rank.namaObserver}
                      onClick={() =>
                        setSelectedObserverFilter(
                          selectedObserverFilter === rank.namaObserver ? 'ALL' : rank.namaObserver
                        )
                      }
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedObserverFilter === rank.namaObserver
                          ? 'border-sky-500 bg-sky-50/90 dark:bg-sky-950/60 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60'
                              : idx === 1
                              ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                              : idx === 2
                              ? 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-300 dark:border-orange-800/60'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
                            {rank.namaObserver}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rank.patuhCount} Patuh ({rank.persentase}%)
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span className="font-bold text-sky-600 dark:text-sky-400 text-base">
                          {rank.totalCcv}
                        </span>
                        <span className="text-[10px] text-slate-400 block">CCV</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <span>Klik kartu nama observer di atas untuk memfilter tabel di bawah.</span>
                {selectedObserverFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedObserverFilter('ALL')}
                    className="text-sky-600 font-semibold hover:underline"
                  >
                    Reset Filter ({selectedObserverFilter})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table: Data CCV Entries */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  RIWAYAT VERIFIKASI CCV (KONTROL KRITIS K3L)
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan {filteredCcvList.length} dari total {data.ccv.length} inspeksi CCV ULP Sinjai
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari observer / pekerjaan / catatan..."
                    value={ccvSearch}
                    onChange={(e) => setCcvSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-sky-500 w-64 text-slate-800 dark:text-white"
                  />
                </div>

                <select
                  value={selectedObserverFilter}
                  onChange={(e) => setSelectedObserverFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500"
                >
                  <option value="ALL">Semua Observer ({ccvRankings.length})</option>
                  {ccvRankings.map((r) => (
                    <option key={r.namaObserver} value={r.namaObserver}>
                      {r.namaObserver} ({r.totalCcv})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Impor atau perbarui data CCV dari file Spreadsheet"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah CCV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-4">Nama Observer</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-4">Lokasi / Aktivitas Pekerjaan</th>
                    <th className="py-3 px-4">Catatan Observer</th>
                    <th className="py-3 px-3 text-center">Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedCcvList.map((item, idx) => {
                    const rowNumber = (ccvPage - 1) * ccvPerPage + idx + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-center font-medium text-slate-500 text-xs">{rowNumber}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                            {item.ulp}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {item.namaObserver.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{item.namaObserver}</span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                          {item.tanggal || '-'}
                        </td>
                        <td className="py-3 px-4 text-xs max-w-xs">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {item.lokasiPekerjaan || 'Pekerjaan Distribusi'}
                          </span>
                          {item.aktivitasPekerjaan && (
                            <span className="text-slate-500 block truncate">{item.aktivitasPekerjaan}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                          {item.catatanObserver || item.criticalControl || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.statusKepatuhan === 'PATUH'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {item.statusKepatuhan === 'PATUH' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{item.statusKepatuhan || 'PATUH'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCcvList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                        Tidak ada data verifikasi CCV yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredCcvList.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Menampilkan <strong>{(ccvPage - 1) * ccvPerPage + 1}</strong> - <strong>{Math.min(ccvPage * ccvPerPage, filteredCcvList.length)}</strong> dari <strong>{filteredCcvList.length.toLocaleString('id-ID')}</strong> Laporan CCV
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>Per halaman:</span>
                    <select
                      value={ccvPerPage}
                      onChange={(e) => {
                        setCcvPerPage(Number(e.target.value));
                        setCcvPage(1);
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCcvPage(1)}
                    disabled={ccvPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    « Pertama
                  </button>
                  <button
                    onClick={() => setCcvPage((p) => Math.max(1, p - 1))}
                    disabled={ccvPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    ‹ Sebelumnya
                  </button>
                  <span className="px-3 py-1 font-semibold text-slate-800 dark:text-white">
                    Halaman {ccvPage} / {totalCcvPages}
                  </span>
                  <button
                    onClick={() => setCcvPage((p) => Math.min(totalCcvPages, p + 1))}
                    disabled={ccvPage >= totalCcvPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    Selanjutnya ›
                  </button>
                  <button
                    onClick={() => setCcvPage(totalCcvPages)}
                    disabled={ccvPage >= totalCcvPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    Terakhir »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-SECTION 4: SOSIALISASI DESA                          */}
      {/* ======================================================== */}
      {activeTab === 'desa' && (
        <div className="space-y-6">
          {/* Top description info bar */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold">Sosialisasi K3 Ketenagalistrikan Desa</span>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                  Monitoring edukasi bahaya listrik masyarakat umum dan pemetaan prioritas desa yang belum dikunjungi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white w-fit">
              <CheckCircle2 className="w-4 h-4" />
              <span>{data.summary.desaSudah} dari {data.summary.totalDesa} Desa Sudah Didatangi</span>
            </div>
          </div>

          {/* Progress Metrics & Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Total Desa Se-Sinjai</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.summary.totalDesa}
                </span>
                <span className="text-xs text-slate-500">Desa / Kelurahan</span>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">9 Kecamatan di Sinjai</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block uppercase">
                Sudah Didatangi
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {data.summary.desaSudah}
                </span>
                <span className="text-xs text-emerald-600 font-bold">Desa</span>
              </div>
              <div className="mt-2 w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.summary.persenSosialisasi}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
              <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold block uppercase">
                Belum Didatangi (Target Prioritas)
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  {data.summary.desaBelum}
                </span>
                <span className="text-xs text-rose-600 font-bold">Desa Belum Tersentuh</span>
              </div>
              <span className="text-xs text-rose-500 mt-1 block font-medium">
                Perlu diagendakan sosialisasi K3
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Persentase Capaian</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.summary.persenSosialisasi}%
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Tingkat Sosialisasi K3 Sinjai</span>
            </div>
          </div>

          {/* Kecamatan Progress Breakdown Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              CAPAIAN SOSIALISASI PER KECAMATAN SE-KABUPATEN SINJAI
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {kecamatanProgress.map((item) => (
                <div
                  key={item.kecamatan}
                  onClick={() =>
                    setDesaKecamatanFilter(
                      desaKecamatanFilter === item.kecamatan ? 'ALL' : item.kecamatan
                    )
                  }
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    desaKecamatanFilter === item.kecamatan
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {item.kecamatan}
                    </span>
                    <span
                      className={`font-bold ${
                        item.persen === 100
                          ? 'text-emerald-600'
                          : item.persen >= 50
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {item.persen}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${
                        item.persen === 100
                          ? 'bg-emerald-500'
                          : item.persen >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.persen}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.sudah} Sudah</span>
                    <span className="text-rose-600 font-medium">{item.belum} Belum</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls & Table: Sosialisasi Desa */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  DAFTAR DESA / KELURAHAN (SUDAH VS BELUM DIDATANGI)
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan {filteredDesaList.length} dari total {data.desaList.length} desa
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari desa atau kelurahan..."
                    value={desaSearch}
                    onChange={(e) => setDesaSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 w-52 text-slate-800 dark:text-white"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setDesaStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      desaStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Semua ({data.summary.totalDesa})
                  </button>
                  <button
                    onClick={() => setDesaStatusFilter('SUDAH')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      desaStatusFilter === 'SUDAH'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    Sudah Tersurvey ({data.summary.desaSudah})
                  </button>
                  <button
                    onClick={() => setDesaStatusFilter('BELUM')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      desaStatusFilter === 'BELUM'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    Belum Tersurvey ({data.summary.desaBelum})
                  </button>
                </div>

                {/* Kecamatan Select */}
                <select
                  value={desaKecamatanFilter}
                  onChange={(e) => setDesaKecamatanFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Kecamatan</option>
                  {uniqueKecamatan.map((k) => (
                    <option key={k} value={k}>
                      Kec. {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Desa / Kelurahan</th>
                    <th className="py-3 px-3">Kecamatan</th>
                    <th className="py-3 px-4 text-center">Status Sosialisasi</th>
                    <th className="py-3 px-4">Keterangan / Rincian Kegiatan</th>
                    <th className="py-3 px-3">Tanggal / Sasaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredDesaList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        item.status === 'BELUM' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-medium text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.namaDesa}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                        {item.kecamatan}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.status === 'SUDAH' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SUDAH TERSURVEY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>BELUM TERSURVEY</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-sm">
                        {item.status === 'SUDAH' ? (
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {item.materi}
                            </span>
                            <span className="text-slate-500 block truncate">
                              📍 {item.lokasiKegiatan} • {item.jumlahPeserta} Peserta • Petugas: {item.petugas}
                            </span>
                          </div>
                        ) : (
                          <div className="text-rose-700 dark:text-rose-400 font-medium">
                            <span>Perlu diagendakan sosialisasi K3 publik, bahaya sentuh & jarak aman 2.5m JTM.</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              Rekomendasi: {item.rekomendasiJadwal || 'Target Kunjungan Berikutnya'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        {item.tanggalSosialisasi || (
                          <span className="text-rose-600 font-sans font-medium">Belum Ada Jadwal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDesaList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                        Tidak ditemukan desa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL UPLOAD SPREADSHEET / EXCEL FILE                    */}
      {/* ======================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600">
                <FileSpreadsheet className="w-6 h-6" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Unggah Spreadsheet / Excel K3L
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Unggah file Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) yang memiliki sheet:
              <br />
              • <strong>"DATA SURVEY K3"</strong> (Filter Kolom K: "SINJAI", Koordinat Kolom G)
              <br />
              • <strong>"DATA STIKER K3"</strong> (Filter Kolom C: "SINJAI", Koordinat Kolom D)
              <br />
              • <strong>"CCV"</strong> (Filter Kolom H: "ULP SINJAI", Observer Kolom C)
              <br />
              • <strong>"DESA"</strong> & <strong>"DATA"</strong> (Pemadanan desa yang sudah vs belum disosialisasi)
            </p>

            {/* Drag and Drop Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-400/50 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer bg-emerald-50/40 dark:bg-emerald-950/20 transition-all hover:bg-emerald-50/70"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <span className="text-sm font-bold text-slate-800 dark:text-white block">
                Klik atau seret file Excel ke sini
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Mendukung .xlsx, .xls, .csv
              </span>
            </div>

            {/* Loading / Status Feedback */}
            {isProcessingUpload && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang memproses sheet dan memetakan koordinat...</span>
              </div>
            )}

            {uploadFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  uploadFeedback.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {uploadFeedback.message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GOOGLE SHEET CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 animate-scaleUp p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Pengaturan Google Sheet K3L</h3>
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
                Tentukan tautan langsung (URL) Google Sheets tempat data monitoring K3L disimpan. Mendukung link editor biasa (<code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">/edit#gid=...</code>) maupun link publikasi web (<code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">/pub?...</code>).
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>URL Google Sheet K3L:</span>
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=445508288"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 leading-normal">
                  Kosongkan jika ingin menggunakan URL default Google Sheet PLN Sinjai (GID: 445508288).
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-[11px] text-emerald-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-700" />
                  Penting:
                </div>
                <ul className="list-disc pl-4 space-y-1 opacity-90">
                  <li>Pastikan dokumen Google Sheet dapat diakses publik (Anyone with the link can view) atau telah dipublikasikan ke web.</li>
                  <li>Sheet harus memiliki header/kolom yang relevan dengan format monitoring K3L PLN.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
              >
                Simpan & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. UNDUH PAKET ZIP / PUBLISH MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 animate-scaleUp p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Paket Siap Publish (ZIP)</h3>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <p className="leading-relaxed">
                Seluruh kode program, data survey K3L, stiker, CCV, dan pemetaan wilayah telah dikompilasi ke dalam paket ZIP untuk kebutuhan publikasi web (hosting) atau arsip sumber kode.
              </p>

              {/* Option 1: Full Bundle */}
              <div className="p-4 rounded-xl border-2 border-amber-500/60 bg-amber-50/50 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[10px] uppercase tracking-wider mb-1">
                      <span>Rekomendasi Utama</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Bundle Lengkap (Publish + Source Code)</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Berisi folder <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">dist/</code> (siap upload hosting) dan seluruh kode sumber + panduan.
                    </p>
                  </div>
                  <a
                    href="/pln-sinjai-k3l-publish.zip"
                    download="pln-sinjai-k3l-publish.zip"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Bundle (~1.8 MB)</span>
                  </a>
                </div>
              </div>

              {/* Option 2: Dist Only */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paket Web Hosting (Hanya Folder dist)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khusus untuk langsung diunggah ke cPanel (public_html), Netlify, Vercel, Firebase Hosting, atau Apache/Nginx.
                    </p>
                  </div>
                  <a
                    href="/pln-sinjai-k3l-dist.zip"
                    download="pln-sinjai-k3l-dist.zip"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Dist (~1.0 MB)</span>
                  </a>
                </div>
              </div>

              {/* Option 3: Full Source Only */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                      <span>Paket Source Code (Pengembangan / Backup)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Seluruh file proyek React, TypeScript, dan Tailwind CSS (buka di VS Code, jalankan <code className="font-mono bg-white px-1 py-0.5 rounded">npm install</code>).
                    </p>
                  </div>
                  <a
                    href="/pln-sinjai-k3l-full-source.zip"
                    download="pln-sinjai-k3l-full-source.zip"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Source (~0.8 MB)</span>
                  </a>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tips Tambahan: Export dari Menu Google AI Studio</span>
                </div>
                <p className="text-slate-600">
                  Anda juga dapat mengekspor proyek ini kapan saja melalui menu <strong>Settings</strong> di pojok antarmuka AI Studio lalu memilih <strong>Export to ZIP</strong> atau <strong>Export to GitHub</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
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
