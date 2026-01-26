import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ElevenLabs voice IDs for different language tones
const VOICE_IDS = {
  default: "EXAVITQu4vr4xnSDxMaL", // Sarah - good for general use
  female: "EXAVITQu4vr4xnSDxMaL", // Sarah
  male: "JBFqnCBsd6RMkjVDRZzb", // George
};

// Language codes that ElevenLabs multilingual v2 supports well
const ELEVENLABS_SUPPORTED = ['en', 'hi', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ru', 'nl', 'tr', 'sv', 'id', 'fil', 'ja', 'ko', 'zh', 'ar', 'cs', 'da', 'fi', 'el', 'hu', 'ro', 'sk', 'uk', 'vi', 'bg', 'hr', 'ms', 'ta'];

// Google Cloud TTS language codes
const GOOGLE_TTS_LANGS: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language = "en" } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`TTS request - Language: ${language}, Text length: ${text.length}`);

    // Check for ElevenLabs API key first
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    // Check for Google Cloud API key as fallback
    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");

    // Try ElevenLabs for supported languages
    if (ELEVENLABS_API_KEY && ELEVENLABS_SUPPORTED.includes(language)) {
      try {
        console.log("Using ElevenLabs TTS");
        const voiceId = VOICE_IDS.female;
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true,
                speed: 0.9,
              },
            }),
          }
        );

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = base64Encode(audioBuffer);
          
          return new Response(
            JSON.stringify({ 
              audioContent: base64Audio,
              format: "mp3",
              provider: "elevenlabs"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("ElevenLabs error:", await response.text());
        }
      } catch (e) {
        console.error("ElevenLabs TTS failed:", e);
      }
    }

    // Try Google Cloud TTS for languages like Telugu that ElevenLabs doesn't support
    if (GOOGLE_CLOUD_API_KEY) {
      try {
        console.log("Using Google Cloud TTS");
        const langCode = GOOGLE_TTS_LANGS[language] || `${language}-IN`;
        
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: langCode,
                ssmlGender: "FEMALE",
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 0.9,
                pitch: 0,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          return new Response(
            JSON.stringify({ 
              audioContent: data.audioContent,
              format: "mp3",
              provider: "google"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("Google TTS error:", await response.text());
        }
      } catch (e) {
        console.error("Google Cloud TTS failed:", e);
      }
    }

    // If no cloud TTS available, return a flag to use browser TTS
    console.log("No cloud TTS available, falling back to browser");
    return new Response(
      JSON.stringify({ 
        useBrowserTTS: true,
        text,
        language,
        message: "Cloud TTS not configured. Using browser speech synthesis."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in text-to-speech function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
