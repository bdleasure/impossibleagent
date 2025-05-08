/**
 * TemporalContextManager for the ImpossibleAgent
 * Responsible for tracking and providing temporal context for memory operations
 */

/**
 * Interface for temporal context
 */
export interface TemporalContext {
  /**
   * Current timestamp
   */
  timestamp: number;
  
  /**
   * Current date information
   */
  date: {
    year: number;
    month: number;
    day: number;
    dayOfWeek: number;
    hour: number;
    minute: number;
  };
  
  /**
   * Time-based context
   */
  timeContext: {
    isWeekend: boolean;
    isWorkHours: boolean;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    season: "spring" | "summer" | "fall" | "winter";
  };
  
  /**
   * Recent activity context
   */
  recentActivity?: {
    lastInteractionType?: string;
    lastInteractionTimestamp?: number;
    activeSession?: boolean;
    sessionDuration?: number;
  };
  
  /**
   * User location context if available
   */
  location?: {
    timezone?: string;
    region?: string;
    isHome?: boolean;
    isWork?: boolean;
  };
}

/**
 * TemporalContextManager class for tracking and providing temporal context
 */
export class TemporalContextManager {
  private lastContext: TemporalContext | null = null;
  private updateInterval: number = 15 * 60 * 1000; // 15 minutes
  private lastUpdateTime: number = 0;
  
  constructor(options: any = {}) {
    this.updateInterval = options.updateInterval || this.updateInterval;
    
    // Initialize context
    this.updateContext();
  }

  /**
   * Get the current temporal context
   */
  async getCurrentContext(): Promise<TemporalContext> {
    const now = Date.now();
    
    // Update context if it's stale
    if (!this.lastContext || now - this.lastUpdateTime > this.updateInterval) {
      await this.updateContext();
    }
    
    return this.lastContext!;
  }

  /**
   * Update the current context
   */
  private async updateContext(): Promise<void> {
    const now = Date.now();
    const date = new Date(now);
    
    // Create basic context
    const context: TemporalContext = {
      timestamp: now,
      date: {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12 instead of 0-11
        day: date.getDate(),
        dayOfWeek: date.getDay(), // 0-6, 0 is Sunday
        hour: date.getHours(),
        minute: date.getMinutes()
      },
      timeContext: {
        isWeekend: this.isWeekend(date),
        isWorkHours: this.isWorkHours(date),
        timeOfDay: this.getTimeOfDay(date),
        season: this.getSeason(date)
      }
    };
    
    // Add recent activity context if available
    if (this.lastContext && this.lastContext.recentActivity) {
      context.recentActivity = {
        ...this.lastContext.recentActivity,
        sessionDuration: this.lastContext.recentActivity.activeSession 
          ? (now - (this.lastContext.recentActivity.lastInteractionTimestamp || now)) 
          : 0
      };
    }
    
    // Add location context if available
    // In a real implementation, this would come from the user's device or settings
    context.location = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Update the context
    this.lastContext = context;
    this.lastUpdateTime = now;
  }

  /**
   * Record an interaction to update the recent activity context
   */
  async recordInteraction(type: string): Promise<void> {
    const now = Date.now();
    
    // Get current context
    const context = await this.getCurrentContext();
    
    // Update recent activity
    if (!context.recentActivity) {
      context.recentActivity = {};
    }
    
    const wasActive = context.recentActivity.activeSession || false;
    const lastTimestamp = context.recentActivity.lastInteractionTimestamp || 0;
    
    // Update activity data
    context.recentActivity.lastInteractionType = type;
    context.recentActivity.lastInteractionTimestamp = now;
    
    // Determine if this is part of an active session
    // If the last interaction was within 30 minutes, consider it the same session
    const isActiveSession = wasActive && (now - lastTimestamp < 30 * 60 * 1000);
    context.recentActivity.activeSession = true;
    
    // Update session duration if continuing a session
    if (isActiveSession) {
      context.recentActivity.sessionDuration = 
        (context.recentActivity.sessionDuration || 0) + (now - lastTimestamp);
    } else {
      // New session
      context.recentActivity.sessionDuration = 0;
    }
  }

  /**
   * Check if a date is on a weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  }

  /**
   * Check if a date is during work hours (9 AM - 5 PM, Monday-Friday)
   */
  private isWorkHours(date: Date): boolean {
    const day = date.getDay();
    const hour = date.getHours();
    
    // Not a work day
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Work hours: 9 AM - 5 PM
    return hour >= 9 && hour < 17;
  }

  /**
   * Get the time of day category
   */
  private getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" | "night" {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 12) {
      return "morning";
    } else if (hour >= 12 && hour < 17) {
      return "afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "evening";
    } else {
      return "night";
    }
  }

  /**
   * Get the current season (Northern Hemisphere)
   */
  private getSeason(date: Date): "spring" | "summer" | "fall" | "winter" {
    const month = date.getMonth(); // 0-11
    
    if (month >= 2 && month < 5) {
      return "spring"; // March-May
    } else if (month >= 5 && month < 8) {
      return "summer"; // June-August
    } else if (month >= 8 && month < 11) {
      return "fall"; // September-November
    } else {
      return "winter"; // December-February
    }
  }
}
