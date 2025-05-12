import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { streamText, createDataStreamResponse, type StreamTextOnFinishCallback, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { OpenAI } from "openai";
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
import type { VectorizeEnv } from "../knowledge/graph/EntityEmbeddingManager";
import type { Entity, Relationship, GraphQueryResult } from "../knowledge/graph/types";
import { processToolCalls } from "../utils";
import { registerAdditionalMcpTools } from "../mcp-tools";

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

// Define a type for partial preferences updates that allows optional fields
type PartialPreferences = {
  theme?: "light" | "dark";
  notificationPreferences?: Partial<UserPreferences["notificationPreferences"]>;
  privacySettings?: Partial<UserPreferences["privacySettings"]>;
};

interface ConversationEntry {
  id: string;
  messages: any[]; // Using any for now, will be replaced with proper Message type
  context: string;
  timestamp: number;
}

// Define the state interface for the McpPersonalAgent
interface McpPersonalAgentState {
  conversations: ConversationEntry[];
  userProfile: UserProfile;
  preferences: UserPreferences;
  lastActive: string;
  messages: any[]; // Store chat messages in state
}

// Define our own Memory interface to avoid type conflicts
interface EpisodicMemory {
  id: string;
  timestamp: number;
  content: string;
  importance: number;
  context?: string;
  source?: string;
  metadata: any;
}

/**
 * McpPersonalAgent extends McpAgent to provide a persistent, personalized AI companion
 * with enhanced memory capabilities, personalization features, and MCP capabilities.
 */
export interface McpPersonalAgentEnv extends VectorizeEnv {
  OPENAI_API_KEY: string;
}

export class McpPersonalAgent<Env extends McpPersonalAgentEnv> extends McpAgent<Env, McpPersonalAgentState> {
  // Create an MCP server instance
  server = new McpServer({
    name: "personal-agent",
    version: "1.0.0",
    description: "A personal AI companion with persistent memory and enhanced capabilities"
  });

  // Initial state with default values
  initialState: McpPersonalAgentState = {
    conversations: [],
    userProfile: {
      firstInteraction: new Date().toISOString()
    },
    preferences: {
      theme: "dark",
      notificationPreferences: { email: false, push: true },
      privacySettings: { shareData: false, storeHistory: true }
    },
    lastActive: new Date().toISOString(),
    messages: []
  };

  // Store messages for chat context
  messages: any[] = [];
  
  // AI model configuration
  private modelConfig = {
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 1000
  };
  
  // Memory system components
  private embeddingManager: EmbeddingManager | null = null;
  private memoryManager: MemoryManager | null = null;

  /**
   * Initialize the agent with necessary database tables, scheduled tasks, and MCP tools
   */
  async init() {
    // Initialize the embedding manager
    this.embeddingManager = new EmbeddingManager({
      agent: this,
      modelName: "@cf/baai/bge-base-en-v1.5"
    });
    
    // Initialize the embedding manager
    await this.embeddingManager.initialize();
    
    // Initialize the memory manager with the embedding manager
    this.memoryManager = new MemoryManager({
      agent: this,
      embeddingManager: this.embeddingManager
    });
    
    // Create memory tables
    await this.sql`
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

    // Create tool usage tracking table
    await this.sql`
      CREATE TABLE IF NOT EXISTS tool_usage_events (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        user_id TEXT,
        timestamp INTEGER NOT NULL,
        execution_time INTEGER,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        parameters TEXT,
        result TEXT,
        metadata TEXT
      )
    `;

    // Create indexes for better performance
    await this.sql`CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memories(confidence)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_timestamp ON tool_usage_events(timestamp)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id ON tool_usage_events(tool_id)`;
    
    // Add additional indexes for tool usage tracking
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage_events(user_id)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_success ON tool_usage_events(success)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id_timestamp ON tool_usage_events(tool_id, timestamp)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id_tool_id ON tool_usage_events(user_id, tool_id)`;
    
    // Add indexes for scheduled tasks
    await this.sql`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_name ON scheduled_tasks(name)`;

  // Schedule regular memory consolidation
    await this.sql`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cron TEXT,
        next_run INTEGER,
        data TEXT,
        created_at INTEGER NOT NULL
      )
    `;
    
    // Instead of using this.schedule which isn't available in McpAgent
    // We'll create a scheduled task in the database
    const taskId = crypto.randomUUID();
    await this.sql`
      INSERT INTO scheduled_tasks (
        id, name, cron, next_run, data, created_at
      ) VALUES (
        ${taskId},
        'consolidateMemories',
        '0 3 * * *',
        ${Date.now() + 24 * 60 * 60 * 1000}, 
        ${JSON.stringify({})},
        ${Date.now()}
      )
    `;

    // Register MCP tools
    this.registerMcpTools();
    
    // Register additional MCP tools
    registerAdditionalMcpTools(this.server, this);
    
    // Register chat tool
    this.server.tool(
      "chat",
      "Send a message to the agent and get a response",
      {
        message: z.string().describe("The message to send to the agent")
      },
      async ({ message }: { message: string }) => {
        const response = await this.processChat(message);
        
        return {
          content: [
            { 
              type: "text", 
              text: response.content
            }
          ]
        };
      }
    );
  }

  /**
   * Register MCP tools with the server
   */
  private registerMcpTools() {
    // Memory management tools
    this.server.tool(
      "store_memory",
      "Store a new memory in the agent's database",
      {
        content: z.string().describe("The content of the memory to store"),
        importance: z.number().min(1).max(10).optional().describe("The importance of the memory (1-10)"),
        context: z.string().optional().describe("The context in which the memory was created"),
        source: z.string().optional().describe("The source of the memory")
      },
      async ({ content, importance, context, source }: { 
        content: string; 
        importance?: number; 
        context?: string;
        source?: string;
      }) => {
        const result = await this.storeEpisodicMemory({
          content,
          importance,
          context,
          source
        });
        
        return {
          content: [
            { 
              type: "text", 
              text: `Memory stored successfully with ID: ${result.id}` 
            }
          ]
        };
      }
    );

    this.server.tool(
      "retrieve_memories",
      "Retrieve memories based on a query",
      {
        query: z.string().describe("The query to search for in memories"),
        limit: z.number().min(1).max(50).optional().describe("Maximum number of memories to retrieve")
      },
      async ({ query, limit = 10 }: { query: string; limit?: number }) => {
        const memories = await this.getRelevantMemories(limit, query);
        
        return {
          content: [
            { 
              type: "text", 
              text: `Retrieved ${memories.length} memories matching "${query}":
${memories.map((m: EpisodicMemory, i: number) => `${i+1}. ${m.content}`).join('\n')}`
            }
          ]
        };
      }
    );

    // Knowledge graph tools
    this.server.tool(
      "query_knowledge_graph",
      "Query the knowledge graph for entities and relationships",
      {
        entityTypes: z.array(z.string()).optional().describe("Types of entities to query"),
        entityNames: z.array(z.string()).optional().describe("Names of entities to query"),
        relationshipTypes: z.array(z.string()).optional().describe("Types of relationships to query"),
        minConfidence: z.number().min(0).max(1).optional().describe("Minimum confidence score (0-1)"),
        limit: z.number().min(1).max(100).optional().describe("Maximum number of results to return")
      },
      async ({ entityTypes, entityNames, relationshipTypes, minConfidence, limit = 20 }: {
        entityTypes?: string[];
        entityNames?: string[];
        relationshipTypes?: string[];
        minConfidence?: number;
        limit?: number;
      }) => {
        // Create new instances for each request
        const knowledgeBase = new KnowledgeBase<Env>(this as any);
        const knowledgeGraph = new KnowledgeGraph<Env>(this as any, knowledgeBase);
        
        try {
          await knowledgeGraph.initialize();
          
          const results = await knowledgeGraph.queryGraph({
            entityTypes,
            entityNames,
            relationshipTypes,
            minConfidence,
            limit
          });
          
          return {
            content: [
              { 
                type: "text", 
                text: `Knowledge Graph Query Results:
Entities: ${results.entities.length}
Relationships: ${results.relationships.length}

Entities:
${results.entities.map((e: Entity, i: number) => `${i+1}. ${e.name || 'Unnamed'} (${e.type || 'Unknown type'})`).join('\n')}

Relationships:
${results.relationships.map((r: Relationship, i: number) => {
  const sourceEntity = results.entities.find((e: Entity) => e.id === r.sourceEntityId);
  const targetEntity = results.entities.find((e: Entity) => e.id === r.targetEntityId);
  return `${i+1}. ${sourceEntity?.name || 'Unknown'} ${r.type || 'Unknown relation'} ${targetEntity?.name || 'Unknown'}`;
}).join('\n')}`
              }
            ]
          };
        } catch (error) {
          console.error("Error querying knowledge graph:", error);
          return {
            content: [
              { 
                type: "text", 
                text: `Error querying knowledge graph: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    // User profile tools
    this.server.tool(
      "update_user_profile",
      "Update user profile information",
      {
        name: z.string().optional().describe("User's name"),
        interests: z.array(z.string()).optional().describe("User's interests"),
        importantDates: z.array(
          z.object({
            description: z.string(),
            date: z.string()
          })
        ).optional().describe("Important dates to remember")
      },
      async ({ name, interests, importantDates }: Partial<UserProfile>) => {
        const updatedProfile = await this.updateUserProfile({
          name,
          interests,
          importantDates
        });
        
        return {
          content: [
            { 
              type: "text", 
              text: `User profile updated successfully:
${JSON.stringify(updatedProfile, null, 2)}`
            }
          ]
        };
      }
    );

    // Preferences tools
    this.server.tool(
      "update_preferences",
      "Update user preferences",
      {
        theme: z.enum(["light", "dark"]).optional().describe("UI theme preference"),
        notificationPreferences: z.object({
          email: z.boolean().optional().describe("Email notifications"),
          push: z.boolean().optional().describe("Push notifications")
        }).optional().describe("Notification preferences"),
        privacySettings: z.object({
          shareData: z.boolean().optional().describe("Share data with third parties"),
          storeHistory: z.boolean().optional().describe("Store conversation history")
        }).optional().describe("Privacy settings")
      },
      async ({ theme, notificationPreferences, privacySettings }: PartialPreferences) => {
        const updatedPreferences = await this.updatePreferences({
          theme,
          notificationPreferences,
          privacySettings
        });
        
        return {
          content: [
            { 
              type: "text", 
              text: `Preferences updated successfully:
${JSON.stringify(updatedPreferences, null, 2)}`
            }
          ]
        };
      }
    );
  }

  /**
   * Store an episodic memory in the database
   * @param memory Memory object to store
   * @returns The stored memory with generated ID
   */
  async storeEpisodicMemory(memory: {
    content: string;
    importance?: number;
    context?: string;
    source?: string;
  }): Promise<EpisodicMemory> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const importance = memory.importance || 5;
    const metadata = JSON.stringify({
      created: timestamp,
      lastAccessed: timestamp
    });

    await this.sql`
      INSERT INTO episodic_memories (
        id, timestamp, content, importance, context, source, metadata
      ) VALUES (
        ${id},
        ${timestamp},
        ${memory.content},
        ${importance},
        ${memory.context || null},
        ${memory.source || null},
        ${metadata}
      )
    `;

    return {
      id,
      timestamp,
      content: memory.content,
      importance,
      context: memory.context,
      source: memory.source,
      metadata: JSON.parse(metadata)
    };
  }

  /**
   * Retrieve relevant memories based on a query
   * @param limit Maximum number of memories to retrieve
   * @param query Query string to search for
   * @returns Array of matching memories
   */
  async getRelevantMemories(limit: number = 10, query?: string): Promise<EpisodicMemory[]> {
    // If we have a memory manager and a query, use semantic search
    if (this.memoryManager && query) {
      try {
        console.log(`Using MemoryManager to retrieve memories for query: ${query}`);
        const memories = await this.memoryManager.retrieveRelevantMemories(query, { limit });
        
        // Convert Memory objects to EpisodicMemory objects
        return memories.map(memory => {
          // Get importance from metadata if available, otherwise use default
          const importance = memory.metadata?.importance || 5;
          
          return {
            id: memory.id,
            timestamp: memory.timestamp,
            content: memory.content,
            importance: importance,
            context: memory.context,
            source: memory.source,
            metadata: memory.metadata || {}
          };
        });
      } catch (error) {
        console.error("Error using MemoryManager for retrieval:", error);
        // Fall back to basic search if there's an error
      }
    }
    
    // If no query is provided or memory manager failed, return recent memories
    if (!query) {
      const recentMemories = await this.sql`
        SELECT * FROM episodic_memories
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      
      return recentMemories.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        content: row.content,
        importance: row.importance,
        context: row.context,
        source: row.source,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    }

    // Fall back to basic text search if memory manager is not available
    console.log("Falling back to basic text search for memories");
    const searchTerms = query.toLowerCase().split(' ');
    const allMemories = await this.sql`SELECT * FROM episodic_memories`;
    
    // Filter memories that contain any of the search terms
    const matchingMemories = allMemories.filter((memory: any) => {
      const content = memory.content.toLowerCase();
      return searchTerms.some(term => content.includes(term));
    });
    
    // Sort by relevance (number of matching terms) and importance
    matchingMemories.sort((a: any, b: any) => {
      const aContent = a.content.toLowerCase();
      const bContent = b.content.toLowerCase();
      
      const aMatches = searchTerms.filter(term => aContent.includes(term)).length;
      const bMatches = searchTerms.filter(term => bContent.includes(term)).length;
      
      // Primary sort by number of matches
      if (aMatches !== bMatches) {
        return bMatches - aMatches;
      }
      
      // Secondary sort by importance
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      
      // Tertiary sort by recency
      return b.timestamp - a.timestamp;
    });
    
    // Limit the results
    const limitedMemories = matchingMemories.slice(0, limit);
    
    return limitedMemories.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      content: row.content,
      importance: row.importance,
      context: row.context,
      source: row.source,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  /**
   * Update the user profile with new information
   * @param profileUpdates Partial user profile with fields to update
   * @returns The updated user profile
   */
  async updateUserProfile(profileUpdates: Partial<UserProfile>): Promise<UserProfile> {
    const currentProfile = this.state.userProfile;
    
    // Merge the updates with the current profile
    const updatedProfile = {
      ...currentProfile,
      ...profileUpdates
    };
    
    // Update the state
    this.setState({
      ...this.state,
      userProfile: updatedProfile
    });
    
    return updatedProfile;
  }

  /**
   * Update user preferences
   * @param preferencesUpdates Partial preferences object with fields to update
   * @returns The updated preferences
   */
  async updatePreferences(preferencesUpdates: PartialPreferences): Promise<UserPreferences> {
    const currentPreferences = this.state.preferences;
    
    // Create a deep copy of the current preferences
    const updatedPreferences = JSON.parse(JSON.stringify(currentPreferences));
    
    // Update theme if provided
    if (preferencesUpdates.theme) {
      updatedPreferences.theme = preferencesUpdates.theme;
    }
    
    // Update notification preferences if provided
    if (preferencesUpdates.notificationPreferences) {
      updatedPreferences.notificationPreferences = {
        ...updatedPreferences.notificationPreferences,
        ...preferencesUpdates.notificationPreferences
      };
    }
    
    // Update privacy settings if provided
    if (preferencesUpdates.privacySettings) {
      updatedPreferences.privacySettings = {
        ...updatedPreferences.privacySettings,
        ...preferencesUpdates.privacySettings
      };
    }
    
    // Update the state
    this.setState({
      ...this.state,
      preferences: updatedPreferences
    });
    
    return updatedPreferences;
  }

  /**
   * Process a chat message and generate a response
   * @param message The user's message
   * @returns A response from the agent
   */
  async processChat(message: string): Promise<{ content: string }> {
    try {
      // Update last active timestamp
      this.setState({
        ...this.state,
        lastActive: new Date().toISOString()
      });

      // Store the user message
      const userMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
      };

      // Add to messages array
      this.messages.push(userMessage);

      // Check if the message is asking about memories
      if (isAskingAboutMemories(message)) {
        return await this.handleMemoryQuery(message);
      }

      // Get relevant memories for context
      const relevantMemories = await this.getContextMemories(message);
      
      // Create system prompt with user profile and relevant memories
      const systemPrompt = this.createSystemPrompt(relevantMemories);

      // Call AI model
      const response = await this.callAIModel(systemPrompt, this.messages);

      // Extract potential new memories from the conversation
      await this.extractMemoriesFromConversation(message, response.content);

      // Store the assistant message
      const assistantMessage = {
        role: "assistant",
        content: response.content,
        timestamp: Date.now()
      };

      // Add to messages array
      this.messages.push(assistantMessage);

      // Update state with messages
      this.setState({
        ...this.state,
        messages: [...this.messages]
      });

      return response;
    } catch (error) {
      console.error("Error processing chat:", error);
      return {
        content: `I'm sorry, I encountered an error while processing your message. ${error instanceof Error ? error.message : "Please try again later."}`
      };
    }
  }

  /**
   * Handle a direct memory query
   * @param message The user's message asking about memories
   * @returns A response based on memory retrieval
   */
  private async handleMemoryQuery(message: string): Promise<{ content: string }> {
    try {
      // Extract key terms from the query
      const keyTerms = extractKeyTerms(message);
      
      // Get memories related to the key terms
      const searchQuery = Array.isArray(keyTerms) ? keyTerms.join(" ") : keyTerms;
      const memories = await this.getRelevantMemories(10, searchQuery);
      
      if (memories.length === 0) {
        return {
          content: "I don't have any memories related to that. Would you like to tell me about it?"
        };
      }
      
      // Format memories for response
      const formattedMemories = memories.map((memory, index) => {
        const date = new Date(memory.timestamp).toLocaleDateString();
        return `${index + 1}. ${memory.content} (${date})`;
      }).join("\n");
      
      return {
        content: `Here's what I remember about that:\n\n${formattedMemories}`
      };
    } catch (error) {
      console.error("Error handling memory query:", error);
      return {
        content: "I'm having trouble accessing my memories right now. Can we talk about something else?"
      };
    }
  }

  /**
   * Get relevant memories for context based on the current message
   * @param message The user's message
   * @returns Array of relevant memories
   */
  private async getContextMemories(message: string): Promise<EpisodicMemory[]> {
    try {
      // Extract key terms from the message
      const keyTerms = extractKeyTerms(message);
      
      // If no key terms were extracted, return recent memories
      if (!keyTerms || (Array.isArray(keyTerms) && keyTerms.length === 0)) {
        return await this.getRelevantMemories(5);
      }
      
      // Get memories related to the key terms
      const searchQuery = Array.isArray(keyTerms) ? keyTerms.join(" ") : keyTerms;
      return await this.getRelevantMemories(5, searchQuery);
    } catch (error) {
      console.error("Error getting context memories:", error);
      return [];
    }
  }

  /**
   * Create a system prompt with user profile and relevant memories
   * @param relevantMemories Array of relevant memories
   * @returns System prompt string
   */
  private createSystemPrompt(relevantMemories: EpisodicMemory[]): string {
    const { userProfile } = this.state;
    
    // Format user profile information
    const profileInfo = [
      userProfile.name ? `The user's name is ${userProfile.name}.` : "",
      userProfile.interests && userProfile.interests.length > 0 ? 
        `The user is interested in: ${userProfile.interests.join(", ")}.` : "",
      userProfile.importantDates && userProfile.importantDates.length > 0 ?
        `Important dates for the user: ${userProfile.importantDates.map(d => 
          `${d.description} (${d.date})`).join(", ")}.` : ""
    ].filter(Boolean).join(" ");
    
    // Format memories
    const memoriesText = relevantMemories.length > 0 ?
      `Relevant memories:\n${relevantMemories.map(m => `- ${m.content}`).join("\n")}` : "";
    
    // Create the system prompt
    return `You are a personal AI assistant with persistent memory and personalization.
${profileInfo}

${memoriesText}

Respond in a helpful, friendly, and conversational manner. If the user asks about something you should know based on the memories above, use that information in your response. If you don't have relevant memories, you can ask for more information or make reasonable assumptions.`;
  }

  /**
   * Call the AI model with the system prompt and messages
   * @param systemPrompt The system prompt
   * @param messages Array of messages
   * @returns The model's response
   */
  private async callAIModel(systemPrompt: string, messages: any[]): Promise<{ content: string }> {
    try {
      // Create the OpenAI client
      const client = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
      
      // Prepare messages for the model
      const modelMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10) // Use the last 10 messages for context
      ];
      
      // Call the model
      const completion = await client.chat.completions.create({
        model: this.modelConfig.model,
        messages: modelMessages,
        temperature: this.modelConfig.temperature,
        max_tokens: this.modelConfig.max_tokens,
      });
      
      return {
        content: completion.choices[0].message.content || "I'm not sure how to respond to that."
      };
    } catch (error) {
      console.error("Error calling AI model:", error);
      throw new Error("Failed to generate a response. Please try again later.");
    }
  }

  /**
   * Extract potential memories from the conversation
   * @param userMessage The user's message
   * @param assistantResponse The assistant's response
   */
  /**
   * Extract simple facts from a message using basic heuristics
   * @param message The message to extract facts from
   * @returns Array of extracted facts
   */
  private extractSimpleFacts(message: string): string[] {
    const facts: string[] = [];
    
    // Simple fact extraction based on common patterns
    // In a real implementation, this would use NLP or an LLM
    
    // Look for "I am/I'm" statements
    const iAmRegex = /I(?:'m| am) ([^.!?]+)/gi;
    let match;
    while ((match = iAmRegex.exec(message)) !== null) {
      facts.push(`User is ${match[1].trim()}`);
    }
    
    // Look for "My name is" statements
    const nameRegex = /My name is ([^.!?]+)/gi;
    while ((match = nameRegex.exec(message)) !== null) {
      facts.push(`User's name is ${match[1].trim()}`);
    }
    
    // Look for "I like/love/enjoy" statements
    const preferenceRegex = /I (?:like|love|enjoy) ([^.!?]+)/gi;
    while ((match = preferenceRegex.exec(message)) !== null) {
      facts.push(`User likes ${match[1].trim()}`);
    }
    
    // Look for "I have" statements
    const possessionRegex = /I have (?:a |an |)([^.!?]+)/gi;
    while ((match = possessionRegex.exec(message)) !== null) {
      facts.push(`User has ${match[1].trim()}`);
    }
    
    return facts;
  }
  
  /**
   * Determine if a sentence is important enough to store as a memory
   * @param sentence The sentence to evaluate
   * @returns True if the sentence is important
   */
  private isImportantSentence(sentence: string): boolean {
    // Simple importance check based on length and keywords
    // In a real implementation, this would use more sophisticated analysis
    
    // Ignore very short sentences
    if (sentence.length < 15) {
      return false;
    }
    
    // Check for important keywords
    const importantKeywords = [
      "remember", "important", "key", "critical", "essential",
      "never forget", "always", "must", "should", "need to"
    ];
    
    const lowercaseSentence = sentence.toLowerCase();
    
    // Check if the sentence contains any important keywords
    if (importantKeywords.some(keyword => lowercaseSentence.includes(keyword))) {
      return true;
    }
    
    // Check if the sentence is a direct statement or fact
    if (
      lowercaseSentence.includes(" is ") || 
      lowercaseSentence.includes(" are ") ||
      lowercaseSentence.includes(" was ") ||
      lowercaseSentence.includes(" were ")
    ) {
      return true;
    }
    
    // By default, only store about 20% of sentences
    return Math.random() < 0.2;
  }
  
  private async extractMemoriesFromConversation(userMessage: string, assistantResponse: string): Promise<void> {
    try {
      // Simple memory extraction - store the entire user message if it's longer than 20 characters
      if (userMessage.length > 20) {
        await this.storeEpisodicMemory({
          content: userMessage,
          importance: 5,
          context: "user message",
          source: "conversation"
        });
      }
      
      // Extract potential facts from the user message using a simple approach
      const userFacts = this.extractSimpleFacts(userMessage);
      for (const fact of userFacts) {
        await this.storeEpisodicMemory({
          content: fact,
          importance: 7, // Higher importance for extracted facts
          context: "user fact",
          source: "conversation"
        });
      }
      
      // Store important parts of the assistant response
      // In a real implementation, this would use more sophisticated extraction
      if (assistantResponse.length > 50) {
        const sentences = assistantResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
        for (const sentence of sentences) {
          if (this.isImportantSentence(sentence)) {
            await this.storeEpisodicMemory({
              content: sentence.trim(),
              importance: 3, // Lower importance for assistant-generated memories
              context: "assistant response",
              source: "conversation"
            });
          }
        }
      }
    } catch (error) {
      console.error("Error extracting memories from conversation:", error);
      // Don't throw here, just log the error and continue
    }
  }
}
