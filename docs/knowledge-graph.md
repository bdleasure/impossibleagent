# Knowledge Graph

The Knowledge Graph is a powerful component of the ImpossibleAgent that enables storing, querying, and reasoning about structured knowledge. It provides a flexible way to represent entities, their relationships, and handle contradictions in the agent's knowledge.

## Overview

The Knowledge Graph represents information as a graph of entities (nodes) connected by relationships (edges). This structure allows for complex knowledge representation and powerful querying capabilities.

Key features:
- Entity management (create, update, query, delete)
- Relationship management (create, update, query, delete)
- Contradiction detection and resolution
- Advanced graph querying and traversal
- Knowledge persistence using SQL storage

## Architecture

The Knowledge Graph is composed of several key components:

1. **KnowledgeGraphBase**: The main class that orchestrates all knowledge graph operations
2. **EntityManager**: Handles entity-related operations
3. **RelationshipManager**: Handles relationship-related operations
4. **ContradictionManager**: Detects and manages contradictions in the knowledge
5. **QueryManager**: Provides advanced querying capabilities

## Database Schema

The Knowledge Graph uses three main tables:

### knowledge_entities
- `id`: Unique identifier for the entity
- `name`: Name of the entity
- `type`: Type of the entity (e.g., person, place, concept)
- `properties`: JSON object containing entity properties
- `confidence`: Confidence score (0-1)
- `sources`: JSON array of source references
- `created`: Timestamp when the entity was created
- `updated`: Timestamp when the entity was last updated

### knowledge_relationships
- `id`: Unique identifier for the relationship
- `source_entity_id`: ID of the source entity
- `target_entity_id`: ID of the target entity
- `type`: Type of the relationship (e.g., knows, contains, is_part_of)
- `properties`: JSON object containing relationship properties
- `confidence`: Confidence score (0-1)
- `sources`: JSON array of source references
- `created`: Timestamp when the relationship was created
- `updated`: Timestamp when the relationship was last updated

### knowledge_contradictions
- `id`: Unique identifier for the contradiction
- `entity_id`: ID of the entity with the contradiction
- `property_name`: Name of the property with conflicting values
- `conflicting_values`: JSON array of conflicting values
- `related_entity_ids`: JSON array of related entity IDs
- `related_relationship_ids`: JSON array of related relationship IDs
- `sources`: JSON array of source references
- `confidence`: Confidence score (0-1)
- `status`: Status of the contradiction (unresolved, resolved, ignored)
- `resolution`: Description of the resolution (if resolved)
- `created`: Timestamp when the contradiction was created
- `updated`: Timestamp when the contradiction was last updated

## Usage

### Initialization

The Knowledge Graph is automatically initialized when the PersonalAgent is created. It creates the necessary database tables if they don't already exist.

```typescript
// The knowledge graph is initialized in the PersonalAgent's onChatMessage method
const knowledgeBase = new KnowledgeBase(this);
const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);

// Initialize the knowledge graph if not already initialized
try {
  await knowledgeGraph.initialize();
} catch (error) {
  console.error("Failed to initialize knowledge graph:", error);
}
```

### Creating Entities

Entities represent nodes in the knowledge graph. They can be people, places, concepts, or any other type of object.

```typescript
// Create a person entity
const personId = await agent.createOrUpdateEntity({
  name: "John Doe",
  type: "person",
  properties: {
    age: 30,
    occupation: "Software Engineer",
    skills: ["JavaScript", "TypeScript", "React"]
  },
  confidence: 0.9,
  sources: ["user_input_2023-05-07"]
});

// Create a place entity
const placeId = await agent.createOrUpdateEntity({
  name: "San Francisco",
  type: "place",
  properties: {
    country: "USA",
    state: "California",
    population: 874961
  },
  confidence: 0.95,
  sources: ["wikipedia"]
});
```

### Creating Relationships

Relationships represent edges between entities in the knowledge graph.

```typescript
// Create a relationship between a person and a place
const relationshipId = await agent.createOrUpdateRelationship({
  sourceEntityId: personId,
  targetEntityId: placeId,
  type: "lives_in",
  properties: {
    since: 2018,
    neighborhood: "Mission District"
  },
  confidence: 0.8,
  sources: ["user_input_2023-05-07"]
});
```

### Querying the Graph

The Knowledge Graph provides powerful querying capabilities to retrieve entities and relationships.

```typescript
// Query for all people
const peopleResult = await agent.queryKnowledgeGraph({
  entityTypes: ["person"],
  minConfidence: 0.7
});

// Query for all places in the USA
const placesResult = await agent.queryKnowledgeGraph({
  entityTypes: ["place"],
  relationshipTypes: ["located_in"],
  minConfidence: 0.7
});

// Search for entities and relationships matching a text query
const searchResult = await agent.searchKnowledgeGraph("San Francisco");
```

### Finding Paths Between Entities

You can find paths between entities in the graph, which is useful for reasoning about connections.

```typescript
// Find paths between two entities
const paths = await knowledgeGraph.findPaths(personId, companyId, 3);

// Each path contains a sequence of entities and relationships
for (const path of paths) {
  console.log("Path:");
  for (let i = 0; i < path.entities.length; i++) {
    console.log(`- ${path.entities[i].name}`);
    if (i < path.relationships.length) {
      console.log(`  (${path.relationships[i].type}) →`);
    }
  }
}
```

### Getting Graph Statistics

You can retrieve statistics about the knowledge graph to understand its size and composition.

```typescript
const stats = await knowledgeGraph.getGraphStats();

console.log(`Entities: ${stats.entityCount}`);
console.log(`Relationships: ${stats.relationshipCount}`);
console.log(`Contradictions: ${stats.contradictionCount}`);
console.log(`Unresolved contradictions: ${stats.unresolvedContradictions}`);

console.log("Entity types:");
for (const [type, count] of Object.entries(stats.entityTypeDistribution)) {
  console.log(`- ${type}: ${count}`);
}

console.log("Relationship types:");
for (const [type, count] of Object.entries(stats.relationshipTypeDistribution)) {
  console.log(`- ${type}: ${count}`);
}
```

## Integration with Other Components

The Knowledge Graph integrates with other components of the ImpossibleAgent:

- **KnowledgeBase**: The Knowledge Graph uses the KnowledgeBase for storing and retrieving unstructured knowledge.
- **PersonalAgent**: The PersonalAgent provides callable methods to interact with the Knowledge Graph.
- **Memory System**: The Knowledge Graph can be used to represent and query memories in a structured way.
- **KnowledgeExtractor**: The KnowledgeExtractor now automatically extracts entities and relationships from conversations and stores them in the Knowledge Graph.
- **LearningSystem**: The LearningSystem uses the Knowledge Graph to identify patterns and enhance memory retrieval.

### Recent Integration Updates

The Knowledge Graph has been fully integrated with the PersonalAgent class, with the following enhancements:

1. **Automatic Knowledge Extraction**: The `extractMemoriesFromConversation` method now automatically extracts entities and relationships from user messages and stores them in the Knowledge Graph.

2. **Enhanced Entity Management**: Entities are now created with proper confidence scores and source tracking.

3. **Relationship Tracking**: Relationships between entities are automatically identified and stored with appropriate properties.

4. **Contradiction Handling**: The system now detects and manages contradictions in the knowledge graph.

5. **Integration with Memory System**: The Knowledge Graph is now connected to the memory system, allowing for structured representation of memories.

## Best Practices

1. **Use meaningful entity and relationship types**: Choose clear, consistent types for entities and relationships to make querying easier.

2. **Set appropriate confidence scores**: Use confidence scores to represent the certainty of knowledge, with higher scores for more reliable information.

3. **Track sources**: Always include source information to track where knowledge came from, which is useful for resolving contradictions.

4. **Handle contradictions**: Regularly check for and resolve contradictions to maintain knowledge consistency.

5. **Use properties effectively**: Store relevant properties on entities and relationships, but avoid overly complex nested structures.

6. **Optimize queries**: When querying large graphs, use specific entity and relationship types, and set appropriate confidence thresholds.

## Future Enhancements

Planned enhancements for the Knowledge Graph include:

1. **Inference engine**: Add capabilities to infer new knowledge based on existing knowledge.

2. **Temporal reasoning**: Enhance the graph to better represent and reason about time-based knowledge.

3. **Integration with vector embeddings**: Combine graph-based and embedding-based knowledge representation for more powerful querying.

4. **Visualization tools**: Develop tools to visualize the knowledge graph for better understanding and debugging.

5. **Advanced contradiction resolution**: Implement more sophisticated contradiction detection and resolution strategies.
