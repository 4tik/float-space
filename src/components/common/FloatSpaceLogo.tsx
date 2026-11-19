import React from 'react';

interface FloatSpaceLogoProps {
  size?: number;
  className?: string;
}

export const FloatSpaceLogo: React.FC<FloatSpaceLogoProps> = ({ size = 20, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bgGrad" x1="28" y1="28" x2="484" y2="484" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#006ED7" />
          <stop offset="100%" stopColor="#003782" />
        </linearGradient>
        <linearGradient id="headGrad" x1="148" y1="96" x2="408" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00A4EF" />
          <stop offset="100%" stopColor="#0078D7" />
        </linearGradient>
        <filter id="floatShadow" x="134" y="90" width="288" height="236" filterUnits="userSpaceOnUse">
          <feDropShadow dx="6" dy="14" stdDeviation="10" floodColor="#001432" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Main Container Squircle */}
      <rect x="28" y="28" width="456" height="456" rx="96" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />

      {/* Primary Desktop Base Outline */}
      <rect x="84" y="160" width="344" height="244" rx="36" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      <line x1="100" y1="220" x2="412" y2="220" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <line x1="100" y1="280" x2="412" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <line x1="100" y1="340" x2="412" y2="340" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

      {/* Floating Extended Window */}
      <g filter="url(#floatShadow)">
        {/* Floating Window Body */}
        <rect x="148" y="96" width="260" height="200" rx="32" fill="#FAFAFC" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />

        {/* Floating Window Header */}
        <path
          d="M180 96h196c17.673 0 32 14.327 32 32v18H148v-18c0-17.673 14.327-32 32-32z"
          fill="url(#headGrad)"
        />

        {/* Window Header Dots */}
        <circle cx="174" cy="121" r="5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="189" cy="121" r="5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="204" cy="121" r="5" fill="#FFFFFF" fillOpacity="0.9" />

        {/* Window Content Bars */}
        <rect x="172" y="172" width="100" height="14" rx="3" fill="#0067C0" fillOpacity="0.8" />
        <rect x="172" y="200" width="212" height="10" rx="2" fill="#0067C0" fillOpacity="0.3" />
        <rect x="172" y="220" width="170" height="10" rx="2" fill="#0067C0" fillOpacity="0.22" />
        <rect x="172" y="240" width="195" height="10" rx="2" fill="#0067C0" fillOpacity="0.16" />
      </g>
    </svg>
  );
};
