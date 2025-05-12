# Impossible Agent - Backend Memory System

This project has been streamlined to focus solely on the backend memory system, removing all frontend components except for the minimal chat interface needed for testing.

## Overview

The Impossible Agent backend memory system provides a robust way to store and retrieve memories from conversations. It includes:

- Memory storage and retrieval
- Embedding-based semantic search
- Knowledge extraction
- Temporal context management
- Learning-enhanced memory retrieval

## Features

- **Memory Storage**: Stores conversation data in a durable, persistent way
- **Memory Retrieval**: Retrieves relevant memories based on context and queries
- **Knowledge Extraction**: Extracts entities, relationships, and facts from conversations
- **Temporal Context**: Understands and manages time-based context for memories
- **Learning System**: Improves memory retrieval over time through learning

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run start
   ```

3. Open your browser to [http://127.0.0.1:8787](http://127.0.0.1:8787) to access the minimal chat interface for testing the memory system.

## Testing the Memory System

1. Send a message containing information you want the system to remember (e.g., "Remember that I like chocolate ice cream")
2. The system will acknowledge and store this information
3. Later, you can ask about this information (e.g., "What do I like?") and the system will retrieve it from memory

## Project Structure

- `src/memory/`: Contains the core memory system components
  - `MemoryManager.ts`: Main memory management system
  - `EmbeddingManager.ts`: Handles vector embeddings for semantic search
  - `RelevanceRanking.ts`: Ranks memories by relevance
  - `TemporalContextManager.ts`: Manages time-based context
  - `LearningEnhancedMemoryRetrieval.ts`: Improves retrieval through learning

- `src/knowledge/`: Contains knowledge extraction and management
  - `KnowledgeBase.ts`: Stores extracted knowledge
  - `KnowledgeExtractor.ts`: Extracts knowledge from conversations
  - `KnowledgeGraph.ts`: Manages relationships between knowledge entities
  - `LearningSystem.ts`: Improves knowledge extraction over time

- `src/agents/`: Contains the agent implementation
  - `PersonalAgent.ts`: Main agent implementation that uses the memory system

## Technical Details

The system uses:

- Cloudflare Workers for serverless execution
- Durable Objects for persistent storage
- WebSockets for real-time communication
- Vector embeddings for semantic search
- SQLite for structured data storage

## Cleanup Scripts

Several cleanup scripts were used to remove the frontend components:

- `cleanup-frontend.ps1`: Initial cleanup of frontend files
- `cleanup-and-fix.ps1`: Fixed issues with the ToolSuggestionSystem
- `cleanup-frontend-complete.ps1`: Comprehensive cleanup of all frontend components

These scripts have already been run, and the project is now streamlined to focus solely on the backend memory system.
