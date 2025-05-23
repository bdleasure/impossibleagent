[Skip to content](https://developers.cloudflare.com/agents/api-reference/calling-agents/#_top)

# Calling Agents

Copy Page

Learn how to call your Agents from Workers, including how to create Agents on-the-fly, address them, and route requests to specific instances of an Agent.

### Calling your Agent

Agents are created on-the-fly and can serve multiple requests concurrently. Each Agent instance is isolated from other instances, can maintain its own state, and has a unique address.

You can create and run an instance of an Agent directly from a Worker using either:

- The `routeAgentRequest` helper: this will automatically map requests to an individual Agent based on the `/agents/:agent/:name` URL pattern. The value of `:agent` will be the name of your Agent class converted to `kebab-case`, and the value of `:name` will be the name of the Agent instance you want to create or retrieve.
- `getAgentByName`, which will create a new Agent instance if none exists by that name, or retrieve a handle to an existing instance.

See the usage patterns in the following example:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-395)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-396)

```

import {

  Agent,

  AgentNamespace,

  getAgentByName,

  routeAgentRequest,

} from "agents";

export default {

  async fetch(request, env, ctx) {

    // Routed addressing

    // Automatically routes HTTP requests and/or WebSocket connections to /agents/:agent/:name

    // Best for: connecting React apps directly to Agents using useAgent from agents/react

    return (

      (await routeAgentRequest(request, env)) ||

      Response.json({ msg: "no agent here" }, { status: 404 })

    );

    // Named addressing

    // Best for: convenience method for creating or retrieving an agent by name/ID.

    // Bringing your own routing, middleware and/or plugging into an existing

    // application or framework.

    let namedAgent = getAgentByName(env.MyAgent, "my-unique-agent-id");

    // Pass the incoming request straight to your Agent

    let namedResp = (await namedAgent).fetch(request);

    return namedResp;

  },

};

export class MyAgent extends Agent {

  // Your Agent implementation goes here

}
```

```

import { Agent, AgentNamespace, getAgentByName, routeAgentRequest } from 'agents';

interface Env {

  // Define your Agent on the environment here

  // Passing your Agent class as a TypeScript type parameter allows you to call

  // methods defined on your Agent.

  MyAgent: AgentNamespace<MyAgent>;

}

export default {

  async fetch(request, env, ctx): Promise<Response> {

    // Routed addressing

    // Automatically routes HTTP requests and/or WebSocket connections to /agents/:agent/:name

    // Best for: connecting React apps directly to Agents using useAgent from agents/react

    return (await routeAgentRequest(request, env)) || Response.json({ msg: 'no agent here' }, { status: 404 });

    // Named addressing

    // Best for: convenience method for creating or retrieving an agent by name/ID.

    // Bringing your own routing, middleware and/or plugging into an existing

    // application or framework.

    let namedAgent = getAgentByName<Env, MyAgent>(env.MyAgent, 'my-unique-agent-id');

    // Pass the incoming request straight to your Agent

    let namedResp = (await namedAgent).fetch(request);

    return namedResp

  },

} satisfies ExportedHandler<Env>;

export class MyAgent extends Agent<Env> {

  // Your Agent implementation goes here

}
```

### Calling methods on Agents

When using `getAgentByName`, you can pass both requests (including WebSocket) connections and call methods defined directly on the Agent itself using the native [JavaScript RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/) (JSRPC) API.

For example, once you have a handle (or "stub") to an unique instance of your Agent, you can call methods on it:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-401)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-402)

```

import { Agent, AgentNamespace, getAgentByName } from "agents";

export default {

  async fetch(request, env, ctx) {

    let namedAgent = getAgentByName(env.MyAgent, "my-unique-agent-id");

    // Call methods directly on the Agent, and pass native JavaScript objects

    let chatResponse = namedAgent.chat("Hello!");

    // No need to serialize/deserialize it from a HTTP request or WebSocket

    // message and back again

    let agentState = getState(); // agentState is of type UserHistory

    return namedResp;

  },

};

export class MyAgent extends Agent {

  // Your Agent implementation goes here

  async chat(prompt) {

    // call your favorite LLM

    return "result";

  }

  async getState() {

    // Return the Agent's state directly

    return this.state;

  }

  // Other methods as you see fit!

}
```

```

import { Agent, AgentNamespace, getAgentByName } from 'agents';

interface Env {

  // Define your Agent on the environment here

  // Passing your Agent class as a TypeScript type parameter allows you to call

  // methods defined on your Agent.

  MyAgent: AgentNamespace<MyAgent>;

}

interface UserHistory {

  history: string[];

  lastUpdated: Date;

}

export default {

  async fetch(request, env, ctx): Promise<Response> {

    let namedAgent = getAgentByName<Env, MyAgent>(env.MyAgent, 'my-unique-agent-id');

    // Call methods directly on the Agent, and pass native JavaScript objects

    let chatResponse = namedAgent.chat('Hello!');

    // No need to serialize/deserialize it from a HTTP request or WebSocket

    // message and back again

    let agentState = getState() // agentState is of type UserHistory

    return namedResp

  },

} satisfies ExportedHandler<Env>;

export class MyAgent extends Agent<Env, UserHistory> {

  // Your Agent implementation goes here

  async chat(prompt: string) {

    // call your favorite LLM

    return "result"

  }

  async getState() {

    // Return the Agent's state directly

    return this.state;

  }

  // Other methods as you see fit!

}
```

When using TypeScript, ensure you pass your Agent class as a TypeScript type parameter to the AgentNamespace type so that types are correctly inferred:

```

interface Env {

  // Passing your Agent class as a TypeScript type parameter allows you to call

  // methods defined on your Agent.

  MyAgent: AgentNamespace<CodeReviewAgent>;

}

export class CodeReviewAgent extends Agent<Env, AgentState> {

  // Agent methods here

}
```

### Naming your Agents

When creating names for your Agents, think about what the Agent represents. A unique user? A team or company? A room or channel for collaboration?

A consistent approach to naming allows you to:

- direct incoming requests directly to the right Agent
- deterministically route new requests back to that Agent, no matter where the client is in the world.
- avoid having to rely on centralized session storage or external services for state management, since each Agent instance can maintain its own state.

For a given Agent definition (or 'namespace' in the code below), there can be millions (or tens of millions) of instances of that Agent, each handling their own requests, making calls to LLMs, and maintaining their own state.

For example, you might have an Agent for every user using your new AI-based code editor. In that case, you'd want to create Agents based on the user ID from your system, which would then allow that Agent to handle all requests for that user.

It also ensures that [state within the Agent](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/), including chat history, language preferences, model configuration and other context can associated specifically with that user, making it easier to manage state.

The example below shows how to create a unique agent Agent for each `userId` in a request:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-393)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-394)

```

import {

  Agent,

  AgentNamespace,

  getAgentByName,

  routeAgentRequest,

} from "agents";

export default {

  async fetch(request, env, ctx) {

    let userId = new URL(request.url).searchParams.get("userId") || "anonymous";

    // Use an identifier that allows you to route to requests, WebSockets or call methods on the Agent

    // You can also put authentication logic here - e.g. to only create or retrieve Agents for known users.

    let namedAgent = getAgentByName(env.MyAgent, "my-unique-agent-id");

    return (await namedAgent).fetch(request);

  },

};

export class MyAgent extends Agent {

  // You can access the name of the agent via this.name in any method within

  // the Agent

  async onStartup() {

    console.log(`agent ${this.name} ready!`);

  }

}
```

```

import { Agent, AgentNamespace, getAgentByName, routeAgentRequest } from 'agents';

interface Env {

  MyAgent: AgentNamespace<MyAgent>;

}

export default {

  async fetch(request, env, ctx): Promise<Response> {

    let userId = new URL(request.url).searchParams.get('userId') || 'anonymous';

    // Use an identifier that allows you to route to requests, WebSockets or call methods on the Agent

    // You can also put authentication logic here - e.g. to only create or retrieve Agents for known users.

    let namedAgent = getAgentByName<Env, MyAgent>(env.MyAgent, 'my-unique-agent-id');

    return (await namedAgent).fetch(request);

  },

} satisfies ExportedHandler<Env>;

export class MyAgent extends Agent<Env> {

  // You can access the name of the agent via this.name in any method within

  // the Agent

  async onStartup() { console.log(`agent ${this.name} ready!`)}

}
```

Replace `userId` with `teamName`, `channel`, `companyName` as fits your Agents goals - and/or configure authentication to ensure Agents are only created for known, authenticated users.

### Authenticating Agents

When building and deploying Agents using the Agents SDK, you will often want to authenticate clients before passing requests to an Agent in order to restrict who the Agent will call, authorize specific users for specific Agents, and/or to limit who can access administrative or debug APIs exposed by an Agent.

As best practices:

- Handle authentication in your Workers code, before you invoke your Agent.
- Use the built-in hooks when using the `routeAgentRequest` helper - `onBeforeConnect` and `onBeforeRequest`
- Use your preferred router (such as Hono) and authentication middleware or provider to apply custom authentication schemes before calling an Agent using other methods.

The `routeAgentRequest` helper documented earlier in this guide exposes two useful hooks ( `onBeforeConnect`, `onBeforeRequest`) that allow you to apply custom logic before creating or retrieving an Agent:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-399)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-400)

```

import { Agent, AgentNamespace, routeAgentRequest } from "agents";

export default {

  async fetch(request, env, ctx) {

    // Use the onBeforeConnect and onBeforeRequest hooks to authenticate clients

    // or run logic before handling a HTTP request or WebSocket.

    return (

      (await routeAgentRequest(request, env, {

        // Run logic before a WebSocket client connects

        onBeforeConnect: (request) => {

          // Your code/auth code here

          // You can return a Response here - e.g. a HTTP 403 Not Authorized -

          // which will stop further request processing and will NOT invoke the

          // Agent.

          // return Response.json({"error": "not authorized"}, { status: 403 })

        },

        // Run logic before a HTTP client clients

        onBeforeRequest: (request) => {

          // Your code/auth code here

          // Returning nothing will result in the call to the Agent continuing

        },

        // Prepend a prefix for how your Agents are named here

        prefix: "name-prefix-here",

      })) || Response.json({ msg: "no agent here" }, { status: 404 })

    );

  },

};
```

```

import { Agent, AgentNamespace, routeAgentRequest } from 'agents';

interface Env {

  MyAgent: AgentNamespace<MyAgent>;

}

export default {

  async fetch(request, env, ctx): Promise<Response> {

    // Use the onBeforeConnect and onBeforeRequest hooks to authenticate clients

    // or run logic before handling a HTTP request or WebSocket.

    return (

      (await routeAgentRequest(request, env, {

        // Run logic before a WebSocket client connects

        onBeforeConnect: (request) => {

          // Your code/auth code here

          // You can return a Response here - e.g. a HTTP 403 Not Authorized -

          // which will stop further request processing and will NOT invoke the

          // Agent.

          // return Response.json({"error": "not authorized"}, { status: 403 })

        },

        // Run logic before a HTTP client clients

        onBeforeRequest: (request) => {

          // Your code/auth code here

          // Returning nothing will result in the call to the Agent continuing

        },

        // Prepend a prefix for how your Agents are named here

        prefix: 'name-prefix-here',

      })) || Response.json({ msg: 'no agent here' }, { status: 404 })

    );

  },

} satisfies ExportedHandler<Env>;
```

If you are using `getAgentByName` or the underlying Durable Objects routing API, you should authenticate incoming requests or WebSocket connections before calling `getAgentByName`.

For example, if you are using [Hono ↗](https://hono.dev/), you can authenticate in the middleware before calling an Agent and passing a request (or a WebSocket connection) to it:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-397)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/calling-agents/#tab-panel-398)

```

import { Agent, AgentNamespace, getAgentByName } from "agents";

import { Hono } from "hono";

const app = new Hono();

app.use("/code-review/*", async (c, next) => {

  // Perform auth here

  // e.g. validate a Bearer token, a JWT, use your preferred auth library

  // return Response.json({ msg: 'unauthorized' }, { status: 401 });

  await next(); // continue on if valid

});

app.get("/code-review/:id", async (c) => {

  const id = c.req.param("teamId");

  if (!id) return Response.json({ msg: "missing id" }, { status: 400 });

  // Call the Agent, creating it with the name/identifier from the ":id" segment

  // of our URL

  const agent = await getAgentByName(c.env.MyAgent, id);

  // Pass the request to our Agent instance

  return await agent.fetch(c.req.raw);

});
```

```

import { Agent, AgentNamespace, getAgentByName } from 'agents';

import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.use('/code-review/*', async (c, next) => {

  // Perform auth here

  // e.g. validate a Bearer token, a JWT, use your preferred auth library

  // return Response.json({ msg: 'unauthorized' }, { status: 401 });

  await next(); // continue on if valid

});

app.get('/code-review/:id', async (c) => {

  const id = c.req.param('teamId');

  if (!id) return Response.json({ msg: 'missing id' }, { status: 400 });

  // Call the Agent, creating it with the name/identifier from the ":id" segment

  // of our URL

  const agent = await getAgentByName<Env, MyAgent>(c.env.MyAgent, id);

  // Pass the request to our Agent instance

  return await agent.fetch(c.req.raw);

});
```

This ensures we only create Agents for authenticated users, and allows you to validate whether Agent names conform to your preferred naming scheme before instances are created.

### Next steps

- Review the [API documentation](https://developers.cloudflare.com/agents/api-reference/agents-api/) for the Agents class to learn how to define
- [Build a chat Agent](https://developers.cloudflare.com/agents/getting-started/build-a-chat-agent/) using the Agents SDK and deploy it to Workers.
- Learn more [using WebSockets](https://developers.cloudflare.com/agents/api-reference/websockets/) to build interactive Agents and stream data back from your Agent.
- [Orchestrate asynchronous workflows](https://developers.cloudflare.com/agents/api-reference/run-workflows) from your Agent by combining the Agents SDK and [Workflows](https://developers.cloudflare.com/workflows).

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