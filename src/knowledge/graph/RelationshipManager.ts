import { Agent } from "agents";
import type { Relationship } from "./types";
import { EntityManager } from "./EntityManager";

/**
 * RelationshipManager handles all relationship-related operations in the knowledge graph
 */
export class RelationshipManager<Env> {
  /**
   * Create a new RelationshipManager instance
   * @param agent The agent instance
   * @param entityManager The entity manager instance
   */
  constructor(
    private agent: Agent<Env>,
    private entityManager: EntityManager<Env>
  ) {}

  /**
   * Create a new relationship or update an existing one
   * @param relationship Relationship data
   * @returns ID of the created/updated relationship
   */
  async createOrUpdateRelationship(relationship: {
    sourceEntityId: string;
    targetEntityId: string;
    type: string;
    properties?: Record<string, any>;
    confidence?: number;
    sources?: string[];
  }): Promise<string> {
    const timestamp = Date.now();
    
    // Check if entities exist
    const sourceEntity = await this.entityManager.getEntityById(relationship.sourceEntityId);
    const targetEntity = await this.entityManager.getEntityById(relationship.targetEntityId);
    
    if (!sourceEntity || !targetEntity) {
      throw new Error("Source or target entity does not exist");
    }
    
    // Check if relationship already exists
    const existingRelationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships
      WHERE 
        source_entity_id = ${relationship.sourceEntityId} AND
        target_entity_id = ${relationship.targetEntityId} AND
        type = ${relationship.type}
    `;
    
    if (existingRelationships.length > 0) {
      // Update existing relationship
      const existingRelationship = existingRelationships[0];
      const id = existingRelationship.id as string;
      const existingProperties = JSON.parse(existingRelationship.properties as string);
      const existingSources = JSON.parse(existingRelationship.sources as string);
      
      // Merge properties and sources
      const mergedProperties = { 
        ...existingProperties, 
        ...(relationship.properties || {}) 
      };
      const mergedSources = [...new Set([
        ...existingSources,
        ...(relationship.sources || [])
      ])];
      
      // Calculate new confidence
      const newConfidence = relationship.confidence !== undefined
        ? Math.max(existingRelationship.confidence as number, relationship.confidence)
        : existingRelationship.confidence as number;
      
      await this.agent.sql`
        UPDATE knowledge_relationships
        SET 
          properties = ${JSON.stringify(mergedProperties)},
          confidence = ${newConfidence},
          sources = ${JSON.stringify(mergedSources)},
          updated = ${timestamp}
        WHERE id = ${id}
      `;
      
      return id;
    } else {
      // Create new relationship
      const id = crypto.randomUUID();
      
      await this.agent.sql`
        INSERT INTO knowledge_relationships (
          id, source_entity_id, target_entity_id, type, properties, 
          confidence, sources, created, updated
        ) VALUES (
          ${id},
          ${relationship.sourceEntityId},
          ${relationship.targetEntityId},
          ${relationship.type},
          ${JSON.stringify(relationship.properties || {})},
          ${relationship.confidence || 0.7},
          ${JSON.stringify(relationship.sources || [])},
          ${timestamp},
          ${timestamp}
        )
      `;
      
      return id;
    }
  }

  /**
   * Get a relationship by ID
   * @param id Relationship ID
   * @returns Relationship or null if not found
   */
  async getRelationshipById(id: string): Promise<Relationship | null> {
    const relationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships WHERE id = ${id}
    `;
    
    if (relationships.length === 0) {
      return null;
    }
    
    const relationship = relationships[0];
    
    return {
      id: relationship.id as string,
      sourceEntityId: relationship.source_entity_id as string,
      targetEntityId: relationship.target_entity_id as string,
      type: relationship.type as string,
      properties: JSON.parse(relationship.properties as string),
      confidence: relationship.confidence as number,
      sources: JSON.parse(relationship.sources as string),
      created: relationship.created as number,
      updated: relationship.updated as number
    };
  }

  /**
   * Get relationships by type
   * @param type Relationship type
   * @param limit Maximum number of relationships to return
   * @param offset Offset for pagination
   * @returns Array of relationships
   */
  async getRelationshipsByType(type: string, limit = 100, offset = 0): Promise<Relationship[]> {
    const relationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships 
      WHERE type = ${type}
      ORDER BY confidence DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return relationships.map(relationship => ({
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
  }

  /**
   * Get relationships by source entity ID
   * @param sourceEntityId Source entity ID
   * @returns Array of relationships
   */
  async getRelationshipsBySourceEntity(sourceEntityId: string): Promise<Relationship[]> {
    const relationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships 
      WHERE source_entity_id = ${sourceEntityId}
      ORDER BY confidence DESC
    `;
    
    return relationships.map(relationship => ({
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
  }

  /**
   * Get relationships by target entity ID
   * @param targetEntityId Target entity ID
   * @returns Array of relationships
   */
  async getRelationshipsByTargetEntity(targetEntityId: string): Promise<Relationship[]> {
    const relationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships 
      WHERE target_entity_id = ${targetEntityId}
      ORDER BY confidence DESC
    `;
    
    return relationships.map(relationship => ({
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
  }

  /**
   * Get relationships between two entities
   * @param sourceEntityId Source entity ID
   * @param targetEntityId Target entity ID
   * @returns Array of relationships
   */
  async getRelationshipsBetweenEntities(
    sourceEntityId: string,
    targetEntityId: string
  ): Promise<Relationship[]> {
    const relationships = await this.agent.sql`
      SELECT * FROM knowledge_relationships 
      WHERE 
        source_entity_id = ${sourceEntityId} AND
        target_entity_id = ${targetEntityId}
      ORDER BY confidence DESC
    `;
    
    return relationships.map(relationship => ({
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
  }

  /**
   * Delete a relationship by ID
   * @param id Relationship ID
   * @returns True if relationship was deleted, false if not found
   */
  async deleteRelationship(id: string): Promise<boolean> {
    const result = await this.agent.sql`
      DELETE FROM knowledge_relationships WHERE id = ${id}
    `;
    
    // Check if any rows were affected
    return (result as any).count > 0 || result.length > 0;
  }

  /**
   * Get the total count of relationships
   * @returns Total number of relationships
   */
  async getRelationshipCount(): Promise<number> {
    const result = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_relationships
    `;
    
    return result[0].count as number;
  }

  /**
   * Get the distribution of relationship types
   * @returns Record of relationship types and their counts
   */
  async getRelationshipTypeDistribution(): Promise<Record<string, number>> {
    const results = await this.agent.sql`
      SELECT type, COUNT(*) as count FROM knowledge_relationships
      GROUP BY type
    `;
    
    const distribution: Record<string, number> = {};
    
    for (const result of results) {
      distribution[result.type as string] = result.count as number;
    }
    
    return distribution;
  }

  /**
   * Get the average confidence of all relationships
   * @returns Average confidence value
   */
  async getAverageRelationshipConfidence(): Promise<number> {
    const result = await this.agent.sql`
      SELECT AVG(confidence) as avg_confidence FROM knowledge_relationships
    `;
    
    return result[0].avg_confidence as number || 0;
  }
}
