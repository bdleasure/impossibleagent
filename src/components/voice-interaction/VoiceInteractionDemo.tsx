import React, { useState } from "react";
import { VoiceInteraction } from "./VoiceInteraction";

/**
 * Voice Interaction Demo Component
 * 
 * Demonstrates the voice interaction component with various configurations.
 */
export function VoiceInteractionDemo() {
  const [result, setResult] = useState<string>("");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [showCommands, setShowCommands] = useState<boolean>(true);
  
  // Example commands
  const exampleCommands = [
    "Show my memories",
    "What's on my calendar today?",
    "Create a new note",
    "Set a reminder for tomorrow",
    "How am I feeling today?",
  ];

  // Handle speech result
  const handleSpeechResult = (text: string) => {
    setResult(text);
    console.log("Speech result:", text);
  };

  // Handle speech start
  const handleSpeechStart = () => {
    console.log("Speech recognition started");
  };

  // Handle speech end
  const handleSpeechEnd = () => {
    console.log("Speech recognition ended");
  };

  // Handle error
  const handleError = (error: string) => {
    console.error("Speech recognition error:", error);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Voice Interaction Demo</h1>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <label className="mr-4">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={() => setHighContrast(!highContrast)}
              className="mr-2"
            />
            High Contrast Mode
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={showCommands}
              onChange={() => setShowCommands(!showCommands)}
              className="mr-2"
            />
            Show Commands
          </label>
        </div>
        
        <VoiceInteraction
          onSpeechResult={handleSpeechResult}
          onSpeechStart={handleSpeechStart}
          onSpeechEnd={handleSpeechEnd}
          onError={handleError}
          placeholder="Try saying something..."
          commands={showCommands ? exampleCommands : []}
          highContrast={highContrast}
        />
      </div>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Last Result:</h2>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            {result}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">About This Component</h2>
        <p className="mb-2">
          The Voice Interaction component provides a user-friendly interface for voice input with the following features:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Speech recognition using the Web Speech API</li>
          <li>Visual feedback with audio level visualization</li>
          <li>Real-time transcription display</li>
          <li>Suggested commands for quick selection</li>
          <li>Accessibility features including high contrast mode</li>
          <li>Error handling and user feedback</li>
        </ul>
        <p>
          This component is designed to be used in various contexts throughout the application,
          particularly for hands-free interaction and accessibility.
        </p>
      </div>
    </div>
  );
}
