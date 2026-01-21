import { useState, useCallback, useEffect, useRef } from 'react';

// Language code to BCP 47 locale mapping for speech synthesis
const LANGUAGE_VOICE_MAP: Record<string, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU', 'en'],
  hi: ['hi-IN', 'hi'],
  te: ['te-IN', 'te'],
};

interface UseTextToSpeechReturn {
  speak: (text: string, languageCode?: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const useTextToSpeech = (initialLanguage: string = 'en'): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices on mount and when voices change
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const findVoiceForLanguage = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    const locales = LANGUAGE_VOICE_MAP[langCode] || [langCode];

    // Try exact match
    for (const locale of locales) {
      const exactMatch = availableVoices.find(v => v.lang === locale);
      if (exactMatch) {
        return exactMatch;
      }
    }

    // Try partial match
    for (const locale of locales) {
      const partialMatch = availableVoices.find(v =>
        v.lang.startsWith(locale) || locale.startsWith(v.lang) ||
        v.lang.toLowerCase().includes(locale.toLowerCase())
      );
      if (partialMatch) {
        return partialMatch;
      }
    }

    // Try by language name in voice name
    const langNames: Record<string, string[]> = {
      hi: ['hindi', 'हिन्दी'],
      te: ['telugu', 'తెలుగు'],
      en: ['english'],
    };

    const names = langNames[langCode] || [];
    for (const name of names) {
      const nameMatch = availableVoices.find(v =>
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (nameMatch) {
        return nameMatch;
      }
    }

    return null;
  }, [availableVoices]);

  const speak = useCallback((text: string, languageCode?: string) => {
    if (!text || !('speechSynthesis' in window)) return;

    const langToUse = languageCode || currentLanguage;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const locales = LANGUAGE_VOICE_MAP[langToUse] || [langToUse];
    utterance.lang = locales[0];

    const voice = findVoiceForLanguage(langToUse);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [currentLanguage, findVoiceForLanguage]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setCurrentLanguage(lang);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isSupported, currentLanguage, setLanguage, availableVoices };
};
