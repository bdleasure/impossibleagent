import React, { useState } from "react";
import type { MemoryRetrievalResult } from "../../memory/LearningEnhancedMemoryRetrieval";
import type { RankedMemory } from "../../memory/RelevanceRanking";
import { MemoryFeedbackForm } from "../feedback/MemoryFeedbackForm";

interface MemoryRetrievalResultsProps {
  result: MemoryRetrievalResult;
  onSubmitFeedback: (feedback: {
    queryId: string;
    memoryId: string;
    relevanceRating: number;
    accuracyRating: number;
    userComment?: string;
  }) => Promise<void>;
  onRetry: (originalQuery: string) => Promise<void>;
}

/**
 * Component to display memory retrieval results
 */
export function MemoryRetrievalResults({
  result,
  onSubmitFeedback,
  onRetry
}: MemoryRetrievalResultsProps) {
  const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set());
  const [feedbackMemory, setFeedbackMemory] = useState<RankedMemory | null>(null);

  const toggleMemoryExpanded = (memoryId: string) => {
    setExpandedMemories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
      }
      return newSet;
    });
  };

  const openFeedbackForm = (memory: RankedMemory) => {
    setFeedbackMemory(memory);
  };

  const closeFeedbackForm = () => {
    setFeedbackMemory(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelevanceScore = (score: number) => {
    return Math.round(score * 100);
  };

  if (result.memories.length === 0) {
    return (
      <div className="memory-retrieval-results">
        <div className="no-results">
          <p>No memories found for your query.</p>
          <p>Try a different search term or adjust your search options.</p>
          <button 
            className="retry-button"
            onClick={() => onRetry(result.originalQuery)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-retrieval-results">
      <div className="results-header">
        <h2>Memory Results</h2>
        <div className="query-info">
          <div>
            <strong>Original Query:</strong> {result.originalQuery}
          </div>
          {result.enhancedQuery && result.enhancedQuery !== result.originalQuery && (
            <div className="enhanced-query">
              <strong>Enhanced Query:</strong> {result.enhancedQuery}
              <span 
                className="enhancement-info"
                title="The query was enhanced using the agent's learning system to improve results"
              >
                ℹ️
              </span>
            </div>
          )}
          <div>
            <strong>Found:</strong> {result.memories.length} memories
          </div>
        </div>
      </div>

      <div className="memories-list">
        {result.memories.map((memory) => (
          <div 
            key={memory.id}
            className={`memory-item ${expandedMemories.has(memory.id) ? 'expanded' : ''}`}
          >
            <div className="memory-header">
              <div className="memory-meta">
                <div className="memory-date">
                  {formatDate(memory.timestamp)}
                </div>
                <div className="relevance-score">
                  <div className="score-bar">
                    <div 
                      className="score-fill"
                      style={{ width: `${formatRelevanceScore(memory.relevanceScore)}%` }}
                    ></div>
                  </div>
                  <span className="score-text">{formatRelevanceScore(memory.relevanceScore)}%</span>
                </div>
              </div>
              <div className="memory-actions">
                <button
                  className="feedback-button"
                  onClick={() => openFeedbackForm(memory)}
                >
                  Feedback
                </button>
                <button
                  className="expand-button"
                  onClick={() => toggleMemoryExpanded(memory.id)}
                >
                  {expandedMemories.has(memory.id) ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            <div className="memory-content">
              {memory.content}
            </div>

            {expandedMemories.has(memory.id) && (
              <div className="memory-details">
                <div className="memory-metadata">
                  <h4>Memory Metadata</h4>
                  <ul>
                    <li><strong>ID:</strong> {memory.id}</li>
                    <li><strong>Created:</strong> {formatDate(memory.timestamp)}</li>
                    <li><strong>Source:</strong> {memory.source || 'Unknown'}</li>
                    <li><strong>Context:</strong> {memory.context || 'None'}</li>
                  </ul>
                </div>

                {memory.factors && (
                  <div className="factor-scores">
                    <h4>Relevance Factors</h4>
                    <div className="factors-grid">
                      {Object.entries(memory.factors).map(([factor, score]) => (
                        <div key={factor} className="factor">
                          <span className="factor-name">{factor}</span>
                          <div className="factor-score-bar">
                            <div 
                              className="factor-score-fill"
                              style={{ width: `${Math.round((score as number) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="factor-score-value">{Math.round((score as number) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {feedbackMemory && (
        <div className="feedback-modal">
          <div className="feedback-modal-content">
            <MemoryFeedbackForm
              memory={feedbackMemory}
              queryResult={result}
              onSubmitFeedback={onSubmitFeedback}
              onClose={closeFeedbackForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
