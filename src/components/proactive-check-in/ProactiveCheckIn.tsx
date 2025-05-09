import React, { useState, useEffect, useRef } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { useLearningMemoryRetrieval } from '../../hooks/useLearningMemoryRetrieval';
import { useSettingsSync } from '../../hooks/useSettingsSync';

export interface ProactiveCheckInProps {
  /** Whether the check-in system is enabled */
  enabled?: boolean;
  /** Frequency of check-ins: 'high' (every 30 mins), 'medium' (every 2 hours), 'low' (once per day) */
  frequency?: 'high' | 'medium' | 'low';
  /** Callback when a check-in is triggered */
  onCheckIn?: (reason: string, context: any) => void;
  /** Callback when a check-in is dismissed */
  onDismiss?: () => void;
  /** Whether to show the check-in indicator */
  showIndicator?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * ProactiveCheckIn - A system for AI-initiated emotional engagement
 * 
 * This component monitors user activity, sentiment, and task deadlines
 * to proactively initiate check-ins at appropriate moments. It integrates
 * with the Memory Garden to reference recent tasks and memories during
 * check-ins.
 */
const ProactiveCheckIn: React.FC<ProactiveCheckInProps> = ({
  enabled = true,
  frequency = 'medium',
  onCheckIn,
  onDismiss,
  showIndicator = true,
  className = '',
}) => {
  // State
  const [isActive, setIsActive] = useState<boolean>(false);
  const [checkInReason, setCheckInReason] = useState<string>('');
  const [checkInContext, setCheckInContext] = useState<any>(null);
  const [lastCheckInTime, setLastCheckInTime] = useState<number>(Date.now());
  const [userInactiveTime, setUserInactiveTime] = useState<number>(0);
  const [sentimentScore, setSentimentScore] = useState<number>(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  
  // Refs
  const activityTimerRef = useRef<number | null>(null);
  const checkInTimerRef = useRef<number | null>(null);
  
  // Hooks
  const agent = useAgent();
  const { retrieveMemories } = useLearningMemoryRetrieval();
  const { settings, updateSetting } = useSettingsSync();
  
  // Initialize theme
  useEffect(() => {
    if (!settings) {
      // Default to system preference if settings is null
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const html = document.querySelector("html");
      if (prefersDark) {
        html?.classList.add("dark");
      } else if (html?.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    } else if (settings.theme === 'dark' || settings.theme === 'light') {
      const html = document.querySelector("html");
      if (settings.theme === 'dark') {
        html?.classList.add("dark");
      } else if (html?.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    } else {
      // For 'system' theme, we can use the preferred color scheme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const html = document.querySelector("html");
      if (prefersDark) {
        html?.classList.add("dark");
      } else if (html?.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    }
  }, [settings?.theme]);

  // Mock implementations for when hooks return null
  const mockRetrieveMemories = async () => {
    console.log('Mock memory retrieval used - agent context not available');
    return [];
  };
  
  const mockUpdateSetting = async (path: string, value: any) => {
    console.log(`Mock updateSetting used - settings sync not available. Would set ${path} to:`, value);
    return true;
  };
  
  // Frequency intervals in milliseconds
  const frequencyIntervals = {
    high: 30 * 60 * 1000, // 30 minutes
    medium: 2 * 60 * 60 * 1000, // 2 hours
    low: 24 * 60 * 60 * 1000, // 24 hours
  };
  
  // Initialize settings
  useEffect(() => {
    if (settings?.proactiveCheckIn) {
      // Use stored settings if available
    } else {
      // Initialize default settings
      const settingUpdate = {
        enabled,
        frequency,
        lastCheckIn: lastCheckInTime,
      };
      
      if (updateSetting) {
        updateSetting('proactiveCheckIn', settingUpdate);
      } else {
        mockUpdateSetting('proactiveCheckIn', settingUpdate);
      }
    }
    
    // Start activity monitoring
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    
    // Start inactivity timer
    startActivityTimer();
    
    // Start check-in timer based on frequency
    startCheckInTimer();
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      
      // Clear timers
      if (activityTimerRef.current) {
        window.clearInterval(activityTimerRef.current);
      }
      if (checkInTimerRef.current) {
        window.clearTimeout(checkInTimerRef.current);
      }
    };
  }, [enabled, frequency]);
  
  // Monitor user activity
  const handleUserActivity = () => {
    setUserInactiveTime(0);
  };
  
  const startActivityTimer = () => {
    activityTimerRef.current = window.setInterval(() => {
      setUserInactiveTime(prev => prev + 1000);
    }, 1000);
  };
  
  // Schedule check-ins based on frequency
  const startCheckInTimer = () => {
    const interval = frequencyIntervals[frequency];
    
    checkInTimerRef.current = window.setTimeout(() => {
      // Only trigger if enabled
      if (enabled) {
        evaluateCheckInTriggers();
      }
      
      // Reschedule
      startCheckInTimer();
    }, interval);
  };
  
  // Evaluate triggers for check-in
  const evaluateCheckInTriggers = async () => {
    // Don't check in if already active
    if (isActive) return;
    
    // Check for inactivity trigger (after 10 minutes of inactivity)
    const inactivityThreshold = 10 * 60 * 1000; // 10 minutes
    const inactivityTrigger = userInactiveTime > inactivityThreshold;
    
    // Check for sentiment trigger (negative sentiment)
    const sentimentTrigger = sentimentScore < -0.5;
    
    // Check for deadline trigger (task due within 24 hours)
    const deadlineTrigger = upcomingDeadlines.some(
      deadline => deadline.dueDate - Date.now() < 24 * 60 * 60 * 1000
    );
    
    // Determine if we should trigger a check-in
    if (inactivityTrigger || sentimentTrigger || deadlineTrigger) {
      // Get context from memory
      const recentMemories = retrieveMemories 
        ? await retrieveMemories('recent memories', { limit: 3 })
        : await mockRetrieveMemories();
      
      // Determine reason for check-in
      let reason = '';
      if (inactivityTrigger) {
        reason = 'inactivity';
      } else if (sentimentTrigger) {
        reason = 'sentiment';
      } else if (deadlineTrigger) {
        reason = 'deadline';
      }
      
      // Set check-in context
      const context = {
        memories: recentMemories,
        deadlines: upcomingDeadlines,
        sentiment: sentimentScore,
        inactiveTime: userInactiveTime,
      };
      
      // Trigger check-in
      triggerCheckIn(reason, context);
    }
  };
  
  // Trigger a check-in
  const triggerCheckIn = (reason: string, context: any) => {
    setIsActive(true);
    setCheckInReason(reason);
    setCheckInContext(context);
    setLastCheckInTime(Date.now());
    
    // Update settings with last check-in time
    if (updateSetting) {
      updateSetting('proactiveCheckIn.lastCheckIn', Date.now());
    } else {
      mockUpdateSetting('proactiveCheckIn.lastCheckIn', Date.now());
    }
    
    // Call the onCheckIn callback if provided
    if (onCheckIn) {
      onCheckIn(reason, context);
    }
  };
  
  // Dismiss the check-in
  const dismissCheckIn = () => {
    setIsActive(false);
    
    // Call the onDismiss callback if provided
    if (onDismiss) {
      onDismiss();
    }
  };
  
  // Render the check-in indicator or nothing if not active/enabled
  if (!enabled || !showIndicator || !isActive) {
    return null;
  }
  
  return (
    <div className={`proactive-check-in ${className}`}>
      <div className="proactive-check-in-indicator">
        <div className="proactive-check-in-icon" data-reason={checkInReason} onClick={dismissCheckIn}>
          {/* Icon changes based on check-in reason */}
          {checkInReason === 'inactivity' && (
            <span role="img" aria-label="Inactivity check-in">⏰</span>
          )}
          {checkInReason === 'sentiment' && (
            <span role="img" aria-label="Sentiment check-in">😊</span>
          )}
          {checkInReason === 'deadline' && (
            <span role="img" aria-label="Deadline check-in">📅</span>
          )}
        </div>
        <div className="proactive-check-in-pulse"></div>
      </div>
    </div>
  );
};

export default ProactiveCheckIn;
