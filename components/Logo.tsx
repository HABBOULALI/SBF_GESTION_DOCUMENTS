import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sbf-gradient" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e293b" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    
    {/* Structure Principale en Perspective (Forme Cubique) */}
    <path d="M60 5 L 5 30 L 5 95 L 60 115 L 115 95 L 115 30 L 60 5 Z" fill="url(#sbf-gradient)" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round"/>
    
    {/* Arête Centrale */}
    <path d="M60 5 L 60 115" stroke="#f59e0b" strokeWidth="1" opacity="0.3"/>

    {/* FACE GAUCHE (Symbolisant S/B) - Accents Orange */}
    {/* Barre Haut */}
    <path d="M15 38 L 55 25 V 40 L 15 53 Z" fill="#f59e0b" />
    {/* Barre Milieu */}
    <path d="M15 60 L 55 47 V 62 L 15 75 Z" fill="#f59e0b" />
    {/* Barre Bas */}
    <path d="M15 82 L 55 69 V 84 L 15 97 Z" fill="#f59e0b" />

    {/* FACE DROITE (Symbolisant F) - Accents Orange */}
    {/* Barre Haut */}
    <path d="M65 25 L 105 38 V 53 L 65 40 Z" fill="#f59e0b" />
    {/* Barre Milieu (Plus courte pour le F) */}
    <path d="M65 47 L 95 57 V 72 L 65 62 Z" fill="#f59e0b" />
    
    {/* Effet 3D Ombres subtiles */}
    <path d="M60 5 L 115 30 L 60 45 L 5 30 Z" fill="white" fillOpacity="0.05"/>
  </svg>
);