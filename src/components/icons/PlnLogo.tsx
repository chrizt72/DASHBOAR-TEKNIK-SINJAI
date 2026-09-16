import React from 'react';

interface PlnLogoProps {
  className?: string;
  size?: number;
}

export const PlnLogo: React.FC<PlnLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Yellow Emblem Background with PLN specific ratio & soft corner radius */}
      <rect
        x="4"
        y="4"
        width="112"
        height="132"
        rx="16"
        fill="#FFDE00"
        stroke="#E6C800"
        strokeWidth="3"
      />

      {/* 3 Blue Waves (Water/Energy) */}
      <g stroke="#00A2E8" strokeWidth="5.5" strokeLinecap="round" fill="none">
        {/* Top Wave */}
        <path d="M 22 84 Q 38 74 54 84 T 86 84 T 98 84" />
        {/* Middle Wave */}
        <path d="M 22 98 Q 38 88 54 98 T 86 98 T 98 98" />
        {/* Bottom Wave */}
        <path d="M 22 112 Q 38 102 54 112 T 86 112 T 98 112" />
      </g>

      {/* Red Lightning Bolt with sharp PLN characteristic profile */}
      <path
        d="M 68 18 
           L 32 68 
           L 58 68 
           L 44 122 
           L 88 60 
           L 62 60 
           Z"
        fill="#ED1C24"
        stroke="#C01018"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
};
