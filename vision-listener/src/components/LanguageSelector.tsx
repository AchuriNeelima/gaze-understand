import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          aria-label={`Current language: ${currentLanguage.name}. Click to change language.`}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span>{currentLanguage.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => onLanguageChange(language.code)}
            className={selectedLanguage === language.code ? 'bg-primary/10' : ''}
          >
            <span className="mr-2">{language.nativeName}</span>
            <span className="text-muted-foreground text-sm">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
