import { routeAgentRequest, type Schedule } from "agents";
import { unstable_getSchedulePrompt } from "agents/schedule";
import {
  createDataStreamResponse,
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { processToolCalls } from "./utils";
import { tools, executions } from "./tools";
import { PersonalAgent } from "./agents/PersonalAgent";
import { MemoryManager } from "./memory/MemoryManager";
import { SecurityManager } from "./security/SecurityManager";
import { KnowledgeBase } from "./knowledge/KnowledgeBase";
// import { env } from "cloudflare:workers";

const model = openai("gpt-4o-2024-11-20");
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Register our PersonalAgent as the main agent for the application
 */
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

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey,
      });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }
    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
