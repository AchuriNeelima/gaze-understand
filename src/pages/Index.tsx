import React, { useState, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { History, Save } from 'lucide-react';
import { HeroSection, FeaturePills } from '@/components/HeroSection';
import { ImageUploader } from '@/components/ImageUploader';
import { CaptionDisplay } from '@/components/CaptionDisplay';
import { AccessibilityInfo } from '@/components/AccessibilityInfo';
import { LanguageSelector } from '@/components/LanguageSelector';
import { SafetyAlerts } from '@/components/SafetyAlerts';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useImageCaption } from '@/hooks/useImageCaption';
import { useCaptionHistory } from '@/hooks/useCaptionHistory';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const { speak, stop, isSpeaking, isSupported, setLanguage } = useTextToSpeech(selectedLanguage);
  const { caption, translatedCaption, safetyAlerts, isLoading, generateCaption, clearCaption } = useImageCaption();
  const { addToHistory } = useCaptionHistory();

  const handleImageSelect = useCallback(async (imageData: string) => {
    setCurrentImage(imageData);
    stop();
    await generateCaption(imageData, selectedLanguage);
  }, [generateCaption, stop, selectedLanguage]);

  const handleClear = useCallback(() => {
    setCurrentImage(null);
    clearCaption();
    stop();
  }, [clearCaption, stop]);

  const handleSpeak = useCallback(() => {
    const textToSpeak = translatedCaption || caption;
    if (textToSpeak) {
      if (safetyAlerts.length > 0) {
        speak(`Warning! ${safetyAlerts.join('. ')}. ${textToSpeak}`, selectedLanguage);
      } else {
        speak(textToSpeak, selectedLanguage);
      }
    }
  }, [caption, translatedCaption, safetyAlerts, speak, selectedLanguage]);

  const handleSave = useCallback(() => {
    if (currentImage && caption) {
      addToHistory({
        imageData: currentImage,
        caption,
        translatedCaption: translatedCaption || undefined,
        language: selectedLanguage,
        safetyAlerts: safetyAlerts.length > 0 ? safetyAlerts : undefined,
      });
      toast({
        title: "Saved to History",
        description: "Caption saved successfully.",
      });
    } else {
      toast({
        title: "Nothing to save",
        description: "Generate a caption first.",
        variant: "destructive",
      });
    }
  }, [currentImage, caption, translatedCaption, selectedLanguage, safetyAlerts, addToHistory]);

  const handleLanguageChange = useCallback(async (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    setLanguage(newLanguage);
    if (currentImage && !isLoading) {
      await generateCaption(currentImage, newLanguage);
    }
  }, [currentImage, isLoading, generateCaption, setLanguage]);

  // Auto-read caption when generated
  useEffect(() => {
    if (caption && isSupported && !isLoading) {
      const textToSpeak = translatedCaption || caption;
      const timer = setTimeout(() => {
        if (safetyAlerts.length > 0) {
          speak(`Warning! ${safetyAlerts.join('. ')}. ${textToSpeak}`, selectedLanguage);
        } else {
          speak(textToSpeak, selectedLanguage);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [caption, translatedCaption, safetyAlerts, isSupported, isLoading, speak, selectedLanguage]);

  return (
    <>
      <Helmet>
        <title>See Through Sound - AI Image Captioning for Visually Impaired</title>
        <meta
          name="description"
          content="AI-powered image caption generator with text-to-speech in 15+ languages, safety alerts, and accessibility features. Designed for visually impaired users."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="min-h-screen bg-background">
        <main
          id="main-content"
          className="container max-w-4xl mx-auto px-4 py-8 md:py-16"
          role="main"
        >
          {/* Header with navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <HeroSection />
            <div className="flex items-center gap-2">
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
              />
              <Link to="/history">
                <Button variant="outline" size="lg" aria-label="View caption history">
                  <History className="h-5 w-5 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Pills */}
          {!currentImage && <FeaturePills />}

          {/* Intro text when no image */}
          {!currentImage && (
            <div className="text-center mt-8 mb-8">
              <p className="text-accessible-lg text-muted-foreground max-w-2xl mx-auto">
                Upload any image and hear a detailed description read aloud.
                Designed for visually impaired users to understand the world through AI-powered captions.
              </p>
            </div>
          )}

          <section
            className="space-y-6 mt-8"
            aria-label="Image upload and caption generation"
          >
            <ImageUploader
              onImageSelect={handleImageSelect}
              isLoading={isLoading}
              currentImage={currentImage}
              onClear={handleClear}
            />

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

            {/* Save Button */}
            {caption && !isLoading && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleSave}
                  aria-label="Save caption to history"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save to History
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
              Supports multiple languages with native speech | Safety detection
            </p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default Index;
