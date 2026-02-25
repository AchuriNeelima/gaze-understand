import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SpeechRecognitionInstance,
  SpeechRecognitionConstructor,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/types/speech-recognition';

export type VoiceCommand = 'open_camera' | 'capture';
export type VoiceMode = 'passive' | 'active' | 'off';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  mode: VoiceMode;
  recognizedText: string | null;
  lastCommand: VoiceCommand | null;
  error: string | null;
  startPassiveListening: () => void;
  stopListening: () => void;
  clearLastCommand: () => void;
  isSupported: boolean;
}

const WAKE_PHRASE = /hi\s*buddy/i;

const COMMAND_MAP: { patterns: RegExp[]; command: VoiceCommand }[] = [
  {
    patterns: [/open\s*(the)?\s*camera/i, /start\s*camera/i],
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
  const [mode, setMode] = useState<VoiceMode>('off');
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const modeRef = useRef<VoiceMode>('off');
  const stoppedManuallyRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  // Keep modeRef in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
    setRecognizedText(null);
    setError(null);
  }, []);

  const destroyRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const createRecognition = useCallback((forMode: 'passive' | 'active') => {
    if (!SpeechRecognitionAPI) return;

    destroyRecognition();

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get the latest result
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      setRecognizedText(transcript);

      if (modeRef.current === 'passive') {
        // Check for wake word
        if (WAKE_PHRASE.test(transcript)) {
          setMode('active');
          modeRef.current = 'active';
          // Stop current recognition, speak, then start active listening
          destroyRecognition();
          speakFeedback('Yes, I am listening. Please say a command.').then(() => {
            if (modeRef.current === 'active') {
              createRecognition('active');
            }
          });
        }
        // Otherwise ignore - keep listening passively
      } else if (modeRef.current === 'active') {
        const command = matchCommand(transcript);
        if (command) {
          setLastCommand(command);
          setError(null);
        } else {
          // Check if they said wake word again in active mode - just acknowledge
          if (WAKE_PHRASE.test(transcript)) {
            speakFeedback('I am already listening. Please say a command.');
          } else {
            setError('Command not recognised. Please try again.');
            speakFeedback('Command not recognised. Please try again.');
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        const msg = 'Microphone access denied. Please enable microphone permission.';
        setError(msg);
        speakFeedback(msg);
        setMode('off');
        modeRef.current = 'off';
        setIsListening(false);
        return;
      }

      // For transient errors (no-speech, network, aborted), auto-restart if still in a mode
      if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
        // Don't surface no-speech as error in passive mode
        if (modeRef.current === 'active' && event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still in passive or active mode and not manually stopped
      if (!stoppedManuallyRef.current && (modeRef.current === 'passive' || modeRef.current === 'active')) {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'passive' || modeRef.current === 'active') {
            createRecognition(modeRef.current);
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch {
      // Already started or other error, retry after delay
      restartTimerRef.current = setTimeout(() => {
        if (modeRef.current === 'passive' || modeRef.current === 'active') {
          createRecognition(modeRef.current);
        }
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognitionAPI, destroyRecognition]);

  const stopListening = useCallback(() => {
    stoppedManuallyRef.current = true;
    setMode('off');
    modeRef.current = 'off';
    destroyRecognition();
  }, [destroyRecognition]);

  const startPassiveListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      const msg = 'Voice recognition is not supported in this browser.';
      setError(msg);
      speakFeedback(msg);
      return;
    }

    stoppedManuallyRef.current = false;
    setError(null);
    setRecognizedText(null);
    setLastCommand(null);
    setMode('passive');
    modeRef.current = 'passive';
    createRecognition('passive');
  }, [SpeechRecognitionAPI, createRecognition]);

  /** Switch back to passive mode (called after a task completes) */
  const returnToPassive = useCallback(() => {
    if (!SpeechRecognitionAPI || stoppedManuallyRef.current) return;
    setMode('passive');
    modeRef.current = 'passive';
    destroyRecognition();
    restartTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'passive') {
        createRecognition('passive');
      }
    }, 1000);
  }, [SpeechRecognitionAPI, destroyRecognition, createRecognition]);

  // When a command is processed and cleared, return to passive
  useEffect(() => {
    // If lastCommand was just cleared (null) and mode is active, return to passive after short delay
    // This is triggered by the consumer calling clearLastCommand after handling a command
  }, [lastCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedManuallyRef.current = true;
      destroyRecognition();
    };
  }, [destroyRecognition]);

  return {
    isListening,
    mode,
    recognizedText,
    lastCommand,
    error,
    startPassiveListening,
    stopListening,
    clearLastCommand,
    isSupported,
  };
};
