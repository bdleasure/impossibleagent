import React, { useEffect } from "react";
import { useAgent } from "agents/react";
import { EnhancedChatInterface } from "@/components/enhanced-chat/EnhancedChatInterface";
import { useLearningMemoryRetrieval } from "@/hooks/useLearningMemoryRetrieval";
import { useVoiceInteraction } from "@/components/voice-interaction/useVoiceInteraction";

export default function Chat() {
  // Connect to the agent
  const agent = useAgent({
    agent: "Chat", // This should match the agent name in server.ts
    name: "chat-main", // Add a unique name for this chat instance
  });
  
  // Log connection details for debugging
  useEffect(() => {
    console.log("Agent connection:", agent ? "Connected" : "Not connected");
    if (agent) {
      console.log("Agent object:", agent);
    }
  }, [agent]);
  
  // Initialize memory retrieval hook
  const { 
    markAsImportant, 
    provideFeedback,
    retrieveRelatedMemories
  } = useLearningMemoryRetrieval(agent);
  
  // Initialize voice interaction
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasVoiceSupport
  } = useVoiceInteraction();
  
  // Handle marking a message as important
  const handleMarkAsImportant = (messageId: string) => {
    markAsImportant(messageId);
  };
  
  // Handle providing feedback on a message
  const handleProvideFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    provideFeedback(messageId, feedback);
  };
  
  // Handle voice input toggle
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // Handle file upload
  const handleFileUpload = (file: File) => {
    console.log("File uploaded:", file.name);
    // In a real implementation, we would upload the file and add it to the chat
  };
  
  return (
    <div className="h-[100vh] w-full p-4 flex justify-center items-center bg-fixed overflow-hidden">
      <div className="h-[calc(100vh-2rem)] w-full mx-auto max-w-lg flex flex-col shadow-xl rounded-md overflow-hidden relative">
        <EnhancedChatInterface 
          agentName="Chat"
          chatId="chat-main"
          showAvatar={true}
          showMemoryIndicators={true}
          onMarkImportant={handleMarkAsImportant}
          onProvideFeedback={handleProvideFeedback}
          onVoiceToggle={hasVoiceSupport ? handleVoiceToggle : undefined}
          isVoiceActive={isListening}
          voiceTranscript={transcript}
          onFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
}
