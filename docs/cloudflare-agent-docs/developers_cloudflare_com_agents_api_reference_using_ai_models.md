[Skip to content](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#_top)

# Using AI Models

Copy Page

Agents can communicate with AI models hosted on any provider, including:

- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- The [AI SDK ↗](https://sdk.vercel.ai/docs/ai-sdk-core/overview)
- [OpenAI ↗](https://platform.openai.com/docs/quickstart?language=javascript)
- [Anthropic ↗](https://docs.anthropic.com/en/api/client-sdks#typescript)
- [Google's Gemini ↗](https://ai.google.dev/gemini-api/docs/openai)

You can also use the model routing features in [AI Gateway](https://developers.cloudflare.com/ai-gateway/) to route across providers, eval responses, and manage AI provider rate limits.

Because Agents are built on top of [Durable Objects](https://developers.cloudflare.com/durable-objects/), each Agent or chat session is associated with a stateful compute instance. Traditional serverless architectures often present challenges for persistent connections needed in real-time applications like chat.

A user can disconnect during a long-running response from a modern reasoning model (such as `o3-mini` or DeepSeek R1), or lose conversational context when refreshing the browser. Instead of relying on request-response patterns and managing an external database to track & store conversation state, state can be stored directly within the Agent. If a client disconnects, the Agent can write to its own distributed storage, and catch the client up as soon as it reconnects: even if it's hours or days later.

## Calling AI Models

You can call models from any method within an Agent, including from HTTP requests using the [`onRequest`](https://developers.cloudflare.com/agents/api-reference/agents-api/) handler, when a [scheduled task](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/) runs, when handling a WebSocket message in the [`onMessage`](https://developers.cloudflare.com/agents/api-reference/websockets/) handler, or from any of your own methods.

Importantly, Agents can call AI models on their own — autonomously — and can handle long-running responses that can take minutes (or longer) to respond in full.

### Long-running model requests

Modern [reasoning models ↗](https://platform.openai.com/docs/guides/reasoning) or "thinking" model can take some time to both generate a response _and_ stream the response back to the client.

Instead of buffering the entire response, or risking the client disconecting, you can stream the response back to the client by using the [WebSocket API](https://developers.cloudflare.com/agents/api-reference/websockets/).

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-447)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-448)

```

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

```

import { Agent } from "agents"

import { OpenAI } from "openai"

export class MyAgent extends Agent<Env> {

  async onConnect(connection: Connection, ctx: ConnectionContext) {

    //

  }

  async onMessage(connection: Connection, message: WSMessage) {

    let msg = JSON.parse(message)

    // This can run as long as it needs to, and return as many messages as it needs to!

    await queryReasoningModel(connection, msg.prompt)

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

You can also persist AI model responses back to [Agent's internal state](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/) by using the `this.setState` method. For example, if you run a [scheduled task](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/), you can store the output of the task and read it later. Or, if a user disconnects, read the message history back and send it to the user when they reconnect.

### Workers AI

### Hosted models

You can use [any of the models available in Workers AI](https://developers.cloudflare.com/workers-ai/models/) within your Agent by [configuring a binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/).

Workers AI supports streaming responses out-of-the-box by setting `stream: true`, and we strongly recommend using them to avoid buffering and delaying responses, especially for larger models or reasoning models that require more time to generate a response.

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-443)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-444)

```

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

```

import { Agent } from "agents"

interface Env {

  AI: Ai;

}

export class MyAgent extends Agent<Env> {

  async onRequest(request: Request) {

    const response = await env.AI.run(

      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",

      {

        prompt: "Build me a Cloudflare Worker that returns JSON.",

        stream: true, // Stream a response and don't block the client!

      }

    );

    // Return the stream

    return new Response(answer, {

        headers: { "content-type": "text/event-stream" }

    })

  }

}
```

Your wrangler configuration will need an `ai` binding added:

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-437)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-438)

```

{

  "ai": {

    "binding": "AI"

  }

}
```

```

[ai]

binding = "AI"
```

### Model routing

You can also use the model routing features in [AI Gateway](https://developers.cloudflare.com/ai-gateway/) directly from an Agent by specifying a [`gateway` configuration](https://developers.cloudflare.com/ai-gateway/providers/workersai/) when calling the AI binding.

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-445)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-446)

```

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

```

import { Agent } from "agents"

interface Env {

  AI: Ai;

}

export class MyAgent extends Agent<Env> {

  async onRequest(request: Request) {

    const response = await env.AI.run(

      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",

      {

        prompt: "Build me a Cloudflare Worker that returns JSON."

      },

      {

        gateway: {

          id: "{gateway_id}", // Specify your AI Gateway ID here

          skipCache: false,

          cacheTtl: 3360,

        },

      },

    );

    return Response.json(response)

  }

}
```

Your wrangler configuration will need an `ai` binding added. This is shared across both Workers AI and AI Gateway.

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-439)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-440)

```

{

  "ai": {

    "binding": "AI"

  }

}
```

```

[ai]

binding = "AI"
```

Visit the [AI Gateway documentation](https://developers.cloudflare.com/ai-gateway/) to learn how to configure a gateway and retrieve a gateway ID.

### AI SDK

The [AI SDK ↗](https://sdk.vercel.ai/docs/introduction) provides a unified API for using AI models, including for text generation, tool calling, structured responses, image generation, and more.

To use the AI SDK, install the `ai` package and use it within your Agent. The example below shows how it use it to generate text on request, but you can use it from any method within your Agent, including WebSocket handlers, as part of a scheduled task, or even when the Agent is initialized.

```

npm install ai @ai-sdk/openai
```

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-441)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-442)

```

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

```

import { Agent } from "agents"

import { generateText } from 'ai';

import { openai } from '@ai-sdk/openai';

export class MyAgent extends Agent<Env> {

  async onRequest(request: Request): Promise<Response> {

    const { text } = await generateText({

      model: openai("o3-mini"),

      prompt: "Build me an AI agent on Cloudflare Workers",

      });

    return Response.json({modelResponse: text})

  }

}
```

### OpenAI compatible endpoints

Agents can call models across any service, including those that support the OpenAI API. For example, you can use the OpenAI SDK to use one of [Google's Gemini models ↗](https://ai.google.dev/gemini-api/docs/openai#node.js) directly from your Agent.

Agents can stream responses back over HTTP using Server Sent Events (SSE) from within an `onRequest` handler, or by using the native [WebSockets](https://developers.cloudflare.com/agents/api-reference/websockets/) API in your Agent to responses back to a client, which is especially useful for larger models that can take over 30+ seconds to reply.

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-449)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/using-ai-models/#tab-panel-450)

```

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

          messages: [\
\
            { role: "user", content: "Write me a Cloudflare Worker." },\
\
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

```

import { Agent } from "agents"

import { OpenAI } from "openai"

export class MyAgent extends Agent<Env> {

  async onRequest(request: Request): Promise<Response> {

    const openai = new OpenAI({

      apiKey: this.env.GEMINI_API_KEY,

      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"

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

          messages: [{ role: "user", content: "Write me a Cloudflare Worker." }],

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

    return new Response(readable)

  }

}
```

## Was this helpful?

- **Resources**
- [API](https://developers.cloudflare.com/api/)
- [New to Cloudflare?](https://developers.cloudflare.com/fundamentals/)
- [Products](https://developers.cloudflare.com/products/)
- [Sponsorships](https://developers.cloudflare.com/sponsorships/)
- [Open Source](https://github.com/cloudflare)

- **Support**
- [Help Center](https://support.cloudflare.com/)
- [System Status](https://www.cloudflarestatus.com/)
- [Compliance](https://www.cloudflare.com/trust-hub/compliance-resources/)
- [GDPR](https://www.cloudflare.com/trust-hub/gdpr/)

- **Company**
- [cloudflare.com](https://www.cloudflare.com/)
- [Our team](https://www.cloudflare.com/people/)
- [Careers](https://www.cloudflare.com/careers/)

- **Tools**
- [Cloudflare Radar](https://radar.cloudflare.com/)
- [Speed Test](https://speed.cloudflare.com/)
- [Is BGP Safe Yet?](https://isbgpsafeyet.com/)
- [RPKI Toolkit](https://rpki.cloudflare.com/)
- [Certificate Transparency](https://ct.cloudflare.com/)

- **Community**
- [X](https://x.com/cloudflare)
- [Discord](http://discord.cloudflare.com/)
- [YouTube](https://www.youtube.com/cloudflare)
- [GitHub](https://github.com/cloudflare/cloudflare-docs)

- 2025 Cloudflare, Inc.
- [Privacy Policy](https://www.cloudflare.com/privacypolicy/)
- [Terms of Use](https://www.cloudflare.com/website-terms/)
- [Report Security Issues](https://www.cloudflare.com/disclosure/)
- [Trademark](https://www.cloudflare.com/trademark/)
- Cookie Settings