/**
 * EmbeddingManager for the ImpossibleAgent
 * Responsible for generating and managing embeddings for semantic search
 */

/**
 * Interface for an embedding
 */
export interface Embedding {
  /**
   * The ID of the item this embedding represents
   */
  id: string;
  
  /**
   * The vector representation
   */
  vector: number[];
  
  /**
   * The original text that was embedded
   */
  text: string;
  
  /**
   * Timestamp when the embedding was created
   */
  timestamp: number;
  
  /**
   * Type of the embedding (e.g., "memory", "query", "document")
   */
  type: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Options for embedding generation
 */
export interface EmbeddingOptions {
  /**
   * Type of the embedding
   */
  type?: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Options for similarity search
 */
export interface SimilaritySearchOptions {
  /**
   * Minimum similarity score (0-1)
   */
  minScore?: number;
  
  /**
   * Maximum number of results
   */
  limit?: number;
  
  /**
   * Filter by type
   */
  type?: string;
  
  /**
   * Filter by metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Result of a similarity search
 */
export interface SimilarityResult {
  /**
   * The embedding that matched
   */
  embedding: Embedding;
  
  /**
   * Similarity score (0-1)
   */
  score: number;
}

/**
 * EmbeddingManager class for generating and managing embeddings
 */
export class EmbeddingManager {
  private embeddings: Map<string, Embedding>;
  private dimensions: number;
  private modelName: string;
  
  constructor(options: { dimensions?: number; modelName?: string } = {}) {
    this.embeddings = new Map();
    this.dimensions = options.dimensions || 384; // Default dimension for embeddings
    this.modelName = options.modelName || "mock-embedding-model";
  }
  
  /**
   * Initialize the embedding manager
   */
  async initialize(): Promise<void> {
    console.log("Initializing embedding manager");
    
    // Initialize with some sample embeddings for testing
    await this.initializeSampleEmbeddings();
    
    // In a real implementation, this would:
    // 1. Connect to the embedding model service
    // 2. Load existing embeddings from storage
    // 3. Set up any necessary caching
  }

  /**
   * Generate an embedding for text
   */
  async generateEmbedding(
    text: string,
    id: string = crypto.randomUUID(),
    options: EmbeddingOptions = {}
  ): Promise<Embedding> {
    // In a real implementation, this would call an embedding model API
    // For now, we'll just generate a random vector
    
    const { type = "generic", metadata = {} } = options;
    
    // Generate a deterministic vector based on the text
    // This is just for demonstration - real embeddings would come from a model
    const vector = this.generateMockEmbedding(text);
    
    const embedding: Embedding = {
      id,
      vector,
      text,
      timestamp: Date.now(),
      type,
      metadata
    };
    
    // Store the embedding
    this.embeddings.set(id, embedding);
    
    return embedding;
  }

  /**
   * Get an embedding by ID
   */
  async getEmbedding(id: string): Promise<Embedding | null> {
    return this.embeddings.get(id) || null;
  }

  /**
   * Find similar embeddings
   */
  async findSimilar(
    query: string | number[] | Embedding,
    options: SimilaritySearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const {
      minScore = 0.7,
      limit = 10,
      type,
      metadata
    } = options;
    
    // Get query vector
    let queryVector: number[];
    
    if (typeof query === "string") {
      // Generate embedding for the query text
      const embedding = await this.generateEmbedding(query, "temp-query", { type: "query" });
      queryVector = embedding.vector;
    } else if (Array.isArray(query)) {
      // Use provided vector
      queryVector = query;
    } else {
      // Use provided embedding
      queryVector = query.vector;
    }
    
    // Calculate similarity scores
    const results: SimilarityResult[] = [];
    
    for (const embedding of this.embeddings.values()) {
      // Skip if type doesn't match
      if (type && embedding.type !== type) {
        continue;
      }
      
      // Skip if metadata doesn't match
      if (metadata && !this.matchesMetadata(embedding.metadata, metadata)) {
        continue;
      }
      
      // Calculate cosine similarity
      const score = this.cosineSimilarity(queryVector, embedding.vector);
      
      // Add to results if above minimum score
      if (score >= minScore) {
        results.push({
          embedding,
          score
        });
      }
    }
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    // Limit results
    return results.slice(0, limit);
  }

  /**
   * Delete an embedding
   */
  async deleteEmbedding(id: string): Promise<boolean> {
    return this.embeddings.delete(id);
  }

  /**
   * Update an embedding's metadata
   */
  async updateEmbeddingMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    const embedding = this.embeddings.get(id);
    
    if (!embedding) {
      return false;
    }
    
    embedding.metadata = {
      ...embedding.metadata,
      ...metadata
    };
    
    return true;
  }
  
  /**
   * Extract the vector from an embedding
   * This is a utility method to help with compatibility with code that expects raw vectors
   */
  getVector(embedding: Embedding | string): number[] {
    if (typeof embedding === 'string') {
      const storedEmbedding = this.embeddings.get(embedding);
      if (!storedEmbedding) {
        throw new Error(`Embedding with ID ${embedding} not found`);
      }
      return storedEmbedding.vector;
    }
    
    return embedding.vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions");
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Check if an embedding's metadata matches the filter
   */
  private matchesMetadata(
    embeddingMetadata: Record<string, any> = {},
    filterMetadata: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(filterMetadata)) {
      if (embeddingMetadata[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate a mock embedding vector
   * This is just for demonstration - real embeddings would come from a model
   */
  private generateMockEmbedding(text: string): number[] {
    // Create a deterministic vector based on the text
    // This is just a simple hash function to generate consistent vectors
    const vector = new Array(this.dimensions).fill(0);
    
    // Simple hash function to generate values
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const position = i % this.dimensions;
      vector[position] = (vector[position] + charCode / 255) % 1;
    }
    
    // Normalize the vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    return vector;
  }

  /**
   * Initialize sample embeddings for testing
   */
  private initializeSampleEmbeddings() {
    const sampleTexts = [
      {
        text: "The user mentioned they prefer dark mode in all applications.",
        type: "memory",
        metadata: { source: "conversation", context: "preferences" }
      },
      {
        text: "The user's favorite color is blue, as mentioned during the onboarding process.",
        type: "memory",
        metadata: { source: "onboarding", context: "preferences" }
      },
      {
        text: "The user asked about integrating with Google Calendar on March 15, 2025.",
        type: "memory",
        metadata: { source: "conversation", context: "integrations" }
      },
      {
        text: "The user mentioned they work as a software developer at TechCorp.",
        type: "memory",
        metadata: { source: "conversation", context: "professional" }
      },
      {
        text: "The user's birthday is on July 12th.",
        type: "memory",
        metadata: { source: "profile", context: "personal" }
      }
    ];
    
    for (const sample of sampleTexts) {
      this.generateEmbedding(sample.text, crypto.randomUUID(), {
        type: sample.type,
        metadata: sample.metadata
      });
    }
  }
}
