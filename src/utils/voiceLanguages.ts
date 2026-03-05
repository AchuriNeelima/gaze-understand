/**
 * Voice command utilities — English-only input
 */

export type VoiceCommand = 'open_camera' | 'capture' | 'upload';

// ── Voice commands (English only) ─────────────────────────────
interface CommandKeywords {
  verbs: string[];
  nouns: string[];
  solo: string[];
}

const COMMANDS: Record<VoiceCommand, CommandKeywords> = {
  open_camera: {
    verbs: ['open', 'start', 'launch', 'activate', 'turn on', 'switch on'],
    nouns: ['camera', 'cam'],
    solo: [],
  },
  capture: {
    verbs: ['capture', 'click', 'take', 'snap', 'shoot', 'grab', 'get'],
    nouns: ['photo', 'picture', 'image', 'pic', 'snapshot', 'shot'],
    solo: ['capture', 'snap', 'shoot', 'click'],
  },
  upload: {
    verbs: ['upload', 'choose', 'select', 'pick', 'browse'],
    nouns: ['image', 'photo', 'picture', 'file'],
    solo: ['upload'],
  },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Match an English voice command. Returns the command or null. */
export function matchCommand(text: string): VoiceCommand | null {
  const norm = normalize(text);
  console.log('[VoiceCmd] Normalized:', norm);

  for (const [cmd, kw] of Object.entries(COMMANDS) as [VoiceCommand, CommandKeywords][]) {
    const hasVerb = kw.verbs.some(v => norm.includes(v));
    const hasNoun = kw.nouns.some(n => norm.includes(n));
    const hasSolo = kw.solo.some(s => norm.includes(s));

    if ((hasVerb && hasNoun) || hasSolo) {
      console.log(`[VoiceCmd] MATCHED: ${cmd}`);
      return cmd;
    }
  }

  console.log('[VoiceCmd] No match');
  return null;
}

// ── Feedback messages (English) ───────────────────────────────
const FEEDBACK: Record<string, string> = {
  listening: "I'm listening. Say open camera, capture, or upload image.",
  cameraOpened: 'Camera opened. Say capture to take a photo.',
  cameraAlreadyOpen: 'Camera is already open. Say capture to take a photo.',
  capturing: 'Capturing image.',
  cameraNotOpen: 'Camera is not open. Say open the camera first.',
  uploadTriggered: 'Opening file selector.',
  micDenied: 'Microphone access denied. Please enable microphone permission.',
  notSupported: 'Voice recognition is not supported in this browser.',
  noSpeech: 'No speech detected. Please try again.',
  notRecognized: 'Command not recognised. Say open camera, capture, or upload image.',
};

export function getFeedback(key: string): string {
  return FEEDBACK[key] || '';
}

/** Speak text using browser SpeechSynthesis in English */
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
