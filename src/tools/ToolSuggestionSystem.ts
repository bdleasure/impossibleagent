import { Agent } from "agents";
import { ToolDiscoveryManager } from "./ToolDiscoveryManager";
import type { ToolSuggestion } from "./ToolDiscoveryManager";
// Import only the types from ToolUsageTracker to avoid circular dependency
import type { ToolUsageTracker } from "./ToolUsageTracker";
import { EmbeddingManager } from "../memory/EmbeddingManager";

/**
 * Interface for conversation context
 */
export interface ConversationContext {
  /**
   * Conversation ID
   */
  id: string;
  
  /**
   * Recent messages in the conversation
   */
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }[];
  
  /**
   * Extracted entities from the conversation
   */
  entities?: string[];
  
  /**
   * Detected intents from the conversation
   */
  intents?: string[];
  
  /**
   * Current conversation topic
   */
  topic?: string;
}

/**
 * Interface for tool suggestion context
 */
export interface ToolSuggestionContext {
  /**
   * Conversation context
   */
  conversation: ConversationContext;
  
  /**
   * User query that triggered the suggestion
   */
  query: string;
  
  /**
   * Previously used tools in this conversation
   */
  previousTools?: string[];
  
  /**
   * User preferences
   */
  preferences?: {
    preferredCategories?: string[];
    blockedTools?: string[];
    favoriteTools?: string[];
  };
}

/**
 * Interface for contextual tool suggestion
 */
export interface ContextualToolSuggestion extends ToolSuggestion {
  /**
   * Context relevance score (0-1)
   */
  contextRelevance: number;
  
  /**
   * Whether this is a composition suggestion
   */
  isComposition: boolean;
  
  /**
   * Suggested input values based on conversation context
   */
  suggestedInputs?: Record<string, any>;
}

/**
 * ToolSuggestionSystem provides intelligent tool suggestions based on conversation context
 */
export class ToolSuggestionSystem<Env> {
  /**
   * Tool discovery manager
   */
  private discoveryManager: ToolDiscoveryManager<Env>;
  
  /**
   * Embedding manager for semantic matching
   */
  private embeddingManager: EmbeddingManager;
  
  /**
   * Tool usage tracker for analytics
   */
  private usageTracker: any; // Use any type to avoid circular dependency
  
  /**
   * Create a new ToolSuggestionSystem
   * @param agent The agent instance
   */
  constructor(private agent: Agent<Env>) {
    this.discoveryManager = new ToolDiscoveryManager<Env>(agent);
    this.embeddingManager = new EmbeddingManager();
    // Defer creation of ToolUsageTracker to avoid circular dependency
    // We'll initialize it in the initialize method
  }
  
  /**
   * Initialize the tool suggestion system
   */
  async initialize(): Promise<void> {
    // Initialize managers
    await this.discoveryManager.initialize();
    await this.embeddingManager.initialize();
    
    // Dynamically import ToolUsageTracker to avoid circular dependency
    // This is a workaround - in a real implementation, we would refactor the code
    // to avoid circular dependencies entirely
    try {
      const { ToolUsageTracker } = await import('./ToolUsageTracker');
      this.usageTracker = new ToolUsageTracker(this.agent);
      await this.usageTracker.initialize();
    } catch (error) {
      console.error("Failed to initialize ToolUsageTracker:", error);
      // Create a stub implementation to avoid errors
      this.usageTracker = {
        startTracking: () => ({ trackingId: 'stub', endTracking: async () => {} }),
        trackToolUsage: async () => 'stub'
      };
    }
    
    // Create tables for conversation context and suggestion history
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS conversation_contexts (
        id TEXT PRIMARY KEY,
        messages TEXT NOT NULL,
        entities TEXT,
        intents TEXT,
        topic TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS tool_suggestion_history (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        query TEXT NOT NULL,
        suggested_tools TEXT NOT NULL,
        selected_tool_id TEXT,
        success_reported BOOLEAN,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversation_contexts(id)
          ON DELETE CASCADE
      )
    `;
    
    // Create indexes
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_suggestion_history_conversation_id
      ON tool_suggestion_history(conversation_id)
    `;
  }
  
  /**
   * Store or update conversation context
   * @param context Conversation context to store
   * @returns Stored context ID
   */
  async storeConversationContext(context: ConversationContext): Promise<string> {
    const timestamp = Date.now();
    
    // Check if context already exists
    const existingContext = await this.agent.sql`
      SELECT * FROM conversation_contexts
      WHERE id = ${context.id}
    `;
    
    if (existingContext.length > 0) {
      // Update existing context
      await this.agent.sql`
        UPDATE conversation_contexts
        SET 
          messages = ${JSON.stringify(context.messages)},
          entities = ${context.entities ? JSON.stringify(context.entities) : null},
          intents = ${context.intents ? JSON.stringify(context.intents) : null},
          topic = ${context.topic || null},
          updated_at = ${timestamp}
        WHERE id = ${context.id}
      `;
      
      return context.id;
    } else {
      // Insert new context
      await this.agent.sql`
        INSERT INTO conversation_contexts (
          id, messages, entities, intents, topic, created_at, updated_at
        ) VALUES (
          ${context.id},
          ${JSON.stringify(context.messages)},
          ${context.entities ? JSON.stringify(context.entities) : null},
          ${context.intents ? JSON.stringify(context.intents) : null},
          ${context.topic || null},
          ${timestamp},
          ${timestamp}
        )
      `;
      
      return context.id;
    }
  }
  
  /**
   * Get conversation context by ID
   * @param id Context ID
   * @returns Conversation context or null if not found
   */
  async getConversationContext(id: string): Promise<ConversationContext | null> {
    const result = await this.agent.sql`
      SELECT * FROM conversation_contexts
      WHERE id = ${id}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return {
      id: result[0].id as string,
      messages: JSON.parse(result[0].messages as string),
      entities: result[0].entities ? JSON.parse(result[0].entities as string) : undefined,
      intents: result[0].intents ? JSON.parse(result[0].intents as string) : undefined,
      topic: result[0].topic as string || undefined
    };
  }
  
  /**
   * Extract entities from text using NLP techniques
   * @param text Text to extract entities from
   * @returns Array of extracted entities
   */
  private async extractEntities(text: string): Promise<string[]> {
    // In a real implementation, this would use NLP techniques
    // For now, we'll use a simple keyword extraction approach
    
    // Common entity types to look for
    const entityPatterns: Record<string, RegExp[]> = {
      date: [
        /\b(?:today|tomorrow|yesterday)\b/gi,
        /\b(?:next|last) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        /\b(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(?:st|nd|rd|th)?\b/gi,
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
      ],
      time: [
        /\b(?:\d{1,2}:\d{2}(?: ?[ap]m)?)\b/gi,
        /\b(?:noon|midnight|morning|afternoon|evening|night)\b/gi
      ],
      location: [
        /\bin (?:[A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g,
        /\bto (?:[A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g,
        /\bfrom (?:[A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g
      ],
      person: [
        /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.) [A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g
      ],
      email: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ],
      url: [
        /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g
      ],
      number: [
        /\b\d+(?:\.\d+)?\b/g
      ]
    };
    
    const entities: string[] = [];
    
    // Extract entities using patterns
    for (const [entityType, patterns] of Object.entries(entityPatterns)) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            entities.push(`${entityType}:${match.trim()}`);
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Detect intents from text
   * @param text Text to detect intents from
   * @returns Array of detected intents
   */
  private async detectIntents(text: string): Promise<string[]> {
    // In a real implementation, this would use NLP techniques
    // For now, we'll use a simple keyword-based approach
    
    const intentPatterns: Record<string, string[]> = {
      "search": ["search for", "find", "look up", "search", "query"],
      "schedule": ["schedule", "book", "appointment", "meeting", "calendar"],
      "weather": ["weather", "forecast", "temperature", "rain", "snow"],
      "email": ["email", "send", "message", "mail"],
      "reminder": ["remind", "remember", "don't forget", "reminder"],
      "navigation": ["directions", "navigate", "map", "route", "go to"],
      "information": ["what is", "tell me about", "information on", "details about"],
      "translation": ["translate", "in spanish", "in french", "in german", "in japanese"],
      "calculation": ["calculate", "compute", "how much", "sum", "total"],
      "comparison": ["compare", "difference between", "versus", "vs"]
    };
    
    const intents: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Detect intents using keyword matching
    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        intents.push(intent);
      }
    }
    
    return intents;
  }
  
  /**
   * Analyze conversation context to extract entities and intents
   * @param context Conversation context to analyze
   * @returns Updated conversation context with entities and intents
   */
  async analyzeConversationContext(context: ConversationContext): Promise<ConversationContext> {
    // Extract text from recent messages (last 5)
    const recentMessages = context.messages
      .slice(-5)
      .map(msg => msg.content)
      .join(" ");
    
    // Extract entities and intents
    const entities = await this.extractEntities(recentMessages);
    const intents = await this.detectIntents(recentMessages);
    
    // Determine conversation topic
    const topic = await this.determineConversationTopic(recentMessages);
    
    // Update context
    const updatedContext: ConversationContext = {
      ...context,
      entities,
      intents,
      topic
    };
    
    // Store updated context
    await this.storeConversationContext(updatedContext);
    
    return updatedContext;
  }
  
  /**
   * Determine the main topic of a conversation
   * @param text Conversation text
   * @returns Main topic
   */
  private async determineConversationTopic(text: string): Promise<string> {
    // In a real implementation, this would use more sophisticated NLP
    // For now, we'll use a simple keyword frequency approach
    
    // Remove common stop words
    const stopWords = new Set([
      "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with",
      "by", "about", "as", "into", "like", "through", "after", "over", "between",
      "out", "against", "during", "without", "before", "under", "around", "among",
      "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
      "do", "does", "did", "will", "would", "shall", "should", "may", "might",
      "must", "can", "could", "i", "you", "he", "she", "it", "we", "they",
      "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their",
      "this", "that", "these", "those"
    ]);
    
    // Tokenize and count word frequencies
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    const wordCounts: Record<string, number> = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Find the most frequent word as the topic
    let maxCount = 0;
    let topic = "general";
    
    for (const [word, count] of Object.entries(wordCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topic = word;
      }
    }
    
    return topic;
  }
  
  /**
   * Get previously used tools in a conversation
   * @param conversationId Conversation ID
   * @returns Array of tool IDs
   */
  async getPreviouslyUsedTools(conversationId: string): Promise<string[]> {
    const result = await this.agent.sql`
      SELECT selected_tool_id FROM tool_suggestion_history
      WHERE conversation_id = ${conversationId}
        AND selected_tool_id IS NOT NULL
      ORDER BY created_at DESC
    `;
    
    return result
      .map(row => row.selected_tool_id as string)
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
  }
  
  /**
   * Suggest tools based on conversation context
   * @param context Tool suggestion context
   * @returns Array of contextual tool suggestions
   */
  async suggestTools(context: ToolSuggestionContext): Promise<ContextualToolSuggestion[]> {
    // Analyze conversation context if entities and intents are not provided
    let analyzedContext = context.conversation;
    if (!analyzedContext.entities || !analyzedContext.intents) {
      analyzedContext = await this.analyzeConversationContext(analyzedContext);
    }
    
    // Get previously used tools if not provided
    const previousTools = context.previousTools || 
      await this.getPreviouslyUsedTools(analyzedContext.id);
    
    // Determine relevant categories based on intents
    const relevantCategories = this.mapIntentsToCategories(analyzedContext.intents || []);
    
    // Get base tool suggestions based on query
    const baseSuggestions = await this.discoveryManager.suggestTools({
      query: context.query,
      limit: 10, // Get more than needed for filtering
      threshold: 0.6,
      categories: relevantCategories,
      considerUsage: true
    });
    
    // Enhance suggestions with context relevance
    const contextualSuggestions: ContextualToolSuggestion[] = [];
    
    for (const suggestion of baseSuggestions) {
      // Calculate context relevance score
      const contextRelevance = await this.calculateContextRelevance(
        suggestion.tool,
        analyzedContext,
        previousTools
      );
      
      // Generate suggested inputs based on entities
      const suggestedInputs = this.generateSuggestedInputs(
        suggestion.tool,
        analyzedContext.entities || []
      );
      
      contextualSuggestions.push({
        ...suggestion,
        contextRelevance,
        isComposition: false,
        suggestedInputs
      });
    }
    
    // Add composition suggestions if appropriate
    const compositionSuggestions = await this.suggestCompositions(
      context.query,
      analyzedContext,
      previousTools
    );
    
    // Combine and sort suggestions
    const allSuggestions = [...contextualSuggestions, ...compositionSuggestions];
    
    // Apply user preferences
    const filteredSuggestions = this.applyUserPreferences(
      allSuggestions,
      context.preferences
    );
    
    // Sort by combined score (semantic + context relevance)
    const sortedSuggestions = filteredSuggestions.sort((a, b) => {
      const scoreA = 0.5 * a.score + 0.5 * a.contextRelevance;
      const scoreB = 0.5 * b.score + 0.5 * b.contextRelevance;
      return scoreB - scoreA;
    });
    
    // Store suggestion history
    await this.storeSuggestionHistory(
      analyzedContext.id,
      context.query,
      sortedSuggestions
    );
    
    // Return top suggestions
    return sortedSuggestions.slice(0, 5);
  }
  
  /**
   * Map intents to relevant tool categories
   * @param intents Detected intents
   * @returns Array of relevant categories
   */
  private mapIntentsToCategories(intents: string[]): string[] {
    const intentCategoryMap: Record<string, string[]> = {
      "search": ["search", "utility"],
      "schedule": ["calendar", "utility"],
      "weather": ["weather"],
      "email": ["email", "communication"],
      "reminder": ["calendar", "utility"],
      "navigation": ["travel", "utility"],
      "information": ["search", "utility"],
      "translation": ["translation", "utility"],
      "calculation": ["utility", "analytics"],
      "comparison": ["analytics", "utility"]
    };
    
    const categories = new Set<string>();
    
    for (const intent of intents) {
      const mappedCategories = intentCategoryMap[intent] || [];
      for (const category of mappedCategories) {
        categories.add(category);
      }
    }
    
    return Array.from(categories);
  }
  
  /**
   * Calculate context relevance score for a tool
   * @param tool Tool to evaluate
   * @param context Conversation context
   * @param previousTools Previously used tools
   * @returns Context relevance score (0-1)
   */
  private async calculateContextRelevance(
    tool: any,
    context: ConversationContext,
    previousTools: string[]
  ): Promise<number> {
    let score = 0;
    
    // Check if tool was previously used in this conversation
    if (previousTools.includes(tool.id)) {
      score += 0.2;
    }
    
    // Check if tool category matches conversation topic
    if (context.topic && tool.categories.includes(context.topic)) {
      score += 0.3;
    }
    
    // Check if tool category matches detected intents
    if (context.intents) {
      const relevantCategories = this.mapIntentsToCategories(context.intents);
      const categoryMatch = tool.categories.some(
        (category: string) => relevantCategories.includes(category)
      );
      
      if (categoryMatch) {
        score += 0.3;
      }
    }
    
    // Check if tool input parameters match extracted entities
    if (context.entities && tool.inputSchema && tool.inputSchema.properties) {
      const entityTypes = context.entities.map(e => e.split(":")[0]);
      const parameterNames = Object.keys(tool.inputSchema.properties);
      
      // Simple matching based on parameter names and entity types
      const matchCount = parameterNames.filter(param => 
        entityTypes.some(type => 
          param.toLowerCase().includes(type.toLowerCase())
        )
      ).length;
      
      if (matchCount > 0) {
        score += 0.2 * Math.min(1, matchCount / parameterNames.length);
      }
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Generate suggested input values based on extracted entities
   * @param tool Tool to generate inputs for
   * @param entities Extracted entities
   * @returns Suggested input values
   */
  private generateSuggestedInputs(
    tool: any,
    entities: string[]
  ): Record<string, any> {
    const suggestedInputs: Record<string, any> = {};
    
    // Only process if tool has input schema
    if (!tool.inputSchema || !tool.inputSchema.properties) {
      return suggestedInputs;
    }
    
    // Map entity types to parameter types
    const entityTypeMap: Record<string, string[]> = {
      "date": ["date", "time", "datetime"],
      "time": ["time", "datetime"],
      "location": ["location", "place", "address", "city", "country"],
      "person": ["person", "name", "contact"],
      "email": ["email", "mail"],
      "url": ["url", "website", "link"],
      "number": ["number", "amount", "quantity"]
    };
    
    // Process each parameter in the input schema
    for (const [paramName, paramSchema] of Object.entries(tool.inputSchema.properties)) {
      // Find matching entity types for this parameter
      const matchingTypes: string[] = [];
      
      for (const [entityType, paramTypes] of Object.entries(entityTypeMap)) {
        if (paramTypes.some(type => paramName.toLowerCase().includes(type))) {
          matchingTypes.push(entityType);
        }
      }
      
      // Find matching entities
      for (const entityType of matchingTypes) {
        const matchingEntities = entities.filter(e => e.startsWith(`${entityType}:`));
        
        if (matchingEntities.length > 0) {
          // Use the first matching entity
          const entityValue = matchingEntities[0].split(":")[1];
          suggestedInputs[paramName] = entityValue;
          break;
        }
      }
    }
    
    return suggestedInputs;
  }
  
  /**
   * Suggest tool compositions based on conversation context
   * @param query User query
   * @param context Conversation context
   * @param previousTools Previously used tools
   * @returns Array of composition suggestions
   */
  private async suggestCompositions(
    query: string,
    context: ConversationContext,
    previousTools: string[]
  ): Promise<ContextualToolSuggestion[]> {
    // Get all available compositions
    const compositions = await this.discoveryManager.listCompositions();
    
    // Generate embeddings for compositions
    const queryEmbedding = await this.embeddingManager.generateEmbedding(query);
    const suggestions: ContextualToolSuggestion[] = [];
    
    for (const composition of compositions) {
      // Generate embedding for composition description
      const descriptionEmbedding = await this.embeddingManager.generateEmbedding(
        `${composition.name} ${composition.description}`
      );
      
      // Calculate semantic similarity
      const similarity = this.calculateCosineSimilarity(
        this.embeddingManager.getVector(queryEmbedding),
        this.embeddingManager.getVector(descriptionEmbedding)
      );
      
      if (similarity >= 0.65) { // Higher threshold for compositions
        // Calculate context relevance
        let contextRelevance = 0;
        
        // Check if composition uses previously used tools
        const usedToolIds = composition.steps.map(step => step.toolId);
        const previousToolOverlap = previousTools.filter(
          id => usedToolIds.includes(id)
        ).length;
        
        if (previousToolOverlap > 0) {
          contextRelevance += 0.3 * Math.min(1, previousToolOverlap / usedToolIds.length);
        }
        
        // Check if composition matches intents
        if (context.intents) {
          const intentMatch = context.intents.some(intent => 
            composition.name.toLowerCase().includes(intent) || 
            composition.description.toLowerCase().includes(intent)
          );
          
          if (intentMatch) {
            contextRelevance += 0.4;
          }
        }
        
        // Generate suggested inputs
        const suggestedInputs = this.generateCompositionInputs(
          composition,
          context.entities || []
        );
        
        suggestions.push({
          tool: {
            id: composition.id,
            serverId: "composition",
            name: composition.name,
            description: composition.description,
            inputSchema: composition.inputSchema,
            outputSchema: composition.outputSchema,
            embedding: this.embeddingManager.getVector(descriptionEmbedding),
            categories: ["composition"],
            usageCount: composition.usageCount,
            lastUsed: composition.updatedAt,
            successCount: 0,
            failureCount: 0,
            discoveredAt: composition.createdAt,
            updatedAt: composition.updatedAt
          },
          score: similarity,
          reason: `Composition that combines ${usedToolIds.length} tools`,
          contextRelevance,
          isComposition: true,
          suggestedInputs
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate suggested inputs for a composition
   * @param composition Tool composition
   * @param entities Extracted entities
   * @returns Suggested input values
   */
  private generateCompositionInputs(
    composition: any,
    entities: string[]
  ): Record<string, any> {
    // Similar to generateSuggestedInputs but for compositions
    return this.generateSuggestedInputs(
      { inputSchema: composition.inputSchema },
      entities
    );
  }
  
  /**
   * Apply user preferences to filter and rank suggestions
   * @param suggestions Tool suggestions
   * @param preferences User preferences
   * @returns Filtered and re-ranked suggestions
   */
  private applyUserPreferences(
    suggestions: ContextualToolSuggestion[],
    preferences?: {
      preferredCategories?: string[];
      blockedTools?: string[];
      favoriteTools?: string[];
    }
  ): ContextualToolSuggestion[] {
    if (!preferences) {
      return suggestions;
    }
    
    // Filter out blocked tools
    let filtered = suggestions;
    if (preferences.blockedTools && preferences.blockedTools.length > 0) {
      filtered = filtered.filter(
        suggestion => !preferences.blockedTools!.includes(suggestion.tool.id)
      );
    }
    
    // Boost score for favorite tools
    if (preferences.favoriteTools && preferences.favoriteTools.length > 0) {
      filtered = filtered.map(suggestion => {
        if (preferences.favoriteTools!.includes(suggestion.tool.id)) {
          return {
            ...suggestion,
            score: Math.min(1, suggestion.score + 0.2),
            reason: `${suggestion.reason} (Favorite tool)`
          };
        }
        return suggestion;
      });
    }
    
    // Boost score for preferred categories
    if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
      filtered = filtered.map(suggestion => {
        const categoryMatch = suggestion.tool.categories.some(
          (category: string) => preferences.preferredCategories!.includes(category)
        );
        
        if (categoryMatch) {
          return {
            ...suggestion,
            score: Math.min(1, suggestion.score + 0.1),
            reason: `${suggestion.reason} (Preferred category)`
          };
        }
        return suggestion;
      });
    }
    
    return filtered;
  }
  
  /**
   * Store tool suggestion history
   * @param conversationId Conversation ID
   * @param query User query
   * @param suggestions Tool suggestions
   */
  private async storeSuggestionHistory(
    conversationId: string,
    query: string,
    suggestions: ContextualToolSuggestion[]
  ): Promise<void> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.agent.sql`
      INSERT INTO tool_suggestion_history (
        id, conversation_id, query, suggested_tools,
        selected_tool_id, success_reported, created_at
      ) VALUES (
        ${id},
        ${conversationId},
        ${query},
        ${JSON.stringify(suggestions.map(s => s.tool.id))},
        ${null},
        ${null},
        ${timestamp}
      )
    `;
  }
  
  /**
   * Record tool selection from suggestions
   * @param suggestionId Suggestion history ID
   * @param toolId Selected tool ID
   * @param userId User ID
   * @param conversationId Conversation ID
   */
  async recordToolSelection(
    suggestionId: string, 
    toolId: string, 
    userId: string, 
    conversationId: string
  ): Promise<void> {
    // Update suggestion history
    await this.agent.sql`
      UPDATE tool_suggestion_history
      SET selected_tool_id = ${toolId}
      WHERE id = ${suggestionId}
    `;
    
    // Get suggestion history to determine if tool was suggested
    const suggestionResult = await this.agent.sql`
      SELECT suggested_tools, query FROM tool_suggestion_history
      WHERE id = ${suggestionId}
    `;
    
    if (suggestionResult.length > 0) {
      const suggestedTools = JSON.parse(suggestionResult[0].suggested_tools as string);
      const query = suggestionResult[0].query as string;
      const wasSuggested = suggestedTools.includes(toolId);
      
      // Get tool details from registered tools
      const allTools = await this.discoveryManager.getRegisteredTools();
      const toolInfo = allTools.find(tool => tool.id === toolId);
      
      if (toolInfo) {
        // Start tracking tool usage
        const [serverId, toolName] = toolId.split(':');
        
        // Create context for tool usage tracking
        const context = {
          query,
          intents: await this.detectIntents(query),
          topic: await this.determineConversationTopic(query)
        };
        
        // Store tracking info in agent state for later completion
        await this.agent.setState({
          [`toolTracking:${suggestionId}`]: {
            trackingInfo: this.usageTracker.startTracking(
              toolId,
              serverId,
              toolName,
              conversationId,
              userId,
              {}, // Input params will be added when the tool is executed
              context,
              wasSuggested,
              false // Auto-selected
            ),
            toolInfo
          }
        });
      }
    }
  }
  
  /**
   * Record tool usage success or failure
   * @param suggestionId Suggestion history ID
   * @param success Whether the tool usage was successful
   * @param errorMessage Error message if unsuccessful
   * @param inputParams Input parameters used
   */
  async recordToolUsageResult(
    suggestionId: string, 
    success: boolean, 
    errorMessage?: string,
    inputParams?: Record<string, any>
  ): Promise<void> {
    // Update suggestion history
    await this.agent.sql`
      UPDATE tool_suggestion_history
      SET success_reported = ${success}
      WHERE id = ${suggestionId}
    `;
    
    // Get selected tool ID
    const result = await this.agent.sql`
      SELECT selected_tool_id FROM tool_suggestion_history
      WHERE id = ${suggestionId}
    `;
    
    if (result.length > 0 && result[0].selected_tool_id) {
      const toolId = result[0].selected_tool_id as string;
      
      // Record tool usage in discovery manager
      await this.discoveryManager.recordToolUsage(toolId, success);
      
      try {
        // Get tracking data from SQL storage instead of using getState
        const trackingDataResult = await this.agent.sql`
          SELECT value FROM agent_state
          WHERE key = ${'toolTracking:' + suggestionId}
        `;
        
        if (trackingDataResult.length > 0) {
          const trackingData = JSON.parse(trackingDataResult[0].value as string);
          
          if (trackingData && trackingData.trackingInfo) {
            // End tracking with success/failure info
            await trackingData.trackingInfo.endTracking(success, errorMessage);
            
            // Clean up tracking state
            await this.agent.sql`
              DELETE FROM agent_state
              WHERE key = ${'toolTracking:' + suggestionId}
            `;
          }
        }
      } catch (error) {
        console.error("Error completing tool usage tracking:", error);
      }
    }
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
}
