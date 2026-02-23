import React, { useState, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { History, Save } from 'lucide-react';
import { HeroSection, FeaturePills } from '@/components/HeroSection';
import { VoiceCamera } from '@/components/VoiceCamera';
import { CaptionDisplay } from '@/components/CaptionDisplay';
import { AccessibilityInfo } from '@/components/AccessibilityInfo';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceSelector, VOICE_OPTIONS } from '@/components/VoiceSelector';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { SafetyAlerts } from '@/components/SafetyAlerts';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useImageCaption } from '@/hooks/useImageCaption';
import { useCaptionHistory } from '@/hooks/useCaptionHistory';
import { useVoiceRecognition, speakFeedback } from '@/hooks/useVoiceRecognition';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [triggerCapture, setTriggerCapture] = useState(false);

  const { speak, stop, isSpeaking, isSupported: ttsSupported, setLanguage } = useTextToSpeech(selectedLanguage);
  const { caption, translatedCaption, safetyAlerts, isLoading, generateCaption, clearCaption } = useImageCaption();
  const { addToHistory } = useCaptionHistory();
  const {
    isListening,
    lastCommand,
    error: voiceError,
    startListening,
    stopListening,
    clearLastCommand,
    isSupported: voiceSupported,
  } = useVoiceRecognition();

  // Handle voice commands
  useEffect(() => {
    if (!lastCommand) return;

    const handle = async () => {
      if (lastCommand === 'open_camera') {
        if (isCameraOpen) {
          await speakFeedback('Camera is already open. Say capture to take a photo.');
        } else {
          toast({ title: '🎤 Voice Command', description: 'Opening camera...' });
          await speakFeedback('Opening camera. Say capture or click image when ready.');
          setIsCameraOpen(true);
        }
        clearLastCommand();
        // Auto-listen for capture command after camera opens
        setTimeout(() => {
          startListening('Camera is open. Say capture, click image, or take photo.');
        }, 1500);
      } else if (lastCommand === 'capture') {
        if (isCameraOpen) {
          toast({ title: '🎤 Voice Command', description: 'Capturing image...' });
          await speakFeedback('Capturing image.');
          setTriggerCapture(true);
        } else {
          await speakFeedback('Camera is not open. Say open camera first.');
        }
        clearLastCommand();
      }
    };

    handle();
  }, [lastCommand, isCameraOpen, clearLastCommand, startListening]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      toast({ title: 'Voice Recognition', description: voiceError, variant: 'destructive' });
    }
  }, [voiceError]);

  const handleCapturedImage = useCallback(async (imageData: string) => {
    setCurrentImage(imageData);
    setIsCameraOpen(false);
    stop();
    await speakFeedback('Image captured. Generating caption, please wait.');
    await generateCaption(imageData, selectedLanguage);
  }, [generateCaption, stop, selectedLanguage]);

  const handleCaptureHandled = useCallback(() => {
    setTriggerCapture(false);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      if (isCameraOpen) {
        startListening('Say capture, click image, or take photo.');
      } else {
        startListening('Say open camera to begin.');
      }
    }
  }, [isListening, isCameraOpen, startListening, stopListening]);

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

  const handleSave = useCallback(() => {
    if (currentImage && caption) {
      addToHistory({
        imageData: currentImage,
        caption,
        translatedCaption: translatedCaption || undefined,
        language: selectedLanguage,
        safetyAlerts: safetyAlerts.length > 0 ? safetyAlerts : undefined,
      });
      toast({ title: 'Saved to History', description: 'Caption saved successfully.' });
    }
  }, [currentImage, caption, translatedCaption, selectedLanguage, safetyAlerts, addToHistory]);

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
  }, [clearCaption, stop]);

  // Auto-read caption when generated
  useEffect(() => {
    if (caption && ttsSupported && !isLoading) {
      const textToSpeak = translatedCaption || caption;
      const timer = setTimeout(() => {
        if (safetyAlerts.length > 0) {
          speak(`Warning! ${safetyAlerts.join('. ')}. ${textToSpeak}`, selectedLanguage, selectedVoice);
        } else {
          speak(textToSpeak, selectedLanguage, selectedVoice);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [caption, translatedCaption, safetyAlerts, ttsSupported, isLoading, speak, selectedLanguage, selectedVoice]);

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
              <VoiceCommandButton isListening={isListening} onToggle={handleVoiceToggle} isSupported={voiceSupported} />
              <Link to="/history">
                <Button variant="outline" size="lg" aria-label="View caption history">
                  <History className="h-5 w-5 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Pills */}
          {!currentImage && !isCameraOpen && <FeaturePills />}

          {/* Intro text */}
          {!currentImage && !isCameraOpen && (
            <div className="text-center mt-8 mb-8">
              <p className="text-accessible-lg text-muted-foreground max-w-2xl mx-auto">
                Tap the <strong>Voice</strong> button and say <strong>"Open Camera"</strong> to begin.
                Then say <strong>"Capture"</strong> to take a photo and hear an AI-generated description.
              </p>
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
                <Button variant="secondary" size="lg" onClick={handleSave} aria-label="Save caption to history">
                  <Save className="h-5 w-5 mr-2" />
                  Save to History
                </Button>
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
              Voice-controlled camera | Multiple languages | Safety detection
            </p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default Index;
