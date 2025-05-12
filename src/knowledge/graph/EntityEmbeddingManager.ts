import { Agent } from "agents";
import type { Entity } from "./types";

/**
 * Interface for an entity embedding
 */
export interface EntityEmbedding {
  /**
   * The ID of the entity this embedding represents
   */
  id: string;
  
  /**
   * The vector representation
   */
  vector: number[];
  
  /**
   * The original entity name and type that was embedded
   */
  text: string;
  
  /**
   * Timestamp when the embedding was created
   */
  timestamp: number;
  
  /**
   * Type of the entity
   */
  entityType: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Options for entity embedding generation
 */
export interface EntityEmbeddingOptions {
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Options for similarity search
 */
export interface EntitySimilaritySearchOptions {
  /**
   * Minimum similarity score (0-1)
   */
  minScore?: number;
  
  /**
   * Maximum number of results
   */
  limit?: number;
  
  /**
   * Filter by entity type
   */
  entityType?: string;
  
  /**
   * Filter by metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Result of a similarity search
 */
export interface EntitySimilarityResult {
  /**
   * The entity ID that matched
   */
  entityId: string;
  
  /**
   * Similarity score (0-1)
   */
  score: number;
  
  /**
   * Entity type
   */
  entityType: string;
  
  /**
   * Entity name
   */
  entityName: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for Vectorize environment
 */
export interface VectorizeEnv {
  VECTOR_DB: any; // Vectorize binding
  AI: any; // AI binding for embedding generation
}

/**
 * EntityEmbeddingManager class for generating and managing entity embeddings with Cloudflare Vectorize
 * This class is responsible for creating and managing vector embeddings for entities in the knowledge graph
 */
export class EntityEmbeddingManager<Env extends VectorizeEnv> {
  private agent: Agent<Env>;
  private vectorDB: any;
  private aiModel: any;
  private modelName: string;
  private dimensions: number;
  private vectorNamespace: string = "entity"; // Namespace to distinguish entity embeddings from other embeddings
  
  /**
   * Create a new EntityEmbeddingManager
   * @param agent The agent instance
   * @param options Configuration options
   */
  constructor(agent: Agent<Env>, options: { modelName?: string; dimensions?: number } = {}) {
    this.agent = agent;
    // Access environment bindings through the constructor
    this.vectorDB = (agent as any).env?.VECTOR_DB;
    this.aiModel = (agent as any).env?.AI;
    this.modelName = options.modelName || "@cf/baai/bge-base-en-v1.5";
    this.dimensions = options.dimensions || 384; // Default dimension for embeddings
  }
  
  /**
   * Initialize the entity embedding manager
   */
  async initialize(): Promise<void> {
    console.log("Initializing entity embedding manager with Vectorize");
    
    try {
      // Check if we have any entity embeddings
      const count = await this.getEntityEmbeddingCount();
      console.log(`Found ${count} existing entity embeddings in Vectorize`);
    } catch (error) {
      console.error("Error checking entity embedding count:", error);
    }
  }

  /**
   * Get the count of entity embeddings in Vectorize
   */
  private async getEntityEmbeddingCount(): Promise<number> {
    try {
      // Query for entity embeddings with the entity namespace
      const randomVector = new Array(this.dimensions).fill(0).map(() => Math.random());
      const result = await this.vectorDB.query(randomVector, {
        topK: 1,
        returnMetadata: true,
        filter: { namespace: this.vectorNamespace }
      });
      
      // If we got any matches, there are embeddings in the index
      return result.matches?.length > 0 ? 1 : 0;
    } catch (error) {
      console.error("Error getting entity embedding count:", error);
      return 0;
    }
  }

  /**
   * Generate an embedding for an entity
   * @param entity The entity to generate an embedding for
   * @param options Additional options
   * @returns The generated embedding
   */
  async generateEntityEmbedding(
    entity: Entity,
    options: EntityEmbeddingOptions = {}
  ): Promise<EntityEmbedding> {
    const { metadata = {} } = options;
    
    try {
      // Create a text representation of the entity for embedding
      // Include both name and type to improve semantic search
      const embeddingText = `${entity.name} (${entity.type})`;
      
      // Generate embedding using Workers AI
      const embeddingResult = await this.aiModel.run(this.modelName, {
        text: [embeddingText]
      });
      
      // Extract the vector from the result
      const vector = embeddingResult.data[0];
      
      // Create the embedding object
      const embedding: EntityEmbedding = {
        id: entity.id,
        vector,
        text: embeddingText,
        timestamp: Date.now(),
        entityType: entity.type,
        metadata: {
          ...metadata,
          properties: entity.properties,
          confidence: entity.confidence,
          sources: entity.sources
        }
      };
      
      // Store the embedding in Vectorize
      await this.storeEntityEmbeddingInVectorize(embedding);
      
      return embedding;
    } catch (error) {
      console.error("Error generating entity embedding:", error);
      throw new Error(`Failed to generate entity embedding: ${error}`);
    }
  }

  /**
   * Store an entity embedding in Vectorize
   * @param embedding The embedding to store
   */
  private async storeEntityEmbeddingInVectorize(embedding: EntityEmbedding): Promise<void> {
    try {
      // Prepare metadata for Vectorize
      const vectorizeMetadata = {
        id: embedding.id,
        text: embedding.text,
        timestamp: embedding.timestamp,
        entityType: embedding.entityType,
        namespace: this.vectorNamespace, // Add namespace to distinguish entity embeddings
        ...embedding.metadata
      };
      
      // Insert the vector into Vectorize
      await this.vectorDB.insert([
        {
          id: `${this.vectorNamespace}:${embedding.id}`, // Prefix ID with namespace
          values: embedding.vector,
          metadata: vectorizeMetadata
        }
      ]);
      
      console.log(`Stored entity embedding ${embedding.id} in Vectorize`);
    } catch (error) {
      console.error("Error storing entity embedding in Vectorize:", error);
      throw new Error(`Failed to store entity embedding in Vectorize: ${error}`);
    }
  }

  /**
   * Get an entity embedding by ID
   * @param id The entity ID
   * @returns The entity embedding or null if not found
   */
  async getEntityEmbedding(id: string): Promise<EntityEmbedding | null> {
    try {
      // Get the vector from Vectorize
      const vectors = await this.vectorDB.getByIds([`${this.vectorNamespace}:${id}`]);
      
      if (vectors.length === 0) {
        return null;
      }
      
      const vector = vectors[0];
      const metadata = vector.metadata || {};
      
      // Reconstruct the embedding from the vector and metadata
      return {
        id: id, // Remove namespace prefix
        vector: vector.values,
        text: metadata.text || "",
        timestamp: metadata.timestamp || Date.now(),
        entityType: metadata.entityType || "",
        metadata: this.extractCustomMetadata(metadata)
      };
    } catch (error) {
      console.error(`Error getting entity embedding ${id}:`, error);
      return null;
    }
  }

  /**
   * Extract custom metadata from Vectorize metadata
   * This removes the standard fields that we added to metadata
   */
  private extractCustomMetadata(metadata: Record<string, any>): Record<string, any> {
    const { id, text, timestamp, entityType, namespace, ...customMetadata } = metadata;
    return customMetadata;
  }

  /**
   * Find similar entities using vector search
   * @param query The query text or vector
   * @param options Search options
   * @returns Array of similarity results
   */
  async findSimilarEntities(
    query: string | number[] | EntityEmbedding,
    options: EntitySimilaritySearchOptions = {}
  ): Promise<EntitySimilarityResult[]> {
    const {
      minScore = 0.7,
      limit = 10,
      entityType,
      metadata
    } = options;
    
    try {
      // Get query vector
      let queryVector: number[];
      
      if (typeof query === "string") {
        // Generate embedding for the query text
        const embeddingResult = await this.aiModel.run(this.modelName, {
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
      const filter: Record<string, any> = {
        namespace: this.vectorNamespace // Always filter by namespace
      };
      
      if (entityType) {
        filter.entityType = entityType;
      }
      
      if (metadata) {
        Object.assign(filter, metadata);
      }
      
      // Query Vectorize
      const queryOptions: any = {
        topK: limit,
        returnMetadata: "all",
        filter
      };
      
      const results = await this.vectorDB.query(queryVector, queryOptions);
      
      // Convert results to EntitySimilarityResult objects
      return results.matches
        .filter((match: any) => match.score >= minScore)
        .map((match: any) => {
          const metadata = match.metadata || {};
          
          return {
            entityId: metadata.id, // Use the original entity ID from metadata
            score: match.score,
            entityType: metadata.entityType || "",
            entityName: metadata.text?.split(" (")[0] || "", // Extract name from text
            metadata: this.extractCustomMetadata(metadata)
          };
        });
    } catch (error) {
      console.error("Error finding similar entities:", error);
      return [];
    }
  }

  /**
   * Delete an entity embedding
   * @param id The entity ID
   * @returns True if successful, false otherwise
   */
  async deleteEntityEmbedding(id: string): Promise<boolean> {
    try {
      await this.vectorDB.deleteByIds([`${this.vectorNamespace}:${id}`]);
      return true;
    } catch (error) {
      console.error(`Error deleting entity embedding ${id}:`, error);
      return false;
    }
  }

  /**
   * Update an entity embedding
   * @param entity The updated entity
   * @returns True if successful, false otherwise
   */
  async updateEntityEmbedding(entity: Entity): Promise<boolean> {
    try {
      // Delete the existing embedding
      await this.deleteEntityEmbedding(entity.id);
      
      // Generate a new embedding
      await this.generateEntityEmbedding(entity);
      
      return true;
    } catch (error) {
      console.error(`Error updating entity embedding ${entity.id}:`, error);
      return false;
    }
  }

  /**
   * Search for entities by text query using vector search
   * @param query The text query
   * @param options Search options
   * @returns Array of entity IDs and scores
   */
  async searchEntities(
    query: string,
    options: EntitySimilaritySearchOptions = {}
  ): Promise<EntitySimilarityResult[]> {
    try {
      return await this.findSimilarEntities(query, options);
    } catch (error) {
      console.error("Error searching entities:", error);
      return [];
    }
  }

  /**
   * Batch generate embeddings for multiple entities
   * @param entities Array of entities
   * @returns Array of generated embeddings
   */
  async batchGenerateEntityEmbeddings(
    entities: Entity[]
  ): Promise<EntityEmbedding[]> {
    try {
      // Create text representations for all entities
      const embeddingTexts = entities.map(entity => `${entity.name} (${entity.type})`);
      
      // Generate embeddings in a single API call
      const embeddingResult = await this.aiModel.run(this.modelName, {
        text: embeddingTexts
      });
      
      // Create embedding objects
      const embeddings: EntityEmbedding[] = entities.map((entity, index) => ({
        id: entity.id,
        vector: embeddingResult.data[index],
        text: embeddingTexts[index],
        timestamp: Date.now(),
        entityType: entity.type,
        metadata: {
          properties: entity.properties,
          confidence: entity.confidence,
          sources: entity.sources
        }
      }));
      
      // Store all embeddings in Vectorize
      await this.batchStoreEntityEmbeddings(embeddings);
      
      return embeddings;
    } catch (error) {
      console.error("Error batch generating entity embeddings:", error);
      throw new Error(`Failed to batch generate entity embeddings: ${error}`);
    }
  }

  /**
   * Batch store multiple entity embeddings in Vectorize
   * @param embeddings Array of embeddings to store
   */
  private async batchStoreEntityEmbeddings(embeddings: EntityEmbedding[]): Promise<void> {
    try {
      // Prepare vectors for Vectorize
      const vectors = embeddings.map(embedding => ({
        id: `${this.vectorNamespace}:${embedding.id}`, // Prefix ID with namespace
        values: embedding.vector,
        metadata: {
          id: embedding.id,
          text: embedding.text,
          timestamp: embedding.timestamp,
          entityType: embedding.entityType,
          namespace: this.vectorNamespace,
          ...embedding.metadata
        }
      }));
      
      // Insert all vectors in a single API call
      await this.vectorDB.insert(vectors);
      
      console.log(`Stored ${embeddings.length} entity embeddings in Vectorize`);
    } catch (error) {
      console.error("Error batch storing entity embeddings in Vectorize:", error);
      throw new Error(`Failed to batch store entity embeddings in Vectorize: ${error}`);
    }
  }

  /**
   * Batch delete multiple entity embeddings
   * @param ids Array of entity IDs
   * @returns True if successful, false otherwise
   */
  async batchDeleteEntityEmbeddings(ids: string[]): Promise<boolean> {
    try {
      // Prefix all IDs with namespace
      const prefixedIds = ids.map(id => `${this.vectorNamespace}:${id}`);
      
      // Delete all embeddings in a single API call
      await this.vectorDB.deleteByIds(prefixedIds);
      
      return true;
    } catch (error) {
      console.error("Error batch deleting entity embeddings:", error);
      return false;
    }
  }
}
