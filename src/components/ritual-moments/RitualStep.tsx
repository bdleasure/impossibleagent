import React from "react";
import { cn } from "@/lib/utils";
import type { RitualStep as RitualStepType } from "./RitualMoment";

interface RitualStepProps {
  step: RitualStepType;
  isActive: boolean;
  response: string;
  onResponseChange: (value: string) => void;
  stepNumber: number;
  className?: string;
}

/**
 * Ritual Step Component
 * 
 * Represents a single step in a ritual moment sequence.
 */
export function RitualStep({
  step,
  isActive,
  response,
  onResponseChange,
  stepNumber,
  className,
}: RitualStepProps) {
  return (
    <div className={cn(
      "ritual-step",
      isActive && "active",
      className
    )}>
      <div className="ritual-step-number">{stepNumber}</div>
      <h3 className="ritual-step-title">{step.title}</h3>
      <p className="ritual-step-description">{step.description}</p>
      
      {step.inputPlaceholder && (
        <textarea
          className="ritual-input"
          placeholder={step.inputPlaceholder}
          value={response}
          onChange={(e) => onResponseChange(e.target.value)}
          disabled={!isActive}
          aria-label={step.title}
        />
      )}
    </div>
  );
}
