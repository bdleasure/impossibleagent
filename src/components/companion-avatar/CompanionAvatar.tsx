import React, { useState, useEffect } from 'react';
import '@/styles/companion-avatar.css';

/**
 * Emotion type for the Companion Avatar
 */
type Emotion = 'neutral' | 'happy' | 'thoughtful' | 'curious' | 'concerned';

/**
 * Props for the CompanionAvatar component
 */
interface CompanionAvatarProps {
  /** Current emotion to display */
  emotion?: Emotion;
  /** Whether the avatar is speaking */
  isSpeaking?: boolean;
  /** Whether to show the avatar in a minimized state */
  minimized?: boolean;
  /** Optional custom style */
  style?: React.CSSProperties;
}

/**
 * CompanionAvatar Component
 * 
 * The visual representation of the agent that responds to user interactions
 * with appropriate emotional expressions.
 */
export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  emotion = 'neutral',
  isSpeaking = false,
  minimized = false,
  style
}) => {
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(emotion);
  const [blinking, setBlinking] = useState(false);
  
  // Handle emotion changes with smooth transitions
  useEffect(() => {
    setCurrentEmotion(emotion);
  }, [emotion]);
  
  // Random blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 200);
    }, Math.random() * 3000 + 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);
  
  // Get the appropriate avatar class based on the current emotion
  const getAvatarClass = () => {
    let classes = ['companion-avatar'];
    
    if (minimized) {
      classes.push('minimized');
    }
    
    if (isSpeaking) {
      classes.push('speaking');
    }
    
    if (blinking) {
      classes.push('blinking');
    }
    
    classes.push(currentEmotion);
    
    return classes.join(' ');
  };
  
  // Render different facial expressions based on emotion
  const renderFace = () => {
    switch (currentEmotion) {
      case 'happy':
        return (
          <>
            <div className="companion-avatar-eyes">
              <div className="companion-avatar-eye left">
                <div className="companion-avatar-pupil"></div>
              </div>
              <div className="companion-avatar-eye right">
                <div className="companion-avatar-pupil"></div>
              </div>
            </div>
            <div className="companion-avatar-mouth happy"></div>
          </>
        );
      case 'thoughtful':
        return (
          <>
            <div className="companion-avatar-eyes">
              <div className="companion-avatar-eye left">
                <div className="companion-avatar-pupil"></div>
              </div>
              <div className="companion-avatar-eye right">
                <div className="companion-avatar-pupil"></div>
              </div>
            </div>
            <div className="companion-avatar-mouth thoughtful"></div>
          </>
        );
      case 'curious':
        return (
          <>
            <div className="companion-avatar-eyes">
              <div className="companion-avatar-eye left">
                <div className="companion-avatar-pupil"></div>
              </div>
              <div className="companion-avatar-eye right">
                <div className="companion-avatar-pupil"></div>
              </div>
            </div>
            <div className="companion-avatar-mouth curious"></div>
          </>
        );
      case 'concerned':
        return (
          <>
            <div className="companion-avatar-eyes">
              <div className="companion-avatar-eye left">
                <div className="companion-avatar-pupil"></div>
              </div>
              <div className="companion-avatar-eye right">
                <div className="companion-avatar-pupil"></div>
              </div>
            </div>
            <div className="companion-avatar-mouth concerned"></div>
          </>
        );
      case 'neutral':
      default:
        return (
          <>
            <div className="companion-avatar-eyes">
              <div className="companion-avatar-eye left">
                <div className="companion-avatar-pupil"></div>
              </div>
              <div className="companion-avatar-eye right">
                <div className="companion-avatar-pupil"></div>
              </div>
            </div>
            <div className="companion-avatar-mouth neutral"></div>
          </>
        );
    }
  };
  
  return (
    <div className={getAvatarClass()} style={style}>
      <div className="companion-avatar-container">
        <div className="companion-avatar-face">
          {renderFace()}
        </div>
        {isSpeaking && (
          <div className="companion-avatar-speaking-indicator">
            <div className="companion-avatar-speaking-dot"></div>
            <div className="companion-avatar-speaking-dot"></div>
            <div className="companion-avatar-speaking-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanionAvatar;
