[Skip to content](https://developers.cloudflare.com/agents/api-reference/rag/#_top)

# Retrieval Augmented Generation

Copy Page

Agents can use Retrieval Augmented Generation (RAG) to retrieve relevant information and use it augment [calls to AI models](https://developers.cloudflare.com/agents/api-reference/using-ai-models/). Store a user's chat history to use as context for future conversations, summarize documents to bootstrap an Agent's knowledge base, and/or use data from your Agent's [web browsing](https://developers.cloudflare.com/agents/api-reference/browse-the-web/) tasks to enhance your Agent's capabilities.

You can use the Agent's own [SQL database](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state) as the source of truth for your data and store embeddings in [Vectorize](https://developers.cloudflare.com/vectorize/) (or any other vector-enabled database) to allow your Agent to retrieve relevant information.

### Vector search

You can query a vector index (or indexes) from any method on your Agent: any Vectorize index you attach is available on `this.env` within your Agent. If you've [associated metadata](https://developers.cloudflare.com/vectorize/best-practices/insert-vectors/#metadata) with your vectors that maps back to data stored in your Agent, you can then look up the data directly within your Agent using `this.sql`.

Here's an example of how to give an Agent retrieval capabilties:

- [JavaScript](https://developers.cloudflare.com/agents/api-reference/rag/#tab-panel-411)
- [TypeScript](https://developers.cloudflare.com/agents/api-reference/rag/#tab-panel-412)

```

import { Agent } from "agents";

export class RAGAgent extends Agent {

  // Other methods on our Agent

  // ...

  //

  async queryKnowledge(userQuery) {

    // Turn a query into an embedding

    const queryVector = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {

      text: [userQuery],

    });

    // Retrieve results from our vector index

    let searchResults = await this.env.VECTOR_DB.query(queryVector.data[0], {

      topK: 10,

      returnMetadata: "all",

    });

    let knowledge = [];

    for (const match of searchResults.matches) {

      console.log(match.metadata);

      knowledge.push(match.metadata);

    }

    // Use the metadata to re-associate the vector search results

    // with data in our Agent's SQL database

    let results = this

      .sql`SELECT * FROM knowledge WHERE id IN (${knowledge.map((k) => k.id)})`;

    // Return them

    return results;

  }

}
```

```

import { Agent } from "agents";

interface Env {

  AI: Ai;

  VECTOR_DB: Vectorize;

}

export class RAGAgent extends Agent<Env> {

  // Other methods on our Agent

  // ...

  //

  async queryKnowledge(userQuery: string) {

    // Turn a query into an embedding

    const queryVector = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {

      text: [userQuery],

    });

    // Retrieve results from our vector index

    let searchResults = await this.env.VECTOR_DB.query(queryVector.data[0], {

      topK: 10,

      returnMetadata: 'all',

    });

    let knowledge = [];

    for (const match of searchResults.matches) {

      console.log(match.metadata);

      knowledge.push(match.metadata);

    }

    // Use the metadata to re-associate the vector search results

    // with data in our Agent's SQL database

    let results = this.sql`SELECT * FROM knowledge WHERE id IN (${knowledge.map((k) => k.id)})`;

    // Return them

    return results;

  }

}
```

You'll also need to connect your Agent to your vector indexes:

- [wrangler.jsonc](https://developers.cloudflare.com/agents/api-reference/rag/#tab-panel-409)
- [wrangler.toml](https://developers.cloudflare.com/agents/api-reference/rag/#tab-panel-410)

```

{

  // ...

  "vectorize": [\
\
    {\
\
      "binding": "VECTOR_DB",\
\
      "index_name": "your-vectorize-index-name"\
\
    }\
\
  ]

  // ...

}
```

```

[[vectorize]]

binding = "VECTOR_DB"

index_name = "your-vectorize-index-name"
```

If you have multiple indexes you want to make available, you can provide an array of `vectorize` bindings.

#### Next steps

- Learn more on how to [combine Vectorize and Workers AI](https://developers.cloudflare.com/vectorize/get-started/embeddings/)
- Review the [Vectorize query API](https://developers.cloudflare.com/vectorize/reference/client-api/)
- Use [metadata filtering](https://developers.cloudflare.com/vectorize/reference/metadata-filtering/) to add context to your results

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