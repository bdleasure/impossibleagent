import React from "react";
import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  levels: number[];
  className?: string;
}

/**
 * Voice Visualizer Component
 * 
 * Displays a visual representation of audio input levels.
 */
export function VoiceVisualizer({
  levels,
  className,
}: VoiceVisualizerProps) {
  return (
    <div className={cn("voice-visualizer", className)}>
      {levels.map((level, index) => (
        <div
          key={index}
          className="voice-visualizer-bar"
          style={{
            height: `${Math.max(0.5, level * 2)}rem`,
            transform: `scaleY(${Math.max(0.2, level)})`,
            opacity: Math.max(0.3, level),
          }}
        />
      ))}
    </div>
  );
}
