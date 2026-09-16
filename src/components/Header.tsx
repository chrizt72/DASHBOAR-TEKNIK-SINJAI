import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { PlnLogo } from './icons/PlnLogo';
import { DutyInfo, formatDateIndo, formatTimeWITA } from '../utils/dutySchedule';
import { ActiveSection } from './Sidebar';

interface HeaderProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  dutyInfo: DutyInfo;
  onOpenRoster: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: Date;
  isSidebarCollapsed: boolean;
  tripCount?: number;
  overloadCount?: number;
  kandangCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  dutyInfo,
  onOpenRoster,
  onRefresh,
  isLoading,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-[2560px] 2xl:max-w-[3840px] w-full mx-auto flex items-center justify-between gap-4">
        {/* Brand: Logo PLN + ULP Sinjai + DASHBOARD TEKNIK ULP SINJAI */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 flex items-center justify-center">
            <PlnLogo className="w-8 h-10 drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none uppercase font-sans">
                ULP Sinjai
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                ONLINE
              </span>
            </div>
            <p className="text-[11px] font-bold text-cyan-800 tracking-wider uppercase mt-1 font-sans">
              DASHBOARD TEKNIK ULP SINJAI
            </p>
          </div>
        </div>

        {/* Right Info: Clock, Piket Officer, Sync Button */}
        <div className="flex items-center gap-2.5">
          {/* Real-time Clock & Date */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <div className="flex items-center text-slate-700 font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
              <span>{formatDateIndo(currentTime)}</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center font-bold text-cyan-700">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
              <span>{formatTimeWITA(currentTime)}</span>
            </div>
          </div>

          {/* Petugas Piket Badge Button */}
          <button
            id="header-duty-roster-btn"
            onClick={onOpenRoster}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition-all text-left group"
            title="Klik untuk melihat Jadwal Lengkap Roster Piket"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold font-mono mr-1">
                Piket:
              </span>
              <span className="font-extrabold text-slate-900 group-hover:text-cyan-700">
                {dutyInfo.officer}
              </span>
            </div>
          </button>

          {/* Sync Button */}
          <button
            id="desktop-refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs border border-cyan-500 transition-all disabled:opacity-50"
            title="Muat Ulang Data Sistem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Sinkron...' : 'Sinkron Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};


