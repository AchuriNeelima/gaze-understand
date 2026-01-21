import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface CaptionResult {
  caption: string;
  translatedCaption: string | null;
  safetyAlerts: string[];
  language: string;
}

interface UseImageCaptionReturn {
  caption: string | null;
  translatedCaption: string | null;
  safetyAlerts: string[];
  isLoading: boolean;
  generateCaption: (imageData: string, language?: string) => Promise<void>;
  clearCaption: () => void;
}

// Demo captions for offline/demo mode
const DEMO_CAPTIONS = [
  "A serene landscape with rolling green hills under a bright blue sky with scattered white clouds. In the foreground, there's a winding path leading towards distant mountains.",
  "A cozy indoor scene showing a wooden desk with an open laptop, a warm cup of coffee, and a potted plant by a sunlit window.",
  "A vibrant city street at night with neon signs reflecting on wet pavement after rain. People with umbrellas walk past illuminated storefronts.",
  "A close-up of a golden retriever with expressive brown eyes, sitting in a garden surrounded by colorful flowers.",
  "A modern kitchen with stainless steel appliances, marble countertops, and fresh produce arranged on a cutting board.",
];

export const useImageCaption = (): UseImageCaptionReturn => {
  const [caption, setCaption] = useState<string | null>(null);
  const [translatedCaption, setTranslatedCaption] = useState<string | null>(null);
  const [safetyAlerts, setSafetyAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateCaption = useCallback(async (imageData: string, language: string = 'en') => {
    setIsLoading(true);
    setCaption(null);
    setTranslatedCaption(null);
    setSafetyAlerts([]);

    try {
      // Simulate API call with demo content
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Pick a random demo caption
      const randomCaption = DEMO_CAPTIONS[Math.floor(Math.random() * DEMO_CAPTIONS.length)];
      
      setCaption(randomCaption);
      
      // Simulate translation for non-English languages
      if (language !== 'en') {
        setTranslatedCaption(`[${language.toUpperCase()}] ${randomCaption}`);
      }

      // Randomly add safety alerts for demo purposes (10% chance)
      if (Math.random() < 0.1) {
        setSafetyAlerts(['Vehicle detected in image', 'Traffic signs visible']);
      }

      toast({
        title: "Caption Generated",
        description: "Your image has been analyzed successfully.",
      });
    } catch (error) {
      console.error('Error generating caption:', error);
      toast({
        title: "Error",
        description: "Failed to generate caption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCaption = useCallback(() => {
    setCaption(null);
    setTranslatedCaption(null);
    setSafetyAlerts([]);
  }, []);

  return {
    caption,
    translatedCaption,
    safetyAlerts,
    isLoading,
    generateCaption,
    clearCaption,
  };
};
