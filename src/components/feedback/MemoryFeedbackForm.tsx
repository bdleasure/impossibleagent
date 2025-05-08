import React, { useState } from "react";
import type { RankedMemory } from "../../memory/RelevanceRanking";
import type { MemoryRetrievalResult } from "../../memory/LearningEnhancedMemoryRetrieval";

interface MemoryFeedbackFormProps {
  memory: RankedMemory;
  queryResult: MemoryRetrievalResult;
  onSubmitFeedback: (feedback: {
    queryId: string;
    memoryId: string;
    relevanceRating: number;
    accuracyRating: number;
    userComment?: string;
  }) => Promise<void>;
  onClose: () => void;
}

/**
 * Component for collecting user feedback on memory retrieval results
 */
export function MemoryFeedbackForm({
  memory,
  queryResult,
  onSubmitFeedback,
  onClose
}: MemoryFeedbackFormProps) {
  const [relevanceRating, setRelevanceRating] = useState<number>(5);
  const [accuracyRating, setAccuracyRating] = useState<number>(5);
  const [userComment, setUserComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSubmitFeedback({
        queryId: queryResult.queryId,
        memoryId: memory.id,
        relevanceRating,
        accuracyRating,
        userComment: userComment.trim() || undefined
      });
      
      setSubmitted(true);
      
      // Auto-close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingOptions = (
    value: number,
    onChange: (value: number) => void,
    name: string
  ) => {
    return (
      <div className="rating-options">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <label key={rating} className={`rating-option ${value === rating ? 'selected' : ''}`}>
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              disabled={isSubmitting || submitted}
            />
            <span className="rating-value">{rating}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="memory-feedback-form">
      <div className="feedback-header">
        <h3>Provide Feedback</h3>
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      <div className="memory-preview">
        <p>{memory.content}</p>
      </div>
      
      {submitted ? (
        <div className="feedback-success">
          <p>Thank you for your feedback!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="feedback-section">
            <label>
              <span className="feedback-label">How relevant was this memory to your query?</span>
              <div className="rating-container">
                <span className="rating-label">Not Relevant</span>
                {renderRatingOptions(relevanceRating, setRelevanceRating, "relevance")}
                <span className="rating-label">Very Relevant</span>
              </div>
            </label>
          </div>
          
          <div className="feedback-section">
            <label>
              <span className="feedback-label">How accurate was this memory?</span>
              <div className="rating-container">
                <span className="rating-label">Not Accurate</span>
                {renderRatingOptions(accuracyRating, setAccuracyRating, "accuracy")}
                <span className="rating-label">Very Accurate</span>
              </div>
            </label>
          </div>
          
          <div className="feedback-section">
            <label>
              <span className="feedback-label">Additional Comments (Optional)</span>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Any additional feedback about this memory..."
                rows={3}
                disabled={isSubmitting || submitted}
              />
            </label>
          </div>
          
          {error && (
            <div className="feedback-error">
              <p>{error}</p>
            </div>
          )}
          
          <div className="feedback-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting || submitted}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || submitted}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
