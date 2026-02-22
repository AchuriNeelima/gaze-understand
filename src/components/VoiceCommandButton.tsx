import React, { useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceRecognition, speakFeedback } from '@/hooks/useVoiceRecognition';
import { toast } from '@/hooks/use-toast';

interface VoiceCommandButtonProps {
  onUpload: () => void;
  onCapture: () => void;
  onReset: () => void;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onUpload,
  onCapture,
  onReset,
}) => {
  const {
    isListening,
    recognizedText,
    lastCommand,
    error,
    startListening,
    stopListening,
    clearRecognizedText,
    isSupported,
  } = useVoiceRecognition();

  // Execute commands with spoken feedback
  useEffect(() => {
    if (!lastCommand || lastCommand === 'unknown') return;

    const timer = setTimeout(async () => {
      switch (lastCommand) {
        case 'upload':
          toast({ title: '🎤 Voice Command', description: `"${recognizedText}" → Opening file upload...` });
          await speakFeedback('Opening upload dialog.');
          onUpload();
          break;
        case 'capture':
          toast({ title: '🎤 Voice Command', description: `"${recognizedText}" → Opening camera...` });
          await speakFeedback('Opening camera.');
          onCapture();
          break;
        case 'reset':
          toast({ title: '🎤 Voice Command', description: `"${recognizedText}" → Clearing input...` });
          await speakFeedback('Resetting the form.');
          onReset();
          break;
        case 'submit':
          toast({ title: '🎤 Voice Command', description: `"${recognizedText}" → Submitting your request.` });
          await speakFeedback('Submitting your request.');
          break;
      }
      clearRecognizedText();
    }, 300);

    return () => clearTimeout(timer);
  }, [lastCommand, recognizedText, onUpload, onCapture, onReset, clearRecognizedText]);

  // Show errors as toasts (voice feedback already handled in the hook)
  useEffect(() => {
    if (error) {
      toast({ title: 'Voice Recognition', description: error, variant: 'destructive' });
    }
  }, [error]);

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) return null;

  return (
    <div className="relative">
      <Button
        variant={isListening ? 'default' : 'outline'}
        size="lg"
        onClick={handleClick}
        aria-label={isListening ? 'Stop voice recognition' : 'Start voice command. Says: upload image, capture image, submit, or reset.'}
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

      {/* Recognized text tooltip */}
      {recognizedText && lastCommand === 'unknown' && (
        <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground shadow-lg whitespace-nowrap z-50 animate-fade-in" role="alert">
          "{recognizedText}" — not recognized
        </div>
      )}
    </div>
  );
};
