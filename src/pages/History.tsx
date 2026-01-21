import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Volume2, Clock, AlertTriangle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCaptionHistory, HistoryItem } from '@/hooks/useCaptionHistory';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { toast } from '@/hooks/use-toast';
import { SUPPORTED_LANGUAGES } from '@/components/LanguageSelector';

const History = () => {
  const { history, removeFromHistory, clearHistory } = useCaptionHistory();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const handleSpeak = (caption: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(caption);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      clearHistory();
      toast({
        title: "History Cleared",
        description: "All saved captions have been removed.",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLanguageName = (code?: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang?.nativeName || 'English';
  };

  return (
    <>
      <Helmet>
        <title>Caption History - See Through Sound</title>
        <meta name="description" content="View your saved image captions and descriptions." />
      </Helmet>

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="min-h-screen bg-background">
        <main
          id="main-content"
          className="container max-w-4xl mx-auto px-4 py-8 md:py-16"
          role="main"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="outline" size="icon" aria-label="Back to home">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Caption History
              </h1>
            </div>
            {history.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                aria-label="Clear all history"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No saved captions</h2>
              <p className="text-muted-foreground mb-6">
                Upload an image and save the caption to see it here.
              </p>
              <Link to="/">
                <Button variant="hero" size="lg">
                  Generate a Caption
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.imageData}
                        alt="Saved image thumbnail"
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(item.timestamp)}</span>
                          {item.language && (
                            <>
                              <Globe className="h-4 w-4 ml-2" />
                              <span>{getLanguageName(item.language)}</span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromHistory(item.id)}
                          aria-label="Delete this caption"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Safety alerts */}
                      {item.safetyAlerts && item.safetyAlerts.length > 0 && (
                        <div className="flex items-center gap-2 text-destructive text-sm mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{item.safetyAlerts.join(', ')}</span>
                        </div>
                      )}

                      {/* Caption text */}
                      <p className="text-foreground line-clamp-2 mb-3">
                        {item.translatedCaption || item.caption}
                      </p>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSpeak(item.translatedCaption || item.caption)}
                        aria-label="Read caption aloud"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Read Aloud
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default History;
