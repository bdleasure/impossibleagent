[Skip to content](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#_top)

# Browse the web

Copy Page

Agents can browse the web using the [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) API or your preferred headless browser service.

### Browser Rendering API

The [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) allows you to spin up headless browser instances, render web pages, and interact with websites through your Agent.

You can define a method that uses Puppeteer to pull the content of a web page, parse the DOM, and extract relevant information by calling the OpenAI model:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-391)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-392)

```

export class MyAgent extends Agent {

  async browse(browserInstance, urls) {

    let responses = [];

    for (const url of urls) {

      const browser = await puppeteer.launch(browserInstance);

      const page = await browser.newPage();

      await page.goto(url);

      await page.waitForSelector("body");

      const bodyContent = await page.$eval(

        "body",

        (element) => element.innerHTML,

      );

      const client = new OpenAI({

        apiKey: this.env.OPENAI_API_KEY,

      });

      let resp = await client.chat.completions.create({

        model: this.env.MODEL,

        messages: [\
\
          {\
\
            role: "user",\
\
            content: `Return a JSON object with the product names, prices and URLs with the following format: { "name": "Product Name", "price": "Price", "url": "URL" } from the website content below. <content>${bodyContent}</content>`,\
\
          },\
\
        ],

        response_format: {

          type: "json_object",

        },

      });

      responses.push(resp);

      await browser.close();

    }

    return responses;

  }

}
```

```

interface Env {

  BROWSER: Fetcher;

}

export class MyAgent extends Agent<Env> {

  async browse(browserInstance: Fetcher, urls: string[]) {

    let responses = [];

    for (const url of urls) {

      const browser = await puppeteer.launch(browserInstance);

      const page = await browser.newPage();

      await page.goto(url);

      await page.waitForSelector('body');

      const bodyContent = await page.$eval('body', (element) => element.innerHTML);

      const client = new OpenAI({

        apiKey: this.env.OPENAI_API_KEY,

      });

      let resp = await client.chat.completions.create({

        model: this.env.MODEL,

        messages: [\
\
          {\
\
            role: 'user',\
\
            content: `Return a JSON object with the product names, prices and URLs with the following format: { "name": "Product Name", "price": "Price", "url": "URL" } from the website content below. <content>${bodyContent}</content>`,\
\
          },\
\
        ],

        response_format: {

          type: 'json_object',

        },

      });

      responses.push(resp);

      await browser.close();

    }

    return responses;

  }

}
```

You'll also need to add install the `@cloudflare/puppeteer` package and add the following to the wrangler configuration of your Agent:

```

npm install @cloudflare/puppeteer --save-dev
```

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-387)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-388)

```

{

  // ...

  "browser": {

    "binding": "MYBROWSER"

  }

  // ...

}
```

```

[browser]

binding = "MYBROWSER"
```

### Browserbase

You can also use [Browserbase ↗](https://docs.browserbase.com/integrations/cloudflare/typescript) by using the Browserbase API directly from within your Agent.

Once you have your [Browserbase API key ↗](https://docs.browserbase.com/integrations/cloudflare/typescript), you can add it to your Agent by creating a [secret](https://developers.cloudflare.com/workers/configuration/secrets/):

```

cd your-agent-project-folder

npx wrangler@latest secret put BROWSERBASE_API_KEY
```

```

Enter a secret value: ******

Creating the secret for the Worker "agents-example"

Success! Uploaded secret BROWSERBASE_API_KEY
```

Install the `@cloudflare/puppeteer` package and use it from within your Agent to call the Browserbase API:

```

npm install @cloudflare/puppeteer
```

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-389)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/browse-the-web/#tab-panel-390)

```

export class MyAgent extends Agent {

  constructor(env) {

    super(env);

  }

}
```

```

interface Env {

  BROWSERBASE_API_KEY: string;

}

export class MyAgent extends Agent<Env> {

  constructor(env: Env) {

    super(env);

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