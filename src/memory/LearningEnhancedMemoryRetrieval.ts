import type { Agent } from "agents";
import type { MemoryManager } from "./MemoryManager";
import type { LearningSystem } from "../knowledge/LearningSystem";
import type { RelevanceRanking } from "./RelevanceRanking";
import type { TemporalContextManager } from "./TemporalContextManager";
import type { RankedMemory } from "./RelevanceRanking";

/**
 * Interface for memory retrieval options
 */
export interface MemoryRetrievalOptions {
  /**
   * Timeframe for context consideration
   * - immediate: Last few minutes
   * - recent: Last few hours
   * - medium: Last few days
   * - longTerm: Last few months
   * - all: All time
   */
  contextTimeframe?: "immediate" | "recent" | "medium" | "longTerm" | "all";
  
  /**
   * Whether to enhance the query using the learning system
   */
  enhanceQuery?: boolean;
  
  /**
   * Minimum relevance score (0-1)
   */
  minRelevanceScore?: number;
  
  /**
   * Maximum number of results
   */
  limit?: number;
  
  /**
   * Tags to filter by
   */
  tags?: string[];
  
  /**
   * Sources to filter by
   */
  sources?: string[];
}

/**
 * Interface for memory retrieval result
 */
export interface MemoryRetrievalResult {
  /**
   * Unique ID for this query
   */
  queryId: string;
  
  /**
   * Original query
   */
  originalQuery: string;
  
  /**
   * Enhanced query (if query enhancement was enabled)
   */
  enhancedQuery?: string;
  
  /**
   * Retrieved memories
   */
  memories: RankedMemory[];
  
  /**
   * Timestamp of the retrieval
   */
  timestamp: number;
  
  /**
   * Additional metadata
   */
  metadata?: {
    /**
     * IDs of memories that have received feedback
     */
    feedbackCollected?: string[];
    
    /**
     * Learning insights applied to this query
     */
    learningInsights?: string[];
    
    /**
     * Temporal context used for this query
     */
    temporalContext?: Record<string, any>;
  };
}

/**
 * LearningEnhancedMemoryRetrieval combines memory retrieval with learning capabilities
 * to provide more relevant and contextual memory access
 */
export class LearningEnhancedMemoryRetrieval {
  private agent: Agent<any>;
  private memoryManager: MemoryManager;
  private learningSystem: LearningSystem;
  private relevanceRanking: RelevanceRanking;
  private temporalContextManager: TemporalContextManager;
  private queryHistory: Map<string, MemoryRetrievalResult>;
  
  constructor(
    agent: Agent<any>,
    memoryManager: MemoryManager,
    learningSystem: LearningSystem,
    relevanceRanking: RelevanceRanking,
    temporalContextManager: TemporalContextManager
  ) {
    this.agent = agent;
    this.memoryManager = memoryManager;
    this.learningSystem = learningSystem;
    this.relevanceRanking = relevanceRanking;
    this.temporalContextManager = temporalContextManager;
    this.queryHistory = new Map();
  }

  /**
   * Initialize the memory retrieval system
   */
  async initialize(): Promise<void> {
    console.log("Initializing learning-enhanced memory retrieval system");
    
    // In a real implementation, this would:
    // 1. Initialize any necessary data structures
    // 2. Load query history from persistent storage
    // 3. Set up event listeners for feedback
  }

  /**
   * Retrieve memories based on a query
   */
  async retrieveMemories(
    query: string,
    options: MemoryRetrievalOptions = {}
  ): Promise<MemoryRetrievalResult> {
    const {
      contextTimeframe = "all",
      enhanceQuery = true,
      minRelevanceScore = 0.3,
      limit = 10,
      tags = [],
      sources = []
    } = options;
    
    // Generate a unique ID for this query
    const queryId = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Get current temporal context
    const temporalContext = await this.temporalContextManager.getCurrentContext();
    
    // Enhance query with learning if enabled
    let enhancedQuery = query;
    let learningInsights: string[] = [];
    
    if (enhanceQuery) {
      const enhancementResult = await this.enhanceQueryWithLearning(query, temporalContext);
      enhancedQuery = enhancementResult.enhancedQuery;
      learningInsights = enhancementResult.insights;
    }
    
    // Retrieve memories from memory manager
    const timeframeMs = this.getTimeframeInMs(contextTimeframe);
    
    // Create memory retrieval options
    const memoryOptions: import("./MemoryManager").MemoryRetrievalOptions = {
      startTime: timeframeMs ? Date.now() - timeframeMs : undefined,
      limit: limit * 2 // Retrieve more memories than needed for better ranking
    };
    
    // Filter by source if specified
    if (sources && sources.length > 0) {
      // For simplicity, just use the first source
      memoryOptions.source = sources[0];
    }
    
    // Filter by context if tags are specified (using the first tag as context)
    if (tags && tags.length > 0) {
      memoryOptions.context = tags[0];
    }
    
    const memories = await this.memoryManager.retrieveMemories(enhancedQuery, memoryOptions);
    
    // Rank memories by relevance
    const rankedMemories = await this.relevanceRanking.rankMemories(
      memories,
      enhancedQuery,
      {
        minRelevanceScore,
        maxResults: limit,
        includeReasons: true,
        recencyBoost: true,
        feedbackBoost: true
      }
    );
    
    // Create result
    const result: MemoryRetrievalResult = {
      queryId,
      originalQuery: query,
      enhancedQuery: enhancedQuery !== query ? enhancedQuery : undefined,
      memories: rankedMemories,
      timestamp,
      metadata: {
        feedbackCollected: [],
        learningInsights,
        temporalContext
      }
    };
    
    // Store in query history
    this.queryHistory.set(queryId, result);
    
    // Learn from this retrieval
    this.learnFromRetrieval(result).catch(err => {
      console.error("Error learning from retrieval:", err);
    });
    
    return result;
  }

  /**
   * Record feedback on a memory retrieval
   */
  async recordRetrievalFeedback(feedback: {
    queryId: string;
    memoryId: string;
    relevanceRating: number;
    accuracyRating: number;
    userComment?: string;
  }): Promise<void> {
    const { queryId, memoryId, relevanceRating, accuracyRating, userComment } = feedback;
    
    // Get the query result
    const queryResult = this.queryHistory.get(queryId);
    if (!queryResult) {
      throw new Error(`Query ${queryId} not found in history`);
    }
    
    // Process feedback through relevance ranking
    await this.relevanceRanking.processFeedback({
      queryId,
      memoryId,
      relevanceRating,
      accuracyRating,
      userComment
    });
    
    // Update query result metadata
    if (!queryResult.metadata) {
      queryResult.metadata = {};
    }
    
    if (!queryResult.metadata.feedbackCollected) {
      queryResult.metadata.feedbackCollected = [];
    }
    
    queryResult.metadata.feedbackCollected.push(memoryId);
    
    // Learn from feedback
    await this.learnFromFeedback(queryResult, feedback);
    
    console.log(`Recorded feedback for memory ${memoryId} in query ${queryId}`);
  }

  /**
   * Get a retrieval result by ID
   */
  async getRetrievalResult(queryId: string): Promise<MemoryRetrievalResult | null> {
    return this.queryHistory.get(queryId) || null;
  }

  /**
   * Enhance a query using the learning system
   */
  private async enhanceQueryWithLearning(
    query: string,
    context: Record<string, any>
  ): Promise<{ enhancedQuery: string; insights: string[] }> {
    try {
      // Apply learning to enhance the query
      // Add context information to the query
      const contextEnhancedQuery = `${query} ${Object.entries(context)
        .map(([key, value]) => `${key}:${value}`)
        .join(' ')}`;
      
      // Apply learning to enhance the query
      const enhancedQuery = await this.learningSystem.applyLearning(contextEnhancedQuery);
      
      // For now, we'll just provide some basic insights
      const insights = [];
      if (enhancedQuery !== query) {
        insights.push("Applied learning to enhance query");
        
        // Check what contexts were added
        if (enhancedQuery.includes("context:preferences")) {
          insights.push("Added preference context to improve relevance");
        }
        if (enhancedQuery.includes("context:personal")) {
          insights.push("Added personal context to improve relevance");
        }
        if (enhancedQuery.includes("context:professional")) {
          insights.push("Added professional context to improve relevance");
        }
      }
      
      return {
        enhancedQuery,
        insights
      };
    } catch (err) {
      console.error("Error enhancing query with learning:", err);
      return {
        enhancedQuery: query,
        insights: []
      };
    }
  }

  /**
   * Learn from a memory retrieval
   */
  private async learnFromRetrieval(result: MemoryRetrievalResult): Promise<void> {
    try {
      // Extract learning data from the retrieval
      const learningData = {
        query: result.originalQuery,
        enhancedQuery: result.enhancedQuery,
        retrievedMemories: result.memories.map(memory => ({
          id: memory.id,
          relevanceScore: memory.relevanceScore,
          content: memory.content
        })),
        temporalContext: result.metadata?.temporalContext || {}
      };
      
      // Learn from the interaction
      await this.learningSystem.learnFromInteraction({
        type: "memory_retrieval",
        data: learningData,
        timestamp: result.timestamp
      });
    } catch (err) {
      console.error("Error learning from retrieval:", err);
    }
  }

  /**
   * Learn from feedback on a memory retrieval
   */
  private async learnFromFeedback(
    result: MemoryRetrievalResult,
    feedback: {
      queryId: string;
      memoryId: string;
      relevanceRating: number;
      accuracyRating: number;
      userComment?: string;
    }
  ): Promise<void> {
    try {
      // Find the memory that received feedback
      const memory = result.memories.find(m => m.id === feedback.memoryId);
      if (!memory) {
        return;
      }
      
      // Extract learning data from the feedback
      const learningData = {
        query: result.originalQuery,
        enhancedQuery: result.enhancedQuery,
        memory: {
          id: memory.id,
          content: memory.content,
          relevanceScore: memory.relevanceScore,
          actualRelevance: feedback.relevanceRating / 5, // Convert to 0-1 scale
          accuracyRating: feedback.accuracyRating / 5, // Convert to 0-1 scale
          userComment: feedback.userComment
        },
        temporalContext: result.metadata?.temporalContext || {}
      };
      
      // Learn from the interaction
      await this.learningSystem.learnFromInteraction({
        type: "memory_feedback",
        data: learningData,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error learning from feedback:", err);
    }
  }

  /**
   * Convert timeframe to milliseconds
   */
  private getTimeframeInMs(timeframe: string): number | undefined {
    switch (timeframe) {
      case "immediate":
        return 15 * 60 * 1000; // 15 minutes
      case "recent":
        return 6 * 60 * 60 * 1000; // 6 hours
      case "medium":
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case "longTerm":
        return 90 * 24 * 60 * 60 * 1000; // 90 days
      case "all":
        return undefined; // No time limit
      default:
        return undefined;
    }
  }
}
