import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_STAR_CHART_LOCATION, STAR_CATALOG } from '../data/starCatalog';
import type {
  HorizontalCoordinates,
  ProjectedStar,
  StarCatalogEntry,
  StarChartLayers,
  StarChartObserver,
} from '../types/starChart';
import {
  clamp,
  equatorialToHorizontal,
  magnitudeToRadius,
  projectStereographic,
} from '../utils/skyProjection';

export const DEFAULT_STAR_CHART_LAYERS: StarChartLayers = {
  showConstellations: true,
  showStarLabels: true,
  showConstellationLabels: true,
  showAltAzGrid: true,
  maxMagnitude: 4.5,
};

export const MIN_MAGNITUDE_LIMIT = 0.0;
export const MAX_MAGNITUDE_LIMIT = 5.0;
export const DEFAULT_CANVAS_SIZE = 560;
export const DEFAULT_CANVAS_PADDING = 36;

export interface UseStarChartOptions {
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocationName?: string;
  initialDate?: Date;
  viewportSize?: number;
  padding?: number;
}

export interface StarChartLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface HorizontalStarEntry {
  star: StarCatalogEntry;
  horizontal: HorizontalCoordinates;
}

export interface UseStarChartResult {
  observer: StarChartObserver;
  locationName: string;
  date: Date;
  layers: StarChartLayers;
  projectedStars: ProjectedStar[];
  visibleStars: ProjectedStar[];
  visibleCount: number;
  aboveHorizonCount: number;
  selectedStar: ProjectedStar | null;
  hoveredStar: ProjectedStar | null;
  isReady: boolean;
  error: string | null;
  shiftHours: (deltaHours: number) => void;
  resetToNow: () => void;
  setCustomDate: (nextDate: Date) => void;
  setLocation: (nextLocation: StarChartLocation) => void;
  resetAll: () => void;
  setLayers: (nextLayers: StarChartLayers) => void;
  toggleLayer: (
    layer: Exclude<keyof StarChartLayers, 'maxMagnitude'>
  ) => void;
  setMaxMagnitude: (maxMagnitude: number) => void;
  setSelectedStar: (star: ProjectedStar | null) => void;
  selectStarById: (starId: string | null) => void;
  setHoveredStar: (star: ProjectedStar | null) => void;
}

function validateObserverInputs(
  latitude: number,
  longitude: number,
  date: Date
): string | null {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return 'La latitud debe ser un valor numérico válido entre -90° y 90°.';
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'La longitud debe ser un valor numérico válido entre -180° y 180°.';
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'La fecha u hora seleccionada no es válida.';
  }
  return null;
}

/**
 * Hook aislado para gestionar el estado astronómico, temporal, de capas
 * y de selección de la Carta Astronómica (planisferio 2D).
 */
export function useStarChart(options: UseStarChartOptions = {}): UseStarChartResult {
  const {
    initialLatitude = DEFAULT_STAR_CHART_LOCATION.latitude,
    initialLongitude = DEFAULT_STAR_CHART_LOCATION.longitude,
    initialLocationName = DEFAULT_STAR_CHART_LOCATION.name,
    initialDate,
    viewportSize = DEFAULT_CANVAS_SIZE,
    padding = DEFAULT_CANVAS_PADDING,
  } = options;

  const [location, setLocationState] = useState<StarChartLocation>(() => ({
    name: initialLocationName.trim() || DEFAULT_STAR_CHART_LOCATION.name,
    latitude: initialLatitude,
    longitude: initialLongitude,
  }));

  const [date, setDateState] = useState<Date>(() =>
    initialDate !== undefined ? new Date(initialDate.getTime()) : new Date()
  );

  const [layers, setLayersState] = useState<StarChartLayers>(DEFAULT_STAR_CHART_LAYERS);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);

  const error = useMemo(
    () => validateObserverInputs(location.latitude, location.longitude, date),
    [location.latitude, location.longitude, date]
  );

  const observer = useMemo<StarChartObserver>(
    () => ({
      latitude: location.latitude,
      longitude: location.longitude,
      date,
    }),
    [location.latitude, location.longitude, date]
  );

  const dateTimestamp = date.getTime();

  // Paso 1 memorizado: conversión astronómica (RA/Dec -> Alt/Az).
  // Solo se recalcula cuando cambian fecha, latitud o longitud; nunca al hacer hover o cambiar capas.
  const horizontalCatalog = useMemo<HorizontalStarEntry[]>(() => {
    if (error !== null) return [];
    const safeObserver: StarChartObserver = {
      latitude: location.latitude,
      longitude: location.longitude,
      date: new Date(dateTimestamp),
    };
    return STAR_CATALOG.map((star) => ({
      star,
      horizontal: equatorialToHorizontal(star.raHours, star.decDeg, safeObserver),
    }));
  }, [error, location.latitude, location.longitude, dateTimestamp]);

  // Paso 2 memorizado: proyección estereográfica a píxeles CSS del canvas y filtro de magnitud.
  const projectedStars = useMemo<ProjectedStar[]>(() => {
    if (error !== null || horizontalCatalog.length === 0) return [];
    const safeSize = Number.isFinite(viewportSize) && viewportSize > 0
      ? viewportSize
      : DEFAULT_CANVAS_SIZE;
    const safePadding = clamp(padding, 16, safeSize * 0.25);
    const center = safeSize / 2;
    const diskRadius = Math.max(10, center - safePadding);

    return horizontalCatalog.map(({ star, horizontal }) => {
      const point = projectStereographic(
        horizontal.altitudeDeg,
        horizontal.azimuthDeg,
        center,
        center,
        diskRadius
      );
      const visible =
        horizontal.altitudeDeg >= 0 && star.magnitude <= layers.maxMagnitude;

      return {
        star,
        horizontal,
        x: point.x,
        y: point.y,
        radius: magnitudeToRadius(star.magnitude),
        visible,
      };
    });
  }, [error, horizontalCatalog, viewportSize, padding, layers.maxMagnitude]);

  const visibleStars = useMemo(
    () =>
      projectedStars
        .filter((item) => item.visible)
        .sort((a, b) => a.star.magnitude - b.star.magnitude),
    [projectedStars]
  );

  const aboveHorizonCount = useMemo(
    () => horizontalCatalog.filter((entry) => entry.horizontal.altitudeDeg >= 0).length,
    [horizontalCatalog]
  );

  const visibleCount = visibleStars.length;
  const isReady = error === null && projectedStars.length > 0;

  const selectedStar = useMemo<ProjectedStar | null>(() => {
    if (!selectedStarId) return null;
    return projectedStars.find((item) => item.star.id === selectedStarId) ?? null;
  }, [projectedStars, selectedStarId]);

  const hoveredStar = useMemo<ProjectedStar | null>(() => {
    if (!hoveredStarId) return null;
    const found = projectedStars.find((item) => item.star.id === hoveredStarId);
    return found && found.visible ? found : null;
  }, [projectedStars, hoveredStarId]);

  const shiftHours = useCallback((deltaHours: number) => {
    if (!Number.isFinite(deltaHours)) return;
    setDateState((prev) => {
      const baseMs = Number.isNaN(prev.getTime()) ? Date.now() : prev.getTime();
      return new Date(baseMs + deltaHours * 3_600_000);
    });
  }, []);

  const resetToNow = useCallback(() => {
    setDateState(new Date());
  }, []);

  const setCustomDate = useCallback((nextDate: Date) => {
    setDateState(new Date(nextDate.getTime()));
  }, []);

  const setLocation = useCallback((nextLocation: StarChartLocation) => {
    setLocationState({
      name: nextLocation.name.trim() || 'Ubicación personalizada',
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
    });
  }, []);

  const resetAll = useCallback(() => {
    setLocationState({
      name: DEFAULT_STAR_CHART_LOCATION.name,
      latitude: DEFAULT_STAR_CHART_LOCATION.latitude,
      longitude: DEFAULT_STAR_CHART_LOCATION.longitude,
    });
    setDateState(new Date());
    setLayersState(DEFAULT_STAR_CHART_LAYERS);
    setSelectedStarId(null);
    setHoveredStarId(null);
  }, []);

  const setLayers = useCallback((nextLayers: StarChartLayers) => {
    setLayersState({
      ...nextLayers,
      maxMagnitude: clamp(
        Number.isFinite(nextLayers.maxMagnitude)
          ? nextLayers.maxMagnitude
          : DEFAULT_STAR_CHART_LAYERS.maxMagnitude,
        MIN_MAGNITUDE_LIMIT,
        MAX_MAGNITUDE_LIMIT
      ),
    });
  }, []);

  const toggleLayer = useCallback(
    (layer: Exclude<keyof StarChartLayers, 'maxMagnitude'>) => {
      setLayersState((prev) => ({
        ...prev,
        [layer]: !prev[layer],
      }));
    },
    []
  );

  const setMaxMagnitude = useCallback((maxMagnitude: number) => {
    if (!Number.isFinite(maxMagnitude)) return;
    setLayersState((prev) => ({
      ...prev,
      maxMagnitude: clamp(maxMagnitude, MIN_MAGNITUDE_LIMIT, MAX_MAGNITUDE_LIMIT),
    }));
  }, []);

  const setSelectedStar = useCallback((star: ProjectedStar | null) => {
    setSelectedStarId(star ? star.star.id : null);
  }, []);

  const selectStarById = useCallback((starId: string | null) => {
    setSelectedStarId(starId);
  }, []);

  const setHoveredStar = useCallback((star: ProjectedStar | null) => {
    setHoveredStarId(star ? star.star.id : null);
  }, []);

  return {
    observer,
    locationName: location.name,
    date,
    layers,
    projectedStars,
    visibleStars,
    visibleCount,
    aboveHorizonCount,
    selectedStar,
    hoveredStar,
    isReady,
    error,
    shiftHours,
    resetToNow,
    setCustomDate,
    setLocation,
    resetAll,
    setLayers,
    toggleLayer,
    setMaxMagnitude,
    setSelectedStar,
    selectStarById,
    setHoveredStar,
  };
}
