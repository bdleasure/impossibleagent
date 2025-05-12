import { MemoryManager } from './MemoryManager';
import type { Memory, MemoryStorageOptions, MemoryRetrievalOptions } from './MemoryManager';
import { EmbeddingManager } from './EmbeddingManager';

/**
 * Options for batch memory storage
 */
export interface BatchMemoryStorageOptions {
  /**
   * Default source for all memories in the batch
   */
  defaultSource?: string;
  
  /**
   * Default context for all memories in the batch
   */
  defaultContext?: string;
  
  /**
   * Default importance for all memories in the batch
   */
  defaultImportance?: number;
  
  /**
   * Default metadata for all memories in the batch
   */
  defaultMetadata?: Record<string, any>;
  
  /**
   * Whether to generate embeddings for the memories
   * Default: true
   */
  generateEmbeddings?: boolean;
}

/**
 * Result of a batch memory operation
 */
export interface BatchOperationResult {
  /**
   * Number of successful operations
   */
  successful: number;
  
  /**
   * Number of failed operations
   */
  failed: number;
  
  /**
   * Array of successful memory IDs
   */
  successfulIds: string[];
  
  /**
   * Map of failed memory indices to error messages
   */
  errors: Map<number, string>;
  
  /**
   * Total time taken for the operation in milliseconds
   */
  timeTaken: number;
}

/**
 * Memory item for batch storage
 */
export interface MemoryItem {
  /**
   * Content of the memory
   */
  content: string;
  
  /**
   * Optional source of the memory
   * If not provided, the default source from options will be used
   */
  source?: string;
  
  /**
   * Optional context of the memory
   * If not provided, the default context from options will be used
   */
  context?: string;
  
  /**
   * Optional importance of the memory (1-10)
   * If not provided, the default importance from options will be used
   */
  importance?: number;
  
  /**
   * Optional metadata for the memory
   * If not provided, the default metadata from options will be used
   */
  metadata?: Record<string, any>;
}

/**
 * BatchMemoryManager extends MemoryManager to provide batch operations for memory storage and retrieval
 * This improves performance when dealing with large numbers of memories
 */
export class BatchMemoryManager {
  private memoryManager: MemoryManager;
  private agent: any;
  private embeddingManager: EmbeddingManager | null;
  
  /**
   * Create a new BatchMemoryManager
   * @param memoryManager The underlying MemoryManager to use
   */
  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    
    // Extract agent and embeddingManager from the memoryManager
    // This is a bit of a hack, but it allows us to access the agent's SQL functionality
    // and the embeddingManager for batch embedding generation
    this.agent = (memoryManager as any).agent;
    this.embeddingManager = (memoryManager as any).embeddingManager;
  }
  
  /**
   * Store multiple memories in a batch operation
   * This is more efficient than storing memories one by one
   * 
   * @param memories Array of memory items to store
   * @param options Batch storage options
   * @returns Result of the batch operation
   */
  async storeMemoriesBatch(
    memories: MemoryItem[],
    options: BatchMemoryStorageOptions = {}
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      successfulIds: [],
      errors: new Map(),
      timeTaken: 0
    };
    
    if (!memories || memories.length === 0) {
      result.timeTaken = Date.now() - startTime;
      return result;
    }
    
    try {
      // Ensure tables exist
      await this.ensureTablesExist();
      
      // Generate memory objects with IDs and timestamps
      const memoryObjects = memories.map((memory, index) => {
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        const importance = memory.importance || options.defaultImportance || 5;
        const context = memory.context || options.defaultContext;
        const source = memory.source || options.defaultSource;
        
        // Merge default metadata with memory-specific metadata
        const metadata = {
          ...(options.defaultMetadata || {}),
          ...(memory.metadata || {}),
          created: timestamp,
          lastAccessed: timestamp
        };
        
        return {
          id,
          timestamp,
          content: memory.content,
          importance,
          context,
          source,
          metadata: JSON.stringify(metadata),
          index // Keep track of the original index for error reporting
        };
      });
      
      // Generate embeddings in batch if requested
      let embeddingIds: (string | null)[] = new Array(memoryObjects.length).fill(null);
      
      if (this.embeddingManager && (options.generateEmbeddings !== false)) {
        try {
          // Generate embeddings in parallel batches of 10
          const batchSize = 10;
          for (let i = 0; i < memoryObjects.length; i += batchSize) {
            const batch = memoryObjects.slice(i, i + batchSize);
            const embeddingPromises = batch.map(async (memory) => {
              try {
                const embeddingId = await this.embeddingManager!.createEmbedding(memory.content, {
                  metadata: {
                    memory_id: memory.id,
                    timestamp: memory.timestamp,
                    context: memory.context,
                    source: memory.source,
                    importance: memory.importance
                  }
                });
                return { index: memory.index, embeddingId };
              } catch (error) {
                console.error(`Error generating embedding for memory at index ${memory.index}:`, error);
                return { index: memory.index, embeddingId: null };
              }
            });
            
            const embeddingResults = await Promise.all(embeddingPromises);
            
            // Assign embedding IDs to the correct positions in the array
            for (const { index, embeddingId } of embeddingResults) {
              embeddingIds[index] = embeddingId;
            }
          }
        } catch (error) {
          console.error("Error generating embeddings in batch:", error);
          // Continue without embeddings if there's an error
        }
      }
      
      // Store memories in the database using a transaction
      try {
        // Start a transaction
        await this.agent.sql`BEGIN TRANSACTION`;
        
        // Insert memories in batches of 50
        const batchSize = 50;
        for (let i = 0; i < memoryObjects.length; i += batchSize) {
          const batch = memoryObjects.slice(i, i + batchSize);
          
          // Prepare values for batch insert
          const values = batch.map((memory, batchIndex) => {
            const globalIndex = i + batchIndex;
            return `(
              '${memory.id}', 
              ${memory.timestamp}, 
              '${memory.content.replace(/'/g, "''")}', 
              ${memory.importance}, 
              ${memory.context ? `'${memory.context.replace(/'/g, "''")}'` : 'NULL'}, 
              ${memory.source ? `'${memory.source.replace(/'/g, "''")}'` : 'NULL'}, 
              '${memory.metadata.replace(/'/g, "''")}',
              ${embeddingIds[globalIndex] ? `'${embeddingIds[globalIndex]}'` : 'NULL'}
            )`;
          }).join(', ');
          
          // Execute batch insert
          await this.agent.sql`
            INSERT INTO episodic_memories (
              id, timestamp, content, importance, context, source, metadata, embedding_id
            ) VALUES ${this.agent.sql.raw(values)}
          `;
          
          // Update successful count
          result.successful += batch.length;
          
          // Add successful IDs
          batch.forEach(memory => {
            result.successfulIds.push(memory.id);
          });
        }
        
        // Commit the transaction
        await this.agent.sql`COMMIT`;
      } catch (error) {
        // Rollback the transaction on error
        await this.agent.sql`ROLLBACK`;
        
        // Fall back to individual inserts if batch insert fails
        console.error("Batch insert failed, falling back to individual inserts:", error);
        
        // Reset counters
        result.successful = 0;
        result.successfulIds = [];
        
        // Insert memories individually
        for (let i = 0; i < memoryObjects.length; i++) {
          const memory = memoryObjects[i];
          try {
            await this.agent.sql`
              INSERT INTO episodic_memories (
                id, timestamp, content, importance, context, source, metadata, embedding_id
              ) VALUES (
                ${memory.id}, 
                ${memory.timestamp}, 
                ${memory.content}, 
                ${memory.importance}, 
                ${memory.context || null}, 
                ${memory.source || null}, 
                ${memory.metadata},
                ${embeddingIds[i] || null}
              )
            `;
            
            // Update successful count and IDs
            result.successful++;
            result.successfulIds.push(memory.id);
          } catch (error) {
            // Update failed count and errors
            result.failed++;
            result.errors.set(memory.index, error instanceof Error ? error.message : String(error));
          }
        }
      }
    } catch (error) {
      console.error("Error in batch memory storage:", error);
      
      // Update failed count for all memories
      result.failed = memories.length;
      memories.forEach((_, index) => {
        result.errors.set(index, error instanceof Error ? error.message : String(error));
      });
    }
    
    // Calculate time taken
    result.timeTaken = Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Retrieve memories in batches based on IDs
   * @param ids Array of memory IDs to retrieve
   * @returns Array of retrieved memories
   */
  async getMemoriesByIds(ids: string[]): Promise<Memory[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    try {
      // Ensure tables exist
      await this.ensureTablesExist();
      
      // Retrieve memories in batches of 50
      const batchSize = 50;
      const memories: Memory[] = [];
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        
        // Convert array of IDs to SQL IN clause
        const idList = batchIds.map(id => `'${id}'`).join(', ');
        
        // Execute batch query
        const result = await this.agent.sql.raw(`
          SELECT id, timestamp, content, context, source, metadata, embedding_id, importance
          FROM episodic_memories
          WHERE id IN (${idList})
        `);
        
        // Convert results to Memory objects
        for (const row of result) {
          memories.push({
            id: row.id,
            content: row.content,
            timestamp: row.timestamp,
            source: row.source,
            context: row.context,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            embedding_id: row.embedding_id
          });
        }
      }
      
      return memories;
    } catch (error) {
      console.error("Error retrieving memories by IDs:", error);
      
      // Fall back to individual retrieval if batch retrieval fails
      console.warn("Falling back to individual memory retrieval");
      
      const memories: Memory[] = [];
      for (const id of ids) {
        try {
          const memory = await this.memoryManager.getMemory(id);
          if (memory) {
            memories.push(memory);
          }
        } catch (error) {
          console.error(`Error retrieving memory ${id}:`, error);
          // Continue with the next memory
        }
      }
      
      return memories;
    }
  }
  
  /**
   * Update multiple memories in a batch operation
   * @param updates Map of memory IDs to update objects
   * @returns Result of the batch operation
   */
  async updateMemoriesBatch(
    updates: Map<string, Partial<Omit<Memory, "id">>>
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      successfulIds: [],
      errors: new Map(),
      timeTaken: 0
    };
    
    if (!updates || updates.size === 0) {
      result.timeTaken = Date.now() - startTime;
      return result;
    }
    
    try {
      // Ensure tables exist
      await this.ensureTablesExist();
      
      // Get all memory IDs
      const memoryIds = Array.from(updates.keys());
      
      // Get existing memories to check if they exist and to get embedding IDs
      const existingMemories = await this.getMemoriesByIds(memoryIds);
      const existingMemoriesMap = new Map<string, Memory>();
      
      for (const memory of existingMemories) {
        existingMemoriesMap.set(memory.id, memory);
      }
      
      // Start a transaction
      await this.agent.sql`BEGIN TRANSACTION`;
      
      try {
        // Process each update
        let index = 0;
        for (const [id, update] of updates.entries()) {
          try {
            // Check if the memory exists
            const existingMemory = existingMemoriesMap.get(id);
            if (!existingMemory) {
              throw new Error(`Memory with ID ${id} not found`);
            }
            
            // Update embedding if content is being updated and we have an embedding manager
            if (update.content !== undefined && this.embeddingManager && existingMemory.embedding_id) {
              try {
                // Update the embedding in Vectorize
                await this.embeddingManager.updateEmbedding(existingMemory.embedding_id, update.content);
              } catch (error) {
                console.error(`Failed to update embedding for memory ${id}:`, error);
                // Continue with the update even if embedding update fails
              }
            } else if (update.content !== undefined && this.embeddingManager && !existingMemory.embedding_id) {
              // If content is updated but no embedding exists, create a new one
              try {
                const embedding_id = await this.embeddingManager.createEmbedding(update.content, {
                  metadata: {
                    memory_id: id,
                    timestamp: existingMemory.timestamp,
                    context: existingMemory.context,
                    source: existingMemory.source
                  }
                });
                
                // Update the embedding_id in the database
                await this.agent.sql`
                  UPDATE episodic_memories 
                  SET embedding_id = ${embedding_id}
                  WHERE id = ${id}
                `;
              } catch (error) {
                console.error(`Failed to create embedding for updated memory ${id}:`, error);
                // Continue with the update even if embedding creation fails
              }
            }
            
            // Build the SET clause for the SQL query
            const setClauses = [];
            
            if (update.content !== undefined) {
              setClauses.push(`content = '${update.content.replace(/'/g, "''")}'`);
            }
            
            if (update.timestamp !== undefined) {
              setClauses.push(`timestamp = ${update.timestamp}`);
            }
            
            if (update.source !== undefined) {
              setClauses.push(`source = ${update.source ? `'${update.source.replace(/'/g, "''")}'` : 'NULL'}`);
            }
            
            if (update.context !== undefined) {
              setClauses.push(`context = ${update.context ? `'${update.context.replace(/'/g, "''")}'` : 'NULL'}`);
            }
            
            if (update.metadata !== undefined) {
              const metadataJson = JSON.stringify(update.metadata);
              setClauses.push(`metadata = '${metadataJson.replace(/'/g, "''")}'`);
            }
            
            if (update.embedding_id !== undefined) {
              setClauses.push(`embedding_id = ${update.embedding_id ? `'${update.embedding_id}'` : 'NULL'}`);
            }
            
            // Execute the update if there are any SET clauses
            if (setClauses.length > 0) {
              const setClause = setClauses.join(', ');
              await this.agent.sql.raw(`
                UPDATE episodic_memories 
                SET ${setClause}
                WHERE id = '${id}'
              `);
            }
            
            // Update successful count and IDs
            result.successful++;
            result.successfulIds.push(id);
          } catch (error) {
            // Update failed count and errors
            result.failed++;
            result.errors.set(index, error instanceof Error ? error.message : String(error));
          }
          
          index++;
        }
        
        // Commit the transaction
        await this.agent.sql`COMMIT`;
      } catch (error) {
        // Rollback the transaction on error
        await this.agent.sql`ROLLBACK`;
        
        // Fall back to individual updates if batch update fails
        console.error("Batch update failed, falling back to individual updates:", error);
        
        // Reset counters
        result.successful = 0;
        result.successfulIds = [];
        result.failed = 0;
        result.errors.clear();
        
        // Update memories individually
        let index = 0;
        for (const [id, update] of updates.entries()) {
          try {
            const success = await this.memoryManager.updateMemory(id, update);
            
            if (success) {
              // Update successful count and IDs
              result.successful++;
              result.successfulIds.push(id);
            } else {
              // Update failed count and errors
              result.failed++;
              result.errors.set(index, `Failed to update memory ${id}`);
            }
          } catch (error) {
            // Update failed count and errors
            result.failed++;
            result.errors.set(index, error instanceof Error ? error.message : String(error));
          }
          
          index++;
        }
      }
    } catch (error) {
      console.error("Error in batch memory update:", error);
      
      // Update failed count for all updates
      result.failed = updates.size;
      let index = 0;
      for (const id of updates.keys()) {
        result.errors.set(index, error instanceof Error ? error.message : String(error));
        index++;
      }
    }
    
    // Calculate time taken
    result.timeTaken = Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Delete multiple memories in a batch operation
   * @param ids Array of memory IDs to delete
   * @returns Result of the batch operation
   */
  async deleteMemoriesBatch(ids: string[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      successfulIds: [],
      errors: new Map(),
      timeTaken: 0
    };
    
    if (!ids || ids.length === 0) {
      result.timeTaken = Date.now() - startTime;
      return result;
    }
    
    try {
      // Ensure tables exist
      await this.ensureTablesExist();
      
      // Get existing memories to check if they exist and to get embedding IDs
      const existingMemories = await this.getMemoriesByIds(ids);
      const existingMemoriesMap = new Map<string, Memory>();
      
      for (const memory of existingMemories) {
        existingMemoriesMap.set(memory.id, memory);
      }
      
      // Delete embeddings if we have an embedding manager
      if (this.embeddingManager) {
        // Delete embeddings in parallel batches of 10
        const batchSize = 10;
        for (let i = 0; i < existingMemories.length; i += batchSize) {
          const batch = existingMemories.slice(i, i + batchSize);
          const embeddingPromises = batch.map(async (memory) => {
            if (memory.embedding_id) {
              try {
                await this.embeddingManager!.deleteEmbedding(memory.embedding_id);
                return { id: memory.id, success: true };
              } catch (error) {
                console.error(`Error deleting embedding for memory ${memory.id}:`, error);
                return { id: memory.id, success: false };
              }
            }
            return { id: memory.id, success: true };
          });
          
          await Promise.all(embeddingPromises);
        }
      }
      
      // Start a transaction
      await this.agent.sql`BEGIN TRANSACTION`;
      
      try {
        // Delete memories in batches of 50
        const batchSize = 50;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batchIds = ids.slice(i, i + batchSize);
          
          // Convert array of IDs to SQL IN clause
          const idList = batchIds.map(id => `'${id}'`).join(', ');
          
          // Execute batch delete
          await this.agent.sql.raw(`
            DELETE FROM episodic_memories
            WHERE id IN (${idList})
          `);
          
          // Update successful count and IDs for memories that existed
          for (const id of batchIds) {
            if (existingMemoriesMap.has(id)) {
              result.successful++;
              result.successfulIds.push(id);
            } else {
              // Update failed count and errors for memories that didn't exist
              result.failed++;
              result.errors.set(i + batchIds.indexOf(id), `Memory with ID ${id} not found`);
            }
          }
        }
        
        // Commit the transaction
        await this.agent.sql`COMMIT`;
      } catch (error) {
        // Rollback the transaction on error
        await this.agent.sql`ROLLBACK`;
        
        // Fall back to individual deletes if batch delete fails
        console.error("Batch delete failed, falling back to individual deletes:", error);
        
        // Reset counters
        result.successful = 0;
        result.successfulIds = [];
        result.failed = 0;
        result.errors.clear();
        
        // Delete memories individually
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          try {
            const success = await this.memoryManager.deleteMemory(id);
            
            if (success) {
              // Update successful count and IDs
              result.successful++;
              result.successfulIds.push(id);
            } else {
              // Update failed count and errors
              result.failed++;
              result.errors.set(i, `Failed to delete memory ${id}`);
            }
          } catch (error) {
            // Update failed count and errors
            result.failed++;
            result.errors.set(i, error instanceof Error ? error.message : String(error));
          }
        }
      }
    } catch (error) {
      console.error("Error in batch memory deletion:", error);
      
      // Update failed count for all deletions
      result.failed = ids.length;
      for (let i = 0; i < ids.length; i++) {
        result.errors.set(i, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Calculate time taken
    result.timeTaken = Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Ensure database tables exist
   * This is a helper method that calls the same method on the underlying MemoryManager
   */
  private async ensureTablesExist(): Promise<void> {
    // Call the private method on the memoryManager using reflection
    const ensureTablesExist = (this.memoryManager as any).ensureTablesExist.bind(this.memoryManager);
    await ensureTablesExist();
  }
  
  /**
   * Get the underlying MemoryManager
   * This is useful for operations that are not batch operations
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
}
