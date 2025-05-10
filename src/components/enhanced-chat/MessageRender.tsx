import React, { useCallback, useMemo } from 'react';
import type { MessageRenderProps } from './types';
import { MessageBubble } from './MessageBubble';
import { MessageActions } from './MessageActions';
import { MemoizedMarkdown } from '../memoized-markdown';
import { Brain } from '@phosphor-icons/react';

/**
 * MessageRender component displays a single message with its content and actions
 */
export function MessageRender({
  message,
  currentEditId,
  setCurrentEditId,
  siblingIdx,
  siblingCount,
  setSiblingIdx,
  isCard = false,
  isMultiMessage = false,
}: MessageRenderProps) {
  // Handle entering edit mode
  const handleEnterEdit = useCallback(() => {
    if (setCurrentEditId && message.id) {
      setCurrentEditId(message.id);
    }
  }, [message.id, setCurrentEditId]);

  // Handle regenerating the message
  const handleRegenerate = useCallback(() => {
    console.log('Regenerate message:', message.id);
    // TODO: Implement regeneration logic
  }, [message.id]);

  // Handle continuing the message
  const handleContinue = useCallback(() => {
    console.log('Continue message:', message.id);
    // TODO: Implement continuation logic
  }, [message.id]);

  // Handle copying the message to clipboard
  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          console.log('Message copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy message:', err);
        });
    }
  }, [message.content]);

  // Check if this is the last message
  const isLast = useMemo(() => {
    return !message.children || message.children.length === 0;
  }, [message.children]);

  // Determine if we're currently editing this message
  const isEditing = currentEditId === message.id;

  return (
    <div
      id={message.id}
      className={`message-render ${message.role} ${isCard ? 'card' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-icon">
        {message.role === 'assistant' ? (
          <div className="assistant-icon">AI</div>
        ) : (
          <div className="user-icon">U</div>
        )}
      </div>

      <div className="message-content-container">
        <h2 className="message-sender">
          {message.role === 'assistant' ? 'AI Assistant' : 'You'}
        </h2>

        <div className="message-content">
          {isEditing ? (
            <textarea
              defaultValue={message.content}
              className="message-edit-textarea"
              autoFocus
              onBlur={(e) => {
                // TODO: Implement edit completion logic
                if (setCurrentEditId) setCurrentEditId(null);
              }}
            />
          ) : (
            <MessageBubble
              message={message}
              isImportant={message.isImportant}
              showMemoryIndicator={true}
              isEditing={isEditing}
            />
          )}
        </div>

        {!isEditing && (
          <MessageActions
            messageId={message.id}
            role={message.role}
            onMarkImportant={() => {
              console.log('Mark as important:', message.id);
              // TODO: Implement marking as important
            }}
            onLike={() => {
              console.log('Like message:', message.id);
              // TODO: Implement like functionality
            }}
            onDislike={() => {
              console.log('Dislike message:', message.id);
              // TODO: Implement dislike functionality
            }}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onContinue={handleContinue}
            onEdit={handleEnterEdit}
            feedback={message.feedback}
            isLast={isLast}
          />
        )}
      </div>
    </div>
  );
}
