import { Agent } from "agents";
import { BaseMCPAdapter } from "./BaseMCPAdapter";
import type { MCPTool } from "./BaseMCPAdapter";
import { EmbeddingManager } from "../memory/EmbeddingManager";

/**
 * Interface for tool metadata with embedding
 */
export interface ToolWithEmbedding extends MCPTool {
  /**
   * Embedding vector for the tool description
   */
  embedding?: number[];
  
  /**
   * Categories this tool belongs to
   */
  categories?: string[];
  
  /**
   * Usage count for popularity ranking
   */
  usageCount?: number;
  
  /**
   * Last used timestamp
   */
  lastUsed?: number;
  
  /**
   * Success rate (0-1)
   */
  successRate?: number;
}

/**
 * Interface for tool registry entry
 */
export interface ToolRegistryEntry {
  /**
   * Tool ID (serverId:toolName)
   */
  id: string;
  
  /**
   * Server ID
   */
  serverId: string;
  
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool description
   */
  description: string;
  
  /**
   * Tool input schema
   */
  inputSchema: any;
  
  /**
   * Tool output schema
   */
  outputSchema?: any;
  
  /**
   * Tool embedding vector
   */
  embedding: number[];
  
  /**
   * Tool categories
   */
  categories: string[];
  
  /**
   * Usage count
   */
  usageCount: number;
  
  /**
   * Last used timestamp
   */
  lastUsed: number;
  
  /**
   * Success count
   */
  successCount: number;
  
  /**
   * Failure count
   */
  failureCount: number;
  
  /**
   * First discovered timestamp
   */
  discoveredAt: number;
  
  /**
   * Last updated timestamp
   */
  updatedAt: number;
}

/**
 * Interface for tool discovery options
 */
export interface ToolDiscoveryOptions {
  /**
   * Whether to refresh the tool registry
   */
  refresh?: boolean;
  
  /**
   * MCP service URLs to discover tools from
   */
  serviceUrls?: string[];
  
  /**
   * Categories to filter by
   */
  categories?: string[];
}

/**
 * Interface for tool suggestion options
 */
export interface ToolSuggestionOptions {
  /**
   * Query text to match against tool descriptions
   */
  query: string;
  
  /**
   * Maximum number of suggestions to return
   */
  limit?: number;
  
  /**
   * Minimum similarity threshold (0-1)
   */
  threshold?: number;
  
  /**
   * Categories to filter by
   */
  categories?: string[];
  
  /**
   * Whether to include usage statistics in ranking
   */
  considerUsage?: boolean;
}

/**
 * Interface for tool suggestion result
 */
export interface ToolSuggestion {
  /**
   * Tool registry entry
   */
  tool: ToolRegistryEntry;
  
  /**
   * Similarity score (0-1)
   */
  score: number;
  
  /**
   * Reason for suggestion
   */
  reason: string;
}

/**
 * Interface for tool composition step
 */
export interface ToolCompositionStep {
  /**
   * Tool ID
   */
  toolId: string;
  
  /**
   * Input mapping
   * Keys are input parameter names, values are:
   * - String literals
   * - References to previous step outputs in the form "step[n].outputPath"
   * - References to composition inputs in the form "input.path"
   */
  inputMapping: Record<string, string>;
  
  /**
   * Output mapping
   * Keys are names to expose in the composition, values are paths in the tool output
   */
  outputMapping?: Record<string, string>;
}

/**
 * Interface for tool composition
 */
export interface ToolComposition {
  /**
   * Unique ID for the composition
   */
  id: string;
  
  /**
   * Name of the composition
   */
  name: string;
  
  /**
   * Description of the composition
   */
  description: string;
  
  /**
   * Input schema for the composition
   */
  inputSchema: any;
  
  /**
   * Output schema for the composition
   */
  outputSchema: any;
  
  /**
   * Steps in the composition
   */
  steps: ToolCompositionStep[];
  
  /**
   * Created timestamp
   */
  createdAt: number;
  
  /**
   * Last updated timestamp
   */
  updatedAt: number;
  
  /**
   * Usage count
   */
  usageCount: number;
}

/**
 * ToolDiscoveryManager handles discovery, registration, and suggestion of MCP tools
 */
export class ToolDiscoveryManager<Env> {
  /**
   * Known MCP service URLs
   */
  private knownServiceUrls: string[] = [
    "https://mcp.so/catalog",
    "https://mcp.so/popular",
    "https://mcp.so/verified"
  ];
  
  /**
   * MCP adapter for tool discovery
   */
  private mcpAdapter: BaseMCPAdapter<Env>;
  
  /**
   * Embedding manager for semantic tool matching
   */
  private embeddingManager: EmbeddingManager;
  
  /**
   * Create a new ToolDiscoveryManager
   * @param agent The agent instance
   */
  constructor(private agent: Agent<Env>) {
    this.mcpAdapter = new BaseMCPAdapter<Env>(agent);
    this.embeddingManager = new EmbeddingManager();
  }
  
  /**
   * Initialize the tool discovery system
   */
  async initialize(): Promise<void> {
    // Create tables for tool registry and compositions
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS tool_registry (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        output_schema TEXT,
        embedding TEXT NOT NULL,
        categories TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used INTEGER,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        discovered_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS tool_compositions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        output_schema TEXT NOT NULL,
        steps TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0
      )
    `;
    
    // Create indexes for faster lookups
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_registry_server_id 
      ON tool_registry(server_id)
    `;
    
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_registry_categories 
      ON tool_registry(categories)
    `;
    
    // Initialize embedding manager
    await this.embeddingManager.initialize();
  }
  
  /**
   * Discover tools from MCP services
   * @param options Discovery options
   * @returns Array of discovered tools
   */
  async discoverTools(options: ToolDiscoveryOptions = {}): Promise<ToolRegistryEntry[]> {
    const {
      refresh = false,
      serviceUrls = this.knownServiceUrls,
      categories = []
    } = options;
    
    // If not refreshing, return cached tools
    if (!refresh) {
      const cachedTools = await this.getRegisteredTools(categories);
      if (cachedTools.length > 0) {
        return cachedTools;
      }
    }
    
    const discoveredTools: ToolWithEmbedding[] = [];
    
    // Connect to each service and discover tools
    for (const serviceUrl of serviceUrls) {
      try {
        const connection = await this.mcpAdapter.connectToService(serviceUrl);
        const tools = this.mcpAdapter.listTools(connection.id);
        
        // Process and categorize tools
        for (const tool of tools) {
          const toolWithMetadata: ToolWithEmbedding = {
            ...tool,
            categories: await this.categorizeToolAutomatically(tool)
          };
          
          discoveredTools.push(toolWithMetadata);
        }
        
        // Close connection
        await this.mcpAdapter.closeConnection(connection.id);
      } catch (error) {
        console.error(`Failed to discover tools from ${serviceUrl}:`, error);
      }
    }
    
    // Generate embeddings and register tools
    const registeredTools: ToolRegistryEntry[] = [];
    
    for (const tool of discoveredTools) {
      try {
        // Generate embedding for tool description
        const description = tool.description || `${tool.name} tool from ${tool.serverId}`;
        const embedding = await this.embeddingManager.generateEmbedding(description);
        const embeddingVector = this.embeddingManager.getVector(embedding);
        
        // Register tool
        const registeredTool = await this.registerTool({
          ...tool,
          embedding: embeddingVector
        });
        
        registeredTools.push(registeredTool);
      } catch (error) {
        console.error(`Failed to process tool ${tool.name}:`, error);
      }
    }
    
    return registeredTools;
  }
  
  /**
   * Register a tool in the registry
   * @param tool Tool to register
   * @returns Registered tool entry
   */
  async registerTool(tool: ToolWithEmbedding): Promise<ToolRegistryEntry> {
    const timestamp = Date.now();
    const toolId = `${tool.serverId}:${tool.name}`;
    
    // Check if tool already exists
    const existingTool = await this.agent.sql`
      SELECT * FROM tool_registry
      WHERE id = ${toolId}
    `;
    
    if (existingTool.length > 0) {
      // Update existing tool
      await this.agent.sql`
        UPDATE tool_registry
        SET 
          description = ${tool.description || ""},
          input_schema = ${JSON.stringify(tool.inputSchema)},
          output_schema = ${tool.outputSchema ? JSON.stringify(tool.outputSchema) : null},
          embedding = ${JSON.stringify(tool.embedding || [])},
          categories = ${JSON.stringify(tool.categories || [])},
          updated_at = ${timestamp}
        WHERE id = ${toolId}
      `;
      
      // Return updated tool
      const updatedTool = await this.agent.sql`
        SELECT * FROM tool_registry
        WHERE id = ${toolId}
      `;
      
      return this.sqlRowToToolRegistryEntry(updatedTool[0]);
    } else {
      // Insert new tool
      await this.agent.sql`
        INSERT INTO tool_registry (
          id, server_id, name, description, input_schema, output_schema,
          embedding, categories, usage_count, last_used, success_count,
          failure_count, discovered_at, updated_at
        ) VALUES (
          ${toolId},
          ${tool.serverId},
          ${tool.name},
          ${tool.description || ""},
          ${JSON.stringify(tool.inputSchema)},
          ${tool.outputSchema ? JSON.stringify(tool.outputSchema) : null},
          ${JSON.stringify(tool.embedding || [])},
          ${JSON.stringify(tool.categories || [])},
          ${tool.usageCount || 0},
          ${tool.lastUsed || null},
          ${0},
          ${0},
          ${timestamp},
          ${timestamp}
        )
      `;
      
      // Return new tool
      return {
        id: toolId,
        serverId: tool.serverId,
        name: tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        embedding: tool.embedding || [],
        categories: tool.categories || [],
        usageCount: tool.usageCount || 0,
        lastUsed: tool.lastUsed || 0,
        successCount: 0,
        failureCount: 0,
        discoveredAt: timestamp,
        updatedAt: timestamp
      };
    }
  }
  
  /**
   * Get registered tools
   * @param categories Optional categories to filter by
   * @returns Array of registered tools
   */
  async getRegisteredTools(categories: string[] = []): Promise<ToolRegistryEntry[]> {
    let query = this.agent.sql`
      SELECT * FROM tool_registry
    `;
    
    if (categories.length > 0) {
      // Filter by categories (tools that have at least one of the specified categories)
      const tools = await query;
      return tools
        .map(this.sqlRowToToolRegistryEntry)
        .filter(tool => {
          const toolCategories = tool.categories || [];
          return categories.some(category => toolCategories.includes(category));
        });
    } else {
      // Return all tools
      const tools = await query;
      return tools.map(this.sqlRowToToolRegistryEntry);
    }
  }
  
  /**
   * Suggest tools based on a query
   * @param options Suggestion options
   * @returns Array of tool suggestions
   */
  async suggestTools(options: ToolSuggestionOptions): Promise<ToolSuggestion[]> {
    const {
      query,
      limit = 5,
      threshold = 0.7,
      categories = [],
      considerUsage = true
    } = options;
    
    // Get query embedding
    const queryEmbedding = await this.embeddingManager.generateEmbedding(query);
    const queryVector = this.embeddingManager.getVector(queryEmbedding);
    
    // Get registered tools
    const tools = await this.getRegisteredTools(categories);
    
    // Calculate similarity scores
    const suggestions: ToolSuggestion[] = [];
    
    for (const tool of tools) {
      // Calculate semantic similarity
      const similarity = this.calculateCosineSimilarity(queryVector, tool.embedding);
      
      if (similarity >= threshold) {
        // Calculate usage score if enabled
        let usageScore = 0;
        if (considerUsage && tool.usageCount > 0) {
          // Log scale to prevent domination by very popular tools
          usageScore = Math.min(0.2, Math.log(tool.usageCount + 1) / Math.log(100));
        }
        
        // Calculate success rate score
        let successScore = 0;
        const totalUses = tool.successCount + tool.failureCount;
        if (totalUses > 0) {
          successScore = 0.1 * (tool.successCount / totalUses);
        }
        
        // Combined score
        const combinedScore = 0.7 * similarity + usageScore + successScore;
        
        // Generate reason for suggestion
        let reason = `Semantic match (${(similarity * 100).toFixed(1)}% similarity)`;
        if (usageScore > 0) {
          reason += `, Popular tool (${tool.usageCount} uses)`;
        }
        if (successScore > 0 && totalUses > 5) {
          const successRate = (tool.successCount / totalUses) * 100;
          reason += `, Reliable (${successRate.toFixed(1)}% success rate)`;
        }
        
        suggestions.push({
          tool,
          score: combinedScore,
          reason
        });
      }
    }
    
    // Sort by score and limit results
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Record tool usage
   * @param toolId ID of the tool
   * @param success Whether the usage was successful
   */
  async recordToolUsage(toolId: string, success: boolean): Promise<void> {
    const timestamp = Date.now();
    
    // Update tool usage statistics
    await this.agent.sql`
      UPDATE tool_registry
      SET 
        usage_count = usage_count + 1,
        last_used = ${timestamp},
        success_count = success_count + ${success ? 1 : 0},
        failure_count = failure_count + ${success ? 0 : 1}
      WHERE id = ${toolId}
    `;
  }
  
  /**
   * Create a tool composition
   * @param composition Tool composition to create
   * @returns Created composition
   */
  async createComposition(composition: Omit<ToolComposition, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<ToolComposition> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Insert composition
    await this.agent.sql`
      INSERT INTO tool_compositions (
        id, name, description, input_schema, output_schema,
        steps, created_at, updated_at, usage_count
      ) VALUES (
        ${id},
        ${composition.name},
        ${composition.description},
        ${JSON.stringify(composition.inputSchema)},
        ${JSON.stringify(composition.outputSchema)},
        ${JSON.stringify(composition.steps)},
        ${timestamp},
        ${timestamp},
        0
      )
    `;
    
    // Return created composition
    return {
      id,
      ...composition,
      createdAt: timestamp,
      updatedAt: timestamp,
      usageCount: 0
    };
  }
  
  /**
   * Get a tool composition
   * @param id ID of the composition
   * @returns Composition or null if not found
   */
  async getComposition(id: string): Promise<ToolComposition | null> {
    const result = await this.agent.sql`
      SELECT * FROM tool_compositions
      WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return {
      id: result[0].id as string,
      name: result[0].name as string,
      description: result[0].description as string,
      inputSchema: JSON.parse(result[0].input_schema as string),
      outputSchema: JSON.parse(result[0].output_schema as string),
      steps: JSON.parse(result[0].steps as string),
      createdAt: result[0].created_at as number,
      updatedAt: result[0].updated_at as number,
      usageCount: result[0].usage_count as number
    };
  }
  
  /**
   * List all tool compositions
   * @returns Array of compositions
   */
  async listCompositions(): Promise<ToolComposition[]> {
    const result = await this.agent.sql`
      SELECT * FROM tool_compositions
      ORDER BY usage_count DESC
    `;
    
    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      inputSchema: JSON.parse(row.input_schema as string),
      outputSchema: JSON.parse(row.output_schema as string),
      steps: JSON.parse(row.steps as string),
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      usageCount: row.usage_count as number
    }));
  }
  
  /**
   * Execute a tool composition
   * @param compositionId ID of the composition
   * @param input Input for the composition
   * @returns Composition output
   */
  async executeComposition(compositionId: string, input: any): Promise<any> {
    // Get composition
    const composition = await this.getComposition(compositionId);
    if (!composition) {
      throw new Error(`Composition ${compositionId} not found`);
    }
    
    // Execute steps
    const stepResults: any[] = [];
    
    for (const [index, step] of composition.steps.entries()) {
      // Resolve input mapping
      const resolvedInput: Record<string, any> = {};
      
      for (const [paramName, paramValue] of Object.entries(step.inputMapping)) {
        if (paramValue.startsWith("step[") && paramValue.includes("].")) {
          // Reference to previous step output
          const match = paramValue.match(/step\[(\d+)\]\.(.+)/);
          if (match) {
            const stepIndex = parseInt(match[1], 10);
            const outputPath = match[2];
            
            if (stepIndex < index && stepIndex < stepResults.length) {
              // Extract value from previous step result
              resolvedInput[paramName] = this.getValueByPath(stepResults[stepIndex], outputPath);
            } else {
              throw new Error(`Invalid step reference: ${paramValue}`);
            }
          }
        } else if (paramValue.startsWith("input.")) {
          // Reference to composition input
          const path = paramValue.substring(6);
          resolvedInput[paramName] = this.getValueByPath(input, path);
        } else {
          // Literal value
          resolvedInput[paramName] = paramValue;
        }
      }
      
      // Execute tool
      const [serverId, toolName] = step.toolId.split(":");
      const result = await this.mcpAdapter.callTool(serverId, toolName, resolvedInput);
      
      // Apply output mapping if specified
      let mappedResult = result;
      if (step.outputMapping) {
        mappedResult = {};
        for (const [outputName, outputPath] of Object.entries(step.outputMapping)) {
          mappedResult[outputName] = this.getValueByPath(result, outputPath);
        }
      }
      
      stepResults.push(mappedResult);
    }
    
    // Update usage count
    await this.agent.sql`
      UPDATE tool_compositions
      SET 
        usage_count = usage_count + 1,
        updated_at = ${Date.now()}
      WHERE id = ${compositionId}
    `;
    
    // Return final step result
    return stepResults[stepResults.length - 1];
  }
  
  /**
   * Categorize a tool automatically based on its description and schema
   * @param tool Tool to categorize
   * @returns Array of categories
   */
  private async categorizeToolAutomatically(tool: MCPTool): Promise<string[]> {
    const categories: Set<string> = new Set();
    const description = tool.description || "";
    const name = tool.name.toLowerCase();
    
    // Category detection based on keywords
    const categoryKeywords: Record<string, string[]> = {
      "calendar": ["calendar", "event", "schedule", "appointment", "meeting", "reminder"],
      "email": ["email", "mail", "message", "inbox", "outbox", "send"],
      "weather": ["weather", "forecast", "temperature", "climate", "precipitation"],
      "document": ["document", "file", "pdf", "docx", "spreadsheet", "presentation"],
      "search": ["search", "find", "query", "lookup", "discover"],
      "social": ["social", "network", "post", "share", "friend", "follow"],
      "finance": ["finance", "money", "payment", "transaction", "bank", "invest"],
      "travel": ["travel", "flight", "hotel", "booking", "reservation", "trip"],
      "shopping": ["shopping", "purchase", "buy", "order", "product", "item"],
      "news": ["news", "article", "headline", "report", "media"],
      "translation": ["translate", "language", "localization", "i18n"],
      "analytics": ["analytics", "statistics", "metrics", "dashboard", "report"],
      "ai": ["ai", "machine learning", "ml", "model", "prediction", "inference"],
      "utility": ["utility", "tool", "helper", "converter", "calculator"]
    };
    
    // Check name and description for category keywords
    const textToCheck = `${name} ${description}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => textToCheck.includes(keyword))) {
        categories.add(category);
      }
    }
    
    // Check input schema for additional clues
    if (tool.inputSchema && typeof tool.inputSchema === "object") {
      const schemaStr = JSON.stringify(tool.inputSchema).toLowerCase();
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => schemaStr.includes(keyword))) {
          categories.add(category);
        }
      }
    }
    
    // Always add "utility" as a fallback category if no categories were detected
    if (categories.size === 0) {
      categories.add("utility");
    }
    
    return Array.from(categories);
  }
  
  /**
   * Convert SQL row to tool registry entry
   * @param row SQL row
   * @returns Tool registry entry
   */
  private sqlRowToToolRegistryEntry(row: any): ToolRegistryEntry {
    return {
      id: row.id as string,
      serverId: row.server_id as string,
      name: row.name as string,
      description: row.description as string,
      inputSchema: JSON.parse(row.input_schema as string),
      outputSchema: row.output_schema ? JSON.parse(row.output_schema as string) : undefined,
      embedding: JSON.parse(row.embedding as string),
      categories: JSON.parse(row.categories as string),
      usageCount: row.usage_count as number,
      lastUsed: row.last_used as number || 0,
      successCount: row.success_count as number,
      failureCount: row.failure_count as number,
      discoveredAt: row.discovered_at as number,
      updatedAt: row.updated_at as number
    };
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Similarity score (0-1)
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Get a value from an object by path
   * @param obj Object to get value from
   * @param path Path to the value (e.g., "user.profile.name")
   * @returns Value at the path or undefined if not found
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split(".");
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
}
