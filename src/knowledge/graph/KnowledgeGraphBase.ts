import { Agent } from "agents";
import type { KnowledgeBase, KnowledgeEntry } from "../KnowledgeBase";
import type { Entity, GraphQueryResult, GraphStats, Relationship } from "./types";
import { EntityManager } from "./EntityManager";
import { RelationshipManager } from "./RelationshipManager";
import { ContradictionManager } from "./ContradictionManager";
import { QueryManager } from "./QueryManager";

/**
 * KnowledgeGraph implements a graph-based representation of knowledge
 * with entities, relationships, and contradiction detection
 */
export class KnowledgeGraph<Env> {
  private entityManager: EntityManager<Env>;
  private relationshipManager: RelationshipManager<Env>;
  private contradictionManager: ContradictionManager<Env>;
  private queryManager: QueryManager<Env>;

  /**
   * Create a new KnowledgeGraph instance
   * @param agent The agent instance
   * @param knowledgeBase The knowledge base to integrate with
   */
  constructor(
    private agent: Agent<Env>,
    private knowledgeBase: KnowledgeBase<Env>
  ) {
    this.entityManager = new EntityManager<Env>(agent);
    this.relationshipManager = new RelationshipManager<Env>(agent, this.entityManager);
    this.contradictionManager = new ContradictionManager<Env>(
      agent, 
      this.entityManager, 
      this.relationshipManager
    );
    this.queryManager = new QueryManager<Env>(
      agent, 
      this.entityManager, 
      this.relationshipManager, 
      this.contradictionManager
    );
  }

  /**
   * Initialize the knowledge graph with necessary database tables
   */
  async initialize(): Promise<void> {
    // Create entities table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS knowledge_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        properties TEXT NOT NULL,
        confidence REAL NOT NULL,
        sources TEXT NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )
    `;

    // Create relationships table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        properties TEXT NOT NULL,
        confidence REAL NOT NULL,
        sources TEXT NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      )
    `;

    // Create contradictions table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS knowledge_contradictions (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        property_name TEXT NOT NULL,
        conflicting_values TEXT NOT NULL,
        related_entity_ids TEXT NOT NULL,
        related_relationship_ids TEXT NOT NULL,
        sources TEXT NOT NULL,
        confidence REAL NOT NULL,
        status TEXT NOT NULL,
        resolution TEXT,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      )
    `;

    // Create indexes for better performance
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_entity_type ON knowledge_entities(type)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_entity_name ON knowledge_entities(name)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_relationship_type ON knowledge_relationships(type)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_contradiction_status ON knowledge_contradictions(status)`;
  }

  /**
   * Extract entities from knowledge entries
   * @param entries Knowledge entries to process
   * @returns Number of entities extracted
   */
  async extractEntitiesFromKnowledge(entries: KnowledgeEntry[]): Promise<number> {
    let extractedCount = 0;
    
    for (const entry of entries) {
      // Try to extract entities from the content based on the category
      const metadata = entry.metadata || {};
      
      switch (entry.category) {
        case "fact":
          // For facts, try to extract subject-predicate-object triples
          // This is a simplified implementation - in a real system, you would use NLP
          const factMatch = entry.content.match(/(.+?)\s+(.+?)\s+(.+)/);
          
          if (factMatch) {
            const [_, subject, predicate, object] = factMatch;
            
            // Create subject entity
            const subjectId = await this.entityManager.createOrUpdateEntity({
              name: subject,
              type: "subject",
              properties: { [predicate]: object },
              confidence: entry.confidence,
              sources: [entry.source]
            });
            
            // Create object entity if it's a complex object (not just a number)
            if (typeof object === "string" && !object.match(/^[0-9.]+$/)) {
              const objectId = await this.entityManager.createOrUpdateEntity({
                name: object,
                type: "object",
                properties: {},
                confidence: entry.confidence,
                sources: [entry.source]
              });
              
              // Create relationship between subject and object
              await this.relationshipManager.createOrUpdateRelationship({
                sourceEntityId: subjectId,
                targetEntityId: objectId,
                type: predicate,
                confidence: entry.confidence,
                sources: [entry.source]
              });
            }
            
            extractedCount++;
          }
          break;
          
        case "concept":
          // For concepts, use the first line as the name and extract properties from metadata
          const conceptName = entry.content.split('\n')[0].trim();
          
          if (conceptName) {
            await this.entityManager.createOrUpdateEntity({
              name: conceptName,
              type: "concept",
              properties: metadata,
              confidence: entry.confidence,
              sources: [entry.source]
            });
            
            extractedCount++;
          }
          break;
          
        case "event":
          // For events, extract event details from content and metadata
          const eventName = entry.content.split('\n')[0].trim();
          
          if (eventName) {
            const eventId = await this.entityManager.createOrUpdateEntity({
              name: eventName,
              type: "event",
              properties: {
                date: metadata.date,
                location: metadata.location,
                description: entry.content,
                ...metadata
              },
              confidence: entry.confidence,
              sources: [entry.source]
            });
            
            // Create relationships for participants if they exist in metadata
            if (metadata.participants && Array.isArray(metadata.participants)) {
              for (const participant of metadata.participants) {
                const participantId = await this.entityManager.createOrUpdateEntity({
                  name: participant,
                  type: "participant",
                  properties: {},
                  confidence: entry.confidence,
                  sources: [entry.source]
                });
                
                await this.relationshipManager.createOrUpdateRelationship({
                  sourceEntityId: eventId,
                  targetEntityId: participantId,
                  type: "has_participant",
                  confidence: entry.confidence,
                  sources: [entry.source]
                });
              }
            }
            
            extractedCount++;
          }
          break;
          
        default:
          // For other categories, create a generic entity
          const name = entry.content.split('\n')[0].trim();
          
          if (name) {
            await this.entityManager.createOrUpdateEntity({
              name: name,
              type: entry.category,
              properties: {
                content: entry.content,
                tags: entry.tags,
                ...metadata
              },
              confidence: entry.confidence,
              sources: [entry.source]
            });
            
            extractedCount++;
          }
          break;
      }
    }
    
    return extractedCount;
  }

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
    return this.entityManager.createOrUpdateEntity(entity);
  }

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
    return this.relationshipManager.createOrUpdateRelationship(relationship);
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
    return this.queryManager.queryGraph(options);
  }

  /**
   * Search the graph for entities and relationships matching a text query
   * @param query Text query
   * @param limit Maximum number of results to return
   * @param offset Offset for pagination
   * @returns Query results
   */
  async searchGraph(query: string, limit = 100, offset = 0): Promise<GraphQueryResult> {
    return this.queryManager.searchGraph(query, limit, offset);
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
    return this.queryManager.findPaths(sourceEntityId, targetEntityId, maxDepth);
  }

  /**
   * Get graph statistics
   * @returns Graph statistics
   */
  async getGraphStats(): Promise<GraphStats> {
    return this.queryManager.getGraphStats();
  }

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
    return this.contradictionManager.detectPropertyContradictions(
      entityId,
      newProperties,
      oldProperties
    );
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
    return this.contradictionManager.resolveContradiction(id, resolution, resolvedValue);
  }

  /**
   * Get an entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async getEntityById(id: string): Promise<Entity | null> {
    return this.entityManager.getEntityById(id);
  }

  /**
   * Get a relationship by ID
   * @param id Relationship ID
   * @returns Relationship or null if not found
   */
  async getRelationshipById(id: string): Promise<Relationship | null> {
    return this.relationshipManager.getRelationshipById(id);
  }
}
