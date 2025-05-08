import { Agent } from "agents";
import type { Entity, GraphQueryResult, GraphStats, Relationship } from "./types";
import { EntityManager } from "./EntityManager";
import { RelationshipManager } from "./RelationshipManager";
import { ContradictionManager } from "./ContradictionManager";

/**
 * QueryManager handles graph querying capabilities in the knowledge graph
 */
export class QueryManager<Env> {
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
    
    // Execute the entity query with dynamic conditions
    let entityResults: any[] = [];
    
    // We need to handle arrays differently since we can't directly use them in template literals
    // For each case, we'll build a query dynamically based on the provided filters
    
    if (entityTypes.length > 0 && entityNames.length > 0) {
      // Both entity types and names specified
      // We need to query for each combination separately and combine results
      for (const type of entityTypes) {
        for (const name of entityNames) {
          const results = await this.agent.sql`
            SELECT * FROM knowledge_entities
            WHERE confidence >= ${minConfidence}
            AND type = ${type}
            AND name = ${name}
            ORDER BY confidence DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
          entityResults = [...entityResults, ...results];
        }
      }
    } else if (entityTypes.length > 0) {
      // Only entity types specified
      for (const type of entityTypes) {
        const results = await this.agent.sql`
          SELECT * FROM knowledge_entities
          WHERE confidence >= ${minConfidence}
          AND type = ${type}
          ORDER BY confidence DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        entityResults = [...entityResults, ...results];
      }
    } else if (entityNames.length > 0) {
      // Only entity names specified
      for (const name of entityNames) {
        const results = await this.agent.sql`
          SELECT * FROM knowledge_entities
          WHERE confidence >= ${minConfidence}
          AND name = ${name}
          ORDER BY confidence DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        entityResults = [...entityResults, ...results];
      }
    } else {
      // No specific filters
      entityResults = await this.agent.sql`
        SELECT * FROM knowledge_entities
        WHERE confidence >= ${minConfidence}
        ORDER BY confidence DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    
    // Map entity results to Entity objects
    const entities: Entity[] = entityResults.map((entity: any) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      properties: JSON.parse(entity.properties),
      confidence: entity.confidence,
      sources: JSON.parse(entity.sources),
      created: entity.created,
      updated: entity.updated
    }));
    
    // Get entity IDs for relationship query
    const entityIds = entities.map(entity => entity.id);
    
    // Execute the relationship query with dynamic conditions
    let relationshipResults: any[] = [];
    
    if (entityIds.length === 0) {
      // No entities found, so no relationships to query
      relationshipResults = [];
    } else {
      // We need to query for each entity ID separately and combine results
      // This is a simplified approach - in a production environment, you would use a more efficient method
      
      for (const entityId of entityIds) {
        // Query relationships where this entity is the source
        const sourceResults = relationshipTypes.length > 0
          ? await Promise.all(relationshipTypes.map(type => 
              this.agent.sql`
                SELECT * FROM knowledge_relationships
                WHERE source_entity_id = ${entityId}
                AND confidence >= ${minConfidence}
                AND type = ${type}
                ORDER BY confidence DESC
              `
            )).then(results => results.flat())
          : await this.agent.sql`
              SELECT * FROM knowledge_relationships
              WHERE source_entity_id = ${entityId}
              AND confidence >= ${minConfidence}
              ORDER BY confidence DESC
            `;
        
        // Query relationships where this entity is the target
        const targetResults = relationshipTypes.length > 0
          ? await Promise.all(relationshipTypes.map(type => 
              this.agent.sql`
                SELECT * FROM knowledge_relationships
                WHERE target_entity_id = ${entityId}
                AND confidence >= ${minConfidence}
                AND type = ${type}
                ORDER BY confidence DESC
              `
            )).then(results => results.flat())
          : await this.agent.sql`
              SELECT * FROM knowledge_relationships
              WHERE target_entity_id = ${entityId}
              AND confidence >= ${minConfidence}
              ORDER BY confidence DESC
            `;
        
        // Combine results
        relationshipResults = [...relationshipResults, ...sourceResults, ...targetResults];
      }
      
      // Remove duplicates by ID
      const seenIds = new Set<string>();
      relationshipResults = relationshipResults.filter(rel => {
        if (seenIds.has(rel.id)) {
          return false;
        }
        seenIds.add(rel.id);
        return true;
      });
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
      totalEntities: totalEntitiesResult[0].count as number,
      totalRelationships: totalRelationshipsResult[0].count as number
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
    // This is a simplified implementation that searches entity names and types
    // In a production environment, you would use a more sophisticated search algorithm
    
    // Search entities
    const entityResults = await this.agent.sql`
      SELECT * FROM knowledge_entities
      WHERE name LIKE ${'%' + query + '%'} OR type LIKE ${'%' + query + '%'}
      ORDER BY confidence DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const entities: Entity[] = entityResults.map((entity: any) => ({
      id: entity.id as string,
      name: entity.name as string,
      type: entity.type as string,
      properties: JSON.parse(entity.properties as string),
      confidence: entity.confidence as number,
      sources: JSON.parse(entity.sources as string),
      created: entity.created as number,
      updated: entity.updated as number
    }));
    
    // Get entity IDs for relationship query
    const entityIds = entities.map(entity => entity.id);
    
    // If no entities found, return empty result
    if (entityIds.length === 0) {
      return {
        entities: [],
        relationships: [],
        totalEntities: 0,
        totalRelationships: 0
      };
    }
    
    // Search relationships
    let relationshipResults: any[] = [];
    
    // We need to query for each entity ID separately and combine results
    for (const entityId of entityIds) {
      // Query relationships where this entity is the source
      const sourceResults = await this.agent.sql`
        SELECT * FROM knowledge_relationships
        WHERE source_entity_id = ${entityId}
        ORDER BY confidence DESC
      `;
      
      // Query relationships where this entity is the target
      const targetResults = await this.agent.sql`
        SELECT * FROM knowledge_relationships
        WHERE target_entity_id = ${entityId}
        ORDER BY confidence DESC
      `;
      
      // Also search by type
      const typeResults = await this.agent.sql`
        SELECT * FROM knowledge_relationships
        WHERE type LIKE ${'%' + query + '%'}
        ORDER BY confidence DESC
      `;
      
      // Combine results
      relationshipResults = [...relationshipResults, ...sourceResults, ...targetResults, ...typeResults];
    }
    
    // Remove duplicates by ID
    const seenIds = new Set<string>();
    relationshipResults = relationshipResults.filter(rel => {
      if (seenIds.has(rel.id)) {
        return false;
      }
      seenIds.add(rel.id);
      return true;
    });
    
    const relationships: Relationship[] = relationshipResults.map((relationship: any) => ({
      id: relationship.id as string,
      sourceEntityId: relationship.source_entity_id as string,
      targetEntityId: relationship.target_entity_id as string,
      type: relationship.type as string,
      properties: JSON.parse(relationship.properties as string),
      confidence: relationship.confidence as number,
      sources: JSON.parse(relationship.sources as string),
      created: relationship.created as number,
      updated: relationship.updated as number
    }));
    
    // Get total counts
    const totalEntitiesResult = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_entities
      WHERE name LIKE ${'%' + query + '%'} OR type LIKE ${'%' + query + '%'}
    `;
    
    const totalRelationshipsResult = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_relationships
      WHERE type LIKE ${'%' + query + '%'}
    `;
    
    return {
      entities,
      relationships,
      totalEntities: totalEntitiesResult[0].count as number,
      totalRelationships: totalRelationshipsResult[0].count as number
    };
  }
}
