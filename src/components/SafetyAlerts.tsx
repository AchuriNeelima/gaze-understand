import React from 'react';
import { AlertTriangle, Car, Footprints, Flame, Construction, User } from 'lucide-react';

interface SafetyAlertsProps {
  alerts: string[];
  onSpeak?: (text: string) => void;
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
  vehicle: <Car className="h-5 w-5" />,
  car: <Car className="h-5 w-5" />,
  traffic: <Construction className="h-5 w-5" />,
  stairs: <Footprints className="h-5 w-5" />,
  fire: <Flame className="h-5 w-5" />,
  person: <User className="h-5 w-5" />,
};

const getAlertIcon = (alert: string) => {
  const lowerAlert = alert.toLowerCase();
  for (const [key, icon] of Object.entries(ALERT_ICONS)) {
    if (lowerAlert.includes(key)) {
      return icon;
    }
  }
  return <AlertTriangle className="h-5 w-5" />;
};

export const SafetyAlerts: React.FC<SafetyAlertsProps> = ({ alerts, onSpeak }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4 mb-4 animate-pulse"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <h3 className="text-lg font-bold text-destructive">Safety Alerts</h3>
      </div>

      <ul className="space-y-2">
        {alerts.map((alert, index) => (
          <li
            key={index}
            className="flex items-center gap-3 bg-background/50 rounded-lg p-3"
          >
            <span className="text-destructive" aria-hidden="true">
              {getAlertIcon(alert)}
            </span>
            <span className="text-foreground font-medium flex-1">{alert}</span>
          </li>
        ))}
      </ul>

      {onSpeak && (
        <button
          onClick={() => onSpeak(`Warning! ${alerts.join('. ')}`)}
          className="mt-3 text-sm text-destructive hover:underline focus:outline-none focus:ring-2 focus:ring-destructive rounded px-2 py-1"
          aria-label="Read safety alerts aloud"
        >
          Read alerts aloud
        </button>
      )}
    </div>
  );
};
