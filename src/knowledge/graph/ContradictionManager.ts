import { Agent } from "agents";
import type { Contradiction, Entity } from "./types";
import { EntityManager } from "./EntityManager";
import { RelationshipManager } from "./RelationshipManager";

/**
 * ContradictionManager handles contradiction detection and resolution in the knowledge graph
 */
export class ContradictionManager<Env> {
  /**
   * Create a new ContradictionManager instance
   * @param agent The agent instance
   * @param entityManager The entity manager instance
   * @param relationshipManager The relationship manager instance
   */
  constructor(
    private agent: Agent<Env>,
    private entityManager: EntityManager<Env>,
    private relationshipManager: RelationshipManager<Env>
  ) {}

  /**
   * Detect contradictions in entity properties
   * @param entityId Entity ID
   * @param newProperties New properties
   * @param oldProperties Old properties (optional)
   * @returns Array of detected contradiction IDs
   */
  async detectPropertyContradictions(
    entityId: string,
    newProperties: Record<string, any>,
    oldProperties?: Record<string, any>
  ): Promise<string[]> {
    const contradictionIds: string[] = [];
    
    // If no old properties, nothing to compare
    if (!oldProperties) {
      return contradictionIds;
    }
    
    // Get the entity to check its sources
    const entity = await this.entityManager.getEntityById(entityId);
    if (!entity) {
      return contradictionIds;
    }
    
    // Check each property for contradictions
    for (const [key, newValue] of Object.entries(newProperties)) {
      const oldValue = oldProperties[key];
      
      // Skip if property is new or values are the same
      if (oldValue === undefined || JSON.stringify(newValue) === JSON.stringify(oldValue)) {
        continue;
      }
      
      // Check if values are contradictory
      // This is a simplified check - in a real system, you might have more sophisticated logic
      if (typeof newValue === typeof oldValue && newValue !== oldValue) {
        // Check if contradiction already exists
        const existingContradictions = await this.agent.sql`
          SELECT * FROM knowledge_contradictions
          WHERE entity_id = ${entityId} AND property_name = ${key}
        `;
        
        if (existingContradictions.length > 0) {
          // Update existing contradiction
          const contradiction = existingContradictions[0];
          const id = contradiction.id as string;
          const conflictingValues = JSON.parse(contradiction.conflicting_values as string);
          const sources = JSON.parse(contradiction.sources as string);
          
          // Add new value if not already present
          if (!conflictingValues.some((v: any) => JSON.stringify(v) === JSON.stringify(newValue))) {
            conflictingValues.push(newValue);
          }
          
          // Update sources
          const mergedSources = [...new Set([...sources, ...entity.sources])];
          
          await this.agent.sql`
            UPDATE knowledge_contradictions
            SET 
              conflicting_values = ${JSON.stringify(conflictingValues)},
              sources = ${JSON.stringify(mergedSources)},
              updated = ${Date.now()}
            WHERE id = ${id}
          `;
          
          contradictionIds.push(id);
        } else {
          // Create new contradiction
          const id = crypto.randomUUID();
          const timestamp = Date.now();
          
          await this.agent.sql`
            INSERT INTO knowledge_contradictions (
              id, entity_id, property_name, conflicting_values, 
              related_entity_ids, related_relationship_ids, sources, 
              confidence, status, created, updated
            ) VALUES (
              ${id},
              ${entityId},
              ${key},
              ${JSON.stringify([oldValue, newValue])},
              ${JSON.stringify([])},
              ${JSON.stringify([])},
              ${JSON.stringify(entity.sources)},
              ${entity.confidence},
              ${"unresolved"},
              ${timestamp},
              ${timestamp}
            )
          `;
          
          contradictionIds.push(id);
        }
      }
    }
    
    return contradictionIds;
  }

  /**
   * Get a contradiction by ID
   * @param id Contradiction ID
   * @returns Contradiction or null if not found
   */
  async getContradictionById(id: string): Promise<Contradiction | null> {
    const contradictions = await this.agent.sql`
      SELECT * FROM knowledge_contradictions WHERE id = ${id}
    `;
    
    if (contradictions.length === 0) {
      return null;
    }
    
    const contradiction = contradictions[0];
    
    return {
      id: contradiction.id as string,
      entityId: contradiction.entity_id as string,
      propertyName: contradiction.property_name as string,
      conflictingValues: JSON.parse(contradiction.conflicting_values as string),
      relatedEntityIds: JSON.parse(contradiction.related_entity_ids as string),
      relatedRelationshipIds: JSON.parse(contradiction.related_relationship_ids as string),
      sources: JSON.parse(contradiction.sources as string),
      confidence: contradiction.confidence as number,
      status: contradiction.status as "unresolved" | "resolved" | "ignored",
      resolution: contradiction.resolution as string | undefined,
      created: contradiction.created as number,
      updated: contradiction.updated as number
    };
  }

  /**
   * Get contradictions by entity ID
   * @param entityId Entity ID
   * @returns Array of contradictions
   */
  async getContradictionsByEntity(entityId: string): Promise<Contradiction[]> {
    const contradictions = await this.agent.sql`
      SELECT * FROM knowledge_contradictions 
      WHERE entity_id = ${entityId}
      ORDER BY updated DESC
    `;
    
    return contradictions.map(contradiction => ({
      id: contradiction.id as string,
      entityId: contradiction.entity_id as string,
      propertyName: contradiction.property_name as string,
      conflictingValues: JSON.parse(contradiction.conflicting_values as string),
      relatedEntityIds: JSON.parse(contradiction.related_entity_ids as string),
      relatedRelationshipIds: JSON.parse(contradiction.related_relationship_ids as string),
      sources: JSON.parse(contradiction.sources as string),
      confidence: contradiction.confidence as number,
      status: contradiction.status as "unresolved" | "resolved" | "ignored",
      resolution: contradiction.resolution as string | undefined,
      created: contradiction.created as number,
      updated: contradiction.updated as number
    }));
  }

  /**
   * Get all unresolved contradictions
   * @param limit Maximum number of contradictions to return
   * @param offset Offset for pagination
   * @returns Array of contradictions
   */
  async getUnresolvedContradictions(limit = 100, offset = 0): Promise<Contradiction[]> {
    const contradictions = await this.agent.sql`
      SELECT * FROM knowledge_contradictions 
      WHERE status = ${"unresolved"}
      ORDER BY confidence DESC, updated DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return contradictions.map(contradiction => ({
      id: contradiction.id as string,
      entityId: contradiction.entity_id as string,
      propertyName: contradiction.property_name as string,
      conflictingValues: JSON.parse(contradiction.conflicting_values as string),
      relatedEntityIds: JSON.parse(contradiction.related_entity_ids as string),
      relatedRelationshipIds: JSON.parse(contradiction.related_relationship_ids as string),
      sources: JSON.parse(contradiction.sources as string),
      confidence: contradiction.confidence as number,
      status: contradiction.status as "unresolved" | "resolved" | "ignored",
      resolution: contradiction.resolution as string | undefined,
      created: contradiction.created as number,
      updated: contradiction.updated as number
    }));
  }

  /**
   * Resolve a contradiction
   * @param id Contradiction ID
   * @param resolution Resolution description
   * @param resolvedValue The value to use as the resolution
   * @returns True if contradiction was resolved, false if not found
   */
  async resolveContradiction(
    id: string,
    resolution: string,
    resolvedValue: any
  ): Promise<boolean> {
    const contradiction = await this.getContradictionById(id);
    if (!contradiction) {
      return false;
    }
    
    // Update the contradiction status
    await this.agent.sql`
      UPDATE knowledge_contradictions
      SET 
        status = ${"resolved"},
        resolution = ${resolution},
        updated = ${Date.now()}
      WHERE id = ${id}
    `;
    
    // Update the entity with the resolved value
    const entity = await this.entityManager.getEntityById(contradiction.entityId);
    if (entity) {
      const properties = { ...entity.properties };
      properties[contradiction.propertyName] = resolvedValue;
      
      await this.agent.sql`
        UPDATE knowledge_entities
        SET 
          properties = ${JSON.stringify(properties)},
          updated = ${Date.now()}
        WHERE id = ${contradiction.entityId}
      `;
    }
    
    return true;
  }

  /**
   * Ignore a contradiction
   * @param id Contradiction ID
   * @param reason Reason for ignoring
   * @returns True if contradiction was ignored, false if not found
   */
  async ignoreContradiction(id: string, reason: string): Promise<boolean> {
    const contradiction = await this.getContradictionById(id);
    if (!contradiction) {
      return false;
    }
    
    await this.agent.sql`
      UPDATE knowledge_contradictions
      SET 
        status = ${"ignored"},
        resolution = ${reason},
        updated = ${Date.now()}
      WHERE id = ${id}
    `;
    
    return true;
  }

  /**
   * Get the total count of contradictions
   * @returns Total number of contradictions
   */
  async getContradictionCount(): Promise<number> {
    const result = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_contradictions
    `;
    
    return result[0].count as number;
  }

  /**
   * Get the count of unresolved contradictions
   * @returns Number of unresolved contradictions
   */
  async getUnresolvedContradictionCount(): Promise<number> {
    const result = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_contradictions
      WHERE status = ${"unresolved"}
    `;
    
    return result[0].count as number;
  }
}
