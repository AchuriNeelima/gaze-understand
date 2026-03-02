import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SpeechRecognitionInstance,
  SpeechRecognitionConstructor,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/types/speech-recognition';
import {
  type VoiceCommand,
  matchWakePhrase,
  matchMultilingualCommand,
  detectLanguageFromText,
  getFeedback,
  speakFeedback,
  LANG_TO_RECOGNITION,
} from '@/utils/voiceLanguages';

export type VoiceMode = 'passive' | 'active' | 'off';

// Re-export for consumers
export type { VoiceCommand } from '@/utils/voiceLanguages';
export { speakFeedback } from '@/utils/voiceLanguages';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  mode: VoiceMode;
  recognizedText: string | null;
  lastCommand: VoiceCommand | null;
  detectedLanguage: string; // short code: 'en', 'hi', 'te'
  error: string | null;
  startPassiveListening: () => void;
  stopListening: () => void;
  clearLastCommand: () => void;
  returnToPassive: () => void;
  keepActive: () => void;
  isSupported: boolean;
}

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

export const useVoiceRecognition = (preferredLanguage: string = 'en'): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('off');
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(preferredLanguage);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const modeRef = useRef<VoiceMode>('off');
  const stoppedManuallyRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWindowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLangRef = useRef<string>(preferredLanguage);

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  // Keep refs in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { currentLangRef.current = detectedLanguage; }, [detectedLanguage]);

  // Update detected language when preferred language changes externally
  useEffect(() => {
    currentLangRef.current = preferredLanguage;
    setDetectedLanguage(preferredLanguage);
  }, [preferredLanguage]);

  const clearActiveWindowTimer = useCallback(() => {
    if (activeWindowTimerRef.current) {
      clearTimeout(activeWindowTimerRef.current);
      activeWindowTimerRef.current = null;
    }
  }, []);

  const setActiveWindow = useCallback(() => {
    clearActiveWindowTimer();
    activeWindowTimerRef.current = setTimeout(() => {
      if (!stoppedManuallyRef.current && modeRef.current === 'active') {
        setMode('passive');
        modeRef.current = 'passive';
      }
    }, 8000);
  }, [clearActiveWindowTimer]);

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
    // Set language based on current detected/preferred language
    const langCode = LANG_TO_RECOGNITION[currentLangRef.current] || 'en-US';
    recognition.lang = langCode;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      console.log('Recognized:', transcript, '| Mode:', modeRef.current, '| Lang:', currentLangRef.current);
      setRecognizedText(transcript);

      if (modeRef.current === 'passive') {
        const wakeLang = matchWakePhrase(transcript);
        if (wakeLang) {
          // Detected wake phrase — switch to that language
          setDetectedLanguage(wakeLang);
          currentLangRef.current = wakeLang;
          setMode('active');
          modeRef.current = 'active';
          const msg = getFeedback(wakeLang, 'listening');
          void speakFeedback(msg, wakeLang).then(() => {
            if (!stoppedManuallyRef.current && modeRef.current === 'active') {
              setActiveWindow();
            }
          });
          // Restart recognition with the detected language for better accuracy
          destroyRecognition();
          restartTimerRef.current = setTimeout(() => {
            if (modeRef.current === 'active') {
              createRecognitionInternal('active');
            }
          }, 300);
        }
      } else if (modeRef.current === 'active') {
        const result = matchMultilingualCommand(transcript);
        if (result) {
          clearActiveWindowTimer();
          // Update detected language from command
          setDetectedLanguage(result.lang);
          currentLangRef.current = result.lang;
          setLastCommand(result.command);
          setError(null);
        } else if (matchWakePhrase(transcript)) {
          const lang = currentLangRef.current;
          setActiveWindow();
          void speakFeedback(getFeedback(lang, 'alreadyListening'), lang);
        } else {
          const lang = currentLangRef.current;
          // Try detecting language from transcript script
          const scriptLang = detectLanguageFromText(transcript);
          if (scriptLang !== currentLangRef.current) {
            setDetectedLanguage(scriptLang);
            currentLangRef.current = scriptLang;
          }
          setActiveWindow();
          setError(getFeedback(lang, 'notRecognized'));
          void speakFeedback(getFeedback(lang, 'notRecognized'), lang);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        const lang = currentLangRef.current;
        const msg = getFeedback(lang, 'micDenied');
        setError(msg);
        speakFeedback(msg, lang);
        setMode('off');
        modeRef.current = 'off';
        setIsListening(false);
        return;
      }

      if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
        if (modeRef.current === 'active' && event.error === 'no-speech') {
          const lang = currentLangRef.current;
          setError(getFeedback(lang, 'noSpeech'));
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!stoppedManuallyRef.current && (modeRef.current === 'passive' || modeRef.current === 'active')) {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'passive' || modeRef.current === 'active') {
            try {
              recognition.start();
            } catch {
              createRecognitionInternal(modeRef.current as 'passive' | 'active');
            }
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch {
      restartTimerRef.current = setTimeout(() => {
        if (modeRef.current === 'passive' || modeRef.current === 'active') {
          createRecognitionInternal(modeRef.current as 'passive' | 'active');
        }
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognitionAPI, destroyRecognition]);

  // Internal ref to avoid circular dependency
  const createRecognitionInternal = createRecognition;

  const stopListening = useCallback(() => {
    stoppedManuallyRef.current = true;
    clearActiveWindowTimer();
    setMode('off');
    modeRef.current = 'off';
    destroyRecognition();
  }, [clearActiveWindowTimer, destroyRecognition]);

  const startPassiveListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      const lang = currentLangRef.current;
      const msg = getFeedback(lang, 'notSupported');
      setError(msg);
      speakFeedback(msg, lang);
      return;
    }

    stoppedManuallyRef.current = false;
    clearActiveWindowTimer();
    setError(null);
    setRecognizedText(null);
    setLastCommand(null);
    setMode('passive');
    modeRef.current = 'passive';
    createRecognition('passive');
  }, [SpeechRecognitionAPI, clearActiveWindowTimer, createRecognition]);

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

  const keepActive = useCallback(() => {
    if (!SpeechRecognitionAPI || stoppedManuallyRef.current) return;
    clearActiveWindowTimer();
    if (modeRef.current !== 'active') {
      setMode('active');
      modeRef.current = 'active';
      if (!recognitionRef.current) {
        createRecognition('active');
      }
    }
    console.log('keepActive: mode forced to active');
  }, [SpeechRecognitionAPI, clearActiveWindowTimer, createRecognition]);

  // Restart recognition when preferred language changes to pick up new lang
  useEffect(() => {
    if (modeRef.current !== 'off' && !stoppedManuallyRef.current) {
      destroyRecognition();
      restartTimerRef.current = setTimeout(() => {
        if (modeRef.current !== 'off') {
          createRecognition(modeRef.current as 'passive' | 'active');
        }
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedManuallyRef.current = true;
      clearActiveWindowTimer();
      destroyRecognition();
    };
  }, [clearActiveWindowTimer, destroyRecognition]);

  return {
    isListening,
    mode,
    recognizedText,
    lastCommand,
    detectedLanguage,
    error,
    startPassiveListening,
    stopListening,
    clearLastCommand,
    returnToPassive,
    keepActive,
    isSupported,
  };
};
