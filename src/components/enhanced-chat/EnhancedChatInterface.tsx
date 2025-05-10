import React, { useState, useEffect, useCallback } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { useLearningMemoryRetrieval } from '../../hooks/useLearningMemoryRetrieval';
import { useMessageScrolling } from '../../hooks/useMessageScrolling';
import { buildMessageTree, addMessageToTree } from '../../utils/buildMessageTree';
import { MultiMessage } from './MultiMessage';
import { ScrollToBottom } from './ScrollToBottom';
// Import from the barrel file
import { ChatInput, TypingIndicator } from './';
import type { EnhancedChatProps, Message, MessageTree } from './types';
import './enhanced-chat.css';

/**
 * EnhancedChatInterface is the main component for the chat interface
 * with memory capabilities and tree-based conversation structure
 */
export function EnhancedChatInterface({
  agentName = 'AI Assistant',
  chatId = 'main',
  showAvatar = true,
  showMemoryIndicators = true,
  className = '',
  onMarkImportant,
  onProvideFeedback,
  onVoiceToggle,
  isVoiceActive,
  voiceTranscript,
  onFileUpload,
}: EnhancedChatProps) {
  // State for the chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesTree, setMessagesTree] = useState<MessageTree[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | number | null>(null);
  
  // Get the agent instance
  const agent = useAgent();
  
  // Use the memory retrieval hook
  const {
    retrieveMemories,
    submitFeedback,
    markAsImportant,
    provideFeedback,
    retrieveRelatedMemories,
    isLoading: memoryIsLoading,
  } = useLearningMemoryRetrieval(agent || undefined);
  
  // Use the message scrolling hook
  const {
    scrollableRef,
    messagesEndRef,
    showScrollButton,
    handleSmoothToRef,
    debouncedHandleScroll,
  } = useMessageScrolling(messagesTree);
  
  // Load initial messages
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (!agent) return;
      
      try {
        // In a real implementation, we would load messages from the agent
        // For now, we'll just create some dummy messages
        const initialMessages: Message[] = [
          {
            id: '1',
            role: 'user',
            content: 'Hello, how are you?',
            timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
          },
          {
            id: '2',
            role: 'assistant',
            content: 'I\'m doing well, thank you for asking! How can I help you today?',
            timestamp: Date.now() - 1000 * 60 * 4, // 4 minutes ago
          },
        ];
        
        setMessages(initialMessages);
        
        // Build the message tree
        const tree = buildMessageTree(initialMessages);
        setMessagesTree(tree);
        
        // Load related memories
        const relatedMemories = await retrieveRelatedMemories();
        console.log('Related memories:', relatedMemories);
      } catch (error) {
        console.error('Error loading initial messages:', error);
      }
    };
    
    loadInitialMessages();
  }, [agent, retrieveRelatedMemories]);
  
  // Handle sending a message
  const handleSendMessage = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!inputValue.trim() || !agent || isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Create a new user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: inputValue,
        timestamp: Date.now(),
      };
      
      // Add the user message to the messages array
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      
      // Update the message tree
      const newTree = addMessageToTree(messagesTree, userMessage);
      setMessagesTree(newTree);
      
      // Clear the input
      setInputValue('');
      
      // In a real implementation, we would send the message to the agent
      // and get a response. For now, we'll just simulate a response.
      setTimeout(() => {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `This is a simulated response to: "${inputValue}"`,
          timestamp: Date.now(),
          metadata: {
            parentId: userMessage.id, // Link to the user message
          },
        };
        
        // Add the assistant message to the messages array
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        
        // Update the message tree
        const updatedTree = addMessageToTree(newTree, assistantMessage, userMessage.id);
        setMessagesTree(updatedTree);
        
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  }, [agent, inputValue, isLoading, messages, messagesTree]);
  
  // Handle marking a message as important
  const handleMarkImportant = useCallback(async (messageId: string) => {
    if (!agent) return;
    
    try {
      const success = await markAsImportant(messageId);
      
      if (success) {
        // Update the message in the state
        const updatedMessages = messages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, isImportant: true };
          }
          return msg;
        });
        
        setMessages(updatedMessages);
        
        // Update the message tree
        const updatedTree = buildMessageTree(updatedMessages);
        setMessagesTree(updatedTree);
        
        if (onMarkImportant) {
          onMarkImportant(messageId);
        }
      }
    } catch (error) {
      console.error('Error marking message as important:', error);
    }
  }, [agent, markAsImportant, messages, onMarkImportant]);
  
  // Handle providing feedback on a message
  const handleProvideFeedback = useCallback(async (messageId: string, feedback: 'like' | 'dislike') => {
    if (!agent) return;
    
    try {
      const success = await provideFeedback(messageId, feedback);
      
      if (success) {
        // Update the message in the state
        const updatedMessages = messages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, feedback };
          }
          return msg;
        });
        
        setMessages(updatedMessages);
        
        // Update the message tree
        const updatedTree = buildMessageTree(updatedMessages);
        setMessagesTree(updatedTree);
        
        if (onProvideFeedback) {
          onProvideFeedback(messageId, feedback);
        }
      }
    } catch (error) {
      console.error('Error providing feedback:', error);
    }
  }, [agent, provideFeedback, messages, onProvideFeedback]);
  
  return (
    <div className={`enhanced-chat-interface ${className}`}>
      <div 
        className="messages-container"
        ref={scrollableRef}
        onScroll={debouncedHandleScroll}
      >
        {messagesTree.map((message) => (
          <MultiMessage
            key={message.id}
            messageId={message.id}
            messagesTree={[message]}
            currentEditId={currentEditId}
            setCurrentEditId={setCurrentEditId}
          />
        ))}
        
        {isLoading && (
          <div className="typing-indicator-container">
            <TypingIndicator />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {showScrollButton && (
        <ScrollToBottom 
          scrollHandler={handleSmoothToRef} 
          className="scroll-button"
        />
      )}
      
      <div className="chat-input-container">
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          onVoiceToggle={onVoiceToggle}
          isVoiceActive={isVoiceActive}
          onFileUpload={onFileUpload}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
