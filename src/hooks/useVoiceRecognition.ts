import { useState, useCallback, useRef, useEffect } from 'react';

type VoiceCommand = 'upload' | 'capture' | 'submit' | 'reset' | 'unknown';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  recognizedText: string | null;
  lastCommand: VoiceCommand | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearRecognizedText: () => void;
  isSupported: boolean;
}

const COMMAND_MAP: { patterns: RegExp[]; command: VoiceCommand }[] = [
  { patterns: [/upload\s*image/i, /upload/i, /choose\s*file/i, /select\s*file/i, /open\s*file/i], command: 'upload' },
  { patterns: [/capture\s*image/i, /capture/i, /take\s*photo/i, /camera/i, /take\s*picture/i], command: 'capture' },
  { patterns: [/submit/i, /send/i, /generate/i, /describe/i], command: 'submit' },
  { patterns: [/reset/i, /clear/i, /remove/i, /delete/i, /start\s*over/i], command: 'reset' },
];

function matchCommand(text: string): VoiceCommand {
  for (const { patterns, command } of COMMAND_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return command;
    }
  }
  return 'unknown';
}

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const clearRecognizedText = useCallback(() => {
    setRecognizedText(null);
    setLastCommand(null);
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }

    setError(null);
    setRecognizedText(null);
    setLastCommand(null);

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      setRecognizedText(transcript);
      const command = matchCommand(transcript);
      setLastCommand(command);
      if (command === 'unknown') {
        setError('Command not recognized. Please try again.');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    recognition.start();

    // Auto-stop after 8 seconds
    timeoutRef.current = setTimeout(() => {
      stopListening();
    }, 8000);
  }, [SpeechRecognitionAPI, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isListening,
    recognizedText,
    lastCommand,
    error,
    startListening,
    stopListening,
    clearRecognizedText,
    isSupported,
  };
};
