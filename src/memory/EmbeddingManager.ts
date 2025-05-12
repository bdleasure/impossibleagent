/**
 * EmbeddingManager for the ImpossibleAgent
 * Responsible for generating and managing embeddings for semantic search using Cloudflare Vectorize
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
 * Interface for Vectorize environment
 */
export interface VectorizeEnv {
  VECTOR_DB: any; // Vectorize binding
  AI: any; // AI binding for embedding generation
}

/**
 * EmbeddingManager class for generating and managing embeddings with Cloudflare Vectorize
 */
export class EmbeddingManager {
  private agent: any;
  private env: VectorizeEnv;
  private modelName: string;
  private dimensions: number;
  
  constructor(options: { agent: any; modelName?: string; dimensions?: number }) {
    this.agent = options.agent;
    this.env = this.agent.env;
    this.modelName = options.modelName || "@cf/baai/bge-base-en-v1.5";
    this.dimensions = options.dimensions || 384; // Default dimension for embeddings
  }
  
  /**
   * Initialize the embedding manager
   */
  async initialize(): Promise<void> {
    console.log("Initializing embedding manager with Vectorize");
    
    // In a real implementation, this would:
    // 1. Verify the Vectorize index exists
    // 2. Verify the AI model is available
    // 3. Set up any necessary caching
    
    // Initialize with some sample embeddings for testing if needed
    // This is optional since we're using Vectorize for storage
    try {
      const count = await this.getEmbeddingCount();
      if (count === 0) {
        console.log("No embeddings found, initializing sample embeddings");
        await this.initializeSampleEmbeddings();
      } else {
        console.log(`Found ${count} existing embeddings in Vectorize`);
      }
    } catch (error) {
      console.error("Error checking embedding count:", error);
    }
  }

  /**
   * Get the count of embeddings in Vectorize
   * This is a utility method to check if we need to initialize sample embeddings
   */
  private async getEmbeddingCount(): Promise<number> {
    try {
      // This is a simple way to check if there are any vectors in the index
      // We'll just query for a random vector and limit to 1 result
      const randomVector = new Array(this.dimensions).fill(0).map(() => Math.random());
      const result = await this.env.VECTOR_DB.query(randomVector, {
        topK: 1,
        returnMetadata: true
      });
      
      // If we got any matches, there are embeddings in the index
      return result.matches?.length > 0 ? 1 : 0;
    } catch (error) {
      console.error("Error getting embedding count:", error);
      return 0;
    }
  }

  /**
   * Generate an embedding for text using Workers AI
   */
  async generateEmbedding(
    text: string,
    id: string = crypto.randomUUID(),
    options: EmbeddingOptions = {}
  ): Promise<Embedding> {
    const { type = "generic", metadata = {} } = options;
    
    try {
      // Generate embedding using Workers AI
      const embeddingResult = await this.env.AI.run(this.modelName, {
        text: [text]
      });
      
      // Extract the vector from the result
      const vector = embeddingResult.data[0];
      
      // Create the embedding object
      const embedding: Embedding = {
        id,
        vector,
        text,
        timestamp: Date.now(),
        type,
        metadata
      };
      
      // Store the embedding in Vectorize
      await this.storeEmbeddingInVectorize(embedding);
      
      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Store an embedding in Vectorize
   */
  private async storeEmbeddingInVectorize(embedding: Embedding): Promise<void> {
    try {
      // Prepare metadata for Vectorize
      // Include all the embedding properties except the vector itself
      const vectorizeMetadata = {
        id: embedding.id,
        text: embedding.text,
        timestamp: embedding.timestamp,
        type: embedding.type,
        ...embedding.metadata
      };
      
      // Insert the vector into Vectorize
      await this.env.VECTOR_DB.insert([
        {
          id: embedding.id,
          values: embedding.vector,
          metadata: vectorizeMetadata
        }
      ]);
      
      console.log(`Stored embedding ${embedding.id} in Vectorize`);
    } catch (error) {
      console.error("Error storing embedding in Vectorize:", error);
      throw new Error(`Failed to store embedding in Vectorize: ${error}`);
    }
  }

  /**
   * Get an embedding by ID
   */
  async getEmbedding(id: string): Promise<Embedding | null> {
    try {
      // Get the vector from Vectorize
      const vectors = await this.env.VECTOR_DB.getByIds([id]);
      
      if (vectors.length === 0) {
        return null;
      }
      
      const vector = vectors[0];
      const metadata = vector.metadata || {};
      
      // Reconstruct the embedding from the vector and metadata
      return {
        id: vector.id,
        vector: vector.values,
        text: metadata.text || "",
        timestamp: metadata.timestamp || Date.now(),
        type: metadata.type || "generic",
        metadata: this.extractCustomMetadata(metadata)
      };
    } catch (error) {
      console.error(`Error getting embedding ${id}:`, error);
      return null;
    }
  }

  /**
   * Extract custom metadata from Vectorize metadata
   * This removes the standard fields that we added to metadata
   */
  private extractCustomMetadata(metadata: Record<string, any>): Record<string, any> {
    const { id, text, timestamp, type, ...customMetadata } = metadata;
    return customMetadata;
  }

  /**
   * Find similar embeddings using Vectorize
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
    
    try {
      // Get query vector
      let queryVector: number[];
      
      if (typeof query === "string") {
        // Generate embedding for the query text
        const embeddingResult = await this.env.AI.run(this.modelName, {
          text: [query]
        });
        queryVector = embeddingResult.data[0];
      } else if (Array.isArray(query)) {
        // Use provided vector
        queryVector = query;
      } else {
        // Use provided embedding
        queryVector = query.vector;
      }
      
      // Prepare filter for Vectorize
      const filter: Record<string, any> = {};
      
      if (type) {
        filter.type = type;
      }
      
      if (metadata) {
        Object.assign(filter, metadata);
      }
      
      // Query Vectorize
      const queryOptions: any = {
        topK: limit,
        returnMetadata: "all"
      };
      
      // Add filter if we have any
      if (Object.keys(filter).length > 0) {
        queryOptions.filter = filter;
      }
      
      const results = await this.env.VECTOR_DB.query(queryVector, queryOptions);
      
      // Convert results to SimilarityResult objects
      return results.matches
        .filter((match: any) => match.score >= minScore)
        .map((match: any) => {
          const metadata = match.metadata || {};
          
          const embedding: Embedding = {
            id: match.id,
            vector: match.values || [],
            text: metadata.text || "",
            timestamp: metadata.timestamp || Date.now(),
            type: metadata.type || "generic",
            metadata: this.extractCustomMetadata(metadata)
          };
          
          return {
            embedding,
            score: match.score
          };
        });
    } catch (error) {
      console.error("Error finding similar embeddings:", error);
      return [];
    }
  }

  /**
   * Delete an embedding
   */
  async deleteEmbedding(id: string): Promise<boolean> {
    try {
      await this.env.VECTOR_DB.deleteByIds([id]);
      return true;
    } catch (error) {
      console.error(`Error deleting embedding ${id}:`, error);
      return false;
    }
  }

  /**
   * Update an embedding's metadata
   */
  async updateEmbeddingMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get the current embedding
      const embedding = await this.getEmbedding(id);
      
      if (!embedding) {
        return false;
      }
      
      // Update the metadata
      embedding.metadata = {
        ...embedding.metadata,
        ...metadata
      };
      
      // Store the updated embedding
      await this.storeEmbeddingInVectorize(embedding);
      
      return true;
    } catch (error) {
      console.error(`Error updating embedding metadata ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Create an embedding for text and store it in Vectorize
   * This is a wrapper around generateEmbedding with a more intuitive name
   */
  async createEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<string> {
    const id = crypto.randomUUID();
    const embedding = await this.generateEmbedding(text, id, options);
    return embedding.id;
  }
  
  /**
   * Update an embedding with new text
   * This regenerates the vector and updates the embedding in Vectorize
   */
  async updateEmbedding(
    id: string,
    newText: string
  ): Promise<boolean> {
    try {
      // Get the current embedding to preserve metadata
      const currentEmbedding = await this.getEmbedding(id);
      
      if (!currentEmbedding) {
        return false;
      }
      
      // Generate a new embedding for the updated text
      const embeddingResult = await this.env.AI.run(this.modelName, {
        text: [newText]
      });
      
      // Create the updated embedding object
      const updatedEmbedding: Embedding = {
        id,
        vector: embeddingResult.data[0],
        text: newText,
        timestamp: Date.now(),
        type: currentEmbedding.type,
        metadata: currentEmbedding.metadata
      };
      
      // Store the updated embedding in Vectorize
      await this.storeEmbeddingInVectorize(updatedEmbedding);
      
      return true;
    } catch (error) {
      console.error(`Error updating embedding ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Search for similar embeddings based on text query
   * This is a wrapper around findSimilar with a more intuitive name
   */
  async searchSimilarEmbeddings(
    query: string,
    options: SimilaritySearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: Record<string, any> }>> {
    try {
      const results = await this.findSimilar(query, options);
      
      return results.map(result => ({
        id: result.embedding.id,
        score: result.score,
        metadata: result.embedding.metadata
      }));
    } catch (error) {
      console.error("Error searching similar embeddings:", error);
      return [];
    }
  }

  /**
   * Extract the vector from an embedding
   * This is a utility method to help with compatibility with code that expects raw vectors
   */
  async getVector(embedding: Embedding | string): Promise<number[]> {
    if (typeof embedding === 'string') {
      const storedEmbedding = await this.getEmbedding(embedding);
      if (!storedEmbedding) {
        throw new Error(`Embedding with ID ${embedding} not found`);
      }
      return storedEmbedding.vector;
    }
    
    return embedding.vector;
  }

  /**
   * Initialize sample embeddings for testing
   */
  private async initializeSampleEmbeddings(): Promise<void> {
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
      await this.generateEmbedding(sample.text, crypto.randomUUID(), {
        type: sample.type,
        metadata: sample.metadata
      });
    }
    
    console.log("Sample embeddings initialized successfully");
  }
}
