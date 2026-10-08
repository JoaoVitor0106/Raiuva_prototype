import React from 'react';
import bullNeonImg from '../assets/bull-neon.png';

const Bull = ({ size = 24, className = "", ...props }) => {
  return (
    <img 
      src={bullNeonImg} 
      alt="Red Bull" 
      width={size} 
      height={size} 
      className={`object-contain ${className}`}
      style={{ filter: 'drop-shadow(0 0 5px rgba(207,255,0,0.5))' }}
      {...props}
    />
  );
};

export default Bull;


