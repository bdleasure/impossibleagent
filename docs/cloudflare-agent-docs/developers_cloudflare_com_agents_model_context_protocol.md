[Skip to content](https://developers.cloudflare.com/agents/model-context-protocol/#_top)

# Model Context Protocol (MCP)

Copy Page

You can build and deploy [Model Context Protocol (MCP) ↗](https://modelcontextprotocol.io/) servers on Cloudflare.

## What is the Model Context Protocol (MCP)?

[Model Context Protocol (MCP) ↗](https://modelcontextprotocol.io/) is an open standard that connects AI systems with external applications. Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect your devices to various accessories, MCP provides a standardized way to connect AI agents to different services.

### MCP Terminology

- **MCP Hosts**: AI assistants (like [Claude ↗](http://claude.ai/) or [Cursor ↗](http://cursor.com/)), AI agents, or applications that need to access external capabilities.
- **MCP Clients**: Clients embedded within the MCP hosts that connect to MCP servers and invoke tools. Each MCP client instance has a single connection to an MCP server.
- **MCP Servers**: Applications that expose [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/), [prompts ↗](https://modelcontextprotocol.io/docs/concepts/prompts), and [resources ↗](https://modelcontextprotocol.io/docs/concepts/resources) that MCP clients can use.

### Remote vs. local MCP connections

The MCP standard supports two modes of operation:

- **Remote MCP connections**: MCP clients connect to MCP servers over the Internet, establishing a [long-lived connection using HTTP and Server-Sent Events (SSE)](https://developers.cloudflare.com/agents/model-context-protocol/transport/), and authorizing the MCP client access to resources on the user's account using [OAuth](https://developers.cloudflare.com/agents/model-context-protocol/authorization/).
- **Local MCP connections**: MCP clients connect to MCP servers on the same machine, using [stdio ↗](https://spec.modelcontextprotocol.io/specification/draft/basic/transports/#stdio) as a local transport method.

### Best Practices

- **Tool design**: Do not treat your MCP server as a wrapper around your full API schema. Instead, build tools that are optimized for specific user goals and reliable outcomes. Fewer, well-designed tools often outperform many granular ones, especially for agents with small context windows or tight latency budgets.
- **Scoped permissions**: Deploying several focused MCP servers, each with narrowly scoped permissions, reduces the risk of over-privileged access and makes it easier to manage and audit what each server is allowed to do.
- **Tool descriptions**: Detailed parameter descriptions help agents understand how to use your tools correctly — including what values are expected, how they affect behavior, and any important constraints. This reduces errors and improves reliability.
- **Evaluation tests**: Use evaluation tests ('evals') to measure the agent’s ability to use your tools correctly. Run these after any updates to your server or tool descriptions to catch regressions early and track improvements over time.

### Get Started

Go to the [Getting Started](https://developers.cloudflare.com/agents/guides/remote-mcp-server/) guide to learn how to build and deploy your first remote MCP server to Cloudflare.

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