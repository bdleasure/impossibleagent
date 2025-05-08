import { useState, useCallback } from "react";
import type { MemoryRetrievalOptions, MemoryRetrievalResult } from "../memory/LearningEnhancedMemoryRetrieval";
import type { Agent } from "agents";
import { useAgent } from "./useAgent";
import type { LearningEnhancedMemoryRetrieval } from "../memory/LearningEnhancedMemoryRetrieval";

// Extend the Agent interface to include the learningMemoryRetrieval property
declare module "agents" {
  interface Agent<Env> {
    learningMemoryRetrieval?: LearningEnhancedMemoryRetrieval;
    getMemoryRetrieval?: () => Promise<LearningEnhancedMemoryRetrieval>;
  }
}

/**
 * Hook for using the learning-enhanced memory retrieval system
 */
export function useLearningMemoryRetrieval(agentInstance?: Agent<any>) {
  const agentContext = useAgent();
  const agent = agentInstance || agentContext;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<MemoryRetrievalResult | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<Error | null>(null);

  /**
   * Get the memory retrieval system from the agent
   */
  const getMemoryRetrieval = useCallback(async () => {
    if (!agent) {
      throw new Error("Agent not available");
    }
    
    // If the agent has a getMemoryRetrieval method, use it
    if (agent.getMemoryRetrieval) {
      return await agent.getMemoryRetrieval();
    }
    
    // Otherwise, use the learningMemoryRetrieval property directly
    if (agent.learningMemoryRetrieval) {
      return agent.learningMemoryRetrieval;
    }
    
    throw new Error("Memory retrieval system not available on agent");
  }, [agent]);

  /**
   * Retrieve memories based on a query
   */
  const retrieveMemories = useCallback(
    async (query: string, options: MemoryRetrievalOptions = {}) => {
      if (!query.trim()) {
        setError(new Error("Query cannot be empty"));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get the memory retrieval system
        const memoryRetrieval = await getMemoryRetrieval();
        
        // Retrieve memories
        const retrievalResult = await memoryRetrieval.retrieveMemories(query, options);
        setResult(retrievalResult);
        return retrievalResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getMemoryRetrieval]
  );

  /**
   * Submit feedback on a memory retrieval
   */
  const submitFeedback = useCallback(
    async (feedback: {
      queryId: string;
      memoryId: string;
      relevanceRating: number;
      accuracyRating: number;
      userComment?: string;
    }) => {
      setFeedbackSubmitting(true);
      setFeedbackError(null);
      
      try {
        // Get the memory retrieval system
        const memoryRetrieval = await getMemoryRetrieval();
        
        // Submit feedback
        await memoryRetrieval.recordRetrievalFeedback(feedback);

        // Update the result to mark this memory as having feedback collected
        if (result && result.queryId === feedback.queryId) {
          setResult(prevResult => {
            if (!prevResult) return null;

            // Create a new metadata object with the updated feedbackCollected array
            const metadata = {
              ...prevResult.metadata,
              feedbackCollected: [
                ...(prevResult.metadata?.feedbackCollected || []),
                feedback.memoryId
              ]
            };

            // Return the updated result
            return {
              ...prevResult,
              metadata
            };
          });
        }

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedbackError(error);
        return false;
      } finally {
        setFeedbackSubmitting(false);
      }
    },
    [getMemoryRetrieval, result]
  );

  /**
   * Check if feedback has been collected for a memory
   */
  const hasFeedback = useCallback(
    (memoryId: string) => {
      if (!result || !result.metadata?.feedbackCollected) {
        return false;
      }

      return result.metadata.feedbackCollected.includes(memoryId);
    },
    [result]
  );

  /**
   * Clear the current result
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    retrieveMemories,
    submitFeedback,
    hasFeedback,
    clearResult,
    result,
    isLoading,
    error,
    feedbackSubmitting,
    feedbackError
  };
}
