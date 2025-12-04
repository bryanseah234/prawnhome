import React, { useRef, useEffect } from 'react';
import { EMOJI_POOL } from '../../constants';

// Physics configuration
const PARTICLE_COUNT = 8; // Keep between 6-10 for performance
const BOUNCE_DAMPING = 0.9; // Energy kept after wall bounce (1 = perfect elastic)
const DRAG_FRICTION = 0.95; // Air resistance
const RADIUS = 40; // Approximate radius of the emoji (visual size is bigger, hitbox is smaller)

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  emoji: string;
  isDragging: boolean;
  element: HTMLDivElement | null;
}

export const TrinketCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const particles = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, down: false, dragId: -1 });

  // Initialize Particles
  useEffect(() => {
    // Generate particles only once
    const newParticles: Particle[] = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      newParticles.push({
        id: i,
        // Spawn somewhat in the middle to avoid immediate wall sticking
        x: Math.random() * (width - 200) + 100,
        y: Math.random() * (height - 200) + 100,
        // Random velocity (-1.6 to 1.6) - Slowed down by 20% (was 4)
        vx: (Math.random() - 0.5) * 3.2,
        vy: (Math.random() - 0.5) * 3.2,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 2,
        emoji: EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)],
        isDragging: false,
        element: null
      });
    }
    particles.current = newParticles;

    // Start Loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // The Physics Loop
  const animate = () => {
    const width = window.innerWidth;
    const height = window.innerHeight; // Hero is 100vh
    
    particles.current.forEach((p, index) => {
      if (!p.element) return;

      if (p.isDragging) {
        // Follow mouse
        p.x = mouseRef.current.x;
        p.y = mouseRef.current.y;
        
        // Calculate velocity based on throw
        p.vx = mouseRef.current.x - mouseRef.current.lastX;
        p.vy = mouseRef.current.y - mouseRef.current.lastY;
        
        // Reset rotation speed while holding
        p.vRotation = 0;
      } else {
        // Apply Velocity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        // Wall Collisions (DVD Logo Style)
        // Left/Right
        if (p.x < RADIUS) {
          p.x = RADIUS;
          p.vx *= -1;
        } else if (p.x > width - RADIUS) {
          p.x = width - RADIUS;
          p.vx *= -1;
        }

        // Top/Bottom
        if (p.y < RADIUS) {
          p.y = RADIUS;
          p.vy *= -1;
        } else if (p.y > height - RADIUS) {
          p.y = height - RADIUS;
          p.vy *= -1;
        }

        // Object Collision (Circle vs Circle)
        for (let j = index + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          if (p2.isDragging) continue;

          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = RADIUS * 2; // Diameter

          if (distance < minDistance) {
            // Collision detected!
            
            // 1. Resolve Overlap (prevent sticking)
            const overlap = minDistance - distance;
            const angle = Math.atan2(dy, dx);
            const moveX = Math.cos(angle) * overlap * 0.5;
            const moveY = Math.sin(angle) * overlap * 0.5;

            p.x -= moveX;
            p.y -= moveY;
            p2.x += moveX;
            p2.y += moveY;

            // 2. Bounce (Swap Velocities - simple elastic approximation for equal mass)
            // Calculate normal and tangent vectors
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Relative velocity
            const kx = p.vx - p2.vx;
            const ky = p.vy - p2.vy;
            const p1 = kx * nx + ky * ny;

            if (p1 > 0) {
                // Already moving apart
            } else {
                p.vx -= p1 * nx;
                p.vy -= p1 * ny;
                p2.vx += p1 * nx;
                p2.vy += p1 * ny;
                
                // Add some spin on collision
                p.vRotation += (Math.random() - 0.5) * 5;
                p2.vRotation += (Math.random() - 0.5) * 5;
            }
          }
        }
      }

      // Apply transforms directly to DOM (Fastest way)
      p.element.style.transform = `translate3d(${p.x - 50}px, ${p.y - 50}px, 0) rotate(${p.rotation}deg)`;
    });

    // Update last mouse pos for throw calculation
    mouseRef.current.lastX = mouseRef.current.x;
    mouseRef.current.lastY = mouseRef.current.y;

    requestRef.current = requestAnimationFrame(animate);
  };

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    mouseRef.current.dragId = id;
    mouseRef.current.x = clientX;
    mouseRef.current.y = clientY;
    mouseRef.current.lastX = clientX;
    mouseRef.current.lastY = clientY;
    
    const p = particles.current.find(p => p.id === id);
    if (p) p.isDragging = true;
  };

  const handleMouseMove = (e: any) => {
    if (mouseRef.current.dragId !== -1) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
    }
  };

  const handleMouseUp = () => {
    if (mouseRef.current.dragId !== -1) {
      const p = particles.current.find(p => p.id === mouseRef.current.dragId);
      if (p) p.isDragging = false;
      mouseRef.current.dragId = -1;
    }
  };

  // Global event listeners for drag release outside element
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div 
        ref={containerRef} 
        className="absolute inset-0 overflow-hidden pointer-events-none z-10"
        style={{ willChange: 'transform' }}
    >
      {particles.current.map((p) => (
        <div
          key={p.id}
          ref={(el) => { if (el && particles.current[p.id]) particles.current[p.id].element = el; }}
          className="absolute left-0 top-0 text-6xl cursor-grab active:cursor-grabbing pointer-events-auto select-none touch-none"
          onMouseDown={(e) => handleMouseDown(e, p.id)}
          onTouchStart={(e) => handleMouseDown(e, p.id)}
          style={{
            // Initial render position (updated immediately by loop)
            transform: `translate3d(-100px, -100px, 0)`,
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
};