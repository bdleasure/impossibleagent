import React, { useState } from 'react';
import { CompanionAvatar } from './CompanionAvatar';

/**
 * CompanionAvatarDemo Component
 * 
 * Demo component for showcasing the Companion Avatar with interactive controls.
 */
export const CompanionAvatarDemo: React.FC = () => {
  const [emotion, setEmotion] = useState<'neutral' | 'happy' | 'thoughtful' | 'curious' | 'concerned'>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>Companion Avatar Demo</h1>
        <p className="demo-description">
          The Companion Avatar is the visual representation of the agent that responds to user 
          interactions with appropriate emotional expressions. It creates an emotional connection 
          with the user through facial expressions and animations.
        </p>
      </div>
      
      <div className="demo-features">
        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>Emotional Expressions:</strong> Different facial expressions based on the agent's emotional state
          </li>
          <li>
            <strong>Speaking Animation:</strong> Visual indication when the agent is speaking
          </li>
          <li>
            <strong>Blinking Effect:</strong> Random blinking for a more lifelike appearance
          </li>
          <li>
            <strong>Responsive Design:</strong> Adapts to different screen sizes
          </li>
          <li>
            <strong>Minimized State:</strong> Compact version for when screen space is limited
          </li>
        </ul>
      </div>
      
      <div className="demo-component">
        <div className="avatar-demo-container">
          <CompanionAvatar 
            emotion={emotion}
            isSpeaking={isSpeaking}
            minimized={isMinimized}
          />
        </div>
        
        <div className="avatar-controls">
          <div className="control-section">
            <h3>Emotion</h3>
            <div className="emotion-buttons">
              <button 
                className={`emotion-button ${emotion === 'neutral' ? 'active' : ''}`}
                onClick={() => setEmotion('neutral')}
              >
                Neutral
              </button>
              <button 
                className={`emotion-button ${emotion === 'happy' ? 'active' : ''}`}
                onClick={() => setEmotion('happy')}
              >
                Happy
              </button>
              <button 
                className={`emotion-button ${emotion === 'thoughtful' ? 'active' : ''}`}
                onClick={() => setEmotion('thoughtful')}
              >
                Thoughtful
              </button>
              <button 
                className={`emotion-button ${emotion === 'curious' ? 'active' : ''}`}
                onClick={() => setEmotion('curious')}
              >
                Curious
              </button>
              <button 
                className={`emotion-button ${emotion === 'concerned' ? 'active' : ''}`}
                onClick={() => setEmotion('concerned')}
              >
                Concerned
              </button>
            </div>
          </div>
          
          <div className="control-section">
            <h3>Speaking</h3>
            <label className="toggle-control">
              <input 
                type="checkbox" 
                checked={isSpeaking}
                onChange={() => setIsSpeaking(!isSpeaking)}
              />
              <span className="toggle-label">Speaking Animation</span>
            </label>
          </div>
          
          <div className="control-section">
            <h3>Size</h3>
            <label className="toggle-control">
              <input 
                type="checkbox" 
                checked={isMinimized}
                onChange={() => setIsMinimized(!isMinimized)}
              />
              <span className="toggle-label">Minimized</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="demo-instructions">
        <h2>How to Use</h2>
        <ol>
          <li>Click on different emotion buttons to change the avatar's expression</li>
          <li>Toggle the speaking animation to see how the avatar looks when speaking</li>
          <li>Toggle the minimized state to see the compact version of the avatar</li>
          <li>Watch for the random blinking effect that occurs automatically</li>
        </ol>
      </div>
      
      <div className="demo-footer">
        <a href="/showcase" className="demo-back-button">Back to Showcase</a>
      </div>
    </div>
  );
};

export default CompanionAvatarDemo;
