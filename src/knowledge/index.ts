/**
 * Export all classes and types from the knowledge module
 */

// Export main classes
export { KnowledgeBase } from './KnowledgeBase';
export { KnowledgeGraph } from './KnowledgeGraph';

// Export types
export type { KnowledgeEntry, KnowledgeQueryResult } from './KnowledgeBase';
export type {
  Entity,
  Relationship,
  Contradiction,
  GraphQueryResult,
  GraphStats
} from './graph/types';

// Export graph submodule
export * as graph from './graph';
