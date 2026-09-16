import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Settings,
  AlertCircle,
  Database,
  Layers,
  Zap,
  Info,
  RotateCcw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AllDashboardData } from '../services/sheetService';
import {
  DEFAULT_SHEET_GIDS,
  getActiveGids,
  saveActiveGids,
  resetGidsToDefault,
} from '../services/sheetService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: AllDashboardData;
  onRefresh: () => void;
  isLoading: boolean;
}

interface SectionGidInfo {
  id: string;
  name: string;
  sheetTab: string;
  gidKey: keyof typeof DEFAULT_SHEET_GIDS;
  description: string;
  dataCountText: (data: AllDashboardData) => string;
}

const SECTIONS_CONFIG: SectionGidInfo[] = [
  {
    id: 'gangguan',
    name: '1. Monitoring Gangguan JTM',
    sheetTab: 'REKAP GGN JTM',
    gidKey: 'GGN_JTM',
    description: 'Data pemadaman, trip penyulang, relay proteksi & analisa penyebab',
    dataCountText: (d) => `${(d.gangguan || []).length.toLocaleString('id-ID')} Data Gangguan`,
  },
  {
    id: 'gardu',
    name: '2. Master Gardu Distribusi',
    sheetTab: 'MASTER GARDU',
    gidKey: 'MASTER_GARDU',
    description: 'Data spesifikasi trafo, koordinat GIS, daya kVA & beban fasa',
    dataCountText: (d) => `${(d.gardu || []).length.toLocaleString('id-ID')} Unit Gardu`,
  },
  {
    id: 'beban20kv',
    name: '3. Rekap Beban 20kV Tiap Penyulang',
    sheetTab: 'MASTER GARDU & MAIP',
    gidKey: 'MASTER_GARDU',
    description: 'Kalkulasi beban feeder & keypoint dari data trafo & MAIP',
    dataCountText: (d) => `${(d.gardu || []).length.toLocaleString('id-ID')} Gardu Terkalkulasi`,
  },
  {
    id: 'row',
    name: '4. Monitoring ROW Harian',
    sheetTab: 'LAPORAN_ROW_HARIAN',
    gidKey: 'LAPORAN_ROW',
    description: 'P0 penebangan pohon, perampalan dahan & kms inspeksi jaringan',
    dataCountText: (d) => `${(d.rowHarian || []).length.toLocaleString('id-ID')} Log Pekerjaan ROW`,
  },
  {
    id: 'aset',
    name: '5. Data Aset JTM & Panjang KMS',
    sheetTab: 'DATA ASET JTM',
    gidKey: 'DATA_ASET',
    description: 'Inventaris segmen JTM, keypoint proteksi & panjang KMS aset',
    dataCountText: (d) => `${(d.aset || []).length.toLocaleString('id-ID')} Segmen JTM (${(d.summary?.totalKmsAset || 0).toFixed(1)} kms)`,
  },
  {
    id: 'pengaduan',
    name: '6. Monitoring Pengaduan Individu & Yantek',
    sheetTab: 'PENGADUAN INDIVIDU',
    gidKey: 'PENGADUAN_INDIVIDU',
    description: 'Tiket keluhan pelanggan, durasi dispatch Yantek & kanal laporan',
    dataCountText: (d) => `${(d.pengaduan || []).length.toLocaleString('id-ID')} Tiket Pengaduan`,
  },
  {
    id: 'kandang_ayam',
    name: '7. Peta Pelanggan Kandang Ayam',
    sheetTab: 'PETA KANDANG AYAM',
    gidKey: 'KANDANG_AYAM',
    description: 'Koordinat lokasi peternakan, rute KML & kapasitas daya pelanggan',
    dataCountText: (d) => `${(d.kandangAyam || []).length.toLocaleString('id-ID')} Titik GIS Peternakan`,
  },
  {
    id: 'k3l',
    name: '8. Monitoring K3L & CCV',
    sheetTab: 'K3 (CCV & Survey)',
    gidKey: 'K3',
    description: 'Survey potensi bahaya tiang, stiker K3, 2.331 CCV & sosialisasi',
    dataCountText: (d) => `${(d.k3?.ccv || []).length.toLocaleString('id-ID')} CCV • ${(d.k3?.surveyK3 || []).length} Survey`,
  },
  {
    id: 'material',
    name: '9. Monitoring Material Gudang',
    sheetTab: 'MONITORING MATERIAL',
    gidKey: 'MONITORING_MATERIAL',
    description: 'Stok logistik Gudang Rayon Sinjai, mutasi & saldo akhir',
    dataCountText: (d) => `${(d.material || []).length.toLocaleString('id-ID')} Jenis Material Gudang`,
  },
];

export const SpreadsheetSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  onRefresh,
  isLoading,
}) => {
  const [isEditingGids, setIsEditingGids] = useState(false);
  const [customGids, setCustomGids] = useState<Record<string, string>>(() => getActiveGids());
  const [saveToast, setSaveToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGidChange = (key: string, value: string) => {
    setCustomGids((prev) => ({
      ...prev,
      [key]: value.trim(),
    }));
  };

  const handleSaveGids = () => {
    saveActiveGids(customGids);
    setIsEditingGids(false);
    setSaveToast('Konfigurasi GID berhasil disimpan!');
    setTimeout(() => setSaveToast(null), 3500);
    onRefresh();
  };

  const handleResetGids = () => {
    resetGidsToDefault();
    setCustomGids({ ...DEFAULT_SHEET_GIDS });
    setIsEditingGids(false);
    setSaveToast('GID telah dikembalikan ke standar PLN Sinjai.');
    setTimeout(() => setSaveToast(null), 3500);
    onRefresh();
  };

  const formatLastSync = (date: Date) => {
    try {
      const d = new Date(date);
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WITA (' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ')';
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Status Koneksi Sumber Data Google Spreadsheet
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Memastikan setiap section terhubung ke GID spreadsheet sumber data masing-masing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {saveToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-6 py-2.5 flex items-center justify-between animate-fadeIn">
            <span>{saveToast}</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-xs">
          
          {/* SYNC CONTROL BANNER */}
          <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-cyan-900 text-sm">
                <Database className="w-4 h-4 text-cyan-700" />
                <span>Sinkronisasi Data Real-Time</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-700 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Terakhir diperbarui: <strong>{formatLastSync(data.lastUpdated)}</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Saat spreadsheet diubah di Google Docs, klik tombol di sebelah kanan untuk langsung menarik perubahan terbaru ke dashboard tanpa terhalang cache.
              </p>
            </div>
            
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>

          {/* EXPLANATION NOTE */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-amber-900 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 mb-0.5">Bagaimana sinkronisasi spreadsheet bekerja?</p>
              Google Spreadsheet yang dipublikasikan secara otomatis memproses pembaruan setelah pengguna menyimpan/mengedit sel (biasanya memerlukan waktu 1–5 menit di sisi server Google). Setiap kali Anda mengklik tombol <strong>&ldquo;Sinkronkan Sekarang&rdquo;</strong>, dashboard memotong cache lokal browser dan meminta data terbaru langsung dari GID terkait.
            </div>
          </div>

          {/* LIST OF SECTIONS AND GID MAPPINGS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                Daftar Section &amp; GID Spreadsheet Terhubung ({SECTIONS_CONFIG.length} Section)
              </span>
              <button
                onClick={() => setIsEditingGids(!isEditingGids)}
                className="text-cyan-700 hover:text-cyan-800 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isEditingGids ? 'Batal Edit GID' : 'Kelola / Ubah GID'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {SECTIONS_CONFIG.map((section) => {
                const currentGid = customGids[section.gidKey] || DEFAULT_SHEET_GIDS[section.gidKey];
                const activeDataText = section.dataCountText(data);

                return (
                  <div
                    key={section.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{section.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Tab: {section.sheetTab}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terhubung
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {section.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isEditingGids ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">GID:</span>
                          <input
                            type="text"
                            value={currentGid}
                            onChange={(e) => handleGidChange(section.gidKey, e.target.value)}
                            className="w-28 px-2 py-1 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="GID angka..."
                          />
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800 font-mono">
                            GID: {currentGid}
                          </div>
                          <div className="text-[11px] text-cyan-800 font-medium">
                            {activeDataText}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDIT ACTIONS */}
          {isEditingGids && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={handleResetGids}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke GID Standar</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingGids(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveGids}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs"
                >
                  Simpan &amp; Terapkan
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Semua 9 section siap menyinkronkan data Google Sheets secara dinamis</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
