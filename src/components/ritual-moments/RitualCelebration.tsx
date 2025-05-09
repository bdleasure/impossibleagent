import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { RitualType } from "./RitualMoment";

interface RitualCelebrationProps {
  type: RitualType;
  className?: string;
}

/**
 * Ritual Celebration Component
 * 
 * Displays a celebratory animation when a ritual is completed.
 * Different celebrations for different ritual types.
 */
export function RitualCelebration({
  type,
  className,
}: RitualCelebrationProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Activate celebration with a slight delay for dramatic effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get celebration icon based on ritual type
  const getCelebrationIcon = () => {
    switch (type) {
      case 'daily':
        return '✓';
      case 'weekly':
        return '🌟';
      case 'milestone':
        return '🏆';
      case 'anniversary':
        return '🎉';
      default:
        return '✨';
    }
  };
  
  return (
    <div className={cn(
      "ritual-celebration",
      isActive && "active",
      className
    )}>
      <div className="ritual-celebration-icon">
        {getCelebrationIcon()}
      </div>
    </div>
  );
}
