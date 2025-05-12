# SQL Query Patterns for Cloudflare Agents SDK

## Overview

This document outlines the correct patterns for SQL queries in the Cloudflare Agents SDK. Following these patterns is essential for ensuring proper functionality, security, and maintainability of our codebase.

## Correct Pattern: SQL Tagged Template Literals

The Cloudflare Agents SDK requires using SQL tagged template literals for all database operations. This approach provides several benefits:

1. **Type Safety**: Better TypeScript integration
2. **SQL Injection Prevention**: Parameters are automatically sanitized
3. **Performance**: Optimized query execution
4. **Readability**: Clear separation of SQL and parameters

### Basic Pattern

```typescript
// Correct pattern
const results = await this.agent.sql`
  SELECT * FROM table_name
  WHERE column_name = ${parameterValue}
`;
```

### Examples

#### Simple SELECT Query

```typescript
const userId = "user123";
const results = await this.agent.sql`
  SELECT * FROM users
  WHERE id = ${userId}
`;
```

#### INSERT Query

```typescript
const id = crypto.randomUUID();
const timestamp = Date.now();
const content = "Memory content";

await this.agent.sql`
  INSERT INTO episodic_memories (
    id, timestamp, content, importance
  ) VALUES (
    ${id},
    ${timestamp},
    ${content},
    ${5}
  )
`;
```

#### UPDATE Query

```typescript
const id = "memory123";
const newContent = "Updated memory content";

await this.agent.sql`
  UPDATE episodic_memories
  SET content = ${newContent}
  WHERE id = ${id}
`;
```

#### DELETE Query

```typescript
const id = "memory123";

await this.agent.sql`
  DELETE FROM episodic_memories
  WHERE id = ${id}
`;
```

#### Working with JSON

```typescript
const id = "entity123";
const properties = { color: "blue", size: "large" };

await this.agent.sql`
  UPDATE entities
  SET properties = ${JSON.stringify(properties)}
  WHERE id = ${id}
`;
```

#### Type Inference

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Supply the type parameter to the query
const users = await this.agent.sql<User>`
  SELECT * FROM users
  WHERE active = ${true}
`;

// users will be of type User[]
```

## Incorrect Patterns to Avoid

### ❌ String Concatenation

```typescript
// INCORRECT - DO NOT USE
const userId = "user123";
const query = `SELECT * FROM users WHERE id = '${userId}'`;
const results = await this.agent.sql(query);
```

### ❌ Prepare/Bind Pattern

```typescript
// INCORRECT - DO NOT USE
const stmt = await this.agent.sql.prepare(
  "SELECT * FROM users WHERE id = ?"
);
const results = await stmt.bind("user123").all();
```

## Handling Dynamic Queries

When you need to build queries with dynamic conditions, use multiple separate queries with the tagged template literal pattern rather than building a single dynamic query string.

### Example: Dynamic WHERE Conditions

```typescript
// Correct approach for dynamic conditions
if (startTime !== undefined && endTime !== undefined && source !== undefined) {
  results = await this.agent.sql`
    SELECT * FROM episodic_memories
    WHERE timestamp >= ${startTime}
      AND timestamp <= ${endTime}
      AND source = ${source}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
} else if (startTime !== undefined && endTime !== undefined) {
  results = await this.agent.sql`
    SELECT * FROM episodic_memories
    WHERE timestamp >= ${startTime}
      AND timestamp <= ${endTime}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
} else if (source !== undefined) {
  results = await this.agent.sql`
    SELECT * FROM episodic_memories
    WHERE source = ${source}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
} else {
  results = await this.agent.sql`
    SELECT * FROM episodic_memories
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
}
```

### Handling Arrays in Queries

When you need to query with an array of values, you should handle each value separately:

```typescript
// Correct approach for arrays
let results = [];
for (const type of entityTypes) {
  const typeResults = await this.agent.sql`
    SELECT * FROM entities
    WHERE type = ${type}
    ORDER BY created DESC
  `;
  results = [...results, ...typeResults];
}
```

## Error Handling

Always wrap SQL operations with proper error handling:

```typescript
import { withDatabaseErrorHandling } from "../utils/errors";

async function getEntityById(id: string): Promise<Entity | null> {
  return withDatabaseErrorHandling(async () => {
    const results = await this.agent.sql`
      SELECT * FROM entities WHERE id = ${id}
    `;
    
    if (results.length === 0) {
      return null;
    }
    
    return mapRowToEntity(results[0]);
  }, { entityId: id });
}
```

## Performance Considerations

1. **Create Indexes** for frequently queried columns:

```typescript
await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)`;
```

2. **Limit Result Sets** to avoid memory issues:

```typescript
const results = await this.agent.sql`
  SELECT * FROM large_table
  LIMIT ${100} OFFSET ${offset}
`;
```

3. **Use Specific Columns** instead of SELECT *:

```typescript
const results = await this.agent.sql`
  SELECT id, name, email FROM users
  WHERE active = ${true}
`;
```

## Best Practices

1. **Initialize Tables** at startup:

```typescript
async function ensureTablesExist(): Promise<void> {
  await this.agent.sql`
    CREATE TABLE IF NOT EXISTS episodic_memories (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 5
    )
  `;
}
```

2. **Use Transactions** for related operations:

```typescript
// Note: The transaction API may vary based on the Cloudflare Agents SDK version
await this.agent.sql`BEGIN TRANSACTION`;
try {
  await this.agent.sql`INSERT INTO users (id, name) VALUES (${id}, ${name})`;
  await this.agent.sql`INSERT INTO user_settings (user_id, theme) VALUES (${id}, ${"dark"})`;
  await this.agent.sql`COMMIT`;
} catch (error) {
  await this.agent.sql`ROLLBACK`;
  throw error;
}
```

3. **Document Schema Changes** in code comments:

```typescript
// Add source column to existing tables if it doesn't exist
try {
  // Check if the source column exists
  const tableInfo = await this.agent.sql`PRAGMA table_info(episodic_memories)`;
  const hasSourceColumn = tableInfo.some((column: any) => column.name === 'source');
  
  if (!hasSourceColumn) {
    console.log("Adding source column to episodic_memories table...");
    await this.agent.sql`ALTER TABLE episodic_memories ADD COLUMN source TEXT`;
  }
} catch (error) {
  console.error("Error checking or adding source column:", error);
}
```

## Conclusion

Following these SQL query patterns will ensure that our database operations are secure, maintainable, and compatible with the Cloudflare Agents SDK. All team members should adhere to these patterns when implementing database operations.
