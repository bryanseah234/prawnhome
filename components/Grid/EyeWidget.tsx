import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../UI/Card';

interface EyeWidgetProps {
  isActive?: boolean;
}

export const EyeWidget: React.FC<EyeWidgetProps> = ({ isActive = false }) => {
  const eyeRef = useRef<HTMLDivElement>(null);
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      
      const rect = eyeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      
      // Calculate angle
      const angle = Math.atan2(dy, dx);
      
      // Limit movement radius (eye radius - pupil radius)
      // Eye is e.g. w-24 (96px), pupil is w-8 (32px). Max radius approx 20px
      const distance = Math.min(Math.hypot(dx, dy), 20);
      
      setPupilPos({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Card className={`flex items-center justify-center min-h-[150px] transition-colors duration-500 ${isActive ? 'bg-black' : 'bg-prawn'}`}>
        <div ref={eyeRef} className="relative w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center overflow-hidden">
            <motion.div 
                className="w-8 h-8 rounded-full"
                style={{
                    x: pupilPos.x,
                    y: pupilPos.y
                }}
                animate={{
                    backgroundColor: isActive ? ["#000000", "#FF4500", "#000000"] : "#000000"
                }}
                transition={{
                    backgroundColor: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }
                }}
            />
        </div>
    </Card>
  );
};