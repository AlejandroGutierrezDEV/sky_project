import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CompassMode,
  CompassState,
  DeviceOrientationEventStatic,
  DeviceOrientationEventWithWebkit,
} from '../types/compass';
import {
  getCardinalDirection,
  normalizeHeading,
  shortestAngleDelta,
  smoothHeading,
} from '../utils/compassMath';

const TIMEOUT_DETECCION_SENSOR_MS = 1500;
const UMBRAL_CALIBRACION_GRADOS = 25;
const ALPHA_SUAVIZADO_SENSOR = 0.22;

interface LecturaSensor {
  heading: number;
  accuracy: number | null;
  needsCalibration: boolean;
}

export interface UseCompassResult extends CompassState {
  requestSensorAccess: () => Promise<void>;
  setManualHeading: (degrees: number) => void;
  setMode: (mode: CompassMode) => void;
}

function soportaDeviceOrientation(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

function tieneRequestPermission(
  ctor: unknown
): ctor is DeviceOrientationEventStatic & {
  requestPermission: () => Promise<'granted' | 'denied'>;
} {
  return (
    typeof ctor === 'function' &&
    'requestPermission' in ctor &&
    typeof (ctor as DeviceOrientationEventStatic).requestPermission === 'function'
  );
}

function obtenerAnguloPantalla(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const angulo = window.screen?.orientation?.angle;
  if (typeof angulo === 'number' && Number.isFinite(angulo)) {
    return angulo;
  }
  return 0;
}

function extraerLecturaOrientacion(
  evento: DeviceOrientationEventWithWebkit
): LecturaSensor | null {
  const compensacionPantalla = obtenerAnguloPantalla();

  // iOS / Safari expone webkitCompassHeading en sentido horario respecto al norte magnético
  if (
    typeof evento.webkitCompassHeading === 'number' &&
    Number.isFinite(evento.webkitCompassHeading) &&
    evento.webkitCompassHeading >= 0
  ) {
    const heading = normalizeHeading(evento.webkitCompassHeading + compensacionPantalla);
    const precisionValida =
      typeof evento.webkitCompassAccuracy === 'number' &&
      Number.isFinite(evento.webkitCompassAccuracy) &&
      evento.webkitCompassAccuracy >= 0
        ? evento.webkitCompassAccuracy
        : null;

    return {
      heading,
      accuracy: precisionValida,
      needsCalibration:
        precisionValida !== null && precisionValida > UMBRAL_CALIBRACION_GRADOS,
    };
  }

  // Android / estándar: alpha en sentido antihorario -> (360 - alpha) % 360
  if (evento.alpha !== null && typeof evento.alpha === 'number' && Number.isFinite(evento.alpha)) {
    const heading = normalizeHeading(360 - evento.alpha + compensacionPantalla);
    return {
      heading,
      accuracy: null,
      needsCalibration: false,
    };
  }

  return null;
}

function crearEstadoInicial(): CompassState {
  if (!soportaDeviceOrientation()) {
    return {
      heading: 0,
      cumulativeRotation: 0,
      cardinal: 'N',
      mode: 'manual',
      sensorStatus: 'unsupported',
      accuracy: null,
      needsCalibration: false,
      error: null,
    };
  }

  return {
    heading: 0,
    cumulativeRotation: 0,
    cardinal: 'N',
    mode: 'manual',
    sensorStatus: 'idle',
    accuracy: null,
    needsCalibration: false,
    error: null,
  };
}

export function useCompass(): UseCompassResult {
  const [state, setState] = useState<CompassState>(crearEstadoInicial);

  const headingRef = useRef<number>(0);
  const cumulativeRotationRef = useRef<number>(0);
  const modeRef = useRef<CompassMode>('manual');
  const pendingReadingRef = useRef<LecturaSensor | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const detectionTimerRef = useRef<number | null>(null);
  const hasAbsoluteEventRef = useRef<boolean>(false);
  const hasValidReadingRef = useRef<boolean>(false);
  const listenersActivosRef = useRef<boolean>(false);
  const sensorActivoPermitidoRef = useRef<boolean>(false);

  const limpiarTimerDeteccion = useCallback(() => {
    if (detectionTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
  }, []);

  const limpiarRaf = useCallback(() => {
    if (rafIdRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const procesarLecturaEnRaf = useCallback(() => {
    rafIdRef.current = null;
    const lectura = pendingReadingRef.current;
    pendingReadingRef.current = null;

    if (!lectura || !sensorActivoPermitidoRef.current) {
      return;
    }

    // Si el usuario cambió explícitamente a modo manual mientras el sensor seguía activo, no pisar su rumbo
    if (modeRef.current !== 'sensor') {
      return;
    }

    const rumboAnterior = headingRef.current;
    const rumboSuavizado = hasValidReadingRef.current
      ? smoothHeading(rumboAnterior, lectura.heading, ALPHA_SUAVIZADO_SENSOR)
      : lectura.heading;

    const delta = shortestAngleDelta(rumboAnterior, rumboSuavizado);
    headingRef.current = rumboSuavizado;
    cumulativeRotationRef.current += delta;
    hasValidReadingRef.current = true;

    const rotacionAcumulada = cumulativeRotationRef.current;

    setState((prev) => ({
      ...prev,
      heading: rumboSuavizado,
      cumulativeRotation: rotacionAcumulada,
      cardinal: getCardinalDirection(rumboSuavizado),
      mode: 'sensor',
      sensorStatus: 'active',
      accuracy: lectura.accuracy,
      needsCalibration: lectura.needsCalibration,
      error: null,
    }));
  }, []);

  const manejarEventoOrientacion = useCallback(
    (evento: Event, esAbsoluto: boolean) => {
      const eventoOrientacion = evento as DeviceOrientationEventWithWebkit;

      if (esAbsoluto) {
        hasAbsoluteEventRef.current = true;
      } else if (hasAbsoluteEventRef.current) {
        // Priorizar siempre deviceorientationabsolute cuando el navegador lo emite
        return;
      }

      const lectura = extraerLecturaOrientacion(eventoOrientacion);
      if (!lectura) {
        return;
      }

      limpiarTimerDeteccion();

      // En la primera lectura válida activamos automáticamente el modo sensor si estaba pendiente
      if (!hasValidReadingRef.current && sensorActivoPermitidoRef.current) {
        modeRef.current = 'sensor';
      }

      pendingReadingRef.current = lectura;

      if (rafIdRef.current === null && typeof window !== 'undefined') {
        rafIdRef.current = window.requestAnimationFrame(procesarLecturaEnRaf);
      }
    },
    [limpiarTimerDeteccion, procesarLecturaEnRaf]
  );

  const listenerAbsolutoRef = useRef<((evento: Event) => void) | null>(null);
  const listenerRelativoRef = useRef<((evento: Event) => void) | null>(null);

  const desvincularListeners = useCallback(() => {
    if (typeof window === 'undefined' || !listenersActivosRef.current) {
      return;
    }
    if (listenerAbsolutoRef.current) {
      window.removeEventListener('deviceorientationabsolute', listenerAbsolutoRef.current);
      listenerAbsolutoRef.current = null;
    }
    if (listenerRelativoRef.current) {
      window.removeEventListener('deviceorientation', listenerRelativoRef.current);
      listenerRelativoRef.current = null;
    }
    listenersActivosRef.current = false;
  }, []);

  const iniciarEscuchaSensores = useCallback(() => {
    if (typeof window === 'undefined' || !soportaDeviceOrientation()) {
      return;
    }

    desvincularListeners();
    limpiarTimerDeteccion();
    sensorActivoPermitidoRef.current = true;
    modeRef.current = 'sensor';

    const onAbsoluto = (evento: Event) => manejarEventoOrientacion(evento, true);
    const onRelativo = (evento: Event) => manejarEventoOrientacion(evento, false);

    listenerAbsolutoRef.current = onAbsoluto;
    listenerRelativoRef.current = onRelativo;
    listenersActivosRef.current = true;

    window.addEventListener('deviceorientationabsolute', onAbsoluto);
    window.addEventListener('deviceorientation', onRelativo);

    // Detección real de hardware: si en 1500 ms no llegan lecturas finitas, pasar a modo manual
    detectionTimerRef.current = window.setTimeout(() => {
      detectionTimerRef.current = null;
      if (!hasValidReadingRef.current) {
        sensorActivoPermitidoRef.current = false;
        modeRef.current = 'manual';
        desvincularListeners();
        setState((prev) => ({
          ...prev,
          mode: 'manual',
          sensorStatus: 'unsupported',
          accuracy: null,
          needsCalibration: false,
          error: null,
        }));
      }
    }, TIMEOUT_DETECCION_SENSOR_MS);
  }, [desvincularListeners, limpiarTimerDeteccion, manejarEventoOrientacion]);

  // En navegadores sin requestPermission (Android / escritorio), detecta hardware pasivamente sin violar iOS
  useEffect(() => {
    if (!soportaDeviceOrientation()) {
      return;
    }
    if (tieneRequestPermission(window.DeviceOrientationEvent)) {
      // iOS 13+: nunca invocar requestPermission automáticamente en useEffect
      return;
    }

    iniciarEscuchaSensores();

    return () => {
      sensorActivoPermitidoRef.current = false;
      desvincularListeners();
      limpiarTimerDeteccion();
      limpiarRaf();
    };
  }, [desvincularListeners, iniciarEscuchaSensores, limpiarRaf, limpiarTimerDeteccion]);

  // Limpieza garantizada al desmontar (también para sesiones activadas manualmente en iOS)
  useEffect(() => {
    return () => {
      sensorActivoPermitidoRef.current = false;
      desvincularListeners();
      limpiarTimerDeteccion();
      limpiarRaf();
    };
  }, [desvincularListeners, limpiarRaf, limpiarTimerDeteccion]);

  const requestSensorAccess = useCallback(async (): Promise<void> => {
    if (!soportaDeviceOrientation()) {
      modeRef.current = 'manual';
      setState((prev) => ({
        ...prev,
        mode: 'manual',
        sensorStatus: 'unsupported',
        error: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      sensorStatus: 'requesting',
      error: null,
    }));

    try {
      if (tieneRequestPermission(window.DeviceOrientationEvent)) {
        const permiso = await window.DeviceOrientationEvent.requestPermission();
        if (permiso !== 'granted') {
          sensorActivoPermitidoRef.current = false;
          modeRef.current = 'manual';
          desvincularListeners();
          setState((prev) => ({
            ...prev,
            mode: 'manual',
            sensorStatus: 'denied',
            error:
              'Permiso de orientación denegado. Puedes usar el control manual o habilitar los sensores en los ajustes del navegador.',
          }));
          return;
        }
      }

      hasValidReadingRef.current = false;
      hasAbsoluteEventRef.current = false;
      iniciarEscuchaSensores();
    } catch (errorCapturado: unknown) {
      sensorActivoPermitidoRef.current = false;
      modeRef.current = 'manual';
      desvincularListeners();
      const mensaje =
        errorCapturado instanceof Error && errorCapturado.message.trim().length > 0
          ? errorCapturado.message
          : 'No se pudo acceder a los sensores de orientación del dispositivo.';
      setState((prev) => ({
        ...prev,
        mode: 'manual',
        sensorStatus: 'error',
        error: mensaje,
      }));
    }
  }, [desvincularListeners, iniciarEscuchaSensores]);

  const setManualHeading = useCallback((degrees: number) => {
    const destino = normalizeHeading(degrees);
    const delta = shortestAngleDelta(headingRef.current, destino);
    headingRef.current = destino;
    cumulativeRotationRef.current += delta;
    modeRef.current = 'manual';

    const rotacionAcumulada = cumulativeRotationRef.current;

    setState((prev) => ({
      ...prev,
      heading: destino,
      cumulativeRotation: rotacionAcumulada,
      cardinal: getCardinalDirection(destino),
      mode: 'manual',
    }));
  }, []);

  const setMode = useCallback((newMode: CompassMode) => {
    if (newMode === 'manual') {
      modeRef.current = 'manual';
      setState((prev) => ({
        ...prev,
        mode: 'manual',
      }));
      return;
    }

    if (hasValidReadingRef.current && listenersActivosRef.current) {
      sensorActivoPermitidoRef.current = true;
      modeRef.current = 'sensor';
      setState((prev) => ({
        ...prev,
        mode: 'sensor',
        sensorStatus: 'active',
        error: null,
      }));
    }
  }, []);

  return {
    ...state,
    requestSensorAccess,
    setManualHeading,
    setMode,
  };
}
