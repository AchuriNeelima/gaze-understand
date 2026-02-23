import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SpeechRecognitionInstance,
  SpeechRecognitionConstructor,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/types/speech-recognition';

type VoiceCommand = 'open_camera' | 'capture';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  recognizedText: string | null;
  lastCommand: VoiceCommand | null;
  error: string | null;
  startListening: (prompt?: string) => void;
  stopListening: () => void;
  clearLastCommand: () => void;
  isSupported: boolean;
}

const COMMAND_MAP: { patterns: RegExp[]; command: VoiceCommand }[] = [
  {
    patterns: [/open\s*camera/i, /start\s*camera/i, /camera/i],
    command: 'open_camera',
  },
  {
    patterns: [/capture/i, /click\s*image/i, /take\s*photo/i, /take\s*picture/i, /snap/i, /shoot/i],
    command: 'capture',
  },
];

function matchCommand(text: string): VoiceCommand | null {
  for (const { patterns, command } of COMMAND_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return command;
    }
  }
  return null;
}

/** Speak text using browser SpeechSynthesis and return a promise that resolves when done */
export function speakFeedback(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRelistenRef = useRef(false);

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
    setRecognizedText(null);
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    shouldRelistenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsListening(false);
  }, []);

  const beginRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

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

      if (command) {
        setLastCommand(command);
        setError(null);
      } else {
        setError('Command not recognized. Please try again.');
        shouldRelistenRef.current = true;
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        const msg = 'Microphone access denied. Please enable microphone permission.';
        setError(msg);
        speakFeedback(msg);
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
        speakFeedback('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
        speakFeedback('Network error. Please check your connection.');
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

    timeoutRef.current = setTimeout(() => {
      shouldRelistenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }, 8000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognitionAPI]);

  const startListening = useCallback(async (prompt?: string) => {
    if (!SpeechRecognitionAPI) {
      const msg = 'Voice recognition is not supported in this browser.';
      setError(msg);
      speakFeedback(msg);
      return;
    }

    setError(null);
    setRecognizedText(null);
    setLastCommand(null);

    const spokenPrompt = prompt || 'Listening for command. Say open camera, or capture.';
    await speakFeedback(spokenPrompt);
    beginRecognition();
  }, [SpeechRecognitionAPI, beginRecognition]);

  // Re-listen after unrecognized command
  useEffect(() => {
    if (error === 'Command not recognized. Please try again.' && shouldRelistenRef.current) {
      shouldRelistenRef.current = false;
      speakFeedback('Command not recognized. Please try again.').then(() => {
        setTimeout(() => {
          beginRecognition();
        }, 300);
      });
    }
  }, [error, beginRecognition]);

  useEffect(() => {
    return () => {
      shouldRelistenRef.current = false;
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
    clearLastCommand,
    isSupported,
  };
};
