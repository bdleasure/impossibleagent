[Skip to content](https://developers.cloudflare.com/agents/concepts/workflows/#_top)

# Workflows

Copy Page

## What are workflows?

A workflow is the orchestration layer that coordinates how an agent's components work together. It defines the structured paths through which tasks are processed, tools are called, and results are managed. While agents make dynamic decisions about what to do, workflows provide the underlying framework that governs how those decisions are executed.

### Understanding workflows in agent systems

Think of a workflow like the operating procedures of a company. The company (agent) can make various decisions, but how those decisions get implemented follows established processes (workflows). For example, when you book a flight through a travel agent, they might make different decisions about which flights to recommend, but the process of actually booking the flight follows a fixed sequence of steps.

Let's examine a basic agent workflow:

### Core components of a workflow

A workflow typically consists of several key elements:

1. **Input Processing**
The workflow defines how inputs are received and validated before being processed by the agent. This includes standardizing formats, checking permissions, and ensuring all required information is present.
2. **Tool Integration**
Workflows manage how external tools and services are accessed. They handle authentication, rate limiting, error recovery, and ensuring tools are used in the correct sequence.
3. **State Management**
The workflow maintains the state of ongoing processes, tracking progress through multiple steps and ensuring consistency across operations.
4. **Output Handling**
Results from the agent's actions are processed according to defined rules, whether that means storing data, triggering notifications, or formatting responses.

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
- Your Privacy Choices