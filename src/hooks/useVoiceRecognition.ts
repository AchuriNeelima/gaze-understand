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

  const scheduleActiveTimeout = useCallback(() => {
    clearActiveTimer();
    activeTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'active') {
        void speakFeedback(getFeedback('timeout'));
        setMode('passive');
        modeRef.current = 'passive';
        setError(null);
        console.log('[Voice] → passive mode');
      }
    }, ACTIVE_TIMEOUT_MS);
  }, [clearActiveTimer]);

  const goPassive = useCallback(() => {
    clearActiveTimer();
    setMode('passive');
    modeRef.current = 'passive';
    setError(null);
    console.log('[Voice] → passive mode');
  }, [clearActiveTimer]);

  const goActive = useCallback((resetTimer = true) => {
    clearActiveTimer();
    setMode('active');
    modeRef.current = 'active';
    setError(null);
    console.log('[Voice] → active mode');
    if (resetTimer) scheduleActiveTimeout();
  }, [clearActiveTimer, scheduleActiveTimeout]);

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
          const remainder = stripWakePhrase(transcript);
          const cmd = remainder ? matchCommand(remainder) : null;
          if (cmd) {
            setLastCommand(cmd);
            setError(null);
            // Stay active after open_camera so "capture" works next
            if (cmd === 'open_camera') {
              goActive();
            } else {
              goPassive();
            }
          } else {
            void speakFeedback(getFeedback('wakeDetected'));
            goActive();
          }
        }
      } else if (modeRef.current === 'active') {
        const textToMatch = hasWake ? stripWakePhrase(transcript) : transcript;
        const cmd = matchCommand(textToMatch);
        if (cmd) {
          setLastCommand(cmd);
          setError(null);
          // Stay active after open_camera, go passive after capture/upload
          if (cmd === 'open_camera') {
            goActive(); // reset timer but stay active
          } else {
            goPassive();
          }
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
