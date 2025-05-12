[Skip to content](https://developers.cloudflare.com/agents/model-context-protocol/tools/#_top)

# Tools

Copy Page

Model Context Protocol (MCP) tools are functions that a [MCP Server](https://developers.cloudflare.com/agents/model-context-protocol) provides and MCP clients can call.

When you build MCP Servers with the `@cloudflare/model-context-protocol` package, you can define tools the [same way as shown in the `@modelcontextprotocol/typescript-sdk` package's examples ↗](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#tools).

For example, the following code from [this example MCP server ↗](https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-server) defines a simple MCP server that adds two numbers together:

- [JavaScript](https://developers.cloudflare.com/agents/model-context-protocol/tools/#tab-panel-469)
- [TypeScript](https://developers.cloudflare.com/agents/model-context-protocol/tools/#tab-panel-470)

```

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

```

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