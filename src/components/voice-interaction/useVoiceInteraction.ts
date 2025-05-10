import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for voice interaction functionality
 * Provides speech recognition capabilities for the chat interface
 */
export function useVoiceInteraction() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setHasVoiceSupport(true);
      
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      // Handle recognition results
      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
      };
      
      // Handle recognition end
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      // Handle recognition errors
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
    
    // Cleanup
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);
  
  // Start listening
  const startListening = useCallback(() => {
    if (recognition) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  }, [recognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasVoiceSupport
  };
}

// Add TypeScript declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
