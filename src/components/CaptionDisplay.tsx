import React from 'react';
import { Volume2, VolumeX, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CaptionDisplayProps {
  caption: string | null;
  isLoading?: boolean;
  isSpeaking?: boolean;
  onSpeak?: () => void;
  onStopSpeaking?: () => void;
}

export const CaptionDisplay: React.FC<CaptionDisplayProps> = ({
  caption,
  isLoading = false,
  isSpeaking = false,
  onSpeak,
  onStopSpeaking,
}) => {
  if (isLoading) {
    return (
      <div
        className="bg-card border-2 border-border rounded-2xl p-8 animate-fade-in"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" aria-hidden="true" />
          <p className="text-accessible-lg text-muted-foreground">
            Analyzing image and generating caption...
          </p>
        </div>
      </div>
    );
  }

  if (!caption) {
    return null;
  }

  return (
    <div
      className="bg-card border-2 border-primary/30 rounded-2xl p-8 animate-slide-up glow-primary-soft"
      role="region"
      aria-label="Generated caption"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-success" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Caption Generated
          </h2>
          <p className="text-sm text-muted-foreground">
            Click the button below to hear it read aloud
          </p>
        </div>
      </div>

      <div
        className="bg-muted/50 rounded-xl p-6 mb-6"
        aria-live="polite"
      >
        <p className="text-accessible-xl text-foreground leading-relaxed">
          {caption}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {isSpeaking ? (
          <Button
            variant="speaking"
            size="xl"
            onClick={onStopSpeaking}
            className="w-full sm:w-auto"
            aria-label="Stop reading caption"
          >
            <div className="audio-wave mr-3" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            Speaking... Click to Stop
          </Button>
        ) : (
          <Button
            variant="hero"
            size="xl"
            onClick={onSpeak}
            className="w-full sm:w-auto"
            aria-label="Read caption aloud"
          >
            <Volume2 className="mr-2" aria-hidden="true" />
            Read Aloud
          </Button>
        )}
      </div>
    </div>
  );
};
