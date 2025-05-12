[Skip to content](https://developers.cloudflare.com/agents/api-reference/websockets/#_top)

# Using WebSockets

Copy Page

Users and clients can connect to an Agent directly over WebSockets, allowing long-running, bi-directional communication with your Agent as it operates.

To enable an Agent to accept WebSockets, define `onConnect` and `onMessage` methods on your Agent.

- `onConnect(connection: Connection, ctx: ConnectionContext)` is called when a client establishes a new WebSocket connection. The original HTTP request, including request headers, cookies, and the URL itself, are available on `ctx.request`.
- `onMessage(connection: Connection, message: WSMessage)` is called for each incoming WebSocket message. Messages are one of `ArrayBuffer | ArrayBufferView | string`, and you can send messages back to a client using `connection.send()`. You can distinguish between client connections by checking `connection.id`, which is unique for each connected client.

Here's an example of an Agent that echoes back any message it receives:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-451)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-452)

```

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

```

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

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-453)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-454)

```

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

```

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

  })

);
```

### React clients

React-based applications can import `agents/react` and use the `useAgent` hook to connect to an instance of an Agent directly:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-457)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-458)

```

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

```

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

      })

    );

  };

  return (

    <div className="agent-interface">

      <button onClick={inquire}>Seek Understanding</button>

    </div>

  );

}
```

The `useAgent` hook automatically handles the lifecycle of the connection, ensuring that it is properly initialized and cleaned up when the component mounts and unmounts. You can also [combine `useAgent` with `useState`](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/) to automatically synchronize state across all clients connected to your Agent.

### Handling WebSocket events

Define `onError` and `onClose` methods on your Agent to explicitly handle WebSocket client errors and close events. Log errors, clean up state, and/or emit metrics:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-455)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/websockets/#tab-panel-456)

```

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

```

import { Agent, Connection } from "agents";

export class ChatAgent extends Agent {

   // onConnect and onMessage methods

  // ...

  // WebSocket error and disconnection (close) handling.

  async onError(connection: Connection, error: unknown): Promise<void> {

    console.error(`WS error: ${error}`);

  }

  async onClose(connection: Connection, code: number, reason: string, wasClean: boolean): Promise<void> {

    console.log(`WS closed: ${code} - ${reason} - wasClean: ${wasClean}`);

    connection.close();

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