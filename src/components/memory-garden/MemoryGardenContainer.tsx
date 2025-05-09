import React, { useState, useEffect } from "react";
import { MemoryGarden as MemoryGarden3D } from "./3d/MemoryGarden";
import { MemoryGardenLite } from "./lite/MemoryGardenLite";
import type { MemoryNode } from "./3d/MemoryGarden";

interface MemoryGardenContainerProps {
  memories: MemoryNode[];
  onMemorySelect?: (memory: MemoryNode) => void;
  season?: "spring" | "summer" | "autumn" | "winter";
  environmentType?: "forest" | "meadow" | "beach" | "mountain";
  timeOfDay?: "dawn" | "day" | "dusk" | "night";
  height?: number;
  width?: string | number;
  forceMode?: "3d" | "lite";
  className?: string;
}

/**
 * Memory Garden Container
 * 
 * A responsive container that renders either the 3D Memory Garden or the Lite version
 * based on device capabilities and user preferences.
 */
export function MemoryGardenContainer({
  memories,
  onMemorySelect,
  season = "spring",
  environmentType = "forest",
  timeOfDay = "day",
  height = 600,
  width = "100%",
  forceMode,
  className = ""
}: MemoryGardenContainerProps) {
  // State to track which version to render
  const [renderMode, setRenderMode] = useState<"3d" | "lite" | "loading">("loading");
  
  // State to track if WebGL is supported
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  
  // State to track if the device is low-powered
  const [isLowPoweredDevice, setIsLowPoweredDevice] = useState<boolean>(false);
  
  // State to track user preference
  const [userPrefers3D, setUserPrefers3D] = useState<boolean | null>(null);

  // Check device capabilities on mount
  useEffect(() => {
    // Check if WebGL is supported
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const hasWebGL = !!gl;
    setWebGLSupported(hasWebGL);
    
    // Check if device is likely low-powered
    const isLowPower = checkIfLowPoweredDevice();
    setIsLowPoweredDevice(isLowPower);
    
    // Check user preference from localStorage
    const storedPreference = localStorage.getItem("memoryGardenPrefers3D");
    if (storedPreference !== null) {
      setUserPrefers3D(storedPreference === "true");
    }
    
    // Determine which mode to render
    if (forceMode) {
      setRenderMode(forceMode);
    } else if (storedPreference !== null) {
      setRenderMode(storedPreference === "true" ? "3d" : "lite");
    } else if (!hasWebGL || isLowPower) {
      setRenderMode("lite");
    } else {
      setRenderMode("3d");
    }
  }, [forceMode]);

  // Function to check if device is likely low-powered
  const checkIfLowPoweredDevice = (): boolean => {
    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if it's an older device (rough estimate based on hardware concurrency)
    const isOlderDevice = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    
    // Check if the device has limited memory
    // Note: deviceMemory is an experimental API and may not be available in all browsers
    const hasLimitedMemory = 'deviceMemory' in navigator && 
      // @ts-ignore - deviceMemory is not in the standard Navigator type
      navigator.deviceMemory < 4;
    
    return isMobile && (isOlderDevice || hasLimitedMemory);
  };

  // Function to toggle between 3D and Lite versions
  const toggleRenderMode = () => {
    const newMode = renderMode === "3d" ? "lite" : "3d";
    setRenderMode(newMode);
    setUserPrefers3D(newMode === "3d");
    localStorage.setItem("memoryGardenPrefers3D", newMode === "3d" ? "true" : "false");
  };

  return (
    <div className={`memory-garden-container ${className}`} style={{ width }}>
      {renderMode === "loading" ? (
        <div className="memory-garden-loading">
          <div className="memory-garden-loading-spinner"></div>
        </div>
      ) : renderMode === "3d" ? (
        <>
          <MemoryGarden3D
            memories={memories}
            onMemorySelect={onMemorySelect}
            season={season}
            environmentType={environmentType}
            timeOfDay={timeOfDay}
            height={height}
          />
          {!forceMode && (
            <button 
              className="garden-mode-toggle" 
              onClick={toggleRenderMode}
              title="Switch to 2D mode (better performance)"
            >
              Switch to 2D
            </button>
          )}
        </>
      ) : (
        <>
          <MemoryGardenLite
            memories={memories}
            onMemorySelect={onMemorySelect}
            season={season}
            height={height}
          />
          {!forceMode && webGLSupported && (
            <button 
              className="garden-mode-toggle" 
              onClick={toggleRenderMode}
              title="Switch to 3D mode (better visuals)"
            >
              Switch to 3D
            </button>
          )}
        </>
      )}
      
      {!webGLSupported && renderMode === "lite" && (
        <div className="garden-notice">
          <p>3D mode is not available because WebGL is not supported by your browser.</p>
        </div>
      )}
      
      {isLowPoweredDevice && renderMode === "lite" && webGLSupported && !userPrefers3D && (
        <div className="garden-notice">
          <p>Using 2D mode for better performance on this device.</p>
        </div>
      )}
    </div>
  );
}
