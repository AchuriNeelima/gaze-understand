import React, { useState, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Camera } from 'lucide-react';
import { HeroSection, FeaturePills } from '@/components/HeroSection';
import { VoiceCamera } from '@/components/VoiceCamera';
import { CaptionDisplay } from '@/components/CaptionDisplay';
import { AccessibilityInfo } from '@/components/AccessibilityInfo';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceSelector, VOICE_OPTIONS } from '@/components/VoiceSelector';
import { VoiceStatusIndicator } from '@/components/VoiceStatusIndicator';
import { SafetyAlerts } from '@/components/SafetyAlerts';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useImageCaption } from '@/hooks/useImageCaption';
import { useVoiceRecognition, speakFeedback } from '@/hooks/useVoiceRecognition';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type AssistantState = 'passive' | 'camera_open' | 'processing';

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [triggerCapture, setTriggerCapture] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('passive');

  const { speak, stop, isSpeaking, isSupported: ttsSupported, setLanguage } = useTextToSpeech(selectedLanguage);
  const { caption, translatedCaption, safetyAlerts, isLoading, generateCaption, clearCaption } = useImageCaption();

  const {
    isListening,
    mode,
    lastCommand,
    error: voiceError,
    startPassiveListening,
    stopListening,
    clearLastCommand,
    returnToPassive,
    keepActive,
    isSupported: voiceSupported,
  } = useVoiceRecognition();

  // Auto-start passive listening on mount
  useEffect(() => {
    if (voiceSupported) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startPassiveListening();
      }, 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSupported]);

  // Handle voice commands
  useEffect(() => {
    if (!lastCommand) return;

    const handle = async () => {
      if (lastCommand === 'open_camera') {
        if (isCameraOpen) {
          await speakFeedback('Camera is already open. Say capture to take a photo.');
        } else {
          toast({ title: '🎤 Voice Command', description: 'Opening camera...' });
          setIsCameraOpen(true);
          await speakFeedback('Camera opened. Say capture to take a photo.');
        }
        setAssistantState('camera_open');
        // Keep voice active so "capture" command can be heard
        keepActive();
        clearLastCommand();
      } else if (lastCommand === 'capture') {
        if (isCameraOpen || assistantState === 'camera_open') {
          toast({ title: '🎤 Voice Command', description: 'Capturing image...' });
          await speakFeedback('Image captured. Generating caption.');
          setAssistantState('processing');
          setTriggerCapture(true);
        } else {
          await speakFeedback('Camera is not open. Say open the camera first.');
        }
        clearLastCommand();
      }
    };

    handle();
  }, [lastCommand, isCameraOpen, assistantState, clearLastCommand, keepActive]);

  // Show voice errors as toasts
  useEffect(() => {
    if (voiceError) {
      toast({ title: 'Voice Recognition', description: voiceError, variant: 'destructive' });
    }
  }, [voiceError]);

  const handleCapturedImage = useCallback(async (imageData: string) => {
    setCurrentImage(imageData);
    setIsCameraOpen(false);
    setAssistantState('processing');
    stop();
    await generateCaption(imageData, selectedLanguage);
  }, [generateCaption, stop, selectedLanguage]);

  const handleCaptureHandled = useCallback(() => {
    setTriggerCapture(false);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (mode !== 'off') {
      stopListening();
    } else {
      startPassiveListening();
    }
  }, [mode, startPassiveListening, stopListening]);

  const handleSpeak = useCallback(() => {
    const textToSpeak = translatedCaption || caption;
    if (textToSpeak) {
      if (safetyAlerts.length > 0) {
        speak(`Warning! ${safetyAlerts.join('. ')}. ${textToSpeak}`, selectedLanguage, selectedVoice);
      } else {
        speak(textToSpeak, selectedLanguage, selectedVoice);
      }
    }
  }, [caption, translatedCaption, safetyAlerts, speak, selectedLanguage, selectedVoice]);

  const handleLanguageChange = useCallback(async (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    setLanguage(newLanguage);
    if (currentImage && !isLoading) {
      await generateCaption(currentImage, newLanguage);
    }
  }, [currentImage, isLoading, generateCaption, setLanguage]);

  const handleNewCapture = useCallback(() => {
    setCurrentImage(null);
    clearCaption();
    stop();
    setAssistantState('passive');
    // Return to passive listening after completing the flow
    if (voiceSupported) {
      returnToPassive();
    }
  }, [clearCaption, stop, voiceSupported, returnToPassive]);

  // Auto-read caption when generated, then return to passive listening
  useEffect(() => {
    if (caption && ttsSupported && !isLoading) {
      const textToSpeak = translatedCaption || caption;
      const timer = setTimeout(() => {
        const fullText = safetyAlerts.length > 0
          ? `Warning! ${safetyAlerts.join('. ')}. ${textToSpeak}`
          : textToSpeak;
        speak(fullText, selectedLanguage, selectedVoice);

        if (assistantState === 'processing' && voiceSupported) {
          setTimeout(() => {
            setAssistantState('passive');
            returnToPassive();
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, translatedCaption, safetyAlerts, ttsSupported, isLoading, assistantState, voiceSupported, returnToPassive]);

  useEffect(() => {
    if (assistantState === 'processing' && caption && !isLoading && !ttsSupported && voiceSupported) {
      setAssistantState('passive');
      returnToPassive();
    }
  }, [assistantState, caption, isLoading, ttsSupported, voiceSupported, returnToPassive]);

  return (
    <>
      <Helmet>
        <title>See Through Sound - AI Image Captioning for Visually Impaired</title>
        <meta
          name="description"
          content="AI-powered image caption generator with voice-controlled camera, text-to-speech in 15+ languages, safety alerts, and accessibility features."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>

      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="min-h-screen bg-background">
        <main id="main-content" className="container max-w-4xl mx-auto px-4 py-8 md:py-16" role="main">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <HeroSection />
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSelector selectedLanguage={selectedLanguage} onLanguageChange={handleLanguageChange} />
              <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
              <VoiceStatusIndicator
                mode={mode}
                isListening={isListening}
                onToggle={handleVoiceToggle}
                isSupported={voiceSupported}
              />
            </div>
          </div>

          {/* Feature Pills */}
          {!currentImage && !isCameraOpen && <FeaturePills />}

          {/* Intro text & manual capture button */}
          {!currentImage && !isCameraOpen && (
            <div className="text-center mt-8 mb-8 space-y-6">
              <p className="text-accessible-lg text-muted-foreground max-w-2xl mx-auto">
                Say <strong>"Hi Buddy"</strong> to activate voice commands, then say <strong>"Open the Camera"</strong>.
                Or use the button below. Then say <strong>"Capture"</strong> or tap the camera button.
              </p>
              <Button variant="hero" size="xl" onClick={() => { setIsCameraOpen(true); setAssistantState('camera_open'); if (voiceSupported) keepActive(); }} aria-label="Open camera manually">
                <Camera className="h-6 w-6 mr-2" />
                Open Camera
              </Button>
            </div>
          )}

          <section className="space-y-6 mt-8" aria-label="Voice-controlled camera and caption">
            {/* Camera */}
            <VoiceCamera
              isOpen={isCameraOpen}
              onCapture={handleCapturedImage}
              onClose={() => setIsCameraOpen(false)}
              triggerCapture={triggerCapture}
              onCaptureHandled={handleCaptureHandled}
            />

            {/* Captured image preview */}
            {currentImage && !isCameraOpen && (
              <div className="relative animate-scale-in">
                <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-card">
                  <img
                    src={currentImage}
                    alt="Captured image for caption generation"
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
              </div>
            )}

            {/* Safety Alerts */}
            {safetyAlerts.length > 0 && !isLoading && (
              <SafetyAlerts alerts={safetyAlerts} onSpeak={(text) => speak(text, selectedLanguage)} />
            )}

            {/* Caption Display */}
            <CaptionDisplay
              caption={translatedCaption || caption}
              isLoading={isLoading}
              isSpeaking={isSpeaking}
              onSpeak={handleSpeak}
              onStopSpeaking={stop}
            />

            {/* Action buttons after caption */}
            {caption && !isLoading && (
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="outline" size="lg" onClick={handleNewCapture} aria-label="Take a new photo">
                  New Capture
                </Button>
              </div>
            )}
          </section>

          <AccessibilityInfo />

          <footer className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">
              Powered by AI vision technology. Designed with accessibility in mind.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Wake word: "Hi Buddy" | Voice-controlled camera | Multiple languages
            </p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default Index;
