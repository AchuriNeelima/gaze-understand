import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SpeechRecognitionInstance,
  SpeechRecognitionConstructor,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/types/speech-recognition';
import {
  type VoiceCommand,
  matchCommand,
  containsWakeWord,
  stripWakePhrase,
  getFeedback,
  speakFeedback,
} from '@/utils/voiceLanguages';

export type VoiceMode = 'passive' | 'active' | 'off';
export type { VoiceCommand } from '@/utils/voiceLanguages';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  mode: VoiceMode;
  lastCommand: VoiceCommand | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearLastCommand: () => void;
  isSupported: boolean;
}

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

const ACTIVE_TIMEOUT_MS = 8000; // return to passive after 8s of no command

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('off');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stoppedManuallyRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<VoiceMode>('off');

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
    setError(null);
  }, []);

  const clearActiveTimer = useCallback(() => {
    if (activeTimerRef.current) {
      clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  }, []);

  const goPassive = useCallback(() => {
    clearActiveTimer();
    setMode('passive');
    modeRef.current = 'passive';
    setError(null);
    console.log('[Voice] → passive mode');
  }, [clearActiveTimer]);

  const goActive = useCallback(() => {
    clearActiveTimer();
    setMode('active');
    modeRef.current = 'active';
    setError(null);
    console.log('[Voice] → active mode');
    // Auto-timeout back to passive
    activeTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'active') {
        void speakFeedback(getFeedback('timeout'));
        goPassive();
      }
    }, ACTIVE_TIMEOUT_MS);
  }, [clearActiveTimer, goPassive]);

  const destroyRecognition = useCallback(() => {
    clearActiveTimer();
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
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearActiveTimer]);

  const createRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return;
    destroyRecognition();

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      console.log('[Voice] Recognized:', transcript, '| mode:', modeRef.current);

      const hasWake = containsWakeWord(transcript);

      if (modeRef.current === 'passive') {
        if (hasWake) {
          // Check if command is included after wake word
          const remainder = stripWakePhrase(transcript);
          const cmd = remainder ? matchCommand(remainder) : null;
          if (cmd) {
            // Wake + command in one sentence
            setLastCommand(cmd);
            setError(null);
            goPassive(); // done, back to passive
          } else {
            // Just wake word, go active
            void speakFeedback(getFeedback('wakeDetected'));
            goActive();
          }
        }
        // else: ignore non-wake speech in passive mode
      } else if (modeRef.current === 'active') {
        // In active mode, try to match command (with or without wake word)
        const textToMatch = hasWake ? stripWakePhrase(transcript) : transcript;
        const cmd = matchCommand(textToMatch);
        if (cmd) {
          setLastCommand(cmd);
          setError(null);
          goPassive(); // command handled, back to passive
        } else {
          setError(getFeedback('notRecognized'));
          void speakFeedback(getFeedback('notRecognized'));
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError(getFeedback('micDenied'));
        void speakFeedback(getFeedback('micDenied'));
        setMode('off');
        modeRef.current = 'off';
        setIsListening(false);
        return;
      }
      if (event.error === 'no-speech') {
        // Don't show error in passive mode
        if (modeRef.current === 'active') {
          setError(getFeedback('noSpeech'));
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!stoppedManuallyRef.current && modeRef.current !== 'off') {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current !== 'off') {
            try { recognition.start(); } catch { createRecognition(); }
          }
        }, 300);
      }
    };

    try { recognition.start(); } catch {
      restartTimerRef.current = setTimeout(() => {
        if (modeRef.current !== 'off') createRecognition();
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognitionAPI, destroyRecognition, goActive, goPassive]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError(getFeedback('notSupported'));
      void speakFeedback(getFeedback('notSupported'));
      return;
    }
    stoppedManuallyRef.current = false;
    setError(null);
    setLastCommand(null);
    setMode('passive');
    modeRef.current = 'passive';
    createRecognition();
  }, [SpeechRecognitionAPI, createRecognition]);

  const stopListening = useCallback(() => {
    stoppedManuallyRef.current = true;
    setMode('off');
    modeRef.current = 'off';
    destroyRecognition();
  }, [destroyRecognition]);

  useEffect(() => {
    return () => {
      stoppedManuallyRef.current = true;
      destroyRecognition();
    };
  }, [destroyRecognition]);

  return {
    isListening,
    mode,
    lastCommand,
    error,
    startListening,
    stopListening,
    clearLastCommand,
    isSupported,
  };
};
