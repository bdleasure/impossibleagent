import { Agent } from "agents";
import type { Entity } from "./types";

/**
 * EntityManager handles all entity-related operations in the knowledge graph
 */
export class EntityManager<Env> {
  /**
   * Create a new EntityManager instance
   * @param agent The agent instance
   */
  constructor(private agent: Agent<Env>) {}

  /**
   * Create a new entity or update an existing one
   * @param entity Entity data
   * @returns ID of the created/updated entity
   */
  async createOrUpdateEntity(entity: {
    name: string;
    type: string;
    properties: Record<string, any>;
    confidence?: number;
    sources?: string[];
  }): Promise<string> {
    const timestamp = Date.now();
    
    // Check if entity already exists
    const existingEntities = await this.agent.sql`
      SELECT * FROM knowledge_entities
      WHERE name = ${entity.name} AND type = ${entity.type}
    `;
    
    if (existingEntities.length > 0) {
      // Update existing entity
      const existingEntity = existingEntities[0];
      const id = existingEntity.id as string;
      const existingProperties = JSON.parse(existingEntity.properties as string);
      const existingSources = JSON.parse(existingEntity.sources as string);
      
      // Merge properties and sources
      const mergedProperties = { ...existingProperties, ...entity.properties };
      const mergedSources = [...new Set([
        ...existingSources,
        ...(entity.sources || [])
      ])];
      
      // Calculate new confidence
      const newConfidence = entity.confidence !== undefined
        ? Math.max(existingEntity.confidence as number, entity.confidence)
        : existingEntity.confidence as number;
      
      await this.agent.sql`
        UPDATE knowledge_entities
        SET 
          properties = ${JSON.stringify(mergedProperties)},
          confidence = ${newConfidence},
          sources = ${JSON.stringify(mergedSources)},
          updated = ${timestamp}
        WHERE id = ${id}
      `;
      
      return id;
    } else {
      // Create new entity
      const id = crypto.randomUUID();
      
      await this.agent.sql`
        INSERT INTO knowledge_entities (
          id, name, type, properties, confidence, sources, created, updated
        ) VALUES (
          ${id},
          ${entity.name},
          ${entity.type},
          ${JSON.stringify(entity.properties)},
          ${entity.confidence || 0.7},
          ${JSON.stringify(entity.sources || [])},
          ${timestamp},
          ${timestamp}
        )
      `;
      
      return id;
    }
  }

  /**
   * Get an entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async getEntityById(id: string): Promise<Entity | null> {
    const entities = await this.agent.sql`
      SELECT * FROM knowledge_entities WHERE id = ${id}
    `;
    
    if (entities.length === 0) {
      return null;
    }
    
    const entity = entities[0];
    
    return {
      id: entity.id as string,
      name: entity.name as string,
      type: entity.type as string,
      properties: JSON.parse(entity.properties as string),
      confidence: entity.confidence as number,
      sources: JSON.parse(entity.sources as string),
      created: entity.created as number,
      updated: entity.updated as number
    };
  }

  /**
   * Get entities by name
   * @param name Entity name
   * @returns Array of entities
   */
  async getEntitiesByName(name: string): Promise<Entity[]> {
    const entities = await this.agent.sql`
      SELECT * FROM knowledge_entities WHERE name = ${name}
    `;
    
    return entities.map(entity => ({
      id: entity.id as string,
      name: entity.name as string,
      type: entity.type as string,
      properties: JSON.parse(entity.properties as string),
      confidence: entity.confidence as number,
      sources: JSON.parse(entity.sources as string),
      created: entity.created as number,
      updated: entity.updated as number
    }));
  }

  /**
   * Get entities by type
   * @param type Entity type
   * @param limit Maximum number of entities to return
   * @param offset Offset for pagination
   * @returns Array of entities
   */
  async getEntitiesByType(type: string, limit = 100, offset = 0): Promise<Entity[]> {
    const entities = await this.agent.sql`
      SELECT * FROM knowledge_entities 
      WHERE type = ${type}
      ORDER BY confidence DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return entities.map(entity => ({
      id: entity.id as string,
      name: entity.name as string,
      type: entity.type as string,
      properties: JSON.parse(entity.properties as string),
      confidence: entity.confidence as number,
      sources: JSON.parse(entity.sources as string),
      created: entity.created as number,
      updated: entity.updated as number
    }));
  }

  /**
   * Search entities by property value
   * @param propertyName Name of the property to search
   * @param propertyValue Value to search for
   * @param limit Maximum number of entities to return
   * @param offset Offset for pagination
   * @returns Array of entities
   */
  async searchEntitiesByProperty(
    propertyName: string, 
    propertyValue: any, 
    limit = 100, 
    offset = 0
  ): Promise<Entity[]> {
    // This is a simplified implementation that scans all entities
    // In a production environment, you would use a more efficient approach
    const allEntities = await this.agent.sql`
      SELECT * FROM knowledge_entities
      ORDER BY confidence DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const matchingEntities: Entity[] = [];
    
    for (const entity of allEntities) {
      const properties = JSON.parse(entity.properties as string);
      if (properties[propertyName] === propertyValue) {
        matchingEntities.push({
          id: entity.id as string,
          name: entity.name as string,
          type: entity.type as string,
          properties,
          confidence: entity.confidence as number,
          sources: JSON.parse(entity.sources as string),
          created: entity.created as number,
          updated: entity.updated as number
        });
      }
    }
    
    return matchingEntities;
  }

  /**
   * Delete an entity by ID
   * @param id Entity ID
   * @returns True if entity was deleted, false if not found
   */
  async deleteEntity(id: string): Promise<boolean> {
    const result = await this.agent.sql`
      DELETE FROM knowledge_entities WHERE id = ${id}
    `;
    
    // Check if any rows were affected
    return (result as any).count > 0 || result.length > 0;
  }

  /**
   * Get the total count of entities
   * @returns Total number of entities
   */
  async getEntityCount(): Promise<number> {
    const result = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_entities
    `;
    
    return result[0].count as number;
  }

  /**
   * Get the distribution of entity types
   * @returns Record of entity types and their counts
   */
  async getEntityTypeDistribution(): Promise<Record<string, number>> {
    const results = await this.agent.sql`
      SELECT type, COUNT(*) as count FROM knowledge_entities
      GROUP BY type
    `;
    
    const distribution: Record<string, number> = {};
    
    for (const result of results) {
      distribution[result.type as string] = result.count as number;
    }
    
    return distribution;
  }

  /**
   * Get the average confidence of all entities
   * @returns Average confidence value
   */
  async getAverageEntityConfidence(): Promise<number> {
    const result = await this.agent.sql`
      SELECT AVG(confidence) as avg_confidence FROM knowledge_entities
    `;
    
    return result[0].avg_confidence as number || 0;
  }
}
