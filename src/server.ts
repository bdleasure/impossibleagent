import { routeAgentRequest } from "agents";
import { unstable_getSchedulePrompt } from "agents/schedule";
import { openai } from "@ai-sdk/openai";
import { tools, executions } from "./tools";
import { PersonalAgent } from "./agents/PersonalAgent";
import { McpPersonalAgent } from "./agents/McpPersonalAgent";
// import { env } from "cloudflare:workers";

/**
 * Environment variables and bindings available to the Worker
 */
interface Env {
  // Add environment variables as needed
  OPENAI_API_KEY?: string;
  // Assets binding for serving static files and SPA
  ASSETS: Fetcher;
  // AI binding for Workers AI
  AI: any;
  // Vectorize binding for vector database
  VECTOR_DB: any;
  // MCP server configuration
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
}

const model = openai("gpt-4o-2024-11-20");
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Register our PersonalAgent for the application
 */
export const { Chat } = PersonalAgent.register({
  model,
  tools,
  executions,
  systemPrompt: `You are ImpossibleAgent, a powerful AI assistant that can help with a wide range of tasks.
You have enhanced capabilities including:
- Long-term memory storage and retrieval in a SQL database
- Calendar management and scheduling
- Knowledge base for storing and retrieving information
- Security features for protecting user data
- MCP (Model Context Protocol) integration for connecting to external services

IMPORTANT: You have access to a sophisticated memory system that stores conversation history in a SQL database.
When users ask about your memory capabilities or if you can remember past conversations, you should confirm that
you CAN access the chat history and memories stored in the SQL database. You should never say you don't have
access to the database or past conversations.

${unstable_getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`,
  maxSteps: 10,
});

// Create a reference to the McpPersonalAgent Durable Object
// This will be used for MCP server functionality
export const { PersonalAgent: McpAgent } = { PersonalAgent: McpPersonalAgent };

// Log that the agents are registered
console.log("PersonalAgent registered as 'Chat'");
console.log("McpPersonalAgent available for MCP server functionality");

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
/**
 * Define any API paths that should be handled by the server
 * These are typically API endpoints or WebSocket connections
 */
const API_PATHS = [
  "/api/", 
  "/check-open-ai-key", 
  "/ws"
  // Note: /chat is handled specially for both WebSocket and GET requests
];

/**
 * Define client-side routes that should be handled by the SPA
 */
const CLIENT_ROUTES = [
  "/chat",
  "/memory-garden",
  "/ritual-moments",
  "/voice-interaction",
  "/lifeline",
  "/companion-avatar",
  "/proactive-check-in",
  "/showcase"
];

/**
 * Check if a URL path matches any of the API paths
 */
function isApiPath(path: string, request?: Request): boolean {
  // For WebSocket connections to /chat, handle as API
  if (path === "/chat" && request && isWebSocketRequest(request)) {
    console.log("WebSocket request to /chat detected");
    return true;
  }
  
  // Check if the path matches any of the API paths
  const isApi = API_PATHS.some(apiPath => path.startsWith(apiPath));
  if (isApi) {
    console.log(`API path detected: ${path}`);
  }
  
  return isApi;
}

/**
 * Check if a request is a WebSocket upgrade request
 */
function isWebSocketRequest(request: Request): boolean {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

/**
 * Check if a URL path matches any of the client-side routes
 */
function isClientRoute(path: string): boolean {
  return CLIENT_ROUTES.some(route => path === route);
}

/**
 * Main worker handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Log API key warning if needed
    if (!env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }

    // First, try to route the request to the agent system
    // This handles WebSocket connections and API requests
    try {
      const agentResponse = await routeAgentRequest(request, env, {
        cors: true, // Enable CORS for all agent requests
        prefix: 'agents' // Use 'agents' as the prefix for agent routes
      });
      
      if (agentResponse) {
        return agentResponse;
      }
    } catch (error) {
      console.error(`Error routing agent request: ${error}`);
    }
    
    // Handle MCP server requests
    if (url.pathname.startsWith('/mcp') || url.pathname.startsWith('/sse')) {
      try {
        // Route to MCP server
        if (url.pathname.startsWith('/sse')) {
          return McpAgent.serveSSE('/sse').fetch(request, env, ctx);
        }
        
        if (url.pathname.startsWith('/mcp')) {
          return McpAgent.serve('/mcp').fetch(request, env, ctx);
        }
      } catch (error) {
        console.error(`Error handling MCP request: ${error}`);
        return new Response(`MCP server error: ${error}`, { status: 500 });
      }
    }
    
    // Handle OpenAI key check
    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey,
      });
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    
    // Handle client-side routes or serve static assets
    if (isClientRoute(url.pathname) || url.pathname === "/") {
      return await serveClientRoute(url.pathname, request, env);
    }
    
    // For all other requests, let the assets handler in wrangler.jsonc take care of it
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/**
 * Helper function to serve client-side routes
 */
async function serveClientRoute(pathname: string, request: Request, env: Env) {
  console.log(`Handling client route: ${pathname}`);
  
  // Create a new request for index.html
  const url = new URL(request.url);
  const indexRequest = new Request(`${url.origin}/index.html`, request);
  const indexResponse = await env.ASSETS.fetch(indexRequest);
  
  // Get the HTML content
  let html = await indexResponse.text();
  
  // Inject the initialPath script
  const scriptToInject = `<script>window.initialPath = "${pathname}";</script>`;
  html = html.replace('</head>', `${scriptToInject}</head>`);
  
  // Return the modified HTML
  return new Response(html, {
    headers: indexResponse.headers,
    status: 200
  });
}
