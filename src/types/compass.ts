export type CompassMode = 'sensor' | 'manual';

export type SensorStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unsupported'
  | 'error';

export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';

export interface CompassState {
  heading: number; // Azimut normalizado [0, 360)
  cumulativeRotation: number; // Ángulo acumulado continuo para CSS (evita giro brusco 359° -> 0°)
  cardinal: CardinalDirection;
  mode: CompassMode;
  sensorStatus: SensorStatus;
  accuracy: number | null; // Precisión en grados (si el navegador la expone)
  needsCalibration: boolean; // true si accuracy > 25°
  error: string | null;
}

export interface DeviceOrientationEventWithWebkit extends DeviceOrientationEvent {
  readonly webkitCompassHeading?: number;
  readonly webkitCompassAccuracy?: number;
}

export interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}
