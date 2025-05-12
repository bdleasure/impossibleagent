[Skip to content](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#_top)

# McpAgent — API Reference

Copy Page

When you build MCP Servers on Cloudflare, you extend the [`McpAgent` class ↗](https://github.com/cloudflare/agents/blob/5881c5d23a7f4580600029f69307cfc94743e6b8/packages/agents/src/mcp.ts), from the Agents SDK, like this:

- [JavaScript](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#tab-panel-465)
- [TypeScript](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#tab-panel-466)

```

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

```

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

This means that each instance of your MCP server has its own durable state, backed by a [Durable Object](https://developers.cloudflare.com/durable-objects/), with its own [SQL database](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state).

Your MCP server doesn't necessarily have to be an Agent. You can build MCP servers that are stateless, and just add [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools) to your MCP server using the `@modelcontextprotocol/typescript-sdk` package.

But if you want your MCP server to:

- remember previous tool calls, and responses it provided
- provide a game to the MCP client, remembering the state of the game board, previous moves, and the score
- cache the state of a previous external API call, so that subsequent tool calls can reuse it
- do anything that an Agent can do, but allow MCP clients to communicate with it

You can use the APIs below in order to do so.

#### Hibernation Support

`McpAgent` instances automatically support [WebSockets Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/#websocket-hibernation-api), allowing stateful MCP servers to sleep during inactive periods while preserving their state. This means your agents only consume compute resources when actively processing requests, optimizing costs while maintaining the full context and conversation history.

### State synchronization APIs

The `McpAgent` class makes the following subset of methods from the [Agents SDK](https://developers.cloudflare.com/agents/api-reference/agents-api/) available:

- [`state`](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/)
- [`initialState`](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/#set-the-initial-state-for-an-agent)
- [`setState`](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/)
- [`onStateUpdate`](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/#synchronizing-state)
- [`sql`](https://developers.cloudflare.com/agents/api-reference/agents-api/#sql-api)

For example, the following code implements an MCP server that remembers a counter value, and updates the counter when the `add` tool is called:

- [JavaScript](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#tab-panel-467)
- [TypeScript](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#tab-panel-468)

```

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

          content: [\
\
            {\
\
              type: "text",\
\
              text: String(`Added ${a}, total is now ${this.state.counter}`),\
\
            },\
\
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

```

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

          content: [\
\
            {\
\
              type: "text",\
\
              text: String(`Added ${a}, total is now ${this.state.counter}`),\
\
            },\
\
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

- [WebSocket APIs](https://developers.cloudflare.com/agents/api-reference/websockets/) ( `onMessage`, `onError`, `onClose`, `onConnect`)
- [Scheduling APIs](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/) `this.schedule`

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