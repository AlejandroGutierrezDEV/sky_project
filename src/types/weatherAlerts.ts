export type AlertSeverity = 'info' | 'moderate' | 'severe' | 'extreme';

export type AlertCategory =
  | 'storm'
  | 'wind'
  | 'rain'
  | 'fog'
  | 'temperature'
  | 'clouds';

export interface WeatherAlertCoordinates {
  latitude: number;      // [-90, 90]
  longitude: number;     // [-180, 180]
  timezone?: string;     // IANA (ej. "Europe/Madrid")
  locationName?: string;
}

export interface WeatherAlert {
  id: string;                  // Determinista (ej. `${category}-${startsAtIso}`)
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  astronomyImpact: string;     // Impacto práctico (ej. "Riesgo para trípodes y telescopios")
  startsAt: Date;
  endsAt: Date;
  peakValue?: string;          // Ej. "68 km/h" o "-3 °C"
  source: string;
}

export interface DismissedAlertRecord {
  id: string;
  expiresAt: number;           // Timestamp ms para limpiar descartes caducados
}

export interface WeatherAlertsState {
  alerts: WeatherAlert[];
  activeAlerts: WeatherAlert[]; // Excluye descartados vigentes
  dismissedCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
