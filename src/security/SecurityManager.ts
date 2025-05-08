import { Agent } from "agents";

/**
 * Interface for access control rules
 */
export interface AccessControlRule {
  id: string;
  resource: string;
  action: string;
  role: string;
  condition?: string;
  priority: number;
  effect: 'allow' | 'deny';
  created: number;
  updated: number;
}

/**
 * Interface for security audit log entries
 */
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * SecurityManager handles security-related functionality for the agent
 * including access control, audit logging, and privacy settings
 */
export class SecurityManager<Env> {
  /**
   * Create a new SecurityManager instance
   * @param agent The agent instance to manage security for
   */
  constructor(private agent: Agent<Env>) {}

  /**
   * Initialize the security manager with necessary database tables
   */
  async initialize() {
    // Create access control rules table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS access_control_rules (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        role TEXT NOT NULL,
        condition TEXT,
        priority INTEGER NOT NULL,
        effect TEXT NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )
    `;

    // Create audit log table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT
      )
    `;

    // Create privacy settings table
    await this.agent.sql`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        user_id TEXT PRIMARY KEY,
        data_retention_days INTEGER NOT NULL DEFAULT 365,
        share_data BOOLEAN NOT NULL DEFAULT 0,
        store_history BOOLEAN NOT NULL DEFAULT 1,
        allow_analytics BOOLEAN NOT NULL DEFAULT 0,
        allow_third_party BOOLEAN NOT NULL DEFAULT 0,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )
    `;

    // Create indexes for better performance
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_acl_resource_action ON access_control_rules(resource, action)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)`;
    await this.agent.sql`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id)`;
  }

  /**
   * Create a new access control rule
   * @param rule The rule to create
   * @returns The ID of the created rule
   */
  async createAccessControlRule(rule: {
    resource: string;
    action: string;
    role: string;
    condition?: string;
    priority: number;
    effect: 'allow' | 'deny';
  }): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.agent.sql`
      INSERT INTO access_control_rules (
        id, resource, action, role, condition, priority, effect, created, updated
      ) VALUES (
        ${id},
        ${rule.resource},
        ${rule.action},
        ${rule.role},
        ${rule.condition || null},
        ${rule.priority},
        ${rule.effect},
        ${timestamp},
        ${timestamp}
      )
    `;
    
    return id;
  }

  /**
   * Check if an action is allowed based on access control rules
   * @param params Parameters for the access check
   * @returns Whether the action is allowed
   */
  async isAllowed(params: {
    userId: string;
    resource: string;
    action: string;
    role: string;
    context?: Record<string, any>;
  }): Promise<boolean> {
    // Get all matching rules for this resource and action
    const rules = await this.agent.sql`
      SELECT * FROM access_control_rules
      WHERE 
        (resource = ${params.resource} OR resource = '*') AND
        (action = ${params.action} OR action = '*') AND
        (role = ${params.role} OR role = '*')
      ORDER BY priority DESC
    `;
    
    if (rules.length === 0) {
      // Default deny if no rules match
      return false;
    }
    
    // Evaluate rules in priority order
    for (const rule of rules) {
      // If there's a condition, evaluate it
      if (rule.condition) {
        try {
          // In a real implementation, we would use a proper expression evaluator
          // For now, we'll just check if the condition is a simple equality check
          const condition = rule.condition as string;
          
          if (condition.includes('==')) {
            const [key, value] = condition.split('==').map(s => s.trim());
            
            // If the context doesn't have this key or the value doesn't match, skip this rule
            if (!params.context || params.context[key] !== value) {
              continue;
            }
          }
        } catch (error) {
          console.error("Error evaluating condition:", error);
          continue;
        }
      }
      
      // Return the effect of the first matching rule
      return (rule.effect as string) === 'allow';
    }
    
    // Default deny if no rules match
    return false;
  }

  /**
   * Log an audit entry
   * @param entry The audit log entry to create
   * @returns The ID of the created entry
   */
  async logAudit(entry: {
    userId: string;
    action: string;
    resource: string;
    status: 'success' | 'failure';
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.agent.sql`
      INSERT INTO audit_log (
        id, timestamp, user_id, action, resource, status, details, ip_address, user_agent
      ) VALUES (
        ${id},
        ${timestamp},
        ${entry.userId},
        ${entry.action},
        ${entry.resource},
        ${entry.status},
        ${entry.details || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null}
      )
    `;
    
    return id;
  }

  /**
   * Get audit log entries for a user
   * @param userId ID of the user to get audit logs for
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Array of audit log entries
   */
  async getAuditLogs(userId: string, limit: number = 50, offset: number = 0): Promise<AuditLogEntry[]> {
    const entries = await this.agent.sql`
      SELECT * FROM audit_log
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return entries.map(entry => ({
      id: entry.id as string,
      timestamp: entry.timestamp as number,
      userId: entry.user_id as string,
      action: entry.action as string,
      resource: entry.resource as string,
      status: entry.status as 'success' | 'failure',
      details: entry.details as string | undefined,
      ipAddress: entry.ip_address as string | undefined,
      userAgent: entry.user_agent as string | undefined
    }));
  }

  /**
   * Set privacy settings for a user
   * @param userId ID of the user to set privacy settings for
   * @param settings Privacy settings to set
   * @returns Success status
   */
  async setPrivacySettings(userId: string, settings: {
    dataRetentionDays?: number;
    shareData?: boolean;
    storeHistory?: boolean;
    allowAnalytics?: boolean;
    allowThirdParty?: boolean;
  }): Promise<boolean> {
    const timestamp = Date.now();
    
    // Check if settings already exist for this user
    const existingSettings = await this.agent.sql`
      SELECT * FROM privacy_settings WHERE user_id = ${userId}
    `;
    
    if (existingSettings.length === 0) {
      // Create new settings
      await this.agent.sql`
        INSERT INTO privacy_settings (
          user_id, 
          data_retention_days, 
          share_data, 
          store_history, 
          allow_analytics, 
          allow_third_party, 
          created, 
          updated
        ) VALUES (
          ${userId},
          ${settings.dataRetentionDays !== undefined ? settings.dataRetentionDays : 365},
          ${settings.shareData !== undefined ? (settings.shareData ? 1 : 0) : 0},
          ${settings.storeHistory !== undefined ? (settings.storeHistory ? 1 : 0) : 1},
          ${settings.allowAnalytics !== undefined ? (settings.allowAnalytics ? 1 : 0) : 0},
          ${settings.allowThirdParty !== undefined ? (settings.allowThirdParty ? 1 : 0) : 0},
          ${timestamp},
          ${timestamp}
        )
      `;
    } else {
      // Update existing settings
      const updates = [];
      
      if (settings.dataRetentionDays !== undefined) {
        updates.push(`data_retention_days = ${settings.dataRetentionDays}`);
      }
      
      if (settings.shareData !== undefined) {
        updates.push(`share_data = ${settings.shareData ? 1 : 0}`);
      }
      
      if (settings.storeHistory !== undefined) {
        updates.push(`store_history = ${settings.storeHistory ? 1 : 0}`);
      }
      
      if (settings.allowAnalytics !== undefined) {
        updates.push(`allow_analytics = ${settings.allowAnalytics ? 1 : 0}`);
      }
      
      if (settings.allowThirdParty !== undefined) {
        updates.push(`allow_third_party = ${settings.allowThirdParty ? 1 : 0}`);
      }
      
      updates.push(`updated = ${timestamp}`);
      
      if (updates.length > 1) {
        const setClause = updates.join(", ");
        
        await this.agent.sql`
          UPDATE privacy_settings
          SET ${setClause}
          WHERE user_id = ${userId}
        `;
      }
    }
    
    return true;
  }

  /**
   * Get privacy settings for a user
   * @param userId ID of the user to get privacy settings for
   * @returns Privacy settings for the user
   */
  async getPrivacySettings(userId: string): Promise<{
    dataRetentionDays: number;
    shareData: boolean;
    storeHistory: boolean;
    allowAnalytics: boolean;
    allowThirdParty: boolean;
    created: number;
    updated: number;
  } | null> {
    const settings = await this.agent.sql`
      SELECT * FROM privacy_settings WHERE user_id = ${userId}
    `;
    
    if (settings.length === 0) {
      return null;
    }
    
    const setting = settings[0];
    
    return {
      dataRetentionDays: setting.data_retention_days as number,
      shareData: Boolean(setting.share_data),
      storeHistory: Boolean(setting.store_history),
      allowAnalytics: Boolean(setting.allow_analytics),
      allowThirdParty: Boolean(setting.allow_third_party),
      created: setting.created as number,
      updated: setting.updated as number
    };
  }

  /**
   * Clean up old data based on retention policies
   * This would typically be run as a scheduled task
   */
  async cleanupOldData(): Promise<{
    auditLogsDeleted: number;
    memoriesDeleted: number;
  }> {
    // Get all users with their retention settings
    const users = await this.agent.sql`
      SELECT user_id, data_retention_days FROM privacy_settings
    `;
    
    let auditLogsDeleted = 0;
    let memoriesDeleted = 0;
    
    for (const user of users) {
      const userId = user.user_id as string;
      const retentionDays = user.data_retention_days as number;
      const cutoffTimestamp = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      // Delete old audit logs
      const auditResult = await this.agent.sql`
        DELETE FROM audit_log
        WHERE user_id = ${userId} AND timestamp < ${cutoffTimestamp}
      `;
      
      // In a real implementation, we would get the count of deleted rows
      // For now, we'll just increment by 1 if any rows were deleted
      auditLogsDeleted += auditResult.length > 0 ? 1 : 0;
      
      // In a real implementation, we would also delete old memories
      // This is just a placeholder
      // const memoryResult = await this.agent.sql`
      //   DELETE FROM episodic_memories
      //   WHERE user_id = ${userId} AND timestamp < ${cutoffTimestamp}
      // `;
      // 
      // memoriesDeleted += memoryResult.count || 0;
    }
    
    return {
      auditLogsDeleted,
      memoriesDeleted
    };
  }

  /**
   * Encrypt sensitive data
   * @param data Data to encrypt
   * @param key Encryption key
   * @returns Encrypted data
   */
  encryptData(data: string, key: string): string {
    // In a real implementation, we would use a proper encryption algorithm
    // For now, this is just a placeholder
    return `encrypted:${data}`;
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData Encrypted data
   * @param key Encryption key
   * @returns Decrypted data
   */
  decryptData(encryptedData: string, key: string): string {
    // In a real implementation, we would use a proper decryption algorithm
    // For now, this is just a placeholder
    if (encryptedData.startsWith('encrypted:')) {
      return encryptedData.substring(10);
    }
    
    return encryptedData;
  }

  /**
   * Hash a password
   * @param password Password to hash
   * @returns Hashed password
   */
  hashPassword(password: string): string {
    // In a real implementation, we would use a proper password hashing algorithm
    // For now, this is just a placeholder
    return `hashed:${password}`;
  }

  /**
   * Verify a password against a hash
   * @param password Password to verify
   * @param hash Hash to verify against
   * @returns Whether the password matches the hash
   */
  verifyPassword(password: string, hash: string): boolean {
    // In a real implementation, we would use a proper password verification algorithm
    // For now, this is just a placeholder
    return hash === `hashed:${password}`;
  }
}
