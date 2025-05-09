import React, { useState } from "react";
import { CompanionAvatar } from "./CompanionAvatar";

/**
 * Companion Avatar Demo Component
 * 
 * A demonstration component for the Companion Avatar with controls
 * to showcase its features and capabilities.
 */
export function CompanionAvatarDemo() {
  const [showControls, setShowControls] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [currentMood, setCurrentMood] = useState<string>("neutral");

  return (
    <div className="companion-avatar-demo">
      <h2 className="text-2xl font-bold mb-6">Companion Avatar</h2>
      
      <div className="mb-8">
        <CompanionAvatar 
          size={size}
          showControls={showControls}
          showCustomization={showCustomization}
          onMoodChange={(mood) => setCurrentMood(mood)}
        />
      </div>
      
      <div className="demo-controls grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold mb-3">Demo Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="show-controls" 
                checked={showControls} 
                onChange={(e) => setShowControls(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="show-controls">Show Mood Controls</label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="show-customization" 
                checked={showCustomization} 
                onChange={(e) => setShowCustomization(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="show-customization">Show Customization Panel</label>
            </div>
            
            <div>
              <label className="block mb-2">Avatar Size</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="size" 
                    value="small" 
                    checked={size === "small"} 
                    onChange={() => setSize("small")}
                    className="mr-1"
                  />
                  Small
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="size" 
                    value="medium" 
                    checked={size === "medium"} 
                    onChange={() => setSize("medium")}
                    className="mr-1"
                  />
                  Medium
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="size" 
                    value="large" 
                    checked={size === "large"} 
                    onChange={() => setSize("large")}
                    className="mr-1"
                  />
                  Large
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">Current State</h3>
          
          <div className="space-y-2">
            <div>
              <span className="font-medium">Current Mood:</span> {currentMood}
            </div>
            <div>
              <span className="font-medium">Size:</span> {size}
            </div>
            <div>
              <span className="font-medium">Controls:</span> {showControls ? "Visible" : "Hidden"}
            </div>
            <div>
              <span className="font-medium">Customization:</span> {showCustomization ? "Visible" : "Hidden"}
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                // This would use the makeAvatarSpeak function in a real implementation
                alert(`Avatar would say: "Hello! I'm your companion avatar."`);
              }}
            >
              Make Avatar Speak
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">About Companion Avatar</h3>
        <p className="mb-2">
          The Companion Avatar is a WebGL-based avatar with reactive, mood-based animations.
          It provides an emotional connection point for users interacting with the ImpossibleAgent.
        </p>
        <p>
          Features include emotional state visualization, speech synchronization with text-to-speech output,
          customizable appearance, and adaptive animations based on context.
        </p>
      </div>
    </div>
  );
}
