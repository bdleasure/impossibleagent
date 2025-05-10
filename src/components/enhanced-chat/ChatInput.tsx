import React, { useState, useRef } from 'react';
import { PaperPlaneRight, Microphone, MicrophoneSlash, PaperclipHorizontal, Smiley } from '@phosphor-icons/react';
import type { ChatInputProps } from './types';

/**
 * ChatInput component for user message input
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  onVoiceToggle,
  isVoiceActive = false,
  onFileUpload,
  onEmojiSelect,
  className = '',
  placeholder = 'Type a message...',
  isCollapsed = false,
  setIsCollapsed,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(e.target.files[0]);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle emoji selection
  const handleEmojiClick = (emoji: string) => {
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }
  };
  
  return (
    <form 
      className={`chat-input ${className} ${isFocused ? 'focused' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      onSubmit={onSubmit}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      {/* File upload button */}
      {onFileUpload && (
        <button
          type="button"
          className="chat-input-button file-button"
          onClick={handleFileSelect}
          aria-label="Upload file"
          title="Upload file"
        >
          <PaperclipHorizontal size={20} />
        </button>
      )}
      
      {/* Emoji button */}
      {onEmojiSelect && (
        <button
          type="button"
          className="chat-input-button emoji-button"
          onClick={() => handleEmojiClick('😊')} // Simplified for now
          aria-label="Insert emoji"
          title="Insert emoji"
        >
          <Smiley size={20} />
        </button>
      )}
      
      {/* Text input */}
      <div className="input-container">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="chat-input-textarea"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isLoading}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>
      
      {/* Voice button */}
      {onVoiceToggle && (
        <button
          type="button"
          className={`chat-input-button voice-button ${isVoiceActive ? 'active' : ''}`}
          onClick={onVoiceToggle}
          aria-label={isVoiceActive ? 'Stop voice input' : 'Start voice input'}
          title={isVoiceActive ? 'Stop voice input' : 'Start voice input'}
        >
          {isVoiceActive ? (
            <MicrophoneSlash size={20} />
          ) : (
            <Microphone size={20} />
          )}
        </button>
      )}
      
      {/* Submit button */}
      <button
        type="submit"
        className="chat-input-button submit-button"
        disabled={isLoading || !value.trim()}
        aria-label="Send message"
        title="Send message"
      >
        <PaperPlaneRight size={20} weight="fill" />
      </button>
    </form>
  );
}
