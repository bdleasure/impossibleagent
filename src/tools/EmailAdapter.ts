import { BaseMCPAdapter } from "./BaseMCPAdapter";
import type { MCPTool } from "./BaseMCPAdapter";
import { Agent } from "agents";
import { z } from "zod";

/**
 * Interface for email message
 */
export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  date: string;
  read: boolean;
  labels?: string[];
  threadId?: string;
}

/**
 * Interface for email draft
 */
export interface EmailDraft {
  id: string;
  subject: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  created: string;
  updated: string;
}

/**
 * EmailAdapter provides tools for interacting with email services
 * through the MCP protocol
 */
export class EmailAdapter<Env> extends BaseMCPAdapter<Env> {
  private serverId: string | null = null;
  
  /**
   * Create a new EmailAdapter instance
   * @param agent The agent instance to use for MCP connections
   */
  constructor(agent: Agent<Env>) {
    super(agent);
  }
  
  /**
   * Initialize the email adapter by connecting to an email service
   * @param emailServiceUrl URL of the email service to connect to
   * @returns Connection details
   */
  async initialize(emailServiceUrl: string): Promise<{ id: string; authUrl?: string }> {
    const connection = await this.connectToService(emailServiceUrl);
    this.serverId = connection.id;
    return connection;
  }
  
  /**
   * Get all available email tools
   * @returns Array of email tools
   */
  getEmailTools(): MCPTool[] {
    if (!this.serverId) {
      return [];
    }
    
    return this.listTools(this.serverId);
  }
  
  /**
   * Send an email
   * @param email Email details
   * @returns Sent email details
   */
  async sendEmail(email: {
    subject: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    body: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
  }): Promise<{ id: string; threadId?: string }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "sendEmail", email);
    return result;
  }
  
  /**
   * Get emails from the inbox
   * @param params Query parameters
   * @returns Array of email messages
   */
  async getEmails(params: {
    folder?: string;
    unreadOnly?: boolean;
    from?: string;
    to?: string;
    subject?: string;
    since?: string;
    limit?: number;
    labels?: string[];
  } = {}): Promise<EmailMessage[]> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getEmails", params);
    return result;
  }
  
  /**
   * Get a specific email by ID
   * @param emailId ID of the email to get
   * @returns Email message
   */
  async getEmail(emailId: string): Promise<EmailMessage> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getEmail", { emailId });
    return result;
  }
  
  /**
   * Mark an email as read
   * @param emailId ID of the email to mark as read
   * @returns Success status
   */
  async markAsRead(emailId: string): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "markAsRead", { emailId });
    return result;
  }
  
  /**
   * Mark an email as unread
   * @param emailId ID of the email to mark as unread
   * @returns Success status
   */
  async markAsUnread(emailId: string): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "markAsUnread", { emailId });
    return result;
  }
  
  /**
   * Create a draft email
   * @param draft Draft email details
   * @returns Created draft
   */
  async createDraft(draft: {
    subject: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    body: string;
    html?: string;
  }): Promise<EmailDraft> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "createDraft", draft);
    return result;
  }
  
  /**
   * Update a draft email
   * @param draftId ID of the draft to update
   * @param updates Updates to apply to the draft
   * @returns Updated draft
   */
  async updateDraft(draftId: string, updates: {
    subject?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    body?: string;
    html?: string;
  }): Promise<EmailDraft> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "updateDraft", {
      draftId,
      ...updates
    });
    
    return result;
  }
  
  /**
   * Send a draft email
   * @param draftId ID of the draft to send
   * @returns Sent email details
   */
  async sendDraft(draftId: string): Promise<{ id: string; threadId?: string }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "sendDraft", { draftId });
    return result;
  }
  
  /**
   * Delete a draft email
   * @param draftId ID of the draft to delete
   * @returns Success status
   */
  async deleteDraft(draftId: string): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "deleteDraft", { draftId });
    return result;
  }
  
  /**
   * Add labels to an email
   * @param emailId ID of the email to label
   * @param labels Labels to add
   * @returns Success status
   */
  async addLabels(emailId: string, labels: string[]): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "addLabels", { emailId, labels });
    return result;
  }
  
  /**
   * Remove labels from an email
   * @param emailId ID of the email to remove labels from
   * @param labels Labels to remove
   * @returns Success status
   */
  async removeLabels(emailId: string, labels: string[]): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "removeLabels", { emailId, labels });
    return result;
  }
  
  /**
   * Get all available labels
   * @returns Array of label names
   */
  async getLabels(): Promise<string[]> {
    if (!this.serverId) {
      throw new Error("Email adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getLabels", {});
    return result;
  }
  
  /**
   * Get the schema definitions for email tools
   * These would be used to define the tools for AI models
   */
  static getToolSchemas() {
    return {
      sendEmail: {
        description: "Send an email",
        parameters: z.object({
          subject: z.string().describe("Email subject"),
          to: z.array(z.string()).describe("Recipients' email addresses"),
          cc: z.array(z.string()).optional().describe("CC recipients' email addresses"),
          bcc: z.array(z.string()).optional().describe("BCC recipients' email addresses"),
          body: z.string().describe("Email body text"),
          html: z.string().optional().describe("Email HTML content (if different from body)"),
          attachments: z.array(
            z.object({
              filename: z.string().describe("Attachment filename"),
              content: z.string().describe("Base64-encoded attachment content"),
              contentType: z.string().describe("MIME type of the attachment")
            })
          ).optional().describe("Email attachments")
        })
      },
      
      getEmails: {
        description: "Get emails from the inbox",
        parameters: z.object({
          folder: z.string().optional().describe("Folder to search in (default: inbox)"),
          unreadOnly: z.boolean().optional().describe("Only return unread emails"),
          from: z.string().optional().describe("Filter by sender"),
          to: z.string().optional().describe("Filter by recipient"),
          subject: z.string().optional().describe("Filter by subject"),
          since: z.string().optional().describe("Filter by date (ISO format)"),
          limit: z.number().optional().describe("Maximum number of emails to return"),
          labels: z.array(z.string()).optional().describe("Filter by labels")
        })
      },
      
      getEmail: {
        description: "Get a specific email by ID",
        parameters: z.object({
          emailId: z.string().describe("ID of the email to get")
        })
      },
      
      markAsRead: {
        description: "Mark an email as read",
        parameters: z.object({
          emailId: z.string().describe("ID of the email to mark as read")
        })
      },
      
      markAsUnread: {
        description: "Mark an email as unread",
        parameters: z.object({
          emailId: z.string().describe("ID of the email to mark as unread")
        })
      },
      
      createDraft: {
        description: "Create a draft email",
        parameters: z.object({
          subject: z.string().describe("Email subject"),
          to: z.array(z.string()).describe("Recipients' email addresses"),
          cc: z.array(z.string()).optional().describe("CC recipients' email addresses"),
          bcc: z.array(z.string()).optional().describe("BCC recipients' email addresses"),
          body: z.string().describe("Email body text"),
          html: z.string().optional().describe("Email HTML content (if different from body)")
        })
      },
      
      updateDraft: {
        description: "Update a draft email",
        parameters: z.object({
          draftId: z.string().describe("ID of the draft to update"),
          subject: z.string().optional().describe("Email subject"),
          to: z.array(z.string()).optional().describe("Recipients' email addresses"),
          cc: z.array(z.string()).optional().describe("CC recipients' email addresses"),
          bcc: z.array(z.string()).optional().describe("BCC recipients' email addresses"),
          body: z.string().optional().describe("Email body text"),
          html: z.string().optional().describe("Email HTML content (if different from body)")
        })
      },
      
      sendDraft: {
        description: "Send a draft email",
        parameters: z.object({
          draftId: z.string().describe("ID of the draft to send")
        })
      },
      
      deleteDraft: {
        description: "Delete a draft email",
        parameters: z.object({
          draftId: z.string().describe("ID of the draft to delete")
        })
      },
      
      addLabels: {
        description: "Add labels to an email",
        parameters: z.object({
          emailId: z.string().describe("ID of the email to label"),
          labels: z.array(z.string()).describe("Labels to add")
        })
      },
      
      removeLabels: {
        description: "Remove labels from an email",
        parameters: z.object({
          emailId: z.string().describe("ID of the email to remove labels from"),
          labels: z.array(z.string()).describe("Labels to remove")
        })
      },
      
      getLabels: {
        description: "Get all available labels",
        parameters: z.object({})
      }
    };
  }
}
