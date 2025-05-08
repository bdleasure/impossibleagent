# ImpossibleAgent

ImpossibleAgent is a powerful AI assistant built on the Cloudflare Agents SDK, designed to provide enhanced capabilities beyond standard AI assistants.

## Features

- **Enhanced Long-term Memory**: Stores and retrieves episodic and semantic memories with embedding-based semantic search, temporal context awareness, and learning-enhanced retrieval to maintain rich context across conversations
- **Knowledge Graph**: Manages structured knowledge with entities, relationships, and contradiction detection, with automatic knowledge extraction from conversations
- **Security System**: Handles access control, audit logging, and privacy settings
- **MCP Integration**: Connects to external services through the Model Context Protocol, including calendar, weather, and email services
- **Tool Discovery & Suggestion**: Intelligently discovers available tools and suggests relevant ones based on conversation context
- **Learning System**: Implements feedback loops and pattern recognition to improve memory retrieval and knowledge extraction over time
- **Calendar Management**: Integrates with calendar services for scheduling and event management

## Architecture

ImpossibleAgent is built with a modular architecture that separates concerns into distinct components:

- **Agents**: Core agent implementation with conversation handling
- **Memory**: Long-term memory storage and retrieval
- **Knowledge**: Structured knowledge management
- **Security**: Access control and privacy features
- **Tools**: Adapters for external services via MCP

## Getting Started

### Prerequisites

- Node.js 18+
- Wrangler CLI
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment variables:

```bash
cp .dev.vars.example .dev.vars
```

4. Edit `.dev.vars` and add your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
```

### Development

Start the development server:

```bash
npm start
```

This will start a local development server at http://localhost:5173/.

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Project Structure

```
impossibleagent/
├── src/
│   ├── agents/           # Agent implementations
│   │   └── PersonalAgent.ts  # Core agent implementation
│   ├── memory/           # Memory management
│   │   ├── MemoryManager.ts  # Memory operations manager
│   │   └── EmbeddingManager.ts # Embedding generation and retrieval
│   ├── knowledge/        # Knowledge base
│   │   ├── KnowledgeBase.ts  # Knowledge storage and retrieval
│   │   ├── KnowledgeExtractor.ts # Extract knowledge from text
│   │   └── LearningSystem.ts # Pattern recognition and feedback
│   ├── security/         # Security features
│   │   └── SecurityManager.ts # Centralized security management
│   ├── tools/            # MCP tool adapters
│   │   ├── BaseMCPAdapter.ts # Common MCP functionality
│   │   ├── CalendarAdapter.ts # Calendar service adapter
│   │   ├── EmailAdapter.ts # Email service adapter
│   │   ├── WeatherAdapter.ts # Weather service adapter
│   │   └── DocumentStorageAdapter.ts # Document storage adapter
│   ├── components/       # UI components
│   │   └── memory-visualization/ # Memory visualization components
│   ├── app.tsx           # Main application component
│   ├── client.tsx        # Client-side entry point
│   ├── server.ts         # Server-side entry point
│   ├── shared.ts         # Shared types and utilities
│   └── utils.ts          # Utility functions
├── public/               # Static assets
├── tests/                # Test files
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## MCP Integration

ImpossibleAgent uses the Model Context Protocol (MCP) to connect to external services. The `BaseMCPAdapter` class provides a foundation for implementing specific service adapters like `CalendarAdapter`.

To add a new MCP service:

1. Create a new adapter class that extends `BaseMCPAdapter`
2. Implement service-specific methods
3. Register the adapter with the agent

## Knowledge System

The knowledge system consists of several components:

- **KnowledgeBase**: Manages structured knowledge with categories, tags, and confidence levels
- **KnowledgeExtractor**: Extracts structured knowledge from conversations and documents
- **LearningSystem**: Implements feedback loops and pattern recognition
- **KnowledgeGraph**: Represents relationships between entities with the following capabilities:
  - Entity recognition and extraction
  - Relationship mapping between entities
  - Contradiction detection and resolution
  - Graph querying by entity types, relationship types, and properties

This knowledge system enables:
- Structured representation of information
- Relationship tracking between concepts
- Contradiction detection for maintaining data consistency
- Confidence scoring for stored information
- Pattern extraction from content

## Memory System

The memory system consists of several components working together:

- **MemoryManager**: Core class for storing and retrieving agent memories
- **EmbeddingManager**: Handles vector embeddings for semantic search capabilities
- **RelevanceRanking**: Ranks memories by relevance to queries with detailed scoring factors
- **TemporalContextManager**: Provides time-based context for memory operations
- **LearningEnhancedMemoryRetrieval**: Combines memory retrieval with learning capabilities

The memory system supports two main types of memories:

- **Episodic Memories**: Specific events and interactions
- **Semantic Memories**: General facts and knowledge

This sophisticated memory system enables:
- Semantic search with vector embeddings
- Multi-factor relevance ranking
- Temporal context awareness
- Learning from user feedback
- Detailed memory visualization
- Robust fallback mechanisms for SQL queries
- Schema evolution handling for database tables

For more details on the memory persistence system, see [Memory Persistence Documentation](docs/memory-persistence.md).

## Security

The security system includes:

- **Access Control**: Rules-based permissions
- **Audit Logging**: Tracking of security-relevant events
- **Privacy Settings**: User-configurable privacy preferences

## License

This project is licensed under the MIT License - see the LICENSE file for details.
