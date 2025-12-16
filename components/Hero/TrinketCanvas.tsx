import React, { useRef, useEffect, useState } from 'react';
import { EMOJI_POOL } from '../../constants';

// Physics configuration
const PARTICLE_COUNT = 8; // Keep between 6-10 for performance
const BOUNCE_DAMPING = 0.8; // Lose some energy when hitting walls
const FRICTION = 0.995; // Air resistance/Surface friction (approaches 0 over time)
const RADIUS = 40; 
const BANNER_HEIGHT = 60; // Bottom marquee height

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

interface TrinketCanvasProps {
  explodeTrigger?: number; // Timestamp or counter to trigger explosion
}

export const TrinketCanvas: React.FC<TrinketCanvasProps> = ({ explodeTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // separate state for rendering (static data) vs refs for physics (mutable high-freq data)
  const [renderableParticles, setRenderableParticles] = useState<Particle[]>([]);
  const physicsParticles = useRef<Particle[]>([]);
  const [ripple, setRipple] = useState<{ active: boolean, id: number }>({ active: false, id: 0 });
  
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, down: false, dragId: -1 });

  // Handle Explosion Trigger
  useEffect(() => {
    if (!explodeTrigger) return;

    // Trigger visual ripple
    setRipple({ active: true, id: explodeTrigger });
    setTimeout(() => setRipple(prev => ({ ...prev, active: false })), 1000);

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const explosionStrength = 25; // How hard to push

    physicsParticles.current.forEach(p => {
      if (!p.isDragging) {
        // Calculate vector from center to particle
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply force
        // Add random variation to make it look organic
        if (dist > 0.1) {
          p.vx += (dx / dist) * explosionStrength + (Math.random() - 0.5) * 5;
          p.vy += (dy / dist) * explosionStrength + (Math.random() - 0.5) * 5;
          p.vRotation += (Math.random() - 0.5) * 30; // Spin them
        }
      }
    });

  }, [explodeTrigger]);

  // Initialize Particles
  useEffect(() => {
    // Generate particles
    const newParticles: Particle[] = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Ensure we don't spawn inside the banner area
    const spawnHeight = height - BANNER_HEIGHT - RADIUS * 2;

    // Shuffle the EMOJI_POOL to ensure unique emojis
    const shuffledPool = [...EMOJI_POOL].sort(() => 0.5 - Math.random());

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      newParticles.push({
        id: i,
        // Spawn somewhat in the middle to avoid immediate wall sticking
        x: Math.random() * (width - 200) + 100,
        y: Math.random() * (spawnHeight - 200) + 100,
        // Random velocity (-1.6 to 1.6) - Slowed down by 20% (was 4)
        vx: (Math.random() - 0.5) * 3.2,
        vy: (Math.random() - 0.5) * 3.2,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 2,
        emoji: shuffledPool[i % shuffledPool.length], // Pick unique from shuffled pool
        isDragging: false,
        element: null
      });
    }
    
    // Set ref for physics loop
    physicsParticles.current = newParticles;
    // Set state to trigger React render
    setRenderableParticles(newParticles);

    // Start Loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // The Physics Loop
  const animate = () => {
    const width = window.innerWidth;
    // Effective height stops at the banner
    const effectiveHeight = window.innerHeight - BANNER_HEIGHT; 
    
    // --- PHASE 1: INTEGRATION (Movement) ---
    physicsParticles.current.forEach((p) => {
      if (p.isDragging) {
        // Follow mouse
        p.x = mouseRef.current.x;
        p.y = mouseRef.current.y;
        
        // Calculate velocity for throw based on mouse movement
        p.vx = mouseRef.current.x - mouseRef.current.lastX;
        p.vy = mouseRef.current.y - mouseRef.current.lastY;
        p.vRotation = 0;

        // Clamp dragged item to screen bounds immediately
        // This ensures dragged items don't go behind banner or off screen
        p.x = Math.max(RADIUS, Math.min(p.x, width - RADIUS));
        p.y = Math.max(RADIUS, Math.min(p.y, effectiveHeight - RADIUS));

      } else {
        // Physics Move
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        // Friction
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.vRotation *= FRICTION;

        // Optimization: Stop completely if very slow
        if (Math.abs(p.vx) < 0.01) p.vx = 0;
        if (Math.abs(p.vy) < 0.01) p.vy = 0;
        if (Math.abs(p.vRotation) < 0.01) p.vRotation = 0;
      }
    });

    // --- PHASE 2: COLLISION RESOLUTION (Circle vs Circle) ---
    // Check all unique pairs
    const particles = physicsParticles.current;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = RADIUS * 2;

        if (distance < minDistance) {
          // Collision Detected
          const overlap = minDistance - distance;
          const angle = Math.atan2(dy, dx);
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);

          // Scenario A: P1 is dragged, P2 is free -> Push P2 away
          if (p1.isDragging && !p2.isDragging) {
             p2.x += nx * overlap;
             p2.y += ny * overlap;
             // Impart some velocity to P2 based on push direction
             const p1VelocityTowardsNormal = p1.vx * nx + p1.vy * ny;
             if (p1VelocityTowardsNormal > 0) {
                 p2.vx += p1VelocityTowardsNormal * 0.8;
                 p2.vy += p1VelocityTowardsNormal * 0.8;
             }
          }
          // Scenario B: P1 is free, P2 is dragged -> Push P1 away
          else if (!p1.isDragging && p2.isDragging) {
             p1.x -= nx * overlap;
             p1.y -= ny * overlap;
             // Impart velocity to P1 (normal is P1->P2, so P2 moving towards P1 is negative normal)
             const p2VelocityTowardsNormal = p2.vx * nx + p2.vy * ny;
             if (p2VelocityTowardsNormal < 0) {
                 p1.vx += p2VelocityTowardsNormal * nx * 0.8;
                 p1.vy += p2VelocityTowardsNormal * ny * 0.8;
             }
          }
          // Scenario C: Both Free -> Elastic Bounce
          else if (!p1.isDragging && !p2.isDragging) {
             // 1. Resolve Overlap (half each)
             p1.x -= nx * overlap * 0.5;
             p1.y -= ny * overlap * 0.5;
             p2.x += nx * overlap * 0.5;
             p2.y += ny * overlap * 0.5;

             // 2. Bounce (Swap momentum)
             const kx = p1.vx - p2.vx;
             const ky = p1.vy - p2.vy;
             const p = kx * nx + ky * ny;

             if (p <= 0) { // Moving towards each other
                 p1.vx -= p * nx * BOUNCE_DAMPING;
                 p1.vy -= p * ny * BOUNCE_DAMPING;
                 p2.vx += p * nx * BOUNCE_DAMPING;
                 p2.vy += p * ny * BOUNCE_DAMPING;
                 
                 // Spin
                 p1.vRotation += (Math.random() - 0.5) * 5;
                 p2.vRotation += (Math.random() - 0.5) * 5;
             }
          }
          // Scenario D: Both dragged -> Ignore (User god mode)
        }
      }
    }

    // --- PHASE 3: WALL CONSTRAINTS ---
    physicsParticles.current.forEach((p) => {
        if (!p.isDragging) {
            // Left/Right
            if (p.x < RADIUS) {
              p.x = RADIUS;
              p.vx *= -1 * BOUNCE_DAMPING;
            } else if (p.x > width - RADIUS) {
              p.x = width - RADIUS;
              p.vx *= -1 * BOUNCE_DAMPING;
            }

            // Top/Bottom (Bottom respects banner)
            if (p.y < RADIUS) {
              p.y = RADIUS;
              p.vy *= -1 * BOUNCE_DAMPING;
            } else if (p.y > effectiveHeight - RADIUS) {
              p.y = effectiveHeight - RADIUS;
              p.vy *= -1 * BOUNCE_DAMPING;
            }
        }
    });

    // --- PHASE 4: RENDER ---
    physicsParticles.current.forEach((p) => {
      if (p.element) {
        p.element.style.transform = `translate3d(${p.x - 50}px, ${p.y - 50}px, 0) rotate(${p.rotation}deg)`;
      }
    });

    // Update last mouse pos for throw calculation
    mouseRef.current.lastX = mouseRef.current.x;
    mouseRef.current.lastY = mouseRef.current.y;

    requestRef.current = requestAnimationFrame(animate);
  };

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: number) => {
    // Prevent default to stop scrolling/selecting while dragging trinkets
    // e.preventDefault(); // Optional: might block scrolling if not careful

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    mouseRef.current.dragId = id;
    mouseRef.current.x = clientX;
    mouseRef.current.y = clientY;
    mouseRef.current.lastX = clientX;
    mouseRef.current.lastY = clientY;
    
    const p = physicsParticles.current.find(p => p.id === id);
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
      const p = physicsParticles.current.find(p => p.id === mouseRef.current.dragId);
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
      {/* Visual Ripple Effect */}
      {ripple.active && (
         <div 
           key={ripple.id}
           className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-prawn opacity-0 animate-[ping_1s_ease-out_forwards]"
           style={{ width: '10px', height: '10px' }}
         />
      )}

      {renderableParticles.map((p) => (
        <div
          key={p.id}
          ref={(el) => { if (el && physicsParticles.current[p.id]) physicsParticles.current[p.id].element = el; }}
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