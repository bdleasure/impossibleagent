# Cloudflare Agents SDK Expert Guide

## Overview

Cloudflare Agents SDK enables building AI-powered agents that can autonomously perform tasks, communicate with clients in real-time, call AI models, persist state, schedule tasks, run asynchronous workflows, browse the web, query data, and support human-in-the-loop interactions.

Agents are distinct from traditional automation and co-pilots:
- **Agents** → non-linear, non-deterministic execution paths that can adapt based on context
- **Workflows** → linear, deterministic execution paths
- **Co-pilots** → augmentative AI assistance requiring human intervention

## Core Components

### 1. Agent Architecture

Agents operate in a continuous loop of:
1. **Observing** the current state or task
2. **Planning** what actions to take, using AI for reasoning
3. **Executing** those actions using available tools
4. **Learning** from the results (storing in memory, updating progress)

Three primary components of agent systems:
- **Decision Engine**: Usually an LLM that determines action steps
- **Tool Integration**: APIs, functions, and services the agent can utilize
- **Memory System**: Maintains context and tracks task progress

### 2. Agent Class API

The `Agent` class is the foundation for building agents:

```typescript
import { Agent } from "agents";

class MyAgent extends Agent<Env, State> {
  // Set default initial state
  initialState = {
    counter: 0,
    messages: [],
    lastUpdated: null
  };

  // Called when a new Agent instance starts or wakes from hibernation
  async onStart() {
    console.log('Agent started with state:', this.state);
  }

  // Handle HTTP requests
  async onRequest(request: Request): Promise<Response> {
    return new Response("Hello from Agent!");
  }

  // WebSocket connection handling
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    // Access the original request via ctx.request for auth etc.
  }

  async onMessage(connection: Connection, message: WSMessage) {
    // Handle incoming messages
    connection.send("Received your message");
  }

  async onError(connection: Connection, error: unknown) {
    console.error(`Connection error:`, error);
  }

  async onClose(connection: Connection, code: number, reason: string, wasClean: boolean) {
    console.log(`Connection closed: ${code} - ${reason}`);
  }

  // State management
  onStateUpdate(state: State, source: "server" | Connection) {
    console.log("State updated:", state, "Source:", source);
  }

  // Custom methods
  async customProcessingMethod(data: any) {
    this.setState({ ...this.state, lastUpdated: new Date() });
  }
}
```

### 3. State Management

Every Agent has built-in state management capabilities:

```typescript
// Update state
this.setState({
  ...this.state,
  counter: this.state.counter + 1,
  lastUpdated: new Date()
});

// Handle state updates
onStateUpdate(state, source) {
  console.log(`State updated by ${source === "server" ? "server" : "client"}`);
}
```

State is:
- Persisted across Agent restarts
- Automatically serialized/deserialized
- Immediately consistent within the Agent
- Thread-safe for concurrent updates
- Fast (colocated with the Agent)

### 4. SQL Database

Each Agent has an embedded SQLite database:

```typescript
// Create a table
this.sql`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at INTEGER
  )
`;

// Insert data
this.sql`
  INSERT INTO users (id, name, email, created_at)
  VALUES (${id}, ${name}, ${email}, ${Date.now()})
`;

// Query data with TypeScript typing
const users = this.sql<User>`
  SELECT * FROM users
  WHERE name LIKE ${'%' + term + '%'} OR email LIKE ${'%' + term + '%'}
  ORDER BY created_at DESC
`;
```

### 5. WebSocket Communication

Agents support real-time communication via WebSockets:

```typescript
// Server-side (Agent)
async onMessage(connection: Connection, message: WSMessage) {
  if (typeof message === 'string') {
    try {
      const data = JSON.parse(message);
      if (data.type === 'update') {
        connection.setState({ ...connection.state, lastActive: Date.now() });
        this.setState({
          ...this.state,
          connections: this.state.connections + 1
        });
        connection.send(JSON.stringify({
          type: 'updated',
          status: 'success'
        }));
      }
    } catch (e) {
      connection.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  }
}

// Client-side
import { AgentClient } from "agents/client";

const client = new AgentClient({
  agent: "chat-agent", // Name of your Agent class in kebab-case
  name: "support-room-123", // Specific instance name
  host: window.location.host
});

client.onopen = () => {
  console.log("Connected to agent");
  client.send(JSON.stringify({ type: "join", user: "user123" }));
};

client.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};
```

### 6. Task Scheduling

Agents can schedule tasks to run in the future:

```typescript
// Schedule a one-time task
const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
const schedule = await this.schedule(
  twoHoursFromNow,
  'sendReminder',
  { userId, message, channel: 'email' }
);

// Schedule a recurring task using cron
const schedule = await this.schedule(
  '0 8 * * *',  // Cron expression: minute hour day month weekday
  'generateDailyReport',
  { reportType: 'daily-summary' }
);

// Method that will be called when the scheduled task runs
async sendReminder(data: ReminderData) {
  console.log(`Sending reminder to ${data.userId}: ${data.message}`);
  // Add code to send the actual notification
}
```

### 7. AI Model Integration

Agents can call AI models from various providers, including:

- Workers AI
- OpenAI
- Anthropic
- Google's Gemini
- AI Gateway for routing across providers

Each Agent instance is associated with a stateful compute instance, allowing for persistent connections needed in real-time applications like chat. If a user disconnects during a long-running response or loses conversational context when refreshing the browser, the state can be stored directly within the Agent.

#### Streaming Responses with WebSockets

For long-running model requests:

```typescript
import { Agent } from "agents";
import { OpenAI } from "openai";

export class MyAgent extends Agent<Env> {
  async onMessage(connection: Connection, message: WSMessage) {
    let msg = JSON.parse(message);
    await this.queryReasoningModel(connection, msg.prompt);
  }

  async queryReasoningModel(connection: Connection, userPrompt: string) {
    const client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    try {
      const stream = await client.chat.completions.create({
        model: this.env.MODEL || 'o3-mini',
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
      });

      // Stream responses back as WebSocket messages
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          connection.send(JSON.stringify({ type: 'chunk', content }));
        }
      }

      // Send completion message
      connection.send(JSON.stringify({ type: 'done' }));
    } catch (error) {
      connection.send(JSON.stringify({ type: 'error', error: error }));
    }
  }
}
```

#### Using Workers AI

```typescript
import { Agent } from "agents";

export class MyAgent extends Agent<Env> {
  async onRequest(request: Request) {
    const response = await this.env.AI.run(
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      {
        prompt: "Build me a Cloudflare Worker that returns JSON.",
        stream: true, // Stream a response and don't block the client!
      }
    );

    // Return the stream
    return new Response(response, {
      headers: { "content-type": "text/event-stream" }
    });
  }
}
```

#### Using State as Context

```typescript
async callReasoningModel(prompt: Prompt) {
  // Get history from database
  let result = this.sql<History>`SELECT * FROM history WHERE user = ${prompt.userId} ORDER BY timestamp DESC LIMIT 1000`;
  let context = [];
  for await (const row of result) {
    context.push(row.entry);
  }

  const client = new OpenAI({
    apiKey: this.env.OPENAI_API_KEY,
  });

  // Combine user history with the current prompt
  const systemPrompt = prompt.system || 'You are a helpful assistant.';
  const userPrompt = `${prompt.user}\n\nUser history:\n${context.join('\n')}`;

  const completion = await client.chat.completions.create({
    model: this.env.MODEL || 'o3-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  // Store the response in history
  this.sql`INSERT INTO history (timestamp, user, entry) VALUES (${new Date()}, ${prompt.userId}, ${completion.choices[0].message.content})`;

  return completion.choices[0].message.content;
}
```

### 8. React Integration

Agents provide React hooks for client integration:

```typescript
import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";

function ChatInterface() {
  // Connect to the chat agent
  const agentConnection = useAgent({
    agent: "customer-support",
    name: "session-12345",
    onStateUpdate: (newState) => setState(newState),
  });

  // Use the useAgentChat hook with the agent connection
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearHistory
  } = useAgentChat({
    agent: agentConnection,
    initialMessages: [
      { role: "system", content: "You're chatting with our AI assistant." },
      { role: "assistant", content: "Hello! How can I help you today?" }
    ]
  });

  return (
    <div className="chat-container">
      {/* Chat UI implementation */}
    </div>
  );
}
```

## Best Practices

### 1. Agent Design

- Define clear boundaries for your agent's capabilities
- Structure agents around specific domains or tasks
- Use the `initialState` property to set default state
- Implement proper error handling in all methods
- Use TypeScript for better type safety and developer experience

### 2. State Management

- Keep state minimal and focused on essential data
- Use the SQL database for complex or large datasets
- Implement the `onStateUpdate` method to react to state changes
- Consider state synchronization needs when designing your agent

### 3. Tool Integration

- Design tools with clear descriptions and parameter schemas
- Implement human-in-the-loop confirmation for sensitive operations
- Use the execution pattern for tools that require confirmation
- Provide meaningful feedback from tool executions

### 4. Performance Optimization

- Use the SQL database for efficient data storage and retrieval
- Implement pagination for large datasets
- Optimize state synchronization to minimize network traffic
- Use appropriate caching strategies

### 5. Security Considerations

- Validate all user inputs
- Implement proper authentication and authorization
- Use environment variables for sensitive configuration
- Follow the principle of least privilege for tool permissions

## Implementation Patterns

### 1. Chat Agent Pattern

```typescript
import { AIChatAgent } from "agents/ai-chat-agent";
import { Message } from "ai";

class CustomerSupportAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish) {
    const { openai } = this.env.AI;
    const chatHistory = this.messages;
    const systemPrompt = await this.generateSystemPrompt();

    const stream = await openai.chat({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory
      ],
      stream: true
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" }
    });
  }

  async generateSystemPrompt() {
    return `You are a helpful customer support agent.
            Respond to customer inquiries based on the following guidelines:
            - Be friendly and professional
            - If you don't know an answer, say so
            - Current company policies: ...`;
  }
}
```

### 2. Tool Integration Pattern

```typescript
import { tool } from "agents/tools";
import { z } from "zod";

// Auto-executing tool
const getCurrentTime = tool({
  description: "Get current server time",
  parameters: z.object({}),
  execute: async () => new Date().toISOString(),
});

// Tool requiring confirmation
const searchDatabase = tool({
  description: "Search the database for user records",
  parameters: z.object({
    query: z.string(),
    limit: z.number().optional(),
  }),
  // No execute function = requires confirmation
});

// Execution handler
export const executions = {
  searchDatabase: async ({
    query,
    limit,
  }: {
    query: string;
    limit?: number;
  }) => {
    // Implementation for when the tool is confirmed
    const results = await db.search(query, limit);
    return results;
  },
};
```

### 3. Scheduling Pattern

```typescript
class SchedulingAgent extends Agent<Env, State> {
  // Schedule a one-time reminder
  async scheduleReminder(userId: string, message: string) {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const schedule = await this.schedule<ReminderData>(
      twoHoursFromNow,
      'sendReminder',
      { userId, message, channel: 'email' }
    );
    console.log(`Scheduled reminder with ID: ${schedule.id}`);
    return schedule.id;
  }

  // Schedule a recurring daily task using cron
  async scheduleDailyReport() {
    // Run at 08:00 AM every day
    const schedule = await this.schedule(
      '0 8 * * *',  // Cron expression: minute hour day month weekday
      'generateDailyReport',
      { reportType: 'daily-summary' }
    );
    console.log(`Scheduled daily report with ID: ${schedule.id}`);
    return schedule.id;
  }

  // Method that will be called when the scheduled task runs
  async sendReminder(data: ReminderData) {
    console.log(`Sending reminder to ${data.userId}: ${data.message}`);
    // Add code to send the actual notification
  }
}
```

## Additional Features

### 1. Web Browsing Capabilities

Agents can browse the web using the Browser Rendering API or other headless browser services:

```typescript
interface Env {
  BROWSER: Fetcher;
}

export class MyAgent extends Agent<Env> {
  async browse(browserInstance: Fetcher, urls: string[]) {
    let responses = [];
    for (const url of urls) {
      const browser = await puppeteer.launch(browserInstance);
      const page = await browser.newPage();
      await page.goto(url);
      await page.waitForSelector('body');
      const bodyContent = await page.$eval('body', (element) => element.innerHTML);
      
      const client = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
      
      let resp = await client.chat.completions.create({
        model: this.env.MODEL,
        messages: [
          {
            role: 'user',
            content: `Return a JSON object with the product names, prices and URLs with the following format: { "name": "Product Name", "price": "Price", "url": "URL" } from the website content below. <content>${bodyContent}</content>`,
          },
        ],
        response_format: {
          type: 'json_object',
        },
      });
      
      responses.push(resp);
      await browser.close();
    }
    return responses;
  }
}
```

To use this functionality, you need to:
1. Install the `@cloudflare/puppeteer` package: `npm install @cloudflare/puppeteer --save-dev`
2. Add the browser binding to your wrangler configuration:
```json
{
  "browser": {
    "binding": "MYBROWSER"
  }
}
```

You can also use Browserbase by adding your Browserbase API key as a secret:

```bash
npx wrangler@latest secret put BROWSERBASE_API_KEY
```

### 2. Calling Agents

Agents are created on-the-fly and can serve multiple requests concurrently. Each Agent instance is isolated from other instances, maintains its own state, and has a unique address.

#### Addressing Patterns

There are multiple ways to call your Agent:

1. **Routed addressing** - Automatically maps requests to an individual Agent based on the `/agents/:agent/:name` URL pattern:

```typescript
// Best for connecting React apps directly to Agents using useAgent from agents/react
return (await routeAgentRequest(request, env)) || 
  Response.json({ msg: 'no agent here' }, { status: 404 });
```

2. **Named addressing** - Convenience method for creating or retrieving an agent by name/ID:

```typescript
// Best for bringing your own routing or plugging into an existing application
let namedAgent = getAgentByName<Env, MyAgent>(env.MyAgent, 'my-unique-agent-id');
let namedResp = (await namedAgent).fetch(request);
return namedResp;
```

#### Calling Methods on Agents

When using `getAgentByName`, you can call methods defined directly on the Agent using the JavaScript RPC API:

```typescript
// Call methods directly on the Agent, and pass native JavaScript objects
let chatResponse = namedAgent.chat('Hello!');

// No need to serialize/deserialize from HTTP request or WebSocket
let agentState = namedAgent.getState(); // agentState is of type UserHistory
```

#### Naming Your Agents

When creating names for your Agents, think about what the Agent represents:
- A unique user?
- A team or company?
- A room or channel for collaboration?

A consistent approach to naming allows you to:
- Direct incoming requests to the right Agent
- Deterministically route new requests back to that Agent
- Avoid relying on centralized session storage

#### Authenticating Agents

Handle authentication in your Workers code before invoking your Agent:

```typescript
// Use the onBeforeConnect and onBeforeRequest hooks
return (await routeAgentRequest(request, env, {
  // Run logic before a WebSocket client connects
  onBeforeConnect: (request) => {
    // Your auth code here
    // Return a Response to stop processing and NOT invoke the Agent
    // return Response.json({"error": "not authorized"}, { status: 403 })
  },
  // Run logic before a HTTP client connects
  onBeforeRequest: (request) => {
    // Your auth code here
  },
  // Prepend a prefix for how your Agents are named
  prefix: 'name-prefix-here',
})) || Response.json({ msg: 'no agent here' }, { status: 404 });
```

### 3. MCP Transport

The Model Context Protocol (MCP) specification defines three standard transport mechanisms:

1. **stdio** - Communication over standard in and standard out, designed for local MCP connections
2. **Server-Sent Events (SSE)** - Currently supported by most remote MCP clients
3. **Streamable HTTP** - New transport method introduced in March 2025, simplifies communication by using a single HTTP endpoint

#### Implementing Remote MCP Transport

To support both remote transport methods (SSE and Streamable HTTP) concurrently:

```typescript
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const { pathname } = new URL(request.url);
    
    if (pathname.startsWith('/sse')) {
      return MyMcpAgent.serveSSE('/sse').fetch(request, env, ctx);
    }
    
    if (pathname.startsWith('/mcp')) {
      return MyMcpAgent.serve('/mcp').fetch(request, env, ctx);
    }
    
    // Handle case where no path matches
    return new Response('Not found', { status: 404 });
  },
};
```

For MCP servers with authentication using Workers OAuth Provider:

```typescript
export default new OAuthProvider({
  apiHandlers: {
    '/sse': MyMCP.serveSSE('/sse'),
    '/mcp': MyMCP.serve('/mcp'),
  },
  // ... other OAuth configuration
})
```

### 4. Testing Remote MCP Servers

#### The MCP Inspector

The `@modelcontextprotocol/inspector` package is a visual testing tool for MCP servers:

```bash
npx @modelcontextprotocol/inspector
```

#### Connect to Claude Desktop via Local Proxy

Even though Claude Desktop doesn't yet support remote MCP clients, you can use the `mcp-remote` local proxy:

1. Open Claude Desktop and navigate to Settings -> Developer -> Edit Config
2. Replace the content with:

```json
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": ["mcp-remote", "http://my-mcp-server.my-account.workers.dev/sse"]
    }
  }
}
```

#### Connect to Cursor

To connect Cursor with your remote MCP server, choose `Type`: "Command" and in the `Command` field, combine the command and args fields into one:

```
npx mcp-remote https://your-worker-name.your-account.workers.dev/sse
```

#### Connect to Windsurf

Edit the `mcp_config.json` file and add:

```json
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": ["mcp-remote", "http://my-mcp-server.my-account.workers.dev/sse"]
    }
  }
}
```

### 5. Running Workflows

Agents can trigger asynchronous Workflows, allowing your Agent to run complex, multi-step tasks in the background:

```typescript
export class MyAgent extends Agent<Env> {
  async onRequest(request: Request) {
    let userId = request.headers.get("user-id");
    
    // Trigger a schedule that runs a Workflow
    let { taskId } = await this.schedule(300, "runWorkflow", { 
      id: userId, 
      flight: "DL264", 
      date: "2025-02-23" 
    });
  }

  async runWorkflow(data) {
    let instance = await this.env.MY_WORKFLOW.create({
      id: data.id,
      params: data,
    });

    // Schedule another task that checks the Workflow status every 5 minutes
    await this.schedule("*/5 * * * *", "checkWorkflowStatus", { id: instance.id });
  }
}

export class MyWorkflow extends WorkflowEntrypoint<Env> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Your Workflow code here
  }
}
```

You'll need to add a binding to your Workflow in your wrangler configuration:

```json
{
  "workflows": [
    {
      "name": "EMAIL_WORKFLOW",
      "class_name": "MyWorkflow",
      // Optional: set the script_name field if your Workflow is defined in a
      // different project from your Agent
      "script_name": "email-workflows"
    }
  ]
}
```

### 6. Agents Starter Kit

The Cloudflare Agents Starter Kit is a template for building AI-powered chat agents using Cloudflare's Agent platform. It provides a foundation for creating interactive chat experiences with AI, complete with a modern UI and tool integration capabilities.

#### Features

- 💬 Interactive chat interface with AI
- 🛠️ Built-in tool system with human-in-the-loop confirmation
- 📅 Advanced task scheduling (one-time, delayed, and recurring via cron)
- 🌓 Dark/Light theme support
- ⚡️ Real-time streaming responses
- 🔄 State management and chat history
- 🎨 Modern, responsive UI

#### Quick Start

1. Create a new project:

```bash
npm create cloudflare@latest -- --template cloudflare/agents-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```
OPENAI_API_KEY=your_openai_api_key
```

4. Run locally:

```bash
npm start
```

5. Deploy:

```bash
npm run deploy
```

#### Project Structure

```
├── src/
│   ├── app.tsx        # Chat UI implementation
│   ├── server.ts      # Chat agent logic
│   ├── tools.ts       # Tool definitions
│   ├── utils.ts       # Helper functions
│   └── styles.css     # UI styling
```

#### Adding New Tools

Add new tools in `tools.ts` using the tool builder:

```typescript
// Example of a tool that requires confirmation
const searchDatabase = tool({
  description: "Search the database for user records",
  parameters: z.object({
    query: z.string(),
    limit: z.number().optional(),
  }),
  // No execute function = requires confirmation
});

// Example of an auto-executing tool
const getCurrentTime = tool({
  description: "Get current server time",
  parameters: z.object({}),
  execute: async () => new Date().toISOString(),
});
```

To handle tool confirmations, add execution functions to the `executions` object:

```typescript
export const executions = {
  searchDatabase: async ({
    query,
    limit,
  }: {
    query: string;
    limit?: number;
  }) => {
    // Implementation for when the tool is confirmed
    const results = await db.search(query, limit);
    return results;
  },
};
```

## Building Stateful, Agentic MCP Servers

Cloudflare Agents can be used to build stateful, agentic MCP servers that combine the power of the Model Context Protocol with the state management capabilities of Agents:

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export class MyMcpAgent extends McpAgent<Env> {
  // Create an MCP server instance
  server = new McpServer({
    name: "my-mcp-server",
    version: "1.0.0",
    description: "An MCP server built with Cloudflare Agents"
  });

  // Initialize the server with tools
  async init() {
    // Define a tool with Zod schema for parameters
    this.server.tool(
      "get_weather",
      {
        location: z.string().describe("City name or coordinates"),
        units: z.enum(["metric", "imperial"]).optional().describe("Temperature units")
      },
      async ({ location, units }) => {
        // Tool implementation
        const weather = await this.getWeatherData(location, units);
        return {
          content: [
            { type: "text", text: `Weather in ${location}: ${weather.temperature}°${units === "imperial" ? "F" : "C"}, ${weather.conditions}` }
          ]
        };
      }
    );

    // Define a resource
    this.server.resource(
      "weather_locations",
      async () => {
        // Resource implementation
        const locations = await this.getPopularLocations();
        return {
          content: [
            { type: "text", text: JSON.stringify(locations) }
          ]
        };
      }
    );
  }

  // Helper methods
  async getWeatherData(location: string, units: string = "metric") {
    // Implementation to fetch weather data
    return { temperature: 22, conditions: "Sunny" };
  }

  async getPopularLocations() {
    return ["New York", "London", "Tokyo", "Sydney", "Paris"];
  }
}
```

### Deploying Remote MCP Servers

To deploy a remote MCP server using Cloudflare Workers:

1. **Create a new project**:
   ```bash
   npm create cloudflare@latest my-mcp-server
   cd my-mcp-server
   npm install @modelcontextprotocol/sdk
   ```

2. **Implement your MCP server**:
   ```typescript
   // src/index.ts
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
   import { z } from "zod";

   export default {
     async fetch(request: Request, env: Env, ctx: ExecutionContext) {
       const { pathname } = new URL(request.url);
       
       // Create MCP server
       const server = new McpServer({
         name: "my-mcp-server",
         version: "1.0.0"
       });
       
       // Define tools
       server.tool(
         "hello_world",
         { name: z.string().describe("Your name") },
         async ({ name }) => ({
           content: [{ type: "text", text: `Hello, ${name}!` }]
         })
       );
       
       // Handle SSE endpoint
       if (pathname === "/sse") {
         return server.handleSse(request);
       }
       
       // Handle streamable HTTP endpoint
       if (pathname === "/mcp") {
         return server.handleHttp(request);
       }
       
       // Default response
       return new Response("MCP Server is running. Connect to /sse or /mcp endpoints.");
     }
   };
   ```

3. **Configure wrangler.jsonc**:
   ```json
   {
     "name": "my-mcp-server",
     "main": "src/index.ts",
     "compatibility_date": "2025-02-11",
     "compatibility_flags": ["nodejs_compat"]
   }
   ```

4. **Deploy to Cloudflare**:
   ```bash
   npx wrangler deploy
   ```

### Advanced MCP Server Testing

The MCP Inspector provides a visual interface for testing MCP servers:

```bash
# Install the MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector
```

The inspector allows you to:
- Connect to local or remote MCP servers
- Browse available tools and resources
- Test tool invocations with different parameters
- View response streams in real-time
- Debug tool execution and error handling

For automated testing, you can use the MCP client SDK:

```typescript
import { McpClient } from "@modelcontextprotocol/sdk/client/mcp";

// Create a client for your MCP server
const client = new McpClient({
  transport: "sse",
  endpoint: "https://your-worker.workers.dev/sse"
});

// Connect to the server
await client.connect();

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool("hello_world", { name: "Alice" });
console.log("Tool result:", result);

// Disconnect
await client.disconnect();
```

## Resources

- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Agents SDK Reference](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [Agents Starter Kit](https://github.com/cloudflare/agents-starter)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Browser Rendering Documentation](https://developers.cloudflare.com/browser-rendering/)
- [AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [Remote MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [MCP Tools Documentation](https://developers.cloudflare.com/agents/model-context-protocol/tools/)
- [MCP Authorization Guide](https://developers.cloudflare.com/agents/model-context-protocol/authorization/)
- [Firecrawl MCP Server](https://github.com/mendableai/firecrawl-mcp-server)
- [MCP Specification](https://github.com/model-context-protocol/spec)
- [MCP SDK Documentation](https://github.com/model-context-protocol/typescript-sdk)
