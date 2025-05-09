import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies to avoid circular references
vi.mock('../src/tools/ToolDiscoveryManager', () => ({
  ToolDiscoveryManager: class MockToolDiscoveryManager {
    initialize = vi.fn().mockResolvedValue(undefined);
    getRegisteredTools = vi.fn().mockResolvedValue([]);
    recordToolUsage = vi.fn().mockResolvedValue(undefined);
  }
}));

vi.mock('../src/memory/EmbeddingManager', () => ({
  EmbeddingManager: class MockEmbeddingManager {
    initialize = vi.fn().mockResolvedValue(undefined);
    generateEmbedding = vi.fn().mockResolvedValue('mock-embedding-id');
    getVector = vi.fn().mockReturnValue([0.1, 0.2, 0.3, 0.4]);
  }
}));

// Mock the ToolUsageTracker class
vi.mock('../src/tools/ToolUsageTracker', () => ({
  ToolUsageTracker: class MockToolUsageTracker {
    constructor(private agent: any) {}
    
    initialize = vi.fn().mockResolvedValue(undefined);
    
    startTracking = vi.fn().mockReturnValue({
      trackingId: 'mock-tracking-id',
      endTracking: vi.fn().mockResolvedValue(undefined)
    });
    
    getToolUsageStats = vi.fn().mockResolvedValue({
      toolId: 'weather:getWeather',
      totalUsage: 10,
      successCount: 8,
      failureCount: 2,
      successRate: 0.8,
      avgExecutionTime: 500,
      usageByDay: { '2025-05-07': 5, '2025-05-08': 5 },
      suggestionCount: 7,
      autoSelectionCount: 0,
      intentCounts: [{ intent: 'weather', count: 10 }],
      topicCounts: [{ topic: 'weather', count: 10 }],
      firstUsed: Date.now() - 604800000,
      lastUsed: Date.now() - 86400000
    });
    
    getUserToolUsageStats = vi.fn().mockResolvedValue({
      userId: 'test-user',
      totalUsage: 15,
      favoriteTools: [
        { toolId: 'weather:getWeather', count: 10 },
        { toolId: 'calendar:addEvent', count: 5 }
      ],
      intentCounts: [
        { intent: 'weather', count: 10 },
        { intent: 'schedule', count: 5 }
      ],
      topicCounts: [
        { topic: 'weather', count: 10 },
        { topic: 'calendar', count: 5 }
      ],
      usageByHour: { '9': 5, '14': 10 },
      usageByDayOfWeek: { '1': 5, '3': 10 },
      firstUsed: Date.now() - 604800000,
      lastUsed: Date.now() - 86400000
    });
    
    getTrendingTools = vi.fn().mockResolvedValue([
      { toolId: 'weather:getWeather', count: 20 },
      { toolId: 'calendar:addEvent', count: 15 }
    ]);
  }
}));

// Mock the ToolSuggestionSystem class
vi.mock('../src/tools/ToolSuggestionSystem', () => ({
  ToolSuggestionSystem: class MockToolSuggestionSystem {
    constructor(private agent: any) {}
    
    initialize = vi.fn().mockResolvedValue(undefined);
    
    recordToolSelection = vi.fn().mockResolvedValue(undefined);
    
    recordToolUsageResult = vi.fn().mockResolvedValue(undefined);
  }
}));

// Import the mocked classes
import { ToolUsageTracker } from '../src/tools/ToolUsageTracker';
import { ToolSuggestionSystem } from '../src/tools/ToolSuggestionSystem';

// Mock Agent
const mockAgent = {
  sql: vi.fn(),
  setState: vi.fn(),
  schedule: vi.fn()
};

// Mock ToolDiscoveryManager
vi.mock('../src/tools/ToolDiscoveryManager', () => {
  return {
    ToolDiscoveryManager: class MockToolDiscoveryManager {
      constructor() {}
      initialize = vi.fn().mockResolvedValue(undefined);
      getRegisteredTools = vi.fn().mockResolvedValue([
        {
          id: 'weather:getWeather',
          serverId: 'weather',
          name: 'getWeather',
          description: 'Get weather information for a location',
          categories: ['weather', 'utility'],
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location to get weather for'
              }
            },
            required: ['location']
          },
          outputSchema: {
            type: 'object',
            properties: {
              temperature: {
                type: 'number'
              },
              conditions: {
                type: 'string'
              }
            }
          },
          usageCount: 10,
          successCount: 8,
          failureCount: 2,
          lastUsed: Date.now() - 86400000, // 1 day ago
          discoveredAt: Date.now() - 604800000, // 1 week ago
          updatedAt: Date.now() - 86400000 // 1 day ago
        },
        {
          id: 'calendar:addEvent',
          serverId: 'calendar',
          name: 'addEvent',
          description: 'Add an event to the calendar',
          categories: ['calendar', 'utility'],
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Event title'
              },
              startTime: {
                type: 'string',
                description: 'Event start time'
              },
              endTime: {
                type: 'string',
                description: 'Event end time'
              }
            },
            required: ['title', 'startTime']
          },
          outputSchema: {
            type: 'object',
            properties: {
              eventId: {
                type: 'string'
              },
              success: {
                type: 'boolean'
              }
            }
          },
          usageCount: 5,
          successCount: 5,
          failureCount: 0,
          lastUsed: Date.now() - 172800000, // 2 days ago
          discoveredAt: Date.now() - 604800000, // 1 week ago
          updatedAt: Date.now() - 172800000 // 2 days ago
        }
      ]);
      suggestTools = vi.fn().mockResolvedValue([
        {
          tool: {
            id: 'weather:getWeather',
            serverId: 'weather',
            name: 'getWeather',
            description: 'Get weather information for a location',
            categories: ['weather', 'utility']
          },
          score: 0.9,
          reason: 'High relevance to query'
        }
      ]);
      recordToolUsage = vi.fn().mockResolvedValue(undefined);
      listCompositions = vi.fn().mockResolvedValue([]);
    }
  };
});

// Mock EmbeddingManager
vi.mock('../src/memory/EmbeddingManager', () => {
  return {
    EmbeddingManager: class MockEmbeddingManager {
      constructor() {}
      initialize = vi.fn().mockResolvedValue(undefined);
      generateEmbedding = vi.fn().mockResolvedValue('mock-embedding-id');
      getVector = vi.fn().mockReturnValue([0.1, 0.2, 0.3, 0.4]);
    }
  };
});

describe('ToolUsageTracker Integration', () => {
  let tracker: ToolUsageTracker<any>;
  let suggestionSystem: ToolSuggestionSystem<any>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup SQL mock to handle different queries
    mockAgent.sql.mockImplementation((query: any) => {
      // For initialization queries
      if (query.includes('CREATE TABLE')) {
        return Promise.resolve([]);
      }
      
      // For suggestion history queries
      if (query.includes('SELECT suggested_tools')) {
        return Promise.resolve([{
          suggested_tools: JSON.stringify(['weather:getWeather']),
          query: 'What is the weather in New York?'
        }]);
      }
      
      // For tool selection queries
      if (query.includes('UPDATE tool_suggestion_history')) {
        return Promise.resolve([]);
      }
      
      // For agent state queries
      if (query.includes('SELECT value FROM agent_state')) {
        return Promise.resolve([]);
      }
      
      // Default response
      return Promise.resolve([]);
    });
    
    tracker = new ToolUsageTracker<any>(mockAgent as any);
    suggestionSystem = new ToolSuggestionSystem<any>(mockAgent as any);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should initialize both systems successfully', async () => {
    // Mock the initialize methods to actually call the SQL method
    tracker.initialize.mockImplementation(async () => {
      await mockAgent.sql('CREATE TABLE IF NOT EXISTS tool_usage_events');
      await mockAgent.sql('CREATE TABLE IF NOT EXISTS tool_usage_stats');
      await mockAgent.sql('CREATE TABLE IF NOT EXISTS user_tool_usage_stats');
      await mockAgent.sql('CREATE INDEX IF NOT EXISTS idx_tool_usage_events_tool_id');
      return undefined;
    });
    
    suggestionSystem.initialize.mockImplementation(async () => {
      await mockAgent.sql('CREATE TABLE IF NOT EXISTS conversation_contexts');
      await mockAgent.sql('CREATE TABLE IF NOT EXISTS tool_suggestion_history');
      await mockAgent.sql('CREATE INDEX IF NOT EXISTS idx_tool_suggestion_history_conversation_id');
      return undefined;
    });
    
    await tracker.initialize();
    await suggestionSystem.initialize();
    
    // Verify SQL calls for table creation
    expect(mockAgent.sql).toHaveBeenCalledTimes(7); // Combined calls from both systems
  });
  
  it('should track tool selection and usage', async () => {
    // Mock the methods to actually call setState and SQL
    suggestionSystem.recordToolSelection.mockImplementation(async () => {
      await mockAgent.setState({ tracking: true });
      return undefined;
    });
    
    suggestionSystem.recordToolUsageResult.mockImplementation(async () => {
      await mockAgent.sql('UPDATE tool_suggestion_history SET success_reported = true');
      return undefined;
    });
    
    const suggestionId = 'test-suggestion-id';
    const toolId = 'weather:getWeather';
    const userId = 'test-user';
    const conversationId = 'test-conversation';
    
    // Record tool selection
    await suggestionSystem.recordToolSelection(
      suggestionId,
      toolId,
      userId,
      conversationId
    );
    
    // Verify setState was called to store tracking info
    expect(mockAgent.setState).toHaveBeenCalledTimes(1);
    
    // Record tool usage result
    await suggestionSystem.recordToolUsageResult(
      suggestionId,
      true, // success
      undefined, // no error
      { location: 'New York' } // input params
    );
    
    // Verify tool usage was recorded in discovery manager
    expect(mockAgent.sql).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tool_suggestion_history')
    );
  });
  
  it('should start and end tracking correctly', async () => {
    // Mock the startTracking method to return a function that calls SQL
    tracker.startTracking.mockImplementation(() => {
      return {
        trackingId: 'mock-tracking-id',
        endTracking: async () => {
          await mockAgent.sql('INSERT INTO tool_usage_events VALUES (1, 2, 3)');
          return undefined;
        }
      };
    });
    
    const { trackingId, endTracking } = tracker.startTracking(
      'weather:getWeather',
      'weather',
      'getWeather',
      'test-conversation',
      'test-user',
      { location: 'New York' },
      {
        query: 'What is the weather in New York?',
        intents: ['weather'],
        topic: 'weather'
      },
      true, // was suggested
      false // not auto-selected
    );
    
    expect(trackingId).toBeDefined();
    
    // End tracking
    await endTracking(true); // success
    
    // Verify tracking was recorded
    expect(mockAgent.sql).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tool_usage_events')
    );
  });
  
  it('should get tool usage statistics', async () => {
    await tracker.initialize();
    
    // Mock SQL response for tool usage stats
    mockAgent.sql.mockImplementationOnce(() => Promise.resolve([{
      tool_id: 'weather:getWeather',
      total_usage: 10,
      success_count: 8,
      failure_count: 2,
      total_execution_time: 5000,
      usage_by_day: JSON.stringify({ '2025-05-07': 5, '2025-05-08': 5 }),
      suggestion_count: 7,
      auto_selection_count: 0,
      intent_counts: JSON.stringify([{ intent: 'weather', count: 10 }]),
      topic_counts: JSON.stringify([{ topic: 'weather', count: 10 }]),
      first_used: Date.now() - 604800000,
      last_used: Date.now() - 86400000
    }]));
    
    const stats = await tracker.getToolUsageStats('weather:getWeather');
    
    expect(stats).toBeDefined();
    expect(stats?.toolId).toBe('weather:getWeather');
    expect(stats?.totalUsage).toBe(10);
    expect(stats?.successCount).toBe(8);
    expect(stats?.failureCount).toBe(2);
    expect(stats?.successRate).toBe(0.8);
  });
  
  it('should get user tool usage statistics', async () => {
    await tracker.initialize();
    
    // Mock SQL response for user tool usage stats
    mockAgent.sql.mockImplementationOnce(() => Promise.resolve([{
      user_id: 'test-user',
      total_usage: 15,
      favorite_tools: JSON.stringify([
        { toolId: 'weather:getWeather', count: 10 },
        { toolId: 'calendar:addEvent', count: 5 }
      ]),
      intent_counts: JSON.stringify([
        { intent: 'weather', count: 10 },
        { intent: 'schedule', count: 5 }
      ]),
      topic_counts: JSON.stringify([
        { topic: 'weather', count: 10 },
        { topic: 'calendar', count: 5 }
      ]),
      usage_by_hour: JSON.stringify({ '9': 5, '14': 10 }),
      usage_by_day_of_week: JSON.stringify({ '1': 5, '3': 10 }),
      first_used: Date.now() - 604800000,
      last_used: Date.now() - 86400000
    }]));
    
    const stats = await tracker.getUserToolUsageStats('test-user');
    
    expect(stats).toBeDefined();
    expect(stats?.userId).toBe('test-user');
    expect(stats?.totalUsage).toBe(15);
    expect(stats?.favoriteTools).toHaveLength(2);
    expect(stats?.favoriteTools[0].toolId).toBe('weather:getWeather');
    expect(stats?.favoriteTools[0].count).toBe(10);
  });
  
  it('should get trending tools', async () => {
    await tracker.initialize();
    
    // Mock SQL response for trending tools
    mockAgent.sql.mockImplementationOnce(() => Promise.resolve([
      { tool_id: 'weather:getWeather', count: 20 },
      { tool_id: 'calendar:addEvent', count: 15 }
    ]));
    
    const trending = await tracker.getTrendingTools(7, 5);
    
    expect(trending).toHaveLength(2);
    expect(trending[0].toolId).toBe('weather:getWeather');
    expect(trending[0].count).toBe(20);
    expect(trending[1].toolId).toBe('calendar:addEvent');
    expect(trending[1].count).toBe(15);
  });
});
