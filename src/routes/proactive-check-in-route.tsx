import React from 'react';
import { ProactiveCheckInDemo } from '../components/proactive-check-in';
import { AgentProvider } from '../providers/AgentProvider';

/**
 * Route component for the Proactive Check-In System demo
 * 
 * Wraps the demo component with AgentProvider to provide the agent context
 * required by the ProactiveCheckIn component.
 */
const ProactiveCheckInRoute: React.FC = () => {
  return (
    <AgentProvider>
      <ProactiveCheckInDemo />
    </AgentProvider>
  );
};

export default ProactiveCheckInRoute;
