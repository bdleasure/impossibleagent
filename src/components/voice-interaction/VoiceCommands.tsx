import React from "react";
import { cn } from "@/lib/utils";

interface VoiceCommandsProps {
  commands: string[];
  onCommandSelect: (command: string) => void;
  className?: string;
}

/**
 * Voice Commands Component
 * 
 * Displays a list of available voice commands as clickable chips.
 */
export function VoiceCommands({
  commands,
  onCommandSelect,
  className,
}: VoiceCommandsProps) {
  if (!commands.length) return null;

  return (
    <div className={cn("voice-commands", className)}>
      <div className="voice-commands-title">Suggested commands:</div>
      <div className="voice-commands-list">
        {commands.map((command, index) => (
          <button
            key={index}
            className="voice-command-chip"
            onClick={() => onCommandSelect(command)}
            aria-label={`Use command: ${command}`}
          >
            {command}
          </button>
        ))}
      </div>
    </div>
  );
}
