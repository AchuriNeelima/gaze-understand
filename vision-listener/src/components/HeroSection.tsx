import React from 'react';
import { Eye, Mic, Brain, Heart } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <header className="text-left animate-fade-in">
      {/* Logo/Icon */}
      <div className="flex items-center gap-4 mb-2">
        <div className="relative">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary-soft">
            <Eye className="w-7 h-7 md:w-8 md:h-8 text-primary" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <Mic className="w-3 h-3 text-success-foreground" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-primary">See Through Sound</span>
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered image descriptions</p>
        </div>
      </div>
    </header>
  );
};

interface FeaturePillProps {
  icon: React.ReactNode;
  label: string;
}

export const FeaturePill: React.FC<FeaturePillProps> = ({ icon, label }) => (
  <div
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
    role="listitem"
  >
    <span className="text-primary" aria-hidden="true">{icon}</span>
    {label}
  </div>
);

export const FeaturePills: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-3 mt-8" role="list" aria-label="Key features">
    <FeaturePill icon={<Brain className="w-4 h-4" />} label="AI-Powered" />
    <FeaturePill icon={<Mic className="w-4 h-4" />} label="Voice Output" />
    <FeaturePill icon={<Heart className="w-4 h-4" />} label="Accessible" />
  </div>
);
