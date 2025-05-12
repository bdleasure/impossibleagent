[Skip to content](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#_top)

# Schedule tasks

Copy Page

An Agent can schedule tasks to be run in the future by calling `this.schedule(when, callback, data)`, where `when` can be a delay, a `Date`, or a cron string; `callback` the function name to call, and `data` is an object of data to pass to the function.

Scheduled tasks can do anything a request or message from a user can: make requests, query databases, send emails, read+write state: scheduled tasks can invoke any regular method on your Agent.

### Scheduling tasks

You can call `this.schedule` within any method on an Agent, and schedule tens-of-thousands of tasks per individual Agent:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-421)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-422)

```

import { Agent } from "agents";

export class SchedulingAgent extends Agent {

  async onRequest(request) {

    // Handle an incoming request

    // Schedule a task 5 minutes from now

    // Calls the "checkFlights" method

    let { taskId } = await this.schedule(600, "checkFlights", {

      flight: "DL264",

      date: "2025-02-23",

    });

    return Response.json({ taskId });

  }

  async checkFlights(data) {

    // Invoked when our scheduled task runs

    // We can also call this.schedule here to schedule another task

  }

}
```

```

import { Agent } from "agents"

export class SchedulingAgent extends Agent {

  async onRequest(request) {

    // Handle an incoming request

    // Schedule a task 5 minutes from now

    // Calls the "checkFlights" method

    let { taskId } = await this.schedule(600, "checkFlights", { flight: "DL264", date: "2025-02-23" });

    return Response.json({ taskId });

  }

  async checkFlights(data) {

    // Invoked when our scheduled task runs

    // We can also call this.schedule here to schedule another task

  }

}
```

You can schedule tasks in multiple ways:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-419)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-420)

```

// schedule a task to run in 10 seconds

let task = await this.schedule(10, "someTask", { message: "hello" });

// schedule a task to run at a specific date

let task = await this.schedule(new Date("2025-01-01"), "someTask", {});

// schedule a task to run every 10 seconds

let { id } = await this.schedule("*/10 * * * *", "someTask", {

  message: "hello",

});

// schedule a task to run every 10 seconds, but only on Mondays

let task = await this.schedule("0 0 * * 1", "someTask", { message: "hello" });

// cancel a scheduled task

this.cancelSchedule(task.id);
```

```

// schedule a task to run in 10 seconds

let task = await this.schedule(10, "someTask", { message: "hello" });

// schedule a task to run at a specific date

let task = await this.schedule(new Date("2025-01-01"), "someTask", {});

// schedule a task to run every 10 seconds

let { id } = await this.schedule("*/10 * * * *", "someTask", { message: "hello" });

// schedule a task to run every 10 seconds, but only on Mondays

let task = await this.schedule("0 0 * * 1", "someTask", { message: "hello" });

// cancel a scheduled task

this.cancelSchedule(task.id);
```

Calling `await this.schedule` returns a `Schedule`, which includes the task's randomly generated `id`. You can use this `id` to retrieve or cancel the task in the future. It also provides a `type` property that indicates the type of schedule, for example, one of `"scheduled" | "delayed" | "cron"`.

### Managing scheduled tasks

You can get, cancel and filter across scheduled tasks within an Agent using the scheduling API:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-423)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/#tab-panel-424)

```

// Get a specific schedule by ID

// Returns undefined if the task does not exist

let task = await this.getSchedule(task.id);

// Get all scheduled tasks

// Returns an array of Schedule objects

let tasks = this.getSchedules();

// Cancel a task by its ID

// Returns true if the task was cancelled, false if it did not exist

await this.cancelSchedule(task.id);

// Filter for specific tasks

// e.g. all tasks starting in the next hour

let tasks = this.getSchedules({

  timeRange: {

    start: new Date(Date.now()),

    end: new Date(Date.now() + 60 * 60 * 1000),

  },

});
```

```

// Get a specific schedule by ID

// Returns undefined if the task does not exist

let task = await this.getSchedule(task.id)

// Get all scheduled tasks

// Returns an array of Schedule objects

let tasks = this.getSchedules();

// Cancel a task by its ID

// Returns true if the task was cancelled, false if it did not exist

await this.cancelSchedule(task.id);

// Filter for specific tasks

// e.g. all tasks starting in the next hour

let tasks = this.getSchedules({

  timeRange: {

    start: new Date(Date.now()),

    end: new Date(Date.now() + 60 * 60 * 1000),

  }

});
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