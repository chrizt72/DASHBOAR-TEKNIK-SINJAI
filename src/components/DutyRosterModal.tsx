import React, { useState } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, ShieldCheck, Phone, Upload, User } from 'lucide-react';
import { getDutyInfo, OFFICERS, DutyInfo, MANAGER_ULP } from '../utils/dutySchedule';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDuty: DutyInfo;
  onOpenUploadModal?: () => void;
}

export const DutyRosterModal: React.FC<Props> = ({ isOpen, onClose, currentDuty, onOpenUploadModal }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [monthOffset, setMonthOffset] = useState<number>(0);

  if (!isOpen) return null;

  const targetDate = new Date(selectedDate);
  const selectedDutyInfo = getDutyInfo(targetDate);

  // Generate calendar days for current view month
  const viewDate = new Date();
  viewDate.setMonth(viewDate.getMonth() + monthOffset);
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDay = firstDayOfMonth.getDay(); // 0 is Sunday

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const calendarDays: (DutyInfo | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    calendarDays.push(getDutyInfo(d));
  }

  const getOfficerColor = (name: string) => {
    switch (name) {
      case 'Christian':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'Ragil':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Alamsyah':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="duty-roster-modal"
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight font-sans">
                  Jadwal Roster Piket Distribusi Harian
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono border border-cyan-200">
                  Form C1.A
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ULP Sinjai • Penugasan Piket Khusus P21B • Manajer: {MANAGER_ULP.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenUploadModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition-colors"
                title="Sesuaikan jadwal atau unggah foto Form C1.A"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / Edit Form C1.A</span>
              </button>
            )}
            <button
              id="close-roster-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Petugas Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {OFFICERS.map((officer) => {
            const isCurrentlyDuty = currentDuty.officer === officer.name;
            return (
              <div
                key={officer.name}
                id={`officer-card-${officer.name.toLowerCase()}`}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentlyDuty
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/50 shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white font-mono bg-gradient-to-br ${officer.color} shadow-sm border border-white/20`}>
                      {officer.initial}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm truncate">
                        {officer.fullName}
                      </div>
                      <div className="text-[11px] text-cyan-700 font-mono font-semibold">
                        NIP: {officer.nip}
                      </div>
                      {isCurrentlyDuty && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[8px] font-bold uppercase rounded bg-cyan-600 text-white font-mono">
                          Piket Hari Ini
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>{officer.role}</span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-cyan-600" />
                    {officer.phone}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar View */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase font-mono">
              <Calendar className="w-4 h-4 text-cyan-600" />
              <span>
                {monthNames[currentMonth]} {currentYear}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMonthOffset(0)}
                className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-cyan-700 font-semibold shadow-xs"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setMonthOffset(prev => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono font-bold text-[10px] uppercase text-slate-500 mb-2">
            <span className="text-rose-600">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span className="text-cyan-700">Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-transparent" />;
              }
              const isSelected = item.dateKey === selectedDate;
              return (
                <button
                  key={item.dateKey}
                  onClick={() => setSelectedDate(item.dateKey)}
                  className={`h-16 p-2 rounded-xl border text-left flex flex-col justify-between transition-all font-mono ${
                    item.isToday
                      ? 'ring-2 ring-cyan-500 font-bold'
                      : ''
                  } ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-cyan-400 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={item.isSunday ? 'text-rose-600 font-bold' : isSelected ? 'text-white' : 'text-slate-800'}>
                      {item.date.getDate()}
                    </span>
                    {item.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div
                    className={`text-[10px] font-semibold px-1 py-0.5 rounded truncate ${
                      isSelected
                        ? 'bg-cyan-700 text-white'
                        : getOfficerColor(item.officer)
                    }`}
                  >
                    {item.officer}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-cyan-700 font-semibold">
                Piket Tanggal: {selectedDutyInfo.formattedDateIndo}
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {selectedDutyInfo.fullName} ({selectedDutyInfo.officer})
                <span className="text-xs text-slate-500 font-normal ml-2">NIP: {selectedDutyInfo.nip}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 text-left sm:text-right">
            <div>Status: <span className="font-bold text-emerald-700">Siaga 24 Jam</span></div>
            <div>Hubungi: <span className="font-semibold text-slate-800">{selectedDutyInfo.phone}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

