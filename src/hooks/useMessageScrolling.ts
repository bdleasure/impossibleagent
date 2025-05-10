import { useState, useRef, useEffect, useCallback } from 'react';
import type { MessageTree } from '../types/message';
import { debounce } from '../utils/debounce';

/**
 * Hook for handling message scrolling behavior
 * @param messagesTree Array of message trees to display
 * @returns Object with scrolling-related state and handlers
 */
export function useMessageScrolling(messagesTree?: MessageTree[] | null) {
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(true);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageLengthRef = useRef<number>(0);
  
  // Smooth scroll to the messages end element
  const handleSmoothToRef = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAutoScrolling(true);
    }
  }, []);
  
  // Instant scroll to the messages end element
  const handleInstantToRef = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setIsAutoScrolling(true);
    }
  }, []);
  
  // Handle scroll events to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (!scrollableRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
    const scrollPosition = scrollHeight - scrollTop - clientHeight;
    
    // If we're more than 500px from the bottom, show the scroll button
    // and disable auto-scrolling
    if (scrollPosition > 500) {
      setShowScrollButton(true);
      setIsAutoScrolling(false);
    } else {
      setShowScrollButton(false);
      
      // If we're very close to the bottom, enable auto-scrolling
      if (scrollPosition < 50) {
        setIsAutoScrolling(true);
      }
    }
  }, []);
  
  // Debounce the scroll handler to improve performance
  const debouncedHandleScroll = debounce(handleScroll, 100);
  
  // Auto-scroll when new messages are added
  useEffect(() => {
    const messageLength = messagesTree?.length || 0;
    
    // If we have new messages and auto-scrolling is enabled
    if (
      messageLength > prevMessageLengthRef.current && 
      isAutoScrolling
    ) {
      handleInstantToRef();
    }
    
    prevMessageLengthRef.current = messageLength;
  }, [messagesTree, isAutoScrolling, handleInstantToRef]);
  
  return {
    conversation: { conversationId: 'main' }, // Placeholder for conversation context
    scrollableRef,
    messagesEndRef,
    showScrollButton,
    isAutoScrolling,
    handleSmoothToRef,
    handleInstantToRef,
    debouncedHandleScroll,
  };
}
