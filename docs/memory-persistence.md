# Memory Persistence System

The Memory Persistence System is a core component of the ImpossibleAgent that enables storing and retrieving memories across conversations. This document explains how the memory persistence system works and best practices for implementation.

## Overview

The Memory Persistence System uses SQLite (via the Cloudflare Agents SDK's SQL capabilities) to store and retrieve memories. It supports:

- Episodic memories (specific events and interactions)
- Semantic memories (general facts and knowledge)
- Memory connections (relationships between memories)

## Architecture

The Memory Persistence System is composed of several key components:

1. **MemoryManager**: The main class that orchestrates all memory operations
2. **EmbeddingManager**: Handles vector embeddings for semantic search capabilities
3. **TemporalContextManager**: Provides time-based context for memory operations
4. **RelevanceRanking**: Ranks memories by relevance to queries
5. **LearningEnhancedMemoryRetrieval**: Combines memory retrieval with learning capabilities

## Database Schema

The Memory Persistence System uses three main tables:

### episodic_memories
- `id`: Unique identifier for the memory
- `timestamp`: Timestamp when the memory was created
- `content`: The content of the memory
- `importance`: Importance score (1-10)
- `context`: Context of the memory (e.g., conversation, user-message)
- `source`: Source of the memory (e.g., conversation, user-input)
- `metadata`: JSON object containing additional metadata

### semantic_memories
- `id`: Unique identifier for the memory
- `fact`: The factual knowledge
- `confidence`: Confidence score (0-1)
- `first_observed`: Timestamp when the fact was first observed
- `last_confirmed`: Timestamp when the fact was last confirmed
- `metadata`: JSON object containing additional metadata

### memory_connections
- `id`: Unique identifier for the connection
- `source_id`: ID of the source memory
- `target_id`: ID of the target memory
- `relationship`: Type of relationship
- `strength`: Strength of the connection (0-1)
- `created_at`: Timestamp when the connection was created
- `metadata`: JSON object containing additional metadata

## Schema Evolution

The Memory Persistence System is designed to handle schema evolution gracefully. When new columns are added to the database schema, the system checks if they exist and adds them if necessary.

For example, when the `source` column was added to the `episodic_memories` table, the following code was added to ensure backward compatibility:

```typescript
// Add source column to existing tables if it doesn't exist
try {
  // Check if the source column exists
  const tableInfo = await this.sql`PRAGMA table_info(episodic_memories)`;
  const hasSourceColumn = tableInfo.some((column: any) => column.name === 'source');
  
  if (!hasSourceColumn) {
    console.log("Adding source column to episodic_memories table...");
    await this.sql`ALTER TABLE episodic_memories ADD COLUMN source TEXT`;
  }
} catch (error) {
  console.error("Error checking or adding source column:", error);
}
```

## SQL Query Implementation

The Memory Persistence System uses a consistent approach for SQL queries that works reliably with the Cloudflare Agents SDK. This approach uses template literals with proper string escaping to ensure security and compatibility.

### Direct String Interpolation with Proper Escaping

For SQL queries, we use direct string interpolation with proper escaping to prevent SQL injection:

```typescript
// Build the SQL query with direct string interpolation
let sqlQuery = `
  SELECT id, timestamp, content, context, source, metadata
  FROM episodic_memories
  WHERE 1=1
`;

// Add time range conditions
if (startTime !== undefined) {
  sqlQuery += ` AND timestamp >= ${startTime}`;
}

// Add source condition with proper escaping
if (source !== undefined) {
  sqlQuery += ` AND source = '${source.replace(/'/g, "''")}'`;
}

// Add text search condition if query is provided
if (query && query.trim() !== '') {
  // Escape special characters in the query
  const escapedQuery = query.replace(/'/g, "''").replace(/%/g, "\\%");
  sqlQuery += ` AND content LIKE '%${escapedQuery}%'`;
}

// Execute the query using template literals
const results = await this.agent.sql`${sqlQuery}`;
```

### String Escaping Techniques

When working with string values in SQL queries, proper escaping is essential to prevent SQL injection:

1. For string values, use single quote escaping: `source.replace(/'/g, "''")`
2. For LIKE queries, escape percent signs: `query.replace(/%/g, "\\%")`
3. For JSON values, use `JSON.stringify()` to properly format the data

### Using Template Literals with the SQL Tag

The Cloudflare Agents SDK provides a tagged template literal for SQL queries:

```typescript
// Execute a query with the sql tag
const results = await this.agent.sql`
  SELECT * FROM episodic_memories
  WHERE id = ${id}
`;
```

This approach automatically handles parameter escaping for simple queries. For more complex queries with dynamic conditions, we build the query string first and then pass it to the sql tag.

## Memory Retrieval Strategies

The Memory Persistence System uses several strategies to retrieve relevant memories:

### 1. Direct ID Lookup

When you know the exact ID of a memory:

```typescript
const memory = await memoryManager.getMemory(id);
```

### 2. Content-Based Search

Search for memories based on their content:

```typescript
const memories = await memoryManager.retrieveMemories("Japan trip", { limit: 10 });
```

### 3. Context-Based Filtering

Filter memories by their context:

```typescript
const memories = await memoryManager.retrieveMemories("", { 
  context: "preferences",
  limit: 10 
});
```

### 4. Time-Based Filtering

Retrieve memories from a specific time period:

```typescript
const memories = await memoryManager.retrieveMemories("", { 
  startTime: oneMonthAgo,
  endTime: yesterday,
  limit: 10 
});
```

### 5. Source-Based Filtering

Filter memories by their source:

```typescript
const memories = await memoryManager.retrieveMemories("", { 
  source: "conversation",
  limit: 10 
});
```

## Best Practices

1. **Always Check for Column Existence**: Before using a column, check if it exists in the table
2. **Use Proper Escaping for String Values**: Escape string values to prevent SQL injection
3. **Use Transactions for Multiple Operations**: Use transactions to ensure data consistency
4. **Validate Input Data**: Validate input data before using it in SQL queries
5. **Use Indexes for Better Performance**: Create indexes on frequently queried columns
6. **Keep Queries Simple**: Break complex queries into simpler ones when possible
7. **Use Parameterized Queries When Available**: Use the SQL tag for simple queries
8. **Document Schema Changes**: Document schema changes for future reference
9. **Test with Real Data**: Test with realistic data volumes and patterns
10. **Monitor Performance**: Keep an eye on query performance as data grows

## Recent Integration Updates

The Memory Persistence System has been significantly enhanced with the successful integration of several key components:

1. **Vector Embeddings**: ✅ COMPLETED - The `EmbeddingManager` has been fully integrated, enabling semantic search capabilities through vector embeddings.

2. **Advanced Relevance Ranking**: ✅ COMPLETED - The `RelevanceRanking` system has been integrated, providing sophisticated multi-factor relevance algorithms.

3. **Temporal Awareness**: ✅ COMPLETED - The `TemporalContextManager` has been integrated, enhancing time-based context for memory operations.

4. **Learning-Enhanced Retrieval**: ✅ COMPLETED - The `LearningEnhancedMemoryRetrieval` system has been integrated, combining memory retrieval with learning capabilities.

5. **Integration with Knowledge Graph**: ✅ COMPLETED - Memories are now connected with the knowledge graph, allowing for structured representation of memories.

These integrations have significantly improved the memory capabilities of the PersonalAgent, providing more relevant and contextually appropriate memories during conversations.

## Future Enhancements

With the major components now integrated, future enhancements for the Memory Persistence System include:

1. **Memory Consolidation**: Implement more sophisticated algorithms to automatically consolidate related memories
2. **Cross-Memory Relationships**: Further improve relationship tracking between memories
3. **Memory Visualization**: Develop tools to visualize memory connections
4. **Performance Optimizations**: Optimize for large memory stores
5. **Enhanced Security**: Add encryption for sensitive memories
6. **Memory Pruning**: Implement strategies for removing less important memories
7. **Advanced Learning Mechanisms**: Enhance the learning system with more sophisticated algorithms
