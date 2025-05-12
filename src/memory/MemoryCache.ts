import type { Memory } from './MemoryManager';

/**
 * Cache entry with expiration time
 */
interface CacheEntry<T> {
  /**
   * The cached data
   */
  data: T;
  
  /**
   * Expiration timestamp in milliseconds
   */
  expiresAt: number;
}

/**
 * Options for memory cache configuration
 */
export interface MemoryCacheOptions {
  /**
   * Maximum number of items to store in the cache
   * Default: 1000
   */
  maxSize?: number;
  
  /**
   * Default time-to-live for cache entries in milliseconds
   * Default: 5 minutes (300000ms)
   */
  defaultTtl?: number;
  
  /**
   * Whether to enable automatic cleanup of expired entries
   * Default: true
   */
  enableCleanup?: boolean;
  
  /**
   * Interval in milliseconds for automatic cleanup of expired entries
   * Only used if enableCleanup is true
   * Default: 1 minute (60000ms)
   */
  cleanupInterval?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Number of items currently in the cache
   */
  size: number;
  
  /**
   * Number of cache hits
   */
  hits: number;
  
  /**
   * Number of cache misses
   */
  misses: number;
  
  /**
   * Hit ratio (hits / (hits + misses))
   */
  hitRatio: number;
  
  /**
   * Number of expired items that were removed during cleanup
   */
  expiredRemoved: number;
  
  /**
   * Number of items that were evicted due to cache size limits
   */
  evicted: number;
}

/**
 * MemoryCache provides a caching mechanism for memories to improve performance
 * It implements a Least Recently Used (LRU) cache with time-based expiration
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry<Memory>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTtl: number;
  private cleanupInterval: number | null = null;
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private expiredRemoved: number = 0;
  private evicted: number = 0;
  
  /**
   * Create a new MemoryCache
   * @param options Cache configuration options
   */
  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.defaultTtl || 5 * 60 * 1000; // 5 minutes default TTL
    
    // Set up automatic cleanup if enabled
    if (options.enableCleanup !== false) {
      const interval = options.cleanupInterval || 60 * 1000; // 1 minute default cleanup interval
      this.startCleanupInterval(interval);
    }
  }
  
  /**
   * Get a memory from the cache
   * @param id Memory ID
   * @returns The memory if found and not expired, otherwise undefined
   */
  get(id: string): Memory | undefined {
    const entry = this.cache.get(id);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    // Check if the entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(id);
      this.removeFromAccessOrder(id);
      this.expiredRemoved++;
      this.misses++;
      return undefined;
    }
    
    // Update access order (move to end of array)
    this.updateAccessOrder(id);
    
    this.hits++;
    return entry.data;
  }
  
  /**
   * Set a memory in the cache
   * @param memory The memory to cache
   * @param ttl Optional time-to-live in milliseconds (defaults to the cache's defaultTtl)
   */
  set(memory: Memory, ttl?: number): void {
    const id = memory.id;
    const expiresAt = Date.now() + (ttl || this.defaultTtl);
    
    // If the cache is full and this is a new entry, evict the least recently used item
    if (!this.cache.has(id) && this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    // Add or update the cache entry
    this.cache.set(id, { data: memory, expiresAt });
    
    // Update access order
    this.updateAccessOrder(id);
  }
  
  /**
   * Set multiple memories in the cache
   * @param memories Array of memories to cache
   * @param ttl Optional time-to-live in milliseconds (defaults to the cache's defaultTtl)
   */
  setMany(memories: Memory[], ttl?: number): void {
    for (const memory of memories) {
      this.set(memory, ttl);
    }
  }
  
  /**
   * Check if a memory exists in the cache and is not expired
   * @param id Memory ID
   * @returns True if the memory exists and is not expired, otherwise false
   */
  has(id: string): boolean {
    const entry = this.cache.get(id);
    
    if (!entry) {
      return false;
    }
    
    // Check if the entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(id);
      this.removeFromAccessOrder(id);
      this.expiredRemoved++;
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a memory from the cache
   * @param id Memory ID
   * @returns True if the memory was in the cache and was deleted, otherwise false
   */
  delete(id: string): boolean {
    const result = this.cache.delete(id);
    
    if (result) {
      this.removeFromAccessOrder(id);
    }
    
    return result;
  }
  
  /**
   * Delete multiple memories from the cache
   * @param ids Array of memory IDs
   * @returns Number of memories that were deleted
   */
  deleteMany(ids: string[]): number {
    let count = 0;
    
    for (const id of ids) {
      if (this.delete(id)) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
  
  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      expiredRemoved: this.expiredRemoved,
      evicted: this.evicted
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.expiredRemoved = 0;
    this.evicted = 0;
  }
  
  /**
   * Clean up expired entries
   * @returns Number of expired entries that were removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(id);
        this.removeFromAccessOrder(id);
        removed++;
      }
    }
    
    this.expiredRemoved += removed;
    return removed;
  }
  
  /**
   * Start automatic cleanup interval
   * @param interval Cleanup interval in milliseconds
   */
  private startCleanupInterval(interval: number): void {
    // Clear any existing interval
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
    }
    
    // Set up new interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, interval) as unknown as number;
  }
  
  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Update the access order for a memory ID
   * @param id Memory ID
   */
  private updateAccessOrder(id: string): void {
    // Remove the ID from its current position
    this.removeFromAccessOrder(id);
    
    // Add it to the end (most recently used)
    this.accessOrder.push(id);
  }
  
  /**
   * Remove a memory ID from the access order array
   * @param id Memory ID
   */
  private removeFromAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  
  /**
   * Evict the least recently used item from the cache
   */
  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length > 0) {
      const lruId = this.accessOrder[0];
      this.cache.delete(lruId);
      this.accessOrder.shift();
      this.evicted++;
    }
  }
  
  /**
   * Destructor - clean up resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}
