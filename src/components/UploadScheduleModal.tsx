import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  X,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  OfficerName,
  OFFICERS,
  MANAGER_ULP,
  OFFICIAL_SEPTEMBER_2026_SCHEDULE,
  getCustomSchedules,
  saveCustomSchedules,
  getSavedSchedulePhoto,
  saveSchedulePhoto,
} from '../utils/dutySchedule';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const UploadScheduleModal: React.FC<Props> = ({ isOpen, onClose, onScheduleUpdated }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 = September (0-indexed)
  
  // Custom schedule state for current selected year-month
  const [monthSchedule, setMonthSchedule] = useState<Record<number, OfficerName>>({});
  const [savedPhoto, setSavedPhoto] = useState<{ dataUrl: string; name: string; dateUploaded: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Days calculation for selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Load existing schedule when modal opens or month/year changes
  useEffect(() => {
    if (!isOpen) return;

    // Load photo
    const photo = getSavedSchedulePhoto();
    setSavedPhoto(photo);

    // Load custom schedule
    const customMap = getCustomSchedules();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const newMap: Record<number, OfficerName> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(day)}`;
      if (customMap[dateKey]) {
        newMap[day] = customMap[dateKey];
      } else if (selectedYear === 2026 && selectedMonth === 8 && OFFICIAL_SEPTEMBER_2026_SCHEDULE[day]) {
        newMap[day] = OFFICIAL_SEPTEMBER_2026_SCHEDULE[day];
      }
    }
    setMonthSchedule(newMap);
  }, [isOpen, selectedYear, selectedMonth, daysInMonth]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handleFileSelected = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const photoObj = {
        dataUrl,
        name: file.name,
        dateUploaded: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setSavedPhoto(photoObj);
      saveSchedulePhoto(photoObj);
      triggerSuccess('Foto jadwal berhasil diunggah dan disimpan!');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDeletePhoto = () => {
    setSavedPhoto(null);
    saveSchedulePhoto(null);
    triggerSuccess('Foto jadwal dihapus.');
  };

  // Toggle Officer for specific day in Form C1.A grid
  const toggleOfficerDay = (day: number, officerName: OfficerName) => {
    setMonthSchedule((prev) => {
      const updated = { ...prev };
      if (updated[day] === officerName) {
        // Unset
        delete updated[day];
      } else {
        // Set
        updated[day] = officerName;
      }
      return updated;
    });
  };

  // Apply default official September 2026 schedule
  const handleApplyOfficialSeptember = () => {
    setSelectedYear(2026);
    setSelectedMonth(8);
    setMonthSchedule({ ...OFFICIAL_SEPTEMBER_2026_SCHEDULE });
    triggerSuccess('Jadwal Form C1.A September 2026 resmi berhasil dimuat!');
  };

  // Generate standard 3-officer cyclic pattern
  const handleGenerateAutoRotation = () => {
    const officers: OfficerName[] = ['Christian', 'Ragil', 'Alamsyah'];
    let officerIdx = 0;
    const newMap: Record<number, OfficerName> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday

      if (dayOfWeek === 0) {
        // Sunday keeps Saturday officer
        newMap[day] = newMap[day - 1] || officers[officerIdx];
      } else {
        newMap[day] = officers[officerIdx];
        officerIdx = (officerIdx + 1) % 3;
      }
    }
    setMonthSchedule(newMap);
    triggerSuccess(`Pola rotasi otomatis 3 petugas untuk ${INDO_MONTHS[selectedMonth]} ${selectedYear} dibuat!`);
  };

  // Save changes to custom schedule
  const handleSaveAll = () => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const existing = getCustomSchedules();
    const updated = { ...existing };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(day)}`;
      if (monthSchedule[day]) {
        updated[dateKey] = monthSchedule[day];
      } else {
        delete updated[dateKey];
      }
    }

    saveCustomSchedules(updated);
    if (onScheduleUpdated) onScheduleUpdated();
    triggerSuccess(`Jadwal piket ${INDO_MONTHS[selectedMonth]} ${selectedYear} berhasil disimpan!`);
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3500);
  };

  const getDayName = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day);
    return INDO_DAYS_SHORT[d.getDay()];
  };

  const isWeekend = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="upload-schedule-modal"
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col text-slate-800"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-5 md:px-7 md:py-5 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20 backdrop-blur-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight font-sans">
                  Penyesuaian & Upload Foto Jadwal Piket
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono border border-cyan-200">
                  Form C1.A
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sesuaikan jadwal piket bulanan atau unggah foto/screenshot jadwal resmi ULP Sinjai.
              </p>
            </div>
          </div>

          <button
            id="close-upload-schedule-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {saveSuccessMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        <div className="p-5 md:p-7 space-y-6">

          {/* SECTION 1: PHOTO / SCREENSHOT UPLOADER */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  1. Foto / Dokumen Jadwal Piket (Form C1.A)
                </h3>
              </div>
              {savedPhoto && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowPhotoPreview(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-cyan-50 text-cyan-700 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Foto</span>
                  </button>
                  <button
                    onClick={handleDeletePhoto}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </div>

            {savedPhoto ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div 
                  onClick={() => setShowPhotoPreview(true)}
                  className="w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group relative flex-shrink-0 bg-slate-100"
                >
                  <img
                    src={savedPhoto.dataUrl}
                    alt="Foto Jadwal Piket"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5 drop-shadow" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left truncate">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {savedPhoto.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Diunggah pada: {savedPhoto.dateUploaded}
                  </div>
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-semibold mt-1">
                    ✓ Tersimpan & Tersinkronisasi
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition-colors"
                >
                  Ganti Foto Baru
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-500 bg-cyan-50/50'
                    : 'border-slate-300 hover:border-cyan-400 bg-white hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-cyan-800 hover:underline">
                      Klik untuk unggah foto
                    </span>{' '}
                    <span className="text-xs text-slate-500">atau seret dan lepas (drag & drop) gambar di sini</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Format: JPG, PNG, WEBP (Mendukung foto/screenshot Form C1.A Excel)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: INTERACTIVE FORM C1.A MATRIX TABLE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            {/* Header Form Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-cyan-600" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    2. Matriks Roster Form C1.A (Klik kotak untuk ubah petugas)
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    ULP Sinjai • Manajer: <strong className="text-slate-800">{MANAGER_ULP.name}</strong>
                  </div>
                </div>
              </div>

              {/* Month & Year Selectors & Quick Actions */}
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11);
                        setSelectedYear(selectedYear - 1);
                      } else {
                        setSelectedMonth(selectedMonth - 1);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold font-mono px-2 text-slate-800">
                    {INDO_MONTHS[selectedMonth]} {selectedYear}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0);
                        setSelectedYear(selectedYear + 1);
                      } else {
                        setSelectedMonth(selectedMonth + 1);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleApplyOfficialSeptember}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition-colors flex items-center gap-1 font-mono"
                  title="Muat jadwal sesuai foto Form C1.A September 2026"
                >
                  <Sparkles className="w-3 h-3 text-cyan-600" />
                  <span>Default Sep 2026</span>
                </button>

                <button
                  onClick={handleGenerateAutoRotation}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 font-mono"
                  title="Buat rotasi siklis 3 petugas otomatis"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Rotasi Otomatis</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form C1.A Table Container */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                <thead>
                  {/* Row 1: Day Name Headers */}
                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-mono border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-8 text-center" rowSpan={2}>No</th>
                    <th className="p-2 border-r border-slate-200 w-24 text-center" rowSpan={2}>NIP</th>
                    <th className="p-2 border-r border-slate-200 w-44" rowSpan={2}>Nama Pegawai</th>
                    <th className="p-2 border-r border-slate-200 w-36" rowSpan={2}>Kategori</th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const weekend = isWeekend(day);
                      return (
                        <th
                          key={`dayname-${day}`}
                          className={`p-1 text-center font-bold border-r border-slate-200 min-w-[28px] ${
                            weekend ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getDayName(day)}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Row 2: Date Numbers */}
                  <tr className="bg-slate-50 text-slate-800 text-[11px] font-mono font-bold border-b border-slate-200">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const weekend = isWeekend(day);
                      return (
                        <th
                          key={`date-${day}`}
                          className={`p-1 text-center border-r border-slate-200 ${
                            weekend ? 'bg-cyan-600 text-white font-extrabold' : 'bg-slate-50 text-slate-800'
                          }`}
                        >
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {OFFICERS.map((officer, idx) => {
                    return (
                      <tr key={officer.name} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-[11px] text-slate-700 text-center">
                          {officer.nip}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                          {officer.fullName}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-[10px] text-slate-500 font-mono uppercase truncate">
                          {officer.role}
                        </td>

                        {/* 1..daysInMonth cells with black/white blocks */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const isAssigned = monthSchedule[day] === officer.name;
                          const weekend = isWeekend(day);

                          return (
                            <td
                              key={`cell-${officer.name}-${day}`}
                              onClick={() => toggleOfficerDay(day, officer.name)}
                              className={`p-1 border-r border-slate-200 text-center cursor-pointer transition-colors ${
                                weekend ? 'bg-cyan-50/40' : 'bg-white'
                              } hover:ring-2 hover:ring-cyan-500`}
                              title={`Klik untuk set/unset piket ${officer.fullName} tgl ${day} ${INDO_MONTHS[selectedMonth]}`}
                            >
                              <div
                                className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                                  isAssigned
                                    ? 'bg-black text-white shadow-xs font-bold scale-105'
                                    : 'border border-dashed border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {isAssigned && <span className="w-2 h-2 rounded-full bg-white/40" />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Note Information / Instructions */}
            <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <Info className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Petunjuk:</strong> Klik pada kotak tanggal baris petugas untuk menandai piket (blok hitam). Setiap hari secara ideal diisi oleh 1 petugas piket. Perubahan akan langsung aktif setelah menekan tombol <strong>Simpan Jadwal</strong>.
              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between p-5 md:px-7 border-t border-slate-200 bg-slate-50/90 sticky bottom-0 z-20 backdrop-blur-xs">
          <div className="text-xs text-slate-500 font-mono">
            Status: <span className="font-bold text-slate-800">{Object.keys(monthSchedule).length} hari terisi</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Tutup
            </button>
            <button
              id="save-piket-schedule-btn"
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Jadwal Form C1.A</span>
            </button>
          </div>
        </div>

      </div>

      {/* PHOTO FULLSCREEN PREVIEW MODAL */}
      {showPhotoPreview && savedPhoto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {savedPhoto.name}
              </span>
              <button
                onClick={() => setShowPhotoPreview(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex-1 flex items-center justify-center bg-slate-900/5 rounded-xl">
              <img
                src={savedPhoto.dataUrl}
                alt="Form C1.A Preview"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
