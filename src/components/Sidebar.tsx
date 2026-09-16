import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Scissors,
  MapPin,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Shield,
  RefreshCw,
  Zap,
  Boxes,
  FileSpreadsheet,
} from 'lucide-react';
import { TrafoIcon } from './icons/TrafoIcon';
import { PlnLogo } from './icons/PlnLogo';
import { DutyInfo } from '../utils/dutySchedule';

export type ActiveSection = 'dashboard' | 'gangguan' | 'gardu' | 'beban20kv' | 'row' | 'pengaduan' | 'kandang_ayam' | 'k3l' | 'material';

interface SidebarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  dutyInfo: DutyInfo;
  onOpenRoster: () => void;
  tripCount: number;
  overloadCount: number;
  pengaduanCount?: number;
  kandangCount?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenSyncModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  setActiveSection,
  isCollapsed,
  setIsCollapsed,
  dutyInfo,
  onOpenRoster,
  tripCount,
  overloadCount,
  pengaduanCount,
  kandangCount,
  onRefresh,
  isLoading,
  onOpenSyncModal,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveSection,
      label: 'Home',
      sublabel: 'Dashboard & Menu Utama',
      customIcon: null,
      icon: LayoutDashboard,
      badge: null,
      badgeColor: 'bg-cyan-600 text-white',
    },
    {
      id: 'gangguan' as ActiveSection,
      label: 'Monitoring Gangguan',
      sublabel: 'Rekap JTM & Top 10 Trip',
      customIcon: null,
      icon: AlertTriangle,
      badge: tripCount > 0 ? `${tripCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'gardu' as ActiveSection,
      label: 'Master Gardu',
      sublabel: 'Data Trafo & Simulasi Beban',
      customIcon: <TrafoIcon className="w-5 h-5 flex-shrink-0" />,
      icon: null,
      badge: overloadCount > 0 ? `${overloadCount} OL` : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'beban20kv' as ActiveSection,
      label: 'Beban 20kV',
      sublabel: 'Rekap Beban Tiap Penyulang',
      customIcon: null,
      icon: Zap,
      badge: '20kV',
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'row' as ActiveSection,
      label: 'Monitoring ROW',
      sublabel: 'Penebangan & Perampalan',
      customIcon: null,
      icon: Scissors,
      badge: null,
    },
    {
      id: 'pengaduan' as ActiveSection,
      label: 'Pengaduan Individu',
      sublabel: 'Yantek, WO & Auto Dispatch',
      customIcon: null,
      icon: MessageSquare,
      badge: pengaduanCount && pengaduanCount > 0 ? `${pengaduanCount}` : null,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'kandang_ayam' as ActiveSection,
      label: 'Peta Pelanggan Kandang Ayam',
      sublabel: 'Peta Lokasi & Koordinat GIS',
      customIcon: null,
      icon: MapPin,
      badge: kandangCount && kandangCount > 0 ? `${kandangCount}` : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'k3l' as ActiveSection,
      label: 'Monitoring K3L',
      sublabel: 'Survey, Stiker, CCV & Desa',
      customIcon: null,
      icon: Shield,
      badge: 'K3L',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'material' as ActiveSection,
      label: 'Monitoring Material',
      sublabel: 'Logistik & Stok Gudang Sinjai',
      customIcon: null,
      icon: Boxes,
      badge: 'STOK',
      badgeColor: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-white text-slate-700 transition-all duration-300 ease-in-out border-r border-slate-200 shadow-md ${
        isCollapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Sidebar Header / Brand (PLN Logo + ULP Sinjai + DASHBOARD TEKNIK ULP SINJAI) */}
      <div className="flex items-center justify-between h-14 px-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-center">
            <PlnLogo className={`${isCollapsed ? 'w-6 h-7' : 'w-6 h-8'} drop-shadow-xs`} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-black text-xs tracking-tight text-slate-900 flex items-center gap-1 uppercase font-sans">
                ULP Sinjai
                <span className="px-1 py-0.2 text-[7px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-mono">
                  LIVE
                </span>
              </span>
              <span className="text-[9px] font-bold text-cyan-800 uppercase tracking-tight truncate font-sans">
                DASHBOARD TEKNIK
              </span>
            </div>
          )}
        </div>

        <button
          id="collapse-sidebar-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-1.5 py-2 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-2 pt-1 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            Menu Operasional
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={`w-full group relative flex items-center rounded-lg transition-all duration-200 text-xs ${
                isCollapsed ? 'justify-center p-2' : 'px-2.5 py-2'
              } ${
                isActive
                  ? 'bg-cyan-50 text-cyan-800 font-bold border border-cyan-300 shadow-xs ring-1 ring-cyan-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {item.customIcon ? (
                <div className="flex-shrink-0 transition-transform group-hover:scale-105 scale-90">
                  {item.customIcon}
                </div>
              ) : (
                Icon && (
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-cyan-700' : 'text-slate-400 group-hover:text-cyan-700'
                    }`}
                  />
                )
              )}

              {!isCollapsed && (
                <div className="ml-2.5 flex-1 text-left truncate">
                  <div className="text-[11px] font-bold uppercase tracking-tight truncate leading-tight">{item.label}</div>
                  <div
                    className={`text-[9px] truncate leading-tight ${
                      isActive ? 'text-cyan-700 font-medium' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              )}

              {item.badge && !isCollapsed && (
                <span
                  className={`ml-1.5 px-1.5 py-0.2 text-[8px] font-bold font-mono rounded-full ${
                    item.badgeColor || 'bg-cyan-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isCollapsed && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sync Action & Piket Widget at Bottom (PLN Style) */}
      <div className="p-2 border-t border-slate-200 bg-slate-50 mt-auto space-y-1.5">
        {!isCollapsed ? (
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                id="sidebar-sync-btn"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold shadow-xs transition-all disabled:opacity-50"
                title="Sinkronkan data dari Google Spreadsheet"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Menyinkronkan...' : 'Sinkron Data'}</span>
              </button>
            )}
            {onOpenSyncModal && (
              <button
                id="sidebar-sheet-status-btn"
                onClick={onOpenSyncModal}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-cyan-700 transition-colors shadow-xs"
                title="Status Koneksi & GID Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}

        {!isCollapsed ? (
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 font-bold font-mono flex items-center justify-between">
              <span>Piket Hari Ini</span>
              <button
                id="view-roster-btn"
                onClick={onOpenRoster}
                className="text-[9px] text-cyan-600 hover:text-cyan-700 font-bold hover:underline"
              >
                Roster Jadwal
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-900 truncate">
                {dutyInfo.officer}
              </span>
              <span className="text-[9px] font-mono text-cyan-700 bg-cyan-50 px-1 py-0.2 rounded border border-cyan-200 ml-auto">
                24 Jam
              </span>
            </div>
            <div className="text-[9px] text-slate-500 mt-1 font-mono">
              Sinjai • {dutyInfo.dayNameIndo}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="w-full flex items-center justify-center p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors shadow-xs"
                title="Sinkronisasi Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {onOpenSyncModal && (
              <button
                onClick={onOpenSyncModal}
                className="w-full flex items-center justify-center p-1.5 rounded-lg bg-white text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 border border-slate-200 transition-colors shadow-xs"
                title="Status Koneksi & GID Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            )}
            <button
              id="collapsed-duty-btn"
              onClick={onOpenRoster}
              className="w-full flex items-center justify-center p-1.5 rounded-lg bg-white text-cyan-600 hover:bg-cyan-50 border border-slate-200 transition-colors shadow-xs"
              title={`Piket Hari Ini: ${dutyInfo.officer}`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};


