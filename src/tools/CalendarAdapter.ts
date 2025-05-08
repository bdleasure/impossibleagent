import { BaseMCPAdapter } from "./BaseMCPAdapter";
import type { MCPTool } from "./BaseMCPAdapter";
import { Agent } from "agents";
import { z } from "zod";

/**
 * Interface for calendar event
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
  recurrence?: string;
  reminders?: { type: string; minutes: number }[];
  color?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
}

/**
 * CalendarAdapter provides tools for interacting with calendar services
 * through the MCP protocol
 */
export class CalendarAdapter<Env> extends BaseMCPAdapter<Env> {
  private serverId: string | null = null;
  
  /**
   * Create a new CalendarAdapter instance
   * @param agent The agent instance to use for MCP connections
   */
  constructor(agent: Agent<Env>) {
    super(agent);
  }
  
  /**
   * Initialize the calendar adapter by connecting to a calendar service
   * @param calendarServiceUrl URL of the calendar service to connect to
   * @returns Connection details
   */
  async initialize(calendarServiceUrl: string): Promise<{ id: string; authUrl?: string }> {
    const connection = await this.connectToService(calendarServiceUrl);
    this.serverId = connection.id;
    return connection;
  }
  
  /**
   * Get all available calendar tools
   * @returns Array of calendar tools
   */
  getCalendarTools(): MCPTool[] {
    if (!this.serverId) {
      return [];
    }
    
    return this.listTools(this.serverId);
  }
  
  /**
   * Create a new calendar event
   * @param event Event details
   * @returns Created event
   */
  async createEvent(event: {
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
    location?: string;
    attendees?: string[];
    recurrence?: string;
    reminders?: { type: string; minutes: number }[];
  }): Promise<CalendarEvent> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "createEvent", event);
    return result;
  }
  
  /**
   * Get events from the calendar
   * @param params Query parameters
   * @returns Array of calendar events
   */
  async getEvents(params: {
    startDate?: string;
    endDate?: string;
    maxResults?: number;
    query?: string;
  } = {}): Promise<CalendarEvent[]> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getEvents", params);
    return result;
  }
  
  /**
   * Get a specific event by ID
   * @param eventId ID of the event to get
   * @returns Calendar event
   */
  async getEvent(eventId: string): Promise<CalendarEvent> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getEvent", { eventId });
    return result;
  }
  
  /**
   * Update an existing calendar event
   * @param eventId ID of the event to update
   * @param updates Updates to apply to the event
   * @returns Updated event
   */
  async updateEvent(eventId: string, updates: {
    title?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    attendees?: string[];
    recurrence?: string;
    reminders?: { type: string; minutes: number }[];
    status?: 'confirmed' | 'tentative' | 'cancelled';
  }): Promise<CalendarEvent> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "updateEvent", {
      eventId,
      ...updates
    });
    
    return result;
  }
  
  /**
   * Delete a calendar event
   * @param eventId ID of the event to delete
   * @returns Success status
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean }> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "deleteEvent", { eventId });
    return result;
  }
  
  /**
   * Find available time slots for a meeting
   * @param params Query parameters
   * @returns Array of available time slots
   */
  async findAvailableSlots(params: {
    duration: number; // in minutes
    startDate: string;
    endDate: string;
    attendees: string[];
    timeZone?: string;
  }): Promise<Array<{ start: string; end: string }>> {
    if (!this.serverId) {
      throw new Error("Calendar adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "findAvailableSlots", params);
    return result;
  }
  
  /**
   * Get the schema definitions for calendar tools
   * These would be used to define the tools for AI models
   */
  static getToolSchemas() {
    return {
      createEvent: {
        description: "Create a new calendar event",
        parameters: z.object({
          title: z.string().describe("Event title"),
          startTime: z.string().describe("Start time in ISO format"),
          endTime: z.string().describe("End time in ISO format"),
          description: z.string().optional().describe("Event description"),
          location: z.string().optional().describe("Event location"),
          attendees: z.array(z.string()).optional().describe("List of attendee email addresses"),
          recurrence: z.string().optional().describe("Recurrence rule (e.g., 'RRULE:FREQ=WEEKLY;COUNT=10')"),
          reminders: z.array(
            z.object({
              type: z.string().describe("Reminder type (e.g., 'email', 'notification')"),
              minutes: z.number().describe("Minutes before event to send reminder")
            })
          ).optional().describe("Event reminders")
        })
      },
      
      getEvents: {
        description: "Get events from the calendar",
        parameters: z.object({
          startDate: z.string().optional().describe("Start date in ISO format"),
          endDate: z.string().optional().describe("End date in ISO format"),
          maxResults: z.number().optional().describe("Maximum number of events to return"),
          query: z.string().optional().describe("Search query")
        })
      },
      
      getEvent: {
        description: "Get a specific calendar event by ID",
        parameters: z.object({
          eventId: z.string().describe("ID of the event to get")
        })
      },
      
      updateEvent: {
        description: "Update an existing calendar event",
        parameters: z.object({
          eventId: z.string().describe("ID of the event to update"),
          title: z.string().optional().describe("Event title"),
          startTime: z.string().optional().describe("Start time in ISO format"),
          endTime: z.string().optional().describe("End time in ISO format"),
          description: z.string().optional().describe("Event description"),
          location: z.string().optional().describe("Event location"),
          attendees: z.array(z.string()).optional().describe("List of attendee email addresses"),
          recurrence: z.string().optional().describe("Recurrence rule"),
          reminders: z.array(
            z.object({
              type: z.string(),
              minutes: z.number()
            })
          ).optional().describe("Event reminders"),
          status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().describe("Event status")
        })
      },
      
      deleteEvent: {
        description: "Delete a calendar event",
        parameters: z.object({
          eventId: z.string().describe("ID of the event to delete")
        })
      },
      
      findAvailableSlots: {
        description: "Find available time slots for a meeting",
        parameters: z.object({
          duration: z.number().describe("Duration in minutes"),
          startDate: z.string().describe("Start date in ISO format"),
          endDate: z.string().describe("End date in ISO format"),
          attendees: z.array(z.string()).describe("List of attendee email addresses"),
          timeZone: z.string().optional().describe("Time zone (e.g., 'America/New_York')")
        })
      }
    };
  }
}
