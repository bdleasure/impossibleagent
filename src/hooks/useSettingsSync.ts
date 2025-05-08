import { useEffect, useState } from 'react';
import { useAgent } from 'agents/react';

/**
 * Interface for user settings
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    storeConversations: boolean;
    useLocation: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  display: {
    compactMode: boolean;
    showTimestamps: boolean;
    showAvatars: boolean;
  };
  [key: string]: any; // Allow for custom settings
}

/**
 * Default user settings
 */
const defaultSettings: UserSettings = {
  theme: 'system',
  fontSize: 'medium',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
  },
  privacy: {
    shareAnalytics: false,
    storeConversations: true,
    useLocation: false,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
  },
  display: {
    compactMode: false,
    showTimestamps: true,
    showAvatars: true,
  },
};

/**
 * Hook for synchronizing user settings across devices
 * 
 * This hook provides functionality for:
 * - Loading settings from local storage
 * - Synchronizing settings with the agent's server-side storage
 * - Updating settings and propagating changes to all devices
 * 
 * @returns Settings management functions and state
 */
export function useSettingsSync() {
  const agent = useAgent({ agent: 'personal' });
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load settings from local storage and sync with server
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setSyncError(null);
      
      try {
        // First try to load from local storage
        const localSettings = localStorage.getItem('user_settings');
        let currentSettings = defaultSettings;
        
        if (localSettings) {
          try {
            const parsedSettings = JSON.parse(localSettings);
            currentSettings = { ...defaultSettings, ...parsedSettings };
          } catch (e) {
            console.error('Failed to parse local settings:', e);
          }
        }
        
        // Then try to sync with server if agent is available
        if (agent) {
          setIsSyncing(true);
          
          try {
            const serverSettings = await agent.call('getUserSettings') as Partial<UserSettings>;
            const serverTimestamp = await agent.call('getSettingsTimestamp') as string;
            
            // If server has newer settings, use those
            if (serverSettings && serverTimestamp) {
              const localTimestamp = localStorage.getItem('settings_timestamp');
              
              if (!localTimestamp || new Date(serverTimestamp) > new Date(localTimestamp)) {
                currentSettings = { ...currentSettings, ...serverSettings };
                localStorage.setItem('user_settings', JSON.stringify(currentSettings));
                localStorage.setItem('settings_timestamp', serverTimestamp);
              }
            } else {
              // If server doesn't have settings, upload local ones
              await agent.call('updateUserSettings', [currentSettings]);
              await agent.call('updateSettingsTimestamp', [new Date().toISOString()]);
              localStorage.setItem('settings_timestamp', new Date().toISOString());
            }
            
            setLastSynced(new Date().toISOString());
          } catch (e) {
            console.error('Failed to sync settings with server:', e);
            setSyncError('Failed to sync settings with server');
          } finally {
            setIsSyncing(false);
          }
        }
        
        setSettings(currentSettings);
      } catch (e) {
        console.error('Error loading settings:', e);
        setSyncError('Error loading settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [agent]);

  /**
   * Update a specific setting and sync with server
   * @param path Path to the setting (e.g., 'theme', 'notifications.sound')
   * @param value New value for the setting
   * @returns Promise that resolves when setting is updated
   */
  const updateSetting = async (path: string, value: any): Promise<boolean> => {
    try {
      // Create a new settings object with the updated value
      const newSettings = { ...settings };
      const pathParts = path.split('.');
      
      if (pathParts.length === 1) {
        newSettings[path] = value;
      } else {
        let current: any = newSettings;
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
        }
        current[pathParts[pathParts.length - 1]] = value;
      }
      
      // Update local state
      setSettings(newSettings);
      
      // Save to local storage
      localStorage.setItem('user_settings', JSON.stringify(newSettings));
      const timestamp = new Date().toISOString();
      localStorage.setItem('settings_timestamp', timestamp);
      
      // Sync with server if agent is available
      if (agent) {
        setIsSyncing(true);
        setSyncError(null);
        
        try {
          await agent.call('updateUserSettings', [newSettings]);
          await agent.call('updateSettingsTimestamp', [timestamp]);
          setLastSynced(timestamp);
        } catch (e) {
          console.error('Failed to sync updated settings with server:', e);
          setSyncError('Failed to sync settings with server');
          setIsSyncing(false);
          return false;
        }
        
        setIsSyncing(false);
      }
      
      return true;
    } catch (e) {
      console.error('Error updating setting:', e);
      return false;
    }
  };

  /**
   * Force a sync with the server
   * @returns Promise that resolves when sync is complete
   */
  const syncSettings = async (): Promise<boolean> => {
    if (!agent) return false;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Get server settings
      const serverSettings = await agent.call('getUserSettings') as Partial<UserSettings>;
      const serverTimestamp = await agent.call('getSettingsTimestamp') as string;
      const localTimestamp = localStorage.getItem('settings_timestamp');
      
      // Determine which settings to use based on timestamps
      if (serverSettings && serverTimestamp && localTimestamp) {
        if (new Date(serverTimestamp) > new Date(localTimestamp)) {
          // Server has newer settings
          const mergedSettings = { ...settings, ...serverSettings };
          setSettings(mergedSettings);
          localStorage.setItem('user_settings', JSON.stringify(mergedSettings));
          localStorage.setItem('settings_timestamp', serverTimestamp);
        } else {
          // Local has newer settings
          await agent.call('updateUserSettings', [settings]);
          await agent.call('updateSettingsTimestamp', [localTimestamp]);
        }
      } else {
        // No server settings, upload local ones
        await agent.call('updateUserSettings', [settings]);
        const timestamp = new Date().toISOString();
        await agent.call('updateSettingsTimestamp', [timestamp]);
        localStorage.setItem('settings_timestamp', timestamp);
      }
      
      setLastSynced(new Date().toISOString());
      return true;
    } catch (e) {
      console.error('Failed to sync settings:', e);
      setSyncError('Failed to sync settings');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Reset settings to defaults
   * @returns Promise that resolves when settings are reset
   */
  const resetSettings = async (): Promise<boolean> => {
    try {
      setSettings(defaultSettings);
      localStorage.setItem('user_settings', JSON.stringify(defaultSettings));
      const timestamp = new Date().toISOString();
      localStorage.setItem('settings_timestamp', timestamp);
      
      if (agent) {
        setIsSyncing(true);
        
        try {
          await agent.call('updateUserSettings', [defaultSettings]);
          await agent.call('updateSettingsTimestamp', [timestamp]);
          setLastSynced(timestamp);
        } catch (e) {
          console.error('Failed to sync reset settings with server:', e);
          setSyncError('Failed to sync reset settings with server');
          setIsSyncing(false);
          return false;
        }
        
        setIsSyncing(false);
      }
      
      return true;
    } catch (e) {
      console.error('Error resetting settings:', e);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    isSyncing,
    lastSynced,
    syncError,
    updateSetting,
    syncSettings,
    resetSettings
  };
}
