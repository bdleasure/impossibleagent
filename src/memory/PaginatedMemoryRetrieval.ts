import type { Memory, MemoryRetrievalOptions as BaseMemoryRetrievalOptions } from './MemoryManager';
import { MemoryManager } from './MemoryManager';

/**
 * Extended options for memory retrieval with additional filtering and sorting capabilities
 */
export interface MemoryRetrievalOptions extends BaseMemoryRetrievalOptions {
  /**
   * Minimum importance level (inclusive)
   */
  minImportance?: number;
  
  /**
   * Maximum importance level (inclusive)
   */
  maxImportance?: number;
  
  /**
   * Search term to look for in memory content
   */
  contentSearch?: string;
  
  /**
   * Whether to sort by importance (descending) instead of timestamp
   */
  sortByImportance?: boolean;
}

/**
 * Pagination options for memory retrieval
 */
export interface PaginationOptions {
  /**
   * Page number (1-based)
   * Default: 1
   */
  page?: number;
  
  /**
   * Number of items per page
   * Default: 20
   */
  pageSize?: number;
  
  /**
   * Whether to include total count in the result
   * This may add overhead to the query
   * Default: true
   */
  includeTotal?: boolean;
}

/**
 * Result of a paginated memory retrieval
 */
export interface PaginatedResult<T> {
  /**
   * Array of items for the current page
   */
  items: T[];
  
  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Current page number
     */
    page: number;
    
    /**
     * Number of items per page
     */
    pageSize: number;
    
    /**
     * Total number of items (if includeTotal was true)
     */
    totalItems?: number;
    
    /**
     * Total number of pages (if includeTotal was true)
     */
    totalPages?: number;
    
    /**
     * Whether there is a previous page
     */
    hasPrevPage: boolean;
    
    /**
     * Whether there is a next page
     */
    hasNextPage: boolean;
    
    /**
     * Previous page number (if available)
     */
    prevPage: number | null;
    
    /**
     * Next page number (if available)
     */
    nextPage: number | null;
  };
}

/**
 * PaginatedMemoryRetrieval provides pagination capabilities for memory retrieval
 * This improves performance when dealing with large numbers of memories
 */
export class PaginatedMemoryRetrieval {
  private memoryManager: MemoryManager;
  private agent: any;
  
  /**
   * Create a new PaginatedMemoryRetrieval
   * @param memoryManager The underlying MemoryManager to use
   */
  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    
    // Extract agent from the memoryManager
    // This is a bit of a hack, but it allows us to access the agent's SQL functionality
    this.agent = (memoryManager as any).agent;
  }
  
  /**
   * Get memories with pagination
   * @param options Memory retrieval options
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async getMemories(
    options: MemoryRetrievalOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    // Ensure tables exist
    await this.ensureTablesExist();
    
    // Set default pagination values
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const includeTotal = pagination.includeTotal !== false;
    
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Build the base query
    let query = this.buildBaseQuery(options);
    
    // Add ORDER BY clause
    query += this.buildOrderByClause(options);
    
    // Get total count if requested
    let totalItems: number | undefined;
    let totalPages: number | undefined;
    
    if (includeTotal) {
      const countQuery = `SELECT COUNT(*) as count FROM episodic_memories ${this.buildWhereClause(options)}`;
      const countResult = await this.agent.sql.raw(countQuery);
      totalItems = countResult[0]?.count || 0;
      totalPages = totalItems !== undefined ? Math.ceil(totalItems / pageSize) : undefined;
    }
    
    // Add pagination
    query += ` LIMIT ${pageSize} OFFSET ${offset}`;
    
    // Execute the query
    const result = await this.agent.sql.raw(query);
    
    // Convert results to Memory objects
    const memories: Memory[] = result.map((row: any) => ({
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      source: row.source,
      context: row.context,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding_id: row.embedding_id,
      importance: row.importance
    }));
    
    // Calculate pagination metadata
    const hasPrevPage = page > 1;
    const hasNextPage = includeTotal ? (totalPages !== undefined && page < totalPages) : memories.length === pageSize;
    
    return {
      items: memories,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPrevPage,
        hasNextPage,
        prevPage: hasPrevPage ? page - 1 : null,
        nextPage: hasNextPage ? page + 1 : null
      }
    };
  }
  
  /**
   * Get memories by context with pagination
   * @param context Context to filter by
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async getMemoriesByContext(
    context: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    return this.getMemories({ context }, pagination);
  }
  
  /**
   * Get memories by source with pagination
   * @param source Source to filter by
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async getMemoriesBySource(
    source: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    return this.getMemories({ source }, pagination);
  }
  
  /**
   * Get memories by importance with pagination
   * @param minImportance Minimum importance level (inclusive)
   * @param maxImportance Maximum importance level (inclusive)
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async getMemoriesByImportance(
    minImportance: number,
    maxImportance: number = 10,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    return this.getMemories({ minImportance, maxImportance }, pagination);
  }
  
  /**
   * Get memories by time range with pagination
   * @param startTime Start timestamp (inclusive)
   * @param endTime End timestamp (inclusive)
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async getMemoriesByTimeRange(
    startTime: number,
    endTime: number = Date.now(),
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    return this.getMemories({ startTime, endTime }, pagination);
  }
  
  /**
   * Search memories by content with pagination
   * @param searchTerm Search term to look for in memory content
   * @param pagination Pagination options
   * @returns Paginated result with memories and pagination metadata
   */
  async searchMemories(
    searchTerm: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Memory>> {
    return this.getMemories({ contentSearch: searchTerm }, pagination);
  }
  
  /**
   * Build the base query for memory retrieval
   * @param options Memory retrieval options
   * @returns Base SQL query
   */
  private buildBaseQuery(options: MemoryRetrievalOptions): string {
    return `SELECT id, timestamp, content, context, source, metadata, embedding_id, importance FROM episodic_memories ${this.buildWhereClause(options)}`;
  }
  
  /**
   * Build the WHERE clause for the SQL query based on options
   * @param options Memory retrieval options
   * @returns WHERE clause for the SQL query
   */
  private buildWhereClause(options: MemoryRetrievalOptions): string {
    const conditions: string[] = [];
    
    // Add context filter
    if (options.context) {
      conditions.push(`context = '${options.context.replace(/'/g, "''")}'`);
    }
    
    // Add source filter
    if (options.source) {
      conditions.push(`source = '${options.source.replace(/'/g, "''")}'`);
    }
    
    // Add importance range filter
    if (options.minImportance !== undefined) {
      conditions.push(`importance >= ${options.minImportance}`);
    }
    if (options.maxImportance !== undefined) {
      conditions.push(`importance <= ${options.maxImportance}`);
    }
    
    // Add time range filter
    if (options.startTime !== undefined) {
      conditions.push(`timestamp >= ${options.startTime}`);
    }
    if (options.endTime !== undefined) {
      conditions.push(`timestamp <= ${options.endTime}`);
    }
    
    // Add content search filter
    if (options.contentSearch) {
      conditions.push(`content LIKE '%${options.contentSearch.replace(/'/g, "''")}%'`);
    }
    
    // Combine conditions
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }
  
  /**
   * Build the ORDER BY clause for the SQL query based on options
   * @param options Memory retrieval options
   * @returns ORDER BY clause for the SQL query
   */
  private buildOrderByClause(options: MemoryRetrievalOptions): string {
    // Default sort is by timestamp descending (newest first)
    let orderBy = 'timestamp DESC';
    
    // Override with importance if specified
    if (options.sortByImportance) {
      orderBy = 'importance DESC, timestamp DESC';
    }
    
    return ` ORDER BY ${orderBy}`;
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
   * This is useful for operations that are not paginated
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
}
