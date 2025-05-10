import React from "react";
import { ThumbsUp, ThumbsDown, Star, Copy } from "@phosphor-icons/react";

export interface MessageActionsProps {
  messageId: string;
  role: "user" | "assistant" | "system";
  onMarkImportant?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onCopy?: () => void;
  feedback?: 'like' | 'dislike';
  className?: string;
}

/**
 * MessageActions component provides action buttons for each message
 * such as like, dislike, mark as important, and copy
 */
export function MessageActions({
  messageId,
  role,
  onMarkImportant,
  onLike,
  onDislike,
  onCopy,
  feedback,
  className = "",
}: MessageActionsProps) {
  // Only show actions for assistant messages
  if (role !== "assistant") {
    return null;
  }
  
  // Copy message content to clipboard
  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      // Default implementation - find the message content by ID and copy it
      const messageElement = document.querySelector(`[data-message-id="${messageId}"] .message-bubble-content`);
      if (messageElement) {
        const text = messageElement.textContent || "";
        navigator.clipboard.writeText(text)
          .then(() => {
            // Show a temporary success message
            const copyButton = document.querySelector(`[data-message-id="${messageId}"] .message-action-copy`);
            if (copyButton) {
              copyButton.setAttribute('data-copied', 'true');
              setTimeout(() => {
                copyButton.setAttribute('data-copied', 'false');
              }, 2000);
            }
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
      }
    }
  };
  
  return (
    <div className={`message-actions ${className}`}>
      {onLike && (
        <button 
          className={`message-action-button like ${feedback === 'like' ? 'active' : ''}`}
          onClick={onLike}
          title="Like this response"
        >
          <ThumbsUp size={16} weight={feedback === 'like' ? "fill" : "regular"} />
        </button>
      )}
      
      {onDislike && (
        <button 
          className={`message-action-button dislike ${feedback === 'dislike' ? 'active' : ''}`}
          onClick={onDislike}
          title="Dislike this response"
        >
          <ThumbsDown size={16} weight={feedback === 'dislike' ? "fill" : "regular"} />
        </button>
      )}
      
      {onMarkImportant && (
        <button 
          className="message-action-button important"
          onClick={onMarkImportant}
          title="Mark as important for memory"
        >
          <Star size={16} />
        </button>
      )}
      
      <button 
        className="message-action-button copy message-action-copy"
        onClick={handleCopy}
        title="Copy to clipboard"
        data-copied="false"
      >
        <Copy size={16} />
      </button>
    </div>
  );
}
