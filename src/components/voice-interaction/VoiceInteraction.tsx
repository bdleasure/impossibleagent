import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { VoiceCommands } from "./VoiceCommands";

interface VoiceInteractionProps {
  className?: string;
  onSpeechResult?: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  placeholder?: string;
  commands?: string[];
  highContrast?: boolean;
  autoStart?: boolean;
}

/**
 * Voice Interaction Component
 * 
 * Provides voice input capabilities with visual feedback and transcription.
 * Uses the Web Speech API for speech recognition.
 */
export function VoiceInteraction({
  className,
  onSpeechResult,
  onSpeechStart,
  onSpeechEnd,
  onError,
  placeholder = "Speak now...",
  commands = [],
  highContrast = false,
  autoStart = false,
}: VoiceInteractionProps) {
  // State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(10).fill(0));
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage("Speech recognition is not supported in this browser.");
      setHasError(true);
      if (onError) onError("Speech recognition not supported");
    }
  }, [onError]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Set up event handlers
    recognitionRef.current.onstart = handleRecognitionStart;
    recognitionRef.current.onend = handleRecognitionEnd;
    recognitionRef.current.onresult = handleRecognitionResult;
    recognitionRef.current.onerror = handleRecognitionError;

    // Auto-start if enabled
    if (autoStart) {
      startListening();
    }

    // Cleanup
    return () => {
      stopListening();
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, [isSupported, autoStart]);

  // Handle recognition start
  const handleRecognitionStart = () => {
    setIsListening(true);
    setHasError(false);
    setErrorMessage("");
    if (onSpeechStart) onSpeechStart();
    startAudioVisualization();
  };

  // Handle recognition end
  const handleRecognitionEnd = () => {
    setIsListening(false);
    setIsProcessing(false);
    stopAudioVisualization();
    if (onSpeechEnd) onSpeechEnd();
  };

  // Handle recognition result
  const handleRecognitionResult = (event: any) => {
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

    if (finalTranscript) {
      setTranscript(prevTranscript => {
        const newTranscript = prevTranscript ? `${prevTranscript} ${finalTranscript}` : finalTranscript;
        if (onSpeechResult) onSpeechResult(newTranscript);
        return newTranscript;
      });
    }

    setInterimTranscript(interimTranscript);
  };

  // Handle recognition error
  const handleRecognitionError = (event: any) => {
    setHasError(true);
    setIsListening(false);
    setIsProcessing(false);
    stopAudioVisualization();

    let message = "";
    switch (event.error) {
      case 'no-speech':
        message = "No speech detected. Please try again.";
        break;
      case 'audio-capture':
        message = "Could not access microphone. Please check permissions.";
        break;
      case 'not-allowed':
        message = "Microphone access denied. Please allow microphone access.";
        break;
      case 'network':
        message = "Network error. Please check your connection.";
        break;
      case 'aborted':
        message = "Speech recognition aborted.";
        break;
      default:
        message = `Error: ${event.error}`;
    }

    setErrorMessage(message);
    if (onError) onError(message);
  };

  // Start listening
  const startListening = () => {
    if (!isSupported || isListening) return;

    try {
      recognitionRef.current.start();
      setIsProcessing(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setHasError(true);
      setErrorMessage("Failed to start speech recognition.");
      if (onError) onError("Failed to start speech recognition");
    }
  };

  // Stop listening
  const stopListening = () => {
    if (!isSupported || !isListening) return;

    try {
      recognitionRef.current.stop();
      setIsProcessing(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript("");
      setInterimTranscript("");
      startListening();
    }
  };

  // Start audio visualization
  const startAudioVisualization = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
      microphoneRef.current.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
        const normalized = Math.min(1, average / 128);
        
        // Create a smoothed array of 10 values for the visualizer
        const levels = Array(10).fill(0).map((_, i) => {
          const factor = Math.abs((i - 4.5) / 4.5);
          return normalized * (1 - factor * 0.6);
        });
        
        setAudioLevel(levels);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (error) {
      console.error("Error accessing microphone for visualization:", error);
    }
  };

  // Stop audio visualization
  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      // Don't close the audio context, just disconnect
      // audioContextRef.current?.close();
    }

    setAudioLevel(Array(10).fill(0));
  };

  // Handle command selection
  const handleCommandSelect = (command: string) => {
    setTranscript(command);
    if (onSpeechResult) onSpeechResult(command);
  };

  // Get feedback message
  const getFeedbackMessage = () => {
    if (hasError) return errorMessage;
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    return "Tap to speak";
  };

  // Get button class
  const getButtonClass = () => {
    if (hasError) return "error";
    if (isListening) return "listening";
    if (isProcessing) return "processing";
    return "";
  };

  // Get button icon
  const getButtonIcon = () => {
    if (hasError) return "⚠️";
    if (isListening) return "🎤";
    if (isProcessing) return "⏳";
    return "🎤";
  };

  // If not supported, show error message
  if (!isSupported) {
    return (
      <div className={cn("voice-interaction-container", highContrast && "high-contrast", className)}>
        <div className="voice-feedback error">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "voice-interaction-container", 
      isListening && "active",
      highContrast && "high-contrast",
      className
    )}>
      <button 
        className={cn(
          "voice-button", 
          getButtonClass(),
          highContrast && "high-contrast"
        )}
        onClick={toggleListening}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        disabled={!isSupported}
      >
        <span className="voice-button-icon">{getButtonIcon()}</span>
      </button>
      
      <div className="voice-feedback">
        {getFeedbackMessage()}
      </div>
      
      {isListening && (
        <VoiceVisualizer levels={audioLevel} />
      )}
      
      <div className={cn(
        "voice-transcript",
        (!transcript && !interimTranscript) && "empty"
      )}>
        {transcript || interimTranscript || placeholder}
      </div>
      
      {commands.length > 0 && (
        <VoiceCommands 
          commands={commands} 
          onCommandSelect={handleCommandSelect} 
        />
      )}
    </div>
  );
}
