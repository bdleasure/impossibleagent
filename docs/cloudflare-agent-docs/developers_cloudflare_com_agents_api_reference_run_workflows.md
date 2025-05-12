[Skip to content](https://developers.cloudflare.com/agents/api-reference/run-workflows/#_top)

# Run Workflows

Copy Page

Agents can trigger asynchronous [Workflows](https://developers.cloudflare.com/workflows/), allowing your Agent to run complex, multi-step tasks in the background. This can include post-processing files that a user has uploaded, updating the embeddings in a [vector database](https://developers.cloudflare.com/vectorize/), and/or managing long-running user-lifecycle email or SMS notification workflows.

Because an Agent is just like a Worker script, it can create Workflows defined in the same project (script) as the Agent _or_ in a different project.

## Trigger a Workflow

An Agent can trigger one or more Workflows from within any method, whether from an incoming HTTP request, a WebSocket connection, on a delay or schedule, and/or from any other action the Agent takes.

Triggering a Workflow from an Agent is no different from [triggering a Workflow from a Worker script](https://developers.cloudflare.com/workflows/build/trigger-workflows/):

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-417)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-418)

```

export class MyAgent extends Agent {

  async onRequest(request) {

    let userId = request.headers.get("user-id");

    // Trigger a schedule that runs a Workflow

    // Pass it a payload

    let { taskId } = await this.schedule(300, "runWorkflow", {

      id: userId,

      flight: "DL264",

      date: "2025-02-23",

    });

  }

  async runWorkflow(data) {

    let instance = await env.MY_WORKFLOW.create({

      id: data.id,

      params: data,

    });

    // Schedule another task that checks the Workflow status every 5 minutes...

    await this.schedule("*/5 * * * *", "checkWorkflowStatus", {

      id: instance.id,

    });

  }

}

export class MyWorkflow extends WorkflowEntrypoint {

  async run(event, step) {

    // Your Workflow code here

  }

}
```

```

interface Env {

  MY_WORKFLOW: Workflow;

  MyAgent: AgentNamespace<MyAgent>;

}

export class MyAgent extends Agent<Env> {

  async onRequest(request: Request) {

    let userId = request.headers.get("user-id");

    // Trigger a schedule that runs a Workflow

    // Pass it a payload

    let { taskId } = await this.schedule(300, "runWorkflow", { id: userId, flight: "DL264", date: "2025-02-23" });

  }

  async runWorkflow(data) {

    let instance = await env.MY_WORKFLOW.create({

      id: data.id,

      params: data,

    })

    // Schedule another task that checks the Workflow status every 5 minutes...

    await this.schedule("*/5 * * * *", "checkWorkflowStatus", { id: instance.id });

  }

}

export class MyWorkflow extends WorkflowEntrypoint<Env> {

  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {

    // Your Workflow code here

  }

}
```

You'll also need to make sure your Agent [has a binding to your Workflow](https://developers.cloudflare.com/workflows/build/trigger-workflows/#workers-api-bindings) so that it can call it:

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-415)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-416)

```

{

  // ...

  // Create a binding between your Agent and your Workflow

  "workflows": [\
\
    {\
\
      // Required:\
\
      "name": "EMAIL_WORKFLOW",\
\
      "class_name": "MyWorkflow",\
\
      // Optional: set the script_name field if your Workflow is defined in a\
\
      // different project from your Agent\
\
      "script_name": "email-workflows"\
\
    }\
\
   ],

  // ...

}
```

```

[[workflows]]

name = "EMAIL_WORKFLOW"

class_name = "MyWorkflow"

script_name = "email-workflows"
```

## Trigger a Workflow from another project

You can also call a Workflow that is defined in a different Workers script from your Agent by setting the `script_name` property in the `workflows` binding of your Agent:

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-413)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/run-workflows/#tab-panel-414)

```

{

    // Required:

    "name": "EMAIL_WORKFLOW",

    "class_name": "MyWorkflow",

    // Optional: set tthe script_name field if your Workflow is defined in a

    // different project from your Agent

    "script_name": "email-workflows"

}
```

```

name = "EMAIL_WORKFLOW"

class_name = "MyWorkflow"

script_name = "email-workflows"
```

Refer to the [cross-script calls](https://developers.cloudflare.com/workflows/build/workers-api/#cross-script-calls) section of the Workflows documentation for more examples.

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