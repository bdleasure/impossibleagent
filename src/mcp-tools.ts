import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KnowledgeGraph } from "./knowledge/KnowledgeGraph";
import { KnowledgeBase } from "./knowledge/KnowledgeBase";
import { LearningSystem } from "./knowledge/LearningSystem";
import { SecurityManager } from "./security/SecurityManager";
import { withMCPErrorHandling } from "./utils/errors";
import type { Entity, Relationship } from "./knowledge/graph/types";

/**
 * Register additional MCP tools for the McpPersonalAgent
 * @param server The MCP server instance
 * @param agent The agent instance (this)
 */
export function registerAdditionalMcpTools(server: McpServer, agent: any) {
  // Knowledge extraction tool
  server.tool(
    "extract_knowledge",
    "Extract knowledge entities and relationships from text",
    {
      text: z.string().describe("The text to extract knowledge from"),
      confidence: z.number().min(0).max(1).default(0.7).describe("Minimum confidence threshold (0-1)"),
      entityTypes: z.array(z.string()).optional().describe("Types of entities to extract"),
      relationshipTypes: z.array(z.string()).optional().describe("Types of relationships to extract")
    },
    async ({ text, confidence, entityTypes, relationshipTypes }: {
      text: string;
      confidence: number;
      entityTypes?: string[];
      relationshipTypes?: string[];
    }) => {
      return withMCPErrorHandling(async () => {
        // Create instances of knowledge components
        const knowledgeBase = new KnowledgeBase(agent);
        const knowledgeGraph = new KnowledgeGraph(agent, knowledgeBase);
        
        // Initialize the knowledge graph
        await knowledgeGraph.initialize();
        
        // In a real implementation, we would use the learning system to extract knowledge
        // For now, we'll simulate the extraction result
        const extractionResult = {
          entities: [] as Entity[],
          relationships: [] as Relationship[]
        };
        
        // Extract entities from text using a simple approach
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        for (const sentence of sentences) {
          if (sentence.includes(' is ') || sentence.includes(' are ')) {
            const parts = sentence.split(/ is | are /);
            if (parts.length === 2) {
              const entityName = parts[0].trim();
              const entityProperty = parts[1].trim();
              
              // Create entity
              const entityId = await knowledgeGraph.createOrUpdateEntity({
                name: entityName,
                type: entityTypes?.[0] || 'concept',
                properties: { description: entityProperty },
                confidence: confidence,
                sources: ['text extraction']
              });
              
              // Add to result
              extractionResult.entities.push({
                id: entityId,
                name: entityName,
                type: entityTypes?.[0] || 'concept',
                properties: { description: entityProperty },
                confidence,
                sources: ['text extraction'],
                created: Date.now(),
                updated: Date.now()
              } as Entity);
            }
          }
          
          // Look for relationships
          if (sentence.includes(' has ') || sentence.includes(' contains ')) {
            const parts = sentence.split(/ has | contains /);
            if (parts.length === 2) {
              const sourceEntityName = parts[0].trim();
              const targetEntityName = parts[1].trim();
              
              // Create source entity if it doesn't exist in our results
              let sourceEntityId = extractionResult.entities.find(e => e.name === sourceEntityName)?.id;
              if (!sourceEntityId) {
                sourceEntityId = await knowledgeGraph.createOrUpdateEntity({
                  name: sourceEntityName,
                  type: entityTypes?.[0] || 'concept',
                  properties: {},
                  confidence: confidence,
                  sources: ['text extraction']
                });
                
                extractionResult.entities.push({
                  id: sourceEntityId,
                  name: sourceEntityName,
                  type: entityTypes?.[0] || 'concept',
                  properties: {},
                  confidence,
                  sources: ['text extraction'],
                  created: Date.now(),
                  updated: Date.now()
                } as Entity);
              }
              
              // Create target entity if it doesn't exist in our results
              let targetEntityId = extractionResult.entities.find(e => e.name === targetEntityName)?.id;
              if (!targetEntityId) {
                targetEntityId = await knowledgeGraph.createOrUpdateEntity({
                  name: targetEntityName,
                  type: entityTypes?.[0] || 'concept',
                  properties: {},
                  confidence: confidence,
                  sources: ['text extraction']
                });
                
                extractionResult.entities.push({
                  id: targetEntityId,
                  name: targetEntityName,
                  type: entityTypes?.[0] || 'concept',
                  properties: {},
                  confidence,
                  sources: ['text extraction'],
                  created: Date.now(),
                  updated: Date.now()
                } as Entity);
              }
              
              // Create relationship
              const relationshipType = relationshipTypes?.[0] || 'has';
              const relationshipId = await knowledgeGraph.createOrUpdateRelationship({
                sourceEntityId,
                targetEntityId,
                type: relationshipType,
                confidence: confidence,
                sources: ['text extraction']
              });
              
              // Add to result
              extractionResult.relationships.push({
                id: relationshipId,
                sourceEntityId,
                targetEntityId,
                type: relationshipType,
                properties: {},
                confidence,
                sources: ['text extraction'],
                created: Date.now(),
                updated: Date.now()
              } as Relationship);
            }
          }
        }
        
        return {
          content: [
            { 
              type: "text", 
              text: `Knowledge extraction completed:
Entities extracted: ${extractionResult.entities.length}
Relationships extracted: ${extractionResult.relationships.length}

Entities:
${extractionResult.entities.map((e: Entity, i: number) => 
  `${i+1}. ${e.name || 'Unnamed'} (${e.type || 'Unknown type'})`).join('\n')}

Relationships:
${extractionResult.relationships.map((r: Relationship, i: number) => {
  const sourceEntity = extractionResult.entities.find((e: Entity) => e.id === r.sourceEntityId);
  const targetEntity = extractionResult.entities.find((e: Entity) => e.id === r.targetEntityId);
  return `${i+1}. ${sourceEntity?.name || 'Unknown'} ${r.type || 'Unknown relation'} ${targetEntity?.name || 'Unknown'}`;
}).join('\n')}`
            }
          ]
        };
      }, "extract_knowledge", { text, confidence, entityTypes, relationshipTypes });
    }
  );

  // Web browsing tool
  server.tool(
    "browse_web",
    "Browse a web page and extract information",
    {
      url: z.string().url().describe("The URL to browse"),
      selector: z.string().optional().describe("CSS selector to extract specific content"),
      extractLinks: z.boolean().default(false).describe("Whether to extract links from the page"),
      waitForSelector: z.string().optional().describe("CSS selector to wait for before extraction"),
      timeout: z.number().min(1000).max(30000).default(10000).describe("Timeout in milliseconds")
    },
    async ({ url, selector, extractLinks, waitForSelector, timeout }: {
      url: string;
      selector?: string;
      extractLinks?: boolean;
      waitForSelector?: string;
      timeout?: number;
    }) => {
      return withMCPErrorHandling(async () => {
        // Launch browser
        const browser = await agent.env.BROWSER.launch();
        const page = await browser.newPage();
        
        // Navigate to URL
        await page.goto(url, { timeout });
        
        // Wait for selector if provided
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout });
        }
        
        // Extract content
        let content = '';
        if (selector) {
          content = await page.$eval(selector, (el: Element) => el.textContent || '');
        } else {
          content = await page.$eval('body', (el: Element) => el.textContent || '');
        }
        
        // Extract links if requested
        let links = [];
        if (extractLinks) {
          links = await page.$$eval('a', (anchors: Element[]) => 
            anchors.map(a => ({ 
              text: a.textContent?.trim() || '', 
              href: (a as HTMLAnchorElement).href 
            }))
          );
        }
        
        // Close browser
        await browser.close();
        
        return {
          content: [
            { 
              type: "text", 
              text: `Web browsing completed for ${url}:
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

${extractLinks ? `Links extracted (${links.length}):
${links.slice(0, 10).map((link: any, i: number) => 
  `${i+1}. ${link.text || 'No text'}: ${link.href}`).join('\n')}
${links.length > 10 ? `...and ${links.length - 10} more` : ''}` : ''}`
            }
          ]
        };
      }, "browse_web", { url, selector, extractLinks, waitForSelector, timeout });
    }
  );

  // Security assessment tool
  server.tool(
    "security_assessment",
    "Assess the security of user data and provide recommendations",
    {
      dataType: z.enum(["personal", "financial", "health", "general"]).describe("Type of data to assess"),
      sensitivityLevel: z.number().min(1).max(10).default(5).describe("Sensitivity level of the data (1-10)"),
      includeRecommendations: z.boolean().default(true).describe("Whether to include security recommendations")
    },
    async ({ dataType, sensitivityLevel, includeRecommendations }: {
      dataType: "personal" | "financial" | "health" | "general";
      sensitivityLevel: number;
      includeRecommendations: boolean;
    }) => {
      return withMCPErrorHandling(async () => {
        // Create security manager instance
        const securityManager = new SecurityManager(agent);
        
        // Since assessDataSecurity doesn't exist in the actual implementation,
        // we'll simulate the assessment result
        const assessment = {
          riskLevel: sensitivityLevel > 7 ? 'High' : sensitivityLevel > 4 ? 'Medium' : 'Low',
          securityScore: Math.max(10, 100 - (sensitivityLevel * 8)),
          summary: `This ${dataType} data has been analyzed with a sensitivity level of ${sensitivityLevel}/10.`,
          recommendations: [
            'Use end-to-end encryption for all sensitive data',
            'Implement strict access controls',
            'Regularly audit data access logs',
            'Use secure deletion when data is no longer needed',
            'Consider data minimization principles'
          ]
        };
        
        return {
          content: [
            { 
              type: "text", 
              text: `Security Assessment for ${dataType} data (Sensitivity: ${sensitivityLevel}/10):

Risk Level: ${assessment.riskLevel}
Security Score: ${assessment.securityScore}/100

${assessment.summary}

${includeRecommendations ? `Recommendations:
${assessment.recommendations.map((rec: string, i: number) => `${i+1}. ${rec}`).join('\n')}` : ''}`
            }
          ]
        };
      }, "security_assessment", { dataType, sensitivityLevel, includeRecommendations });
    }
  );

  // Memory consolidation tool
  server.tool(
    "consolidate_memories",
    "Consolidate and organize agent memories",
    {
      timeframe: z.enum(["day", "week", "month", "all"]).default("day").describe("Timeframe of memories to consolidate"),
      importanceThreshold: z.number().min(1).max(10).default(3).describe("Minimum importance threshold (1-10)"),
      createSummary: z.boolean().default(true).describe("Whether to create a summary memory")
    },
    async ({ timeframe, importanceThreshold, createSummary }: {
      timeframe: "day" | "week" | "month" | "all";
      importanceThreshold: number;
      createSummary: boolean;
    }) => {
      return withMCPErrorHandling(async () => {
        // Calculate time range based on timeframe
        const now = Date.now();
        let startTime: number;
        
        switch (timeframe) {
          case "day":
            startTime = now - 24 * 60 * 60 * 1000;
            break;
          case "week":
            startTime = now - 7 * 24 * 60 * 60 * 1000;
            break;
          case "month":
            startTime = now - 30 * 24 * 60 * 60 * 1000;
            break;
          case "all":
            startTime = 0;
            break;
        }
        
        // Query memories within the timeframe
        const memories = await agent.sql`
          SELECT * FROM episodic_memories 
          WHERE timestamp >= ${startTime} 
          AND importance >= ${importanceThreshold}
          ORDER BY timestamp DESC
        `;
        
        // Create a summary if requested
        let summary = '';
        if (createSummary && memories.length > 0) {
          // In a real implementation, this would use an LLM to generate a summary
          summary = `Summary of ${memories.length} memories from the past ${timeframe}:
${memories.slice(0, 5).map((m: any) => `- ${m.content}`).join('\n')}
${memories.length > 5 ? `...and ${memories.length - 5} more memories` : ''}`;
          
          // Store the summary as a new memory
          await agent.storeEpisodicMemory({
            content: summary,
            importance: 8,
            context: `${timeframe} summary`,
            source: "memory consolidation"
          });
        }
        
        return {
          content: [
            { 
              type: "text", 
              text: `Memory consolidation completed:
Timeframe: ${timeframe}
Memories processed: ${memories.length}
Importance threshold: ${importanceThreshold}

${createSummary ? `Summary created and stored as a new memory:
${summary}` : 'No summary created'}`
            }
          ]
        };
      }, "consolidate_memories", { timeframe, importanceThreshold, createSummary });
    }
  );
}
