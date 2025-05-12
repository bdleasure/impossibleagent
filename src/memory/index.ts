/**
 * Memory System for the ImpossibleAgent
 * 
 * This module provides a comprehensive memory system for the agent, including:
 * - Basic memory storage and retrieval (MemoryManager)
 * - Batch operations for improved performance (BatchMemoryManager)
 * - Caching for frequently accessed memories (MemoryCache)
 * - Pagination for large result sets (PaginatedMemoryRetrieval)
 * - Semantic search using embeddings (EmbeddingManager)
 * - Temporal context management (TemporalContextManager)
 * - Relevance ranking (RelevanceRanking)
 * - Learning-enhanced memory retrieval (LearningEnhancedMemoryRetrieval)
 */

// Import all components for internal use
import { MemoryManager } from './MemoryManager';
import { BatchMemoryManager } from './BatchMemoryManager';
import { MemoryCache } from './MemoryCache';
import { PaginatedMemoryRetrieval } from './PaginatedMemoryRetrieval';
import { EmbeddingManager } from './EmbeddingManager';
import { TemporalContextManager } from './TemporalContextManager';
import { RelevanceRanking } from './RelevanceRanking';
import { LearningEnhancedMemoryRetrieval } from './LearningEnhancedMemoryRetrieval';

// Re-export all components for external use
// Core memory management
export { MemoryManager } from './MemoryManager';
export type { Memory, MemoryStorageOptions, MemoryRetrievalOptions as BaseMemoryRetrievalOptions } from './MemoryManager';

// Batch operations
export { BatchMemoryManager } from './BatchMemoryManager';
export type { BatchMemoryStorageOptions, BatchOperationResult, MemoryItem } from './BatchMemoryManager';

// Memory caching
export { MemoryCache } from './MemoryCache';
export type { MemoryCacheOptions, CacheStats } from './MemoryCache';

// Paginated memory retrieval
export { PaginatedMemoryRetrieval } from './PaginatedMemoryRetrieval';
export type { 
  MemoryRetrievalOptions, 
  PaginationOptions, 
  PaginatedResult 
} from './PaginatedMemoryRetrieval';

// Embedding and semantic search
export { EmbeddingManager } from './EmbeddingManager';
export type { SimilaritySearchOptions } from './EmbeddingManager';

// Temporal context management
export { TemporalContextManager } from './TemporalContextManager';

// Relevance ranking
export { RelevanceRanking } from './RelevanceRanking';
export type { RankedMemory } from './RelevanceRanking';

// Learning-enhanced memory retrieval
export { LearningEnhancedMemoryRetrieval } from './LearningEnhancedMemoryRetrieval';

/**
 * Create a complete memory system with all components
 * @param agent The agent instance to use for storage
 * @param options Configuration options
 * @returns An object containing all memory system components
 */
export function createMemorySystem(agent: any, options: any = {}) {
  // Create the embedding manager if AI is available in the agent's environment
  const embeddingManager = agent.env?.AI ? 
    new EmbeddingManager({ 
      agent,
      modelName: options.modelName,
      dimensions: options.dimensions
    }) : null;
  
  // Create the core memory manager
  const memoryManager = new MemoryManager({
    agent,
    embeddingManager
  });
  
  // Create additional components
  const batchMemoryManager = new BatchMemoryManager(memoryManager);
  const memoryCache = new MemoryCache(options.cacheOptions || {});
  const paginatedMemoryRetrieval = new PaginatedMemoryRetrieval(memoryManager);
  const temporalContextManager = new TemporalContextManager(options.temporalOptions || {});
  const relevanceRanking = new RelevanceRanking({ embeddingManager });
  
  // Import the LearningSystem
  const { LearningSystem } = require('../knowledge/LearningSystem');
  const learningSystem = new LearningSystem({ 
    embeddingManager,
    agent
  });
  
  // Create the learning-enhanced memory retrieval
  const learningEnhancedMemoryRetrieval = new LearningEnhancedMemoryRetrieval(
    agent,
    memoryManager,
    learningSystem,
    relevanceRanking,
    temporalContextManager
  );
  
  return {
    memoryManager,
    batchMemoryManager,
    memoryCache,
    paginatedMemoryRetrieval,
    embeddingManager,
    temporalContextManager,
    relevanceRanking,
    learningEnhancedMemoryRetrieval
  };
}
