export type OfficerName = 'Christian' | 'Ragil' | 'Alamsyah';

export interface DutyInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNameIndo: string;
  formattedDateIndo: string;
  officer: OfficerName;
  fullName: string;
  nip: string;
  isToday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  phone?: string;
  role: string;
}

export const OFFICERS: {
  name: OfficerName;
  fullName: string;
  nip: string;
  role: string;
  phone: string;
  initial: string;
  color: string;
}[] = [
  {
    name: 'Christian',
    fullName: 'CHRISTIAN ANDREAS B',
    nip: '9822192ZY',
    role: 'Piket Distribusi Harian',
    phone: '0812-3456-7890',
    initial: 'CH',
    color: 'from-blue-600 to-cyan-600',
  },
  {
    name: 'Ragil',
    fullName: 'RAGIL SETIA PAMBUDHI',
    nip: '9924399ZY',
    role: 'Piket Distribusi Harian',
    phone: '0821-9876-5432',
    initial: 'RG',
    color: 'from-amber-600 to-orange-600',
  },
  {
    name: 'Alamsyah',
    fullName: 'ALAMSYAH',
    nip: '9213094SY',
    role: 'Piket Distribusi Harian',
    phone: '0852-1122-3344',
    initial: 'AL',
    color: 'from-emerald-600 to-teal-600',
  },
];

export const MANAGER_ULP = {
  name: 'RADEN OCKY L.',
  title: 'Manajer ULP Sinjai',
};

// Official Schedule for September 2026 (Form C1.A)
export const OFFICIAL_SEPTEMBER_2026_SCHEDULE: Record<number, OfficerName> = {
  1: 'Christian', // Selasa
  2: 'Ragil',     // Rabu
  3: 'Alamsyah',  // Kamis
  4: 'Christian', // Jumat
  5: 'Alamsyah',  // Sabtu
  6: 'Alamsyah',  // Minggu (Lanjut Sabtu)
  7: 'Ragil',     // Senin
  8: 'Alamsyah',  // Selasa
  9: 'Christian', // Rabu
  10: 'Ragil',    // Kamis
  11: 'Alamsyah', // Jumat
  12: 'Christian',// Sabtu
  13: 'Christian',// Minggu (Lanjut Sabtu)
  14: 'Alamsyah', // Senin
  15: 'Christian',// Selasa
  16: 'Ragil',    // Rabu
  17: 'Alamsyah', // Kamis
  18: 'Christian',// Jumat
  19: 'Ragil',    // Sabtu
  20: 'Ragil',    // Minggu (Lanjut Sabtu)
  21: 'Alamsyah', // Senin
  22: 'Christian',// Selasa
  23: 'Ragil',    // Rabu
  24: 'Alamsyah', // Kamis
  25: 'Christian',// Jumat
  26: 'Alamsyah', // Sabtu
  27: 'Alamsyah', // Minggu (Lanjut Sabtu)
  28: 'Ragil',    // Senin
  29: 'Alamsyah', // Selasa
  30: 'Christian',// Rabu
  31: 'Ragil',
};

const STORAGE_CUSTOM_SCHEDULE_KEY = 'pln_sinjai_custom_piket_schedule_v1';
export const STORAGE_SCHEDULE_PHOTO_KEY = 'pln_sinjai_piket_schedule_photo_v1';

export function getCustomSchedules(): Record<string, OfficerName> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SCHEDULE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveCustomSchedules(schedules: Record<string, OfficerName>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CUSTOM_SCHEDULE_KEY, JSON.stringify(schedules));
    window.dispatchEvent(new Event('pln_piket_schedule_updated'));
  } catch (err) {
    console.error('Failed to save custom schedule:', err);
  }
}

export function getSavedSchedulePhoto(): { dataUrl: string; name: string; dateUploaded: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_SCHEDULE_PHOTO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSchedulePhoto(photo: { dataUrl: string; name: string; dateUploaded: string } | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!photo) {
      localStorage.removeItem(STORAGE_SCHEDULE_PHOTO_KEY);
    } else {
      localStorage.setItem(STORAGE_SCHEDULE_PHOTO_KEY, JSON.stringify(photo));
    }
    window.dispatchEvent(new Event('pln_piket_schedule_updated'));
  } catch (err) {
    console.error('Failed to save schedule photo:', err);
  }
}

function toValidDate(d: any): Date {
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  if (typeof d === 'string' || typeof d === 'number') {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Calculates the duty officer for a given Date, checking custom overrides first,
 * then official September 2026 Form C1.A schedule, then general rotation fallback.
 */
export function getOfficerForDate(targetDate: Date | string | number): OfficerName {
  const target = toValidDate(targetDate);
  const year = target.getFullYear();
  const month = target.getMonth(); // 0-indexed (8 = September)
  const dateNum = target.getDate();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateKey = `${year}-${pad(month + 1)}-${pad(dateNum)}`;

  // 1. Check custom overrides from localStorage
  const customMap = getCustomSchedules();
  if (customMap[dateKey]) {
    return customMap[dateKey];
  }

  // 2. If September 2026, use official Form C1.A mapping
  if (year === 2026 && month === 8) {
    if (OFFICIAL_SEPTEMBER_2026_SCHEDULE[dateNum]) {
      return OFFICIAL_SEPTEMBER_2026_SCHEDULE[dateNum];
    }
  }

  // 3. Fallback cyclic algorithm starting from September 1, 2026 (Christian)
  const baseDate = new Date(2026, 8, 1);
  const d1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  const officers: OfficerName[] = ['Christian', 'Ragil', 'Alamsyah'];
  let currentOfficerIdx = 0; // Christian on Sep 1, 2026

  if (diffDays >= 0) {
    const curr = new Date(d1);
    for (let i = 0; i < diffDays; i++) {
      curr.setDate(curr.getDate() + 1);
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
      if (dayOfWeek === 0) {
        // Sunday keeps Saturday officer
      } else {
        currentOfficerIdx = (currentOfficerIdx + 1) % 3;
      }
    }
  } else {
    const curr = new Date(d1);
    for (let i = 0; i < Math.abs(diffDays); i++) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek === 0) {
        // Sunday to Saturday
      } else {
        currentOfficerIdx = (currentOfficerIdx - 1 + 3) % 3;
      }
      curr.setDate(curr.getDate() - 1);
    }
  }

  return officers[currentOfficerIdx];
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatDateIndo(date: Date | string | number): string {
  const d = toValidDate(date);
  const day = INDO_DAYS[d.getDay()];
  const dateNum = d.getDate();
  const month = INDO_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}, ${dateNum} ${month} ${year}`;
}

export function formatTimeWITA(date: Date | string | number): string {
  const d = toValidDate(date);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }) + ' WITA';
}

export function getDutyInfo(date: Date | string | number): DutyInfo {
  const d = toValidDate(date);
  const officer = getOfficerForDate(d);
  const dayOfWeek = d.getDay();
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const officerMeta = OFFICERS.find(o => o.name === officer);

  return {
    date: d,
    dateKey,
    dayNameIndo: INDO_DAYS[dayOfWeek],
    formattedDateIndo: formatDateIndo(d),
    officer,
    fullName: officerMeta?.fullName || officer,
    nip: officerMeta?.nip || '-',
    isToday,
    isSaturday: dayOfWeek === 6,
    isSunday: dayOfWeek === 0,
    phone: officerMeta?.phone,
    role: officerMeta?.role || 'Piket Distribusi Harian',
  };
}

export function getUpcomingSchedule(daysCount: number = 7, startDate: Date = new Date()): DutyInfo[] {
  const list: DutyInfo[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    list.push(getDutyInfo(d));
  }
  return list;
}

export const getDutyForDate = getDutyInfo;
