import React from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoiceMode } from '@/hooks/useVoiceRecognition';

interface VoiceStatusIndicatorProps {
  mode: VoiceMode;
  isListening: boolean;
  onToggle: () => void;
  isSupported: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  mode,
  isListening,
  onToggle,
  isSupported,
}) => {
  if (!isSupported) return null;

  const label =
    mode === 'active'
      ? 'Active – Listening for commands'
      : mode === 'passive'
        ? 'Passive – Say "Hi Buddy"'
        : 'Voice off';

  const icon =
    mode === 'active' ? (
      <Mic className="h-5 w-5 mr-2" />
    ) : mode === 'passive' ? (
      <Radio className="h-5 w-5 mr-2" />
    ) : (
      <MicOff className="h-5 w-5 mr-2" />
    );

  return (
    <div className="relative">
      <Button
        variant={mode === 'active' ? 'default' : mode === 'passive' ? 'secondary' : 'outline'}
        size="lg"
        onClick={onToggle}
        aria-label={label}
        aria-live="polite"
        className={cn(
          'relative transition-all duration-300',
          mode === 'active' && 'ring-2 ring-primary ring-offset-2 ring-offset-background voice-listening',
          mode === 'passive' && 'ring-1 ring-muted-foreground/30'
        )}
      >
        {icon}
        {mode === 'active' ? 'Listening...' : mode === 'passive' ? 'Say "Hi Buddy"' : 'Voice Off'}
      </Button>

      {/* Pulsing indicator for active mode */}
      {mode === 'active' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </span>
      )}

      {/* Subtle dot for passive mode */}
      {mode === 'passive' && isListening && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-muted-foreground opacity-50" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/60" />
        </span>
      )}
    </div>
  );
};
