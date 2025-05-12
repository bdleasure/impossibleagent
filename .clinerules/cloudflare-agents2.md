# Cloudflare Agents Additional Documentation

This file contains additional documentation about Cloudflare Agents that complements the information in cloudflare-agents.md.

## Platform Limits

Limits that apply to authoring, deploying, and running Agents are detailed below.

Many limits are inherited from those applied to Workers scripts and/or Durable Objects, and are detailed in the [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) documentation.

| Feature | Limit |
| --- | --- |
| Max concurrent (running) Agents per account | Tens of millions+ |
| Max definitions per account | ~250,000+ |
| Max state stored per unique Agent | 1 GB |
| Max compute time per Agent | 30 seconds (refreshed per HTTP request / incoming WebSocket message) |
| Duration (wall clock) per step | Unlimited (for example, waiting on a database call or an LLM response) |

Source: [Platform Limits](https://developers.cloudflare.com/agents/platform/limits)

## Products Overview

Note: The Products Overview page (https://developers.cloudflare.com/agents/products) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### Email Workers

Note: The Email Workers page (http://developers.cloudflare.com/agents/products/email-workers) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### AI Gateway

Note: The AI Gateway page (http://developers.cloudflare.com/agents/products/ai-gateway) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

## Capabilities

Note: The Capabilities Overview page (http://developers.cloudflare.com/agents/capabilities) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### Send Email

Note: The Send Email capability page (http://developers.cloudflare.com/agents/capabilities/send-email) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### WebRTC Real-time

Note: The WebRTC Real-time capability page (http://developers.cloudflare.com/agents/capabilities/webrtc-realtime) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

## Reference Architectures

Note: The Reference Architectures Overview page (http://developers.cloudflare.com/agents/reference-architectures) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### Text and Call Architecture

Note: The Text and Call Architecture page (http://developers.cloudflare.com/agents/reference-architectures/text-and-call) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

### RAG Architecture

Note: The RAG Architecture page (http://developers.cloudflare.com/agents/reference-architectures/rag) returned a 404 error. This section of the documentation may have been moved or is currently unavailable.

## API Reference

### Agents API

This page provides an overview of the Agent SDK API, including the `Agent` class, methods and properties built-in to the Agents SDK.

The Agents SDK exposes two main APIs:

- The server-side `Agent` class. An Agent encapsulates all of the logic for an Agent, including how clients can connect to it, how it stores state, the methods it exposes, how to call AI models, and any error handling.
- The client-side `AgentClient` class, which allows you to connect to an Agent instance from a client-side application. The client APIs also include React hooks, including `useAgent` and `useAgentChat`, and allow you to automatically synchronize state between each unique Agent (running server-side) and your client applications.

An Agent can have many (millions of) instances: each instance is a separate micro-server that runs independently of the others. This allows Agents to scale horizontally: an Agent can be associated with a single user, or many thousands of users, depending on the agent you're building.

Instances of an Agent are addressed by a unique identifier: that identifier (ID) can be the user ID, an email address, GitHub username, a flight ticket number, an invoice ID, or any other identifier that helps to uniquely identify the instance and for whom it is acting on behalf of.

#### Agent class API

Writing an Agent requires you to define a class that extends the `Agent` class from the Agents SDK package. An Agent encapsulates all of the logic for an Agent, including how clients can connect to it, how it stores state, the methods it exposes, and any error handling.

You can also define your own methods on an Agent: it's technically valid to publish an Agent only has your own methods exposed, and create/get Agents directly from a Worker.

Your own methods can access the Agent's environment variables and bindings on `this.env`, state on `this.setState`, and call other methods on the Agent via `this.yourMethodName`.

#### WebSocket API

The WebSocket API allows you to accept and manage WebSocket connections made to an Agent.

##### Connection

Represents a WebSocket connection to an Agent.

#### State synchronization API

Methods and types for managing Agent state.

#### Scheduling API

Schedule tasks to run at a specified time in the future.

#### SQL API

Each Agent instance has an embedded SQLite database that can be accessed using the `this.sql` method within any method on your `Agent` class.

#### Client API

The Agents SDK provides a set of client APIs for interacting with Agents from client-side JavaScript code, including:

- React hooks, including `useAgent` and `useAgentChat`, for connecting to Agents from client applications.
- Client-side state syncing that allows you to subscribe to state updates between the Agent and any connected client(s) when calling `this.setState` within your Agent's code.
- The ability to call remote methods (Remote Procedure Calls; RPC) on the Agent from client-side JavaScript code using the `@callable` method decorator.

#### Chat Agent

The Agents SDK exposes an `AIChatAgent` class that extends the `Agent` class and exposes an `onChatMessage` method that simplifies building interactive chat agents.

You can combine this with the `useAgentChat` React hook from the `agents/ai-react` package to manage chat state and messages between a user and your Agent(s).

Source: [Agents API](https://developers.cloudflare.com/agents/api-reference/agents-api)


## Downloaded Example: WebSockets

Users and clients can connect to an Agent directly over WebSockets, allowing long-running, bi-directional communication with your Agent as it operates.

To enable an Agent to accept WebSockets, define `onConnect` and `onMessage` methods on your Agent.

- `onConnect(connection: Connection, ctx: ConnectionContext)` is called when a client establishes a new WebSocket connection. The original HTTP request, including request headers, cookies, and the URL itself, are available on `ctx.request`.
- `onMessage(connection: Connection, message: WSMessage)` is called for each incoming WebSocket message. Messages are one of `ArrayBuffer | ArrayBufferView | string`, and you can send messages back to a client using `connection.send()`. You can distinguish between client connections by checking `connection.id`, which is unique for each connected client.

Here's an example of an Agent that echoes back any message it receives:

JavaScript:
```javascript
import { Agent, Connection } from "agents";

export class ChatAgent extends Agent {
  async onConnect(connection, ctx) {
    // Connections are automatically accepted by the SDK.
    // You can also explicitly close a connection here with connection.close()
    // Access the Request on ctx.request to inspect headers, cookies and the URL
  }

  async onMessage(connection, message) {
    // const response = await longRunningAITask(message)
    await connection.send(message);
  }
}
```

TypeScript:
```typescript
import { Agent, Connection } from "agents";

export class ChatAgent extends Agent {
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    // Connections are automatically accepted by the SDK.
    // You can also explicitly close a connection here with connection.close()
    // Access the Request on ctx.request to inspect headers, cookies and the URL
  }

  async onMessage(connection: Connection, message: WSMessage) {
    // const response = await longRunningAITask(message)
    await connection.send(message)
  }
}
```

### Connecting clients

The Agent framework includes a useful helper package for connecting directly to your Agent (or other Agents) from a client application. Import `agents/client`, create an instance of `AgentClient` and use it to connect to an instance of your Agent:

```javascript
import { AgentClient } from "agents/client";

const connection = new AgentClient({
  agent: "dialogue-agent",
  name: "insight-seeker",
});

connection.addEventListener("message", (event) => {
  console.log("Received:", event.data);
});

connection.send(
  JSON.stringify({
    type: "inquiry",
    content: "What patterns do you see?",
  }),
);
```

### React clients

React-based applications can import `agents/react` and use the `useAgent` hook to connect to an instance of an Agent directly:

```javascript
import { useAgent } from "agents/react";

function AgentInterface() {
  const connection = useAgent({
    agent: "dialogue-agent",
    name: "insight-seeker",
    onMessage: (message) => {
      console.log("Understanding received:", message.data);
    },
    onOpen: () => console.log("Connection established"),
    onClose: () => console.log("Connection closed"),
  });

  const inquire = () => {
    connection.send(
      JSON.stringify({
        type: "inquiry",
        content: "What insights have you gathered?",
      }),
    );
  };

  return (
    <div className="agent-interface">
      <button onClick={inquire}>Seek Understanding</button>
    </div>
  );
}
```

The `useAgent` hook automatically handles the lifecycle of the connection, ensuring that it is properly initialized and cleaned up when the component mounts and unmounts. You can also combine `useAgent` with `useState` to automatically synchronize state across all clients connected to your Agent.

### Handling WebSocket events

Define `onError` and `onClose` methods on your Agent to explicitly handle WebSocket client errors and close events. Log errors, clean up state, and/or emit metrics:

```javascript
import { Agent, Connection } from "agents";

export class ChatAgent extends Agent {
  // onConnect and onMessage methods
  // ...

  // WebSocket error and disconnection (close) handling.
  async onError(connection, error) {
    console.error(`WS error: ${error}`);
  }

  async onClose(connection, code, reason, wasClean) {
    console.log(`WS closed: ${code} - ${reason} - wasClean: ${wasClean}`);
    connection.close();
  }
}
```

Source: [Using WebSockets](https://developers.cloudflare.com/agents/api-reference/websockets)

## Downloaded Example: RAG (Retrieval Augmented Generation)

Agents can use Retrieval Augmented Generation (RAG) to retrieve relevant information and use it augment calls to AI models. Store a user's chat history to use as context for future conversations, summarize documents to bootstrap an Agent's knowledge base, and/or use data from your Agent's web browsing tasks to enhance your Agent's capabilities.

You can use the Agent's own SQL database as the source of truth for your data and store embeddings in Vectorize (or any other vector-enabled database) to allow your Agent to retrieve relevant information.

### Vector search

You can query a vector index (or indexes) from any method on your Agent: any Vectorize index you attach is available on `this.env` within your Agent. If you've associated metadata with your vectors that maps back to data stored in your Agent, you can then look up the data directly within your Agent using `this.sql`.

Here's an example of how to give an Agent retrieval capabilties:

```javascript
import { Agent } from "agents";

export class RAGAgent extends Agent {
  // Other methods on our Agent
  // ...
  //
  async queryKnowledge(userQuery) {
    // Turn a query into an embedding
    const queryVector = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [userQuery],
    });

    // Retrieve results from our vector index
    let searchResults = await this.env.VECTOR_DB.query(queryVector.data[0], {
      topK: 10,
      returnMetadata: "all",
    });

    let knowledge = [];
    for (const match of searchResults.matches) {
      console.log(match.metadata);
      knowledge.push(match.metadata);
    }

    // Use the metadata to re-associate the vector search results
    // with data in our Agent's SQL database
    let results = this
      .sql`SELECT * FROM knowledge WHERE id IN (${knowledge.map((k) => k.id)})`;

    // Return them
    return results;
  }
}
```

TypeScript version:

```typescript
import { Agent } from "agents";

interface Env {
  AI: Ai;
  VECTOR_DB: Vectorize;
}

export class RAGAgent extends Agent<Env> {
  // Other methods on our Agent
  // ...
  //
  async queryKnowledge(userQuery: string) {
    // Turn a query into an embedding
    const queryVector = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [userQuery],
    });

    // Retrieve results from our vector index
    let searchResults = await this.env.VECTOR_DB.query(queryVector.data[0], {
      topK: 10,
      returnMetadata: 'all',
    });

    let knowledge = [];
    for (const match of searchResults.matches) {
      console.log(match.metadata);
      knowledge.push(match.metadata);
    }

    // Use the metadata to re-associate the vector search results
    // with data in our Agent's SQL database
    let results = this.sql`SELECT * FROM knowledge WHERE id IN (${knowledge.map((k) => k.id)})`;

    // Return them
    return results;
  }
}
```

You'll also need to connect your Agent to your vector indexes in your wrangler configuration:

```json
{
  // ...
  "vectorize": [
    {
      "binding": "VECTOR_DB",
      "index_name": "your-vectorize-index-name"
    }
  ]
  // ...
}
```

If you have multiple indexes you want to make available, you can provide an array of `vectorize` bindings.

#### Next steps

- Learn more on how to [combine Vectorize and Workers AI](https://developers.cloudflare.com/vectorize/get-started/embeddings/)
- Review the [Vectorize query API](https://developers.cloudflare.com/vectorize/reference/client-api/)
- Use [metadata filtering](https://developers.cloudflare.com/vectorize/reference/metadata-filtering/) to add context to your results

Source: [Retrieval Augmented Generation](https://developers.cloudflare.com/agents/api-reference/rag)

## Summary of Findings

After attempting to access multiple links from the Cloudflare Agents documentation, we found that most of the links in the original list were returning 404 errors. Only the Platform Limits page (https://developers.cloudflare.com/agents/platform/limits) and the Agents API page (https://developers.cloudflare.com/agents/api-reference/agents-api) were accessible from the original list.

This confirms that the Cloudflare Agents documentation structure has been reorganized since the original list of links was compiled. The information in cloudflare-agents.md appears to be more current than many of the links we attempted to access.

The current documentation structure is much more extensive and organized differently than what was reflected in the original list. The documentation now includes sections for Getting Started, Concepts, API Reference, Guides, Examples, Platform, and Model Context Protocol.

To get the most up-to-date information about Cloudflare Agents, it would be advisable to:

1. Visit the main Cloudflare Agents documentation page at https://developers.cloudflare.com/agents/
2. Use the search functionality on the Cloudflare Developers site
3. Check the GitHub repository for the Cloudflare Agents SDK at https://github.com/cloudflare/agents-starter

## Downloaded Example: MCP Tools

Model Context Protocol (MCP) tools are functions that a MCP Server provides and MCP clients can call.

When you build MCP Servers with the `@cloudflare/model-context-protocol` package, you can define tools the same way as shown in the `@modelcontextprotocol/typescript-sdk` package's examples.

For example, the following code from this example MCP server defines a simple MCP server that adds two numbers together:

JavaScript:
```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { McpAgent } from "agents/mcp";

export class MyMCP extends McpAgent {
  server = new McpServer({ name: "Demo", version: "1.0.0" });

  async init() {
    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      }),
    );
  }
}
```

TypeScript:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { McpAgent } from "agents/mcp";

export class MyMCP extends McpAgent {
  server = new McpServer({ name: "Demo", version: "1.0.0" });

  async init() {
    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      }),
    );
  }
}
```

Source: [MCP Tools](https://developers.cloudflare.com/agents/model-context-protocol/tools)

## Downloaded Example: MCP Transport

The Model Context Protocol (MCP) specification defines three standard transport mechanisms for communication between clients and servers:

1. **stdio, communication over standard in and standard out** — designed for local MCP connections.
2. **Server-Sent Events (SSE)** — Currently supported by most remote MCP clients, but is expected to be replaced by Streamable HTTP over time. It requires two endpoints: one for sending requests, another for receiving streamed responses.
3. **Streamable HTTP** — New transport method introduced in March 2025. It simplifies the communication by using a single HTTP endpoint for bidirectional messaging. It is currently gaining adoption among remote MCP clients, but it is expected to become the standard transport in the future.

MCP servers built with the Agents SDK can support both remote transport methods (SSE and Streamable HTTP), with the `McpAgent` class automatically handling the transport configuration.

## Implementing remote MCP transport

If you're building a new MCP server or upgrading an existing one on Cloudflare, we recommend supporting both remote transport methods (SSE and Streamable HTTP) concurrently to ensure compatibility with all MCP clients.

#### Remote MCP server (without authentication)

If you're manually configuring your MCP server, here's how to use the `McpAgent` class to handle both transport methods:

JavaScript:
```javascript
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);
    
    if (pathname.startsWith('/sse')) {
      return MyMcpAgent.serveSSE('/sse').fetch(request, env, ctx);
    }
    
    if (pathname.startsWith('/mcp')) {
      return MyMcpAgent.serve('/mcp').fetch(request, env, ctx);
    }
  },
};
```

TypeScript:
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

#### MCP Server with Authentication

If your MCP server implements authentication & authorization using the Workers OAuth Provider Library, then you can configure it to support both transport methods using the `apiHandlers` property.

```javascript
export default new OAuthProvider({
  apiHandlers: {
    '/sse': MyMCP.serveSSE('/sse'),
    '/mcp': MyMCP.serve('/mcp'),
  },
  // ... other OAuth configuration
})
```

### Upgrading an Existing Remote MCP Server

If you've already built a remote MCP server using the Cloudflare Agents SDK, make the following changes to support the new Streamable HTTP transport while maintaining compatibility with remote MCP clients using SSE:

- Use `MyMcpAgent.serveSSE('/sse')` for the existing SSE transport. Previously, this would have been `MyMcpAgent.mount('/sse')`, which has been kept as an alias.
- Add a new path with `MyMcpAgent.serve('/mcp')` to support the new Streamable HTTP transport.

If you have an MCP server with authentication/authorization using the Workers OAuth Provider, update the configuration to use the `apiHandlers` property, which replaces `apiRoute` and `apiHandler`.

With these few changes, your MCP server will support both transport methods, making it compatible with both existing and new clients.

### Testing with MCP Clients

While most MCP clients have not yet adopted the new Streamable HTTP transport, you can start testing it today using `mcp-remote`, an adapter that lets MCP clients that otherwise only support local connections work with remote MCP servers.

Follow the guide for instructions on how to connect to your remote MCP server from Claude Desktop, Cursor, Windsurf, and other local MCP clients, using the `mcp-remote` local proxy.

Source: [MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport)

## Downloaded Example: MCP Authorization

When building a Model Context Protocol (MCP) server, you need both a way to allow users to login (authentication) and allow them to grant the MCP client access to resources on their account (authorization).

The Model Context Protocol uses a subset of OAuth 2.1 for authorization. OAuth allows your users to grant limited access to resources, without them having to share API keys or other credentials.

Cloudflare provides an OAuth Provider Library that implements the provider side of the OAuth 2.1 protocol, allowing you to easily add authorization to your MCP server.

You can use the OAuth Provider Library in three ways:

1. **Your Worker handles authorization itself.** Your MCP server, running on Cloudflare, handles the complete OAuth flow.
2. **Integrate directly with a third-party OAuth provider**, such as GitHub or Google.
3. **Integrate with your own OAuth provider**, including authorization-as-a-service providers you might already rely on, such as Stytch, Auth0, or WorkOS.

### Authorization options

#### (1) Your MCP Server handles authorization and authentication itself

Your MCP Server, using the OAuth Provider Library, can handle the complete OAuth authorization flow, without any third-party involvement.

The Workers OAuth Provider Library is a Cloudflare Worker that implements a `fetch()` handler, and handles incoming requests to your MCP server.

You provide your own handlers for your MCP Server's API, and authentication and authorization logic, and URI paths for the OAuth endpoints, as shown below:

```
export default new OAuthProvider({
  apiRoute: "/mcp",
  // Your MCP server:
  apiHandler: MyMCPServer.Router,
  // Your handler for authentication and authorization:
  defaultHandler: MyAuthHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

The authorization flow in this case works like this:

```
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as MCP Client
    participant M as MCP Server (your Worker)

    C->>M: MCP Request
    M->>C: HTTP 401 Unauthorized
    Note over C: Generate code_verifier and code_challenge
    C->>B: Open browser with authorization URL + code_challenge
    B->>M: GET /authorize
    Note over M: User logs in and authorizes
    M->>B: Redirect to callback URL with auth code
    B->>C: Callback with authorization code
    C->>M: Token Request with code + code_verifier
    M->>C: Access Token (+ Refresh Token)
    C->>M: MCP Request with Access Token
    Note over C,M: Begin standard MCP message exchange
```

Remember — authentication is different from authorization. Your MCP Server can handle authorization itself, while still relying on an external authentication service to first authenticate users.

#### (2) Third-party OAuth Provider

The OAuth Provider Library can be configured to use a third-party OAuth provider, such as GitHub or Google.

When you use a third-party OAuth provider, you must provide a handler to the `OAuthProvider` that implements the OAuth flow for the third-party provider.

```
import MyAuthHandler from "./auth-handler";

export default new OAuthProvider({
  apiRoute: "/mcp",
  // Your MCP server:
  apiHandler: MyMCPServer.Router,
  // Replace this handler with your own handler for authentication and authorization with the third-party provider:
  defaultHandler: MyAuthHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

Note that as defined in the Model Context Protocol specification when you use a third-party OAuth provider, the MCP Server (your Worker) generates and issues its own token to the MCP client:

```
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as MCP Client
    participant M as MCP Server (your Worker)
    participant T as Third-Party Auth Server

    C->>M: Initial OAuth Request
    M->>B: Redirect to Third-Party /authorize
    B->>T: Authorization Request
    Note over T: User authorizes
    T->>B: Redirect to MCP Server callback
    B->>M: Authorization code
    M->>T: Exchange code for token
    T->>M: Third-party access token
    Note over M: Generate bound MCP token
    M->>B: Redirect to MCP Client callback
    B->>C: MCP authorization code
    C->>M: Exchange code for token
    M->>C: MCP access token
```

#### (3) Bring your own OAuth Provider

If your application already implements an Oauth Provider itself, or you use Stytch, Auth0, WorkOS, or authorization-as-a-service provider, you can use this in the same way that you would use a third-party OAuth provider.

You can use the auth provider to:

- Allow users to authenticate to your MCP server through email, social logins, SSO (single sign-on), and MFA (multi-factor authentication).
- Define scopes and permissions that directly map to your MCP tools.
- Present users with a consent page corresponding with the requested permissions.
- Enforce the permissions so that agents can only invoke permitted tools.

### Using Authentication Context in Your MCP Server

When a user authenticates to your MCP server through Cloudflare's OAuth Provider, their identity information and tokens are made available through the `props` parameter.

```
export class MyMCP extends McpAgent<Env, unknown, AuthContext> {
  async init() {
    this.server.tool("userInfo", "Get user information", {}, async () => ({
      content: [{ type: "text", text: `Hello, ${this.props.claims.name || "user"}!` }],
    }));
  }
}
```

The authentication context can be used for:

- Accessing user-specific data by using the user ID (this.props.claims.sub) as a key
- Checking user permissions before performing operations
- Customizing responses based on user preferences or attributes
- Using authentication tokens to make requests to external services on behalf of the user
- Ensuring consistency when users interact with your application through different interfaces (dashboard, API, MCP server)

### Implementing Permission-Based Access for MCP Tools

You can implement fine-grained authorization controls for your MCP tools based on user permissions. This allows you to restrict access to certain tools based on the user's role or specific permissions.

```
// Create a wrapper function to check permissions
function requirePermission(permission, handler) {
  return async (request, context) => {
    // Check if user has the required permission
    const userPermissions = context.props.permissions || [];
    if (!userPermissions.includes(permission)) {
      return {
        content: [{ type: "text", text: `Permission denied: requires ${permission}` }],
        status: 403
      };
    }
    // If permission check passes, execute the handler
    return handler(request, context);
  };
}

// Use the wrapper with your MCP tools
async init() {
  // Basic tools available to all authenticated users
  this.server.tool("basicTool", "Available to all users", {}, async () => {
    // Implementation for all users
  });

  // Protected tool using the permission wrapper
  this.server.tool(
    "adminAction",
    "Administrative action requiring special permission",
    { /* parameters */ },
    requirePermission("admin", async (req) => {
      // Only executes if user has "admin" permission
      return {
        content: [{ type: "text", text: "Admin action completed" }]
      };
    })
  );

  // Conditionally register tools based on user permissions
  if (this.props.permissions?.includes("special_feature")) {
    this.server.tool("specialTool", "Special feature", {}, async () => {
      // This tool only appears for users with the special_feature permission
    });
  }
}
```

Benefits:

- Authorization check at the tool level ensures proper access control
- Allows you to define permission checks once and reuse them across tools
- Provides clear feedback to users when permission is denied
- Can choose to only present tools that the agent is able to call

Source: [MCP Authorization](https://developers.cloudflare.com/agents/model-context-protocol/authorization)

## Downloaded Example: MCP Agent API

When you build MCP Servers on Cloudflare, you extend the `McpAgent` class from the Agents SDK, like this:

```javascript
import { McpAgent } from "agents/mcp";
import { DurableMCP } from "@cloudflare/model-context-protocol";

export class MyMCP extends McpAgent {
  server = new McpServer({ name: "Demo", version: "1.0.0" });

  async init() {
    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      }),
    );
  }
}
```

This means that each instance of your MCP server has its own durable state, backed by a Durable Object, with its own SQL database.

Your MCP server doesn't necessarily have to be an Agent. You can build MCP servers that are stateless, and just add tools to your MCP server using the `@modelcontextprotocol/typescript-sdk` package.

But if you want your MCP server to:
- remember previous tool calls, and responses it provided
- provide a game to the MCP client, remembering the state of the game board, previous moves, and the score
- cache the state of a previous external API call, so that subsequent tool calls can reuse it
- do anything that an Agent can do, but allow MCP clients to communicate with it

You can use the APIs below in order to do so.

#### Hibernation Support

`McpAgent` instances automatically support WebSockets Hibernation, allowing stateful MCP servers to sleep during inactive periods while preserving their state. This means your agents only consume compute resources when actively processing requests, optimizing costs while maintaining the full context and conversation history.

### State synchronization APIs

The `McpAgent` class makes the following subset of methods from the Agents SDK available:

- `state`
- `initialState`
- `setState`
- `onStateUpdate`
- `sql`

For example, the following code implements an MCP server that remembers a counter value, and updates the counter when the `add` tool is called:

```javascript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Demo",
    version: "1.0.0",
  });

  initialState = {
    counter: 1,
  };

  async init() {
    this.server.resource(`counter`, `mcp://resource/counter`, (uri) => {
      return {
        contents: [{ uri: uri.href, text: String(this.state.counter) }],
      };
    });

    this.server.tool(
      "add",
      "Add to the counter, stored in the MCP",
      { a: z.number() },
      async ({ a }) => {
        this.setState({ ...this.state, counter: this.state.counter + a });
        return {
          content: [
            {
              type: "text",
              text: String(`Added ${a}, total is now ${this.state.counter}`),
            },
          ],
        };
      },
    );
  }

  onStateUpdate(state) {
    console.log({ stateUpdate: state });
  }
}
```

TypeScript version:

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type State = { counter: number };

export class MyMCP extends McpAgent<Env, State, {}> {
  server = new McpServer({
    name: "Demo",
    version: "1.0.0",
  });

  initialState: State = {
    counter: 1,
  };

  async init() {
    this.server.resource(`counter`, `mcp://resource/counter`, (uri) => {
      return {
        contents: [{ uri: uri.href, text: String(this.state.counter) }],
      };
    });

    this.server.tool(
      "add",
      "Add to the counter, stored in the MCP",
      { a: z.number() },
      async ({ a }) => {
        this.setState({ ...this.state, counter: this.state.counter + a });
        return {
          content: [
            {
              type: "text",
              text: String(`Added ${a}, total is now ${this.state.counter}`),
            },
          ],
        };
      },
    );
  }

  onStateUpdate(state: State) {
    console.log({ stateUpdate: state });
  }
}
```

### Not yet supported APIs

The following APIs from the Agents SDK are not yet available on `McpAgent`:

- WebSocket APIs (`onMessage`, `onError`, `onClose`, `onConnect`)
- Scheduling APIs `this.schedule`

Source: [MCP Agent API](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api)

## Downloaded Example: Build a Remote MCP Server

### Deploy your first MCP server

This guide will show you how to deploy your own remote MCP server on Cloudflare, with two options:

- **Without authentication** — anyone can connect and use the server (no login required).
- **With authentication and authorization** — users sign in before accessing tools, and you can control which tools an agent can call based on the user's permissions.

You can start by deploying a public MCP server without authentication, then add user authentication and scoped authorization later.

The button below will guide you through everything you need to do to deploy this example MCP server to your Cloudflare account:

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

Once deployed, this server will be live at your workers.dev subdomain (e.g. remote-mcp-server-authless.your-account.workers.dev/sse). You can connect to it immediately using the AI Playground, MCP inspector or other MCP clients. Then, once you're ready, you can customize the MCP server and add your own tools.

If you're using the "Deploy to Cloudflare" button, a new git repository will be set up on your GitHub or GitLab account for your MCP server, configured to automatically deploy to Cloudflare each time you push a change or merge a pull request to the main branch of the repository. You can then clone this repository, develop locally, and start writing code and building.

### Set up and deploy your MCP server via CLI

Alternatively, you can use the command line as shown below to create a new MCP Server on your local machine.

```
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server
```

#### Local development

In the directory of your new project, run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Deploy your MCP server

You can deploy your MCP server to Cloudflare using the following Wrangler CLI command within the example project:

```
npx wrangler@latest deploy
```

If you have already connected a git repository to the Worker with your MCP server, you can deploy your MCP server by pushing a change or merging a pull request to the main branch of the repository.

After deploying, take the URL of your deployed MCP server, and enter it in the MCP inspector running on `http://localhost:5173`. You now have a remote MCP server, deployed to Cloudflare, that MCP clients can connect to.

### Connect your Remote MCP server to Claude and other MCP Clients via a local proxy

Now that your MCP server is running, you can use the `mcp-remote` local proxy to connect Claude Desktop or other MCP clients to it — even though these tools aren't yet _remote_ MCP clients, and don't support remote transport or authorization on the client side. This lets you test what an interaction with your MCP server will be like with a real MCP client.

Update your Claude Desktop configuration to point to the URL of your MCP server. You can use either the `localhost:8787/sse` URL, or the URL of your deployed MCP server:

```
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-name.your-account.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude Desktop after updating your config file to load the MCP Server. Once this is done, Claude will be able to make calls to your remote MCP server. You can test this by asking Claude to use one of your tools. For example: "Could you use the math tool to add 23 and 19?". Claude should invoke the tool and show the result generated by the MCP server.

## Add Authentication

Now that you've deployed a public MCP server, let's walk through how to enable user authentication using OAuth.

The public server example you deployed earlier allows any client to connect and invoke tools without logging in. To add authentication, you'll update your MCP server to act as an OAuth provider, handling secure login flows and issuing access tokens that MCP clients can use to make authenticated tool calls.

This is especially useful if users already need to log in to use your service. Once authentication is enabled, users can sign in with their existing account and grant their AI agent permission to interact with the tools exposed by your MCP server, using scoped permissions.

In this example, we use GitHub as an OAuth provider, but you can connect your MCP server with any OAuth provider that supports the OAuth 2.0 specification, including Google, Slack, Stytch, Auth0, WorkOS, and more.

### Step 1 — Create and deploy a new MCP server

Run the following command to create a new MCP server:

```
npm create cloudflare@latest -- my-mcp-server-github-auth --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server-github-auth
```

Then, run the following command to deploy the MCP server:

```
npx wrangler@latest deploy
```

You'll notice that in the example MCP server, if you open `src/index.ts`, the primary difference is that the `defaultHandler` is set to the `GitHubHandler`:

```
import GitHubHandler from "./github-handler";

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.Router,
  defaultHandler: GitHubHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

This will ensure that your users are redirected to GitHub to authenticate. To get this working though, you need to create OAuth client apps in the steps below.

### Step 2 — Create an OAuth App

You'll need to create two GitHub OAuth Apps to use GitHub as an authentication provider for your MCP server — one for local development, and one for production.

#### First create a new OAuth App for local development

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (local)`
- **Homepage URL**: `http://localhost:8787`
- **Authorization callback URL**: `http://localhost:8787/callback`

For the OAuth app you just created, add the client ID of the OAuth app as `GITHUB_CLIENT_ID` and generate a client secret, adding it as `GITHUB_CLIENT_SECRET` to a `.dev.vars` file in the root of your project, which will be used to set secrets in local development.

```
touch .dev.vars
echo 'GITHUB_CLIENT_ID="your-client-id"' >> .dev.vars
echo 'GITHUB_CLIENT_SECRET="your-client-secret"' >> .dev.vars
cat .dev.vars
```

#### Next, run your MCP server locally

Run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**:

You should be redirected to a GitHub login or authorization page. After authorizing the MCP Client (the inspector) access to your GitHub account, you will be redirected back to the inspector. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Second — create a new OAuth App for production

You'll need to repeat these steps to create a new OAuth App for production.

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (production)`
- **Homepage URL**: Enter the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev`)
- **Authorization callback URL**: Enter the `/callback` path of the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev/callback`)

For the OAuth app you just created, add the client ID and client secret, using Wrangler CLI:

```
wrangler secret put GITHUB_CLIENT_ID
```

```
wrangler secret put GITHUB_CLIENT_SECRET
```

#### Finally, connect to your MCP server

Now that you've added the ID and secret of your production OAuth app, you should now be able to connect to your MCP server running at `worker-name.account-name.workers.dev/sse` using the AI Playground, MCP inspector or other MCP clients, and authenticate with GitHub.

### Next steps

- Add tools to your MCP server.
- Customize your MCP Server's authentication and authorization.

Source: [Build a Remote MCP Server](https://developers.cloudflare.com/agents/guides/build-mcp-server)

## Downloaded Example: Remote MCP Server

### Deploy your first MCP server

This guide will show you how to deploy your own remote MCP server on Cloudflare, with two options:

- **Without authentication** — anyone can connect and use the server (no login required).
- **With authentication and authorization** — users sign in before accessing tools, and you can control which tools an agent can call based on the user's permissions.

You can start by deploying a public MCP server without authentication, then add user authentication and scoped authorization later.

The button below will guide you through everything you need to do to deploy this example MCP server to your Cloudflare account:

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

Once deployed, this server will be live at your workers.dev subdomain (e.g. remote-mcp-server-authless.your-account.workers.dev/sse). You can connect to it immediately using the AI Playground, MCP inspector or other MCP clients. Then, once you're ready, you can customize the MCP server and add your own tools.

If you're using the "Deploy to Cloudflare" button, a new git repository will be set up on your GitHub or GitLab account for your MCP server, configured to automatically deploy to Cloudflare each time you push a change or merge a pull request to the main branch of the repository. You can then clone this repository, develop locally, and start writing code and building.

### Set up and deploy your MCP server via CLI

Alternatively, you can use the command line as shown below to create a new MCP Server on your local machine.

```
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server
```

#### Local development

In the directory of your new project, run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Deploy your MCP server

You can deploy your MCP server to Cloudflare using the following Wrangler CLI command within the example project:

```
npx wrangler@latest deploy
```

If you have already connected a git repository to the Worker with your MCP server, you can deploy your MCP server by pushing a change or merging a pull request to the main branch of the repository.

After deploying, take the URL of your deployed MCP server, and enter it in the MCP inspector running on `http://localhost:5173`. You now have a remote MCP server, deployed to Cloudflare, that MCP clients can connect to.

### Connect your Remote MCP server to Claude and other MCP Clients via a local proxy

Now that your MCP server is running, you can use the `mcp-remote` local proxy to connect Claude Desktop or other MCP clients to it — even though these tools aren't yet _remote_ MCP clients, and don't support remote transport or authorization on the client side. This lets you test what an interaction with your MCP server will be like with a real MCP client.

Update your Claude Desktop configuration to point to the URL of your MCP server. You can use either the `localhost:8787/sse` URL, or the URL of your deployed MCP server:

```
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-name.your-account.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude Desktop after updating your config file to load the MCP Server. Once this is done, Claude will be able to make calls to your remote MCP server. You can test this by asking Claude to use one of your tools. For example: "Could you use the math tool to add 23 and 19?". Claude should invoke the tool and show the result generated by the MCP server.

## Add Authentication

Now that you've deployed a public MCP server, let's walk through how to enable user authentication using OAuth.

The public server example you deployed earlier allows any client to connect and invoke tools without logging in. To add authentication, you'll update your MCP server to act as an OAuth provider, handling secure login flows and issuing access tokens that MCP clients can use to make authenticated tool calls.

This is especially useful if users already need to log in to use your service. Once authentication is enabled, users can sign in with their existing account and grant their AI agent permission to interact with the tools exposed by your MCP server, using scoped permissions.

In this example, we use GitHub as an OAuth provider, but you can connect your MCP server with any OAuth provider that supports the OAuth 2.0 specification, including Google, Slack, Stytch, Auth0, WorkOS, and more.

### Step 1 — Create and deploy a new MCP server

Run the following command to create a new MCP server:

```
npm create cloudflare@latest -- my-mcp-server-github-auth --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server-github-auth
```

Then, run the following command to deploy the MCP server:

```
npx wrangler@latest deploy
```

You'll notice that in the example MCP server, if you open `src/index.ts`, the primary difference is that the `defaultHandler` is set to the `GitHubHandler`:

```
import GitHubHandler from "./github-handler";

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.Router,
  defaultHandler: GitHubHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

This will ensure that your users are redirected to GitHub to authenticate. To get this working though, you need to create OAuth client apps in the steps below.

### Step 2 — Create an OAuth App

You'll need to create two GitHub OAuth Apps to use GitHub as an authentication provider for your MCP server — one for local development, and one for production.

#### First create a new OAuth App for local development

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (local)`
- **Homepage URL**: `http://localhost:8787`
- **Authorization callback URL**: `http://localhost:8787/callback`

For the OAuth app you just created, add the client ID of the OAuth app as `GITHUB_CLIENT_ID` and generate a client secret, adding it as `GITHUB_CLIENT_SECRET` to a `.dev.vars` file in the root of your project, which will be used to set secrets in local development.

```
touch .dev.vars
echo 'GITHUB_CLIENT_ID="your-client-id"' >> .dev.vars
echo 'GITHUB_CLIENT_SECRET="your-client-secret"' >> .dev.vars
cat .dev.vars
```

#### Next, run your MCP server locally

Run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**:

You should be redirected to a GitHub login or authorization page. After authorizing the MCP Client (the inspector) access to your GitHub account, you will be redirected back to the inspector. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Second — create a new OAuth App for production

You'll need to repeat these steps to create a new OAuth App for production.

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (production)`
- **Homepage URL**: Enter the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev`)
- **Authorization callback URL**: Enter the `/callback` path of the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev/callback`)

For the OAuth app you just created, add the client ID and client secret, using Wrangler CLI:

```
wrangler secret put GITHUB_CLIENT_ID
```

```
wrangler secret put GITHUB_CLIENT_SECRET
```

#### Finally, connect to your MCP server

Now that you've added the ID and secret of your production OAuth app, you should now be able to connect to your MCP server running at `worker-name.account-name.workers.dev/sse` using the AI Playground, MCP inspector or other MCP clients, and authenticate with GitHub.

### Next steps

- Add tools to your MCP server.
- Customize your MCP Server's authentication and authorization.

Source: [Remote MCP Server](https://developers.cloudflare.com/agents/guides/remote-mcp-server)

## Downloaded Example: Test Remote MCP Server

Remote, authorized connections are an evolving part of the Model Context Protocol (MCP) specification. Not all MCP clients support remote connections yet.

This guide will show you options for how to start using your remote MCP server with MCP clients that support remote connections. If you haven't yet created and deployed a remote MCP server, you should follow the Build a Remote MCP Server guide first.

### The Model Context Protocol (MCP) inspector

The `@modelcontextprotocol/inspector` package is a visual testing tool for MCP servers.

You can run it locally by running the following command:

```
npx @modelcontextprotocol/inspector
```

Then, enter the URL of your remote MCP server. You can use an MCP server running on your local machine on localhost, or you can use a remote MCP server running on Cloudflare.

Once you have authenticated, you will be redirected back to the inspector. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

### Connect your remote MCP server to Claude Desktop via a local proxy

Even though Claude Desktop doesn't yet support remote MCP clients, you can use the `mcp-remote` local proxy to connect it to your remote MCP server. This lets you to test what an interaction with your remote MCP server will be like with a real-world MCP client.

1. Open Claude Desktop and navigate to Settings -> Developer -> Edit Config. This opens the configuration file that controls which MCP servers Claude can access.
2. Replace the content with a configuration like this:

```
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": ["mcp-remote", "http://my-mcp-server.my-account.workers.dev/sse"]
    }
  }
}
```

This tells Claude to communicate with your MCP server running at `http://localhost:8787/sse`.

3. Save the file and restart Claude Desktop (command/ctrl + R). When Claude restarts, a browser window will open showing your OAuth login page. Complete the authorization flow to grant Claude access to your MCP server.

Once authenticated, you'll be able to see your tools by clicking the tools icon in the bottom right corner of Claude's interface.

### Connect your remote MCP server to Cursor

To connect Cursor with your remote MCP server, choose `Type`: "Command" and in the `Command` field, combine the command and args fields into one (e.g. `npx mcp-remote https://your-worker-name.your-account.workers.dev/sse`).

### Connect your remote MCP server to Windsurf

You can connect your remote MCP server to Windsurf by editing the `mcp_config.json` file, and adding the following configuration:

```
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": ["mcp-remote", "http://my-mcp-server.my-account.workers.dev/sse"]
    }
  }
}
```

Source: [Test Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server)

## Downloaded Example: Schedule Tasks

An Agent can schedule tasks to be run in the future by calling `this.schedule(when, callback, data)`, where `when` can be a delay, a `Date`, or a cron string; `callback` the function name to call, and `data` is an object of data to pass to the function.

Scheduled tasks can do anything a request or message from a user can: make requests, query databases, send emails, read+write state: scheduled tasks can invoke any regular method on your Agent.

### Scheduling tasks

You can call `this.schedule` within any method on an Agent, and schedule tens-of-thousands of tasks per individual Agent:

```javascript
import { Agent } from "agents";

export class SchedulingAgent extends Agent {
  async onRequest(request) {
    // Handle an incoming request
    // Schedule a task 5 minutes from now
    // Calls the "checkFlights" method
    let { taskId } = await this.schedule(600, "checkFlights", {
      flight: "DL264",
      date: "2025-02-23",
    });

    return Response.json({ taskId });
  }

  async checkFlights(data) {
    // Invoked when our scheduled task runs
    // We can also call this.schedule here to schedule another task
  }
}
```

You can schedule tasks in multiple ways:

```javascript
// schedule a task to run in 10 seconds
let task = await this.schedule(10, "someTask", { message: "hello" });

// schedule a task to run at a specific date
let task = await this.schedule(new Date("2025-01-01"), "someTask", {});

// schedule a task to run every 10 seconds
let { id } = await this.schedule("*/10 * * * *", "someTask", {
  message: "hello",
});

// schedule a task to run every 10 seconds, but only on Mondays
let task = await this.schedule("0 0 * * 1", "someTask", { message: "hello" });

// cancel a scheduled task
this.cancelSchedule(task.id);
```

Calling `await this.schedule` returns a `Schedule`, which includes the task's randomly generated `id`. You can use this `id` to retrieve or cancel the task in the future. It also provides a `type` property that indicates the type of schedule, for example, one of `"scheduled" | "delayed" | "cron"`.

### Managing scheduled tasks

You can get, cancel and filter across scheduled tasks within an Agent using the scheduling API:

```javascript
// Get a specific schedule by ID
// Returns undefined if the task does not exist
let task = await this.getSchedule(task.id);

// Get all scheduled tasks
// Returns an array of Schedule objects
let tasks = this.getSchedules();

// Cancel a task by its ID
// Returns true if the task was cancelled, false if it did not exist
await this.cancelSchedule(task.id);

// Filter for specific tasks
// e.g. all tasks starting in the next hour
let tasks = this.getSchedules({
  timeRange: {
    start: new Date(Date.now()),
    end: new Date(Date.now() + 60 * 60 * 1000),
  },
});
```

Source: [Schedule Tasks](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/)

## Downloaded Example: Run Workflows

Agents can trigger asynchronous Workflows, allowing your Agent to run complex, multi-step tasks in the background. This can include post-processing files that a user has uploaded, updating the embeddings in a vector database, and/or managing long-running user-lifecycle email or SMS notification workflows.

Because an Agent is just like a Worker script, it can create Workflows defined in the same project (script) as the Agent _or_ in a different project.

### Trigger a Workflow

An Agent can trigger one or more Workflows from within any method, whether from an incoming HTTP request, a WebSocket connection, on a delay or schedule, and/or from any other action the Agent takes.

Triggering a Workflow from an Agent is no different from triggering a Workflow from a Worker script:

```javascript
export class MyAgent extends Agent {
  async onRequest(request) {
    let userId = request.headers.get("user-id");
    
    // Trigger a schedule that runs a Workflow
    // Pass it a payload
    let { taskId } = await this.schedule(300, "runWorkflow", {
      id: userId,
      flight: "DL264",
      date: "2025-02-23",
    });
  }

  async runWorkflow(data) {
    let instance = await env.MY_WORKFLOW.create({
      id: data.id,
      params: data,
    });

    // Schedule another task that checks the Workflow status every 5 minutes...
    await this.schedule("*/5 * * * *", "checkWorkflowStatus", {
      id: instance.id,
    });
  }
}

export class MyWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    // Your Workflow code here
  }
}
```

You'll also need to make sure your Agent has a binding to your Workflow so that it can call it:

```json
{
  // ...
  // Create a binding between your Agent and your Workflow
  "workflows": [
    {
      // Required:
      "name": "EMAIL_WORKFLOW",
      "class_name": "MyWorkflow",
      // Optional: set the script_name field if your Workflow is defined in a
      // different project from your Agent
      "script_name": "email-workflows"
    }
  ],
  // ...
}
```

### Trigger a Workflow from another project

You can also call a Workflow that is defined in a different Workers script from your Agent by setting the `script_name` property in the `workflows` binding of your Agent:

```json
{
    // Required:
    "name": "EMAIL_WORKFLOW",
    "class_name": "MyWorkflow",
    // Optional: set tthe script_name field if your Workflow is defined in a
    // different project from your Agent
    "script_name": "email-workflows"
}
```

Refer to the [cross-script calls](https://developers.cloudflare.com/workflows/build/workers-api/#cross-script-calls) section of the Workflows documentation for more examples.

Source: [Run Workflows](https://developers.cloudflare.com/agents/examples/run-workflows)

## Downloaded Example: Build MCP Server

### Deploy your first MCP server

This guide will show you how to deploy your own remote MCP server on Cloudflare, with two options:

- **Without authentication** — anyone can connect and use the server (no login required).
- **With authentication and authorization** — users sign in before accessing tools, and you can control which tools an agent can call based on the user's permissions.

You can start by deploying a public MCP server without authentication, then add user authentication and scoped authorization later.

The button below will guide you through everything you need to do to deploy this example MCP server to your Cloudflare account:

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

Once deployed, this server will be live at your workers.dev subdomain (e.g. remote-mcp-server-authless.your-account.workers.dev/sse). You can connect to it immediately using the AI Playground, MCP inspector or other MCP clients. Then, once you're ready, you can customize the MCP server and add your own tools.

If you're using the "Deploy to Cloudflare" button, a new git repository will be set up on your GitHub or GitLab account for your MCP server, configured to automatically deploy to Cloudflare each time you push a change or merge a pull request to the main branch of the repository. You can then clone this repository, develop locally, and start writing code and building.

### Set up and deploy your MCP server via CLI

Alternatively, you can use the command line as shown below to create a new MCP Server on your local machine.

```
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server
```

#### Local development

In the directory of your new project, run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Deploy your MCP server

You can deploy your MCP server to Cloudflare using the following Wrangler CLI command within the example project:

```
npx wrangler@latest deploy
```

If you have already connected a git repository to the Worker with your MCP server, you can deploy your MCP server by pushing a change or merging a pull request to the main branch of the repository.

After deploying, take the URL of your deployed MCP server, and enter it in the MCP inspector running on `http://localhost:5173`. You now have a remote MCP server, deployed to Cloudflare, that MCP clients can connect to.

### Connect your Remote MCP server to Claude and other MCP Clients via a local proxy

Now that your MCP server is running, you can use the `mcp-remote` local proxy to connect Claude Desktop or other MCP clients to it — even though these tools aren't yet _remote_ MCP clients, and don't support remote transport or authorization on the client side. This lets you test what an interaction with your MCP server will be like with a real MCP client.

Update your Claude Desktop configuration to point to the URL of your MCP server. You can use either the `localhost:8787/sse` URL, or the URL of your deployed MCP server:

```
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-name.your-account.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude Desktop after updating your config file to load the MCP Server. Once this is done, Claude will be able to make calls to your remote MCP server. You can test this by asking Claude to use one of your tools. For example: "Could you use the math tool to add 23 and 19?". Claude should invoke the tool and show the result generated by the MCP server.

## Add Authentication

Now that you've deployed a public MCP server, let's walk through how to enable user authentication using OAuth.

The public server example you deployed earlier allows any client to connect and invoke tools without logging in. To add authentication, you'll update your MCP server to act as an OAuth provider, handling secure login flows and issuing access tokens that MCP clients can use to make authenticated tool calls.

This is especially useful if users already need to log in to use your service. Once authentication is enabled, users can sign in with their existing account and grant their AI agent permission to interact with the tools exposed by your MCP server, using scoped permissions.

In this example, we use GitHub as an OAuth provider, but you can connect your MCP server with any OAuth provider that supports the OAuth 2.0 specification, including Google, Slack, Stytch, Auth0, WorkOS, and more.

### Step 1 — Create and deploy a new MCP server

Run the following command to create a new MCP server:

```
npm create cloudflare@latest -- my-mcp-server-github-auth --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

Now, you have the MCP server setup, with dependencies installed. Move into that project folder:

```
cd my-mcp-server-github-auth
```

Then, run the following command to deploy the MCP server:

```
npx wrangler@latest deploy
```

You'll notice that in the example MCP server, if you open `src/index.ts`, the primary difference is that the `defaultHandler` is set to the `GitHubHandler`:

```
import GitHubHandler from "./github-handler";

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.Router,
  defaultHandler: GitHubHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

This will ensure that your users are redirected to GitHub to authenticate. To get this working though, you need to create OAuth client apps in the steps below.

### Step 2 — Create an OAuth App

You'll need to create two GitHub OAuth Apps to use GitHub as an authentication provider for your MCP server — one for local development, and one for production.

#### First create a new OAuth App for local development

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (local)`
- **Homepage URL**: `http://localhost:8787`
- **Authorization callback URL**: `http://localhost:8787/callback`

For the OAuth app you just created, add the client ID of the OAuth app as `GITHUB_CLIENT_ID` and generate a client secret, adding it as `GITHUB_CLIENT_SECRET` to a `.dev.vars` file in the root of your project, which will be used to set secrets in local development.

```
touch .dev.vars
echo 'GITHUB_CLIENT_ID="your-client-id"' >> .dev.vars
echo 'GITHUB_CLIENT_SECRET="your-client-secret"' >> .dev.vars
cat .dev.vars
```

#### Next, run your MCP server locally

Run the following command to start the development server:

```
npm start
```

Your MCP server is now running on `http://localhost:8787/sse`.

In a new terminal, run the MCP inspector. The MCP inspector is an interactive MCP client that allows you to connect to your MCP server and invoke tools from a web browser.

```
npx @modelcontextprotocol/inspector@latest
```

Open the MCP inspector in your web browser:

```
open http://localhost:5173
```

In the inspector, enter the URL of your MCP server, `http://localhost:8787/sse`, and click **Connect**:

You should be redirected to a GitHub login or authorization page. After authorizing the MCP Client (the inspector) access to your GitHub account, you will be redirected back to the inspector. You should see the "List Tools" button, which will list the tools that your MCP server exposes.

#### Second — create a new OAuth App for production

You'll need to repeat these steps to create a new OAuth App for production.

Navigate to github.com/settings/developers to create a new OAuth App with the following settings:

- **Application name**: `My MCP Server (production)`
- **Homepage URL**: Enter the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev`)
- **Authorization callback URL**: Enter the `/callback` path of the workers.dev URL of your deployed MCP server (ex: `worker-name.account-name.workers.dev/callback`)

For the OAuth app you just created, add the client ID and client secret, using Wrangler CLI:

```
wrangler secret put GITHUB_CLIENT_ID
```

```
wrangler secret put GITHUB_CLIENT_SECRET
```

#### Finally, connect to your MCP server

Now that you've added the ID and secret of your production OAuth app, you should now be able to connect to your MCP server running at `worker-name.account-name.workers.dev/sse` using the AI Playground, MCP inspector or other MCP clients, and authenticate with GitHub.

### Next steps

- Add tools to your MCP server.
- Customize your MCP Server's authentication and authorization.

Source: [Build MCP Server](https://developers.cloudflare.com/agents/examples/build-mcp-server)

## Downloaded Example: Browse the Web

Agents can browse the web using the Browser Rendering API or your preferred headless browser service.

### Browser Rendering API

The Browser Rendering allows you to spin up headless browser instances, render web pages, and interact with websites through your Agent.

You can define a method that uses Puppeteer to pull the content of a web page, parse the DOM, and extract relevant information by calling the OpenAI model:

```javascript
export class MyAgent extends Agent {
  async browse(browserInstance, urls) {
    let responses = [];
    for (const url of urls) {
      const browser = await puppeteer.launch(browserInstance);
      const page = await browser.newPage();
      await page.goto(url);
      await page.waitForSelector("body");
      const bodyContent = await page.$eval(
        "body",
        (element) => element.innerHTML,
      );
      
      const client = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
      
      let resp = await client.chat.completions.create({
        model: this.env.MODEL,
        messages: [
          {
            role: "user",
            content: `Return a JSON object with the product names, prices and URLs with the following format: { "name": "Product Name", "price": "Price", "url": "URL" } from the website content below. <content>${bodyContent}</content>`,
          },
        ],
        response_format: {
          type: "json_object",
        },
      });
      
      responses.push(resp);
      await browser.close();
    }
    return responses;
  }
}
```

You'll also need to add install the `@cloudflare/puppeteer` package and add the following to the wrangler configuration of your Agent:

```
npm install @cloudflare/puppeteer --save-dev
```

```json
{
  // ...
  "browser": {
    "binding": "MYBROWSER"
  }
  // ...
}
```

### Browserbase

You can also use Browserbase by using the Browserbase API directly from within your Agent.

Once you have your Browserbase API key, you can add it to your Agent by creating a secret:

```
cd your-agent-project-folder
npx wrangler@latest secret put BROWSERBASE_API_KEY
```

```
Enter a secret value: ******
Creating the secret for the Worker "agents-example"
Success! Uploaded secret BROWSERBASE_API_KEY
```

Install the `@cloudflare/puppeteer` package and use it from within your Agent to call the Browserbase API:

```
npm install @cloudflare/puppeteer
```

```javascript
export class MyAgent extends Agent {
  constructor(env) {
    super(env);
  }
}
```

Source: [Browse the Web](https://developers.cloudflare.com/agents/examples/browse-the-web)

## Downloaded Example: Using AI Models

Agents can communicate with AI models hosted on any provider, including:

- Workers AI
- The AI SDK
- OpenAI
- Anthropic
- Google's Gemini

You can also use the model routing features in AI Gateway to route across providers, eval responses, and manage AI provider rate limits.

Because Agents are built on top of Durable Objects, each Agent or chat session is associated with a stateful compute instance. Traditional serverless architectures often present challenges for persistent connections needed in real-time applications like chat.

A user can disconnect during a long-running response from a modern reasoning model (such as `o3-mini` or DeepSeek R1), or lose conversational context when refreshing the browser. Instead of relying on request-response patterns and managing an external database to track & store conversation state, state can be stored directly within the Agent. If a client disconnects, the Agent can write to its own distributed storage, and catch the client up as soon as it reconnects: even if it's hours or days later.

### Calling AI Models

You can call models from any method within an Agent, including from HTTP requests using the `onRequest` handler, when a scheduled task runs, when handling a WebSocket message in the `onMessage` handler, or from any of your own methods.

Importantly, Agents can call AI models on their own — autonomously — and can handle long-running responses that can take minutes (or longer) to respond in full.

### Long-running model requests

Modern reasoning models or "thinking" model can take some time to both generate a response _and_ stream the response back to the client.

Instead of buffering the entire response, or risking the client disconecting, you can stream the response back to the client by using the WebSocket API.

```javascript
import { Agent } from "agents";
import { OpenAI } from "openai";

export class MyAgent extends Agent {
  async onConnect(connection, ctx) {
    //
  }

  async onMessage(connection, message) {
    let msg = JSON.parse(message);
    // This can run as long as it needs to, and return as many messages as it needs to!
    await queryReasoningModel(connection, msg.prompt);
  }

  async queryReasoningModel(connection, userPrompt) {
    const client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    try {
      const stream = await client.chat.completions.create({
        model: this.env.MODEL || "o3-mini",
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      });

      // Stream responses back as WebSocket messages
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          connection.send(JSON.stringify({ type: "chunk", content }));
        }
      }

      // Send completion message
      connection.send(JSON.stringify({ type: "done" }));
    } catch (error) {
      connection.send(JSON.stringify({ type: "error", error: error }));
    }
  }
}
```

You can also persist AI model responses back to Agent's internal state by using the `this.setState` method. For example, if you run a scheduled task, you can store the output of the task and read it later. Or, if a user disconnects, read the message history back and send it to the user when they reconnect.

### Workers AI

### Hosted models

You can use any of the models available in Workers AI within your Agent by configuring a binding.

Workers AI supports streaming responses out-of-the-box by setting `stream: true`, and we strongly recommend using them to avoid buffering and delaying responses, especially for larger models or reasoning models that require more time to generate a response.

```javascript
import { Agent } from "agents";

export class MyAgent extends Agent {
  async onRequest(request) {
    const response = await env.AI.run(
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      {
        prompt: "Build me a Cloudflare Worker that returns JSON.",
        stream: true, // Stream a response and don't block the client!
      },
    );

    // Return the stream
    return new Response(answer, {
      headers: { "content-type": "text/event-stream" },
    });
  }
}
```

Your wrangler configuration will need an `ai` binding added:

```json
{
  "ai": {
    "binding": "AI"
  }
}
```

### Model routing

You can also use the model routing features in AI Gateway directly from an Agent by specifying a `gateway` configuration when calling the AI binding.

```javascript
import { Agent } from "agents";

export class MyAgent extends Agent {
  async onRequest(request) {
    const response = await env.AI.run(
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      {
        prompt: "Build me a Cloudflare Worker that returns JSON.",
      },
      {
        gateway: {
          id: "{gateway_id}", // Specify your AI Gateway ID here
          skipCache: false,
          cacheTtl: 3360,
        },
      },
    );

    return Response.json(response);
  }
}
```

Your wrangler configuration will need an `ai` binding added. This is shared across both Workers AI and AI Gateway.

```json
{
  "ai": {
    "binding": "AI"
  }
}
```

Visit the AI Gateway documentation to learn how to configure a gateway and retrieve a gateway ID.

### AI SDK

The AI SDK provides a unified API for using AI models, including for text generation, tool calling, structured responses, image generation, and more.

To use the AI SDK, install the `ai` package and use it within your Agent. The example below shows how it use it to generate text on request, but you can use it from any method within your Agent, including WebSocket handlers, as part of a scheduled task, or even when the Agent is initialized.

```
npm install ai @ai-sdk/openai
```

```javascript
import { Agent } from "agents";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export class MyAgent extends Agent {
  async onRequest(request) {
    const { text } = await generateText({
      model: openai("o3-mini"),
      prompt: "Build me an AI agent on Cloudflare Workers",
    });

    return Response.json({ modelResponse: text });
  }
}
```

### OpenAI compatible endpoints

Agents can call models across any service, including those that support the OpenAI API. For example, you can use the OpenAI SDK to use one of Google's Gemini models directly from your Agent.

Agents can stream responses back over HTTP using Server Sent Events (SSE) from within an `onRequest` handler, or by using the native WebSockets API in your Agent to responses back to a client, which is especially useful for larger models that can take over 30+ seconds to reply.

```javascript
import { Agent } from "agents";
import { OpenAI } from "openai";

export class MyAgent extends Agent {
  async onRequest(request) {
    const openai = new OpenAI({
      apiKey: this.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    // Create a TransformStream to handle streaming data
    let { readable, writable } = new TransformStream();
    let writer = writable.getWriter();
    const textEncoder = new TextEncoder();

    // Use ctx.waitUntil to run the async function in the background
    // so that it doesn't block the streaming response
    ctx.waitUntil(
      (async () => {
        const stream = await openai.chat.completions.create({
          model: "4o",
          messages: [
            { role: "user", content: "Write me a Cloudflare Worker." },
          ],
          stream: true,
        });

        // loop over the data as it is streamed and write to the writeable
        for await (const part of stream) {
          writer.write(
            textEncoder.encode(part.choices[0]?.delta?.content || ""),
          );
        }

        writer.close();
      })(),
    );

    // Return the readable stream back to the client
    return new Response(readable);
  }
}
```

Source: [Using AI Models](https://developers.cloudflare.com/agents/examples/using-ai-models)

## Downloaded Example: Manage and Sync State

Every Agent has built-in state management capabilities, including built-in storage and synchronization between the Agent and frontend applications.

State within an Agent is:

- Persisted across Agent restarts: data is permanently stored within an Agent.
- Automatically serialized/deserialized: you can store any JSON-serializable data.
- Immediately consistent within the Agent: read your own writes.
- Thread-safe for concurrent updates
- Fast: state is colocated wherever the Agent is running. Reads and writes do not need to traverse the network.

Agent state is stored in a SQL database that is embedded within each individual Agent instance: you can interact with it using the higher-level `this.setState` API (recommended), which allows you to sync state and trigger events on state changes, or by directly querying the database with `this.sql`.

### State API

Every Agent has built-in state management capabilities. You can set and update the Agent's state directly using `this.setState`:

```javascript
import { Agent } from "agents";

export class MyAgent extends Agent {
  // Update state in response to events
  async incrementCounter() {
    this.setState({
      ...this.state,
      counter: this.state.counter + 1,
    });
  }

  // Handle incoming messages
  async onMessage(message) {
    if (message.type === "update") {
      this.setState({
        ...this.state,
        ...message.data,
      });
    }
  }

  // Handle state updates
  onStateUpdate(state, source) {
    console.log("state updated", state);
  }
}
```

If you're using TypeScript, you can also provide a type for your Agent's state by passing in a type as a type parameter as the _second_ type parameter to the `Agent` class definition.

```typescript
import { Agent } from "agents";

interface Env {}

// Define a type for your Agent's state
interface FlightRecord {
  id: string;
  departureIata: string;
  arrival: Date;
  arrivalIata: string;
  price: number;
}

// Pass in the type of your Agent's state
export class MyAgent extends Agent<Env, FlightRecord> {
  // This allows this.setState and the onStateUpdate method to
  // be typed:
   async onStateUpdate(state: FlightRecord) {
    console.log("state updated", state);
  }

  async someOtherMethod() {
    this.setState({
      ...this.state,
      price: this.state.price + 10,
    });
  }
}
```

### Set the initial state for an Agent

You can also set the initial state for an Agent via the `initialState` property on the `Agent` class:

```javascript
class MyAgent extends Agent {
  // Set a default, initial state
  initialState = {
    counter: 0,
    text: "",
    color: "#3B82F6",
  };

  doSomething() {
    console.log(this.state); // {counter: 0, text: "", color: "#3B82F6"}, if you haven't set the state yet
  }
}
```

Any initial state is synced to clients connecting via the `useAgent` hook.

### Synchronizing state

Clients can connect to an Agent and stay synchronized with its state using the React hooks provided as part of `agents/react`.

A React application can call `useAgent` to connect to a named Agent over WebSockets:

```javascript
import { useState } from "react";
import { useAgent } from "agents/react";

function StateInterface() {
  const [state, setState] = useState({ counter: 0 });

  const agent = useAgent({
    agent: "thinking-agent",
    name: "my-agent",
    onStateUpdate: (newState) => setState(newState),
  });

  const increment = () => {
    agent.setState({ counter: state.counter + 1 });
  };

  return (
    <div>
      <div>Count: {state.counter}</div>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

The state synchronization system:

- Automatically syncs the Agent's state to all connected clients
- Handles client disconnections and reconnections gracefully
- Provides immediate local updates
- Supports multiple simultaneous client connections

Common use cases:

- Real-time collaborative features
- Multi-window/tab synchronization
- Live updates across multiple devices
- Maintaining consistent UI state across clients
- When new clients connect, they automatically receive the current state from the Agent, ensuring all clients start with the latest data.

### SQL API

Every individual Agent instance has its own SQL (SQLite) database that runs _within the same context_ as the Agent itself. This means that inserting or querying data within your Agent is effectively zero-latency: the Agent doesn't have to round-trip across a continent or the world to access its own data.

You can access the SQL API within any method on an Agent via `this.sql`. The SQL API accepts template literals:

```javascript
export class MyAgent extends Agent {
  async onRequest(request) {
    let userId = new URL(request.url).searchParams.get("userId");

    // 'users' is just an example here: you can create arbitrary tables and define your own schemas
    // within each Agent's database using SQL (SQLite syntax).
    let user = await this.sql`SELECT * FROM users WHERE id = ${userId}`;

    return Response.json(user);
  }
}
```

You can also supply a TypeScript type argument to the query, which will be used to infer the type of the result:

```typescript
type User = {
  id: string;
  name: string;
  email: string;
};

export class MyAgent extends Agent<Env> {
  async onRequest(request: Request) {
    let userId = new URL(request.url).searchParams.get('userId');

    // Supply the type paramter to the query when calling this.sql
    // This assumes the results returns one or more User rows with "id", "name", and "email" columns
    const user = await this.sql<User>`SELECT * FROM users WHERE id = ${userId}`;

    return Response.json(user)
  }
}
```

You do not need to specify an array type (`User[]` or `Array<User>`) as `this.sql` will always return an array of the specified type.

The SQL API exposed to an Agent is similar to the one within Durable Objects: Durable Object SQL methods available on `this.ctx.storage.sql`. You can use the same SQL queries with the Agent's database, create tables, and query data, just as you would with Durable Objects or D1.

### Use Agent state as model context

You can combine the state and SQL APIs in your Agent with its ability to call AI models to include historical context within your prompts to a model. Modern Large Language Models (LLMs) often have very large context windows (up to millions of tokens), which allows you to pull relevant context into your prompt directly.

For example, you can use an Agent's built-in SQL database to pull history, query a model with it, and append to that history ahead of the next call to the model:

```javascript
export class ReasoningAgent extends Agent {
  async callReasoningModel(prompt) {
    let result = this
      .sql`SELECT * FROM history WHERE user = ${prompt.userId} ORDER BY timestamp DESC LIMIT 1000`;
    let context = [];
    for await (const row of result) {
      context.push(row.entry);
    }

    const client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    // Combine user history with the current prompt
    const systemPrompt = prompt.system || "You are a helpful assistant.";
    const userPrompt = `${prompt.user}\n\nUser history:\n${context.join("\n")}`;

    try {
      const completion = await client.chat.completions.create({
        model: this.env.MODEL || "o3-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Store the response in history
      this
        .sql`INSERT INTO history (timestamp, user, entry) VALUES (${new Date()}, ${prompt.userId}, ${completion.choices[0].message.content})`;

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error calling reasoning model:", error);
      throw error;
    }
  }
}
```

This works because each instance of an Agent has its _own_ database, the state stored in that database is private to that Agent: whether it's acting on behalf of a single user, a room or channel, or a deep research tool. By default, you don't have to manage contention or reach out over the network to a centralized database to retrieve and store state.

Source: [Store and sync state](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state)
