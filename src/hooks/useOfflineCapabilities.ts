import { useEffect, useState } from 'react';
import { useAgent } from 'agents/react';

/**
 * Interface for offline message
 */
export interface OfflineMessage {
  id: string;
  content: string;
  timestamp: string;
  pending: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for offline state
 */
export interface OfflineState {
  isOnline: boolean;
  pendingMessages: OfflineMessage[];
  lastSyncTimestamp: string | null;
  offlineMode: 'auto' | 'always' | 'never';
  offlineCapabilities: {
    basicResponses: boolean;
    toolExecution: boolean;
    memoryAccess: boolean;
  };
}

/**
 * Hook for managing offline capabilities
 * 
 * This hook provides functionality for:
 * - Detecting online/offline status
 * - Queuing messages when offline
 * - Syncing messages when back online
 * - Managing offline mode preferences
 * 
 * @returns Offline capabilities management functions and state
 */
export function useOfflineCapabilities() {
  const agent = useAgent({ agent: 'personal' });
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingMessages: [],
    lastSyncTimestamp: null,
    offlineMode: 'auto',
    offlineCapabilities: {
      basicResponses: true,
      toolExecution: false,
      memoryAccess: true,
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load offline state from local storage
  useEffect(() => {
    const loadOfflineState = () => {
      const storedState = localStorage.getItem('offline_state');
      if (storedState) {
        try {
          const parsedState = JSON.parse(storedState);
          setOfflineState(prevState => ({
            ...prevState,
            offlineMode: parsedState.offlineMode || 'auto',
            offlineCapabilities: {
              ...prevState.offlineCapabilities,
              ...(parsedState.offlineCapabilities || {})
            },
            lastSyncTimestamp: parsedState.lastSyncTimestamp || null
          }));
        } catch (e) {
          console.error('Failed to parse offline state:', e);
        }
      }
    };

    loadOfflineState();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineState(prevState => ({
        ...prevState,
        isOnline: true
      }));
      
      // Attempt to sync pending messages
      if (offlineState.pendingMessages.length > 0) {
        syncPendingMessages();
      }
    };

    const handleOffline = () => {
      setOfflineState(prevState => ({
        ...prevState,
        isOnline: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineState.pendingMessages]);

  // Load pending messages from IndexedDB
  useEffect(() => {
    const loadPendingMessages = async () => {
      try {
        const db = await openDatabase();
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();

        request.onsuccess = () => {
          const messages = request.result as OfflineMessage[];
          setOfflineState(prevState => ({
            ...prevState,
            pendingMessages: messages
          }));
        };

        request.onerror = () => {
          console.error('Failed to load pending messages:', request.error);
        };
      } catch (e) {
        console.error('Error accessing IndexedDB:', e);
      }
    };

    loadPendingMessages();
  }, []);

  // Helper function to open IndexedDB
  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('impossibleagent_offline', 1);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('memory_cache')) {
          db.createObjectStore('memory_cache', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Send a message, queuing it if offline
   * @param content Message content
   * @param metadata Optional metadata
   * @returns Promise that resolves with the message ID
   */
  const sendMessage = async (content: string, metadata?: Record<string, any>): Promise<string> => {
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const message: OfflineMessage = {
      id: messageId,
      content,
      timestamp,
      pending: true,
      metadata
    };

    // If online and not in always-offline mode, send immediately
    if (offlineState.isOnline && offlineState.offlineMode !== 'always') {
      try {
        if (agent) {
          await agent.call('sendMessage', [content, metadata]);
          
          // Update message as sent
          setOfflineState(prevState => ({
            ...prevState,
            pendingMessages: [
              ...prevState.pendingMessages.filter(m => m.id !== messageId),
              { ...message, pending: false }
            ]
          }));
          
          // Store in IndexedDB for history
          await storeMessage({ ...message, pending: false });
        } else {
          throw new Error('Agent not available');
        }
      } catch (e) {
        console.error('Failed to send message:', e);
        
        // Queue message for later
        setOfflineState(prevState => ({
          ...prevState,
          pendingMessages: [...prevState.pendingMessages, message]
        }));
        
        // Store in IndexedDB
        await storeMessage(message);
      }
    } else {
      // Queue message for later
      setOfflineState(prevState => ({
        ...prevState,
        pendingMessages: [...prevState.pendingMessages, message]
      }));
      
      // Store in IndexedDB
      await storeMessage(message);
      
      // If in offline mode with basic responses, generate a local response
      if (offlineState.offlineCapabilities.basicResponses) {
        // This would be a local AI model or rule-based system
        // For now, just a placeholder
        console.log('Would generate offline response for:', content);
      }
    }
    
    return messageId;
  };

  /**
   * Store a message in IndexedDB
   * @param message Message to store
   * @returns Promise that resolves when message is stored
   */
  const storeMessage = async (message: OfflineMessage): Promise<void> => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      return new Promise((resolve, reject) => {
        const request = store.put(message);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to store message:', e);
    }
  };

  /**
   * Sync pending messages with the server
   * @returns Promise that resolves when sync is complete
   */
  const syncPendingMessages = async (): Promise<boolean> => {
    if (!agent || !offlineState.isOnline || offlineState.pendingMessages.length === 0) {
      return false;
    }
    
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncError(null);
    
    try {
      const pendingMessages = [...offlineState.pendingMessages].filter(m => m.pending);
      const totalMessages = pendingMessages.length;
      let successCount = 0;
      
      for (let i = 0; i < pendingMessages.length; i++) {
        const message = pendingMessages[i];
        
        try {
          await agent.call('sendMessage', [message.content, message.metadata]);
          
          // Update message as sent
          await storeMessage({ ...message, pending: false });
          successCount++;
        } catch (e) {
          console.error(`Failed to sync message ${message.id}:`, e);
          await storeMessage({ 
            ...message, 
            error: e instanceof Error ? e.message : 'Unknown error' 
          });
        }
        
        setSyncProgress(Math.round(((i + 1) / totalMessages) * 100));
      }
      
      // Reload messages from IndexedDB to get updated status
      const db = await openDatabase();
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      
      return new Promise((resolve) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const messages = request.result as OfflineMessage[];
          
          setOfflineState(prevState => ({
            ...prevState,
            pendingMessages: messages,
            lastSyncTimestamp: new Date().toISOString()
          }));
          
          localStorage.setItem('offline_state', JSON.stringify({
            ...offlineState,
            lastSyncTimestamp: new Date().toISOString()
          }));
          
          setIsSyncing(false);
          setSyncProgress(100);
          
          // Clear progress after a delay
          setTimeout(() => setSyncProgress(0), 1000);
          
          resolve(successCount === totalMessages);
        };
        
        request.onerror = () => {
          console.error('Failed to reload messages:', request.error);
          setIsSyncing(false);
          setSyncError('Failed to reload messages');
          resolve(false);
        };
      });
    } catch (e) {
      console.error('Error during sync:', e);
      setIsSyncing(false);
      setSyncError('Error during sync');
      return false;
    }
  };

  /**
   * Update offline mode preference
   * @param mode New offline mode
   * @returns Promise that resolves when preference is updated
   */
  const setOfflineMode = async (mode: 'auto' | 'always' | 'never'): Promise<boolean> => {
    try {
      setOfflineState(prevState => ({
        ...prevState,
        offlineMode: mode
      }));
      
      localStorage.setItem('offline_state', JSON.stringify({
        ...offlineState,
        offlineMode: mode
      }));
      
      // If switching to online mode and there are pending messages, sync them
      if (mode === 'never' && offlineState.isOnline && offlineState.pendingMessages.some(m => m.pending)) {
        await syncPendingMessages();
      }
      
      return true;
    } catch (e) {
      console.error('Failed to update offline mode:', e);
      return false;
    }
  };

  /**
   * Update offline capabilities
   * @param capabilities New capabilities configuration
   * @returns Promise that resolves when capabilities are updated
   */
  const setOfflineCapabilities = async (capabilities: Partial<OfflineState['offlineCapabilities']>): Promise<boolean> => {
    try {
      setOfflineState(prevState => ({
        ...prevState,
        offlineCapabilities: {
          ...prevState.offlineCapabilities,
          ...capabilities
        }
      }));
      
      localStorage.setItem('offline_state', JSON.stringify({
        ...offlineState,
        offlineCapabilities: {
          ...offlineState.offlineCapabilities,
          ...capabilities
        }
      }));
      
      return true;
    } catch (e) {
      console.error('Failed to update offline capabilities:', e);
      return false;
    }
  };

  /**
   * Clear all pending messages
   * @returns Promise that resolves when messages are cleared
   */
  const clearPendingMessages = async (): Promise<boolean> => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          setOfflineState(prevState => ({
            ...prevState,
            pendingMessages: []
          }));
          
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('Failed to clear messages:', request.error);
          reject(request.error);
        };
      });
    } catch (e) {
      console.error('Error clearing messages:', e);
      return false;
    }
  };

  /**
   * Cache memory data for offline access
   * @param memoryData Memory data to cache
   * @returns Promise that resolves when data is cached
   */
  const cacheMemoryData = async (memoryData: any): Promise<boolean> => {
    if (!offlineState.offlineCapabilities.memoryAccess) {
      return false;
    }
    
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['memory_cache'], 'readwrite');
      const store = transaction.objectStore('memory_cache');
      
      return new Promise((resolve, reject) => {
        const request = store.put({
          id: 'memory_cache',
          data: memoryData,
          timestamp: new Date().toISOString()
        });
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to cache memory data:', e);
      return false;
    }
  };

  /**
   * Get cached memory data
   * @returns Promise that resolves with cached memory data
   */
  const getCachedMemoryData = async (): Promise<any | null> => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['memory_cache'], 'readonly');
      const store = transaction.objectStore('memory_cache');
      
      return new Promise((resolve, reject) => {
        const request = store.get('memory_cache');
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to get cached memory data:', e);
      return null;
    }
  };

  return {
    offlineState,
    isSyncing,
    syncProgress,
    syncError,
    sendMessage,
    syncPendingMessages,
    setOfflineMode,
    setOfflineCapabilities,
    clearPendingMessages,
    cacheMemoryData,
    getCachedMemoryData
  };
}
