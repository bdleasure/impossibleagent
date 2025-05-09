import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { RitualType } from "./RitualMoment";

interface RitualEnvironmentProps {
  type: RitualType;
  className?: string;
}

/**
 * Ritual Environment Component
 * 
 * Creates a themed visual environment for different ritual types.
 * Includes ambient particles and background effects.
 */
export function RitualEnvironment({
  type,
  className,
}: RitualEnvironmentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  // Create particles effect
  useEffect(() => {
    if (!particlesRef.current) return;
    
    const particlesContainer = particlesRef.current;
    const particleCount = type === 'milestone' || type === 'anniversary' ? 30 : 15;
    
    // Clear existing particles
    particlesContainer.innerHTML = '';
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'ritual-particle';
      
      // Set random properties
      const size = Math.random() * 8 + 4;
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      const opacity = Math.random() * 0.5 + 0.2;
      const animationDuration = Math.random() * 20 + 10;
      const animationDelay = Math.random() * 10;
      
      // Apply styles
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      particle.style.opacity = `${opacity}`;
      
      // Apply different animations based on ritual type
      switch (type) {
        case 'daily':
          particle.style.animation = `float ${animationDuration}s infinite ease-in-out ${animationDelay}s`;
          particle.style.backgroundColor = 'rgba(167, 243, 208, 0.8)';
          break;
        case 'weekly':
          particle.style.animation = `float ${animationDuration}s infinite ease-in-out ${animationDelay}s`;
          particle.style.backgroundColor = 'rgba(191, 219, 254, 0.8)';
          break;
        case 'milestone':
          particle.style.animation = `float ${animationDuration}s infinite ease-in-out ${animationDelay}s, pulse 3s infinite alternate ${animationDelay}s`;
          particle.style.backgroundColor = 'rgba(251, 207, 232, 0.8)';
          break;
        case 'anniversary':
          particle.style.animation = `float ${animationDuration}s infinite ease-in-out ${animationDelay}s, rotate ${animationDuration * 2}s infinite linear`;
          particle.style.backgroundColor = 'rgba(254, 243, 199, 0.8)';
          particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          break;
      }
      
      particlesContainer.appendChild(particle);
    }
    
    // Cleanup
    return () => {
      if (particlesContainer) {
        particlesContainer.innerHTML = '';
      }
    };
  }, [type]);
  
  return (
    <>
      <div 
        className={cn(
          "ritual-environment",
          `ritual-environment-${type}`,
          className
        )}
        ref={containerRef}
      />
      <div 
        className="ritual-particles"
        ref={particlesRef}
      />
    </>
  );
}
