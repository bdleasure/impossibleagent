import React, { useState, useEffect } from 'react';
import ProactiveCheckIn from './ProactiveCheckIn';

/**
 * Demo component for the Proactive Check-In System
 * 
 * This component demonstrates the functionality of the Proactive Check-In System
 * and provides controls to adjust settings and manually trigger check-ins.
 */
const ProactiveCheckInDemo: React.FC = () => {
  // State for ProactiveCheckIn props
  const [enabled, setEnabled] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<'high' | 'medium' | 'low'>('medium');
  const [showIndicator, setShowIndicator] = useState<boolean>(true);
  
  // State for demo controls
  const [isActive, setIsActive] = useState<boolean>(false);
  const [checkInReason, setCheckInReason] = useState<string>('');
  const [checkInContext, setCheckInContext] = useState<any>(null);
  const [sentimentScore, setSentimentScore] = useState<number>(0);
  const [inactiveTime, setInactiveTime] = useState<number>(0);
  const [hasDeadline, setHasDeadline] = useState<boolean>(false);
  
  // Handle check-in event
  const handleCheckIn = (reason: string, context: any) => {
    setIsActive(true);
    setCheckInReason(reason);
    setCheckInContext(context);
    
    // Log the check-in event
    console.log('Check-in triggered:', { reason, context });
  };
  
  // Handle dismiss event
  const handleDismiss = () => {
    setIsActive(false);
    setCheckInReason('');
    setCheckInContext(null);
    
    // Log the dismiss event
    console.log('Check-in dismissed');
  };
  
  // Manually trigger a check-in
  const triggerCheckIn = (reason: string) => {
    const context = {
      memories: [
        { id: '1', content: 'Working on the UI components', timestamp: Date.now() - 86400000 },
        { id: '2', content: 'Implementing the Memory Garden', timestamp: Date.now() - 43200000 },
        { id: '3', content: 'Adding Proactive Check-In System', timestamp: Date.now() - 3600000 },
      ],
      deadlines: hasDeadline ? [
        { id: '1', task: 'Complete Proactive Check-In System', dueDate: Date.now() + 3600000 }
      ] : [],
      sentiment: sentimentScore,
      inactiveTime: inactiveTime,
    };
    
    handleCheckIn(reason, context);
  };
  
  // Reset the demo
  const resetDemo = () => {
    setIsActive(false);
    setCheckInReason('');
    setCheckInContext(null);
    setSentimentScore(0);
    setInactiveTime(0);
    setHasDeadline(false);
  };
  
  return (
    <div className="proactive-check-in-demo">
      <h1>Proactive Check-In System Demo</h1>
      
      <div className="demo-section">
        <h2>Component Settings</h2>
        <div className="settings-controls">
          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enabled
            </label>
          </div>
          
          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={showIndicator}
                onChange={(e) => setShowIndicator(e.target.checked)}
              />
              Show Indicator
            </label>
          </div>
          
          <div className="control-group">
            <label>Frequency:</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'high' | 'medium' | 'low')}
            >
              <option value="high">High (every 30 mins)</option>
              <option value="medium">Medium (every 2 hours)</option>
              <option value="low">Low (once per day)</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="demo-section">
        <h2>Trigger Controls</h2>
        <div className="trigger-controls">
          <div className="control-group">
            <label>Sentiment Score:</label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={sentimentScore}
              onChange={(e) => setSentimentScore(parseFloat(e.target.value))}
            />
            <span>{sentimentScore.toFixed(1)}</span>
          </div>
          
          <div className="control-group">
            <label>Inactive Time (minutes):</label>
            <input
              type="number"
              min="0"
              max="60"
              value={Math.floor(inactiveTime / 60000)}
              onChange={(e) => setInactiveTime(parseInt(e.target.value) * 60000)}
            />
          </div>
          
          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={hasDeadline}
                onChange={(e) => setHasDeadline(e.target.checked)}
              />
              Has Upcoming Deadline
            </label>
          </div>
        </div>
        
        <div className="trigger-buttons">
          <button onClick={() => triggerCheckIn('inactivity')}>
            Trigger Inactivity Check-In
          </button>
          <button onClick={() => triggerCheckIn('sentiment')}>
            Trigger Sentiment Check-In
          </button>
          <button onClick={() => triggerCheckIn('deadline')}>
            Trigger Deadline Check-In
          </button>
          <button onClick={resetDemo}>
            Reset Demo
          </button>
        </div>
      </div>
      
      <div className="demo-section">
        <h2>Check-In Status</h2>
        <div className="status-display">
          <div className="status-item">
            <strong>Active:</strong> {isActive ? 'Yes' : 'No'}
          </div>
          {isActive && (
            <>
              <div className="status-item">
                <strong>Reason:</strong> {checkInReason}
              </div>
              <div className="status-item">
                <strong>Context:</strong>
                <pre>{JSON.stringify(checkInContext, null, 2)}</pre>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="demo-section">
        <h2>Live Component</h2>
        <div className="component-preview">
          <ProactiveCheckIn
            enabled={enabled}
            frequency={frequency}
            showIndicator={showIndicator}
            onCheckIn={handleCheckIn}
            onDismiss={handleDismiss}
          />
          
          {!isActive && (
            <div className="preview-placeholder">
              <p>The check-in indicator will appear here when triggered.</p>
              <p>Use the controls above to manually trigger a check-in.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProactiveCheckInDemo;
