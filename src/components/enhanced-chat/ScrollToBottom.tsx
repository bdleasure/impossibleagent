import React from 'react';
import { ArrowDown } from '@phosphor-icons/react';

interface ScrollToBottomProps {
  scrollHandler: () => void;
  className?: string;
}

/**
 * ScrollToBottom component displays a button to scroll to the bottom of the chat
 */
export function ScrollToBottom({ scrollHandler, className = '' }: ScrollToBottomProps) {
  return (
    <div className={`scroll-to-bottom-container ${className}`}>
      <button
        className="scroll-to-bottom-button"
        onClick={scrollHandler}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        <ArrowDown size={20} weight="bold" />
      </button>
    </div>
  );
}
