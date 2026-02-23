import React, { useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceCommandButtonProps {
  isListening: boolean;
  onToggle: () => void;
  isSupported: boolean;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  isListening,
  onToggle,
  isSupported,
}) => {
  if (!isSupported) return null;

  return (
    <div className="relative">
      <Button
        variant={isListening ? 'default' : 'outline'}
        size="lg"
        onClick={onToggle}
        aria-label={isListening ? 'Stop voice recognition' : 'Start voice command. Say: open camera or capture.'}
        aria-live="polite"
        className={cn(
          'relative transition-all duration-300',
          isListening && 'ring-2 ring-primary ring-offset-2 ring-offset-background voice-listening'
        )}
      >
        {isListening ? (
          <MicOff className="h-5 w-5 mr-2" />
        ) : (
          <Mic className="h-5 w-5 mr-2" />
        )}
        {isListening ? 'Listening...' : 'Voice'}
      </Button>

      {/* Listening indicator overlay */}
      {isListening && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </span>
      )}
    </div>
  );
};
