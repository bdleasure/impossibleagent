# ImpossibleAgent Development Workflow

This document outlines the development workflow for ImpossibleAgent, providing guidelines for contributors to ensure consistent, high-quality code based on the Cloudflare Agents SDK.

## Getting Started

1. **Review the Roadmap**: Check [ROADMAP.md](./ROADMAP.md) to understand current priorities and progress
2. **Understand the Project Structure**: Familiarize yourself with [PROJECT_MAP.md](./PROJECT_MAP.md)
3. **Learn the Cloudflare Agents SDK**: Read the [Agents SDK documentation](https://developers.cloudflare.com/agents/)
4. **Review Current Implementation**: Check [CURRENT_IMPLEMENTATION.md](./CURRENT_IMPLEMENTATION.md) to understand what's already built
5. **Set Up Your Environment**:
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/impossibleagent.git
   cd impossibleagent
   npm install
   ```
5. **Configure Wrangler** (for Cloudflare Workers):
   ```bash
   npx wrangler login
   ```
6. **Set Up Environment Variables**:
   Create a `.dev.vars` file in the project root:
   ```
   OPENAI_API_KEY=your_development_api_key
   # Add any other needed variables
   ```

## Development Process

### 1. Feature Planning

Before writing code:

1. **Check the Roadmap**: Ensure your feature aligns with project priorities
2. **Create an Issue**: Describe the feature or bug you're addressing
3. **Design First**: Sketch interfaces and data flows before implementation
4. **Discuss Complex Changes**: For major features, discuss your approach with maintainers

### 2. Local Development

Run the development server:
```bash
npm run dev
```

This will start a local server at http://localhost:8787 with hot reloading enabled.

### 3. Implementation Guidelines

Follow these principles when implementing features:

1. **Test-Driven Development**:
   - Write tests first using Vitest with the Workers environment
   - Implement the feature to satisfy the tests
   - Aim for >90% test coverage for new code

2. **Code Organization**:
   - **Extend the Agents SDK**: Build on top of the SDK instead of creating from scratch
   - **One responsibility per file** - Keep each file focused on a single task
   - **Clear interfaces** - Define and follow interfaces for module boundaries
   - **Minimal coupling** - Reduce dependencies between modules
   - **Comprehensive comments** - Explain the "why" not just the "what"
   - **Follow established patterns** - Look at existing implementations like `PersonalAgent`, `MemoryManager`, and `BaseMCPAdapter`

3. **Memory Management Principles**:
   - Leverage the Agents SDK's built-in SQL database (`this.sql`)
   - Use the state management system (`this.setState`, `this.state`)
   - Include memory access patterns in comments
   - Keep raw memory separate from processed insights
   - Follow the patterns established in the `MemoryManager` class

4. **Tool Integration Principles**:
   - Use the Agents SDK tool system for defining and executing tools
   - Follow the MCP-First approach - prefer external services via MCP adapters
   - Implement tools with both automatic execution and confirmation patterns
   - Handle errors gracefully with proper user feedback
   - Log tool usage in agent memory
   - Extend the `BaseMCPAdapter` class for new service integrations

5. **Module Development Sequence**:
   - Follow the priority order in [ROADMAP.md](./ROADMAP.md)
   - Ensure dependencies are implemented before dependent modules
   - Current focus areas: Memory Retrieval Enhancement, Additional MCP Adapters, Knowledge Extraction

6. **Code Structure Guidelines**:
   - **Agent Classes**:
     - Extend the base `AIChatAgent` class from the Agents SDK
     - Implement WebSocket handlers (`onConnect`, `onMessage`)
     - Use the SDK's SQL database for persistent storage
     - Define callable methods with the `@callable` decorator
   - **API Endpoints**:
     - Use `routeAgentRequest` for routing requests to agent instances
     - Implement proper authentication in `onBeforeConnect` and `onBeforeRequest`
     - Document all endpoints with JSDoc comments
   - **TypeScript**:
     - Define interfaces for all data structures
     - Use strict typing
     - Type agent state properly when extending the Agent class
     - Export types that are used across multiple files

7. **Code Quality**:
   ```bash
   npm run lint    # Lint your code
   npm run format  # Format your code
   ```
   We use ESLint and Prettier for code quality and formatting.

### 4. Branching Strategy

We follow a simplified Git Flow workflow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Feature branches
- `bugfix/bug-name` - Bug fix branches
- `release/version` - Release preparation branches

#### Creating a New Feature

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/my-new-feature
   ```

2. Implement your feature with regular commits.

3. Push your branch and create a pull request to `develop`.

#### Bug Fixes

1. Create a bugfix branch from `develop` (or `main` for critical production bugs):
   ```bash
   git checkout develop
   git pull
   git checkout -b bugfix/bug-description
   ```

2. Fix the bug and commit your changes.

3. Push your branch and create a pull request to the appropriate branch.

### 5. Pull Request Process

1. **Create a Branch**: Use the format `feature/feature-name` or `fix/issue-description`
2. **Small, Focused PRs**: Keep changes focused on a single feature or fix
3. **Update Documentation**: Update relevant docs and add inline comments
4. **Run All Tests**: Ensure all tests pass before submitting
5. **PR Description**: Include a clear description of changes and reference related issues
6. **Code Review**: Get at least one code review
7. **Squash and Merge**: Squash and merge to the target branch

## Testing Protocol

For each module:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test complete workflows from client to storage
4. **Memory Integrity Tests**: Verify state persistence and SQL database operations
5. **Privacy Tests**: Verify encryption and access controls
6. **Tool Integration Tests**: Validate tool execution and MCP interactions

Run tests with:
```bash
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage report
```

## Deployment

The project supports multiple deployment environments:

- **Development**: `npm run deploy:dev`
- **Testing/Staging**: `npm run deploy:staging`
- **Production**: `npm run deploy:prod`

Always test in development and staging environments before deploying to production.

## Release Process

1. Create a release branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b release/v1.0.0
   ```

2. Update version numbers in:
   - package.json
   - wrangler.toml (if needed)
   - Any version constants in the code

3. Create a pull request to `main`

4. After merging to `main`, tag the release:
   ```bash
   git checkout main
   git pull
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

5. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

6. Merge `main` back into `develop`:
   ```bash
   git checkout develop
   git merge main
   git push
   ```

## Working with AI Assistance

When using AI tools to assist development:

### Effective Prompting

1. **Be specific about the file and function**:
   ```
   Extend the Agent class in src/agents/PersonalAgent.ts to implement the memory retrieval functionality
   ```

2. **Provide context about Agents SDK usage**:
   ```
   This class should extend the Agent class from the Agents SDK and use this.sql for database operations
   ```

3. **Specify requirements and constraints**:
   ```
   The implementation must use the Agents SDK state management system and WebSocket capabilities
   ```

4. **For tool implementations, include SDK-specific details**:
   ```
   Implement this tool following the Agents SDK tool pattern with a confirmation flow
   ```

5. **Reference project documentation and SDK docs**:
   ```
   Follow the memory management principles in DEVELOPMENT_WORKFLOW.md and the Agents SDK documentation
   ```

### AI Implementation Review

After receiving AI-generated code:

1. **Check for SDK compliance** - Ensure it properly extends and uses the Agents SDK
2. **Verify interface compliance** - Make sure it follows defined interfaces
3. **Examine dependencies** - Confirm imports and exports are correct
4. **Review for simplicity** - Look for unnecessary complexity
5. **Check comment quality** - Ensure implementation is well-explained
6. **Verify test coverage** - Ensure tests cover the implementation

## Memory Design Principles

Since memory is central to ImpossibleAgent, extend the Agents SDK's capabilities:

1. **Memory Durability**: Leverage Durable Objects and the SDK's SQL database
2. **Memory Accessibility**: Design efficient SQL queries for common memory operations
3. **Memory Privacy**: Add encryption to the SDK's storage capabilities
4. **Memory Evolution**: Implement consolidation and pruning on top of the base storage
5. **Memory Context**: Add contextual metadata to each memory record
6. **Memory Attribution**: Track sources and confidence for each memory
7. **User Control**: Build interfaces for users to manage their memory store

## Documentation

- Update documentation when adding new features
- Document how your code extends the Agents SDK
- Keep the README.md up to date
- Update CURRENT_IMPLEMENTATION.md when completing features

## Contribution Priorities

Current priority areas for contribution (see [ROADMAP.md](./ROADMAP.md) for details):

1. **Memory Retrieval Enhancement** - Implementing more sophisticated memory retrieval using embeddings
2. **Additional MCP Adapters** - Creating adapters for more external services
3. **Knowledge Extraction** - Enhancing the ability to extract knowledge from conversations
4. **Advanced UI Components** - Creating specialized UI components for different interaction modes
5. **Learning Mechanisms** - Implementing systems for learning from interactions
6. **Factual Verification** - Building factual verification mechanisms for knowledge
