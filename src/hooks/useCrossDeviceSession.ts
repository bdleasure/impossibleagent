import { useEffect, useState } from 'react';
import { useAgent } from 'agents/react';

/**
 * Interface for device information
 */
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'web';
  lastActive: string;
  currentlyActive: boolean;
}

/**
 * Interface for session transfer options
 */
export interface SessionTransferOptions {
  includeHistory: boolean;
  includeContext: boolean;
  notifyOnComplete: boolean;
}

/**
 * Hook for managing cross-device session capabilities
 * 
 * This hook provides functionality for:
 * - Tracking active devices
 * - Transferring sessions between devices
 * - Continuing conversations across devices
 * 
 * @returns Cross-device session management functions and state
 */
export function useCrossDeviceSession() {
  const agent = useAgent({ agent: 'personal' });
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);

  // Generate a unique device ID if one doesn't exist
  useEffect(() => {
    const generateDeviceId = () => {
      const existingId = localStorage.getItem('device_id');
      if (existingId) return existingId;
      
      const newId = crypto.randomUUID();
      localStorage.setItem('device_id', newId);
      return newId;
    };

    const detectDeviceType = (): 'mobile' | 'desktop' | 'tablet' | 'web' => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        return 'tablet';
      }
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        return 'mobile';
      }
      if (window.matchMedia("(max-width: 768px)").matches) {
        return 'mobile';
      }
      return 'desktop';
    };

    const deviceId = generateDeviceId();
    const deviceName = localStorage.getItem('device_name') || navigator.userAgent;
    const deviceType = detectDeviceType();

    setCurrentDevice({
      id: deviceId,
      name: deviceName,
      type: deviceType,
      lastActive: new Date().toISOString(),
      currentlyActive: true
    });

    // Register this device with the agent
    if (agent) {
      agent.call('registerDevice', [
        deviceId,
        deviceName,
        deviceType,
        new Date().toISOString()
      ]);
    }
  }, [agent]);

  // Fetch active devices periodically
  useEffect(() => {
    const fetchActiveDevices = async () => {
      if (!agent) return;
      
      try {
        const devices = await agent.call('getActiveDevices') as DeviceInfo[];
        setActiveDevices(devices);
      } catch (error) {
        console.error('Failed to fetch active devices:', error);
      }
    };

    fetchActiveDevices();
    const interval = setInterval(fetchActiveDevices, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [agent]);

  // Update last active timestamp periodically
  useEffect(() => {
    const updateLastActive = async () => {
      if (!agent || !currentDevice) return;
      
      try {
        await agent.call('updateDeviceActivity', [
          currentDevice.id,
          new Date().toISOString()
        ]);
      } catch (error) {
        console.error('Failed to update device activity:', error);
      }
    };

    updateLastActive();
    const interval = setInterval(updateLastActive, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [agent, currentDevice]);

  /**
   * Transfer the current session to another device
   * @param targetDeviceId The ID of the device to transfer to
   * @param options Session transfer options
   * @returns Promise that resolves when transfer is complete
   */
  const transferSessionTo = async (targetDeviceId: string, options: SessionTransferOptions = {
    includeHistory: true,
    includeContext: true,
    notifyOnComplete: true
  }): Promise<boolean> => {
    if (!agent || !currentDevice) return false;
    
    try {
      setIsTransferring(true);
      setTransferProgress(10);
      
      // Get current conversation state
      const conversationState = await agent.call('getCurrentConversationState');
      setTransferProgress(30);
      
      // Prepare transfer package
      const transferPackage = {
        sourceDeviceId: currentDevice.id,
        targetDeviceId,
        timestamp: new Date().toISOString(),
        conversationState,
        options
      };
      setTransferProgress(50);
      
      // Initiate transfer
      await agent.call('initiateSessionTransfer', [
        currentDevice.id,
        targetDeviceId,
        new Date().toISOString(),
        conversationState,
        options.includeHistory,
        options.includeContext,
        options.notifyOnComplete
      ]);
      setTransferProgress(80);
      
      // Notify target device
      if (options.notifyOnComplete) {
        await agent.call('notifyDeviceOfTransfer', [
          targetDeviceId,
          `Session transferred from ${currentDevice.name}`
        ]);
      }
      setTransferProgress(100);
      
      setTimeout(() => {
        setIsTransferring(false);
        setTransferProgress(0);
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Failed to transfer session:', error);
      setIsTransferring(false);
      setTransferProgress(0);
      return false;
    }
  };

  /**
   * Continue the current conversation on another device
   * @param targetDeviceId The ID of the device to continue on
   * @returns Promise that resolves when continuation is initiated
   */
  const continueOnDevice = async (targetDeviceId: string): Promise<boolean> => {
    return transferSessionTo(targetDeviceId, {
      includeHistory: true,
      includeContext: true,
      notifyOnComplete: true
    });
  };

  /**
   * Check if there's a pending session transfer for this device
   * @returns Promise that resolves with the transfer package or null
   */
  const checkForPendingTransfer = async () => {
    if (!agent || !currentDevice) return null;
    
    try {
      return await agent.call('checkPendingSessionTransfer', [
        currentDevice.id
      ]);
    } catch (error) {
      console.error('Failed to check for pending transfers:', error);
      return null;
    }
  };

  /**
   * Accept a pending session transfer
   * @param transferId The ID of the transfer to accept
   * @returns Promise that resolves when transfer is accepted
   */
  const acceptSessionTransfer = async (transferId: string): Promise<boolean> => {
    if (!agent || !currentDevice) return false;
    
    try {
      await agent.call('acceptSessionTransfer', [
        transferId,
        currentDevice.id
      ]);
      return true;
    } catch (error) {
      console.error('Failed to accept session transfer:', error);
      return false;
    }
  };

  /**
   * Reject a pending session transfer
   * @param transferId The ID of the transfer to reject
   * @returns Promise that resolves when transfer is rejected
   */
  const rejectSessionTransfer = async (transferId: string): Promise<boolean> => {
    if (!agent || !currentDevice) return false;
    
    try {
      await agent.call('rejectSessionTransfer', [
        transferId,
        currentDevice.id
      ]);
      return true;
    } catch (error) {
      console.error('Failed to reject session transfer:', error);
      return false;
    }
  };

  /**
   * Update the name of the current device
   * @param name The new name for the device
   * @returns Promise that resolves when name is updated
   */
  const updateDeviceName = async (name: string): Promise<boolean> => {
    if (!agent || !currentDevice) return false;
    
    try {
      await agent.call('updateDeviceName', [
        currentDevice.id,
        name
      ]);
      
      localStorage.setItem('device_name', name);
      setCurrentDevice({
        ...currentDevice,
        name
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update device name:', error);
      return false;
    }
  };

  return {
    activeDevices,
    currentDevice,
    isTransferring,
    transferProgress,
    transferSessionTo,
    continueOnDevice,
    checkForPendingTransfer,
    acceptSessionTransfer,
    rejectSessionTransfer,
    updateDeviceName
  };
}
