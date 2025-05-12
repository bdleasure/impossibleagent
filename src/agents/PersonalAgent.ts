import { Agent, unstable_callable as callable } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { streamText, createDataStreamResponse, type StreamTextOnFinishCallback, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { MemoryManager, type Memory } from "../memory/MemoryManager";
import { directMemoryQuery, isAskingAboutMemories, extractKeyTerms } from "./MemoryFix";
import { EmbeddingManager } from "../memory/EmbeddingManager";
import { TemporalContextManager } from "../memory/TemporalContextManager";
import { RelevanceRanking } from "../memory/RelevanceRanking";
import { LearningEnhancedMemoryRetrieval } from "../memory/LearningEnhancedMemoryRetrieval";
import { SecurityManager } from "../security/SecurityManager";
import { KnowledgeBase } from "../knowledge/KnowledgeBase";
import { KnowledgeExtractor } from "../knowledge/KnowledgeExtractor";
import { KnowledgeGraph } from "../knowledge/KnowledgeGraph";
import { LearningSystem } from "../knowledge/LearningSystem";
import type { Entity, Relationship, GraphQueryResult } from "../knowledge/graph/types";
// Tool-related imports removed as part of MCP refactoring

// Define interfaces for the agent's state
interface UserProfile {
  name?: string;
  interests?: string[];
  importantDates?: { description: string; date: string }[];
  firstInteraction?: string;
}

interface UserPreferences {
  theme: "light" | "dark";
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
  privacySettings: {
    shareData: boolean;
    storeHistory: boolean;
  };
}

interface ConversationEntry {
  id: string;
  messages: any[]; // Using any for now, will be replaced with proper Message type
  context: string;
  timestamp: number;
}

// Define the state interface for the PersonalAgent
interface PersonalAgentState {
  conversations: ConversationEntry[];
  userProfile: UserProfile;
  preferences: UserPreferences;
  lastActive: string;
}

/**
 * PersonalAgent extends AIChatAgent to provide a persistent, personalized AI companion
 * with enhanced memory capabilities and personalization features.
 */
export class PersonalAgent extends AIChatAgent<Env, PersonalAgentState> {
  // Initial state with default values
  initialState: PersonalAgentState = {
    conversations: [],
    userProfile: {
      firstInteraction: new Date().toISOString()
    },
    preferences: {
      theme: "dark",
      notificationPreferences: { email: false, push: true },
      privacySettings: { shareData: false, storeHistory: true }
    },
    lastActive: new Date().toISOString()
  };

  /**
   * Initialize the agent with necessary database tables and scheduled tasks
   */
  async initialize() {
    // Create memory tables
    await this.sql`
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
    
    // Add source column to existing tables if it doesn't exist
    try {
      // Check if the source column exists
      const tableInfo = await this.sql`PRAGMA table_info(episodic_memories)`;
      const hasSourceColumn = tableInfo.some((column: any) => column.name === 'source');
      
      if (!hasSourceColumn) {
        console.log("Adding source column to episodic_memories table...");
        await this.sql`ALTER TABLE episodic_memories ADD COLUMN source TEXT`;
      }
    } catch (error) {
      console.error("Error checking or adding source column:", error);
    }

    await this.sql`
      CREATE TABLE IF NOT EXISTS semantic_memories (
        id TEXT PRIMARY KEY,
        fact TEXT NOT NULL,
        confidence REAL NOT NULL,
        first_observed INTEGER NOT NULL,
        last_confirmed INTEGER,
        metadata TEXT
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS memory_connections (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_id) REFERENCES episodic_memories(id) 
          ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES episodic_memories(id) 
          ON DELETE CASCADE
      )
    `;

    // Create indexes for better performance
    await this.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memories(confidence)`;

    // Schedule regular memory consolidation
    this.schedule("0 3 * * *", "consolidateMemories");
  }

  /**
   * Handle incoming chat messages and generate a response
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // Update last active timestamp
    this.setState({
      ...this.state,
      lastActive: new Date().toISOString()
    });

    // Retrieve relevant memories for context
    const relevantMemories = await this.getRelevantMemories();
    
    // Create a streaming response that handles both text and tool outputs
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        // Create a system prompt that includes memory context
        const systemPrompt = `You are a personal AI companion with persistent memory.
        
Your name is ImpossibleAgent, a lifelong AI companion built on Cloudflare Agents SDK.

IMPORTANT: You have access to a sophisticated memory system that stores conversation history in a SQL database.
When users ask about your memory capabilities or if you can remember past conversations, you should confirm that
you CAN access the chat history and memories stored in the SQL database. You should never say you don't have
access to the database or past conversations.

${relevantMemories.length > 0 ? `Here are some relevant memories retrieved from the SQL database:
${relevantMemories.map(m => `- ${m.content}`).join('\n')}` : 'No relevant memories found in the database for this conversation yet.'}

${this.state.userProfile.name ? `The user's name is ${this.state.userProfile.name}.` : ''}

Maintain a warm, personalized tone and reference our shared history when relevant.
Be helpful, supportive, and remember important details about the user.
If asked about your memory capabilities, explain that you have a persistent memory system that allows you to remember past conversations.`;

        // Stream the AI response using GPT-4
        const result = streamText({
          model: openai("gpt-4o-2024-11-20"),
          system: systemPrompt,
          messages: this.messages,
          onFinish: async (args) => {
            // Extract potential new memories from the conversation
            await this.extractMemoriesFromConversation();
            
            onFinish(args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]);
          },
          onError: (error) => {
            console.error("Error while streaming:", error);
          },
          maxSteps: 10,
        });

        // Merge the AI response stream with tool execution outputs
        result.mergeIntoDataStream(dataStream);
      },
    });

    return dataStreamResponse;
  }

  /**
   * Extract memories and knowledge from the current conversation
   * This method uses KnowledgeExtractor and KnowledgeGraph to extract structured knowledge
   */
  private async extractMemoriesFromConversation() {
    if (this.messages.length === 0) return;
    
    // Get the last user message
    const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage || !lastUserMessage.content) return;
    
    // Get the content as string
    const content = typeof lastUserMessage.content === 'string' 
      ? lastUserMessage.content 
      : JSON.stringify(lastUserMessage.content);
    
    try {
      // Initialize components
      const memoryManager = new MemoryManager({ agent: this });
      const embeddingManager = new EmbeddingManager();
      const knowledgeBase = new KnowledgeBase(this);
      const knowledgeExtractor = new KnowledgeExtractor(this, knowledgeBase);
      const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
      
      // Initialize components
      await embeddingManager.initialize();
      await knowledgeGraph.initialize();
      
      console.log("Extracting knowledge from conversation...");
      
      // Extract knowledge from the message with enhanced extraction
      const extractedKnowledge = await knowledgeExtractor.extractFromConversation(content, {
        userId: 'user',
        timestamp: Date.now(),
        topic: 'conversation'
      });
      
      // For demonstration purposes, create a mock extraction result
      // In a real implementation, this would come from a more sophisticated extraction process
      const extractionResult = {
        entities: [] as Array<{name: string; type: string; properties: Record<string, any>; confidence: number}>,
        relationships: [] as Array<{sourceEntityId: string; targetEntityId: string; sourceEntityName: string; targetEntityName: string; type: string; properties: Record<string, any>; confidence: number}>,
        facts: extractedKnowledge,
        userProfileUpdates: {} as Partial<UserProfile>,
        preferenceUpdates: {} as Partial<UserPreferences>
      };
      
      console.log(`Extracted ${extractionResult.entities.length} entities, ${extractionResult.relationships.length} relationships, and ${extractionResult.facts.length} facts`);
      
      // Generate embedding for the content
      const contentEmbedding = await embeddingManager.generateEmbedding(content, crypto.randomUUID(), {
        type: "memory",
        metadata: { source: "conversation", timestamp: Date.now() }
      });
      
      // Calculate importance based on the extraction results
      const importance = Math.min(9, 5 + 
        extractionResult.entities.length * 0.5 + 
        extractionResult.relationships.length * 0.7 + 
        extractionResult.facts.length * 0.3);
      
      // Store the original message as an episodic memory with embedding
      await memoryManager.storeMemory(content, {
        source: 'conversation',
        context: 'user-message',
        metadata: { 
          timestamp: Date.now(), 
          importance: importance,
          embedding: embeddingManager.getVector(contentEmbedding),
          extractedEntities: extractionResult.entities.map(e => e.name),
          extractedRelationships: extractionResult.relationships.map(r => `${r.sourceEntityName} ${r.type} ${r.targetEntityName}`),
          extractedFacts: extractionResult.facts.map(f => f.fact)
        }
      });
      
      // Also store in the SQL table directly for backward compatibility
      const memoryId = await this.storeEpisodicMemory({
        content: content,
        importance: importance,
        context: 'conversation',
        source: 'conversation',
        metadata: {
          embedding: embeddingManager.getVector(contentEmbedding),
          extractedEntities: extractionResult.entities.map(e => e.name),
          extractedRelationships: extractionResult.relationships.map(r => `${r.sourceEntityName} ${r.type} ${r.targetEntityName}`),
          extractedFacts: extractionResult.facts.map(f => f.fact),
          extractedAt: Date.now()
        }
      });
      
      // Store entities in the knowledge graph
      for (const entity of extractionResult.entities) {
        const entityId = await knowledgeGraph.createOrUpdateEntity({
          name: entity.name,
          type: entity.type,
          properties: entity.properties,
          confidence: entity.confidence,
          sources: ['conversation']
        });
        
        console.log(`Stored entity in knowledge graph: ${entity.name} (${entity.type})`);
      }
      
      // Store relationships in the knowledge graph
      for (const relationship of extractionResult.relationships) {
        try {
          const relationshipId = await knowledgeGraph.createOrUpdateRelationship({
            sourceEntityId: relationship.sourceEntityId,
            targetEntityId: relationship.targetEntityId,
            type: relationship.type,
            properties: relationship.properties,
            confidence: relationship.confidence,
            sources: ['conversation']
          });
          
          console.log(`Stored relationship in knowledge graph: ${relationship.sourceEntityName} ${relationship.type} ${relationship.targetEntityName}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error storing relationship: ${error.message}`);
          } else {
            console.error(`Error storing relationship: ${String(error)}`);
          }
        }
      }
      
      // Store each extracted fact as a semantic memory
      for (const fact of extractionResult.facts) {
        await this.storeSemanticMemory({
          fact: fact.fact,
          confidence: fact.confidence,
          metadata: {
            source: 'conversation',
            category: fact.category,
            tags: fact.tags,
            // Note: relatedEntities is not available in the ExtractedKnowledge interface
            extractedFrom: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            extractedAt: Date.now()
          }
        });
        
        console.log(`Stored semantic memory: ${fact.fact}`);
      }
      
      // Update user profile with extracted information
      if (extractionResult.userProfileUpdates && Object.keys(extractionResult.userProfileUpdates).length > 0) {
        await this.updateUserProfile(extractionResult.userProfileUpdates);
        console.log(`Updated user profile with: ${JSON.stringify(extractionResult.userProfileUpdates)}`);
      }
      
      // Update user preferences with extracted information
      if (extractionResult.preferenceUpdates && Object.keys(extractionResult.preferenceUpdates).length > 0) {
        await this.updatePreferences(extractionResult.preferenceUpdates);
        console.log(`Updated user preferences with: ${JSON.stringify(extractionResult.preferenceUpdates)}`);
      }
      
    } catch (error) {
      console.error("Error extracting memories from conversation:", error);
      
      // Fallback to simple extraction in case of error
      try {
        const memoryManager = new MemoryManager({ agent: this });
        
        // Store as a basic episodic memory
        await memoryManager.storeMemory(content, {
          source: 'conversation',
          context: 'user-message',
          metadata: { timestamp: Date.now(), importance: 5 }
        });
        
        // Check for potential user profile information with simple regex
        if (content.toLowerCase().includes("my name is")) {
          const nameMatch = content.match(/my name is (\w+)/i);
          if (nameMatch && nameMatch[1]) {
            await this.updateUserProfile({ name: nameMatch[1] });
          }
        }
      } catch (fallbackError) {
        console.error("Error in fallback memory extraction:", fallbackError);
      }
    }
  }

  /**
   * Retrieve relevant memories based on the current conversation
   * This method uses the enhanced memory retrieval system with embeddings, temporal context, and relevance ranking
   * It also supports direct memory queries when the chat history is cleared or when the user is asking about memories
   */
  private async getRelevantMemories(limit: number = 5, forceQuery?: string) {
    // If a specific query is provided, use it directly
    if (forceQuery) {
      console.log(`Using forced query for memory retrieval: "${forceQuery}"`);
      return directMemoryQuery(this, forceQuery, limit);
    }
    
    // Helper function to convert SQL results to Memory objects
    const convertToMemories = (results: any[]): Memory[] => {
      return results.map(row => ({
        id: String(row.id || crypto.randomUUID()),
        content: String(row.content || ''),
        timestamp: Number(row.timestamp || Date.now()),
        source: row.source ? String(row.source) : undefined,
        context: row.context ? String(row.context) : undefined,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
      }));
    };
    
    // If there are no messages, try to get recent memories as a fallback
    if (this.messages.length === 0) {
      console.log("No messages in context, retrieving recent memories as fallback");
      try {
        const recentMemoriesResult = await this.sql`
          SELECT * FROM episodic_memories 
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
        return convertToMemories(recentMemoriesResult);
      } catch (error) {
        console.error("Error retrieving recent memories:", error);
        return [];
      }
    }
    
    // Get the last user message
    const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage || !lastUserMessage.content) return [];
    
    const content = typeof lastUserMessage.content === 'string' 
      ? lastUserMessage.content 
      : JSON.stringify(lastUserMessage.content);
    
    // Check if the user is asking about memories
    if (isAskingAboutMemories(content)) {
      // Extract key terms for better memory retrieval
      const keyTerms = extractKeyTerms(content);
      console.log(`Memory query detected. Key terms: "${keyTerms}"`);
      
      // Use direct memory query for memory-related questions
      return directMemoryQuery(this, keyTerms, limit);
    }
    
    try {
      // Initialize enhanced memory components
      const memoryManager = new MemoryManager({ agent: this });
      const embeddingManager = new EmbeddingManager();
      const temporalContextManager = new TemporalContextManager();
      const relevanceRanking = new RelevanceRanking({ embeddingManager });
      const learningSystem = new LearningSystem(this);
      
      // Initialize components
      await embeddingManager.initialize();
      
      // Get current temporal context
      const temporalContext = await temporalContextManager.getCurrentContext();
      console.log(`Current temporal context: ${temporalContext.timeContext.timeOfDay} (${temporalContext.date.hour}:${temporalContext.date.minute})`);
      
      // Record this interaction in the temporal context
      await temporalContextManager.recordInteraction('query');
      
      // Create the learning-enhanced memory retrieval system
      const enhancedMemoryRetrieval = new LearningEnhancedMemoryRetrieval(
        this,
        memoryManager,
        learningSystem,
        relevanceRanking,
        temporalContextManager
      );
      
      // Initialize the enhanced memory retrieval
      await enhancedMemoryRetrieval.initialize();
      
      // Use the enhanced memory retrieval system
      const retrievalResult = await enhancedMemoryRetrieval.retrieveMemories(content, {
        contextTimeframe: "all",
        enhanceQuery: true,
        limit: limit
      });
      
      // If we found memories using the enhanced system, return them
      if (retrievalResult.memories.length > 0) {
        console.log(`Retrieved ${retrievalResult.memories.length} memories using learning-enhanced retrieval`);
        
        // Log some details about the enhanced retrieval
        if (retrievalResult.enhancedQuery) {
          console.log(`Enhanced query: "${content}" → "${retrievalResult.enhancedQuery}"`);
        }
        
        if (retrievalResult.metadata?.learningInsights) {
          console.log(`Learning insights: ${retrievalResult.metadata.learningInsights.join(', ')}`);
        }
        
        return retrievalResult.memories;
      }
      
      // If learning-enhanced retrieval didn't find anything, try with just relevance ranking
      console.log("Learning-enhanced retrieval found no memories, trying with relevance ranking");
      
      // Get memories using the memory manager
      const memories = await memoryManager.retrieveMemories(content, { limit: limit * 2 });
      
      if (memories.length > 0) {
        // Rank memories by relevance
        const rankedMemories = await relevanceRanking.rankMemories(
          memories,
          content,
          {
            minRelevanceScore: 0.3,
            maxResults: limit,
            includeReasons: true,
            recencyBoost: true,
            feedbackBoost: true
          }
        );
        
        if (rankedMemories.length > 0) {
          console.log(`Retrieved ${rankedMemories.length} memories using relevance ranking`);
          return rankedMemories;
        }
      }
      
      // Fallback to the basic memory manager if the enhanced systems didn't find anything
      console.log("Enhanced retrieval systems found no memories, trying basic retrieval");
      const basicMemories = await memoryManager.retrieveMemories(content, { limit });
      if (basicMemories.length > 0) {
        console.log(`Retrieved ${basicMemories.length} memories using basic retrieval`);
        return basicMemories;
      }
      
      // Last resort fallback: return recent memories
      console.log("All retrieval methods failed, returning most recent memories");
      const recentMemoriesResult = await this.sql`
        SELECT * FROM episodic_memories 
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      console.log(`Retrieved ${recentMemoriesResult.length} recent memories as fallback`);
      return convertToMemories(recentMemoriesResult);
    } catch (error) {
      console.error("Error retrieving memories:", error);
      
      // Fallback to just returning recent memories in case of error
      const recentMemoriesResult = await this.sql`
        SELECT * FROM episodic_memories 
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      return convertToMemories(recentMemoriesResult);
    }
  }

  /**
   * Store an episodic memory
   */
  @callable({ description: "Store a new episodic memory" })
  async storeEpisodicMemory(memory: { 
    content: string; 
    importance?: number; 
    context?: string;
    source?: string;
    metadata?: Record<string, any>;
  }) {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.sql`
      INSERT INTO episodic_memories (
        id, timestamp, content, importance, context, source, metadata
      ) VALUES (
        ${id}, 
        ${timestamp}, 
        ${memory.content}, 
        ${memory.importance || 5}, 
        ${memory.context || null}, 
        ${memory.source || null},
        ${memory.metadata ? JSON.stringify(memory.metadata) : null}
      )
    `;
    
    return { id, timestamp };
  }

  /**
   * Store a semantic memory (factual knowledge)
   */
  @callable({ description: "Store a new semantic memory (factual knowledge)" })
  async storeSemanticMemory(memory: {
    fact: string;
    confidence: number;
    metadata?: Record<string, any>;
  }) {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.sql`
      INSERT INTO semantic_memories (
        id, fact, confidence, first_observed, metadata
      ) VALUES (
        ${id}, 
        ${memory.fact}, 
        ${memory.confidence}, 
        ${timestamp}, 
        ${memory.metadata ? JSON.stringify(memory.metadata) : null}
      )
    `;
    
    return { id, timestamp };
  }

  /**
   * Update the user profile
   */
  @callable({ description: "Update user profile information" })
  async updateUserProfile(profile: Partial<UserProfile>) {
    this.setState({
      ...this.state,
      userProfile: {
        ...this.state.userProfile,
        ...profile
      }
    });
    
    return this.state.userProfile;
  }

  /**
   * Update user preferences
   */
  @callable({ description: "Update user preferences" })
  async updatePreferences(preferences: Partial<UserPreferences>) {
    this.setState({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        ...preferences
      }
    });
    
    return this.state.preferences;
  }

  /**
   * Create or update an entity in the knowledge graph
   */
  @callable({ description: "Create or update an entity in the knowledge graph" })
  async createOrUpdateEntity(entity: {
    name: string;
    type: string;
    properties: Record<string, any>;
    confidence?: number;
    sources?: string[];
  }) {
    const knowledgeBase = new KnowledgeBase(this);
    const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
    
    // Initialize the knowledge graph if not already initialized
    try {
      await knowledgeGraph.initialize();
    } catch (error) {
      console.error("Failed to initialize knowledge graph:", error);
      throw error;
    }
    
    return knowledgeGraph.createOrUpdateEntity(entity);
  }

  /**
   * Create or update a relationship in the knowledge graph
   */
  @callable({ description: "Create or update a relationship in the knowledge graph" })
  async createOrUpdateRelationship(relationship: {
    sourceEntityId: string;
    targetEntityId: string;
    type: string;
    properties?: Record<string, any>;
    confidence?: number;
    sources?: string[];
  }) {
    const knowledgeBase = new KnowledgeBase(this);
    const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
    
    // Initialize the knowledge graph if not already initialized
    try {
      await knowledgeGraph.initialize();
    } catch (error) {
      console.error("Failed to initialize knowledge graph:", error);
      throw error;
    }
    
    return knowledgeGraph.createOrUpdateRelationship(relationship);
  }

  /**
   * Query the knowledge graph
   */
  @callable({ description: "Query the knowledge graph for entities and relationships" })
  async queryKnowledgeGraph(options: {
    entityTypes?: string[];
    entityNames?: string[];
    relationshipTypes?: string[];
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }) {
    const knowledgeBase = new KnowledgeBase(this);
    const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
    
    // Initialize the knowledge graph if not already initialized
    try {
      await knowledgeGraph.initialize();
    } catch (error) {
      console.error("Failed to initialize knowledge graph:", error);
      throw error;
    }
    
    return knowledgeGraph.queryGraph(options);
  }

  /**
   * Search the knowledge graph
   */
  @callable({ description: "Search the knowledge graph for entities and relationships matching a text query" })
  async searchKnowledgeGraph(query: string, limit = 100, offset = 0) {
    const knowledgeBase = new KnowledgeBase(this);
    const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
    
    // Initialize the knowledge graph if not already initialized
    try {
      await knowledgeGraph.initialize();
    } catch (error) {
      console.error("Failed to initialize knowledge graph:", error);
      throw error;
    }
    
    return knowledgeGraph.searchGraph(query, limit, offset);
  }
  
  /**
   * Get tool usage statistics
   */
  @callable({ description: "Get usage statistics for tools" })
  async getToolUsageStatistics(options?: {
    toolId?: string;
    userId?: string;
    timeframe?: number; // Days
    limit?: number;
  }) {
    // This method has been removed as part of MCP refactoring
    // Tool usage tracking will be implemented in the McpPersonalAgent class
    console.log("Tool usage statistics are not available in this version");
    
    return {
      summary: {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        successRate: 0,
        avgExecutionTime: 0,
        uniqueTools: 0,
        uniqueUsers: 0,
        firstEvent: null,
        lastEvent: null
      },
      usageByHour: {},
      usageByDayOfWeek: {}
    };
  }

  /**
   * Consolidate memories (scheduled task)
   */
  async consolidateMemories() {
    console.log("Running memory consolidation...");
    
    // This is a placeholder for more sophisticated memory consolidation
    // In a real implementation, we would:
    // 1. Identify related memories
    // 2. Extract semantic knowledge from episodic memories
    // 3. Update importance based on recurrence
    // 4. Create connections between related memories
    
    // For now, we'll just log that it ran
    console.log("Memory consolidation completed at", new Date().toISOString());
  }

  /**
   * Handle WebSocket connections
   */
  async onConnect(connection: any, ctx: any) {
    // Update last active timestamp
    this.setState({
      ...this.state,
      lastActive: new Date().toISOString()
    });
    
    // Call the parent class implementation
    await super.onConnect(connection, ctx);
  }

  /**
   * Static method to register the PersonalAgent with the Cloudflare Agents SDK
   * @param options Configuration options for the agent
   * @returns The registered agent classes
   */
  static register(config: {
    model: any;
    tools: Record<string, any>;
    executions: Record<string, any>;
    systemPrompt: string;
    maxSteps?: number;
  }) {
    // Create a class that extends PersonalAgent
    class RegisteredPersonalAgent extends PersonalAgent {
      // Store the configuration
      private config = config;
      private initialized = false;
      
      /**
       * Ensure the agent is initialized before use
       */
      private async ensureInitialized() {
        if (!this.initialized) {
          try {
            await this.initialize();
            this.initialized = true;
            console.log("Agent initialized successfully");
          } catch (error) {
            console.error("Failed to initialize agent:", error);
            throw error;
          }
        }
      }
      
      /**
       * Handle WebSocket connections
       */
      async onConnect(connection: any, ctx: any) {
        // Ensure the agent is initialized
        await this.ensureInitialized();
        
        // Call the parent class implementation
        await super.onConnect(connection, ctx);
      }
      
      async onChatMessage(
        onFinish: StreamTextOnFinishCallback<ToolSet>,
        chatOptions?: { abortSignal?: AbortSignal }
      ) {
        // Ensure the agent is initialized
        await this.ensureInitialized();
        
        // Update last active timestamp
        this.setState({
          ...this.state,
          lastActive: new Date().toISOString()
        });

        // Initialize our enhanced systems
        const memoryManager = new MemoryManager({ agent: this });
        const securityManager = new SecurityManager(this);
        const knowledgeBase = new KnowledgeBase(this);
        const knowledgeGraph = new KnowledgeGraph(this, knowledgeBase);
        
        try {
          // Initialize the knowledge graph
          await knowledgeGraph.initialize();
        } catch (error) {
          console.error("Failed to initialize enhanced systems:", error);
        }
        
        // Retrieve relevant memories for context using the enhanced system
        let relevantMemories: Memory[] = [];
        try {
          // Get the last user message for context
          const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
          if (lastUserMessage && lastUserMessage.content) {
            const content = typeof lastUserMessage.content === 'string' 
              ? lastUserMessage.content 
              : JSON.stringify(lastUserMessage.content);
            
            // Check if the user is asking about memories
            const isMemoryQuery = isAskingAboutMemories(content);
            
            if (isMemoryQuery) {
              // Extract key terms for better memory retrieval
              const keyTerms = extractKeyTerms(content);
              console.log(`Memory query detected. Key terms: "${keyTerms}"`);
              
              // Use direct memory query for memory-related questions
              relevantMemories = await directMemoryQuery(this, keyTerms, 5);
            } else {
              // Initialize enhanced memory components
              const embeddingManager = new EmbeddingManager();
              const temporalContextManager = new TemporalContextManager();
              const relevanceRanking = new RelevanceRanking({ embeddingManager });
              const learningSystem = new LearningSystem(this);
              
              // Initialize components
              await embeddingManager.initialize();
              
              // Get current temporal context
              const temporalContext = await temporalContextManager.getCurrentContext();
              
              // Record this interaction in the temporal context
              await temporalContextManager.recordInteraction('query');
              
              // Create the learning-enhanced memory retrieval system
              const enhancedMemoryRetrieval = new LearningEnhancedMemoryRetrieval(
                this,
                memoryManager,
                learningSystem,
                relevanceRanking,
                temporalContextManager
              );
              
              // Initialize the enhanced memory retrieval
              await enhancedMemoryRetrieval.initialize();
              
              // Use the enhanced memory retrieval system
              const retrievalResult = await enhancedMemoryRetrieval.retrieveMemories(content, {
                contextTimeframe: "all",
                enhanceQuery: true,
                limit: 5
              });
              
              // If we found memories using the enhanced system, use them
              if (retrievalResult.memories.length > 0) {
                relevantMemories = retrievalResult.memories;
              } else {
                // Fallback to the basic memory manager if the enhanced system didn't find anything
                relevantMemories = await memoryManager.retrieveMemories(content, { limit: 5 });
              }
            }
          } else if (this.messages.length === 0) {
            // If there are no messages (chat was cleared), get recent memories
            console.log("Chat history is empty, retrieving recent memories");
            const recentMemoriesResult = await this.sql`
              SELECT * FROM episodic_memories 
              ORDER BY timestamp DESC
              LIMIT 5
            `;
            // Convert SQL results to Memory objects
            relevantMemories = recentMemoriesResult.map(row => ({
              id: String(row.id || crypto.randomUUID()),
              content: String(row.content || ''),
              timestamp: Number(row.timestamp || Date.now()),
              source: row.source ? String(row.source) : undefined,
              context: row.context ? String(row.context) : undefined,
              metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
            }));
          }
        } catch (error) {
          console.error("Error retrieving memories:", error);
          
          // Fallback to basic retrieval in case of error
          try {
            const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage && lastUserMessage.content) {
              const content = typeof lastUserMessage.content === 'string' 
                ? lastUserMessage.content 
                : JSON.stringify(lastUserMessage.content);
                
              relevantMemories = await memoryManager.retrieveMemories(content, { limit: 5 });
            }
          } catch (fallbackError) {
            console.error("Error in fallback memory retrieval:", fallbackError);
          }
        }
        
        // Create a streaming response that handles both text and tool outputs
        const dataStreamResponse = createDataStreamResponse({
          execute: async (dataStream) => {
            // Collect all tools, including MCP tools
            const allTools = {
              ...this.config.tools,
              ...this.mcp.unstable_getAITools(),
            };

            // Process any pending tool calls from previous messages
            const processedMessages = await processToolCalls({
              messages: this.messages,
              dataStream,
              tools: allTools,
              executions: this.config.executions,
            });

            // Create a system prompt that includes memory context
            const systemPrompt = `${this.config.systemPrompt}
            
IMPORTANT: You have access to a sophisticated memory system that stores conversation history in a SQL database.
When users ask about your memory capabilities or if you can remember past conversations, you should confirm that
you CAN access the chat history and memories stored in the SQL database. You should never say you don't have
access to the database or past conversations.

CRITICAL: Even when the chat history is cleared, you still have access to all previous memories stored in the database.
You should NEVER say "I don't have a memory of that" or "I don't have access to that information" when asked about
previous conversations. Instead, you should check your memory database and provide the information if available.

${relevantMemories.length > 0 ? `Here are some relevant memories retrieved from the SQL database:
${relevantMemories.map(m => `- ${m.content}`).join('\n')}` : 'No relevant memories found in the database for this conversation yet.'}

${this.state.userProfile.name ? `The user's name is ${this.state.userProfile.name}.` : ''}

Maintain a warm, personalized tone and reference our shared history when relevant.
Be helpful, supportive, and remember important details about the user.
If asked about your memory capabilities, explain that you have a persistent memory system that allows you to remember past conversations.`;

            // Stream the AI response
            const result = streamText({
              model: this.config.model,
              system: systemPrompt,
              messages: processedMessages,
              tools: allTools,
              onFinish: async (args) => {
                // Extract potential new memories from the conversation
                await this.extractMemoriesFromConversation();
                
                onFinish(
                  args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
                );
              },
              onError: (error) => {
                console.error("Error while streaming:", error);
              },
              maxSteps: this.config.maxSteps || 10,
            });

            // Merge the AI response stream with tool execution outputs
            result.mergeIntoDataStream(dataStream);
          },
        });

        return dataStreamResponse;
      }
    }

    // Return the agent classes
    // In a real implementation, we would use Agent.register
    // But for now, we'll just return the class directly
    return {
      Chat: RegisteredPersonalAgent,
    };
  }
}

// Import processToolCalls at the end to avoid circular dependencies
import { processToolCalls } from "../utils";
