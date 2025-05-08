import { BaseMCPAdapter } from "./BaseMCPAdapter";
import type { MCPTool } from "./BaseMCPAdapter";
import { Agent } from "agents";
import { z } from "zod";

/**
 * Interface for document metadata
 */
export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  size: number;
  mimeType: string;
  owner: string;
  sharedWith?: string[];
  version: number;
  status: "active" | "archived" | "deleted";
}

/**
 * Interface for document content
 */
export interface DocumentContent {
  id: string;
  content: string;
  contentType: "text" | "markdown" | "html" | "binary";
  encoding?: string;
}

/**
 * DocumentStorageAdapter provides tools for interacting with document storage services
 * through the MCP protocol
 */
export class DocumentStorageAdapter<Env> extends BaseMCPAdapter<Env> {
  private serverId: string | null = null;
  
  /**
   * Create a new DocumentStorageAdapter instance
   * @param agent The agent instance to use for MCP connections
   */
  constructor(agent: Agent<Env>) {
    super(agent);
  }
  
  /**
   * Initialize the document storage adapter by connecting to a document service
   * @param documentServiceUrl URL of the document service to connect to
   * @returns Connection details
   */
  async initialize(documentServiceUrl: string): Promise<{ id: string; authUrl?: string }> {
    const connection = await this.connectToService(documentServiceUrl);
    this.serverId = connection.id;
    return connection;
  }
  
  /**
   * Get all available document storage tools
   * @returns Array of document storage tools
   */
  getDocumentTools(): MCPTool[] {
    if (!this.serverId) {
      return [];
    }
    
    return this.listTools(this.serverId);
  }
  
  /**
   * Create a new document
   * @param document Document details
   * @returns Created document metadata
   */
  async createDocument(document: {
    title: string;
    content: string;
    contentType: "text" | "markdown" | "html" | "binary";
    description?: string;
    tags?: string[];
  }): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "createDocument", document);
    return result;
  }
  
  /**
   * Get document metadata
   * @param documentId ID of the document to get
   * @returns Document metadata
   */
  async getDocumentMetadata(documentId: string): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getDocumentMetadata", { documentId });
    return result;
  }
  
  /**
   * Get document content
   * @param documentId ID of the document to get
   * @returns Document content
   */
  async getDocumentContent(documentId: string): Promise<DocumentContent> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getDocumentContent", { documentId });
    return result;
  }
  
  /**
   * Update document content
   * @param documentId ID of the document to update
   * @param content New content
   * @returns Updated document metadata
   */
  async updateDocumentContent(documentId: string, content: string): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "updateDocumentContent", {
      documentId,
      content
    });
    
    return result;
  }
  
  /**
   * Update document metadata
   * @param documentId ID of the document to update
   * @param updates Updates to apply to the document metadata
   * @returns Updated document metadata
   */
  async updateDocumentMetadata(documentId: string, updates: {
    title?: string;
    description?: string;
    tags?: string[];
    status?: "active" | "archived" | "deleted";
  }): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "updateDocumentMetadata", {
      documentId,
      ...updates
    });
    
    return result;
  }
  
  /**
   * Delete a document
   * @param documentId ID of the document to delete
   * @returns Success status
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "deleteDocument", { documentId });
    return result;
  }
  
  /**
   * Archive a document
   * @param documentId ID of the document to archive
   * @returns Updated document metadata
   */
  async archiveDocument(documentId: string): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "archiveDocument", { documentId });
    return result;
  }
  
  /**
   * Restore a document from archive
   * @param documentId ID of the document to restore
   * @returns Updated document metadata
   */
  async restoreDocument(documentId: string): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "restoreDocument", { documentId });
    return result;
  }
  
  /**
   * Share a document with other users
   * @param documentId ID of the document to share
   * @param users Users to share with
   * @returns Updated document metadata
   */
  async shareDocument(documentId: string, users: string[]): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "shareDocument", {
      documentId,
      users
    });
    
    return result;
  }
  
  /**
   * Unshare a document with users
   * @param documentId ID of the document to unshare
   * @param users Users to remove sharing with
   * @returns Updated document metadata
   */
  async unshareDocument(documentId: string, users: string[]): Promise<DocumentMetadata> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "unshareDocument", {
      documentId,
      users
    });
    
    return result;
  }
  
  /**
   * Search for documents
   * @param query Search parameters
   * @returns Array of document metadata
   */
  async searchDocuments(query: {
    query?: string;
    tags?: string[];
    owner?: string;
    status?: "active" | "archived" | "deleted";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    limit?: number;
  } = {}): Promise<DocumentMetadata[]> {
    if (!this.serverId) {
      throw new Error("Document storage adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "searchDocuments", query);
    return result;
  }
  
  /**
   * Get the schema definitions for document storage tools
   * These would be used to define the tools for AI models
   */
  static getToolSchemas() {
    return {
      createDocument: {
        description: "Create a new document",
        parameters: z.object({
          title: z.string().describe("Document title"),
          content: z.string().describe("Document content"),
          contentType: z.enum(["text", "markdown", "html", "binary"]).describe("Content type"),
          description: z.string().optional().describe("Document description"),
          tags: z.array(z.string()).optional().describe("Document tags")
        })
      },
      
      getDocumentMetadata: {
        description: "Get document metadata",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to get")
        })
      },
      
      getDocumentContent: {
        description: "Get document content",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to get")
        })
      },
      
      updateDocumentContent: {
        description: "Update document content",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to update"),
          content: z.string().describe("New content")
        })
      },
      
      updateDocumentMetadata: {
        description: "Update document metadata",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to update"),
          title: z.string().optional().describe("Document title"),
          description: z.string().optional().describe("Document description"),
          tags: z.array(z.string()).optional().describe("Document tags"),
          status: z.enum(["active", "archived", "deleted"]).optional().describe("Document status")
        })
      },
      
      deleteDocument: {
        description: "Delete a document",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to delete")
        })
      },
      
      archiveDocument: {
        description: "Archive a document",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to archive")
        })
      },
      
      restoreDocument: {
        description: "Restore a document from archive",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to restore")
        })
      },
      
      shareDocument: {
        description: "Share a document with other users",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to share"),
          users: z.array(z.string()).describe("Users to share with")
        })
      },
      
      unshareDocument: {
        description: "Unshare a document with users",
        parameters: z.object({
          documentId: z.string().describe("ID of the document to unshare"),
          users: z.array(z.string()).describe("Users to remove sharing with")
        })
      },
      
      searchDocuments: {
        description: "Search for documents",
        parameters: z.object({
          query: z.string().optional().describe("Search query"),
          tags: z.array(z.string()).optional().describe("Filter by tags"),
          owner: z.string().optional().describe("Filter by owner"),
          status: z.enum(["active", "archived", "deleted"]).optional().describe("Filter by status"),
          createdAfter: z.string().optional().describe("Filter by creation date (ISO format)"),
          createdBefore: z.string().optional().describe("Filter by creation date (ISO format)"),
          updatedAfter: z.string().optional().describe("Filter by update date (ISO format)"),
          updatedBefore: z.string().optional().describe("Filter by update date (ISO format)"),
          limit: z.number().optional().describe("Maximum number of results to return")
        })
      }
    };
  }
}
