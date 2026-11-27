import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SOLAR_SYSTEM_PLANET_IDS,
  isCompassPlanetFilter,
  type CompassPlanetFilter,
  type CompassPlanetOption,
  type CuerpoCeleste,
  type PlanetId,
  type UseCompassFilterResult,
} from '../types/astronomy';

export const CLAVE_FILTRO_BRUJULA = 'skyproject_filtro_brujula_v1';

export interface UseCompassFilterParams {
  cuerpos: CuerpoCeleste[];
  isLoading?: boolean;
  error?: string | null;
}

function normalizarAzimut(valor: number): number {
  return ((valor % 360) + 360) % 360;
}

function acotarAltitud(valor: number): number {
  return Math.max(-90, Math.min(90, valor));
}

export function normalizarIdPlaneta(id: string): PlanetId | null {
  const normalizado = id.trim().toLowerCase();
  return (SOLAR_SYSTEM_PLANET_IDS as readonly string[]).includes(normalizado)
    ? (normalizado as PlanetId)
    : null;
}

/**
 * Lee y valida el filtro de planeta guardado en localStorage.
 * Ante cualquier valor corrupto, desconocido o fallo de acceso, devuelve 'all'.
 */
export function leerFiltroBrujulaGuardado(): CompassPlanetFilter {
  try {
    const raw = localStorage.getItem(CLAVE_FILTRO_BRUJULA);
    if (!raw) return 'all';

    if (isCompassPlanetFilter(raw)) {
      return raw;
    }

    const parsed: unknown = JSON.parse(raw);
    return isCompassPlanetFilter(parsed) ? parsed : 'all';
  } catch {
    return 'all';
  }
}

export function guardarFiltroBrujulaEnStorage(filtro: CompassPlanetFilter): void {
  if (!isCompassPlanetFilter(filtro)) return;
  try {
    localStorage.setItem(CLAVE_FILTRO_BRUJULA, JSON.stringify(filtro));
  } catch {
    // Silencioso ante modo privado, cuota excedida o almacenamiento restringido
  }
}

/**
 * Construye las opciones planetarias de la brújula en el orden canónico del Sistema Solar,
 * reutilizando los cálculos de efemérides, nombres y colores ya existentes en el proyecto.
 */
export function construirOpcionesPlanetasBrujula(cuerpos: CuerpoCeleste[]): {
  opciones: CompassPlanetOption[];
  error: string | null;
} {
  const mapaPlanetas = new Map<PlanetId, CuerpoCeleste>();
  let huboCoordenadasInvalidas = false;

  for (const cuerpo of cuerpos) {
    if (cuerpo.tipo !== 'planeta') continue;
    const planetId = normalizarIdPlaneta(cuerpo.id);
    if (!planetId) continue;

    if (!Number.isFinite(cuerpo.acimut) || !Number.isFinite(cuerpo.altitud)) {
      huboCoordenadasInvalidas = true;
      continue;
    }

    mapaPlanetas.set(planetId, cuerpo);
  }

  const opciones: CompassPlanetOption[] = [];
  for (const planetId of SOLAR_SYSTEM_PLANET_IDS) {
    const cuerpo = mapaPlanetas.get(planetId);
    if (!cuerpo) continue;

    const altitudeDeg = acotarAltitud(cuerpo.altitud);
    const azimuthDeg = normalizarAzimut(cuerpo.acimut);

    opciones.push({
      id: planetId,
      name: cuerpo.nombre,
      azimuthDeg,
      altitudeDeg,
      isAboveHorizon: altitudeDeg > 0,
      accentColor: cuerpo.color,
    });
  }

  if (opciones.length === 0 && huboCoordenadasInvalidas) {
    return {
      opciones,
      error: 'No se pudieron calcular las posiciones planetarias para la brújula.',
    };
  }

  return { opciones, error: null };
}

export function filtrarPlanetasActivos(
  opciones: CompassPlanetOption[],
  filtro: CompassPlanetFilter
): CompassPlanetOption[] {
  if (filtro === 'all') return opciones;
  return opciones.filter((planeta) => planeta.id === filtro);
}

export function useCompassFilter({
  cuerpos,
  isLoading = false,
  error = null,
}: UseCompassFilterParams): UseCompassFilterResult {
  const [selectedFilter, setSelectedFilterState] = useState<CompassPlanetFilter>(
    leerFiltroBrujulaGuardado
  );
  const debeGuardarRef = useRef<boolean>(false);

  useEffect(() => {
    if (!debeGuardarRef.current) return;
    debeGuardarRef.current = false;
    guardarFiltroBrujulaEnStorage(selectedFilter);
  }, [selectedFilter]);

  const setSelectedFilter = useCallback((filter: CompassPlanetFilter) => {
    const valido: CompassPlanetFilter = isCompassPlanetFilter(filter) ? filter : 'all';
    setSelectedFilterState((prev) => {
      if (prev === valido) return prev;
      debeGuardarRef.current = true;
      return valido;
    });
  }, []);

  const { opciones: planetOptions, error: errorCalculo } = useMemo(
    () => construirOpcionesPlanetasBrujula(cuerpos),
    [cuerpos]
  );

  const activePlanets = useMemo(
    () => filtrarPlanetasActivos(planetOptions, selectedFilter),
    [planetOptions, selectedFilter]
  );

  const errorFinal = error ?? (isLoading ? null : errorCalculo);

  return {
    selectedFilter,
    setSelectedFilter,
    planetOptions,
    activePlanets,
    isLoading,
    error: errorFinal,
  };
}
