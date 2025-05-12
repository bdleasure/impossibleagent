# SQL Index Recommendations for ImpossibleAgent

## Overview

This document provides recommendations for SQL indexes to optimize query performance in the ImpossibleAgent project. These recommendations are based on an analysis of common query patterns observed in the codebase.

## Current Indexes

The following indexes are already implemented in the codebase:

### KnowledgeBase.ts
```sql
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category)
CREATE INDEX IF NOT EXISTS idx_knowledge_confidence ON knowledge_entries(confidence)
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created)
```

### MemoryManager.ts
```sql
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)
CREATE INDEX IF NOT EXISTS idx_episodic_context ON episodic_memories(context)
CREATE INDEX IF NOT EXISTS idx_episodic_source ON episodic_memories(source)
```

### McpPersonalAgent.ts
```sql
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)
CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memories(confidence)
CREATE INDEX IF NOT EXISTS idx_tool_usage_timestamp ON tool_usage_events(timestamp)
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id ON tool_usage_events(tool_id)
```

## Recommended Additional Indexes

Based on the query patterns observed in the codebase, the following additional indexes are recommended:

### Knowledge Graph Indexes

```sql
-- For entity queries by name (used in QueryManager.ts)
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_name ON knowledge_entities(name)

-- For entity queries by type (used in QueryManager.ts)
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(type)

-- For relationship queries by source entity (used in QueryManager.ts)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON knowledge_relationships(source_entity_id)

-- For relationship queries by target entity (used in QueryManager.ts)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON knowledge_relationships(target_entity_id)

-- For relationship queries by type (used in QueryManager.ts)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON knowledge_relationships(type)

-- Composite index for source entity and type (common query pattern)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_type ON knowledge_relationships(source_entity_id, type)

-- Composite index for target entity and type (common query pattern)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_type ON knowledge_relationships(target_entity_id, type)
```

### Memory System Indexes

```sql
-- For content search queries (used in MemoryManager.ts)
CREATE INDEX IF NOT EXISTS idx_episodic_content ON episodic_memories(content)

-- For importance-based queries (used in memory retrieval)
CREATE INDEX IF NOT EXISTS idx_episodic_importance ON episodic_memories(importance)

-- Composite index for timestamp and importance (common query pattern)
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp_importance ON episodic_memories(timestamp, importance)

-- Composite index for context and timestamp (common query pattern)
CREATE INDEX IF NOT EXISTS idx_episodic_context_timestamp ON episodic_memories(context, timestamp)

-- Composite index for source and timestamp (common query pattern)
CREATE INDEX IF NOT EXISTS idx_episodic_source_timestamp ON episodic_memories(source, timestamp)
```

### Tool Usage Tracking Indexes

```sql
-- For user-specific tool usage queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage_events(user_id)

-- For success/failure analysis
CREATE INDEX IF NOT EXISTS idx_tool_usage_success ON tool_usage_events(success)

-- Composite index for tool_id and timestamp (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id_timestamp ON tool_usage_events(tool_id, timestamp)

-- Composite index for user_id and tool_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id_tool_id ON tool_usage_events(user_id, tool_id)
```

### Scheduled Tasks Indexes

```sql
-- For next_run queries (used in task scheduling)
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run)

-- For name-based task queries
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_name ON scheduled_tasks(name)
```

## Implementation Plan

To implement these indexes, add the following code to the initialization methods of the respective classes:

### KnowledgeGraph.ts

```typescript
// Add to the initialize method
async initialize() {
  // Existing code...
  
  // Add indexes for knowledge entities
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_entities_name ON knowledge_entities(name)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(type)`;
  
  // Add indexes for knowledge relationships
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON knowledge_relationships(source_entity_id)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON knowledge_relationships(target_entity_id)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON knowledge_relationships(type)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_type ON knowledge_relationships(source_entity_id, type)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_type ON knowledge_relationships(target_entity_id, type)`;
}
```

### MemoryManager.ts

```typescript
// Add to the ensureTablesExist method
private async ensureTablesExist(): Promise<void> {
  // Existing code...
  
  // Add additional indexes for episodic memories
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_content ON episodic_memories(content)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_importance ON episodic_memories(importance)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp_importance ON episodic_memories(timestamp, importance)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_context_timestamp ON episodic_memories(context, timestamp)`;
  await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_source_timestamp ON episodic_memories(source, timestamp)`;
}
```

### McpPersonalAgent.ts

```typescript
// Add to the init method
async init() {
  // Existing code...
  
  // Add additional indexes for tool usage tracking
  await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage_events(user_id)`;
  await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_success ON tool_usage_events(success)`;
  await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id_timestamp ON tool_usage_events(tool_id, timestamp)`;
  await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id_tool_id ON tool_usage_events(user_id, tool_id)`;
  
  // Add indexes for scheduled tasks
  await this.sql`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run)`;
  await this.sql`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_name ON scheduled_tasks(name)`;
}
```

## Performance Considerations

When adding indexes, consider the following:

1. **Index Size**: Each index increases the database size and write operation overhead.
2. **Write Performance**: Indexes improve read performance but can slow down write operations.
3. **Index Selectivity**: Indexes on columns with high cardinality (many unique values) are more effective.
4. **Query Patterns**: Focus on indexing columns used in WHERE, JOIN, and ORDER BY clauses.
5. **Composite Indexes**: Use composite indexes when queries filter on multiple columns together.

## Monitoring and Optimization

After implementing these indexes, monitor query performance to ensure they are effective:

1. Use the SQLite EXPLAIN QUERY PLAN command to verify index usage.
2. Monitor query execution times before and after index implementation.
3. Periodically review and update indexes based on changing query patterns.
4. Consider removing unused indexes to improve write performance.

## Conclusion

These index recommendations should significantly improve query performance for common operations in the ImpossibleAgent project. Implement them incrementally and monitor their impact on both read and write performance.
