/**
 * Multilingual voice command utilities
 * Supports: English, Hindi, Telugu (extensible to more)
 */

export type VoiceCommand = 'open_camera' | 'capture';

// Map short language codes to speech recognition locale codes
export const LANG_TO_RECOGNITION: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
};

export const RECOGNITION_TO_LANG: Record<string, string> = {
  'en-US': 'en',
  'hi-IN': 'hi',
  'te-IN': 'te',
};

// ── Wake phrases ──────────────────────────────────────────────
export const WAKE_PHRASES: Array<{ pattern: RegExp; lang: string }> = [
  // English — must be checked before generic "hello"
  { pattern: /hey\s*buddy/i, lang: 'en' },

  // Hindi — check multi-word patterns before single-word
  { pattern: /hello\s*dost/i, lang: 'hi' },
  { pattern: /suno\s*dost/i, lang: 'hi' },
  { pattern: /सुनो\s*दोस्त/i, lang: 'hi' },
  { pattern: /हेलो\s*दोस्त/i, lang: 'hi' },

  // Telugu — "hello" alone (must be LAST since it's very generic)
  { pattern: /^hello$/i, lang: 'te' },
  { pattern: /హలో/i, lang: 'te' },
];

/** Check if text contains a wake phrase. Returns matched language or null. */
export function matchWakePhrase(text: string): string | null {
  for (const wp of WAKE_PHRASES) {
    if (wp.pattern.test(text)) return wp.lang;
  }
  return null;
}

// ── Command keywords per language ─────────────────────────────
interface CommandKeywords {
  openCamera: { verbs: string[]; nouns: string[] };
  capture: { verbs: string[]; nouns: string[]; solo: string[] };
}

const COMMANDS: Record<string, CommandKeywords> = {
  en: {
    openCamera: {
      verbs: ['open', 'start', 'launch', 'activate', 'turn on', 'switch on'],
      nouns: ['camera', 'cam'],
    },
    capture: {
      verbs: ['capture', 'click', 'take', 'snap', 'shoot', 'grab', 'get'],
      nouns: ['photo', 'picture', 'image', 'pic', 'snapshot', 'shot'],
      solo: ['capture', 'snap', 'shoot'],
    },
  },
  hi: {
    openCamera: {
      // Devanagari + English transliterations (Chrome often returns romanized text)
      verbs: ['खोलो', 'खोल', 'चालू', 'शुरू', 'ओपन', 'स्टार्ट', 'kholo', 'khol', 'chalu', 'shuru', 'open', 'start'],
      nouns: ['कैमरा', 'कैमेरा', 'कमरा', 'camera', 'kamera'],
    },
    capture: {
      verbs: ['खींचो', 'खींच', 'लो', 'लें', 'ले', 'क्लिक', 'कैप्चर', 'तस्वीर', 'khincho', 'kheencho', 'click', 'capture', 'lo', 'le'],
      nouns: ['फोटो', 'तस्वीर', 'फ़ोटो', 'चित्र', 'पिक्चर', 'इमेज', 'photo', 'tasveer', 'picture'],
      solo: ['कैप्चर', 'क्लिक', 'खींचो', 'capture', 'click', 'khincho'],
    },
  },
  te: {
    openCamera: {
      // Telugu script + English transliterations
      verbs: ['ఓపెన్', 'తెరువు', 'తెరు', 'ప్రారంభించు', 'స్టార్ట్', 'చేయి', 'చెయ్', 'చెయ్యి', 'చేయండి', 'open', 'start', 'teruvu', 'cheyyi'],
      nouns: ['కెమెరా', 'కేమెరా', 'కామెరా', 'కెమరా', 'camera', 'kamera'],
    },
    capture: {
      verbs: ['తీయి', 'తీయండి', 'తీసుకో', 'క్లిక్', 'క్యాప్చర్', 'తీయు', 'తియ్యి', 'click', 'capture', 'teeyi', 'theeyandi'],
      nouns: ['ఫోటో', 'చిత్రం', 'పిక్చర్', 'బొమ్మ', 'ఇమేజ్', 'photo', 'picture'],
      solo: ['క్యాప్చర్', 'క్లిక్', 'తీయి', 'తీయు', 'capture', 'click', 'teeyi'],
    },
  },
};

function normalize(text: string): string {
  // Keep Unicode letters (Hindi Devanagari, Telugu, etc.)
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match a command across all supported languages. Returns command + detected lang. */
export function matchMultilingualCommand(text: string): { command: VoiceCommand; lang: string } | null {
  const norm = normalize(text);
  console.log('[VoiceCmd] Normalized text:', norm);

  for (const [lang, cmds] of Object.entries(COMMANDS)) {
    // Open camera
    const hasOpenVerb = cmds.openCamera.verbs.some(k => norm.includes(k.toLowerCase()));
    const hasCameraNoun = cmds.openCamera.nouns.some(k => norm.includes(k.toLowerCase()));
    console.log(`[VoiceCmd] Lang=${lang} openCamera: verb=${hasOpenVerb}, noun=${hasCameraNoun}`);
    if (hasOpenVerb && hasCameraNoun) {
      console.log(`[VoiceCmd] MATCHED: open_camera (${lang})`);
      return { command: 'open_camera', lang };
    }

    // Capture
    const hasCaptureVerb = cmds.capture.verbs.some(k => norm.includes(k.toLowerCase()));
    const hasCaptureNoun = cmds.capture.nouns.some(k => norm.includes(k.toLowerCase()));
    const hasSolo = cmds.capture.solo.some(k => norm.includes(k.toLowerCase()));
    if (hasCaptureVerb && hasCaptureNoun) {
      console.log(`[VoiceCmd] MATCHED: capture (${lang})`);
      return { command: 'capture', lang };
    }
    if (hasSolo) {
      console.log(`[VoiceCmd] MATCHED: capture solo (${lang})`);
      return { command: 'capture', lang };
    }
  }

  console.log('[VoiceCmd] No command matched');
  return null;
}

// ── Language detection from script ────────────────────────────
/** Detect language from Unicode script in text */
export function detectLanguageFromText(text: string): string {
  const teluguChars = (text.match(/[\u0C00-\u0C7F]/g) || []).length;
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;

  if (teluguChars > hindiChars && teluguChars > latinChars) return 'te';
  if (hindiChars > teluguChars && hindiChars > latinChars) return 'hi';
  return 'en';
}

// ── Feedback messages ─────────────────────────────────────────
const FEEDBACK: Record<string, Record<string, string>> = {
  en: {
    listening: "Yes, I'm listening. Please say a command.",
    alreadyListening: 'I am already listening. Please say a command.',
    notRecognized: 'Command not recognised. Please try again.',
    cameraOpened: 'Camera opened. Say capture to take a photo.',
    cameraAlreadyOpen: 'Camera is already open. Say capture to take a photo.',
    capturing: 'Capturing image. Generating caption.',
    cameraNotOpen: 'Camera is not open. Say open the camera first.',
    micDenied: 'Microphone access denied. Please enable microphone permission.',
    notSupported: 'Voice recognition is not supported in this browser.',
    noSpeech: 'No speech detected. Please try again.',
  },
  hi: {
    listening: 'हाँ, मैं सुन रहा हूँ। कृपया कमांड बोलें।',
    alreadyListening: 'मैं पहले से सुन रहा हूँ। कृपया कमांड बोलें।',
    notRecognized: 'कमांड समझ नहीं आया। कृपया दोबारा बोलें।',
    cameraOpened: 'कैमरा खुल गया। फोटो लेने के लिए कैप्चर बोलें।',
    cameraAlreadyOpen: 'कैमरा पहले से खुला है। फोटो लेने के लिए कैप्चर बोलें।',
    capturing: 'फोटो ले रहे हैं। कैप्शन बना रहे हैं।',
    cameraNotOpen: 'कैमरा खुला नहीं है। पहले कैमरा खोलो बोलें।',
    micDenied: 'माइक्रोफोन की अनुमति नहीं है। कृपया अनुमति दें।',
    notSupported: 'इस ब्राउज़र में वॉइस रिकग्निशन समर्थित नहीं है।',
    noSpeech: 'कोई आवाज़ नहीं सुनाई दी। कृपया दोबारा बोलें।',
  },
  te: {
    listening: 'అవును, నేను వింటున్నాను. దయచేసి కమాండ్ చెప్పండి.',
    alreadyListening: 'నేను ఇప్పటికే వింటున్నాను. దయచేసి కమాండ్ చెప్పండి.',
    notRecognized: 'కమాండ్ అర్థం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    cameraOpened: 'కెమెరా ఓపెన్ అయింది. ఫోటో తీయడానికి క్యాప్చర్ చెప్పండి.',
    cameraAlreadyOpen: 'కెమెరా ఇప్పటికే ఓపెన్ అయి ఉంది. ఫోటో తీయడానికి క్యాప్చర్ చెప్పండి.',
    capturing: 'ఫోటో తీస్తున్నాము. కాప్షన్ తయారు చేస్తున్నాము.',
    cameraNotOpen: 'కెమెరా ఓపెన్ కాలేదు. ముందు కెమెరా ఓపెన్ చేయి అని చెప్పండి.',
    micDenied: 'మైక్రోఫోన్ అనుమతి లేదు. దయచేసి అనుమతి ఇవ్వండి.',
    notSupported: 'ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు.',
    noSpeech: 'మాటలు వినిపించలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  },
};

export function getFeedback(lang: string, key: string): string {
  return FEEDBACK[lang]?.[key] || FEEDBACK.en[key] || '';
}

/** Speak text using browser SpeechSynthesis with the correct language */
export function speakFeedback(text: string, lang: string = 'en'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_TO_RECOGNITION[lang] || lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
