import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { RitualStep } from "./RitualStep";
import { RitualEnvironment } from "./RitualEnvironment";
import { RitualCelebration } from "./RitualCelebration";

export type RitualType = "daily" | "weekly" | "milestone" | "anniversary";

export interface RitualStep {
  id: string;
  title: string;
  description: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
}

interface RitualMomentProps {
  type: RitualType;
  title: string;
  subtitle?: string;
  steps: RitualStep[];
  onComplete?: (responses: Record<string, string>) => void;
  onCancel?: () => void;
  className?: string;
  highContrast?: boolean;
  reducedMotion?: boolean;
}

/**
 * Ritual Moment Component
 * 
 * Creates a focused, immersive environment for meaningful interactions
 * like reflection, goal-setting, and milestone celebrations.
 */
export function RitualMoment({
  type = "daily",
  title,
  subtitle,
  steps,
  onComplete,
  onCancel,
  className,
  highContrast = false,
  reducedMotion = false,
}: RitualMomentProps) {
  // State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Get current step
  const currentStep = steps[currentStepIndex];
  
  // Calculate progress percentage
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  // Handle response change
  const handleResponseChange = (stepId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [stepId]: value
    }));
  };

  // Handle next step
  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeRitual();
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Check if can proceed to next step
  const canProceed = () => {
    if (!currentStep) return true;
    if (currentStep.inputRequired) {
      return !!responses[currentStep.id]?.trim();
    }
    return true;
  };

  // Complete ritual
  const completeRitual = () => {
    setIsComplete(true);
    setShowCelebration(true);
    
    // Hide celebration after 3 seconds
    setTimeout(() => {
      setShowCelebration(false);
      if (onComplete) onComplete(responses);
    }, 3000);
  };

  // Cancel ritual
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div 
      className={cn(
        "ritual-container",
        `ritual-${type}`,
        highContrast && "high-contrast",
        reducedMotion && "reduced-motion",
        className
      )}
    >
      <RitualEnvironment type={type} />
      
      <div className="ritual-overlay">
        <h1 className="ritual-title">{title}</h1>
        {subtitle && <h2 className="ritual-subtitle">{subtitle}</h2>}
        
        <div className="ritual-progress">
          <div 
            className="ritual-progress-bar" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="ritual-content">
          {!isComplete && currentStep && (
            <RitualStep
              step={currentStep}
              isActive={true}
              response={responses[currentStep.id] || ""}
              onResponseChange={(value) => handleResponseChange(currentStep.id, value)}
              stepNumber={currentStepIndex + 1}
            />
          )}
          
          {!isComplete && (
            <div className="flex justify-between w-full mt-6">
              {currentStepIndex > 0 ? (
                <button 
                  className="ritual-button secondary"
                  onClick={handlePreviousStep}
                >
                  Back
                </button>
              ) : (
                <button 
                  className="ritual-button secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              )}
              
              <button 
                className="ritual-button"
                onClick={handleNextStep}
                disabled={!canProceed()}
              >
                {currentStepIndex < steps.length - 1 ? "Next" : "Complete"}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showCelebration && (
        <RitualCelebration type={type} />
      )}
    </div>
  );
}
