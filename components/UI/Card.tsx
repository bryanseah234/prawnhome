import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: string; // Tailwind grid col span class
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', colSpan = 'col-span-1', onClick }) => {
  return (
    <motion.div
      className={`
        bg-white dark:bg-[#1a1a1a] 
        border-2 border-black dark:border-[#E0E0E0]
        shadow-brutal
        p-4 relative
        ${className.includes('overflow') ? '' : 'overflow-hidden'}
        ${colSpan}
        ${className}
      `}
      onClick={onClick}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0px 0px 0px 0px #000000",
        zIndex: 10
      }}
      whileDrag={{
        scale: 1.05,
        zIndex: 50,
        boxShadow: "8px 8px 0px 0px rgba(0,0,0,0.2)"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
};