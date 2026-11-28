import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  esErrorAbort,
  normalizarCoordenadasAvisos,
  obtenerAvisosMeteorologicos,
  type ResolvedWeatherAlertCoordinates,
} from '../services/weatherAlertService';
import type {
  DismissedAlertRecord,
  WeatherAlert,
  WeatherAlertCoordinates,
  WeatherAlertsState,
} from '../types/weatherAlerts';

export const DISMISSED_ALERTS_STORAGE_KEY = 'astro_dismissed_weather_alerts_v1';
const FALLBACK_DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_DISMISS_TTL_MS = 5 * 60 * 1000;

function esRegistroDescarteValido(valor: unknown): valor is DismissedAlertRecord {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }
  const obj = valor as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.trim().length > 0 &&
    typeof obj.expiresAt === 'number' &&
    Number.isFinite(obj.expiresAt)
  );
}

export function parsearDescartesGuardados(
  raw: string | null,
  ahoraMs: number = Date.now()
): DismissedAlertRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const vistos = new Set<string>();
    const vigentes: DismissedAlertRecord[] = [];
    for (const item of parsed) {
      if (!esRegistroDescarteValido(item)) continue;
      if (item.expiresAt < ahoraMs) continue;
      if (vistos.has(item.id)) continue;
      vistos.add(item.id);
      vigentes.push({ id: item.id, expiresAt: item.expiresAt });
    }
    return vigentes;
  } catch {
    return [];
  }
}

export function leerDescartesGuardados(ahoraMs: number = Date.now()): DismissedAlertRecord[] {
  try {
    const raw = globalThis.localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const vigentes = parsearDescartesGuardados(raw, ahoraMs);
    // Purgar silenciosamente si había registros caducados o inválidos
    const serializado = JSON.stringify(vigentes);
    if (serializado !== raw) {
      guardarDescartes(vigentes);
    }
    return vigentes;
  } catch {
    return [];
  }
}

function guardarDescartes(registros: DismissedAlertRecord[]): void {
  try {
    if (registros.length === 0) {
      globalThis.localStorage.removeItem(DISMISSED_ALERTS_STORAGE_KEY);
      return;
    }
    globalThis.localStorage.setItem(DISMISSED_ALERTS_STORAGE_KEY, JSON.stringify(registros));
  } catch {
    // Ignorar errores de cuota llena o almacenamiento bloqueado (modo privado)
  }
}

interface FetchSnapshot {
  loadedKey: string;
  alerts: WeatherAlert[];
  error: string | null;
  lastUpdated: Date | null;
  desdeCache: boolean;
  avisoOffline: string | null;
}

export interface UseWeatherAlertsReturn extends WeatherAlertsState {
  resolvedCoordinates: ResolvedWeatherAlertCoordinates;
  desdeCache: boolean;
  avisoOffline: string | null;
  refresh: () => void;
  dismissAlert: (id: string) => void;
  restoreDismissed: () => void;
}

export function useWeatherAlerts(
  coordinates?: WeatherAlertCoordinates
): UseWeatherAlertsReturn {
  const latParam = coordinates?.latitude;
  const lonParam = coordinates?.longitude;
  const tzParam = coordinates?.timezone;
  const nameParam = coordinates?.locationName;

  const resolvedCoordinates = useMemo<ResolvedWeatherAlertCoordinates>(
    () =>
      normalizarCoordenadasAvisos(
        latParam !== undefined && lonParam !== undefined
          ? {
              latitude: latParam,
              longitude: lonParam,
              timezone: tzParam,
              locationName: nameParam,
            }
          : undefined
      ),
    [latParam, lonParam, tzParam, nameParam]
  );

  const requestKey = `${resolvedCoordinates.latitude.toFixed(4)}|${resolvedCoordinates.longitude.toFixed(4)}|${resolvedCoordinates.timezone}|${resolvedCoordinates.locationName}`;

  const [snapshot, setSnapshot] = useState<FetchSnapshot>({
    loadedKey: '',
    alerts: [],
    error: null,
    lastUpdated: null,
    desdeCache: false,
    avisoOffline: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedRecords, setDismissedRecords] = useState<DismissedAlertRecord[]>(() =>
    leerDescartesGuardados()
  );

  const activeControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const ejecutarConsulta = useCallback(
    (clave: string, coords: ResolvedWeatherAlertCoordinates, forzarRed: boolean = false) => {
      activeControllerRef.current?.abort();
      const controller = new AbortController();
      activeControllerRef.current = controller;
      const seqActual = ++requestSeqRef.current;

      obtenerAvisosMeteorologicos(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          timezone: coords.timezone,
          locationName: coords.locationName,
        },
        controller.signal,
        { forzarRed }
      )
        .then((resultado) => {
          if (controller.signal.aborted || seqActual !== requestSeqRef.current) return;
          const ahora = Date.now();
          setDismissedRecords((prev) => {
            const vigentes = prev.filter((item) => item.expiresAt >= ahora);
            if (vigentes.length !== prev.length) {
              guardarDescartes(vigentes);
            }
            return vigentes;
          });
          setSnapshot({
            loadedKey: clave,
            alerts: resultado.alerts,
            error: null,
            lastUpdated: resultado.fetchedAt,
            desdeCache: Boolean(resultado.desdeCache),
            avisoOffline: resultado.avisoOffline ?? null,
          });
          setIsRefreshing(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || esErrorAbort(err) || seqActual !== requestSeqRef.current) {
            return;
          }
          const mensaje =
            err instanceof Error && err.message.trim().length > 0
              ? err.message
              : 'No se pudieron obtener los avisos meteorológicos.';
          setSnapshot((prev) => ({
            loadedKey: clave,
            alerts: prev.loadedKey === clave ? prev.alerts : [],
            error: mensaje,
            lastUpdated: prev.loadedKey === clave ? prev.lastUpdated : null,
            desdeCache: prev.loadedKey === clave ? prev.desdeCache : false,
            avisoOffline: prev.loadedKey === clave ? prev.avisoOffline : null,
          }));
          setIsRefreshing(false);
        });
    },
    []
  );

  useEffect(() => {
    ejecutarConsulta(requestKey, resolvedCoordinates, false);
    return () => {
      activeControllerRef.current?.abort();
    };
  }, [ejecutarConsulta, requestKey, resolvedCoordinates]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    ejecutarConsulta(requestKey, resolvedCoordinates, true);
  }, [ejecutarConsulta, requestKey, resolvedCoordinates]);

  const dismissAlert = useCallback(
    (id: string) => {
      const idLimpio = id.trim();
      if (idLimpio.length === 0) return;

      const ahora = Date.now();
      const alerta = snapshot.alerts.find((item) => item.id === idLimpio);
      const expiresAt = alerta
        ? Math.max(alerta.endsAt.getTime(), ahora + MIN_DISMISS_TTL_MS)
        : ahora + FALLBACK_DISMISS_TTL_MS;

      setDismissedRecords((prev) => {
        const filtrados = prev.filter((item) => item.expiresAt >= ahora && item.id !== idLimpio);
        const siguiente: DismissedAlertRecord[] = [...filtrados, { id: idLimpio, expiresAt }];
        guardarDescartes(siguiente);
        return siguiente;
      });
    },
    [snapshot.alerts]
  );

  const restoreDismissed = useCallback(() => {
    setDismissedRecords([]);
    guardarDescartes([]);
  }, []);

  const dismissedIds = useMemo(
    () => new Set(dismissedRecords.map((item) => item.id)),
    [dismissedRecords]
  );

  const alertsParaClaveActual = useMemo(
    () => (snapshot.loadedKey === requestKey ? snapshot.alerts : []),
    [snapshot.alerts, snapshot.loadedKey, requestKey]
  );

  const activeAlerts = useMemo(
    () => alertsParaClaveActual.filter((alert) => !dismissedIds.has(alert.id)),
    [alertsParaClaveActual, dismissedIds]
  );

  const dismissedCount = alertsParaClaveActual.length - activeAlerts.length;
  const isLoading = snapshot.loadedKey !== requestKey || isRefreshing;

  return {
    alerts: alertsParaClaveActual,
    activeAlerts,
    dismissedCount,
    isLoading,
    error: snapshot.loadedKey === requestKey ? snapshot.error : null,
    lastUpdated: snapshot.loadedKey === requestKey ? snapshot.lastUpdated : null,
    desdeCache: snapshot.loadedKey === requestKey ? snapshot.desdeCache : false,
    avisoOffline: snapshot.loadedKey === requestKey ? snapshot.avisoOffline : null,
    resolvedCoordinates,
    refresh,
    dismissAlert,
    restoreDismissed,
  };
}
