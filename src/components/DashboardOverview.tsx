import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Zap,
  Upload,
  Calendar,
  CheckCircle2,
  UserCheck,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import {
  IsoJTM3D,
  IsoTrafo3D,
  IsoBeban20kv3D,
  IsoTree3D,
  IsoTechnician3D,
  IsoMapPin3D,
  IsoK3L3D,
  IsoMaterial3D,
} from './icons/IsometricIcons';
import { PlnLogo } from './icons/PlnLogo';
import { AllDashboardData } from '../services/sheetService';
import {
  DutyInfo,
  formatDateIndo,
  formatTimeWITA,
  OFFICERS,
  MANAGER_ULP,
  getSavedSchedulePhoto,
} from '../utils/dutySchedule';
import { ActiveSection } from './Sidebar';

interface Props {
  data: AllDashboardData;
  dutyInfo: DutyInfo;
  onOpenRoster: () => void;
  onOpenUploadSchedule?: () => void;
  setActiveSection: (section: ActiveSection) => void;
  currentTime: Date;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenSyncModal?: () => void;
}

export const DashboardOverview: React.FC<Props> = ({
  data,
  dutyInfo,
  onOpenRoster,
  onOpenUploadSchedule,
  setActiveSection,
  currentTime,
  onRefresh,
  isLoading,
  onOpenSyncModal,
}) => {
  const { summary } = data;
  const [savedPhoto, setSavedPhoto] = useState<{ dataUrl: string; name: string; dateUploaded: string } | null>(null);

  useEffect(() => {
    setSavedPhoto(getSavedSchedulePhoto());
    const handleUpdated = () => {
      setSavedPhoto(getSavedSchedulePhoto());
    };
    window.addEventListener('pln_piket_schedule_updated', handleUpdated);
    return () => window.removeEventListener('pln_piket_schedule_updated', handleUpdated);
  }, []);

  // 5 Primary Operational Sections
  const operationalModules = [
    {
      id: 'gangguan' as ActiveSection,
      title: 'Monitoring Gangguan',
      description: 'Rekap trip JTM, tren bulanan & Top 10 Keypoint rawan padam',
      icon: <IsoJTM3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: `${summary.totalTrip1Tahun} Trip JTM`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      action: () => setActiveSection('gangguan'),
    },
    {
      id: 'gardu' as ActiveSection,
      title: 'Master Gardu',
      description: 'Data trafo distribusi, kapasitas daya & simulasi beban fasa',
      icon: <IsoTrafo3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: `${summary.totalGardu.toLocaleString('id-ID')} Unit Gardu`,
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-300',
      action: () => setActiveSection('gardu'),
    },
    {
      id: 'beban20kv' as ActiveSection,
      title: 'Beban 20kV',
      description: 'Rekap beban (kV & A) per penyulang & distribusi gardu trafo',
      icon: <IsoBeban20kv3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: 'Beban Feeder 20kV',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      action: () => setActiveSection('beban20kv'),
    },
    {
      id: 'row' as ActiveSection,
      title: 'Monitoring ROW',
      description: 'P0 penebangan & perampalan pohon rawan sentuh jaringan',
      icon: <IsoTree3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: `${(summary.totalTebangPohon + summary.totalPerampalanPohon).toLocaleString('id-ID')} Pohon`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      action: () => setActiveSection('row'),
    },
    {
      id: 'pengaduan' as ActiveSection,
      title: 'Pengaduan Individu',
      description: 'Monitoring tiket pengaduan pelanggan, performa yantek & dispatch',
      icon: <IsoTechnician3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: `${summary.totalWoPengaduan.toLocaleString('id-ID')} WO Tiket`,
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
      action: () => setActiveSection('pengaduan'),
    },
    {
      id: 'kandang_ayam' as ActiveSection,
      title: 'Peta Pelanggan Kandang Ayam',
      description: 'Peta lokasi GIS, rute jaringan KML & titik koordinat peternakan',
      icon: <IsoMapPin3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: `${summary.totalKandangAyam || 0} Titik GIS`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      action: () => setActiveSection('kandang_ayam'),
    },
    {
      id: 'k3l' as ActiveSection,
      title: 'Monitoring K3L',
      description: 'Survey potensi bahaya tiang, stiker K3, ranking CCV & sosialisasi desa',
      icon: <IsoK3L3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: 'K3L & Keselamatan',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      action: () => setActiveSection('k3l'),
    },
    {
      id: 'material' as ActiveSection,
      title: 'Monitoring Material',
      description: 'Stok logistik Gudang Rayon Sinjai (Gd Ry Sinjai), mutasi & alokasi akun',
      icon: <IsoMaterial3D className="w-20 h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-105" />,
      badge: 'Gudang Sinjai',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      action: () => setActiveSection('material'),
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full rounded-3xl overflow-hidden bg-white text-slate-800 border border-slate-200 shadow-md pb-8 flex flex-col justify-between">
      
      {/* Background Blueprint Grid Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <svg className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern-white" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#E2E8F0" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-white)" />
        </svg>
      </div>

      {/* HERO SECTION (PLN Logo + Title + Slogan + Waktu & Tanggal/Piket Widgets) */}
      <div className="relative z-10 px-6 md:px-10 pt-8 pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Hero Left: Logo PLN, Title, Subtitle, Slogan */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 flex items-center justify-center">
                <PlnLogo className="w-12 h-14 drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 uppercase font-sans leading-none">
                    ULP SINJAI
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    LIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-cyan-800 tracking-wider uppercase mt-1">
                  DASHBOARD TEKNIK ULP SINJAI
                </p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm font-medium text-slate-600 tracking-wide">
              Sistem Informasi Terpadu Monitoring & Keandalan Distribusi JTM 20 kV
            </p>

            {/* Slogan Accent Bar */}
            <div className="pt-1">
              <div className="w-16 h-1 bg-yellow-400 rounded-full mb-2 shadow-xs" />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs font-extrabold font-mono tracking-wider shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600" />
                <span>&ldquo; TEKNIK SINJAI, TERANG, BENDERANG, EHAO !!!! &rdquo;</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Dual Widgets (WAKTU & TANGGAL) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto">
            
            {/* WIDGET 1: WAKTU (Digital Clock) */}
            <div 
              id="widget-digital-time"
              className="flex-1 sm:w-56 bg-slate-50 border border-slate-200 hover:border-cyan-400 transition-all rounded-2xl p-4 shadow-xs flex flex-col justify-center relative overflow-hidden group"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold font-mono mb-1">
                WAKTU WITA
              </div>
              
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1.5">
                <span>{formatTimeWITA(currentTime)}</span>
              </div>

              <div className="text-[10px] text-emerald-700 font-mono mt-1 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Waktu Standar WITA</span>
              </div>
            </div>

            {/* WIDGET 2: TANGGAL (Full Indonesian Date) */}
            <div 
              id="widget-calendar-date"
              onClick={onOpenRoster}
              className="flex-1 sm:w-72 bg-slate-50 border border-slate-200 hover:border-cyan-400 transition-all rounded-2xl p-4 shadow-xs flex flex-col justify-center relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold font-mono mb-1">
                  TANGGAL & JADWAL PIKET
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight truncate">
                {formatDateIndo(currentTime)}
              </div>

              <div className="text-[11px] text-cyan-800 font-medium mt-1 flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                <span className="truncate">Piket: <strong className="text-slate-900 font-bold">{dutyInfo.officer}</strong> (Siaga 24 Jam)</span>
              </div>
            </div>

            {/* WIDGET 3: LIVE SPREADSHEET SYNC STATUS */}
            <div
              id="widget-spreadsheet-sync"
              onClick={onOpenSyncModal}
              className="flex-1 sm:w-64 bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 transition-all rounded-2xl p-4 shadow-xs flex flex-col justify-center relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-extrabold font-mono mb-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>SUMBER DATA SHEET</span>
                </div>
                {onRefresh && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                    disabled={isLoading}
                    title="Sinkronkan Sekarang"
                    className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>9 Section Terhubung</span>
              </div>

              <div className="text-[10px] text-emerald-800 font-medium mt-1 flex items-center justify-between">
                <span>Live Google Spreadsheet</span>
                <span className="font-bold text-emerald-700 underline group-hover:text-emerald-900">Lihat GID →</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 6 PRIMARY OPERATIONAL MODULE CARDS (RESPONSIVE GRID) */}
      <div className="relative z-10 px-6 md:px-10 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {operationalModules.map((mod) => (
            <div
              key={mod.id}
              id={`cmd-card-${mod.id}`}
              onClick={mod.action}
              className="group relative p-6 rounded-2xl bg-white hover:bg-cyan-50/30 border border-slate-200 hover:border-cyan-400 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col justify-between overflow-hidden ring-0 hover:ring-2 hover:ring-cyan-200"
            >
              {/* 3D Isometric Graphical Icon centered */}
              <div className="flex items-center justify-center pt-3 pb-6">
                <div className="relative transform group-hover:scale-105 transition-transform duration-300">
                  {mod.icon}
                </div>
              </div>

              {/* Title, Subtitle, Metric Badge, and Jump Button */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-cyan-800 transition-colors uppercase tracking-tight line-clamp-1">
                  {mod.title}
                </h3>

                <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors line-clamp-2 leading-relaxed min-h-[36px]">
                  {mod.description}
                </p>

                {/* Footer of card: Metric Chip & Circular Arrow Button */}
                <div className="pt-2 flex items-center justify-between">
                  <span className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-full border ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>

                  {/* Circular Arrow Button */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-cyan-600 group-hover:border-cyan-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-all duration-200 shadow-xs">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM SECTION OF HOME: UPLOAD & JADWAL PIKET BULANAN (FORM C1.A) */}
      <div className="relative z-10 px-6 md:px-10 pb-6">
        <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white border border-slate-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Left Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold font-mono border border-cyan-500/40">
                FORM C1.A • JADWAL PENUGASAN PIKET KHUSUS P21B
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono">
                ULP Sinjai
              </span>
              {savedPhoto && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Foto Jadwal Terlampir
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-600 text-white flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
                  Piket Hari Ini: <span className="text-cyan-300">{dutyInfo.fullName}</span> ({dutyInfo.officer})
                </h3>
                <p className="text-xs text-slate-300 font-mono">
                  NIP: {dutyInfo.nip} • {dutyInfo.role} • Manajer: {MANAGER_ULP.name}
                </p>
              </div>
            </div>

            {/* 3 Officers Mini Tags */}
            <div className="flex items-center flex-wrap gap-2 pt-1">
              {OFFICERS.map((off) => (
                <div
                  key={off.name}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 ${
                    dutyInfo.officer === off.name
                      ? 'bg-cyan-500/30 text-white border-cyan-400 font-bold'
                      : 'bg-white/5 text-slate-300 border-white/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{off.fullName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
            {onOpenUploadSchedule && (
              <button
                id="upload-piket-photo-bottom-btn"
                onClick={onOpenUploadSchedule}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-98"
              >
                <Upload className="w-4 h-4 text-slate-950" />
                <span>Upload Foto / Sesuaikan Jadwal Piket</span>
              </button>
            )}

            <button
              id="view-calendar-roster-btn"
              onClick={onOpenRoster}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 flex items-center justify-center gap-2 transition-all"
            >
              <Calendar className="w-4 h-4 text-cyan-300" />
              <span>Lihat Kalender Roster</span>
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="relative z-10 px-6 md:px-10 pt-4 pb-4 mt-auto border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          © 2026 <span className="text-slate-900 font-bold">PLN ULP SINJAI</span> - PT PLN (Persero) UID Sulselrabar.
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live Google Spreadsheet Connected
          </span>
          <span>•</span>
          <span className="text-cyan-800 font-bold">DASHBOARD TEKNIK</span>
        </div>
      </div>

    </div>
  );
};

