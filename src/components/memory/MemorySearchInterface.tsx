import React, { useState, useCallback } from "react";
import { useLearningMemoryRetrieval } from "../../hooks/useLearningMemoryRetrieval";
import { MemoryRetrievalResults } from "./MemoryRetrievalResults";

interface MemorySearchInterfaceProps {
  initialQuery?: string;
  className?: string;
}

/**
 * A component that provides a search interface for the agent's memory
 * Uses the learning-enhanced memory retrieval system
 */
export function MemorySearchInterface({ initialQuery = "", className = "" }: MemorySearchInterfaceProps) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [timeframe, setTimeframe] = useState<"immediate" | "recent" | "medium" | "longTerm" | "all">("all");
  const [enhanceQuery, setEnhanceQuery] = useState<boolean>(true);
  const [minRelevance, setMinRelevance] = useState<number>(0.5);
  const [limit, setLimit] = useState<number>(10);

  const {
    retrieveMemories,
    submitFeedback,
    result,
    isLoading,
    error,
    clearResult,
    feedbackSubmitting,
    feedbackError
  } = useLearningMemoryRetrieval();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    await retrieveMemories(query, {
      contextTimeframe: timeframe,
      enhanceQuery,
      minRelevanceScore: minRelevance,
      limit
    });
  }, [query, timeframe, enhanceQuery, minRelevance, limit, retrieveMemories]);

  const handleSubmitFeedback = useCallback(async (feedback: {
    queryId: string;
    memoryId: string;
    relevanceRating: number;
    accuracyRating: number;
    userComment?: string;
  }) => {
    await submitFeedback(feedback);
  }, [submitFeedback]);

  const handleRetry = useCallback(async (originalQuery: string) => {
    setQuery(originalQuery);
    await retrieveMemories(originalQuery, {
      contextTimeframe: timeframe,
      enhanceQuery,
      minRelevanceScore: minRelevance,
      limit
    });
  }, [timeframe, enhanceQuery, minRelevance, limit, retrieveMemories]);

  const handleClear = useCallback(() => {
    clearResult();
    setQuery("");
  }, [clearResult]);

  return (
    <div className={`memory-search-interface ${className}`}>
      <div className="search-controls">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="search-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <button 
            className="search-button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
          {result && (
            <button 
              className="clear-button"
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="search-options">
          <div className="option-group">
            <label>
              Timeframe:
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                disabled={isLoading}
              >
                <option value="immediate">Immediate</option>
                <option value="recent">Recent</option>
                <option value="medium">Medium-term</option>
                <option value="longTerm">Long-term</option>
                <option value="all">All time</option>
              </select>
            </label>
          </div>
          
          <div className="option-group">
            <label>
              Min. Relevance:
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minRelevance}
                onChange={(e) => setMinRelevance(parseFloat(e.target.value))}
                disabled={isLoading}
              />
              <span>{Math.round(minRelevance * 100)}%</span>
            </label>
          </div>
          
          <div className="option-group">
            <label>
              Results Limit:
              <input
                type="number"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                disabled={isLoading}
              />
            </label>
          </div>
          
          <div className="option-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={enhanceQuery}
                onChange={(e) => setEnhanceQuery(e.target.checked)}
                disabled={isLoading}
              />
              Enhance Query with Learning
            </label>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error.message}</p>
        </div>
      )}
      
      {feedbackError && (
        <div className="feedback-error-message">
          <p>{feedbackError.message}</p>
        </div>
      )}
      
      {isLoading && (
        <div className="loading-indicator">
          <p>Searching memories...</p>
        </div>
      )}
      
      {result && !isLoading && (
        <MemoryRetrievalResults
          result={result}
          onSubmitFeedback={handleSubmitFeedback}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
