/**
 * Export all classes and types from the knowledge graph module
 */

// Export main classes
export { EntityManager } from './EntityManager';
export { RelationshipManager } from './RelationshipManager';
export { ContradictionManager } from './ContradictionManager';
export { QueryManager } from './QueryManager';
export { KnowledgeGraph } from './KnowledgeGraphBase';
export { EntityEmbeddingManager } from './EntityEmbeddingManager';

// Export types
export type {
  Entity,
  Relationship,
  Contradiction,
  GraphQueryResult,
  GraphStats
} from './types';
