import { ModalProvider } from "@/providers/ModalProvider";
import { TooltipProvider } from "@/providers/TooltipProvider";
import { AgentProvider } from "@/providers/AgentProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <TooltipProvider>
      <ModalProvider>
        <AgentProvider>
          {children}
        </AgentProvider>
      </ModalProvider>
    </TooltipProvider>
  );
};
