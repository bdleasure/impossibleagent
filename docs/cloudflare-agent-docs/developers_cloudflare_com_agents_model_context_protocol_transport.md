[Skip to content](https://developers.cloudflare.com/agents/model-context-protocol/transport/#_top)

# Transport

Copy Page

The Model Context Protocol (MCP) specification defines three standard [transport mechanisms ↗](https://spec.modelcontextprotocol.io/specification/draft/basic/transports/) for communication between clients and servers:

1. **stdio, communication over standard in and standard out** — designed for local MCP connections.
2. **Server-Sent Events (SSE)** — Currently supported by most remote MCP clients, but is expected to be replaced by Streamable HTTP over time. It requires two endpoints: one for sending requests, another for receiving streamed responses.
3. **Streamable HTTP** — New transport method [introduced ↗](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) in March 2025. It simplifies the communication by using a single HTTP endpoint for bidirectional messaging. It is currently gaining adoption among remote MCP clients, but it is expected to become the standard transport in the future.

MCP servers built with the [Agents SDK](https://developers.cloudflare.com/agents) can support both remote transport methods (SSE and Streamable HTTP), with the [`McpAgent` class ↗](https://github.com/cloudflare/agents/blob/2f82f51784f4e27292249747b5fbeeef94305552/packages/agents/src/mcp.ts) automatically handling the transport configuration.

## Implementing remote MCP transport

If you're building a new MCP server or upgrading an existing one on Cloudflare, we recommend supporting both remote transport methods (SSE and Streamable HTTP) concurrently to ensure compatibility with all MCP clients.

#### Get started quickly

You can use the "Deploy to Cloudflare" button to create a remote MCP server that automatically supports both SSE and Streamable HTTP transport methods.

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

#### Remote MCP server (without authentication)

If you're manually configuring your MCP server, here's how to use the `McpAgent` class to handle both transport methods:

- [JavaScript](https://developers.cloudflare.com/agents/model-context-protocol/transport/#tab-panel-471)
- [TypeScript](https://developers.cloudflare.com/agents/model-context-protocol/transport/#tab-panel-472)
- [Hono](https://developers.cloudflare.com/agents/model-context-protocol/transport/#tab-panel-473)

```

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

```

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

```

const app = new Hono()

app.mount('/sse', MyMCP.serveSSE('/sse').fetch, { replaceRequest: false })

app.mount('/mcp', MyMCP.serve('/mcp').fetch, { replaceRequest: false )

export default app
```

#### MCP Server with Authentication

If your MCP server implements authentication & authorization using the [Workers OAuth Provider ↗](https://github.com/cloudflare/workers-oauth-provider) Library, then you can configure it to support both transport methods using the `apiHandlers` property.

```

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

If you have an MCP server with authentication/authorization using the Workers OAuth Provider, [update the configuration](https://developers.cloudflare.com/agents/model-context-protocol/transport/#mcp-server-with-authentication) to use the `apiHandlers` property, which replaces `apiRoute` and `apiHandler`.

With these few changes, your MCP server will support both transport methods, making it compatible with both existing and new clients.

### Testing with MCP Clients

While most MCP clients have not yet adopted the new Streamable HTTP transport, you can start testing it today using [`mcp-remote` ↗](https://www.npmjs.com/package/mcp-remote), an adapter that lets MCP clients that otherwise only support local connections work with remote MCP servers.

Follow [this guide](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/) for instructions on how to connect to your remote MCP server from Claude Desktop, Cursor, Windsurf, and other local MCP clients, using the [`mcp-remote` local proxy ↗](https://www.npmjs.com/package/mcp-remote).

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