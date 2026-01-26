import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic } from 'lucide-react';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
}

// Voice options optimized for different languages and tones
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Natural, warm female voice', gender: 'female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Soft, clear female voice', gender: 'female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Professional female voice', gender: 'female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Expressive female voice', gender: 'female' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Natural male voice', gender: 'male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Friendly male voice', gender: 'male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep male voice', gender: 'male' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Clear male voice', gender: 'male' },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
}) => {
  const selectedOption = VOICE_OPTIONS.find(v => v.id === selectedVoice);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedVoice} onValueChange={onVoiceChange}>
        <SelectTrigger 
          className="w-[160px] h-12 text-base"
          aria-label="Select voice for text-to-speech"
        >
          <Mic className="h-4 w-4 mr-2 flex-shrink-0" aria-hidden="true" />
          <SelectValue placeholder="Voice">
            {selectedOption?.name || 'Select voice'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Female Voices</div>
          {VOICE_OPTIONS.filter(v => v.gender === 'female').map((voice) => (
            <SelectItem key={voice.id} value={voice.id} className="py-3">
              <div className="flex flex-col">
                <span className="font-medium">{voice.name}</span>
                <span className="text-xs text-muted-foreground">{voice.description}</span>
              </div>
            </SelectItem>
          ))}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Male Voices</div>
          {VOICE_OPTIONS.filter(v => v.gender === 'male').map((voice) => (
            <SelectItem key={voice.id} value={voice.id} className="py-3">
              <div className="flex flex-col">
                <span className="font-medium">{voice.name}</span>
                <span className="text-xs text-muted-foreground">{voice.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
