import React from "react";

export interface MessageGroupProps {
  children: React.ReactNode;
  timestamp?: number;
  className?: string;
}

/**
 * MessageGroup component groups related messages together
 * with an optional timestamp header
 */
export function MessageGroup({
  children,
  timestamp,
  className = "",
}: MessageGroupProps) {
  // Format timestamp if provided
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  
  return (
    <div className={`message-group ${className}`}>
      {formattedTime && (
        <div className="message-group-timestamp">
          <span>{formattedTime}</span>
        </div>
      )}
      <div className="message-group-content">
        {children}
      </div>
    </div>
  );
}
