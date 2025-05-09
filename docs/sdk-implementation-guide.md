# Cloudflare Agents SDK Implementation Guide

This document provides key implementation details extracted from the Cloudflare Agents SDK documentation to assist with developing ImpossibleAgent. The implementation has been updated to reflect our current progress and learnings from working with the SDK.

## Core Agent Implementation

### Basic Agent Structure

The foundation of our agent implementation is extending the `AIChatAgent` class:

```typescript
import { AIChatAgent } from "agents/ai-chat-agent";

export class PersonalAgent extends AIChatAgent<Env, PersonalAgentState> {
  // Agent implementation goes here
  
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
}
```

### Handling WebSocket Connections

Our implementation of WebSocket connections in the PersonalAgent:

```typescript
async onConnect(connection: Connection, ctx: ConnectionContext) {
  // Update last active timestamp
  this.setState({
    ...this.state,
    lastActive: new Date().toISOString()
  });
  
  // Call the parent class implementation
  await super.onConnect(connection, ctx);
}

// The AIChatAgent class handles most of the WebSocket message processing
// through its implementation of onMessage, onError, and onClose
```

### State Management

We're using both the high-level state API and direct SQL access in our implementation:

#### 1. High-Level State API for User Profile and Preferences

```typescript
// Define state interfaces
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

interface PersonalAgentState {
  conversations: ConversationEntry[];
  userProfile: UserProfile;
  preferences: UserPreferences;
  lastActive: string;
}

// Updating user profile
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
```

#### 2. Direct SQL Access for Memory Storage

```typescript
// Create memory tables in initialize()
async initialize() {
  // Create memory tables
  await this.sql`
    CREATE TABLE IF NOT EXISTS episodic_memories (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 5,
      context TEXT,
      metadata TEXT
    )
  `;

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
}

// Store an episodic memory
@callable({ description: "Store a new episodic memory" })
async storeEpisodicMemory(memory: { 
  content: string; 
  importance?: number; 
  context?: string;
  metadata?: Record<string, any>;
}) {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  
  await this.sql`
    INSERT INTO episodic_memories (
      id, timestamp, content, importance, context, metadata
    ) VALUES (
      ${id}, 
      ${timestamp}, 
      ${memory.content}, 
      ${memory.importance || 5}, 
      ${memory.context || null}, 
      ${memory.metadata ? JSON.stringify(memory.metadata) : null}
    )
  `;
  
  return { id, timestamp };
}
```

## Tool Implementation

### Defining Tools

We've implemented tools using both auto-executing and confirmation-required approaches:

#### 1. Auto-Executing Tools

```typescript
import { tool } from 'agents';
import { z } from 'zod';

// Example from our implementation
const getCurrentTime = tool({
  description: "Get the current server time",
  parameters: z.object({}),
  execute: async () => {
    return {
      time: new Date().toISOString(),
      timezone: "UTC"
    };
  }
});
```

#### 2. Confirmation-Required Tools

```typescript
// Example from our implementation
const scheduleEvent = tool({
  description: "Schedule an event on the user's calendar",
  parameters: z.object({
    title: z.string().describe("Event title"),
    startTime: z.string().describe("Start time in ISO format"),
    endTime: z.string().describe("End time in ISO format"),
    description: z.string().optional().describe("Event description"),
    location: z.string().optional().describe("Event location")
  })
  // No execute function = requires confirmation
});

// Handle confirmations in a separate object
export const executions = {
  scheduleEvent: async ({ 
    title, 
    startTime, 
    endTime, 
    description, 
    location 
  }) => {
    // Implementation using our CalendarAdapter
    const calendarAdapter = new CalendarAdapter(agent);
    await calendarAdapter.initialize();
    
    return await calendarAdapter.createEvent({
      title,
      startTime,
      endTime,
      description,
      location
    });
  }
};
```

### MCP Adapter Implementation

We've created a `BaseMCPAdapter` class that standardizes MCP integration:

```typescript
export class BaseMCPAdapter<Env> {
  protected agent: Agent<Env>;
  
  constructor(agent: Agent<Env>) {
    this.agent = agent;
  }
  
  /**
   * Connect to an MCP service
   * @param serviceUrl URL of the service to connect to
   * @returns Connection details
   */
  async connectToService(serviceUrl: string): Promise<{ id: string; authUrl?: string }> {
    // Implementation details for connecting to MCP services
    // This is a simplified version of the actual implementation
    return { id: "service-id" };
  }
  
  /**
   * List all available tools from a connected service
   * @param serviceId ID of the connected service
   * @returns Array of available tools
   */
  listTools(serviceId: string): MCPTool[] {
    // Implementation details for listing tools
    return [];
  }
  
  /**
   * Call a tool on a connected service
   * @param serviceId ID of the connected service
   * @param toolName Name of the tool to call
   * @param params Parameters to pass to the tool
   * @returns Tool execution result
   */
  async callTool(serviceId: string, toolName: string, params: any): Promise<any> {
    // Implementation details for calling tools
    return {};
  }
}

// Specialized adapters extend BaseMCPAdapter
export class CalendarAdapter<Env> extends BaseMCPAdapter<Env> {
  // Calendar-specific methods
  async createEvent(event: CalendarEvent): Promise<any> {
    // Implementation details
  }
  
  async getEvents(startDate: string, endDate: string): Promise<any> {
    // Implementation details
  }
}

export class WeatherAdapter<Env> extends BaseMCPAdapter<Env> {
  // Weather-specific methods
  async getCurrentWeather(location: string): Promise<any> {
    // Implementation details
  }
  
  async getForecast(location: string, days: number): Promise<any> {
    // Implementation details
  }
}
```

## Advanced Scheduling

We've implemented scheduled tasks for memory consolidation:

```typescript
// In the PersonalAgent class initialize method
async initialize() {
  // Create memory tables and indexes
  // ...
  
  // Schedule regular memory consolidation
  this.schedule("0 3 * * *", "consolidateMemories");
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
```

## Client SDK Integration

We've implemented a React client using the SDK's hooks:

```tsx
import { useAgent, useAgentChat } from 'agents/react';

function ChatComponent() {
  // Connect to the agent
  const agent = useAgent({
    agent: 'personal', // Agent name/ID
  });
  
  // Use the chat functionality
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error
  } = useAgentChat({
    agent,
    maxSteps: 10,
  });
  
  // Example component implementation with our custom UI components
  return (
    <div className="chat-container">
      <MessageList messages={messages} />
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      {error && <ErrorMessage error={error} />}
    </div>
  );
}
```

## AI Model Integration

We're using OpenAI's GPT-4o model:

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText, createDataStreamResponse } from "ai";

// In the PersonalAgent class
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

${relevantMemories.length > 0 ? `Here are some relevant memories about our past interactions:
${relevantMemories.map(m => `- ${m.content}`).join('\n')}` : ''}

${this.state.userProfile.name ? `The user's name is ${this.state.userProfile.name}.` : ''}

Maintain a warm, personalized tone and reference our shared history when relevant.
Be helpful, supportive, and remember important details about the user.`;

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
```

## Routing and Agent Instantiation

We've implemented agent routing in our server.ts file:

```typescript
import { routeAgentRequest } from "agents";
import { PersonalAgent } from "./agents/PersonalAgent";

export const { Chat } = PersonalAgent.register({
  model,
  tools,
  executions,
  systemPrompt: `You are ImpossibleAgent, a powerful AI assistant that can help with a wide range of tasks.
You have enhanced capabilities including:
- Long-term memory storage and retrieval
- Calendar management and scheduling
- Knowledge base for storing and retrieving information
- Security features for protecting user data
- MCP (Model Context Protocol) integration for connecting to external services

${unstable_getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`,
  maxSteps: 10,
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey,
      });
    }
    
    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
};
```

## Memory Schema Design

We've implemented a simplified version of the recommended memory schema:

```sql
-- Episodic memories (event-based)
CREATE TABLE IF NOT EXISTS episodic_memories (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  context TEXT,
  metadata TEXT
);

-- Semantic memories (factual knowledge)
CREATE TABLE IF NOT EXISTS semantic_memories (
  id TEXT PRIMARY KEY,
  fact TEXT NOT NULL,
  confidence REAL NOT NULL,
  first_observed INTEGER NOT NULL,
  last_confirmed INTEGER,
  metadata TEXT
);

-- Memory connections (knowledge graph)
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
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memories(confidence);
```

## Making Methods Callable from Clients

We've implemented several callable methods in our PersonalAgent class:

```typescript
import { unstable_callable as callable } from 'agents';

export class PersonalAgent extends AIChatAgent<Env, PersonalAgentState> {
  @callable({ description: "Store a new episodic memory" })
  async storeEpisodicMemory(memory: { 
    content: string; 
    importance?: number; 
    context?: string;
    metadata?: Record<string, any>;
  }) {
    // Implementation details
  }
  
  @callable({ description: "Store a new semantic memory (factual knowledge)" })
  async storeSemanticMemory(memory: {
    fact: string;
    confidence: number;
    metadata?: Record<string, any>;
  }) {
    // Implementation details
  }
  
  @callable({ description: "Update user profile information" })
  async updateUserProfile(profile: Partial<UserProfile>) {
    // Implementation details
  }
  
  @callable({ description: "Update user preferences" })
  async updatePreferences(preferences: Partial<UserPreferences>) {
    // Implementation details
  }
}
```

## Centralized Error Handling System

We've implemented a comprehensive centralized error handling system in `src/utils/errors.ts` that provides a robust foundation for consistent error management throughout the application.

### Error Class Hierarchy

#### AppError

The base error class for all application errors.

```typescript
export class AppError extends Error {
  /**
   * Create a new AppError
   * 
   * @param options - Configuration options for the error
   * @param options.message - Human-readable error message
   * @param options.code - Error code for programmatic identification (default: "INTERNAL_ERROR")
   * @param options.statusCode - HTTP status code associated with this error (default: 500)
   * @param options.isOperational - Whether this is an operational error that can be handled (default: true)
   * @param options.context - Additional context information about the error (default: {})
   * 
   * @returns A new AppError instance
   * 
   * @example
   * // Create a basic error
   * throw new AppError({ message: "Something went wrong" });
   * 
   * // Create an error with custom code and status
   * throw new AppError({ 
   *   message: "Invalid input", 
   *   code: "VALIDATION_ERROR", 
   *   statusCode: 400 
   * });
   * 
   * // Create an error with additional context
   * throw new AppError({ 
   *   message: "Database query failed", 
   *   context: { query: "SELECT * FROM users", params: { id: 123 } } 
   * });
   */
  constructor({
    message,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    isOperational = true,
    context = {},
  }: {
    message: string;
    code?: string;
    statusCode?: number;
    isOperational?: boolean;
    context?: Record<string, unknown>;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;
}
```

#### Specialized Error Classes

We've implemented specialized error classes for different types of errors:

```typescript
/**
 * Error for validation failures
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new ValidationError instance
 * 
 * @example
 * // Create a validation error
 * throw new ValidationError("Email is required");
 * 
 * // Create a validation error with context
 * throw new ValidationError("Invalid email format", { email: "test" });
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for authentication failures
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new AuthenticationError instance
 * 
 * @example
 * throw new AuthenticationError("Invalid credentials");
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "AUTHENTICATION_ERROR",
      statusCode: 401,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for authorization failures
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new AuthorizationError instance
 * 
 * @example
 * throw new AuthorizationError("Insufficient permissions to access this resource");
 */
export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "AUTHORIZATION_ERROR",
      statusCode: 403,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for resource not found
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new NotFoundError instance
 * 
 * @example
 * throw new NotFoundError("User not found", { userId: "123" });
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "NOT_FOUND",
      statusCode: 404,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for database operations
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new DatabaseError instance
 * 
 * @example
 * throw new DatabaseError("Failed to insert record", { table: "users" });
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "DATABASE_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for external service failures
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new ExternalServiceError instance
 * 
 * @example
 * throw new ExternalServiceError("Weather API unavailable", { service: "WeatherAPI" });
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "EXTERNAL_SERVICE_ERROR",
      statusCode: 502,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for tool execution failures
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new ToolExecutionError instance
 * 
 * @example
 * throw new ToolExecutionError("Failed to execute calendar tool", { toolName: "createEvent" });
 */
export class ToolExecutionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "TOOL_EXECUTION_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for memory operations
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new MemoryError instance
 * 
 * @example
 * throw new MemoryError("Failed to retrieve memory", { memoryId: "123" });
 */
export class MemoryError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "MEMORY_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for knowledge graph operations
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new KnowledgeGraphError instance
 * 
 * @example
 * throw new KnowledgeGraphError("Failed to create entity relationship", { 
 *   sourceEntity: "123", 
 *   targetEntity: "456" 
 * });
 */
export class KnowledgeGraphError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "KNOWLEDGE_GRAPH_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for offline operations
 * 
 * @param message - Human-readable error message
 * @param context - Additional context information about the error
 * 
 * @returns A new OfflineError instance
 * 
 * @example
 * throw new OfflineError("Cannot perform this operation while offline");
 */
export class OfflineError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "OFFLINE_ERROR",
      statusCode: 503,
      isOperational: true,
      context,
    });
  }
}
```

### Error Handling Utilities

#### formatError

Formats an error for consistent logging.

```typescript
/**
 * Formats an error for consistent logging
 * 
 * @param error - The error to format
 * @returns A formatted error object with standardized properties
 * 
 * @example
 * try {
 *   // Some operation that might throw
 * } catch (error) {
 *   const formattedError = formatError(error);
 *   console.error(JSON.stringify(formattedError, null, 2));
 * }
 */
export function formatError(error: Error): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context || {},
      stack: error.stack,
    };
  }

  // Handle non-AppError instances
  return {
    name: error.name,
    message: error.message,
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    isOperational: false,
    stack: error.stack,
  };
}
```

#### logError

Logs an error with appropriate severity level.

```typescript
/**
 * Logs an error with appropriate severity level
 * 
 * @param error - The error to log
 * 
 * @example
 * try {
 *   // Some operation that might throw
 * } catch (error) {
 *   logError(error);
 * }
 */
export function logError(error: Error): void {
  const formattedError = formatError(error);
  
  // In production, we would use a proper logging service
  // For now, we'll use console.error
  console.error(JSON.stringify(formattedError, null, 2));
}
```

#### handleError

Handles an error by logging it and optionally sending it to the client.

```typescript
/**
 * Handles an error by logging it and optionally sending it to the client
 * 
 * @param error - The error to handle
 * @param dataStream - Optional data stream to send the error to the client
 * 
 * @example
 * // Handle error and log it
 * handleError(new ValidationError("Invalid input"));
 * 
 * // Handle error, log it, and send to client
 * handleError(new ValidationError("Invalid input"), dataStream);
 */
export function handleError(error: Error, dataStream?: DataStreamWriter): void {
  logError(error);

  // If a data stream is provided, send the error to the client
  if (dataStream) {
    const errorMessage = error instanceof AppError
      ? `Error: ${error.message} (${error.code})`
      : `Error: ${error.message}`;
    
    dataStream.write(
      formatDataStreamPart("error", errorMessage)
    );
  }
}
```

#### safeExecute

Safely executes a function and handles any errors.

```typescript
/**
 * Safely executes a function and handles any errors
 * 
 * @param fn - The function to execute
 * @param errorHandler - Optional custom error handler
 * @returns The result of the function or null if an error occurred
 * 
 * @example
 * // Basic usage
 * const result = await safeExecute(async () => {
 *   return await fetchData();
 * });
 * 
 * // With custom error handler
 * const result = await safeExecute(
 *   async () => {
 *     return await fetchData();
 *   },
 *   (error) => {
 *     console.error("Custom error handling:", error);
 *     notifyUser("Failed to fetch data");
 *   }
 * );
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    } else {
      logError(error instanceof Error ? error : new Error(String(error)));
    }
    return null;
  }
}
```

#### Validation Utilities

```typescript
/**
 * Validates that a value is not null or undefined
 * 
 * @param value - The value to validate
 * @param message - Optional custom error message
 * @returns The value if it's defined
 * @throws ValidationError if the value is null or undefined
 * 
 * @example
 * // Basic usage
 * const userId = assertDefined(request.params.userId, "User ID is required");
 * 
 * // With default error message
 * const email = assertDefined(user.email);
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = "Value is required"
): T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
  return value;
}

/**
 * Validates that a condition is true
 * 
 * @param condition - The condition to validate
 * @param message - Optional custom error message
 * @throws ValidationError if the condition is false
 * 
 * @example
 * // Validate user is at least 18 years old
 * assertCondition(user.age >= 18, "User must be at least 18 years old");
 * 
 * // Validate password meets requirements
 * assertCondition(
 *   password.length >= 8, 
 *   "Password must be at least 8 characters long"
 * );
 */
export function assertCondition(
  condition: boolean,
  message = "Condition not met"
): void {
  if (!condition) {
    throw new ValidationError(message);
  }
}
```

#### Operation Wrappers

```typescript
/**
 * Wraps database operations with error handling
 * 
 * @param operation - The database operation to execute
 * @param context - Additional context information about the operation
 * @returns The result of the database operation
 * @throws DatabaseError if the operation fails
 * 
 * @example
 * // Basic usage
 * const users = await withDatabaseErrorHandling(
 *   async () => {
 *     return await db.query("SELECT * FROM users");
 *   },
 *   { operation: "fetchUsers" }
 * );
 * 
 * // With error context
 * const user = await withDatabaseErrorHandling(
 *   async () => {
 *     return await db.query("SELECT * FROM users WHERE id = ?", [userId]);
 *   },
 *   { userId, table: "users" }
 * );
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError(`Database operation failed: ${message}`, {
      originalError: error,
      ...context,
    });
  }
}

/**
 * Wraps external service calls with error handling
 * 
 * @param operation - The external service operation to execute
 * @param serviceName - Name of the external service
 * @param context - Additional context information about the operation
 * @returns The result of the external service operation
 * @throws ExternalServiceError if the operation fails
 * 
 * @example
 * // Basic usage
 * const weather = await withExternalServiceErrorHandling(
 *   async () => {
 *     return await weatherApi.getCurrentWeather("New York");
 *   },
 *   "WeatherAPI"
 * );
 * 
 * // With error context
 * const forecast = await withExternalServiceErrorHandling(
 *   async () => {
 *     return await weatherApi.getForecast("New York", 5);
 *   },
 *   "WeatherAPI",
 *   { location: "New York", days: 5 }
 * );
 */
export async function withExternalServiceErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(`${serviceName} service call failed: ${message}`, {
      serviceName,
      originalError: error,
      ...context,
    });
  }
}

/**
 * Wraps tool execution with error handling
 * 
 * @param operation - The tool execution operation to execute
 * @param toolName - Name of the tool
 * @param context - Additional context information about the operation
 * @returns The result of the tool execution
 * @throws ToolExecutionError if the operation fails
 * 
 * @example
 * // Basic usage
 * const result = await withToolExecutionErrorHandling(
 *   async () => {
 *     return await calendarTool.createEvent(eventData);
 *   },
 *   "createEvent"
 * );
 * 
 * // With error context
 * const result = await withToolExecutionErrorHandling(
 *   async () => {
 *     return await calendarTool.createEvent(eventData);
 *   },
 *   "createEvent",
 *   { eventData }
 * );
 */
export async function withToolExecutionErrorHandling<T>(
  operation: () => Promise<T>,
  toolName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolExecutionError(`Tool '${toolName}' execution failed: ${message}`, {
      toolName,
      originalError: error,
      ...context,
    });
  }
}

/**
 * Creates a timeout promise that rejects after the specified time
 * 
 * @param ms - Timeout in milliseconds
 * @param message - Optional custom error message
 * @returns A promise that rejects after the specified time
 * 
 * @example
 * // Basic usage with Promise.race
 * const result = await Promise.race([
 *   fetchData(),
 *   createTimeout(5000)
 * ]);
 * 
 * // With custom error message
 * const result = await Promise.race([
 *   fetchData(),
 *   createTimeout(5000, "Data fetch timed out")
 * ]);
 */
export function createTimeout(ms: number, message = "Operation timed out"): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new AppError({
      message,
      code: "TIMEOUT",
      statusCode: 408,
    })), ms);
  });
}

/**
 * Executes an operation with a timeout
 * 
 * @param operation - The operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Optional custom timeout message
 * @returns The result of the operation
 * @throws AppError with code "TIMEOUT" if the operation times out
 * 
 * @example
 * // Basic usage
 * const data = await withTimeout(
 *   fetchData(),
 *   5000
 * );
 * 
 * // With custom timeout message
 * const data = await withTimeout(
 *   fetchData(),
 *   5000,
 *   "Data fetch timed out, please try again later"
 * );
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  return Promise.race([
    operation,
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}
```

### Usage Examples

Here are some comprehensive examples of how to use the error handling system in different parts of the application:

#### Example 1: Basic Error Handling in an API Route

```typescript
import { handleError, ValidationError, NotFoundError } from '../utils/errors';

// In a route handler
export async function handleGetUser(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    
    // Validate input
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    
    // Fetch user from database
    const user = await env.DB.get(`user:${userId}`);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }
    
    return Response.json({ success: true, user: JSON.parse(user) });
  } catch (error) {
    // Log the error
    handleError(error);
    
    // Return appropriate response based on error type
    if (error instanceof ValidationError) {
      return Response.json({ 
        success: false, 
        error: error.message 
      }, { status: error.statusCode });
    }
    
    if (error instanceof NotFoundError) {
      return Response.json({ 
        success: false, 
        error: error.message 
      }, { status: error.statusCode });
    }
    
    // Generic error response for other errors
    return Response.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
```

#### Example 2: Using Operation Wrappers in a Service

```typescript
import { 
  withDatabaseErrorHandling, 
  withExternalServiceErrorHandling,
  assertDefined,
  assertCondition
} from '../utils/errors';

export class UserService {
  constructor(private db: Database, private authApi: AuthAPI) {}
  
  async getUserById(userId: string): Promise<User> {
    // Validate input
    assertDefined(userId, 'User ID is required');
    
    // Use database error handling wrapper
    return await withDatabaseErrorHandling(
      async () => {
        const user = await this.db.query('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (!user) {
          throw new NotFoundError(`User with ID ${userId} not found`);
        }
        
        return user;
      },
      { operation: 'getUserById', userId }
    );
  }
  
  async verifyUserCredentials(email: string, password: string): Promise<AuthResult> {
    // Validate input
    assertDefined(email, 'Email is required');
    assertDefined(password, 'Password is required');
    assertCondition(password.length >= 8, 'Password must be at least 8 characters');
    
    // Use external service error handling wrapper
    return await withExternalServiceErrorHandling(
      async () => {
        return await this.authApi.verifyCredentials(email, password);
      },
      'AuthAPI',
      { operation: 'verifyCredentials', email }
    );
  }
}
```

#### Example 3: Using Timeout Handling for External API Calls

```typescript
import { withTimeout, ExternalServiceError } from '../utils/errors';

export class WeatherService {
  constructor(private apiKey: string) {}
  
  async getCurrentWeather(location: string): Promise<WeatherData> {
    try {
      // Use timeout handling to prevent long-running requests
      return await withTimeout(
        fetch(`https://api.weather.com/current?location=${encodeURIComponent(location)}&apiKey=${this.apiKey}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Weather API returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
          }),
        5000,
        `Weather API request for ${location} timed out`
      );
    } catch (error) {
      // Convert to our error type
      if (error instanceof Error) {
        throw new ExternalServiceError(`Failed to get weather for ${location}: ${error.message}`, {
          location,
          service: 'WeatherAPI',
          originalError: error
        });
      }
      throw error;
    }
  }
}
```

#### Example 4: Using Safe Execute for Non-Critical Operations

```typescript
import { safeExecute, logError } from '../utils/errors';

export class AnalyticsService {
  constructor(private analyticsApi: AnalyticsAPI) {}
  
  async trackEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    // Use safeExecute for non-critical operations
    // This will log errors but not throw, allowing the application to continue
    await safeExecute(
      async () => {
        await this.analyticsApi.trackEvent(eventName, properties);
      },
      (error) => {
        // Custom error handling
        logError(error);
        console.warn(`Failed to track analytics event ${eventName}, continuing execution`);
      }
    );
  }
}
```

## Recent Knowledge Graph Implementation

We've implemented a knowledge graph system to represent relationships between entities:

```typescript
// KnowledgeGraph for entity relationship mapping
export class KnowledgeGraph<Env> {
  protected agent: Agent<Env>;
  
  constructor(agent: Agent<Env>) {
    this.agent = agent;
  }
  
  /**
   * Initialize the knowledge graph tables
   */
  async initialize(): Promise<void> {
    // Create tables for entities, relationships, and contradictions
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS kg_entities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        properties TEXT,
        confidence REAL DEFAULT 0.7,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS kg_relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        properties TEXT,
        confidence REAL DEFAULT 0.7,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES kg_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES kg_entities(id) ON DELETE CASCADE
      )
    `;
    
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS kg_contradictions (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        property TEXT NOT NULL,
        value1 TEXT NOT NULL,
        value2 TEXT NOT NULL,
        confidence1 REAL NOT NULL,
        confidence2 REAL NOT NULL,
        created_at INTEGER NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        resolution TEXT,
        FOREIGN KEY (entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE
      )
    `;
    
    // Create indexes for better performance
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_entity_type ON kg_entities(type)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_relationship_type ON kg_relationships(type)`;
  }
  
  /**
   * Extract entities from text
   * @param text Text to extract entities from
   * @returns Array of extracted entities
   */
  async extractEntities(text: string): Promise<Entity[]> {
    // Implementation for entity extraction
    // This identifies people, organizations, locations, dates, etc.
    return [];
  }
  
  /**
   * Extract relationships between entities
   * @param text Text to extract relationships from
   * @param entities Entities to find relationships between
   * @returns Array of extracted relationships
   */
  async extractRelationships(text: string, entities: Entity[]): Promise<Relationship[]> {
    // Implementation for relationship extraction
    // This identifies connections like "works_at", "located_in", etc.
    return [];
  }
  
  /**
   * Detect contradictions in entity properties
   * @param entityId Entity ID to check for contradictions
   * @param property Property name
   * @param value New value to check against existing values
   * @param confidence Confidence in the new value
   * @returns Detected contradiction if any
   */
  async detectContradiction(entityId: string, property: string, value: any, confidence: number): Promise<Contradiction | null> {
    // Implementation for contradiction detection
    // This helps maintain data consistency
    return null;
  }
  
  /**
   * Query the knowledge graph
   * @param query Query parameters
   * @returns Query results
   */
  async query(query: {
    entityTypes?: string[];
    relationshipTypes?: string[];
    properties?: Record<string, any>;
    confidenceThreshold?: number;
  }): Promise<QueryResult> {
    // Implementation for graph querying
    // This allows flexible queries by entity types, relationship types, and properties
    return { entities: [], relationships: [] };
  }
}
```

## Learning Enhanced Memory Retrieval

We've implemented a learning-enhanced memory retrieval system:

```typescript
// LearningEnhancedMemoryRetrieval for combining memory retrieval with learning
export class LearningEnhancedMemoryRetrieval<Env> {
  protected agent: Agent<Env>;
  protected memoryManager: MemoryManager<Env>;
  protected learningSystem: LearningSystem<Env>;
  
  constructor(
    agent: Agent<Env>, 
    memoryManager: MemoryManager<Env>,
    learningSystem: LearningSystem<Env>
  ) {
    this.agent = agent;
    this.memoryManager = memoryManager;
    this.learningSystem = learningSystem;
  }
  
  /**
   * Retrieve memories with learning-enhanced relevance
   * @param query The query to retrieve memories for
   * @param options Retrieval options
   * @returns Enhanced memory retrieval results
   */
  async retrieveWithLearning(query: string, options: {
    limit?: number;
    includeRelevanceDetails?: boolean;
    useFeedbackHistory?: boolean;
  }): Promise<EnhancedMemoryResult[]> {
    // Implementation for learning-enhanced memory retrieval
    // This combines memory retrieval with learning capabilities
    return [];
  }
  
  /**
   * Process user feedback on memory retrieval
   * @param memoryId Memory ID that received feedback
   * @param feedback User feedback (positive or negative)
   * @param query The query that led to this memory being retrieved
   * @returns Success status
   */
  async processFeedback(memoryId: string, feedback: "positive" | "negative", query: string): Promise<boolean> {
    // Implementation for processing user feedback
    // This helps improve future memory retrieval
    return true;
  }
  
  /**
   * Adapt retrieval strategy based on user behavior
   * @param userId User ID to adapt for
   * @returns Adapted retrieval parameters
   */
  async adaptRetrievalStrategy(userId: string): Promise<RetrievalParameters> {
    // Implementation for adapting retrieval strategy
    // This personalizes memory retrieval based on user behavior
    return {
      semanticWeight: 0.7,
      recencyWeight: 0.2,
      importanceWeight: 0.1
    };
  }
}
```

## Testing & Validation

We've established a comprehensive testing strategy for the ImpossibleAgent project, with a focus on ensuring reliability, maintainability, and quality of the codebase.

### Test Coverage Target

We aim for >85% test coverage for all core business logic, with tiered coverage targets:

- **Critical Components** (90-100% coverage): Memory system, knowledge graph, tool integration, security system, error handling
- **Standard Components** (85-90% coverage): UI logic, API routes, data transformation, configuration management, utility functions
- **Lower Priority Components** (70-85% coverage): Development utilities, logging, documentation generation, non-critical UI elements

### Testing Pyramid Implementation

We follow the testing pyramid approach with three levels of testing:

#### 1. Unit Tests

```typescript
// Example unit test for a utility function
import { describe, it, expect } from 'vitest';
import { formatError } from '../src/utils/errors';

describe('formatError', () => {
  it('should format AppError instances correctly', () => {
    const error = new AppError({
      message: 'Test error',
      code: 'TEST_ERROR',
      statusCode: 400,
      context: { test: true }
    });
    
    const formatted = formatError(error);
    
    expect(formatted).toMatchObject({
      name: 'AppError',
      message: 'Test error',
      code: 'TEST_ERROR',
      statusCode: 400,
      isOperational: true,
      context: { test: true }
    });
    expect(formatted.stack).toBeDefined();
  });
  
  it('should format regular Error instances correctly', () => {
    const error = new Error('Regular error');
    
    const formatted = formatError(error);
    
    expect(formatted).toMatchObject({
      name: 'Error',
      message: 'Regular error',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      isOperational: false
    });
    expect(formatted.stack).toBeDefined();
  });
});
```

#### 2. Integration Tests

```typescript
// Example integration test for ToolUsageTracker
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolUsageTracker } from '../src/tools/ToolUsageTracker';
import { ToolSuggestionSystem } from '../src/tools/ToolSuggestionSystem';

// Mock dependencies
vi.mock('../src/tools/ToolSuggestionSystem', () => {
  return {
    ToolSuggestionSystem: vi.fn().mockImplementation(() => ({
      updateSuggestionRankings: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('ToolUsageTracker Integration', () => {
  let agent;
  let tracker;
  let suggestionSystem;
  
  beforeEach(() => {
    // Setup mock agent with SQL capabilities
    agent = {
      sql: vi.fn().mockImplementation((strings, ...values) => {
        // Mock SQL implementation
        return Promise.resolve({ rows: [] });
      }),
      setState: vi.fn(),
      state: {}
    };
    
    suggestionSystem = new ToolSuggestionSystem(agent);
    tracker = new ToolUsageTracker(agent, suggestionSystem);
  });
  
  it('should initialize database tables', async () => {
    await tracker.initialize();
    
    // Verify SQL was called to create tables
    expect(agent.sql).toHaveBeenCalledTimes(4); // 3 CREATE TABLE + 1 CREATE INDEX
  });
  
  it('should track tool usage and update suggestion system', async () => {
    const endTracking = await tracker.startTracking({
      toolId: 'test-tool',
      serverId: 'test-server',
      toolName: 'testTool',
      conversationId: 'test-conversation',
      userId: 'test-user',
      inputParams: { param: 'value' },
      wasSuggested: true,
      wasAutoSelected: false,
      context: { context: 'test' }
    });
    
    // End tracking with success
    await endTracking({ success: true });
    
    // Verify SQL was called to insert event
    expect(agent.sql).toHaveBeenCalledTimes(1);
    
    // Verify suggestion system was updated
    expect(suggestionSystem.updateSuggestionRankings).toHaveBeenCalledTimes(1);
  });
});
```

#### 3. End-to-End Tests

```typescript
// Example E2E test using Playwright
import { test, expect } from '@playwright/test';

test('user can send a message and receive a response', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:8787');
  
  // Wait for the chat interface to load
  await page.waitForSelector('.chat-container');
  
  // Type a message
  await page.fill('.chat-input', 'Hello, what can you help me with?');
  
  // Send the message
  await page.click('.send-button');
  
  // Wait for the response
  await page.waitForSelector('.message.from-agent');
  
  // Verify the response exists
  const responseText = await page.textContent('.message.from-agent');
  expect(responseText).toBeTruthy();
  expect(responseText.length).toBeGreaterThan(0);
});
```

### Test-First Development

For critical components, we follow a test-first development approach:

```typescript
// Example of test-first development for a new feature
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from '../src/memory/MemoryManager';

describe('MemoryManager.searchMemoriesByEmbedding', () => {
  let memoryManager;
  let mockAgent;
  
  beforeEach(() => {
    // Setup mock agent
    mockAgent = {
      sql: vi.fn().mockImplementation((strings, ...values) => {
        // Mock SQL implementation that returns sample memories
        return Promise.resolve({
          rows: [
            { id: 'mem1', content: 'First memory', similarity: 0.95 },
            { id: 'mem2', content: 'Second memory', similarity: 0.85 },
            { id: 'mem3', content: 'Third memory', similarity: 0.75 }
          ]
        });
      })
    };
    
    memoryManager = new MemoryManager(mockAgent);
  });
  
  it('should return memories sorted by embedding similarity', async () => {
    const query = 'test query';
    const embedding = [0.1, 0.2, 0.3]; // Sample embedding vector
    
    const results = await memoryManager.searchMemoriesByEmbedding(embedding, { limit: 3 });
    
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('mem1');
    expect(results[1].id).toBe('mem2');
    expect(results[2].id).toBe('mem3');
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
  });
  
  it('should respect the limit parameter', async () => {
    const embedding = [0.1, 0.2, 0.3];
    
    const results = await memoryManager.searchMemoriesByEmbedding(embedding, { limit: 2 });
    
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('mem1');
    expect(results[1].id).toBe('mem2');
  });
  
  it('should apply the similarity threshold', async () => {
    const embedding = [0.1, 0.2, 0.3];
    
    const results = await memoryManager.searchMemoriesByEmbedding(embedding, { 
      similarityThreshold: 0.8 
    });
    
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('mem1');
    expect(results[1].id).toBe('mem2');
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.8);
    expect(results[1].similarity).toBeGreaterThanOrEqual(0.8);
  });
});

// Then implement the feature to make the tests pass
```

### Mocking Strategies

We use various mocking strategies to isolate components during testing:

```typescript
// Example of mocking circular dependencies
import { vi } from 'vitest';

// Mock the ToolSuggestionSystem to break circular dependency
vi.mock('../src/tools/ToolSuggestionSystem', () => {
  return {
    ToolSuggestionSystem: vi.fn().mockImplementation(() => ({
      updateSuggestionRankings: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      suggestTools: vi.fn().mockResolvedValue([
        { id: 'tool1', name: 'Tool 1', score: 0.9 },
        { id: 'tool2', name: 'Tool 2', score: 0.8 }
      ])
    }))
  };
});

// Example of mocking SQL database
const mockSql = vi.fn().mockImplementation((strings, ...values) => {
  // Check the SQL query and return appropriate mock data
  const query = strings.join('?');
  
  if (query.includes('SELECT * FROM tool_usage_events')) {
    return Promise.resolve({
      rows: [
        { id: 'event1', tool_id: 'tool1', success: true },
        { id: 'event2', tool_id: 'tool2', success: false }
      ]
    });
  }
  
  return Promise.resolve({ rows: [] });
});

// Example of mocking time
vi.useFakeTimers();
const now = new Date('2025-05-09T12:00:00Z');
vi.setSystemTime(now);
```

### Testing Best Practices

1. **Test Independence**: Each test should be independent of others
2. **Test Readability**: Use clear, descriptive test names and the Arrange-Act-Assert pattern
3. **Test Reliability**: Avoid flaky tests with deterministic test data
4. **Test Maintenance**: Keep tests up to date with implementation changes
5. **Test Performance**: Keep tests fast to encourage frequent running

## Next Steps for Implementation

Based on our current progress, the next steps for implementation are:

1. **Implement Multi-Modal Support**: Add capabilities for handling images and other media types
2. **Develop Advanced UI Components**: Create specialized UI components for different interaction modes
3. **Expand Client SDK**: Enhance the client SDK for better cross-platform support
4. **Implement Factual Verification**: Build mechanisms to verify knowledge against trusted sources
5. **Enhance Learning Mechanisms**: Further develop systems for learning from interactions
6. **Expand Test Coverage**: Increase test coverage to meet our targets, especially for critical components

These implementation details reflect our current progress with the Cloudflare Agents SDK and provide guidance for further development of ImpossibleAgent.
