import { Agent } from "agents";

/**
 * Interface for knowledge entries
 */
export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  category: string;
  tags: string[];
  confidence: number;
  created: number;
  updated: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for knowledge query results
 */
export interface KnowledgeQueryResult {
  entries: KnowledgeEntry[];
  totalCount: number;
  relevanceScores?: Record<string, number>;
}

/**
 * KnowledgeBase manages the agent's knowledge entries
 * and provides methods for storing, retrieving, and querying knowledge
 */
export class KnowledgeBase<Env> {
  /**
   * Create a new KnowledgeBase instance
   * @param agent The agent instance to manage knowledge for
   */
  constructor(private agent: Agent<Env>) {}

  /**
   * Initialize the knowledge base with necessary database tables
   */
  async initialize() {
    // Create knowledge table if it doesn't exist
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL,
        confidence REAL NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        metadata TEXT
      )
    `;

    // Create knowledge embedding table for vector search
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        id TEXT PRIMARY KEY,
        knowledge_id TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_entries(id) 
          ON DELETE CASCADE
      )
    `;

    // Create indexes for better performance
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_confidence ON knowledge_entries(confidence)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created)`;
    
    // Add indexes for content search queries
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_content ON knowledge_entries(content)`;
    
    // Add composite indexes for common query patterns
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_category_confidence ON knowledge_entries(category, confidence)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_category_updated ON knowledge_entries(category, updated)`;
    
    // Add indexes for knowledge embeddings
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_knowledge_id ON knowledge_embeddings(knowledge_id)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_created_at ON knowledge_embeddings(created_at)`;
    
    // Add recommended indexes from sql-index-recommendations.md
    // Knowledge graph indexes for entity type and relationship queries
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_source_confidence ON knowledge_entries(source, confidence)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_entries(tags)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_content_confidence ON knowledge_entries(content, confidence)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_knowledge_source_category_confidence ON knowledge_entries(source, category, confidence)`;
  }

  /**
   * Store a new knowledge entry
   * @param entry The knowledge entry to store
   * @returns The ID of the stored entry
   */
  async storeKnowledge(entry: {
    content: string;
    source: string;
    category: string;
    tags: string[];
    confidence: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.agent.sql`
      INSERT INTO knowledge_entries (
        id, content, source, category, tags, confidence, created, updated, metadata
      ) VALUES (
        ${id},
        ${entry.content},
        ${entry.source},
        ${entry.category},
        ${JSON.stringify(entry.tags)},
        ${entry.confidence},
        ${timestamp},
        ${timestamp},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}
      )
    `;
    
    // In a real implementation, we would generate and store embeddings here
    // await this.storeEmbedding(id, entry.content);
    
    return id;
  }

  /**
   * Update an existing knowledge entry
   * @param id ID of the entry to update
   * @param updates Updates to apply to the entry
   * @returns Success status
   */
  async updateKnowledge(id: string, updates: {
    content?: string;
    source?: string;
    category?: string;
    tags?: string[];
    confidence?: number;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const timestamp = Date.now();
    
    // Update each field separately with individual SQL queries
    // This is the recommended approach for the Cloudflare Agents SDK
    
    // Always update the 'updated' timestamp
    await this.agent.sql`
      UPDATE knowledge_entries
      SET updated = ${timestamp}
      WHERE id = ${id}
    `;
    
    // Update content if provided
    if (updates.content !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET content = ${updates.content}
        WHERE id = ${id}
      `;
    }
    
    // Update source if provided
    if (updates.source !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET source = ${updates.source}
        WHERE id = ${id}
      `;
    }
    
    // Update category if provided
    if (updates.category !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET category = ${updates.category}
        WHERE id = ${id}
      `;
    }
    
    // Update tags if provided
    if (updates.tags !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET tags = ${JSON.stringify(updates.tags)}
        WHERE id = ${id}
      `;
    }
    
    // Update confidence if provided
    if (updates.confidence !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET confidence = ${updates.confidence}
        WHERE id = ${id}
      `;
    }
    
    // Update metadata if provided
    if (updates.metadata !== undefined) {
      await this.agent.sql`
        UPDATE knowledge_entries
        SET metadata = ${JSON.stringify(updates.metadata)}
        WHERE id = ${id}
      `;
    }
    
    // In a real implementation, we would update embeddings if content changed
    // if (updates.content) {
    //   await this.updateEmbedding(id, updates.content);
    // }
    
    return true;
  }

  /**
   * Delete a knowledge entry
   * @param id ID of the entry to delete
   * @returns Success status
   */
  async deleteKnowledge(id: string): Promise<boolean> {
    await this.agent.sql`DELETE FROM knowledge_entries WHERE id = ${id}`;
    return true;
  }

  /**
   * Get a knowledge entry by ID
   * @param id ID of the entry to get
   * @returns The knowledge entry or null if not found
   */
  async getKnowledgeById(id: string): Promise<KnowledgeEntry | null> {
    const entries = await this.agent.sql`
      SELECT * FROM knowledge_entries WHERE id = ${id}
    `;
    
    if (entries.length === 0) {
      return null;
    }
    
    const entry = entries[0];
    
    return {
      id: entry.id as string,
      content: entry.content as string,
      source: entry.source as string,
      category: entry.category as string,
      tags: JSON.parse(entry.tags as string),
      confidence: entry.confidence as number,
      created: entry.created as number,
      updated: entry.updated as number,
      metadata: entry.metadata ? JSON.parse(entry.metadata as string) : undefined
    };
  }

  /**
   * Query knowledge entries by category
   * @param category Category to filter by
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Query results
   */
  async getKnowledgeByCategory(category: string, limit: number = 10, offset: number = 0): Promise<KnowledgeQueryResult> {
    const entries = await this.agent.sql`
      SELECT * FROM knowledge_entries
      WHERE category = ${category}
      ORDER BY confidence DESC, updated DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const countResult = await this.agent.sql`
      SELECT COUNT(*) as count FROM knowledge_entries
      WHERE category = ${category}
    `;
    
    const totalCount = countResult[0].count as number;
    
    return {
      entries: entries.map(entry => ({
        id: entry.id as string,
        content: entry.content as string,
        source: entry.source as string,
        category: entry.category as string,
        tags: JSON.parse(entry.tags as string),
        confidence: entry.confidence as number,
        created: entry.created as number,
        updated: entry.updated as number,
        metadata: entry.metadata ? JSON.parse(entry.metadata as string) : undefined
      })),
      totalCount
    };
  }

  /**
   * Search knowledge entries by keywords
   * @param query Search query
   * @param limit Maximum number of entries to return
   * @returns Query results
   */
  async searchKnowledge(query: string, limit: number = 10): Promise<KnowledgeQueryResult> {
    // Split the query into keywords
    const keywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    if (keywords.length === 0) {
      return {
        entries: [],
        totalCount: 0
      };
    }
    
    // Use the recommended SQL tagged template literals pattern
    // Instead of building a dynamic query string
    let results: any[] = [];
    
    // For each keyword, perform a separate query and combine results
    // This follows the recommended pattern from sql-query-patterns.md
    const allResults: any[] = [];
    
    for (const keyword of keywords) {
      const likePattern = `%${keyword}%`;
      
      // Query for content matches
      const contentResults = await this.agent.sql`
        SELECT id, content, source, category, tags, confidence, created, updated, metadata
        FROM knowledge_entries
        WHERE content LIKE ${likePattern}
        ORDER BY confidence DESC
        LIMIT ${limit}
      `;
      
      // Query for tag matches
      const tagResults = await this.agent.sql`
        SELECT id, content, source, category, tags, confidence, created, updated, metadata
        FROM knowledge_entries
        WHERE tags LIKE ${likePattern}
        ORDER BY confidence DESC
        LIMIT ${limit}
      `;
      
      // Add results to the combined array
      allResults.push(...contentResults, ...tagResults);
    }
    
    // Remove duplicates by ID
    const uniqueIds = new Set<string>();
    results = allResults.filter(entry => {
      if (uniqueIds.has(entry.id)) {
        return false;
      }
      uniqueIds.add(entry.id);
      return true;
    });
    
    // Sort by confidence and limit results
    results.sort((a, b) => b.confidence - a.confidence);
    results = results.slice(0, limit);
    
    if (results.length === 0) {
      return {
        entries: [],
        totalCount: 0
      };
    }
    
    // Process results and calculate relevance scores
    const entries: KnowledgeEntry[] = [];
    const relevanceScores: Record<string, number> = {};
    
    for (const entry of results) {
      const id = entry.id as string;
      const content = (entry.content as string).toLowerCase();
      let totalScore = 0;
      
      // Calculate relevance score based on keyword frequency
      for (const keyword of keywords) {
        const keywordCount = content.split(keyword).length - 1;
        totalScore += keywordCount;
      }
      
      relevanceScores[id] = totalScore;
      
      entries.push({
        id: id,
        content: entry.content as string,
        source: entry.source as string,
        category: entry.category as string,
        tags: JSON.parse(entry.tags as string),
        confidence: entry.confidence as number,
        created: entry.created as number,
        updated: entry.updated as number,
        metadata: entry.metadata ? JSON.parse(entry.metadata as string) : undefined
      });
    }
    
    // Sort entries by relevance score and confidence
    entries.sort((a, b) => {
      const scoreA = relevanceScores[a.id] || 0;
      const scoreB = relevanceScores[b.id] || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If scores are equal, sort by confidence
      return b.confidence - a.confidence;
    });
    
    return {
      entries: entries.slice(0, limit),
      totalCount: entries.length,
      relevanceScores
    };
  }

  /**
   * Get all knowledge categories
   * @returns Array of category names and counts
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    const results = await this.agent.sql`
      SELECT category, COUNT(*) as count
      FROM knowledge_entries
      GROUP BY category
      ORDER BY count DESC
    `;
    
    return results.map(row => ({
      category: row.category as string,
      count: row.count as number
    }));
  }

  /**
   * Get all unique tags used in knowledge entries
   * @returns Array of tag names and counts
   */
  async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const entries = await this.agent.sql`
      SELECT tags FROM knowledge_entries
    `;
    
    // Count tag occurrences
    const tagCounts: Record<string, number> = {};
    
    for (const entry of entries) {
      const tags = JSON.parse(entry.tags as string);
      
      for (const tag of tags) {
        if (tagCounts[tag]) {
          tagCounts[tag]++;
        } else {
          tagCounts[tag] = 1;
        }
      }
    }
    
    // Convert to array and sort by count
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Import knowledge entries in bulk
   * @param entries Array of knowledge entries to import
   * @returns Number of entries imported
   */
  async bulkImport(entries: Array<{
    content: string;
    source: string;
    category: string;
    tags: string[];
    confidence: number;
    metadata?: Record<string, any>;
  }>): Promise<number> {
    let importedCount = 0;
    
    for (const entry of entries) {
      try {
        await this.storeKnowledge(entry);
        importedCount++;
      } catch (error) {
        console.error("Error importing knowledge entry:", error);
      }
    }
    
    return importedCount;
  }
}
