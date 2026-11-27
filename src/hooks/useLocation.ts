import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EscalaBortle, GeoCoordinates, Ubicacion } from '../types/astronomy';
import {
  BORTLE_POR_DEFECTO,
  esEscalaBortleValida,
  normalizarEscalaBortle,
} from '../utils/astronomia/calidadCielo';
import {
  ZONA_HORARIA_POR_DEFECTO,
  esZonaHorariaIANAValida,
  inferirZonaHorariaPorCoordenadas,
  normalizarZonaHoraria,
} from '../utils/lunarCalculations';

export const CLAVE_UBICACION = 'skyproject_ubicacion';
export const MAX_NOMBRE_UBICACION = 80;

export const UBICACION_POR_DEFECTO: Ubicacion = {
  latitud: 40.4168,
  longitud: -3.7038,
  altitud: 657,
  nombre: 'Madrid (Observatorio)',
  bortle: BORTLE_POR_DEFECTO,
  timezone: ZONA_HORARIA_POR_DEFECTO,
};

/**
 * Type guard estricto que valida estructura y rangos de una ubicación
 * antes de hidratar estado o pasar datos a `astronomy-engine`.
 */
export function esUbicacionValida(valor: unknown): valor is Ubicacion {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const obj = valor as Record<string, unknown>;
  const bortleValido = obj.bortle === undefined || esEscalaBortleValida(obj.bortle);
  const timezoneValida = obj.timezone === undefined || esZonaHorariaIANAValida(obj.timezone);

  return (
    typeof obj.nombre === 'string' &&
    obj.nombre.length <= MAX_NOMBRE_UBICACION &&
    typeof obj.latitud === 'number' &&
    Number.isFinite(obj.latitud) &&
    obj.latitud >= -90 &&
    obj.latitud <= 90 &&
    typeof obj.longitud === 'number' &&
    Number.isFinite(obj.longitud) &&
    obj.longitud >= -180 &&
    obj.longitud <= 180 &&
    typeof obj.altitud === 'number' &&
    Number.isFinite(obj.altitud) &&
    obj.altitud >= -500 &&
    obj.altitud <= 9000 &&
    bortleValido &&
    timezoneValida
  );
}

/**
 * Normaliza una ubicación válida garantizando `bortle` y `timezone` IANA consistentes.
 */
export function normalizarUbicacion(entrada: Ubicacion): Ubicacion {
  const latitud = Math.max(-90, Math.min(90, entrada.latitud));
  const longitud = Math.max(-180, Math.min(180, entrada.longitud));
  const altitud = Math.max(-500, Math.min(9000, entrada.altitud));
  const nombre = entrada.nombre.slice(0, MAX_NOMBRE_UBICACION);
  const bortle = normalizarEscalaBortle(entrada.bortle);
  const timezone = normalizarZonaHoraria(entrada.timezone, latitud, longitud);

  return {
    latitud,
    longitud,
    altitud,
    nombre,
    bortle,
    timezone,
  };
}

/**
 * Lee y valida de forma defensiva la última ubicación guardada en `localStorage`.
 * Si falta o está corrupta/fuera de rango, aplica fallback seguro a Madrid.
 */
export function leerUbicacionGuardada(): Ubicacion {
  try {
    const raw = localStorage.getItem(CLAVE_UBICACION);
    if (!raw) return { ...UBICACION_POR_DEFECTO };
    const parsed: unknown = JSON.parse(raw);
    if (!esUbicacionValida(parsed)) {
      return { ...UBICACION_POR_DEFECTO };
    }
    return normalizarUbicacion(parsed);
  } catch {
    return { ...UBICACION_POR_DEFECTO };
  }
}

export function guardarUbicacionEnStorage(ubicacion: Ubicacion): void {
  try {
    localStorage.setItem(CLAVE_UBICACION, JSON.stringify(normalizarUbicacion(ubicacion)));
  } catch {
    // Silencioso ante cuota excedida o almacenamiento restringido
  }
}

/**
 * Convierte una `Ubicacion` de dominio a contrato estricto `GeoCoordinates`.
 */
export function aGeoCoordinates(ubicacion: Ubicacion): GeoCoordinates {
  const timezone = normalizarZonaHoraria(
    ubicacion.timezone,
    ubicacion.latitud,
    ubicacion.longitud
  );
  return {
    latitude: ubicacion.latitud,
    longitude: ubicacion.longitud,
    timezone,
    name: ubicacion.nombre || undefined,
  };
}

/**
 * Resuelve la zona horaria IANA del navegador para coordenadas obtenidas por GPS local.
 */
export function obtenerZonaHorariaDispositivo(latitude: number, longitude: number): string {
  try {
    const tzDispositivo = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (esZonaHorariaIANAValida(tzDispositivo)) {
      return tzDispositivo;
    }
  } catch {
    // Fallback por coordenadas si Intl no expone la zona del dispositivo
  }
  return inferirZonaHorariaPorCoordenadas(latitude, longitude);
}

/**
 * Aplica el fallback silencioso ante fallo de geolocalización (permiso denegado o timeout):
 * prioriza la última ubicación válida en `localStorage` y, en su defecto, Madrid.
 */
export function resolverFallbackGeolocalizacion(): Ubicacion {
  return leerUbicacionGuardada();
}

export interface UseLocationResult {
  ubicacion: Ubicacion;
  coordinates: GeoCoordinates;
  cargandoGPS: boolean;
  errorGPS: string | null;
  actualizarUbicacion: (nuevaUbicacion: Ubicacion) => void;
  detectarGPS: (opciones?: { silencioso?: boolean; onResuelta?: (u: Ubicacion) => void }) => void;
  limpiarErrorGPS: () => void;
  restablecerUbicacion: () => Ubicacion;
}

export function useLocation(): UseLocationResult {
  const [ubicacion, setUbicacionState] = useState<Ubicacion>(leerUbicacionGuardada);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [errorGPS, setErrorGPS] = useState<string | null>(null);

  const gpsRequestIdRef = useRef<number>(0);
  const altitudActualRef = useRef<number>(ubicacion.altitud);
  const bortleActualRef = useRef<EscalaBortle>(normalizarEscalaBortle(ubicacion.bortle));
  const omitirGuardadoRef = useRef<boolean>(true);

  useEffect(() => {
    altitudActualRef.current = ubicacion.altitud;
    bortleActualRef.current = normalizarEscalaBortle(ubicacion.bortle);
    if (omitirGuardadoRef.current) {
      omitirGuardadoRef.current = false;
      return;
    }
    guardarUbicacionEnStorage(ubicacion);
  }, [ubicacion]);

  const actualizarUbicacion = useCallback((nuevaUbicacion: Ubicacion) => {
    if (!esUbicacionValida(nuevaUbicacion)) return;
    gpsRequestIdRef.current += 1;
    setCargandoGPS(false);
    setErrorGPS(null);
    setUbicacionState(normalizarUbicacion(nuevaUbicacion));
  }, []);

  const limpiarErrorGPS = useCallback(() => {
    setErrorGPS(null);
  }, []);

  const restablecerUbicacion = useCallback((): Ubicacion => {
    gpsRequestIdRef.current += 1;
    setCargandoGPS(false);
    setErrorGPS(null);
    const defecto = { ...UBICACION_POR_DEFECTO };
    omitirGuardadoRef.current = true;
    setUbicacionState(defecto);
    return defecto;
  }, []);

  const detectarGPS = useCallback(
    (opciones?: { silencioso?: boolean; onResuelta?: (u: Ubicacion) => void }) => {
      const silencioso = opciones?.silencioso === true;
      setErrorGPS(null);

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const fallback = resolverFallbackGeolocalizacion();
        setUbicacionState((prev) => (esUbicacionValida(prev) ? prev : fallback));
        if (!silencioso) {
          setErrorGPS(
            'Tu navegador no soporta geolocalización. Se mantiene la ubicación guardada.'
          );
        }
        return;
      }

      const requestId = ++gpsRequestIdRef.current;
      setCargandoGPS(true);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (requestId !== gpsRequestIdRef.current) return;
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));

          if (
            !Number.isFinite(lat) ||
            lat < -90 ||
            lat > 90 ||
            !Number.isFinite(lon) ||
            lon < -180 ||
            lon > 180
          ) {
            const fallback = resolverFallbackGeolocalizacion();
            setUbicacionState(fallback);
            setCargandoGPS(false);
            if (!silencioso) {
              setErrorGPS('Coordenadas GPS fuera de rango. Se restauró la ubicación de respaldo.');
            }
            return;
          }

          const alt =
            pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude)
              ? Math.min(9000, Math.max(-500, Math.round(pos.coords.altitude)))
              : altitudActualRef.current;

          const nuevaUbicacion = normalizarUbicacion({
            latitud: lat,
            longitud: lon,
            altitud: alt,
            nombre: 'Ubicación GPS Actual',
            bortle: bortleActualRef.current,
            timezone: obtenerZonaHorariaDispositivo(lat, lon),
          });

          setUbicacionState(nuevaUbicacion);
          setCargandoGPS(false);
          opciones?.onResuelta?.(nuevaUbicacion);
        },
        (err) => {
          if (requestId !== gpsRequestIdRef.current) return;
          const fallback = resolverFallbackGeolocalizacion();
          setUbicacionState((prev) => (esUbicacionValida(prev) ? prev : fallback));
          setCargandoGPS(false);

          if (!silencioso) {
            if (err.code === 1) {
              setErrorGPS(
                'Permiso de ubicación denegado. Se mantiene la ubicación guardada de respaldo.'
              );
            } else if (err.code === 2) {
              setErrorGPS('Señal GPS no disponible. Se mantiene la ubicación de respaldo.');
            } else if (err.code === 3) {
              setErrorGPS(
                'Tiempo de espera agotado al obtener el GPS. Se mantiene la ubicación de respaldo.'
              );
            } else {
              setErrorGPS('No se pudo obtener el GPS. Se mantiene la ubicación de respaldo.');
            }
          }
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    },
    []
  );

  const coordinates = useMemo<GeoCoordinates>(() => aGeoCoordinates(ubicacion), [ubicacion]);

  return {
    ubicacion,
    coordinates,
    cargandoGPS,
    errorGPS,
    actualizarUbicacion,
    detectarGPS,
    limpiarErrorGPS,
    restablecerUbicacion,
  };
}
