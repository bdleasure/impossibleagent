import React from "react";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { Brain } from "@phosphor-icons/react";

export interface MessageBubbleProps {
  message: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: number;
  };
  isImportant?: boolean;
  showMemoryIndicator?: boolean;
  className?: string;
}

/**
 * MessageBubble component displays a single message with rich formatting
 * and optional memory indicators
 */
export function MessageBubble({
  message,
  isImportant = false,
  showMemoryIndicator = true,
  className = "",
}: MessageBubbleProps) {
  const { id, role, content, timestamp } = message;
  
  // Format timestamp if provided
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  
  return (
    <div 
      className={`message-bubble ${role} ${isImportant ? 'important' : ''} ${className}`}
      data-message-id={id}
    >
      <div className="message-bubble-content">
        {typeof content === "string" ? (
          <MemoizedMarkdown content={content} id={id} />
        ) : (
          <div>Unsupported message format</div>
        )}
      </div>
      
      <div className="message-bubble-footer">
        {formattedTime && (
          <span className="message-time">{formattedTime}</span>
        )}
        
        {showMemoryIndicator && (
          <div className="memory-indicator-container">
            {isImportant && (
              <div className="memory-indicator important" title="Marked as important">
                <Brain size={14} weight="fill" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
