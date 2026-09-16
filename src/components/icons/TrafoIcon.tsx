import React from 'react';

interface TrafoIconProps {
  className?: string;
  size?: number;
}

export const TrafoIcon: React.FC<TrafoIconProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      {/* Background Subtle Radiator Fins / Shadow */}
      <rect x="10" y="24" width="4" height="28" rx="2" fill="#0284C7" fillOpacity="0.4" />
      <rect x="50" y="24" width="4" height="28" rx="2" fill="#0284C7" fillOpacity="0.4" />

      {/* Main Transformer Tank Body */}
      <rect
        x="13"
        y="20"
        width="38"
        height="36"
        rx="5"
        fill="#0284C7"
        stroke="#0369A1"
        strokeWidth="2.5"
      />
      {/* Tank Metallic Highlight & Gradients */}
      <rect x="16" y="23" width="32" height="30" rx="3" fill="#0EA5E9" fillOpacity="0.85" />

      {/* Top Transformer Lid / Cover */}
      <rect
        x="10"
        y="16"
        width="44"
        height="6"
        rx="2"
        fill="#0369A1"
        stroke="#082F49"
        strokeWidth="1.5"
      />

      {/* 3 High Voltage Bushings (Ceramic Insulators on Top) */}
      {/* Left Bushing (Phase R) */}
      <g>
        <rect x="16" y="7" width="6" height="9" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        <ellipse cx="19" cy="6" rx="3" ry="1.5" fill="#FEF3C7" />
        <line x1="19" y1="2" x2="19" y2="6" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="19" cy="2" r="1.5" fill="#EF4444" />
      </g>

      {/* Center Bushing (Phase S) */}
      <g>
        <rect x="29" y="5" width="6" height="11" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        <ellipse cx="32" cy="4" rx="3" ry="1.5" fill="#FEF3C7" />
        <line x1="32" y1="0.5" x2="32" y2="4" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="32" cy="1" r="1.5" fill="#F59E0B" />
      </g>

      {/* Right Bushing (Phase T) */}
      <g>
        <rect x="42" y="7" width="6" height="9" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        <ellipse cx="45" cy="6" rx="3" ry="1.5" fill="#FEF3C7" />
        <line x1="45" y1="2" x2="45" y2="6" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="45" cy="2" r="1.5" fill="#10B981" />
      </g>

      {/* Transformer Dual Coils / Schematic Core in Center */}
      <circle
        cx="26"
        cy="37"
        r="7.5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeDasharray="2 1"
        fill="#0284C7"
      />
      <circle
        cx="38"
        cy="37"
        r="7.5"
        stroke="#FEF08A"
        strokeWidth="2.5"
        strokeDasharray="2 1"
        fill="#0369A1"
        fillOpacity="0.8"
      />

      {/* Central Spark / Energy Icon */}
      <path
        d="M32 29L29.5 35H34.5L32 43"
        stroke="#FACC15"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Oil Level Indicator & Base Flange */}
      <rect x="45" y="27" width="2.5" height="12" rx="1" fill="#FEF3C7" stroke="#B45309" strokeWidth="0.8" />
      <line x1="45" y1="33" x2="47.5" y2="33" stroke="#DC2626" strokeWidth="1" />

      {/* Bottom Mounting Base */}
      <rect x="12" y="56" width="40" height="4" rx="1.5" fill="#0369A1" />
      <rect x="16" y="58" width="8" height="2" rx="0.5" fill="#64748B" />
      <rect x="40" y="58" width="8" height="2" rx="0.5" fill="#64748B" />
    </svg>
  );
};
