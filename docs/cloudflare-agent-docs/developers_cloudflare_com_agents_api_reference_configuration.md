[Skip to content](https://developers.cloudflare.com/agents/api-reference/configuration/#_top)

# Configuration

Copy Page

An Agent is configured like any other Cloudflare Workers project, and uses [a wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) file to define where your code is and what services (bindings) it will use.

### Project structure

The typical file structure for an Agent project created from `npm create cloudflare@latest agents-starter -- --template cloudflare/agents-starter` follows:

```

.

|-- package-lock.json

|-- package.json

|-- public

|   `-- index.html

|-- src

|   `-- index.ts // your Agent definition

|-- test

|   |-- index.spec.ts // your tests

|   `-- tsconfig.json

|-- tsconfig.json

|-- vitest.config.mts

|-- worker-configuration.d.ts

`-- wrangler.jsonc // your Workers & Agent configuration
```

### Example configuration

Below is a minimal `wrangler.jsonc` file that defines the configuration for an Agent, including the entry point, `durable_object` namespace, and code `migrations`:

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/configuration/#tab-panel-403)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/configuration/#tab-panel-404)

```

{

  "$schema": "node_modules/wrangler/config-schema.json",

  "name": "agents-example",

  "main": "src/index.ts",

  "compatibility_date": "2025-02-23",

  "compatibility_flags": ["nodejs_compat"],

  "durable_objects": {

    "bindings": [\
\
      {\
\
        // Required:\
\
        "name": "MyAgent", // How your Agent is called from your Worker\
\
        "class_name": "MyAgent", // Must match the class name of the Agent in your code\
\
        // Optional: set this if the Agent is defined in another Worker script\
\
        "script_name": "the-other-worker"\
\
      },\
\
    ],

  },

  "migrations": [\
\
    {\
\
      "tag": "v1",\
\
      // Mandatory for the Agent to store state\
\
      "new_sqlite_classes": ["MyAgent"],\
\
    },\
\
  ],

  "observability": {

    "enabled": true,

  },

}
```

```

"$schema" = "node_modules/wrangler/config-schema.json"

name = "agents-example"

main = "src/index.ts"

compatibility_date = "2025-02-23"

compatibility_flags = [ "nodejs_compat" ]

[[durable_objects.bindings]]

name = "MyAgent"

class_name = "MyAgent"

script_name = "the-other-worker"

[[migrations]]

tag = "v1"

new_sqlite_classes = [ "MyAgent" ]

[observability]

enabled = true
```

The configuration includes:

- A `main` field that points to the entry point of your Agent, which is typically a TypeScript (or JavaScript) file.
- A `durable_objects` field that defines the [Durable Object namespace](https://developers.cloudflare.com/durable-objects/reference/glossary/) that your Agents will run within.
- A `migrations` field that defines the code migrations that your Agent will use. This field is mandatory and must contain at least one migration. The `new_sqlite_classes` field is mandatory for the Agent to store state.

Agents must define these fields in their `wrangler.jsonc` (or `wrangler.toml`) config file.

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