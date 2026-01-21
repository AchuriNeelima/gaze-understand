import React from 'react';
import { Keyboard, Monitor, Volume2, Accessibility } from 'lucide-react';

export const AccessibilityInfo: React.FC = () => {
  return (
    <section
      className="mt-16 pt-12 border-t border-border"
      aria-labelledby="accessibility-heading"
    >
      <h2 id="accessibility-heading" className="text-2xl font-bold text-center mb-8">
        Built for Accessibility
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AccessibilityCard
          icon={<Keyboard className="w-6 h-6" />}
          title="Keyboard Navigation"
          description="Full keyboard support. Use Tab to navigate and Enter to activate."
        />
        <AccessibilityCard
          icon={<Monitor className="w-6 h-6" />}
          title="Screen Reader Ready"
          description="Optimized for NVDA, JAWS, VoiceOver, and other assistive technologies."
        />
        <AccessibilityCard
          icon={<Volume2 className="w-6 h-6" />}
          title="Text-to-Speech"
          description="Captions are read aloud using your device's built-in speech synthesis."
        />
        <AccessibilityCard
          icon={<Accessibility className="w-6 h-6" />}
          title="High Contrast"
          description="Designed with high contrast colors for better visibility."
        />
      </div>
    </section>
  );
};

interface AccessibilityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const AccessibilityCard: React.FC<AccessibilityCardProps> = ({ icon, title, description }) => (
  <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary" aria-hidden="true">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);
