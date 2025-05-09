import { Agent } from "agents";
import { ToolDiscoveryManager } from "./ToolDiscoveryManager";
import { ToolSuggestionSystem } from "./ToolSuggestionSystem";

/**
 * Interface for tool usage event
 */
export interface ToolUsageEvent {
  /**
   * Unique ID for the usage event
   */
  id: string;
  
  /**
   * Tool ID (serverId:toolName)
   */
  toolId: string;
  
  /**
   * Server ID
   */
  serverId: string;
  
  /**
   * Tool name
   */
  toolName: string;
  
  /**
   * Conversation ID
   */
  conversationId: string;
  
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Input parameters (sanitized)
   */
  inputParams: Record<string, any>;
  
  /**
   * Whether the tool execution was successful
   */
  success: boolean;
  
  /**
   * Error message if unsuccessful
   */
  errorMessage?: string;
  
  /**
   * Execution duration in milliseconds
   */
  executionTime: number;
  
  /**
   * Whether the tool was suggested by the system
   */
  wasSuggested: boolean;
  
  /**
   * Whether the tool was auto-selected
   */
  wasAutoSelected: boolean;
  
  /**
   * Context information
   */
  context: {
    /**
     * Query that led to the tool usage
     */
    query?: string;
    
    /**
     * Detected intents
     */
    intents?: string[];
    
    /**
     * Conversation topic
     */
    topic?: string;
  };
  
  /**
   * Timestamp when the tool was invoked
   */
  invokedAt: number;
  
  /**
   * Timestamp when the tool execution completed
   */
  completedAt: number;
}

/**
 * Interface for tool usage statistics
 */
export interface ToolUsageStats {
  /**
   * Tool ID
   */
  toolId: string;
  
  /**
   * Total usage count
   */
  totalUsage: number;
  
  /**
   * Successful usage count
   */
  successCount: number;
  
  /**
   * Failed usage count
   */
  failureCount: number;
  
  /**
   * Average execution time in milliseconds
   */
  avgExecutionTime: number;
  
  /**
   * Usage count by day for the last 30 days
   */
  usageByDay: Record<string, number>;
  
  /**
   * Success rate (0-1)
   */
  successRate: number;
  
  /**
   * Percentage of times the tool was suggested
   */
  suggestionRate: number;
  
  /**
   * Percentage of times the tool was auto-selected
   */
  autoSelectionRate: number;
  
  /**
   * Most common intents when using this tool
   */
  commonIntents: Array<{intent: string; count: number}>;
  
  /**
   * Most common topics when using this tool
   */
  commonTopics: Array<{topic: string; count: number}>;
  
  /**
   * First used timestamp
   */
  firstUsed: number;
  
  /**
   * Last used timestamp
   */
  lastUsed: number;
}

/**
 * Interface for user tool usage statistics
 */
export interface UserToolUsageStats {
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Total tool usage count
   */
  totalUsage: number;
  
  /**
   * Most frequently used tools
   */
  favoriteTools: Array<{toolId: string; count: number}>;
  
  /**
   * Most common intents
   */
  commonIntents: Array<{intent: string; count: number}>;
  
  /**
   * Most common topics
   */
  commonTopics: Array<{topic: string; count: number}>;
  
  /**
   * Usage patterns by time of day
   */
  usageByHour: Record<string, number>;
  
  /**
   * Usage patterns by day of week
   */
  usageByDayOfWeek: Record<string, number>;
  
  /**
   * First tool usage timestamp
   */
  firstUsed: number;
  
  /**
   * Last tool usage timestamp
   */
  lastUsed: number;
}

/**
 * Interface for tool usage query options
 */
export interface ToolUsageQueryOptions {
  /**
   * Tool ID to filter by
   */
  toolId?: string;
  
  /**
   * Server ID to filter by
   */
  serverId?: string;
  
  /**
   * User ID to filter by
   */
  userId?: string;
  
  /**
   * Conversation ID to filter by
   */
  conversationId?: string;
  
  /**
   * Start timestamp for time range
   */
  startTime?: number;
  
  /**
   * End timestamp for time range
   */
  endTime?: number;
  
  /**
   * Whether to filter for successful executions only
   */
  successOnly?: boolean;
  
  /**
   * Whether to filter for failed executions only
   */
  failureOnly?: boolean;
  
  /**
   * Whether to filter for suggested tools only
   */
  suggestedOnly?: boolean;
  
  /**
   * Whether to filter for auto-selected tools only
   */
  autoSelectedOnly?: boolean;
  
  /**
   * Intent to filter by
   */
  intent?: string;
  
  /**
   * Topic to filter by
   */
  topic?: string;
  
  /**
   * Maximum number of results to return
   */
  limit?: number;
  
  /**
   * Number of results to skip (for pagination)
   */
  offset?: number;
  
  /**
   * Field to sort by
   */
  sortBy?: 'invokedAt' | 'completedAt' | 'executionTime';
  
  /**
   * Sort direction
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Interface for tool recommendation
 */
export interface ToolRecommendation {
  /**
   * Tool ID
   */
  toolId: string;
  
  /**
   * Tool name
   */
  toolName: string;
  
  /**
   * Server ID
   */
  serverId: string;
  
  /**
   * Recommendation score (0-1)
   */
  score: number;
  
  /**
   * Reason for recommendation
   */
  reason: string;
  
  /**
   * Whether this is a new tool for the user
   */
  isNew: boolean;
  
  /**
   * Whether this is a trending tool
   */
  isTrending: boolean;
  
  /**
   * Whether this is a frequently used tool by the user
   */
  isFavorite: boolean;
}

/**
 * ToolUsageTracker monitors and analyzes tool usage patterns
 */
export class ToolUsageTracker<Env> {
  /**
   * Tool discovery manager
   */
  private discoveryManager: ToolDiscoveryManager<Env>;
  
  /**
   * Tool suggestion system
   */
  private suggestionSystem: ToolSuggestionSystem<Env>;
  
  /**
   * Create a new ToolUsageTracker
   * @param agent The agent instance
   */
  constructor(private agent: Agent<Env>) {
    this.discoveryManager = new ToolDiscoveryManager<Env>(agent);
    this.suggestionSystem = new ToolSuggestionSystem<Env>(agent);
  }
  
  /**
   * Initialize the tool usage tracker
   */
  async initialize(): Promise<void> {
    // Initialize managers
    await this.discoveryManager.initialize();
    await this.suggestionSystem.initialize();
    
    // Create tables for tool usage tracking
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS tool_usage_events (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        input_params TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        execution_time INTEGER NOT NULL,
        was_suggested BOOLEAN NOT NULL,
        was_auto_selected BOOLEAN NOT NULL,
        context TEXT NOT NULL,
        invoked_at INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS tool_usage_aggregates (
        tool_id TEXT PRIMARY KEY,
        total_usage INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failure_count INTEGER NOT NULL,
        total_execution_time INTEGER NOT NULL,
        usage_by_day TEXT NOT NULL,
        suggestion_count INTEGER NOT NULL,
        auto_selection_count INTEGER NOT NULL,
        intent_counts TEXT NOT NULL,
        topic_counts TEXT NOT NULL,
        first_used INTEGER NOT NULL,
        last_used INTEGER NOT NULL
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS user_tool_usage_stats (
        user_id TEXT PRIMARY KEY,
        total_usage INTEGER NOT NULL,
        favorite_tools TEXT NOT NULL,
        intent_counts TEXT NOT NULL,
        topic_counts TEXT NOT NULL,
        usage_by_hour TEXT NOT NULL,
        usage_by_day_of_week TEXT NOT NULL,
        first_used INTEGER NOT NULL,
        last_used INTEGER NOT NULL
      )
    `;
    
    // Create indexes for faster lookups
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_usage_events_tool_id 
      ON tool_usage_events(tool_id)
    `;
    
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_usage_events_user_id 
      ON tool_usage_events(user_id)
    `;
    
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_usage_events_conversation_id 
      ON tool_usage_events(conversation_id)
    `;
    
    await this.agent.sql`
      CREATE INDEX IF NOT EXISTS idx_tool_usage_events_invoked_at 
      ON tool_usage_events(invoked_at)
    `;
    
    // Schedule daily aggregation task
    this.agent.schedule("0 0 * * *", this.aggregateToolUsageStats.name as keyof Agent<Env, unknown>);
  }
  
  /**
   * Track a tool usage event
   * @param event Tool usage event to track
   * @returns Tracked event ID
   */
  async trackToolUsage(event: Omit<ToolUsageEvent, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    
    // Insert event
    await this.agent.sql`
      INSERT INTO tool_usage_events (
        id, tool_id, server_id, tool_name, conversation_id, user_id,
        input_params, success, error_message, execution_time,
        was_suggested, was_auto_selected, context,
        invoked_at, completed_at
      ) VALUES (
        ${id},
        ${event.toolId},
        ${event.serverId},
        ${event.toolName},
        ${event.conversationId},
        ${event.userId},
        ${JSON.stringify(event.inputParams)},
        ${event.success},
        ${event.errorMessage || null},
        ${event.executionTime},
        ${event.wasSuggested},
        ${event.wasAutoSelected},
        ${JSON.stringify(event.context)},
        ${event.invokedAt},
        ${event.completedAt}
      )
    `;
    
    // Update tool usage statistics in discovery manager
    await this.discoveryManager.recordToolUsage(event.toolId, event.success);
    
    // Update aggregates in real-time for frequently accessed statistics
    await this.updateAggregatesForEvent(event);
    
    return id;
  }
  
  /**
   * Start tracking a tool usage event
   * @param toolId Tool ID
   * @param serverId Server ID
   * @param toolName Tool name
   * @param conversationId Conversation ID
   * @param userId User ID
   * @param inputParams Input parameters
   * @param context Context information
   * @param wasSuggested Whether the tool was suggested
   * @param wasAutoSelected Whether the tool was auto-selected
   * @returns Object with tracking ID and end tracking function
   */
  startTracking(
    toolId: string,
    serverId: string,
    toolName: string,
    conversationId: string,
    userId: string,
    inputParams: Record<string, any>,
    context: {
      query?: string;
      intents?: string[];
      topic?: string;
    },
    wasSuggested: boolean = false,
    wasAutoSelected: boolean = false
  ): {
    trackingId: string;
    endTracking: (success: boolean, errorMessage?: string) => Promise<void>;
  } {
    const trackingId = crypto.randomUUID();
    const invokedAt = Date.now();
    
    // Return a function to end tracking
    const endTracking = async (success: boolean, errorMessage?: string) => {
      const completedAt = Date.now();
      const executionTime = completedAt - invokedAt;
      
      await this.trackToolUsage({
        toolId,
        serverId,
        toolName,
        conversationId,
        userId,
        inputParams,
        success,
        errorMessage,
        executionTime,
        wasSuggested,
        wasAutoSelected,
        context,
        invokedAt,
        completedAt
      });
    };
    
    return { trackingId, endTracking };
  }
  
  /**
   * Get tool usage events
   * @param options Query options
   * @returns Array of tool usage events
   */
  async getToolUsageEvents(options: ToolUsageQueryOptions = {}): Promise<ToolUsageEvent[]> {
    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (options.toolId) {
      conditions.push("tool_id = ?");
      params.push(options.toolId);
    }
    
    if (options.serverId) {
      conditions.push("server_id = ?");
      params.push(options.serverId);
    }
    
    if (options.userId) {
      conditions.push("user_id = ?");
      params.push(options.userId);
    }
    
    if (options.conversationId) {
      conditions.push("conversation_id = ?");
      params.push(options.conversationId);
    }
    
    if (options.startTime) {
      conditions.push("invoked_at >= ?");
      params.push(options.startTime);
    }
    
    if (options.endTime) {
      conditions.push("invoked_at <= ?");
      params.push(options.endTime);
    }
    
    if (options.successOnly) {
      conditions.push("success = TRUE");
    }
    
    if (options.failureOnly) {
      conditions.push("success = FALSE");
    }
    
    if (options.suggestedOnly) {
      conditions.push("was_suggested = TRUE");
    }
    
    if (options.autoSelectedOnly) {
      conditions.push("was_auto_selected = TRUE");
    }
    
    if (options.intent) {
      conditions.push("context LIKE ?");
      params.push(`%"intents":%${options.intent}%`);
    }
    
    if (options.topic) {
      conditions.push("context LIKE ?");
      params.push(`%"topic":"${options.topic}"%`);
    }
    
    // Build the query
    let query = "SELECT * FROM tool_usage_events";
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    // Add sorting
    const sortBy = options.sortBy || "invoked_at";
    const sortDirection = options.sortDirection || "desc";
    query += ` ORDER BY ${sortBy} ${sortDirection}`;
    
    // Add pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }
    
    // Execute query
    const result = await this.agent.sql`${query}`;
    
    // Parse results
    return result.map(row => ({
      id: row.id as string,
      toolId: row.tool_id as string,
      serverId: row.server_id as string,
      toolName: row.tool_name as string,
      conversationId: row.conversation_id as string,
      userId: row.user_id as string,
      inputParams: JSON.parse(row.input_params as string),
      success: row.success as boolean,
      errorMessage: row.error_message as string || undefined,
      executionTime: row.execution_time as number,
      wasSuggested: row.was_suggested as boolean,
      wasAutoSelected: row.was_auto_selected as boolean,
      context: JSON.parse(row.context as string),
      invokedAt: row.invoked_at as number,
      completedAt: row.completed_at as number
    }));
  }
  
  /**
   * Get tool usage statistics
   * @param toolId Tool ID to get statistics for
   * @returns Tool usage statistics
   */
  async getToolUsageStats(toolId: string): Promise<ToolUsageStats | null> {
    // Try to get from aggregates first
    const aggregateResult = await this.agent.sql`
      SELECT * FROM tool_usage_aggregates
      WHERE tool_id = ${toolId}
    `;
    
    if (aggregateResult.length > 0) {
      const row = aggregateResult[0];
      
      return {
        toolId: row.tool_id as string,
        totalUsage: row.total_usage as number,
        successCount: row.success_count as number,
        failureCount: row.failure_count as number,
        avgExecutionTime: row.total_execution_time as number / (row.total_usage as number || 1),
        usageByDay: JSON.parse(row.usage_by_day as string),
        successRate: (row.success_count as number) / (row.total_usage as number || 1),
        suggestionRate: (row.suggestion_count as number) / (row.total_usage as number || 1),
        autoSelectionRate: (row.auto_selection_count as number) / (row.total_usage as number || 1),
        commonIntents: JSON.parse(row.intent_counts as string),
        commonTopics: JSON.parse(row.topic_counts as string),
        firstUsed: row.first_used as number,
        lastUsed: row.last_used as number
      };
    }
    
    // If not in aggregates, calculate on the fly
    const events = await this.getToolUsageEvents({ toolId });
    
    if (events.length === 0) {
      return null;
    }
    
    return this.calculateToolStats(events);
  }
  
  /**
   * Get user tool usage statistics
   * @param userId User ID to get statistics for
   * @returns User tool usage statistics
   */
  async getUserToolUsageStats(userId: string): Promise<UserToolUsageStats | null> {
    // Try to get from aggregates first
    const aggregateResult = await this.agent.sql`
      SELECT * FROM user_tool_usage_stats
      WHERE user_id = ${userId}
    `;
    
    if (aggregateResult.length > 0) {
      const row = aggregateResult[0];
      
      return {
        userId: row.user_id as string,
        totalUsage: row.total_usage as number,
        favoriteTools: JSON.parse(row.favorite_tools as string),
        commonIntents: JSON.parse(row.intent_counts as string),
        commonTopics: JSON.parse(row.topic_counts as string),
        usageByHour: JSON.parse(row.usage_by_hour as string),
        usageByDayOfWeek: JSON.parse(row.usage_by_day_of_week as string),
        firstUsed: row.first_used as number,
        lastUsed: row.last_used as number
      };
    }
    
    // If not in aggregates, calculate on the fly
    const events = await this.getToolUsageEvents({ userId });
    
    if (events.length === 0) {
      return null;
    }
    
    return this.calculateUserStats(userId, events);
  }
  
  /**
   * Get trending tools
   * @param days Number of days to consider (default: 7)
   * @param limit Maximum number of tools to return (default: 10)
   * @returns Array of trending tools with usage counts
   */
  async getTrendingTools(days: number = 7, limit: number = 10): Promise<Array<{toolId: string; count: number}>> {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // Get tool usage counts for the specified time period
    const result = await this.agent.sql`
      SELECT tool_id, COUNT(*) as count
      FROM tool_usage_events
      WHERE invoked_at >= ${startTime}
      GROUP BY tool_id
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    
    return result.map(row => ({
      toolId: row.tool_id as string,
      count: row.count as number
    }));
  }
  
  /**
   * Get tool recommendations for a user
   * @param userId User ID to get recommendations for
   * @param limit Maximum number of recommendations to return (default: 5)
   * @returns Array of tool recommendations
   */
  async getToolRecommendations(userId: string, limit: number = 5): Promise<ToolRecommendation[]> {
    // Get user's tool usage statistics
    const userStats = await this.getUserToolUsageStats(userId);
    
    if (!userStats) {
      // If no user stats, return trending tools
      const trending = await this.getTrendingTools(7, limit);
      const tools = await Promise.all(trending.map(async t => {
        const toolInfo = await this.discoveryManager.getRegisteredTools().then(
          tools => tools.find(tool => tool.id === t.toolId)
        );
        
        return {
          toolId: t.toolId,
          toolName: toolInfo?.name || t.toolId.split(':')[1],
          serverId: toolInfo?.serverId || t.toolId.split(':')[0],
          score: 0.7,
          reason: "Trending tool",
          isNew: true,
          isTrending: true,
          isFavorite: false
        };
      }));
      
      return tools.filter(t => t !== null) as ToolRecommendation[];
    }
    
    // Get user's favorite tools
    const favoriteToolIds = userStats.favoriteTools.map(t => t.toolId);
    
    // Get trending tools
    const trending = await this.getTrendingTools(7, limit * 2);
    const trendingToolIds = trending.map(t => t.toolId);
    
    // Get all registered tools
    const allTools = await this.discoveryManager.getRegisteredTools();
    
    // Calculate recommendations
    const recommendations: ToolRecommendation[] = [];
    
    // First, add tools that match user's common intents but aren't favorites
    if (userStats.commonIntents.length > 0) {
      const relevantCategories = userStats.commonIntents
        .slice(0, 3)
        .map(i => this.mapIntentToCategories(i.intent))
        .flat();
      
      const intentMatchTools = allTools.filter(tool => 
        !favoriteToolIds.includes(tool.id) &&
        tool.categories.some(cat => relevantCategories.includes(cat))
      );
      
      for (const tool of intentMatchTools.slice(0, Math.ceil(limit / 2))) {
        const isTrending = trendingToolIds.includes(tool.id);
        
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          serverId: tool.serverId,
          score: 0.8,
          reason: `Matches your interests in ${tool.categories.filter(cat => relevantCategories.includes(cat)).join(', ')}`,
          isNew: true,
          isTrending,
          isFavorite: false
        });
      }
    }
    
    // Then, add trending tools that aren't already recommended or favorites
    const recommendedToolIds = recommendations.map(r => r.toolId);
    
    for (const trendingTool of trending) {
      if (
        !favoriteToolIds.includes(trendingTool.toolId) &&
        !recommendedToolIds.includes(trendingTool.toolId) &&
        recommendations.length < limit
      ) {
        const toolInfo = allTools.find(t => t.id === trendingTool.toolId);
        
        if (toolInfo) {
          recommendations.push({
            toolId: toolInfo.id,
            toolName: toolInfo.name,
            serverId: toolInfo.serverId,
            score: 0.7,
            reason: "Popular with other users",
            isNew: true,
            isTrending: true,
            isFavorite: false
          });
        }
      }
    }
    
    // Finally, add some random tools with high usage counts to diversify recommendations
    if (recommendations.length < limit) {
      const popularTools = allTools
        .filter(t => 
          t.usageCount > 10 && 
          !favoriteToolIds.includes(t.id) &&
          !recommendedToolIds.includes(t.id)
        )
        .sort((a, b) => b.usageCount - a.usageCount);
      
      for (const tool of popularTools.slice(0, limit - recommendations.length)) {
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          serverId: tool.serverId,
          score: 0.6,
          reason: "Highly rated tool",
          isNew: true,
          isTrending: false,
          isFavorite: false
        });
      }
    }
    
    // Sort by score and limit
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Aggregate tool usage statistics
   * This is called daily by the scheduled task
   */
  async aggregateToolUsageStats(): Promise<void> {
    console.log("Aggregating tool usage statistics...");
    
    // Get all tool IDs
    const toolIdsResult = await this.agent.sql`
      SELECT DISTINCT tool_id FROM tool_usage_events
    `;
    
    const toolIds = toolIdsResult.map(row => row.tool_id as string);
    
    // Aggregate stats for each tool
    for (const toolId of toolIds) {
      const events = await this.getToolUsageEvents({ toolId });
      
      if (events.length > 0) {
        const stats = this.calculateToolStats(events);
        
        // Update or insert aggregates
        await this.agent.sql`
          INSERT OR REPLACE INTO tool_usage_aggregates (
            tool_id, total_usage, success_count, failure_count,
            total_execution_time, usage_by_day, suggestion_count,
            auto_selection_count, intent_counts, topic_counts,
            first_used, last_used
          ) VALUES (
            ${stats.toolId},
            ${stats.totalUsage},
            ${stats.successCount},
            ${stats.failureCount},
            ${stats.avgExecutionTime * stats.totalUsage},
            ${JSON.stringify(stats.usageByDay)},
            ${Math.round(stats.suggestionRate * stats.totalUsage)},
            ${Math.round(stats.autoSelectionRate * stats.totalUsage)},
            ${JSON.stringify(stats.commonIntents)},
            ${JSON.stringify(stats.commonTopics)},
            ${stats.firstUsed},
            ${stats.lastUsed}
          )
        `;
      }
    }
    
    // Get all user IDs
    const userIdsResult = await this.agent.sql`
      SELECT DISTINCT user_id FROM tool_usage_events
    `;
    
    const userIds = userIdsResult.map(row => row.user_id as string);
    
    // Aggregate stats for each user
    for (const userId of userIds) {
      const events = await this.getToolUsageEvents({ userId });
      
      if (events.length > 0) {
        const stats = this.calculateUserStats(userId, events);
        
        // Update or insert aggregates
        await this.agent.sql`
          INSERT OR REPLACE INTO user_tool_usage_stats (
            user_id, total_usage, favorite_tools, intent_counts,
            topic_counts, usage_by_hour, usage_by_day_of_week,
            first_used, last_used
          ) VALUES (
            ${stats.userId},
            ${stats.totalUsage},
            ${JSON.stringify(stats.favoriteTools)},
            ${JSON.stringify(stats.commonIntents)},
            ${JSON.stringify(stats.commonTopics)},
            ${JSON.stringify(stats.usageByHour)},
            ${JSON.stringify(stats.usageByDayOfWeek)},
            ${stats.firstUsed},
            ${stats.lastUsed}
          )
        `;
      }
    }
    
    console.log("Tool usage statistics aggregation completed.");
  }
  
  /**
   * Update aggregates for a single event
   * @param event Tool usage event
   */
  private async updateAggregatesForEvent(event: Omit<ToolUsageEvent, 'id'>): Promise<void> {
    // Update tool aggregates
    const toolResult = await this.agent.sql`
      SELECT * FROM tool_usage_aggregates
      WHERE tool_id = ${event.toolId}
    `;
    
    const today = new Date(event.invokedAt).toISOString().split('T')[0];
    
    if (toolResult.length > 0) {
      // Update existing aggregate
      const row = toolResult[0];
      
      const totalUsage = (row.total_usage as number) + 1;
      const successCount = (row.success_count as number) + (event.success ? 1 : 0);
      const failureCount = (row.failure_count as number) + (event.success ? 0 : 1);
      const totalExecutionTime = (row.total_execution_time as number) + event.executionTime;
      const suggestionCount = (row.suggestion_count as number) + (event.wasSuggested ? 1 : 0);
      const autoSelectionCount = (row.auto_selection_count as number) + (event.wasAutoSelected ? 1 : 0);
      
      // Update usage by day
      const usageByDay = JSON.parse(row.usage_by_day as string);
      usageByDay[today] = (usageByDay[today] || 0) + 1;
      
      // Update intent counts
      const intentCounts = JSON.parse(row.intent_counts as string);
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          const existingIntent = intentCounts.find((i: any) => i.intent === intent);
          if (existingIntent) {
            existingIntent.count++;
          } else {
            intentCounts.push({ intent, count: 1 });
          }
        }
      }
      
      // Update topic counts
      const topicCounts = JSON.parse(row.topic_counts as string);
      if (event.context.topic) {
        const existingTopic = topicCounts.find((t: any) => t.topic === event.context.topic);
        if (existingTopic) {
          existingTopic.count++;
        } else {
          topicCounts.push({ topic: event.context.topic, count: 1 });
        }
      }
      
      // Update the aggregate
      await this.agent.sql`
        UPDATE tool_usage_aggregates
        SET 
          total_usage = ${totalUsage},
          success_count = ${successCount},
          failure_count = ${failureCount},
          total_execution_time = ${totalExecutionTime},
          usage_by_day = ${JSON.stringify(usageByDay)},
          suggestion_count = ${suggestionCount},
          auto_selection_count = ${autoSelectionCount},
          intent_counts = ${JSON.stringify(intentCounts)},
          topic_counts = ${JSON.stringify(topicCounts)},
          last_used = ${event.invokedAt}
        WHERE tool_id = ${event.toolId}
      `;
    } else {
      // Create new aggregate
      const usageByDay: Record<string, number> = {};
      usageByDay[today] = 1;
      
      const intentCounts: Array<{intent: string; count: number}> = [];
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          intentCounts.push({ intent, count: 1 });
        }
      }
      
      const topicCounts: Array<{topic: string; count: number}> = [];
      if (event.context.topic) {
        topicCounts.push({ topic: event.context.topic, count: 1 });
      }
      
      await this.agent.sql`
        INSERT INTO tool_usage_aggregates (
          tool_id, total_usage, success_count, failure_count,
          total_execution_time, usage_by_day, suggestion_count,
          auto_selection_count, intent_counts, topic_counts,
          first_used, last_used
        ) VALUES (
          ${event.toolId},
          1,
          ${event.success ? 1 : 0},
          ${event.success ? 0 : 1},
          ${event.executionTime},
          ${JSON.stringify(usageByDay)},
          ${event.wasSuggested ? 1 : 0},
          ${event.wasAutoSelected ? 1 : 0},
          ${JSON.stringify(intentCounts)},
          ${JSON.stringify(topicCounts)},
          ${event.invokedAt},
          ${event.invokedAt}
        )
      `;
    }
    
    // Update user aggregates
    const userResult = await this.agent.sql`
      SELECT * FROM user_tool_usage_stats
      WHERE user_id = ${event.userId}
    `;
    
    if (userResult.length > 0) {
      // Update existing user stats
      const row = userResult[0];
      
      const totalUsage = (row.total_usage as number) + 1;
      
      // Update favorite tools
      const favoriteTools = JSON.parse(row.favorite_tools as string);
      const existingTool = favoriteTools.find((t: any) => t.toolId === event.toolId);
      if (existingTool) {
        existingTool.count++;
      } else {
        favoriteTools.push({ toolId: event.toolId, count: 1 });
      }
      
      // Sort by count
      favoriteTools.sort((a: any, b: any) => b.count - a.count);
      
      // Update intent counts
      const intentCounts = JSON.parse(row.intent_counts as string);
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          const existingIntent = intentCounts.find((i: any) => i.intent === intent);
          if (existingIntent) {
            existingIntent.count++;
          } else {
            intentCounts.push({ intent, count: 1 });
          }
        }
      }
      
      // Update topic counts
      const topicCounts = JSON.parse(row.topic_counts as string);
      if (event.context.topic) {
        const existingTopic = topicCounts.find((t: any) => t.topic === event.context.topic);
        if (existingTopic) {
          existingTopic.count++;
        } else {
          topicCounts.push({ topic: event.context.topic, count: 1 });
        }
      }
      
      // Update usage by hour
      const usageByHour = JSON.parse(row.usage_by_hour as string);
      const hour = new Date(event.invokedAt).getHours().toString();
      usageByHour[hour] = (usageByHour[hour] || 0) + 1;
      
      // Update usage by day of week
      const usageByDayOfWeek = JSON.parse(row.usage_by_day_of_week as string);
      const dayOfWeek = new Date(event.invokedAt).getDay().toString();
      usageByDayOfWeek[dayOfWeek] = (usageByDayOfWeek[dayOfWeek] || 0) + 1;
      
      // Update the user stats
      await this.agent.sql`
        UPDATE user_tool_usage_stats
        SET 
          total_usage = ${totalUsage},
          favorite_tools = ${JSON.stringify(favoriteTools)},
          intent_counts = ${JSON.stringify(intentCounts)},
          topic_counts = ${JSON.stringify(topicCounts)},
          usage_by_hour = ${JSON.stringify(usageByHour)},
          usage_by_day_of_week = ${JSON.stringify(usageByDayOfWeek)},
          last_used = ${event.invokedAt}
        WHERE user_id = ${event.userId}
      `;
    } else {
      // Create new user stats
      const favoriteTools = [{ toolId: event.toolId, count: 1 }];
      
      const intentCounts: Array<{intent: string; count: number}> = [];
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          intentCounts.push({ intent, count: 1 });
        }
      }
      
      const topicCounts: Array<{topic: string; count: number}> = [];
      if (event.context.topic) {
        topicCounts.push({ topic: event.context.topic, count: 1 });
      }
      
      const usageByHour: Record<string, number> = {};
      const hour = new Date(event.invokedAt).getHours().toString();
      usageByHour[hour] = 1;
      
      const usageByDayOfWeek: Record<string, number> = {};
      const dayOfWeek = new Date(event.invokedAt).getDay().toString();
      usageByDayOfWeek[dayOfWeek] = 1;
      
      await this.agent.sql`
        INSERT INTO user_tool_usage_stats (
          user_id, total_usage, favorite_tools, intent_counts,
          topic_counts, usage_by_hour, usage_by_day_of_week,
          first_used, last_used
        ) VALUES (
          ${event.userId},
          1,
          ${JSON.stringify(favoriteTools)},
          ${JSON.stringify(intentCounts)},
          ${JSON.stringify(topicCounts)},
          ${JSON.stringify(usageByHour)},
          ${JSON.stringify(usageByDayOfWeek)},
          ${event.invokedAt},
          ${event.invokedAt}
        )
      `;
    }
  }
  
  /**
   * Calculate tool usage statistics from events
   * @param events Tool usage events
   * @returns Tool usage statistics
   */
  private calculateToolStats(events: ToolUsageEvent[]): ToolUsageStats {
    const toolId = events[0].toolId;
    const totalUsage = events.length;
    const successCount = events.filter(e => e.success).length;
    const failureCount = totalUsage - successCount;
    const totalExecutionTime = events.reduce((sum, e) => sum + e.executionTime, 0);
    const avgExecutionTime = totalExecutionTime / totalUsage;
    const suggestionCount = events.filter(e => e.wasSuggested).length;
    const autoSelectionCount = events.filter(e => e.wasAutoSelected).length;
    
    // Calculate usage by day
    const usageByDay: Record<string, number> = {};
    for (const event of events) {
      const day = new Date(event.invokedAt).toISOString().split('T')[0];
      usageByDay[day] = (usageByDay[day] || 0) + 1;
    }
    
    // Calculate intent counts
    const intentMap = new Map<string, number>();
    for (const event of events) {
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          intentMap.set(intent, (intentMap.get(intent) || 0) + 1);
        }
      }
    }
    
    const commonIntents = Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate topic counts
    const topicMap = new Map<string, number>();
    for (const event of events) {
      if (event.context.topic) {
        topicMap.set(event.context.topic, (topicMap.get(event.context.topic) || 0) + 1);
      }
    }
    
    const commonTopics = Array.from(topicMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate first and last used
    const timestamps = events.map(e => e.invokedAt);
    const firstUsed = Math.min(...timestamps);
    const lastUsed = Math.max(...timestamps);
    
    return {
      toolId,
      totalUsage,
      successCount,
      failureCount,
      avgExecutionTime,
      usageByDay,
      successRate: successCount / totalUsage,
      suggestionRate: suggestionCount / totalUsage,
      autoSelectionRate: autoSelectionCount / totalUsage,
      commonIntents,
      commonTopics,
      firstUsed,
      lastUsed
    };
  }
  
  /**
   * Calculate user tool usage statistics from events
   * @param userId User ID
   * @param events Tool usage events
   * @returns User tool usage statistics
   */
  private calculateUserStats(userId: string, events: ToolUsageEvent[]): UserToolUsageStats {
    const totalUsage = events.length;
    
    // Calculate favorite tools
    const toolMap = new Map<string, number>();
    for (const event of events) {
      toolMap.set(event.toolId, (toolMap.get(event.toolId) || 0) + 1);
    }
    
    const favoriteTools = Array.from(toolMap.entries())
      .map(([toolId, count]) => ({ toolId, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate intent counts
    const intentMap = new Map<string, number>();
    for (const event of events) {
      if (event.context.intents) {
        for (const intent of event.context.intents) {
          intentMap.set(intent, (intentMap.get(intent) || 0) + 1);
        }
      }
    }
    
    const commonIntents = Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate topic counts
    const topicMap = new Map<string, number>();
    for (const event of events) {
      if (event.context.topic) {
        topicMap.set(event.context.topic, (topicMap.get(event.context.topic) || 0) + 1);
      }
    }
    
    const commonTopics = Array.from(topicMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate usage by hour
    const usageByHour: Record<string, number> = {};
    for (const event of events) {
      const hour = new Date(event.invokedAt).getHours().toString();
      usageByHour[hour] = (usageByHour[hour] || 0) + 1;
    }
    
    // Calculate usage by day of week
    const usageByDayOfWeek: Record<string, number> = {};
    for (const event of events) {
      const dayOfWeek = new Date(event.invokedAt).getDay().toString();
      usageByDayOfWeek[dayOfWeek] = (usageByDayOfWeek[dayOfWeek] || 0) + 1;
    }
    
    // Calculate first and last used
    const timestamps = events.map(e => e.invokedAt);
    const firstUsed = Math.min(...timestamps);
    const lastUsed = Math.max(...timestamps);
    
    return {
      userId,
      totalUsage,
      favoriteTools,
      commonIntents,
      commonTopics,
      usageByHour,
      usageByDayOfWeek,
      firstUsed,
      lastUsed
    };
  }
  
  /**
   * Map intent to relevant tool categories
   * @param intent Intent to map
   * @returns Array of relevant categories
   */
  private mapIntentToCategories(intent: string): string[] {
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
    
    return intentCategoryMap[intent] || ["utility"];
  }
}
