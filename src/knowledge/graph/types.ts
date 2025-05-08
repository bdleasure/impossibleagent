/**
 * Entity represents a node in the knowledge graph
 */
export interface Entity {
  /** Unique identifier for the entity */
  id: string;
  
  /** Name of the entity */
  name: string;
  
  /** Type of the entity (e.g., person, place, concept) */
  type: string;
  
  /** Properties of the entity as key-value pairs */
  properties: Record<string, any>;
  
  /** Confidence score for the entity (0-1) */
  confidence: number;
  
  /** Sources of information for this entity */
  sources: string[];
  
  /** Timestamp when the entity was created */
  created: number;
  
  /** Timestamp when the entity was last updated */
  updated: number;
}

/**
 * Relationship represents an edge between entities in the knowledge graph
 */
export interface Relationship {
  /** Unique identifier for the relationship */
  id: string;
  
  /** ID of the source entity */
  sourceEntityId: string;
  
  /** ID of the target entity */
  targetEntityId: string;
  
  /** Type of the relationship (e.g., knows, contains, is_part_of) */
  type: string;
  
  /** Properties of the relationship as key-value pairs */
  properties: Record<string, any>;
  
  /** Confidence score for the relationship (0-1) */
  confidence: number;
  
  /** Sources of information for this relationship */
  sources: string[];
  
  /** Timestamp when the relationship was created */
  created: number;
  
  /** Timestamp when the relationship was last updated */
  updated: number;
}

/**
 * Contradiction represents a detected inconsistency in the knowledge graph
 */
export interface Contradiction {
  /** Unique identifier for the contradiction */
  id: string;
  
  /** ID of the entity with the contradiction */
  entityId: string;
  
  /** Name of the property with conflicting values */
  propertyName: string;
  
  /** Array of conflicting values */
  conflictingValues: any[];
  
  /** IDs of related entities involved in the contradiction */
  relatedEntityIds: string[];
  
  /** IDs of related relationships involved in the contradiction */
  relatedRelationshipIds: string[];
  
  /** Sources of information for this contradiction */
  sources: string[];
  
  /** Confidence score for the contradiction (0-1) */
  confidence: number;
  
  /** Status of the contradiction */
  status: "unresolved" | "resolved" | "ignored";
  
  /** Resolution description if the contradiction has been resolved */
  resolution?: string;
  
  /** Timestamp when the contradiction was created */
  created: number;
  
  /** Timestamp when the contradiction was last updated */
  updated: number;
}

/**
 * GraphQueryResult represents the result of a graph query
 */
export interface GraphQueryResult {
  /** Entities matching the query */
  entities: Entity[];
  
  /** Relationships matching the query */
  relationships: Relationship[];
  
  /** Total number of entities matching the query */
  totalEntities: number;
  
  /** Total number of relationships matching the query */
  totalRelationships: number;
}

/**
 * GraphStats represents statistics about the knowledge graph
 */
export interface GraphStats {
  /** Total number of entities in the graph */
  entityCount: number;
  
  /** Total number of relationships in the graph */
  relationshipCount: number;
  
  /** Total number of contradictions in the graph */
  contradictionCount: number;
  
  /** Number of unresolved contradictions in the graph */
  unresolvedContradictions: number;
  
  /** Distribution of entity types */
  entityTypeDistribution: Record<string, number>;
  
  /** Distribution of relationship types */
  relationshipTypeDistribution: Record<string, number>;
  
  /** Average confidence score for entities */
  averageEntityConfidence: number;
  
  /** Average confidence score for relationships */
  averageRelationshipConfidence: number;
}
