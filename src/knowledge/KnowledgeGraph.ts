import { KnowledgeGraph as KnowledgeGraphBase } from './graph/KnowledgeGraphBase';

/**
 * Re-export the KnowledgeGraph class from KnowledgeGraphBase
 */
export { KnowledgeGraphBase as KnowledgeGraph };

/**
 * Re-export types from the graph module
 */
export type {
  Entity,
  Relationship,
  Contradiction,
  GraphQueryResult,
  GraphStats
} from './graph/types';
