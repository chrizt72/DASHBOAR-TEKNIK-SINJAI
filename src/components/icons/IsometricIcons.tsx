import React from 'react';

// 1. Isometric Analytics / Dashboard Growth Chart (3D bar chart with upward gold arrow)
export const IsoChart3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base isometric platform */}
    <g filter="drop-shadow(0 10px 15px rgba(0,0,0,0.4))">
      <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
      <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
      <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
      <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4" fill="url(#plat-grad-1)" />
    </g>

    {/* Bar 1 (Low) */}
    <path d="M30 68 L40 62 L40 78 L30 84 Z" fill="#0284C7" />
    <path d="M40 62 L50 68 L50 84 L40 78 Z" fill="#38BDF8" />
    <path d="M30 68 L40 62 L50 68 L40 74 Z" fill="#BAE6FD" />

    {/* Bar 2 (Medium) */}
    <path d="M50 56 L60 50 L60 76 L50 82 Z" fill="#0369A1" />
    <path d="M60 50 L70 56 L70 82 L60 76 Z" fill="#0EA5E9" />
    <path d="M50 56 L60 50 L70 56 L60 62 Z" fill="#7DD3FC" />

    {/* Bar 3 (High) */}
    <path d="M70 42 L80 36 L80 72 L70 78 Z" fill="#1D4ED8" />
    <path d="M80 36 L90 42 L90 78 L80 72 Z" fill="#3B82F6" />
    <path d="M70 42 L80 36 L90 42 L80 48 Z" fill="#93C5FD" />

    {/* Rising 3D Gold Arrow */}
    <path d="M28 60 Q 55 35 88 20" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
    <path d="M28 60 Q 55 35 88 20" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
    <path d="M92 18 L76 18 L86 28 Z" fill="#F59E0B" />
    <path d="M92 18 L78 20 L86 28 Z" fill="#FDE047" />

    <defs>
      <linearGradient id="plat-grad-1" x1="60" y1="46" x2="60" y2="102" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" stopOpacity="0.8" />
        <stop stopColor="#0F172A" stopOpacity="0.9" />
      </linearGradient>
    </defs>
  </svg>
);

// 2. Isometric Electric Fault / JTM Monitoring (3D Tower + Lightning + Warning)
export const IsoJTM3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base platform */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.4" fill="#1E1E2E" />

    {/* Transmission Tower 3D */}
    <path d="M48 82 L58 22 L62 22 L72 82 Z" fill="#334155" />
    <path d="M58 22 L62 22 L64 82 L56 82 Z" fill="#475569" />
    {/* Cross arms */}
    <path d="M38 38 L82 38 L82 44 L38 44 Z" fill="#64748B" />
    <path d="M42 54 L78 54 L78 59 L42 59 Z" fill="#64748B" />
    {/* Insulators */}
    <circle cx="38" cy="48" r="3" fill="#38BDF8" />
    <circle cx="82" cy="48" r="3" fill="#38BDF8" />
    <circle cx="42" cy="63" r="3" fill="#38BDF8" />
    <circle cx="78" cy="63" r="3" fill="#38BDF8" />
    
    {/* High-Voltage 3D Lightning Flash */}
    <g filter="drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))">
      <path d="M68 8 L50 36 L64 36 L48 68 L82 32 L66 32 Z" fill="#FBBF24" />
      <path d="M66 12 L52 34 L62 34 L52 60 L78 34 L64 34 Z" fill="#FFFBEB" />
    </g>

    {/* Warning alert badge */}
    <circle cx="88" cy="74" r="14" fill="#EF4444" />
    <circle cx="88" cy="74" r="11" fill="#DC2626" />
    <path d="M88 67 L88 74 M88 78 L88 80" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 3. Isometric 3D Power Transformer (Master Gardu)
export const IsoTrafo3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Platform */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.4" fill="#082F49" />

    {/* Concrete plinth */}
    <path d="M35 72 L60 58 L85 72 L60 86 Z" fill="#475569" />
    <path d="M35 72 L35 77 L60 91 L60 86 Z" fill="#334155" />
    <path d="M60 86 L60 91 L85 77 L85 72 Z" fill="#475569" />

    {/* Transformer Main Tank (Isometric Block) */}
    <path d="M40 56 L60 44 L80 56 L60 68 Z" fill="#0284C7" />
    <path d="M40 56 L40 72 L60 84 L60 68 Z" fill="#0369A1" />
    <path d="M60 68 L60 84 L80 72 L80 56 Z" fill="#0EA5E9" />

    {/* Radiator cooling fins */}
    <path d="M35 62 L40 59 L40 70 L35 73 Z" fill="#0284C7" />
    <path d="M80 59 L85 62 L85 73 L80 70 Z" fill="#38BDF8" />

    {/* Conservator tank (Cylinder) */}
    <path d="M50 36 L70 26 L74 28 L54 38 Z" fill="#38BDF8" />
    <path d="M50 36 L50 40 L70 30 L70 26 Z" fill="#0284C7" />

    {/* Bushings (High Voltage) */}
    <path d="M46 44 L46 36" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="46" cy="34" r="3" fill="#F59E0B" />
    <path d="M60 38 L60 30" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="60" cy="28" r="3" fill="#F59E0B" />
    <path d="M74 44 L74 36" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="74" cy="34" r="3" fill="#F59E0B" />

    {/* Electric energy pulse */}
    <circle cx="60" cy="56" r="5" fill="#38BDF8" opacity="0.8" />
  </svg>
);

// 4. Isometric 3D Load Testing / Simulation (Gears + Controls)
export const IsoSimulasi3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.4" fill="#2E1065" />

    {/* Central 3D Gear */}
    <g transform="translate(60, 56) rotate(15)">
      <circle cx="0" cy="0" r="22" fill="#7C3AED" />
      <circle cx="0" cy="0" r="14" fill="#5B21B6" />
      <circle cx="0" cy="0" r="8" fill="#DDD6FE" />
      {/* Teeth */}
      <rect x="-4" y="-26" width="8" height="6" rx="2" fill="#A78BFA" />
      <rect x="-4" y="20" width="8" height="6" rx="2" fill="#A78BFA" />
      <rect x="-26" y="-4" width="6" height="8" rx="2" fill="#A78BFA" />
      <rect x="20" y="-4" width="6" height="8" rx="2" fill="#A78BFA" />
      <rect x="-20" y="-20" width="6" height="8" rx="2" transform="rotate(45)" fill="#A78BFA" />
      <rect x="14" y="-20" width="6" height="8" rx="2" transform="rotate(45)" fill="#A78BFA" />
      <rect x="-20" y="14" width="6" height="8" rx="2" transform="rotate(45)" fill="#A78BFA" />
      <rect x="14" y="14" width="6" height="8" rx="2" transform="rotate(45)" fill="#A78BFA" />
    </g>

    {/* Secondary 3D Gear */}
    <g transform="translate(36, 40) rotate(-25)">
      <circle cx="0" cy="0" r="14" fill="#C084FC" />
      <circle cx="0" cy="0" r="8" fill="#9333EA" />
      <circle cx="0" cy="0" r="4" fill="#F3E8FF" />
    </g>

    {/* Gauge needle / Meter */}
    <path d="M78 68 L94 48 L98 52 Z" fill="#EC4899" />
    <circle cx="94" cy="50" r="3" fill="#F43F5E" />
  </svg>
);

// 5. Isometric 3D Forest / Tree & Chainsaw (ROW Maintenance)
export const IsoTree3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base Terrain */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4" fill="#064E3B" />

    {/* Isometric Hills */}
    <path d="M30 68 L50 56 L68 68 L48 80 Z" fill="#059669" />

    {/* Big Pine Tree 3D */}
    <path d="M48 64 L48 76" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
    <path d="M48 24 L32 50 L64 50 Z" fill="#10B981" />
    <path d="M48 24 L48 50 L64 50 Z" fill="#059669" />
    <path d="M48 38 L30 62 L66 62 Z" fill="#34D399" />
    <path d="M48 38 L48 62 L66 62 Z" fill="#10B981" />

    {/* Secondary Tree */}
    <path d="M78 52 L78 62" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
    <path d="M78 30 L66 48 L90 48 Z" fill="#10B981" />
    <path d="M78 30 L78 48 L90 48 Z" fill="#059669" />

    {/* 3D Chainsaw / Pruning Shears badge */}
    <g transform="translate(76, 60)">
      <rect x="0" y="0" width="22" height="7" rx="3" fill="#F59E0B" transform="rotate(-20)" />
      <rect x="18" y="-3" width="14" height="4" rx="1" fill="#E2E8F0" transform="rotate(-20)" />
      <circle cx="6" cy="4" r="2" fill="#1E293B" />
    </g>
  </svg>
);

// 6. Isometric 3D Electrician Technician (Pengaduan & Dispatch)
export const IsoTechnician3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.4" fill="#172554" />

    {/* Technician Body */}
    {/* Legs */}
    <rect x="52" y="70" width="6" height="18" rx="2" fill="#1E3A8A" />
    <rect x="62" y="70" width="6" height="18" rx="2" fill="#1E3A8A" />
    {/* Shoes */}
    <ellipse cx="54" cy="88" rx="5" ry="3" fill="#475569" />
    <ellipse cx="66" cy="88" rx="5" ry="3" fill="#475569" />

    {/* Blue Uniform Jacket */}
    <rect x="48" y="46" width="24" height="26" rx="6" fill="#2563EB" />
    {/* Hi-Vis Safety Vest Overlay */}
    <path d="M48 50 L72 50 L72 68 L48 68 Z" fill="#EAB308" />
    {/* Reflective Stripes */}
    <rect x="50" y="56" width="20" height="3" fill="#F8FAFC" />
    <rect x="50" y="63" width="20" height="3" fill="#F8FAFC" />

    {/* Head */}
    <circle cx="60" cy="38" r="9" fill="#FBBF24" />
    
    {/* Safety Helmet (Yellow Hardhat) */}
    <path d="M48 34 C48 24, 72 24, 72 34 Z" fill="#F59E0B" />
    <rect x="46" y="33" width="28" height="4" rx="2" fill="#D97706" />
    {/* PLN Flash on Helmet */}
    <path d="M61 27 L57 32 L60 32 L58 36 L63 31 L60 31 Z" fill="#EF4444" />

    {/* Tool / Walkie Talkie */}
    <rect x="74" y="52" width="6" height="14" rx="2" fill="#0F172A" />
    <line x1="77" y1="52" x2="77" y2="44" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

    {/* Dispatch badge */}
    <circle cx="34" cy="46" r="10" fill="#10B981" />
    <path d="M30 46 L33 49 L39 43" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 7. Isometric 3D GPS Map / Poultry Farm (Pelanggan Kandang Ayam)
export const IsoMapPin3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base Terrain / Roads */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4" fill="#451A03" />

    {/* Isometric Road ribbons */}
    <path d="M20 70 L60 48 L100 70 L60 92 Z" fill="#334155" />
    <path d="M58 50 L58 90" stroke="#FDE047" strokeWidth="2" strokeDasharray="4 4" />

    {/* Mini Farm Building 3D */}
    <path d="M30 60 L45 52 L60 60 L45 68 Z" fill="#EA580C" />
    <path d="M30 60 L30 68 L45 76 L45 68 Z" fill="#C2410C" />
    <path d="M45 68 L45 76 L60 68 L60 60 Z" fill="#9A3412" />

    {/* Giant Floating 3D Map Pin */}
    <g filter="drop-shadow(0 8px 12px rgba(239, 68, 68, 0.6))">
      <path d="M75 42 C75 30, 95 30, 95 42 C95 52, 85 64, 85 64 C85 64, 75 52, 75 42 Z" fill="#EF4444" />
      <ellipse cx="85" cy="40" rx="4" ry="4" fill="#FFFFFF" />
    </g>
  </svg>
);

// 8. Isometric 3D Roster & Calendar (Jadwal Piket Siaga)
export const IsoCalendar3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#06B6D4" strokeWidth="1.5" strokeOpacity="0.4" fill="#083344" />

    {/* 3D Calendar Pad */}
    <path d="M35 55 L75 32 L95 44 L55 67 Z" fill="#F8FAFC" />
    <path d="M35 55 L35 65 L55 77 L55 67 Z" fill="#E2E8F0" />
    <path d="M55 67 L55 77 L95 54 L95 44 Z" fill="#CBD5E1" />

    {/* Top Header strip (Red) */}
    <path d="M35 55 L75 32 L82 36 L42 59 Z" fill="#EF4444" />
    
    {/* Rings */}
    <circle cx="48" cy="44" r="2.5" fill="#64748B" />
    <circle cx="60" cy="37" r="2.5" fill="#64748B" />
    <circle cx="72" cy="30" r="2.5" fill="#64748B" />

    {/* Calendar grid lines */}
    <path d="M46 60 L78 41 M52 64 L84 45 M58 68 L90 49" stroke="#94A3B8" strokeWidth="1.5" />

    {/* Shield of Honor Badge */}
    <g transform="translate(68, 54)">
      <path d="M16 2 L2 7 L2 18 C2 26, 16 32, 16 32 C16 32, 30 26, 30 18 L30 7 Z" fill="#0284C7" />
      <path d="M16 5 L5 9 L5 17 C5 24, 16 29, 16 29 C16 29, 27 24, 27 17 L27 9 Z" fill="#38BDF8" />
      <path d="M11 16 L14 19 L21 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

// 9. Isometric 3D Switchgear / Recloser / Keypoint (Sectioning JTM)
export const IsoSwitchgear3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#EAB308" strokeWidth="1.5" strokeOpacity="0.4" fill="#3F2C04" />

    {/* Metal Switchgear Cabinet */}
    <path d="M40 50 L60 38 L80 50 L60 62 Z" fill="#64748B" />
    <path d="M40 50 L40 76 L60 88 L60 62 Z" fill="#475569" />
    <path d="M60 62 L60 88 L80 76 L80 50 Z" fill="#334155" />

    {/* Control Screen */}
    <path d="M44 58 L56 51 L56 64 L44 71 Z" fill="#0F172A" />
    <rect x="46" y="55" width="8" height="6" fill="#10B981" rx="1" />

    {/* LED Indicators */}
    <circle cx="66" cy="60" r="2" fill="#EF4444" />
    <circle cx="72" cy="57" r="2" fill="#22C55E" />
    <circle cx="66" cy="68" r="2" fill="#EAB308" />
    <circle cx="72" cy="65" r="2" fill="#38BDF8" />

    {/* Recloser Handle */}
    <path d="M50 78 L56 74" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 10. Isometric 3D Cloud Data & Spreadsheet Sync (Sinkronisasi Data)
export const IsoSyncCloud3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4" fill="#082F49" />

    {/* 3D Sheets Documents */}
    <path d="M30 68 L48 58 L62 66 L44 76 Z" fill="#10B981" />
    <path d="M48 58 L66 48 L80 56 L62 66 Z" fill="#3B82F6" />
    <path d="M66 48 L84 38 L98 46 L80 56 Z" fill="#F59E0B" />

    {/* Floating 3D Cloud */}
    <g filter="drop-shadow(0 8px 14px rgba(56, 189, 248, 0.5))">
      <ellipse cx="60" cy="38" rx="22" ry="14" fill="#38BDF8" />
      <circle cx="50" cy="32" r="12" fill="#E0F2FE" />
      <circle cx="70" cy="34" r="10" fill="#E0F2FE" />
      <ellipse cx="60" cy="40" rx="18" ry="10" fill="#FFFFFF" />
    </g>

    {/* Upload/Sync Arrow */}
    <path d="M60 46 L60 30 M60 30 L54 36 M60 30 L66 36" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 11. Isometric 3D 20kV Feeder Busbar & Load Monitor (Beban 20kV)
export const IsoBeban20kv3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4" fill="#381E04" />

    {/* 3D Meter Unit / Switchboard */}
    <path d="M36 54 L60 40 L84 54 L60 68 Z" fill="#D97706" />
    <path d="M36 54 L36 76 L60 90 L60 68 Z" fill="#B45309" />
    <path d="M60 68 L60 90 L84 76 L84 54 Z" fill="#F59E0B" />

    {/* Display Screen */}
    <path d="M42 60 L58 51 L58 72 L42 81 Z" fill="#0F172A" />
    <rect x="45" y="58" width="10" height="7" fill="#10B981" rx="1" opacity="0.9" />

    {/* 20kV Badge */}
    <rect x="64" y="60" width="16" height="8" rx="2" fill="#FEF08A" />
    <text x="66" y="66" fontSize="5" fontWeight="bold" fill="#713F12" fontFamily="monospace">20kV</text>

    {/* High-Voltage Bushings & Sparks */}
    <path d="M48 38 L48 48" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
    <circle cx="48" cy="36" r="3" fill="#FBBF24" />
    <path d="M60 30 L60 42" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
    <circle cx="60" cy="28" r="3" fill="#F59E0B" />
    <path d="M72 38 L72 48" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
    <circle cx="72" cy="36" r="3" fill="#FBBF24" />

    {/* Glowing Lightning Bolt */}
    <g filter="drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))">
      <path d="M64 12 L52 30 L60 30 L50 48 L70 26 L60 26 Z" fill="#FDE047" />
    </g>
  </svg>
);

// 12. Isometric 3D K3L Safety Shield & Hard Hat (Monitoring K3L)
export const IsoK3L3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base platform */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4" fill="#064E3B" />

    {/* 3D Shield */}
    <g filter="drop-shadow(0 6px 12px rgba(0,0,0,0.4))">
      <path d="M60 24 L86 36 V62 C86 78 60 92 60 92 C60 92 34 78 34 62 V36 L60 24 Z" fill="#059669" stroke="#34D399" strokeWidth="2.5" />
      {/* Inner Shield Accent */}
      <path d="M60 30 L80 40 V60 C80 72 60 84 60 84 C60 84 40 72 40 60 V40 L60 30 Z" fill="#047857" />
    </g>

    {/* Safety Hard Hat (Helm K3) */}
    <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))">
      {/* Helmet Dome */}
      <ellipse cx="60" cy="52" rx="18" ry="12" fill="#FBBF24" />
      <path d="M42 52 C42 42 50 36 60 36 C70 36 78 42 78 52 Z" fill="#F59E0B" />
      {/* Helmet Brim */}
      <ellipse cx="60" cy="54" rx="21" ry="6" fill="#D97706" />
      {/* White K3 Cross on Helmet */}
      <rect x="58" y="40" width="4" height="10" rx="1" fill="#FFFFFF" />
      <rect x="55" y="43" width="10" height="4" rx="1" fill="#FFFFFF" />
    </g>

    {/* K3 Badge Ribbon */}
    <rect x="46" y="66" width="28" height="9" rx="2" fill="#065F46" stroke="#34D399" strokeWidth="1" />
    <text x="60" y="73" fontSize="6" fontWeight="bold" fill="#ECFDF5" textAnchor="middle" fontFamily="sans-serif">K3L SINJAI</text>
  </svg>
);

// 13. Isometric 3D Material Logistics & Warehouse (Monitoring Material)
export const IsoMaterial3D: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base platform */}
    <path d="M60 102 L10 74 L60 46 L110 74 Z" fill="#1E293B" />
    <path d="M10 74 L10 82 L60 110 L60 102 Z" fill="#0F172A" />
    <path d="M60 102 L60 110 L110 82 L110 74 Z" fill="#1E293B" />
    <path d="M60 102 L10 74 L60 46 L110 74 Z" stroke="#6366F1" strokeWidth="1.5" strokeOpacity="0.4" fill="#312E81" />

    {/* Wooden Pallet */}
    <path d="M28 78 L60 94 L92 78 L60 62 Z" fill="#78350F" />
    <path d="M28 78 L28 82 L60 98 L60 94 Z" fill="#451A03" />
    <path d="M60 94 L60 98 L92 82 L92 78 Z" fill="#92400E" />

    {/* Big Box 1 (Center-Left) */}
    <g filter="drop-shadow(0 6px 8px rgba(0,0,0,0.35))">
      {/* Top Face */}
      <path d="M38 52 L58 42 L78 52 L58 62 Z" fill="#FCD34D" />
      {/* Left Face */}
      <path d="M38 52 L58 62 L58 80 L38 70 Z" fill="#D97706" />
      {/* Right Face */}
      <path d="M58 62 L78 52 L78 70 L58 80 Z" fill="#F59E0B" />
      {/* Tape on Top */}
      <path d="M48 47 L68 57" stroke="#B45309" strokeWidth="2.5" />
    </g>

    {/* Top Small Box 2 (Stacked) */}
    <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))">
      {/* Top Face */}
      <path d="M48 34 L62 26 L76 34 L62 42 Z" fill="#818CF8" />
      {/* Left Face */}
      <path d="M48 34 L62 42 L62 54 L48 46 Z" fill="#4338CA" />
      {/* Right Face */}
      <path d="M62 42 L76 34 L76 46 L62 54 Z" fill="#6366F1" />
      {/* PLN SAP Label on Box */}
      <rect x="52" y="38" width="7" height="4" rx="0.5" fill="#FFFFFF" opacity="0.9" />
    </g>

    {/* Meter / KWh Indicator Badge */}
    <rect x="42" y="70" width="36" height="10" rx="2" fill="#1E1B4B" stroke="#818CF8" strokeWidth="1" />
    <text x="60" y="77" fontSize="5.5" fontWeight="bold" fill="#EEF2FF" textAnchor="middle" fontFamily="sans-serif">GD RY SINJAI</text>
  </svg>
);



