import React from 'react';
import logoTextImg from '../assets/raiuva-text-logo.png';

const RaivaLogo = ({ size = 64, className = "" }) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Official RaiUva Neon Text Logo */}
      <img 
        src={logoTextImg} 
        alt="RaiUva Logo" 
        className="object-contain hover:scale-105 transition-transform"
        style={{ height: size }}
      />
    </div>
  );
};

export default RaivaLogo;


