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
  getFeedback,
  speakFeedback,
} from '@/utils/voiceLanguages';

export type VoiceMode = 'listening' | 'off';
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

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('off');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stoppedManuallyRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<VoiceMode>('off');

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
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
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

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
      console.log('Recognized:', transcript);

      const cmd = matchCommand(transcript);
      if (cmd) {
        setLastCommand(cmd);
        setError(null);
      } else {
        setError(getFeedback('notRecognized'));
        void speakFeedback(getFeedback('notRecognized'));
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
        setError(getFeedback('noSpeech'));
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!stoppedManuallyRef.current && modeRef.current === 'listening') {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'listening') {
            try { recognition.start(); } catch { createRecognition(); }
          }
        }, 300);
      }
    };

    try { recognition.start(); } catch {
      restartTimerRef.current = setTimeout(() => {
        if (modeRef.current === 'listening') createRecognition();
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognitionAPI, destroyRecognition]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError(getFeedback('notSupported'));
      void speakFeedback(getFeedback('notSupported'));
      return;
    }
    stoppedManuallyRef.current = false;
    setError(null);
    setLastCommand(null);
    setMode('listening');
    modeRef.current = 'listening';
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
