import { useState, useCallback } from 'react';
import type { Agent } from 'agents/react';

/**
 * Options for memory retrieval
 */
export interface MemoryRetrievalOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  timeframe?: 'recent' | 'all' | { start: Date; end: Date };
}

/**
 * Result of memory retrieval
 */
export interface MemoryRetrievalResult {
  memories: any[];
  relevanceScores: number[];
  metadata?: any[];
}

/**
 * Hook for learning-enhanced memory retrieval
 * Provides functions to interact with the memory system
 */
export function useLearningMemoryRetrieval(agent?: Agent<any, unknown>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [feedbackIsLoading, setFeedbackIsLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<Error | null>(null);
  
  /**
   * Retrieve memories based on a query
   */
  const retrieveMemories = useCallback(async (
    query: string,
    options?: MemoryRetrievalOptions
  ): Promise<MemoryRetrievalResult | null> => {
    if (!agent) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await agent.call('retrieveMemories', [query, options]);
      return result as MemoryRetrievalResult;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [agent]);
  
  /**
   * Submit feedback on memory retrieval
   */
  const submitFeedback = useCallback(async (feedback: {
    memoryId: string;
    isRelevant: boolean;
    query?: string;
  }): Promise<boolean> => {
    if (!agent) return false;
    
    setFeedbackIsLoading(true);
    setFeedbackError(null);
    
    try {
      await agent.call('submitMemoryFeedback', [feedback]);
      return true;
    } catch (err) {
      setFeedbackError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setFeedbackIsLoading(false);
    }
  }, [agent]);
  
  /**
   * Mark a message as important for memory
   */
  const markAsImportant = useCallback((messageId: string): Promise<boolean> => {
    if (!agent) return Promise.resolve(false);
    
    return agent.call('markMessageAsImportant', [messageId])
      .then(() => true)
      .catch((err) => {
        console.error('Error marking message as important:', err);
        return false;
      });
  }, [agent]);
  
  /**
   * Provide feedback on a message (like/dislike)
   */
  const provideFeedback = useCallback((
    messageId: string, 
    feedback: 'like' | 'dislike'
  ): Promise<boolean> => {
    if (!agent) return Promise.resolve(false);
    
    return agent.call('provideMessageFeedback', [messageId, feedback])
      .then(() => true)
      .catch((err) => {
        console.error('Error providing message feedback:', err);
        return false;
      });
  }, [agent]);
  
  /**
   * Retrieve memories related to the current conversation
   */
  const retrieveRelatedMemories = useCallback((
    options?: MemoryRetrievalOptions
  ): Promise<MemoryRetrievalResult | null> => {
    if (!agent) return Promise.resolve(null);
    
    return agent.call('retrieveRelatedMemories', [options])
      .then((result) => result as MemoryRetrievalResult)
      .catch((err) => {
        console.error('Error retrieving related memories:', err);
        return null;
      });
  }, [agent]);
  
  return {
    retrieveMemories,
    submitFeedback,
    markAsImportant,
    provideFeedback,
    retrieveRelatedMemories,
    isLoading,
    error,
    feedbackIsLoading,
    feedbackError
  };
}
