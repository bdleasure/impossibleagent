[Skip to content](https://developers.cloudflare.com/agents/getting-started/testing-your-agent/#_top)

# Testing your Agents

Copy Page

Because Agents run on Cloudflare Workers and Durable Objects, they can be tested using the same tools and techniques as Workers and Durable Objects.

## Writing and running tests

### Setup

Before you write your first test, install the necessary packages:

```

npm install vitest@~3.0.0 --save-dev --save-exact

npm install @cloudflare/vitest-pool-workers --save-dev
```

Ensure that your `vitest.config.js` file is identical to the following:

```

import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({

  test: {

    poolOptions: {

      workers: {

        wrangler: { configPath: "./wrangler.toml" },

      },

    },

  },

});
```

### Add the Agent configuration

Add a `durableObjects` configuration to `vitest.config.js` with the name of your Agent class:

```

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({

  test: {

    poolOptions: {

      workers: {

        main: './src/index.ts',

        miniflare: {

          durableObjects: {

            NAME: 'MyAgent',

          },

        },

      },

    },

  },

});
```

### Write a test

Tests use the `vitest` framework. A basic test suite for your Agent can validate how your Agent responds to requests, but can also unit test your Agent's methods and state.

```

import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';

import { describe, it, expect } from 'vitest';

import worker from '../src';

import { Env } from '../src';

interface ProvidedEnv extends Env {}

describe('make a request to my Agent', () => {

  // Unit testing approach

  it('responds with state', async () => {

    // Provide a valid URL that your Worker can use to route to your Agent

    // If you are using routeAgentRequest, this will be /agent/:agent/:name

    const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/agent/my-agent/agent-123');

    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);

    expect(await response.text()).toMatchObject({ hello: 'from your agent' });

  });

  it('also responds with state', async () => {

    const request = new Request('http://example.com/agent/my-agent/agent-123');

    const response = await SELF.fetch(request);

    expect(await response.text()).toMatchObject({ hello: 'from your agent' });

  });

});
```

### Run tests

Running tests is done using the `vitest` CLI:

```

$ npm run test

# or run vitest directly

$ npx vitest
```

```

  MyAgent

    ✓ should return a greeting (1 ms)

Test Files  1 passed (1)
```

Review the [documentation on testing](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/) for additional examples and test configuration.

## Running Agents locally

You can also run an Agent locally using the `wrangler` CLI:

```

$ npx wrangler dev
```

```

Your Worker and resources are simulated locally via Miniflare. For more information, see: https://developers.cloudflare.com/workers/testing/local-development.

Your worker has access to the following bindings:

- Durable Objects:

  - MyAgent: MyAgent

  Starting local server...

[wrangler:inf] Ready on http://localhost:53645
```

This spins up a local development server that runs the same runtime as Cloudflare Workers, and allows you to iterate on your Agent's code and test it locally without deploying it.

Visit the [`wrangler dev` ↗](https://developers.cloudflare.com/workers/wrangler/commands/#dev) docs to review the CLI flags and configuration options.

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