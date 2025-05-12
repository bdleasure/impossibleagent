import type { RankedMemory } from "./RelevanceRanking";
import { EmbeddingManager } from "./EmbeddingManager";
import type { SimilaritySearchOptions } from "./EmbeddingManager";

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
  embedding_id?: string; // Reference to the embedding in Vectorize
}

/**
 * Options for memory storage
 */
export interface MemoryStorageOptions {
  source?: string;
  context?: string;
  metadata?: Record<string, any>;
  importance?: number;
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
          metadata TEXT,
          embedding_id TEXT
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
      
      // Add additional indexes for episodic memories
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_content ON episodic_memories(content)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_importance ON episodic_memories(importance)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp_importance ON episodic_memories(timestamp, importance)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_context_timestamp ON episodic_memories(context, timestamp)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_source_timestamp ON episodic_memories(source, timestamp)`;
      
      // Add recommended indexes from sql-index-recommendations.md
      // Memory system indexes for timestamp, importance, and context-based queries
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp_context_importance ON episodic_memories(timestamp, context, importance)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_context_importance ON episodic_memories(context, importance)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_source_importance ON episodic_memories(source, importance)`;
      await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_episodic_content_timestamp ON episodic_memories(content, timestamp)`;
      
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
  ): Promise<{ id: string; timestamp: number; embedding_id?: string }> {
    await this.ensureTablesExist();
    
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const importance = options.importance || 5; // Default importance
    let embedding_id: string | undefined;
    
    // Generate embedding if embedding manager is available
    if (this.embeddingManager) {
      try {
        // Create embedding in Vectorize
        embedding_id = await this.embeddingManager.createEmbedding(content, {
          metadata: {
            memory_id: id,
            timestamp,
            context: options.context,
            source: options.source,
            importance
          }
        });
        console.log(`Created embedding for memory: ${id}, embedding_id: ${embedding_id}`);
      } catch (error) {
        console.error("Failed to create embedding for memory:", error);
        // Continue without embedding if it fails
      }
    }
    
    try {
      // Try to store the memory with the source column and embedding_id
      await this.agent.sql`
        INSERT INTO episodic_memories (
          id, timestamp, content, importance, context, source, metadata, embedding_id
        ) VALUES (
          ${id}, 
          ${timestamp}, 
          ${content}, 
          ${importance}, 
          ${options.context || null}, 
          ${options.source || null}, 
          ${options.metadata ? JSON.stringify(options.metadata) : null},
          ${embedding_id || null}
        )
      `;
    } catch (error: any) {
      // If there's an error with the columns, try a more basic insert
      if (error && error.message && typeof error.message === 'string' && 
          (error.message.includes('no column named source') || 
           error.message.includes('no column named embedding_id'))) {
        console.warn("Column not found, inserting with basic fields");
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
    
    return { id, timestamp, embedding_id };
  }

  /**
   * Retrieve memories based on a query and options
   * Uses keyword search with SQL LIKE operator
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
    let results;
    
    try {
      // Following the recommended SQL tagged template literals pattern
      // Use separate queries for different combinations of conditions
      const hasQuery = query && query.trim() !== '';
      const likePattern = hasQuery ? `%${query.replace(/'/g, "''")}%` : '';
      
      // Handle different combinations of filters using separate queries
      // This follows the recommended pattern from sql-query-patterns.md
      if (startTime !== undefined && endTime !== undefined && source !== undefined && context !== undefined) {
        // All filters
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE timestamp >= ${startTime}
            AND timestamp <= ${endTime}
            AND source = ${source}
            AND context = ${context}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY context, timestamp DESC
          LIMIT ${limit}
        `;
      } else if (startTime !== undefined && endTime !== undefined && source !== undefined) {
        // Time range and source
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE timestamp >= ${startTime}
            AND timestamp <= ${endTime}
            AND source = ${source}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY source, timestamp DESC
          LIMIT ${limit}
        `;
      } else if (startTime !== undefined && endTime !== undefined && context !== undefined) {
        // Time range and context
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE timestamp >= ${startTime}
            AND timestamp <= ${endTime}
            AND context = ${context}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY context, timestamp DESC
          LIMIT ${limit}
        `;
      } else if (startTime !== undefined && endTime !== undefined) {
        // Time range only
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE timestamp >= ${startTime}
            AND timestamp <= ${endTime}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else if (source !== undefined && context !== undefined) {
        // Source and context
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE source = ${source}
            AND context = ${context}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else if (source !== undefined) {
        // Source only
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE source = ${source}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else if (context !== undefined) {
        // Context only
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE context = ${context}
            ${hasQuery ? this.agent.sql`AND content LIKE ${likePattern}` : this.agent.sql``}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else if (hasQuery) {
        // Query only
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE content LIKE ${likePattern}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else {
        // No filters, just return recent memories
        results = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
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
   * Retrieve memories based on semantic similarity to a query
   * Uses vector embeddings and Vectorize for semantic search
   */
  async retrieveMemoriesBySimilarity(
    query: string,
    options: SimilaritySearchOptions = {}
  ): Promise<Memory[]> {
    await this.ensureTablesExist();
    
    if (!this.embeddingManager) {
      console.warn("EmbeddingManager not available, falling back to keyword search");
      return this.retrieveMemories(query, options);
    }
    
    try {
      // Perform similarity search using the embedding manager
      const searchResults = await this.embeddingManager.searchSimilarEmbeddings(query, options);
      
      if (!searchResults || searchResults.length === 0) {
        return [];
      }
      
      // Extract memory IDs from the metadata
      const memoryIds = searchResults.map((result: { metadata?: { memory_id?: string } }) => 
        result.metadata?.memory_id as string
      ).filter(Boolean);
      
      if (memoryIds.length === 0) {
        return [];
      }
      
      // Fetch the actual memories from the database
      const memories: Memory[] = [];
      for (const memoryId of memoryIds) {
        const memory = await this.getMemory(memoryId);
        if (memory) {
          memories.push(memory);
        }
      }
      
      return memories;
    } catch (error) {
      console.error("Error performing semantic search:", error);
      // Fall back to keyword search on error
      return this.retrieveMemories(query, options);
    }
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    await this.ensureTablesExist();
    
    let result;
    try {
      // Try to get the memory with embedding_id field
      result = await this.agent.sql`
        SELECT id, timestamp, content, context, source, metadata, embedding_id, importance
        FROM episodic_memories
        WHERE id = ${id}
      `;
    } catch (error: any) {
      // If there's an error with the embedding_id column, try without it
      if (error && error.message && typeof error.message === 'string' && 
          error.message.includes('no column named embedding_id')) {
        result = await this.agent.sql`
          SELECT id, timestamp, content, context, source, metadata, importance
          FROM episodic_memories
          WHERE id = ${id}
        `;
      } else {
        // If it's a different error, rethrow it
        throw error;
      }
    }
    
    if (!result || result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      source: row.source,
      context: row.context,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding_id: row.embedding_id
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
      // If content is being updated and we have an embedding manager, update the embedding
      if (updates.content !== undefined && this.embeddingManager && memory.embedding_id) {
        try {
          // Update the embedding in Vectorize
          await this.embeddingManager.updateEmbedding(memory.embedding_id, updates.content);
          console.log(`Updated embedding for memory: ${id}, embedding_id: ${memory.embedding_id}`);
        } catch (error) {
          console.error("Failed to update embedding for memory:", error);
          // Continue with the update even if embedding update fails
        }
      } else if (updates.content !== undefined && this.embeddingManager && !memory.embedding_id) {
        // If content is updated but no embedding exists, create a new one
        try {
          const embedding_id = await this.embeddingManager.createEmbedding(updates.content, {
            metadata: {
              memory_id: id,
              timestamp: memory.timestamp,
              context: memory.context,
              source: memory.source
            }
          });
          
          // Update the embedding_id in the database
          await this.agent.sql`
            UPDATE episodic_memories 
            SET embedding_id = ${embedding_id}
            WHERE id = ${id}
          `;
          
          console.log(`Created new embedding for updated memory: ${id}, embedding_id: ${embedding_id}`);
        } catch (error) {
          console.error("Failed to create embedding for updated memory:", error);
          // Continue with the update even if embedding creation fails
        }
      }
      
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
      
      if (updates.embedding_id !== undefined) {
        await this.agent.sql`
          UPDATE episodic_memories 
          SET embedding_id = ${updates.embedding_id}
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
   * Retrieve the most relevant memories using both keyword and semantic search
   * This combines the results of both search methods for better recall
   */
  async retrieveRelevantMemories(
    query: string,
    options: MemoryRetrievalOptions & SimilaritySearchOptions = {}
  ): Promise<Memory[]> {
    await this.ensureTablesExist();
    
    // Run both search methods in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.retrieveMemories(query, options),
      this.embeddingManager ? this.retrieveMemoriesBySimilarity(query, options) : Promise.resolve([])
    ]);
    
    // Combine results, removing duplicates
    const memoryMap = new Map<string, Memory>();
    
    // Add keyword results first
    for (const memory of keywordResults) {
      memoryMap.set(memory.id, memory);
    }
    
    // Add semantic results, which might override some keyword results
    for (const memory of semanticResults) {
      memoryMap.set(memory.id, memory);
    }
    
    // Convert back to array and sort by timestamp (most recent first)
    const combinedResults = Array.from(memoryMap.values());
    combinedResults.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit the number of results if specified
    const limit = options.limit || 50;
    return combinedResults.slice(0, limit);
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
    
    // If the memory has an embedding_id and we have an embedding manager, delete the embedding
    if (memory.embedding_id && this.embeddingManager) {
      try {
        // Delete the embedding from Vectorize
        await this.embeddingManager.deleteEmbedding(memory.embedding_id);
        console.log(`Deleted embedding for memory: ${id}, embedding_id: ${memory.embedding_id}`);
      } catch (error) {
        console.error("Failed to delete embedding for memory:", error);
        // Continue with the memory deletion even if embedding deletion fails
      }
    }
    
    // Delete the memory from the database
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
