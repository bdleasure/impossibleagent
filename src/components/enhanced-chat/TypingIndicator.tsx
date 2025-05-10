import React from 'react';

interface TypingIndicatorProps {
  className?: string;
}

/**
 * TypingIndicator component shows an animated indicator when the AI is typing
 */
export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  return (
    <div className={`typing-indicator ${className}`}>
      <div className="typing-indicator-bubble">
        <div className="typing-indicator-dot"></div>
        <div className="typing-indicator-dot"></div>
        <div className="typing-indicator-dot"></div>
      </div>
      <span className="typing-indicator-text">AI is typing...</span>
    </div>
  );
}
