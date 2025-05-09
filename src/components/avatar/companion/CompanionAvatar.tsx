import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import useTheme from "@/hooks/useTheme";
import { useAgent } from "@/hooks/useAgent";

// Types for avatar state
export interface AvatarState {
  mood: "joy" | "sadness" | "anger" | "fear" | "surprise" | "neutral";
  animation: "idle" | "talking" | "thinking" | "listening";
  customization: {
    color: string;
    shape: "circle" | "square" | "hexagon";
    features: string[];
  };
  speechBubble?: {
    text: string;
    duration: number;
  };
}

// Props for the Companion Avatar component
interface CompanionAvatarProps {
  className?: string;
  size?: "small" | "medium" | "large";
  initialMood?: AvatarState["mood"];
  showControls?: boolean;
  showCustomization?: boolean;
  onMoodChange?: (mood: AvatarState["mood"]) => void;
}

/**
 * Companion Avatar Component
 * 
 * A WebGL-based avatar with reactive, mood-based animations.
 * Features include emotional state visualization, speech synchronization,
 * and customizable appearance.
 */
export function CompanionAvatar({
  className,
  size = "medium",
  initialMood = "neutral",
  showControls = false,
  showCustomization = false,
  onMoodChange,
}: CompanionAvatarProps) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [avatarState, setAvatarState] = useState<AvatarState>({
    mood: initialMood,
    animation: "idle",
    customization: {
      color: "#89b4fa", // Default color
      shape: "circle",
      features: ["eyes", "mouth"]
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(false);

  // Hooks
  const agent = useAgent();
  // Mock implementation of useTheme hook
  const theme = "dark"; // Default theme

  // Set up WebGL rendering
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");

    if (!gl) {
      setError("WebGL not supported in your browser");
      setLoading(false);
      return;
    }

    try {
      // In a real implementation, this would set up WebGL rendering
      // For now, we'll just simulate the loading process
      const loadingTimer = setTimeout(() => {
        setLoading(false);
        initializeAvatar(gl);
      }, 1000);

      return () => {
        clearTimeout(loadingTimer);
        cancelAnimationFrame(animationFrameRef.current);
      };
    } catch (err) {
      console.error("Failed to initialize WebGL:", err);
      setError("Failed to initialize avatar");
      setLoading(false);
    }
  }, []);

  // Update avatar when mood changes
  useEffect(() => {
    if (loading || error) return;

    // In a real implementation, this would update the WebGL rendering
    // For now, we'll just log the mood change
    console.log("Avatar mood changed:", avatarState.mood);

    // Notify parent component if callback is provided
    if (onMoodChange) {
      onMoodChange(avatarState.mood);
    }
  }, [avatarState.mood, loading, error, onMoodChange]);

  // Handle speech bubble display
  useEffect(() => {
    if (!avatarState.speechBubble) return;

    setShowSpeechBubble(true);

    // Clear any existing timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // Hide speech bubble after duration
    speechTimeoutRef.current = setTimeout(() => {
      setShowSpeechBubble(false);
      speechTimeoutRef.current = null;
    }, avatarState.speechBubble.duration);

    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, [avatarState.speechBubble]);

  // Initialize avatar with WebGL
  const initializeAvatar = (gl: WebGLRenderingContext) => {
    // In a real implementation, this would set up the WebGL scene
    // For now, we'll just start a simple animation loop
    const render = () => {
      // In a real implementation, this would render the avatar
      // For now, we'll just keep the animation frame running
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Change avatar mood
  const changeMood = (mood: AvatarState["mood"]) => {
    setAvatarState(prev => ({
      ...prev,
      mood
    }));
  };

  // Make avatar speak
  const speak = (text: string, duration: number = 3000) => {
    setAvatarState(prev => ({
      ...prev,
      animation: "talking",
      speechBubble: {
        text,
        duration
      }
    }));

    // Return to idle after speaking
    setTimeout(() => {
      setAvatarState(prev => ({
        ...prev,
        animation: "idle"
      }));
    }, duration);
  };

  // Change avatar animation
  const changeAnimation = (animation: AvatarState["animation"]) => {
    setAvatarState(prev => ({
      ...prev,
      animation
    }));
  };

  // Update avatar customization
  const updateCustomization = (customization: Partial<AvatarState["customization"]>) => {
    setAvatarState(prev => ({
      ...prev,
      customization: {
        ...prev.customization,
        ...customization
      }
    }));
  };

  // Handle retry when error occurs
  const handleRetry = () => {
    setError(null);
    setLoading(true);

    // Attempt to reinitialize
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext("webgl");
      if (gl) {
        setTimeout(() => {
          setLoading(false);
          initializeAvatar(gl);
        }, 1000);
      } else {
        setError("WebGL not supported in your browser");
        setLoading(false);
      }
    }
  };

  // Get size class based on prop
  const getSizeClass = () => {
    switch (size) {
      case "small": return "w-[100px] h-[100px]";
      case "large": return "w-[300px] h-[300px]";
      default: return "w-[200px] h-[200px]";
    }
  };

  // Get animation class based on state
  const getAnimationClass = () => {
    switch (avatarState.animation) {
      case "talking": return "avatar-animation-pulse";
      case "thinking": return "avatar-animation-bounce";
      case "listening": return "avatar-animation-shake";
      default: return "";
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={cn("companion-avatar", getSizeClass(), className)}>
        <div className="avatar-loading">
          <div className="avatar-loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={cn("companion-avatar", getSizeClass(), className)}>
        <div className="avatar-error">
          <div className="avatar-error-icon">⚠️</div>
          <p className="avatar-error-message">{error}</p>
          <button className="avatar-retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("companion-avatar-container", className)}>
      <div 
        className={cn(
          "companion-avatar", 
          getSizeClass(),
          getAnimationClass()
        )}
      >
        {/* Speech bubble */}
        {avatarState.speechBubble && showSpeechBubble && (
          <div className={cn("speech-bubble", showSpeechBubble && "visible")}>
            <p className="speech-bubble-text">{avatarState.speechBubble.text}</p>
          </div>
        )}

        {/* Canvas for WebGL rendering */}
        <canvas 
          ref={canvasRef} 
          className="avatar-canvas"
          width={300}
          height={300}
        ></canvas>

        {/* Mood indicator */}
        <div className={cn("mood-indicator", `mood-${avatarState.mood}`)}>
          {avatarState.mood === "joy" && "😊"}
          {avatarState.mood === "sadness" && "😢"}
          {avatarState.mood === "anger" && "😠"}
          {avatarState.mood === "fear" && "😨"}
          {avatarState.mood === "surprise" && "😲"}
          {avatarState.mood === "neutral" && "😐"}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="avatar-controls">
          <button 
            className={cn("avatar-control-button", avatarState.mood === "joy" && "active")}
            onClick={() => changeMood("joy")}
            title="Joy"
          >
            😊
          </button>
          <button 
            className={cn("avatar-control-button", avatarState.mood === "sadness" && "active")}
            onClick={() => changeMood("sadness")}
            title="Sadness"
          >
            😢
          </button>
          <button 
            className={cn("avatar-control-button", avatarState.mood === "anger" && "active")}
            onClick={() => changeMood("anger")}
            title="Anger"
          >
            😠
          </button>
          <button 
            className={cn("avatar-control-button", avatarState.mood === "fear" && "active")}
            onClick={() => changeMood("fear")}
            title="Fear"
          >
            😨
          </button>
          <button 
            className={cn("avatar-control-button", avatarState.mood === "surprise" && "active")}
            onClick={() => changeMood("surprise")}
            title="Surprise"
          >
            😲
          </button>
          <button 
            className={cn("avatar-control-button", avatarState.mood === "neutral" && "active")}
            onClick={() => changeMood("neutral")}
            title="Neutral"
          >
            😐
          </button>
        </div>
      )}

      {/* Customization panel */}
      {showCustomization && (
        <div className="avatar-customization-panel">
          <div className="customization-section">
            <h4 className="customization-section-title">Color</h4>
            <div className="customization-options">
              <div 
                className={cn("customization-option", avatarState.customization.color === "#89b4fa" && "selected")}
                style={{ backgroundColor: "#89b4fa" }}
                onClick={() => updateCustomization({ color: "#89b4fa" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.color === "#f38ba8" && "selected")}
                style={{ backgroundColor: "#f38ba8" }}
                onClick={() => updateCustomization({ color: "#f38ba8" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.color === "#a6e3a1" && "selected")}
                style={{ backgroundColor: "#a6e3a1" }}
                onClick={() => updateCustomization({ color: "#a6e3a1" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.color === "#f9e2af" && "selected")}
                style={{ backgroundColor: "#f9e2af" }}
                onClick={() => updateCustomization({ color: "#f9e2af" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.color === "#cba6f7" && "selected")}
                style={{ backgroundColor: "#cba6f7" }}
                onClick={() => updateCustomization({ color: "#cba6f7" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.color === "#94e2d5" && "selected")}
                style={{ backgroundColor: "#94e2d5" }}
                onClick={() => updateCustomization({ color: "#94e2d5" })}
              ></div>
            </div>
          </div>

          <div className="customization-section">
            <h4 className="customization-section-title">Shape</h4>
            <div className="customization-options">
              <div 
                className={cn("customization-option", avatarState.customization.shape === "circle" && "selected")}
                style={{ borderRadius: "50%" }}
                onClick={() => updateCustomization({ shape: "circle" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.shape === "square" && "selected")}
                style={{ borderRadius: "4px" }}
                onClick={() => updateCustomization({ shape: "square" })}
              ></div>
              <div 
                className={cn("customization-option", avatarState.customization.shape === "hexagon" && "selected")}
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                onClick={() => updateCustomization({ shape: "hexagon" })}
              ></div>
            </div>
          </div>

          <div className="animation-controls">
            <div className="animation-control">
              <span className="animation-control-label">Animation Speed</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                defaultValue="5" 
                className="animation-control-slider" 
              />
              <span className="animation-control-value">5</span>
            </div>
            <div className="animation-control">
              <span className="animation-control-label">Expression Intensity</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                defaultValue="7" 
                className="animation-control-slider" 
              />
              <span className="animation-control-value">7</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export a function to create a speech bubble programmatically
export function makeAvatarSpeak(text: string, duration: number = 3000) {
  // This would be implemented in a real application to allow other components
  // to make the avatar speak without direct access to the component instance
  console.log("Avatar speaking:", text);
  // In a real implementation, this would use a pub/sub system or context
}
