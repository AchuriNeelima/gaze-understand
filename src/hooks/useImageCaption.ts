import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: { imageData, language },
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Failed to generate caption');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result = data as CaptionResult;

      if (result.caption) {
        setCaption(result.caption);
        
        if (result.translatedCaption) {
          setTranslatedCaption(result.translatedCaption);
        }
        
        if (result.safetyAlerts && result.safetyAlerts.length > 0) {
          setSafetyAlerts(result.safetyAlerts);
        }

        toast({
          title: "Caption Generated",
          description: "Your image has been analyzed by AI.",
        });
      } else {
        throw new Error('No caption received from AI');
      }
    } catch (error) {
      console.error('Error generating caption:', error);
      
      let errorMessage = "Failed to generate caption. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes('payment') || error.message.includes('credits')) {
          errorMessage = "AI service requires credits. Please check your account.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
