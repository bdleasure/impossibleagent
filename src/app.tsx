import React, { useState, useRef, useEffect } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";
import { Robot, PaperPlaneRight, X } from "@phosphor-icons/react";
import { Card } from "@/components/card/Card";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

export default function Chat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Connect to the agent - simplified based on the example
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
  
  // Use the agent chat functionality
  const { messages, input: chatInput, handleInputChange, handleSubmit, isLoading, error, setMessages } = useAgentChat({
    agent,
    id: "chat",
    body: {
      // Any additional parameters needed for the chat
    },
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Handle form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() === "") return;
    console.log("Submitting message:", chatInput);
    handleSubmit(e);
  };
  
  // Clear chat history
  const clearChat = () => {
    setMessages([]);
  };
  
  return (
    <div className="h-[100vh] w-full p-4 flex justify-center items-center bg-fixed overflow-hidden">
      <div className="h-[calc(100vh-2rem)] w-full mx-auto max-w-lg flex flex-col shadow-xl rounded-md overflow-hidden relative border border-neutral-300 dark:border-neutral-800">
        <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-3 sticky top-0 z-10">
          <div className="flex-1">
            <h2 className="font-semibold text-base">AI Chat Agent</h2>
          </div>
          <button 
            onClick={clearChat}
            className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Clear chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 max-h-[calc(100vh-10rem)]">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Card className="p-6 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900">
                <div className="text-center space-y-4">
                  <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-3 inline-flex">
                    <Robot size={24} />
                  </div>
                  <h3 className="font-semibold text-lg">Welcome to AI Chat</h3>
                  <p className="text-neutral-600 dark:text-neutral-300">
                    Ask me anything! I'm here to help with a wide range of tasks.
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            messages.map((message: any) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-neutral-200 dark:bg-neutral-800"
                  }`}
                >
                  {typeof message.content === "string" ? (
                    <MemoizedMarkdown content={message.content} id={message.id} />
                  ) : (
                    <div>Unsupported message format</div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="p-2 rounded-md bg-blue-500 text-white disabled:opacity-50"
              disabled={isLoading || chatInput.trim() === ""}
            >
              <PaperPlaneRight size={20} />
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-2">
              Error: {error.message || "Something went wrong"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
