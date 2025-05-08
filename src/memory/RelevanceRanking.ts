import type { Memory } from "./MemoryManager";

/**
 * Interface for a ranked memory
 */
export interface RankedMemory extends Memory {
  /**
   * Relevance score (0-1)
   */
  relevanceScore: number;
  
  /**
   * Reasons for the relevance score
   */
  relevanceReasons?: string[];
  
  /**
   * Detailed factors contributing to the relevance score
   */
  factors?: Record<string, number>;
}

/**
 * Options for ranking memories
 */
export interface RankingOptions {
  /**
   * Minimum relevance score (0-1)
   */
  minRelevanceScore?: number;
  
  /**
   * Maximum number of results
   */
  maxResults?: number;
  
  /**
   * Whether to include reasons for relevance scores
   */
  includeReasons?: boolean;
  
  /**
   * Whether to boost recent memories
   */
  recencyBoost?: boolean;
  
  /**
   * Whether to boost memories based on feedback
   */
  feedbackBoost?: boolean;
}

/**
 * Feedback for a memory retrieval
 */
export interface MemoryFeedback {
  /**
   * Query ID
   */
  queryId: string;
  
  /**
   * Memory ID
   */
  memoryId: string;
  
  /**
   * Relevance rating (1-5)
   */
  relevanceRating: number;
  
  /**
   * Accuracy rating (1-5)
   */
  accuracyRating: number;
  
  /**
   * User comment
   */
  userComment?: string;
}

/**
 * RelevanceRanking for the ImpossibleAgent
 * Responsible for ranking memories by relevance to a query
 */
export class RelevanceRanking {
  private embeddingManager: any;
  private feedbackHistory: Map<string, MemoryFeedback[]>;
  private memoryScoreCache: Map<string, Map<string, number>>;
  
  constructor(options: any) {
    this.embeddingManager = options.embeddingManager;
    this.feedbackHistory = new Map();
    this.memoryScoreCache = new Map();
    
    // Initialize with some sample feedback for testing
    this.initializeSampleFeedback();
  }

  /**
   * Rank memories by relevance to a query
   */
  async rankMemories(
    memories: Memory[],
    query: string,
    options: RankingOptions = {}
  ): Promise<RankedMemory[]> {
    const {
      minRelevanceScore = 0.3,
      maxResults = 10,
      includeReasons = false,
      recencyBoost = true,
      feedbackBoost = true
    } = options;
    
    // In a real implementation, we would:
    // 1. Generate embeddings for the query
    // 2. Calculate similarity scores between query and memories
    // 3. Apply boosts and adjustments
    // 4. Sort and filter the results
    
    // For now, we'll just do a simple text-based ranking
    const rankedMemories: RankedMemory[] = [];
    
    for (const memory of memories) {
      // Calculate base relevance score
      let relevanceScore = this.calculateBaseRelevanceScore(memory, query);
      const relevanceReasons: string[] = [];
      
      // Apply recency boost if enabled
      if (recencyBoost) {
        const recencyBoostValue = this.calculateRecencyBoost(memory);
        relevanceScore = Math.min(1, relevanceScore * (1 + recencyBoostValue));
        
        if (recencyBoostValue > 0.1 && includeReasons) {
          relevanceReasons.push("Boosted due to recency");
        }
      }
      
      // Apply feedback boost if enabled
      if (feedbackBoost) {
        const feedbackBoostValue = this.calculateFeedbackBoost(memory.id);
        relevanceScore = Math.min(1, relevanceScore * (1 + feedbackBoostValue));
        
        if (feedbackBoostValue > 0.1 && includeReasons) {
          relevanceReasons.push("Boosted based on previous feedback");
        }
      }
      
      // Add to results if above minimum score
      if (relevanceScore >= minRelevanceScore) {
        // Calculate detailed factors for the UI
        const baseScore = this.calculateBaseRelevanceScore(memory, query);
        const recencyBoostValue = recencyBoost ? this.calculateRecencyBoost(memory) : 0;
        const feedbackBoostValue = feedbackBoost ? this.calculateFeedbackBoost(memory.id) : 0;
        
        // Create factors object for detailed display
        const factors: Record<string, number> = {
          "Content Match": baseScore,
          "Recency": recencyBoostValue,
          "Feedback": feedbackBoostValue
        };
        
        rankedMemories.push({
          ...memory,
          relevanceScore,
          relevanceReasons: includeReasons ? relevanceReasons : undefined,
          factors: includeReasons ? factors : undefined
        });
      }
    }
    
    // Sort by relevance score (highest first)
    rankedMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limit results
    return rankedMemories.slice(0, maxResults);
  }

  /**
   * Process feedback on a memory retrieval
   */
  async processFeedback(feedback: MemoryFeedback): Promise<void> {
    const { queryId, memoryId } = feedback;
    
    // Store feedback
    if (!this.feedbackHistory.has(queryId)) {
      this.feedbackHistory.set(queryId, []);
    }
    
    this.feedbackHistory.get(queryId)!.push(feedback);
    
    // Clear cache for this memory
    this.memoryScoreCache.forEach((scoreMap) => {
      scoreMap.delete(memoryId);
    });
    
    // In a real implementation, we would:
    // 1. Store feedback in persistent storage
    // 2. Update relevance models based on feedback
    // 3. Adjust memory embeddings or weights
    
    console.log(`Processed feedback for memory ${memoryId} in query ${queryId}`);
  }

  /**
   * Calculate base relevance score
   */
  private calculateBaseRelevanceScore(memory: Memory, query: string): number {
    // In a real implementation, this would use embeddings and semantic similarity
    
    // For now, we'll just do a simple text-based score
    const normalizedQuery = query.toLowerCase();
    const normalizedContent = memory.content.toLowerCase();
    
    // Check if the memory contains the query terms
    const queryTerms = normalizedQuery.split(/\s+/);
    let matchCount = 0;
    
    for (const term of queryTerms) {
      if (term.length > 2 && normalizedContent.includes(term)) {
        matchCount++;
      }
    }
    
    // Calculate score based on term matches
    const termMatchScore = queryTerms.length > 0 
      ? matchCount / queryTerms.length 
      : 0;
    
    // Check for exact phrase match
    const exactMatchBoost = normalizedContent.includes(normalizedQuery) ? 0.3 : 0;
    
    // Combine scores
    return Math.min(1, termMatchScore * 0.7 + exactMatchBoost);
  }

  /**
   * Calculate recency boost
   */
  private calculateRecencyBoost(memory: Memory): number {
    const now = Date.now();
    const age = now - memory.timestamp;
    
    // No boost for memories older than 30 days
    if (age > 30 * 24 * 60 * 60 * 1000) {
      return 0;
    }
    
    // Maximum boost of 0.3 for very recent memories
    const maxBoost = 0.3;
    
    // Linear decay over 30 days
    return maxBoost * (1 - age / (30 * 24 * 60 * 60 * 1000));
  }

  /**
   * Calculate feedback boost based on previous feedback
   */
  private calculateFeedbackBoost(memoryId: string): number {
    // Check cache first
    const cacheKey = "feedback_boost";
    if (this.memoryScoreCache.has(cacheKey) && 
        this.memoryScoreCache.get(cacheKey)!.has(memoryId)) {
      return this.memoryScoreCache.get(cacheKey)!.get(memoryId)!;
    }
    
    // Find all feedback for this memory
    let totalRelevance = 0;
    let feedbackCount = 0;
    
    for (const feedbackList of this.feedbackHistory.values()) {
      for (const feedback of feedbackList) {
        if (feedback.memoryId === memoryId) {
          // Convert 1-5 rating to 0-1 scale
          totalRelevance += (feedback.relevanceRating - 1) / 4;
          feedbackCount++;
        }
      }
    }
    
    // Calculate average boost
    let boost = 0;
    if (feedbackCount > 0) {
      const avgRelevance = totalRelevance / feedbackCount;
      
      // Boost based on average relevance
      // Maximum boost of 0.5 for consistently high relevance
      boost = avgRelevance * 0.5;
    }
    
    // Cache the result
    if (!this.memoryScoreCache.has(cacheKey)) {
      this.memoryScoreCache.set(cacheKey, new Map());
    }
    this.memoryScoreCache.get(cacheKey)!.set(memoryId, boost);
    
    return boost;
  }

  /**
   * Initialize sample feedback for testing
   */
  private initializeSampleFeedback() {
    const sampleFeedback: MemoryFeedback[] = [
      {
        queryId: "sample-query-1",
        memoryId: "sample-memory-1",
        relevanceRating: 5,
        accuracyRating: 5
      },
      {
        queryId: "sample-query-2",
        memoryId: "sample-memory-1",
        relevanceRating: 4,
        accuracyRating: 5
      },
      {
        queryId: "sample-query-3",
        memoryId: "sample-memory-2",
        relevanceRating: 2,
        accuracyRating: 3
      }
    ];
    
    for (const feedback of sampleFeedback) {
      if (!this.feedbackHistory.has(feedback.queryId)) {
        this.feedbackHistory.set(feedback.queryId, []);
      }
      
      this.feedbackHistory.get(feedback.queryId)!.push(feedback);
    }
  }
}
