import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Language code to BCP 47 locale mapping for browser speech synthesis
const LANGUAGE_VOICE_MAP: Record<string, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU', 'en-IN', 'en'],
  hi: ['hi-IN', 'hi'],
  te: ['te-IN', 'te'],
  ta: ['ta-IN', 'ta'],
  mr: ['mr-IN', 'mr'],
  bn: ['bn-IN', 'bn'],
  gu: ['gu-IN', 'gu'],
  kn: ['kn-IN', 'kn'],
  ml: ['ml-IN', 'ml'],
  pa: ['pa-IN', 'pa'],
  es: ['es-ES', 'es-MX', 'es'],
  fr: ['fr-FR', 'fr'],
  de: ['de-DE', 'de'],
  it: ['it-IT', 'it'],
  pt: ['pt-BR', 'pt-PT', 'pt'],
  ja: ['ja-JP', 'ja'],
  ko: ['ko-KR', 'ko'],
  zh: ['zh-CN', 'zh-TW', 'zh'],
  ar: ['ar-SA', 'ar'],
  ru: ['ru-RU', 'ru'],
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicesLoadedRef = useRef(false);

  // Load voices on mount and when voices change
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        voicesLoadedRef.current = true;
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      }
    };

    // Try loading immediately
    loadVoices();

    // Also listen for voiceschanged event (needed for Chrome)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Retry loading after a delay (some browsers are slow)
    const retryTimer = setTimeout(loadVoices, 1000);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearTimeout(retryTimer);
    };
  }, []);

  const findVoiceForLanguage = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    const locales = LANGUAGE_VOICE_MAP[langCode] || [langCode];

    // Try exact match first
    for (const locale of locales) {
      const exactMatch = availableVoices.find(v => v.lang === locale);
      if (exactMatch) {
        console.log(`Found exact voice match: ${exactMatch.name} for ${locale}`);
        return exactMatch;
      }
    }

    // Try partial match (starts with)
    for (const locale of locales) {
      const partialMatch = availableVoices.find(v =>
        v.lang.toLowerCase().startsWith(locale.toLowerCase()) ||
        locale.toLowerCase().startsWith(v.lang.toLowerCase().split('-')[0])
      );
      if (partialMatch) {
        console.log(`Found partial voice match: ${partialMatch.name} for ${locale}`);
        return partialMatch;
      }
    }

    // Try by language name in voice name
    const langNames: Record<string, string[]> = {
      hi: ['hindi', 'हिन्दी'],
      te: ['telugu', 'తెలుగు'],
      ta: ['tamil', 'தமிழ்'],
      en: ['english'],
      es: ['spanish', 'español'],
      fr: ['french', 'français'],
      de: ['german', 'deutsch'],
    };

    const names = langNames[langCode] || [];
    for (const name of names) {
      const nameMatch = availableVoices.find(v =>
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (nameMatch) {
        console.log(`Found name-based voice match: ${nameMatch.name} for ${langCode}`);
        return nameMatch;
      }
    }

    console.log(`No voice found for language: ${langCode}`);
    return null;
  }, [availableVoices]);

  const playAudioFromBase64 = useCallback((base64Audio: string, format: string = 'mp3') => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioUrl = `data:audio/${format};base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      setIsSpeaking(false);
      audioRef.current = null;
    };

    audio.play().catch(e => {
      console.error('Failed to play audio:', e);
      setIsSpeaking(false);
    });
  }, []);

  const speakWithBrowser = useCallback((text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return false;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Set language
    const locales = LANGUAGE_VOICE_MAP[langCode] || [langCode];
    utterance.lang = locales[0];

    // Try to find a voice
    const voice = findVoiceForLanguage(langCode);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }, [findVoiceForLanguage]);

  const speak = useCallback(async (text: string, languageCode?: string) => {
    if (!text) return;

    const langToUse = languageCode || currentLanguage;

    // Stop any ongoing speech/audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      // Try cloud TTS first for better quality
      console.log(`Attempting cloud TTS for language: ${langToUse}`);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, language: langToUse },
      });

      if (error) {
        console.error('Cloud TTS error:', error);
        throw error;
      }

      if (data.audioContent) {
        console.log(`Playing audio from ${data.provider} TTS`);
        playAudioFromBase64(data.audioContent, data.format || 'mp3');
        return;
      }

      // If cloud TTS returns useBrowserTTS flag, use browser
      if (data.useBrowserTTS) {
        console.log('Using browser TTS as fallback');
        speakWithBrowser(text, langToUse);
        return;
      }

    } catch (error) {
      console.error('Cloud TTS failed, using browser fallback:', error);
      // Fallback to browser TTS
      speakWithBrowser(text, langToUse);
    }
  }, [currentLanguage, playAudioFromBase64, speakWithBrowser]);

  const stop = useCallback(() => {
    // Stop browser speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isSupported, currentLanguage, setLanguage, availableVoices };
};
