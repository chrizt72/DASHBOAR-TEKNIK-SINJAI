import React from 'react';

interface ElectricianCartoonProps {
  className?: string;
  size?: number;
}

export const ElectricianCartoon: React.FC<ElectricianCartoonProps> = ({
  className = 'w-7 h-7',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      {/* Background Glow */}
      <circle cx="32" cy="32" r="30" fill="#E0F2FE" fillOpacity="0.8" />

      {/* Technician Body / Torso (PLN Cyan Uniform) */}
      <path
        d="M16 60C16 48 23 44 32 44C41 44 48 48 48 60H16Z"
        fill="#0284C7"
      />

      {/* High-Visibility Neon Vest (Green & Yellow) */}
      <path
        d="M22 45L25 60H39L42 45C39 44.5 35 44 32 44C29 44 25 44.5 22 45Z"
        fill="#10B981"
      />
      {/* Reflective Stripes */}
      <line x1="25" y1="52" x2="39" y2="52" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="46" x2="29" y2="60" stroke="#FEF08A" strokeWidth="2" />
      <line x1="38" y1="46" x2="35" y2="60" stroke="#FEF08A" strokeWidth="2" />

      {/* ID Badge / Chest Pocket */}
      <rect x="20" y="50" width="4" height="6" rx="1" fill="#FFFFFF" />
      <rect x="21" y="52" width="2" height="1" fill="#0284C7" />

      {/* Neck */}
      <rect x="28" y="38" width="8" height="8" rx="2" fill="#FDBA74" />

      {/* Head / Face */}
      <ellipse cx="32" cy="31" rx="11" ry="12" fill="#FED7AA" />

      {/* Ears */}
      <ellipse cx="20" cy="31" rx="2.5" ry="3.5" fill="#FDBA74" />
      <ellipse cx="44" cy="31" rx="2.5" ry="3.5" fill="#FDBA74" />

      {/* Friendly Eyes with Catchlights */}
      <circle cx="28" cy="29" r="2" fill="#0F172A" />
      <circle cx="28.7" cy="28.3" r="0.7" fill="#FFFFFF" />
      <circle cx="36" cy="29" r="2" fill="#0F172A" />
      <circle cx="36.7" cy="28.3" r="0.7" fill="#FFFFFF" />

      {/* Eyebrows */}
      <path d="M26 25.5C27 24.5 29 25 30 25.5" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M34 25.5C35 25 37 24.5 38 25.5" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cheerful Smile */}
      <path
        d="M28 35C29.5 37.5 34.5 37.5 36 35"
        stroke="#9A3412"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Rosy Cheeks */}
      <circle cx="25" cy="33" r="1.5" fill="#FB7185" fillOpacity="0.6" />
      <circle cx="39" cy="33" r="1.5" fill="#FB7185" fillOpacity="0.6" />

      {/* Safety Hard Hat / Helmet (PLN Yellow) */}
      <path
        d="M17 22C17 12 23 8 32 8C41 8 47 12 47 22C47 23 46 24 45 24H19C18 24 17 23 17 22Z"
        fill="#FACC15"
        stroke="#CA8A04"
        strokeWidth="1.5"
      />
      {/* Helmet Brim */}
      <path
        d="M15 23C15 22 18 21.5 32 21.5C46 21.5 49 22 49 23C49 24.5 46 25 32 25C18 25 15 24.5 15 23Z"
        fill="#EAB308"
        stroke="#A16207"
        strokeWidth="1"
      />
      {/* Helmet Ridge / Top Crest */}
      <path d="M30 8C30 7 34 7 34 8V21.5H30V8Z" fill="#CA8A04" />

      {/* Lightning Emblem on Helmet */}
      <path
        d="M32 10.5L30 14H33L31.5 18L35 13.5H32.5L34 10.5H32Z"
        fill="#EF4444"
        stroke="#991B1B"
        strokeWidth="0.6"
      />

      {/* Left Hand holding an Insulated Electric Tool / Screwdriver */}
      <g>
        <path
          d="M12 46C12 42 16 43 18 46L19 50C17 52 14 51 12 48Z"
          fill="#FED7AA"
        />
        {/* Tool Handle */}
        <rect
          x="8"
          y="42"
          width="4"
          height="10"
          rx="1"
          transform="rotate(25 8 42)"
          fill="#EF4444"
          stroke="#991B1B"
          strokeWidth="0.8"
        />
        {/* Metal Shaft */}
        <rect
          x="12"
          y="35"
          width="2"
          height="8"
          transform="rotate(25 12 35)"
          fill="#CBD5E1"
        />
        {/* Electric Spark at Tool Tip */}
        <path
          d="M18 29L16 32H18.5L17 35L20 31.5H18L19.5 29H18Z"
          fill="#FACC15"
          stroke="#CA8A04"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );
};
