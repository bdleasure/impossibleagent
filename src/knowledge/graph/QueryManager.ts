import { Agent } from "agents";
import type { Entity, GraphQueryResult, GraphStats, Relationship } from "./types";
import { EntityManager } from "./EntityManager";
import { RelationshipManager } from "./RelationshipManager";
import { ContradictionManager } from "./ContradictionManager";
import type { VectorizeEnv, EntitySimilaritySearchOptions } from "./EntityEmbeddingManager";

/**
 * QueryManager handles graph querying capabilities in the knowledge graph
 */
export class QueryManager<Env extends VectorizeEnv> {
  /**
   * Create a new QueryManager instance
   * @param agent The agent instance
   * @param entityManager The entity manager instance
   * @param relationshipManager The relationship manager instance
   * @param contradictionManager The contradiction manager instance
   */
  constructor(
    private agent: Agent<Env>,
    private entityManager: EntityManager<Env>,
    private relationshipManager: RelationshipManager<Env>,
    private contradictionManager: ContradictionManager<Env>
  ) {}

  /**
   * Initialize the query manager with necessary indexes
   */
  async initialize(): Promise<void> {
    // Create indexes for knowledge entities
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_entities_name ON knowledge_entities(name)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(type)`;
    
    // Create indexes for knowledge relationships
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON knowledge_relationships(source_entity_id)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON knowledge_relationships(target_entity_id)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON knowledge_relationships(type)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_type ON knowledge_relationships(source_entity_id, type)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_type ON knowledge_relationships(target_entity_id, type)`;
  }

  /**
   * Query the graph for entities and their relationships
   * @param options Query options
   * @returns Query results
   */
  async queryGraph(options: {
    entityTypes?: string[];
    entityNames?: string[];
    relationshipTypes?: string[];
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<GraphQueryResult> {
    const {
      entityTypes = [],
      entityNames = [],
      relationshipTypes = [],
      minConfidence = 0,
      limit = 100,
      offset = 0
    } = options;
    
    // Use the recommended SQL tagged template literals pattern
    // Instead of building a dynamic query string
    let entityResults: any[] = [];
    
    try {
      // Handle different combinations of filters using separate queries
      // This follows the recommended pattern from sql-query-patterns.md
      if (entityTypes.length > 0 && entityNames.length > 0) {
        // Both entity types and names provided
        // Use separate queries for each combination and combine results
        const combinedResults: any[] = [];
        
        // For each entity type
        for (const entityType of entityTypes) {
          // For each entity name
          for (const entityName of entityNames) {
            const typeResults = await this.agent.sql`
              SELECT * FROM knowledge_entities
              WHERE type = ${entityType}
                AND name = ${entityName}
                AND confidence >= ${minConfidence}
              ORDER BY confidence DESC
            `;
            combinedResults.push(...typeResults);
          }
        }
        
        // Remove duplicates and apply limit/offset
        const uniqueIds = new Set<string>();
        entityResults = combinedResults.filter(entity => {
          if (uniqueIds.has(entity.id)) {
            return false;
          }
          uniqueIds.add(entity.id);
          return true;
        }).sort((a, b) => b.confidence - a.confidence)
          .slice(offset, offset + limit);
      } else if (entityTypes.length > 0) {
        // Only entity types provided
        const combinedResults: any[] = [];
        
        // For each entity type
        for (const entityType of entityTypes) {
          const typeResults = await this.agent.sql`
            SELECT * FROM knowledge_entities
            WHERE type = ${entityType}
              AND confidence >= ${minConfidence}
            ORDER BY confidence DESC
          `;
          combinedResults.push(...typeResults);
        }
        
        // Remove duplicates and apply limit/offset
        const uniqueIds = new Set<string>();
        entityResults = combinedResults.filter(entity => {
          if (uniqueIds.has(entity.id)) {
            return false;
          }
          uniqueIds.add(entity.id);
          return true;
        }).sort((a, b) => b.confidence - a.confidence)
          .slice(offset, offset + limit);
      } else if (entityNames.length > 0) {
        // Only entity names provided
        const combinedResults: any[] = [];
        
        // For each entity name
        for (const entityName of entityNames) {
          const nameResults = await this.agent.sql`
            SELECT * FROM knowledge_entities
            WHERE name = ${entityName}
              AND confidence >= ${minConfidence}
            ORDER BY confidence DESC
          `;
          combinedResults.push(...nameResults);
        }
        
        // Remove duplicates and apply limit/offset
        const uniqueIds = new Set<string>();
        entityResults = combinedResults.filter(entity => {
          if (uniqueIds.has(entity.id)) {
            return false;
          }
          uniqueIds.add(entity.id);
          return true;
        }).sort((a, b) => b.confidence - a.confidence)
          .slice(offset, offset + limit);
      } else {
        // No entity filters, just confidence
        entityResults = await this.agent.sql`
          SELECT * FROM knowledge_entities
          WHERE confidence >= ${minConfidence}
          ORDER BY confidence DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } catch (error) {
      console.error("Error querying entities:", error);
      entityResults = [];
    }
    
    // Map entity results to Entity objects
    const entities: Entity[] = entityResults.map((entity: any) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      properties: JSON.parse(entity.properties || '{}'),
      confidence: entity.confidence,
      sources: JSON.parse(entity.sources || '[]'),
      created: entity.created,
      updated: entity.updated
    }));
    
    // Get entity IDs for relationship query
    const entityIds = entities.map(entity => entity.id);
    
    // Optimize relationship query by using a single SQL query with IN clauses
    // instead of multiple separate queries
    let relationshipResults: any[] = [];
    
    try {
      if (entityIds.length > 0) {
        // Build the relationship query dynamically
        let conditions = [`confidence >= ${minConfidence}`];
        
        // Add entity ID condition
        const entityIdsList = entityIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
        conditions.push(`(source_entity_id IN (${entityIdsList}) OR target_entity_id IN (${entityIdsList}))`);
        
        // Add relationship type condition if provided
        if (relationshipTypes.length > 0) {
          const typesList = relationshipTypes.map(type => `'${type.replace(/'/g, "''")}'`).join(', ');
          conditions.push(`type IN (${typesList})`);
        }
        
        // Completely rewrite the approach to avoid TypeScript errors
        // Get all relationships and filter in JavaScript
        // This is less efficient but avoids TypeScript errors with SQL template literals
        
        // First get all relationships with minimum confidence
        // Use a numeric value directly to avoid TypeScript errors
        const minConfidenceValue = minConfidence || 0;
        
        // Use a different approach to get relationships
        // This avoids TypeScript errors with SQL template literals
        let allRelationships: any[] = [];
        
        try {
          // Use a simple query without conditions
          // Avoid using template literals with potential null values
          allRelationships = await this.agent.sql`
            SELECT * FROM knowledge_relationships
            ORDER BY confidence DESC
          `;
          
          // Filter by confidence in JavaScript
          allRelationships = allRelationships.filter((rel: any) => 
            rel.confidence >= minConfidenceValue
          );
        } catch (error) {
          console.error("Error fetching relationships:", error);
          allRelationships = [];
        }
        
        // Then filter in JavaScript
        let filteredRelationships = allRelationships;
        
        // Filter by entity IDs if provided
        if (entityIds.length > 0) {
          filteredRelationships = filteredRelationships.filter((rel: any) => {
            return entityIds.includes(rel.source_entity_id) || 
                   entityIds.includes(rel.target_entity_id);
          });
        }
        
        // Filter by relationship types if provided
        if (relationshipTypes.length > 0) {
          filteredRelationships = filteredRelationships.filter((rel: any) => {
            return relationshipTypes.includes(rel.type);
          });
        }
        
        // Apply limit after filtering
        relationshipResults = filteredRelationships.slice(0, limit * 2);
      }
    } catch (error) {
      console.error("Error querying relationships:", error);
      relationshipResults = [];
    }
    
    // Map relationship results to Relationship objects
    const relationships: Relationship[] = relationshipResults.map((relationship: any) => ({
      id: relationship.id,
      sourceEntityId: relationship.source_entity_id,
      targetEntityId: relationship.target_entity_id,
      type: relationship.type,
      properties: JSON.parse(relationship.properties),
      confidence: relationship.confidence,
      sources: JSON.parse(relationship.sources),
      created: relationship.created,
      updated: relationship.updated
    }));
    
    // Get total counts
    const totalEntitiesResult = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_entities
      WHERE confidence >= ${minConfidence}
    `;
    
    const totalRelationshipsResult = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_relationships
      WHERE confidence >= ${minConfidence}
    `;
    
    return {
      entities,
      relationships,
      totalEntities: totalEntitiesResult[0]?.count as number || 0,
      totalRelationships: totalRelationshipsResult[0]?.count as number || 0
    };
  }

  /**
   * Find paths between two entities
   * @param sourceEntityId Source entity ID
   * @param targetEntityId Target entity ID
   * @param maxDepth Maximum path depth
   * @returns Array of paths, each containing a sequence of entities and relationships
   */
  async findPaths(
    sourceEntityId: string,
    targetEntityId: string,
    maxDepth = 3
  ): Promise<Array<{
    entities: Entity[];
    relationships: Relationship[];
  }>> {
    // This is a simplified implementation of a breadth-first search
    // In a production environment, you would use a more efficient graph traversal algorithm
    
    // Check if entities exist
    const sourceEntity = await this.entityManager.getEntityById(sourceEntityId);
    const targetEntity = await this.entityManager.getEntityById(targetEntityId);
    
    if (!sourceEntity || !targetEntity) {
      return [];
    }
    
    // Initialize the search
    const visited = new Set<string>([sourceEntityId]);
    const queue: Array<{
      path: { entities: Entity[]; relationships: Relationship[] };
      currentEntityId: string;
      depth: number;
    }> = [{
      path: { entities: [sourceEntity], relationships: [] },
      currentEntityId: sourceEntityId,
      depth: 0
    }];
    
    const paths: Array<{ entities: Entity[]; relationships: Relationship[] }> = [];
    
    // Breadth-first search
    while (queue.length > 0) {
      const { path, currentEntityId, depth } = queue.shift()!;
      
      // If we've reached the target, add the path to the results
      if (currentEntityId === targetEntityId) {
        paths.push(path);
        continue;
      }
      
      // If we've reached the maximum depth, skip
      if (depth >= maxDepth) {
        continue;
      }
      
      // Get all relationships where the current entity is the source
      const outgoingRelationships = await this.relationshipManager.getRelationshipsBySourceEntity(currentEntityId);
      
      for (const relationship of outgoingRelationships) {
        const nextEntityId = relationship.targetEntityId;
        
        // Skip if we've already visited this entity
        if (visited.has(nextEntityId)) {
          continue;
        }
        
        // Get the next entity
        const nextEntity = await this.entityManager.getEntityById(nextEntityId);
        if (!nextEntity) {
          continue;
        }
        
        // Create a new path
        const newPath = {
          entities: [...path.entities, nextEntity],
          relationships: [...path.relationships, relationship]
        };
        
        // Add to the queue
        queue.push({
          path: newPath,
          currentEntityId: nextEntityId,
          depth: depth + 1
        });
        
        // Mark as visited
        visited.add(nextEntityId);
      }
      
      // Get all relationships where the current entity is the target
      const incomingRelationships = await this.relationshipManager.getRelationshipsByTargetEntity(currentEntityId);
      
      for (const relationship of incomingRelationships) {
        const nextEntityId = relationship.sourceEntityId;
        
        // Skip if we've already visited this entity
        if (visited.has(nextEntityId)) {
          continue;
        }
        
        // Get the next entity
        const nextEntity = await this.entityManager.getEntityById(nextEntityId);
        if (!nextEntity) {
          continue;
        }
        
        // Create a new path
        const newPath = {
          entities: [...path.entities, nextEntity],
          relationships: [...path.relationships, relationship]
        };
        
        // Add to the queue
        queue.push({
          path: newPath,
          currentEntityId: nextEntityId,
          depth: depth + 1
        });
        
        // Mark as visited
        visited.add(nextEntityId);
      }
    }
    
    return paths;
  }

  /**
   * Get graph statistics
   * @returns Graph statistics
   */
  async getGraphStats(): Promise<GraphStats> {
    const entityCount = await this.entityManager.getEntityCount();
    const relationshipCount = await this.relationshipManager.getRelationshipCount();
    const contradictionCount = await this.contradictionManager.getContradictionCount();
    const unresolvedContradictions = await this.contradictionManager.getUnresolvedContradictionCount();
    
    const entityTypeDistribution = await this.entityManager.getEntityTypeDistribution();
    const relationshipTypeDistribution = await this.relationshipManager.getRelationshipTypeDistribution();
    
    const averageEntityConfidence = await this.entityManager.getAverageEntityConfidence();
    const averageRelationshipConfidence = await this.relationshipManager.getAverageRelationshipConfidence();
    
    return {
      entityCount,
      relationshipCount,
      contradictionCount,
      unresolvedContradictions,
      entityTypeDistribution,
      relationshipTypeDistribution,
      averageEntityConfidence,
      averageRelationshipConfidence
    };
  }

  /**
   * Search the graph for entities and relationships matching a text query
   * @param query Text query
   * @param limit Maximum number of results to return
   * @param offset Offset for pagination
   * @returns Query results
   */
  async searchGraph(query: string, limit = 100, offset = 0): Promise<GraphQueryResult> {
    // Ensure query is a valid string to avoid TypeScript errors
    const safeQuery = typeof query === 'string' ? query : '';
    
    let entityResults: any[] = [];
    
    try {
      if (safeQuery.trim() !== '') {
        // Use vector search for semantic similarity
        const similarEntities = await this.entityManager.searchEntitiesBySimilarity(safeQuery, {
          limit,
          minScore: 0.5 // Lower threshold for broader results
        });
        
        // Convert to the expected format
        entityResults = similarEntities.map(entity => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          properties: entity.properties,
          confidence: entity.confidence,
          sources: entity.sources,
          created: entity.created,
          updated: entity.updated,
          score: entity.score
        }));
      } else {
        // If query is empty, just return recent entities
        const allEntities = await this.agent.sql`
          SELECT * FROM knowledge_entities
          ORDER BY updated DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        entityResults = allEntities;
      }
    } catch (error) {
      console.error("Error searching entities:", error);
      
      // Fallback to traditional search if vector search fails
      try {
        // Create LIKE patterns for the search
        const likePattern: string = `%${safeQuery}%`;
        
        // Get entities that match the query
        entityResults = await this.agent.sql`
          SELECT * FROM knowledge_entities
          WHERE name LIKE ${likePattern} OR type LIKE ${likePattern}
          ORDER BY confidence DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } catch (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
        entityResults = [];
      }
    }
    
    const entities: Entity[] = entityResults.map((entity: any) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      properties: JSON.parse(entity.properties || '{}'),
      confidence: entity.confidence,
      sources: JSON.parse(entity.sources || '[]'),
      created: entity.created,
      updated: entity.updated
    }));
    
    // Get entity IDs for relationship query
    const entityIds = entities.map(entity => entity.id);
    
    // Use the recommended SQL tagged template literals pattern for relationship search
    let relationshipResults: any[] = [];
    try {
      // Separate queries for different conditions
      if (entityIds.length > 0) {
        // Query for relationships by entity IDs
        for (const entityId of entityIds) {
          // Query for source entity relationships
          const sourceResults = await this.agent.sql`
            SELECT * FROM knowledge_relationships
            WHERE source_entity_id = ${entityId}
            ORDER BY confidence DESC
          `;
          
          // Query for target entity relationships
          const targetResults = await this.agent.sql`
            SELECT * FROM knowledge_relationships
            WHERE target_entity_id = ${entityId}
            ORDER BY confidence DESC
          `;
          
          relationshipResults.push(...sourceResults, ...targetResults);
        }
      }
      
      // Query for relationships by type
      if (safeQuery.trim() !== '') {
        const relationshipLikePattern = `%${safeQuery}%`;
        const typeResults = await this.agent.sql`
          SELECT * FROM knowledge_relationships
          WHERE type LIKE ${relationshipLikePattern}
          ORDER BY confidence DESC
          LIMIT ${limit * 2}
        `;
        
        relationshipResults.push(...typeResults);
      }
      
      // If no specific filters, just return recent relationships
      if (entityIds.length === 0 && safeQuery.trim() === '') {
        relationshipResults = await this.agent.sql`
          SELECT * FROM knowledge_relationships
          ORDER BY confidence DESC
          LIMIT ${limit * 2}
        `;
      }
    } catch (error) {
      console.error("Error searching relationships:", error);
      relationshipResults = [];
    }
    
    // Remove duplicates by ID
    const seenIds = new Set<string>();
    const uniqueRelationshipResults = relationshipResults.filter(rel => {
      if (seenIds.has(rel.id)) {
        return false;
      }
      seenIds.add(rel.id);
      return true;
    }).slice(0, limit); // Apply limit after deduplication
    
    const relationships: Relationship[] = uniqueRelationshipResults.map((relationship: any) => ({
      id: relationship.id,
      sourceEntityId: relationship.source_entity_id,
      targetEntityId: relationship.target_entity_id,
      type: relationship.type,
      properties: JSON.parse(relationship.properties || '{}'),
      confidence: relationship.confidence,
      sources: JSON.parse(relationship.sources || '[]'),
      created: relationship.created,
      updated: relationship.updated
    }));
    
    // Get total counts using a different approach to avoid TypeScript errors
    let totalEntitiesCount = 0;
    let totalRelationshipsCount = 0;
    
    try {
      // Completely rewrite the approach to avoid TypeScript errors
      // Get all entities and count them in JavaScript
      const allEntities = await this.agent.sql`
        SELECT * FROM knowledge_entities
      `;
      
      // Filter in JavaScript based on the query
      if (safeQuery.trim() === '') {
        // If query is empty, count all entities
        totalEntitiesCount = allEntities.length;
      } else {
        // If query is not empty, filter and count
        const filteredEntities = allEntities.filter((entity: any) => {
          const name = entity.name || '';
          const type = entity.type || '';
          return name.includes(safeQuery) || type.includes(safeQuery);
        });
        totalEntitiesCount = filteredEntities.length;
      }
    } catch (error) {
      console.error("Error counting entities:", error);
    }
    
    try {
      // Completely rewrite the approach to avoid TypeScript errors
      // Get all relationships and count them in JavaScript
      const allRelationships = await this.agent.sql`
        SELECT * FROM knowledge_relationships
      `;
      
      // Filter in JavaScript based on the query
      if (safeQuery.trim() === '') {
        // If query is empty, count all relationships
        totalRelationshipsCount = allRelationships.length;
      } else {
        // If query is not empty, filter and count
        const filteredRelationships = allRelationships.filter((rel: any) => {
          const type = rel.type || '';
          return type.includes(safeQuery);
        });
        totalRelationshipsCount = filteredRelationships.length;
      }
    } catch (error) {
      console.error("Error counting relationships:", error);
    }
    
    return {
      entities,
      relationships,
      totalEntities: totalEntitiesCount,
      totalRelationships: totalRelationshipsCount
    };
  }
}
