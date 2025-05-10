import type { RankedMemory } from "./RelevanceRanking";

/**
 * Interface for a memory object
 */
export interface Memory {
  id: string;
  content: string;
  timestamp: number;
  source?: string;
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for memory storage
 */
export interface MemoryStorageOptions {
  source?: string;
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for memory retrieval
 */
export interface MemoryRetrievalOptions {
  startTime?: number;
  endTime?: number;
  source?: string;
  context?: string;
  limit?: number;
}

/**
 * Memory Manager for the ImpossibleAgent
 * Responsible for storing, retrieving, and managing agent memories
 */
export class MemoryManager {
  private agent: any;
  private embeddingManager: any;
  
  constructor(options: any) {
    this.agent = options.agent;
    this.embeddingManager = options.embeddingManager;
    
    // Initialize with some sample memories for testing if the database is empty
    this.initializeSampleMemoriesIfEmpty();
  }

  /**
   * Initialize the database tables if they don't exist
   */
  private async ensureTablesExist(): Promise<void> {
    try {
      // Create memory tables if they don't exist
      await this.agent.sql`
        CREATE TABLE IF NOT EXISTS episodic_memories (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          content TEXT NOT NULL,
          importance INTEGER DEFAULT 5,
          context TEXT,
          source TEXT,
          metadata TEXT
        )
      `;

      // Create indexes for better performance
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_context ON episodic_memories(context)`;
      
      // Check if source column exists before creating index
      try {
        await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_source ON episodic_memories(source)`;
      } catch (error) {
        console.warn("Could not create source index, column may not exist yet:", error);
        // We'll continue without the index if it fails
      }
      
      console.log("Memory tables initialized successfully");
    } catch (error) {
      console.error("Failed to initialize memory tables:", error);
      throw error;
    }
  }

  /**
   * Store a new memory
   */
  async storeMemory(
    content: string,
    options: MemoryStorageOptions = {}
  ): Promise<{ id: string; timestamp: number }> {
    await this.ensureTablesExist();
    
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const importance = 5; // Default importance
    
    try {
      // Try to store the memory with the source column
      await this.agent.sql`
        INSERT INTO episodic_memories (
          id, timestamp, content, importance, context, source, metadata
        ) VALUES (
          ${id}, 
          ${timestamp}, 
          ${content}, 
          ${importance}, 
          ${options.context || null}, 
          ${options.source || null}, 
          ${options.metadata ? JSON.stringify(options.metadata) : null}
        )
      `;
    } catch (error: any) {
      // If there's an error with the source column, try without it
      if (error && error.message && typeof error.message === 'string' && error.message.includes('no column named source')) {
        console.warn("Source column not found, inserting without source field");
        await this.agent.sql`
          INSERT INTO episodic_memories (
            id, timestamp, content, importance, context, metadata
          ) VALUES (
            ${id}, 
            ${timestamp}, 
            ${content}, 
            ${importance}, 
            ${options.context || null}, 
            ${options.metadata ? JSON.stringify(options.metadata) : null}
          )
        `;
      } else {
        // If it's a different error, rethrow it
        throw error;
      }
    }
    
    console.log(`Stored memory: ${id}`);
    
    return { id, timestamp };
  }

  /**
   * Retrieve memories based on a query and options
   */
  async retrieveMemories(
    query: string,
    options: MemoryRetrievalOptions = {}
  ): Promise<Memory[]> {
    await this.ensureTablesExist();
    
    const {
      startTime,
      endTime,
      source,
      context,
      limit = 50
    } = options;
    
    // Use the SQL tagged template literal directly with parameters
    // This is the recommended way to use the Cloudflare Agents SDK's SQL capabilities
    let results;
    
    try {
      // Build the query parts for SQL tagged template literal
      let conditions = [];
      let values = [];
      
      // Add WHERE conditions if needed
      if (startTime !== undefined) {
        conditions.push(`timestamp >= ${startTime}`);
      }

      if (endTime !== undefined) {
        conditions.push(`timestamp <= ${endTime}`);
      }

      if (source !== undefined) {
        conditions.push(`source = ${source}`);
      }

      if (context !== undefined) {
        conditions.push(`context = ${context}`);
      }

      if (query && query.trim() !== '') {
        // For LIKE queries, we need to construct the pattern with % wildcards
        const likePattern = `%${query.replace(/'/g, "''")}%`;
        conditions.push(`content LIKE '%' || ${likePattern} || '%'`);
      }
      
      // Construct the SQL query using tagged template literals
      // This is the correct way to use the Cloudflare Agents SDK SQL functionality
      if (conditions.length > 0) {
        // Use the SQL tagged template literal with conditions
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata
          FROM episodic_memories
          WHERE ${conditions.join(' AND ')}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else {
        // No conditions, just get all memories with limit
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata
          FROM episodic_memories
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      }
    } catch (error) {
      console.error("Error retrieving memories:", error);
      // Return empty array on error
      return [];
    }
    
    // Convert the results to Memory objects
    return (results || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      source: row.source,
      context: row.context,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    await this.ensureTablesExist();
    
    const result = await this.agent.sql`
      SELECT id, timestamp, content, context, source, metadata
      FROM episodic_memories
      WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      source: row.source,
      context: row.context,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  /**
   * Update a memory
   */
  async updateMemory(
    id: string,
    updates: Partial<Omit<Memory, "id">>
  ): Promise<boolean> {
    await this.ensureTablesExist();
    
    // Check if the memory exists
    const memory = await this.getMemory(id);
    if (!memory) {
      return false;
    }
    
    try {
      // Use SQL tagged template literals for each field that needs updating
      if (updates.content !== undefined) {
        await this.agent.sql`
          UPDATE episodic_memories 
          SET content = ${updates.content}
          WHERE id = ${id}
        `;
      }
      
      if (updates.timestamp !== undefined) {
        await this.agent.sql`
          UPDATE episodic_memories 
          SET timestamp = ${updates.timestamp}
          WHERE id = ${id}
        `;
      }
      
      if (updates.source !== undefined) {
        await this.agent.sql`
          UPDATE episodic_memories 
          SET source = ${updates.source}
          WHERE id = ${id}
        `;
      }
      
      if (updates.context !== undefined) {
        await this.agent.sql`
          UPDATE episodic_memories 
          SET context = ${updates.context}
          WHERE id = ${id}
        `;
      }
      
      if (updates.metadata !== undefined) {
        const metadataJson = JSON.stringify(updates.metadata);
        await this.agent.sql`
          UPDATE episodic_memories 
          SET metadata = ${metadataJson}
          WHERE id = ${id}
        `;
      }
    } catch (error) {
      console.error("Error updating memory:", error);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.ensureTablesExist();
    
    // Check if the memory exists
    const memory = await this.getMemory(id);
    if (!memory) {
      return false;
    }
    
    // Delete the memory
    await this.agent.sql`
      DELETE FROM episodic_memories
      WHERE id = ${id}
    `;
    
    return true;
  }

  /**
   * Check if the database is empty
   */
  private async isDatabaseEmpty(): Promise<boolean> {
    try {
      const result = await this.agent.sql`
        SELECT COUNT(*) as count FROM episodic_memories
      `;
      
      return result[0].count === 0;
    } catch (error) {
      // If the table doesn't exist yet, consider it empty
      return true;
    }
  }

  /**
   * Initialize sample memories if the database is empty
   */
  private async initializeSampleMemoriesIfEmpty(): Promise<void> {
    try {
      await this.ensureTablesExist();
      
      // Check if the database is empty
      const isEmpty = await this.isDatabaseEmpty();
      
      if (isEmpty) {
        console.log("Initializing sample memories...");
        await this.initializeSampleMemories();
      }
    } catch (error) {
      console.error("Failed to initialize sample memories:", error);
    }
  }

  /**
   * Initialize sample memories for testing
   */
  private async initializeSampleMemories(): Promise<void> {
    const sampleMemories = [
      {
        content: "The user mentioned they prefer dark mode in all applications.",
        source: "conversation",
        context: "preferences",
        timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
      },
      {
        content: "The user's favorite color is blue, as mentioned during the onboarding process.",
        source: "onboarding",
        context: "preferences",
        timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 // 60 days ago
      },
      {
        content: "The user asked about integrating with Google Calendar on March 15, 2025.",
        source: "conversation",
        context: "integrations",
        timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000 // 15 days ago
      },
      {
        content: "The user mentioned they work as a software developer at TechCorp.",
        source: "conversation",
        context: "professional",
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
      },
      {
        content: "The user's birthday is on July 12th.",
        source: "profile",
        context: "personal",
        timestamp: Date.now() - 45 * 24 * 60 * 60 * 1000 // 45 days ago
      },
      {
        content: "The user prefers to receive notifications in the evening, after 6 PM.",
        source: "settings",
        context: "preferences",
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 // 5 days ago
      },
      {
        content: "The user asked for help with the memory visualization feature yesterday.",
        source: "conversation",
        context: "support",
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day ago
      },
      {
        content: "The user mentioned they're planning a trip to Japan next month.",
        source: "conversation",
        context: "personal",
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago
      },
      {
        content: "The user expressed interest in AI and machine learning technologies.",
        source: "conversation",
        context: "interests",
        timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000 // 20 days ago
      },
      {
        content: "The user connected their Spotify account to the agent.",
        source: "integrations",
        context: "music",
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
      }
    ];
    
    for (const memory of sampleMemories) {
      await this.storeMemory(memory.content, {
        source: memory.source,
        context: memory.context,
        metadata: { timestamp: memory.timestamp }
      });
    }
    
    console.log("Sample memories initialized successfully");
  }
}
