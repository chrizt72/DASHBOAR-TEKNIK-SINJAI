import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, ActiveSection } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { MonitoringGangguan } from './components/MonitoringGangguan';
import { MasterGardu } from './components/MasterGardu';
import { Beban20kvSection } from './components/Beban20kvSection';
import { MonitoringRow } from './components/MonitoringRow';
import { MonitoringPengaduan } from './components/MonitoringPengaduan';
import { KandangAyamMap } from './components/KandangAyamMap';
import { MonitoringK3L } from './components/MonitoringK3L';
import { MonitoringMaterial } from './components/MonitoringMaterial';
import { DutyRosterModal } from './components/DutyRosterModal';
import { UploadScheduleModal } from './components/UploadScheduleModal';
import { SpreadsheetSyncModal } from './components/SpreadsheetSyncModal';
import { fetchDashboardData, AllDashboardData } from './services/sheetService';
import { getDutyForDate } from './utils/dutySchedule';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [isUploadScheduleModalOpen, setIsUploadScheduleModalOpen] = useState<boolean>(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Data state
  const [data, setData] = useState<AllDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Duty calculation for today
  const [dutyInfo, setDutyInfo] = useState(() => getDutyForDate(new Date()));

  // Realtime clock & duty update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setDutyInfo(getDutyForDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to custom schedule update events
  useEffect(() => {
    const handleScheduleUpdated = () => {
      setDutyInfo(getDutyForDate(new Date()));
    };
    window.addEventListener('pln_piket_schedule_updated', handleScheduleUpdated);
    return () => window.removeEventListener('pln_piket_schedule_updated', handleScheduleUpdated);
  }, []);

  // Fetch sheet data
  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(force);
      setData(result);
    } catch (err: any) {
      console.error('Failed to load sheet data:', err);
      setError(err?.message || 'Gagal memuat data dari Google Spreadsheet. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans antialiased selection:bg-cyan-500 selection:text-white flex">
      {/* 1. LEFT SIDEBAR (COLLAPSIBLE WITH HOME + 4 OPERATIONAL SECTIONS) */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        dutyInfo={dutyInfo}
        onOpenRoster={() => setIsRosterModalOpen(true)}
        tripCount={data?.summary.totalTrip1Tahun || 0}
        overloadCount={data?.summary.totalGarduOverload || 0}
        pengaduanCount={data?.summary.totalWoPengaduan || 0}
        kandangCount={data?.summary.totalKandangAyam || 0}
        onRefresh={() => loadData(true)}
        isLoading={loading}
        onOpenSyncModal={() => setIsSpreadsheetModalOpen(true)}
      />

      {/* 2. MAIN CONTAINER (SHIFTED ACCORDING TO SIDEBAR WIDTH) */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:ml-14' : 'md:ml-60'
        } ml-0 overflow-x-hidden`}
      >
        {/* MAIN BODY CONTENT */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 max-w-[2560px] 2xl:max-w-[3840px] w-full mx-auto space-y-6">
          {/* SYNC ERROR BANNER */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Kendala Sinkronisasi:</span> {error}
                </div>
              </div>
              <button
                onClick={() => loadData(true)}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* INITIAL LOADING SKELETON */}
          {loading && !data && (
            <div className="space-y-6 animate-pulse">
              <div className="h-44 rounded-3xl bg-white border border-slate-200 shadow-sm" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200 shadow-sm" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 rounded-2xl bg-white border border-slate-200 shadow-sm" />
                <div className="h-80 rounded-2xl bg-white border border-slate-200 shadow-sm" />
              </div>
            </div>
          )}

          {/* LOADED CONTENT */}
          {data && (
            <>
              {/* HOME / DASHBOARD OVERVIEW */}
              {activeSection === 'dashboard' && (
                <DashboardOverview
                  data={data}
                  dutyInfo={dutyInfo}
                  onOpenRoster={() => setIsRosterModalOpen(true)}
                  onOpenUploadSchedule={() => setIsUploadScheduleModalOpen(true)}
                  setActiveSection={setActiveSection}
                  currentTime={currentTime}
                  onRefresh={() => loadData(true)}
                  isLoading={loading}
                  onOpenSyncModal={() => setIsSpreadsheetModalOpen(true)}
                />
              )}

              {/* SECTION 1: MONITORING GANGGUAN JTM */}
              {activeSection === 'gangguan' && (
                <MonitoringGangguan gangguanList={data.gangguan} />
              )}

              {/* SECTION 2: MASTER GARDU & SIMULASI BEBAN */}
              {activeSection === 'gardu' && (
                <MasterGardu garduList={data.gardu} />
              )}

              {/* SECTION 3: REKAP BEBAN 20KV TIAP PENYULANG */}
              {activeSection === 'beban20kv' && (
                <Beban20kvSection
                  garduList={data.gardu}
                  onRefresh={() => loadData(true)}
                  isLoading={loading}
                />
              )}

              {/* SECTION 4: MONITORING ROW HARIAN */}
              {activeSection === 'row' && (
                <MonitoringRow rowList={data.rowHarian} asetList={data.aset} />
              )}

              {/* SECTION 4: MONITORING PENGADUAN INDIVIDU & YANTEK */}
              {activeSection === 'pengaduan' && (
                <MonitoringPengaduan pengaduanList={data.pengaduan} />
              )}

              {/* SECTION 5: PETA PELANGGAN KANDANG AYAM */}
              {activeSection === 'kandang_ayam' && (
                <KandangAyamMap
                  data={data.kandangAyam}
                  lastUpdated={data.lastUpdated}
                  onRefresh={() => loadData(true)}
                  isRefreshing={loading}
                />
              )}

              {/* SECTION 6: MONITORING K3L (SURVEY K3, STIKER K3, CCV & SOSIALISASI DESA) */}
              {activeSection === 'k3l' && (
                <MonitoringK3L
                  initialData={data.k3}
                  onRefresh={() => loadData(true)}
                  isLoading={loading}
                />
              )}

              {/* SECTION 7: MONITORING MATERIAL & LOGISTIK GUDANG SINJAI */}
              {activeSection === 'material' && (
                <MonitoringMaterial
                  materialList={data.material}
                  onRefresh={() => loadData(true)}
                  isLoading={loading}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. MODAL JADWAL PIKET PENANGGUNG JAWAB (CHRISTIAN, RAGIL, ALAMSYAH) */}
      <DutyRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        currentDuty={dutyInfo}
        onOpenUploadModal={() => setIsUploadScheduleModalOpen(true)}
      />

      {/* 4. MODAL UPLOAD FOTO & PENYESUAIAN FORM C1.A */}
      <UploadScheduleModal
        isOpen={isUploadScheduleModalOpen}
        onClose={() => setIsUploadScheduleModalOpen(false)}
        onScheduleUpdated={() => setDutyInfo(getDutyForDate(new Date()))}
      />

      {/* 5. MODAL STATUS KONEKSI & GID SPREADSHEET */}
      {data && (
        <SpreadsheetSyncModal
          isOpen={isSpreadsheetModalOpen}
          onClose={() => setIsSpreadsheetModalOpen(false)}
          data={data}
          onRefresh={() => loadData(true)}
          isLoading={loading}
        />
      )}
    </div>
  );
}

