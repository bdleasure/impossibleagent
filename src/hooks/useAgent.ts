import { useContext } from "react";
import { AgentContext } from "../providers/AgentProvider";
import type { Agent } from "agents";

/**
 * Hook to access the agent instance from the AgentContext
 * @returns The agent instance or null if not available
 */
export function useAgent<Env = any>(): Agent<Env> | null {
  const context = useContext(AgentContext);
  
  if (context === undefined) {
    console.warn("useAgent must be used within an AgentProvider");
    return null;
  }
  
  return context.agent;
}
