import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Camera, Upload, Mic, MicOff, Volume2, VolumeX, Loader2, Check, Globe } from 'lucide-react';
import { VoiceCamera } from '@/components/VoiceCamera';
import { SafetyAlerts } from '@/components/SafetyAlerts';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useImageCaption } from '@/hooks/useImageCaption';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { getFeedback, speakFeedback } from '@/utils/voiceLanguages';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'Telugu' },
  { code: 'hi', name: 'Hindi' },
];

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [triggerCapture, setTriggerCapture] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { speak, stop, isSpeaking, isSupported: ttsSupported, setLanguage } = useTextToSpeech(selectedLanguage);
  const { caption, translatedCaption, safetyAlerts, isLoading, generateCaption, clearCaption } = useImageCaption();
  const {
    isListening,
    mode,
    lastCommand,
    error: voiceError,
    startListening,
    stopListening,
    clearLastCommand,
    isSupported: voiceSupported,
  } = useVoiceRecognition();

  // Auto-start voice on mount
  useEffect(() => {
    if (voiceSupported) {
      const timer = setTimeout(() => startListening(), 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSupported]);

  // Handle voice commands
  useEffect(() => {
    if (!lastCommand) return;

    if (lastCommand === 'open_camera') {
      if (!isCameraOpen) {
        toast({ title: '🎤 Voice Command', description: 'Opening camera...' });
        setIsCameraOpen(true);
        void speakFeedback(getFeedback('cameraOpened'));
      } else {
        void speakFeedback(getFeedback('cameraAlreadyOpen'));
      }
      clearLastCommand();
    }
    if (lastCommand === 'capture') {
      if (isCameraOpen) {
        toast({ title: '🎤 Voice Command', description: 'Capturing...' });
        setTriggerCapture(true);
        // fallback: try to click the capture button directly if present
        try {
          const btn = document.querySelector('[aria-label="Take photo"]') as HTMLButtonElement | null;
          if (btn) {
            btn.click();
          }
        } catch (err) {
          console.warn('Voice capture fallback click failed', err);
        }
        void speakFeedback(getFeedback('capturing'));
      } else {
        // If camera is closed, open it and wait for camera-ready before capturing.
        toast({ title: '🎤 Voice Command', description: 'Opening camera and will capture...' });
        setPendingCapture(true);
        setIsCameraOpen(true);
        void speakFeedback(getFeedback('cameraOpened'));
      }
      clearLastCommand();
    } else if (lastCommand === 'upload') {
      toast({ title: '🎤 Voice Command', description: 'Opening file selector...' });
      void speakFeedback(getFeedback('uploadTriggered'));
      fileInputRef.current?.click();
      clearLastCommand();
    }
  }, [lastCommand, isCameraOpen, clearLastCommand]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      toast({ title: 'Voice', description: voiceError, variant: 'destructive' });
    }
  }, [voiceError]);

  const handleCapturedImage = useCallback(async (imageData: string) => {
    setCurrentImage(imageData);
    setIsCameraOpen(false);
    stop();
    await generateCaption(imageData, selectedLanguage);
  }, [generateCaption, stop, selectedLanguage]);

  const handleCaptureHandled = useCallback(() => setTriggerCapture(false), []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result?.startsWith('data:image/')) {
        setCurrentImage(result);
        void generateCaption(result, selectedLanguage);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLanguageChange = useCallback(async (newLang: string) => {
    setSelectedLanguage(newLang);
    setLanguage(newLang);
    if (currentImage && !isLoading) {
      await generateCaption(currentImage, newLang);
    }
  }, [currentImage, isLoading, generateCaption, setLanguage]);

  const handleSpeak = useCallback(() => {
    const text = translatedCaption || caption;
    if (text) {
      const full = safetyAlerts.length > 0
        ? `Warning! ${safetyAlerts.join('. ')}. ${text}`
        : text;
      speak(full, selectedLanguage);
    }
  }, [caption, translatedCaption, safetyAlerts, speak, selectedLanguage]);

  const handleNewCapture = useCallback(() => {
    setCurrentImage(null);
    clearCaption();
    stop();
  }, [clearCaption, stop]);

  // Auto-read caption when generated
  useEffect(() => {
    if (caption && ttsSupported && !isLoading) {
      const text = translatedCaption || caption;
      const timer = setTimeout(() => {
        const full = safetyAlerts.length > 0
          ? `Warning! ${safetyAlerts.join('. ')}. ${text}`
          : text;
        speak(full, selectedLanguage);
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, translatedCaption, isLoading]);

  const displayCaption = translatedCaption || caption;

  return (
    <>
      <Helmet>
        <title>Image Captioner — Voice Controlled</title>
        <meta name="description" content="Voice-controlled AI image captioning with multilingual output. Capture or upload images and hear captions in English, Telugu, or Hindi." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-hidden="true"
        />

        <main className="container max-w-2xl mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-primary">
              Image Captioner
            </h1>

            <div className="flex items-center gap-2">
              {/* Language selector */}
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[140px] h-10" aria-label="Select output language">
                  <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Voice toggle */}
              {voiceSupported && (
                <Button
                  variant={mode !== 'off' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => mode !== 'off' ? stopListening() : startListening('active')}
                  aria-label={mode !== 'off' ? 'Stop voice input' : 'Start voice input'}
                  className={mode === 'active' ? 'voice-listening' : ''}
                >
                  {mode !== 'off' ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </header>

          {/* Listening indicator */}
          {mode === 'passive' && (
            <div className="text-center text-sm text-muted-foreground mb-6 animate-fade-in">
              🎤 Say <strong>"Hey Buddy"</strong> to activate voice commands
            </div>
          )}
          {mode === 'active' && (
            <div className="text-center text-sm text-primary font-medium mb-6 animate-fade-in">
              🟢 Listening — say <strong>"Open camera"</strong>, <strong>"Capture"</strong>, or <strong>"Upload image"</strong>
            </div>
          )}

          {/* Camera / Image / Controls */}
          <div className="space-y-6">
            {/* Camera view */}
            <VoiceCamera
              isOpen={isCameraOpen}
              onCapture={handleCapturedImage}
              onClose={() => setIsCameraOpen(false)}
              triggerCapture={triggerCapture}
              onCaptureHandled={handleCaptureHandled}
              onReady={() => {
                if (pendingCapture) {
                  setTriggerCapture(true);
                  setPendingCapture(false);
                }
              }}
            />

            {/* Captured image preview */}
            {currentImage && !isCameraOpen && (
              <div className="rounded-2xl overflow-hidden border-2 border-border bg-card animate-scale-in">
                <img
                  src={currentImage}
                  alt="Captured or uploaded image"
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              </div>
            )}

            {/* Action buttons — show when no image yet and camera is closed */}
            {!currentImage && !isCameraOpen && (
              <div className="flex flex-col items-center gap-4 py-12">
                <p className="text-muted-foreground text-center mb-4">
                  Capture or upload an image to generate a caption
                </p>
                <div className="flex gap-4">
                  <Button variant="hero" size="xl" onClick={() => setIsCameraOpen(true)}>
                    <Camera className="h-5 w-5 mr-2" />
                    Camera
                  </Button>
                  <Button variant="outline" size="xl" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-5 w-5 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            )}

            {/* Safety alerts */}
            {safetyAlerts.length > 0 && !isLoading && (
              <SafetyAlerts alerts={safetyAlerts} onSpeak={(text) => speak(text, selectedLanguage)} />
            )}

            {/* Caption display (shows interim caption immediately, with loader while generating) */}
            {displayCaption && (
              <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <h2 className="text-lg font-semibold">Caption</h2>
                </div>

                {isLoading && (
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Generating full caption…</p>
                  </div>
                )}

                <p className="text-accessible-xl text-foreground bg-muted/50 rounded-xl p-5 mb-5 leading-relaxed">
                  {displayCaption}
                </p>

                <div className="flex flex-wrap gap-3">
                  {isSpeaking ? (
                    <Button variant="speaking" size="lg" onClick={stop}>
                      <VolumeX className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button variant="hero" size="lg" onClick={handleSpeak}>
                      <Volume2 className="h-5 w-5 mr-2" />
                      Read Aloud
                    </Button>
                  )}

                  <Button variant="outline" size="lg" onClick={handleNewCapture}>
                    New Image
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
