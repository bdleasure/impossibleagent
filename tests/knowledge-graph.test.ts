import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeGraph } from '../src/knowledge/KnowledgeGraph';
import { KnowledgeBase } from '../src/knowledge/KnowledgeBase';
import type { Entity, Relationship } from '../src/knowledge/graph/types';

// Mock Agent class
class MockAgent {
  private mockDb: Record<string, any[]> = {
    knowledge_entities: [],
    knowledge_relationships: [],
    knowledge_contradictions: []
  };
  
  // Mock SQL tagged template function
  async sql(strings: TemplateStringsArray, ...values: any[]) {
    // This is a very simplified mock implementation
    const query = strings.join('?').toLowerCase();
    
    // Handle different query types
    if (query.includes('create table')) {
      // Just return success for table creation
      return { success: true };
    } else if (query.includes('insert into')) {
      // Extract table name
      const tableMatch = query.match(/insert into (\w+)/i);
      if (!tableMatch) return [];
      
      const tableName = tableMatch[1];
      
      // Create a new record with the values
      const record: Record<string, any> = {};
      
      // For simplicity, we'll just add the values in order
      // In a real implementation, we would parse the column names from the query
      if (tableName === 'knowledge_entities') {
        record.id = values[0];
        record.name = values[1];
        record.type = values[2];
        record.properties = values[3];
        record.confidence = values[4];
        record.sources = values[5];
        record.created = values[6];
        record.updated = values[7];
      } else if (tableName === 'knowledge_relationships') {
        record.id = values[0];
        record.source_entity_id = values[1];
        record.target_entity_id = values[2];
        record.type = values[3];
        record.properties = values[4];
        record.confidence = values[5];
        record.sources = values[6];
        record.created = values[7];
        record.updated = values[8];
      }
      
      // Add to mock database
      if (this.mockDb[tableName]) {
        this.mockDb[tableName].push(record);
      }
      
      return { success: true };
    } else if (query.includes('select')) {
      // Extract table name
      const tableMatch = query.match(/from (\w+)/i);
      if (!tableMatch) return [];
      
      const tableName = tableMatch[1];
      
      // Handle different select queries
      if (query.includes('where id =')) {
        // Find by ID
        const id = values.find(v => typeof v === 'string' && v.includes('-'));
        return this.mockDb[tableName].filter(record => record.id === id);
      } else if (query.includes('where name =')) {
        // Find by name
        const name = values.find(v => typeof v === 'string' && !v.includes('-'));
        return this.mockDb[tableName].filter(record => record.name === name);
      } else if (query.includes('count(*)')) {
        // Count query
        return [{ count: this.mockDb[tableName].length }];
      } else {
        // Return all records
        return this.mockDb[tableName];
      }
    }
    
    return [];
  }
}

describe('KnowledgeGraph', () => {
  let agent: any;
  let knowledgeBase: any;
  let knowledgeGraph: KnowledgeGraph<any>;
  
  beforeEach(async () => {
    // Create a new mock agent for each test
    agent = new MockAgent();
    
    // Create a mock knowledge base
    knowledgeBase = new KnowledgeBase(agent);
    
    // Create the knowledge graph
    knowledgeGraph = new KnowledgeGraph(agent, knowledgeBase);
    
    // Initialize the knowledge graph
    await knowledgeGraph.initialize();
  });
  
  it('should create an entity', async () => {
    // Create a test entity
    const entityId = await knowledgeGraph.createOrUpdateEntity({
      name: 'Test Entity',
      type: 'test',
      properties: { key: 'value' },
      confidence: 0.9,
      sources: ['test']
    });
    
    // Verify the entity was created
    expect(entityId).toBeDefined();
    expect(typeof entityId).toBe('string');
  });
  
  it('should create a relationship between entities', async () => {
    // Create two test entities
    const sourceEntityId = await knowledgeGraph.createOrUpdateEntity({
      name: 'Source Entity',
      type: 'test',
      properties: { key: 'source' }
    });
    
    const targetEntityId = await knowledgeGraph.createOrUpdateEntity({
      name: 'Target Entity',
      type: 'test',
      properties: { key: 'target' }
    });
    
    // Create a relationship between them
    const relationshipId = await knowledgeGraph.createOrUpdateRelationship({
      sourceEntityId,
      targetEntityId,
      type: 'test_relation',
      properties: { key: 'relation' },
      confidence: 0.8,
      sources: ['test']
    });
    
    // Verify the relationship was created
    expect(relationshipId).toBeDefined();
    expect(typeof relationshipId).toBe('string');
  });
  
  it('should query the graph', async () => {
    // Create some test entities
    await knowledgeGraph.createOrUpdateEntity({
      name: 'Entity 1',
      type: 'person',
      properties: { age: 30 }
    });
    
    await knowledgeGraph.createOrUpdateEntity({
      name: 'Entity 2',
      type: 'place',
      properties: { location: 'New York' }
    });
    
    await knowledgeGraph.createOrUpdateEntity({
      name: 'Entity 3',
      type: 'person',
      properties: { age: 25 }
    });
    
    // Query the graph
    const result = await knowledgeGraph.queryGraph({
      entityTypes: ['person']
    });
    
    // Verify the query results
    expect(result.entities).toBeDefined();
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0].type).toBe('person');
  });
  
  it('should search the graph', async () => {
    // Create some test entities
    await knowledgeGraph.createOrUpdateEntity({
      name: 'John Doe',
      type: 'person',
      properties: { occupation: 'Developer' }
    });
    
    await knowledgeGraph.createOrUpdateEntity({
      name: 'Jane Smith',
      type: 'person',
      properties: { occupation: 'Designer' }
    });
    
    // Search the graph
    const result = await knowledgeGraph.searchGraph('John');
    
    // Verify the search results
    expect(result.entities).toBeDefined();
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0].name).toContain('John');
  });
  
  it('should get graph statistics', async () => {
    // Create some test entities and relationships
    const entity1Id = await knowledgeGraph.createOrUpdateEntity({
      name: 'Entity 1',
      type: 'person',
      properties: {}
    });
    
    const entity2Id = await knowledgeGraph.createOrUpdateEntity({
      name: 'Entity 2',
      type: 'place',
      properties: {}
    });
    
    await knowledgeGraph.createOrUpdateRelationship({
      sourceEntityId: entity1Id,
      targetEntityId: entity2Id,
      type: 'visited',
      properties: {}
    });
    
    // Get graph statistics
    const stats = await knowledgeGraph.getGraphStats();
    
    // Verify the statistics
    expect(stats).toBeDefined();
    expect(stats.entityCount).toBeGreaterThan(0);
    expect(stats.relationshipCount).toBeGreaterThan(0);
    expect(stats.entityTypeDistribution).toBeDefined();
    expect(stats.relationshipTypeDistribution).toBeDefined();
  });
});
