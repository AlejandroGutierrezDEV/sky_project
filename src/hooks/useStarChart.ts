import { useCallback, useMemo, useState } from 'react';
import { CONSTELACIONES_IAU } from '../data/constelacionesIAU';
import { CATALOGO_ESTRELLAS } from '../data/estrellasMag4';
import type {
  ConstelacionCartaProyectada,
  HorizontalCoordinates,
  ProjectedStar,
  SegmentoConstelacionProyectado,
  StarCatalogEntry,
  StarChartLayers,
  StarChartObserver,
} from '../types/starChart';
import { normalizarZonaHoraria } from '../utils/lunarCalculations';
import {
  ALTITUD_MINIMA_ESTEREOGRAFICA,
  adaptarEstrellasParaCarta,
  clamp,
  equatorialToHorizontal,
  magnitudeToRadius,
  projectStereographic,
  recortarSegmentoAlHorizonte,
} from '../utils/skyProjection';

/** Ubicación por defecto segura para la Carta Astronómica (Madrid). */
export const DEFAULT_STAR_CHART_LOCATION = {
  name: 'Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
  timezone: 'Europe/Madrid',
} as const;

const CATALOGO_CARTA_ESTRELLAS: ReadonlyArray<StarCatalogEntry> =
  adaptarEstrellasParaCarta(CATALOGO_ESTRELLAS);

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
  initialTimezone?: string;
  initialDate?: Date;
  viewportSize?: number;
  padding?: number;
}

export interface StarChartLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface HorizontalStarEntry {
  star: StarCatalogEntry;
  horizontal: HorizontalCoordinates;
}

interface HorizontalConstellationEntry {
  codigo: string;
  nombreEs: string;
  segmentos: Array<{
    desde: HorizontalCoordinates;
    hasta: HorizontalCoordinates;
  }>;
}

export interface UseStarChartResult {
  observer: StarChartObserver;
  locationName: string;
  timezone: string;
  date: Date;
  layers: StarChartLayers;
  projectedStars: ProjectedStar[];
  projectedConstellations: ConstelacionCartaProyectada[];
  visibleStars: ProjectedStar[];
  visibleCount: number;
  aboveHorizonCount: number;
  selectedStar: ProjectedStar | null;
  hoveredStar: ProjectedStar | null;
  isReady: boolean;
  error: string | null;
  usaUbicacionLocal: boolean;
  shiftHours: (deltaHours: number) => void;
  resetToNow: () => void;
  setCustomDate: (nextDate: Date) => void;
  setLocation: (nextLocation: StarChartLocation) => void;
  restaurarUbicacionGlobal: () => void;
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
    initialTimezone,
    initialDate,
    viewportSize = DEFAULT_CANVAS_SIZE,
    padding = DEFAULT_CANVAS_PADDING,
  } = options;

  const nombreExterno = initialLocationName.trim() || DEFAULT_STAR_CHART_LOCATION.name;
  const zonaExterna = normalizarZonaHoraria(initialTimezone, initialLatitude, initialLongitude);
  const claveUbicacionExterna = `${initialLatitude}|${initialLongitude}|${nombreExterno}|${zonaExterna}`;

  const ubicacionExterna = useMemo<StarChartLocation>(
    () => ({
      name: nombreExterno,
      latitude: initialLatitude,
      longitude: initialLongitude,
      timezone: zonaExterna,
    }),
    [nombreExterno, initialLatitude, initialLongitude, zonaExterna]
  );

  const [ubicacionLocal, setUbicacionLocal] = useState<{
    claveOrigen: string;
    valor: StarChartLocation;
  } | null>(null);

  const usaUbicacionLocal =
    ubicacionLocal !== null && ubicacionLocal.claveOrigen === claveUbicacionExterna;

  const location = usaUbicacionLocal ? ubicacionLocal.valor : ubicacionExterna;

  const [fechaInicialPorDefecto] = useState<Date>(() => new Date());
  const timestampExterno =
    initialDate instanceof Date
      ? Number.isNaN(initialDate.getTime())
        ? Number.NaN
        : initialDate.getTime()
      : null;

  const claveFechaExterna =
    timestampExterno === null
      ? 'sin-fecha-externa'
      : Number.isNaN(timestampExterno)
        ? 'fecha-invalida'
        : String(timestampExterno);

  const [fechaLocal, setFechaLocal] = useState<{
    claveOrigen: string;
    valor: Date;
  } | null>(null);

  const fechaExternaMemo = useMemo<Date>(
    () =>
      timestampExterno === null ? fechaInicialPorDefecto : new Date(timestampExterno),
    [timestampExterno, fechaInicialPorDefecto]
  );

  const date =
    fechaLocal !== null && fechaLocal.claveOrigen === claveFechaExterna
      ? fechaLocal.valor
      : fechaExternaMemo;

  const [layers, setLayersState] = useState<StarChartLayers>(DEFAULT_STAR_CHART_LAYERS);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);

  const error = useMemo(
    () => validateObserverInputs(location.latitude, location.longitude, date),
    [location.latitude, location.longitude, date]
  );

  const timezone = useMemo(
    () => normalizarZonaHoraria(location.timezone, location.latitude, location.longitude),
    [location.timezone, location.latitude, location.longitude]
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

  // Paso 1 memorizado: conversión astronómica (RA/Dec -> Alt/Az) desde los catálogos únicos SSOT.
  const horizontalCatalog = useMemo<HorizontalStarEntry[]>(() => {
    if (error !== null) return [];
    const safeObserver: StarChartObserver = {
      latitude: location.latitude,
      longitude: location.longitude,
      date: new Date(dateTimestamp),
    };
    return CATALOGO_CARTA_ESTRELLAS.map((star) => ({
      star,
      horizontal: equatorialToHorizontal(star.raHours, star.decDeg, safeObserver),
    }));
  }, [error, location.latitude, location.longitude, dateTimestamp]);

  const horizontalConstellations = useMemo<HorizontalConstellationEntry[]>(() => {
    if (error !== null) return [];
    const safeObserver: StarChartObserver = {
      latitude: location.latitude,
      longitude: location.longitude,
      date: new Date(dateTimestamp),
    };
    return CONSTELACIONES_IAU.map((constelacion) => ({
      codigo: constelacion.codigo,
      nombreEs: constelacion.nombreEs,
      segmentos: constelacion.segmentos.map(([desdeJ2000, hastaJ2000]) => ({
        desde: equatorialToHorizontal(desdeJ2000[0], desdeJ2000[1], safeObserver),
        hasta: equatorialToHorizontal(hastaJ2000[0], hastaJ2000[1], safeObserver),
      })),
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

  const projectedConstellations = useMemo<ConstelacionCartaProyectada[]>(() => {
    if (error !== null || horizontalConstellations.length === 0) return [];
    const safeSize = Number.isFinite(viewportSize) && viewportSize > 0
      ? viewportSize
      : DEFAULT_CANVAS_SIZE;
    const safePadding = clamp(padding, 16, safeSize * 0.25);
    const center = safeSize / 2;
    const diskRadius = Math.max(10, center - safePadding);

    return horizontalConstellations.map((constelacion) => {
      const segmentosProyectados: SegmentoConstelacionProyectado[] = [];
      let sumX = 0;
      let sumY = 0;
      let puntosContados = 0;

      for (const seg of constelacion.segmentos) {
        // Protección contra singularidad próxima al nadir (<= -85°) y recorte exacto al horizonte
        if (
          seg.desde.altitudeDeg <= ALTITUD_MINIMA_ESTEREOGRAFICA &&
          seg.hasta.altitudeDeg <= ALTITUD_MINIMA_ESTEREOGRAFICA
        ) {
          continue;
        }
        const recortado = recortarSegmentoAlHorizonte(
          { altitud: seg.desde.altitudeDeg, acimut: seg.desde.azimuthDeg },
          { altitud: seg.hasta.altitudeDeg, acimut: seg.hasta.azimuthDeg }
        );
        if (!recortado) continue;

        const p1 = projectStereographic(
          recortado.desde.altitud,
          recortado.desde.acimut,
          center,
          center,
          diskRadius
        );
        const p2 = projectStereographic(
          recortado.hasta.altitud,
          recortado.hasta.acimut,
          center,
          center,
          diskRadius
        );
        if (
          !Number.isFinite(p1.x) ||
          !Number.isFinite(p1.y) ||
          !Number.isFinite(p2.x) ||
          !Number.isFinite(p2.y)
        ) {
          continue;
        }

        segmentosProyectados.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          altitudDesde: recortado.desde.altitud,
          altitudHasta: recortado.hasta.altitud,
        });

        sumX += p1.x + p2.x;
        sumY += p1.y + p2.y;
        puntosContados += 2;
      }

      return {
        codigo: constelacion.codigo,
        nombreEs: constelacion.nombreEs,
        segmentos: segmentosProyectados,
        etiquetaX: puntosContados > 0 ? sumX / puntosContados : center,
        etiquetaY: puntosContados > 0 ? sumY / puntosContados : center,
        mostrarEtiqueta: segmentosProyectados.length >= 2,
      };
    });
  }, [error, horizontalConstellations, viewportSize, padding]);

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

  const shiftHours = useCallback(
    (deltaHours: number) => {
      if (!Number.isFinite(deltaHours)) return;
      setFechaLocal((prev) => {
        const base =
          prev !== null && prev.claveOrigen === claveFechaExterna
            ? prev.valor
            : fechaExternaMemo;
        const baseMs = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
        return {
          claveOrigen: claveFechaExterna,
          valor: new Date(baseMs + deltaHours * 3_600_000),
        };
      });
    },
    [claveFechaExterna, fechaExternaMemo]
  );

  const resetToNow = useCallback(() => {
    setFechaLocal({
      claveOrigen: claveFechaExterna,
      valor: new Date(),
    });
  }, [claveFechaExterna]);

  const setCustomDate = useCallback(
    (nextDate: Date) => {
      setFechaLocal({
        claveOrigen: claveFechaExterna,
        valor: new Date(nextDate.getTime()),
      });
    },
    [claveFechaExterna]
  );

  const setLocation = useCallback(
    (nextLocation: StarChartLocation) => {
      setUbicacionLocal({
        claveOrigen: claveUbicacionExterna,
        valor: {
          name: nextLocation.name.trim() || 'Ubicación personalizada',
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
          timezone: normalizarZonaHoraria(
            nextLocation.timezone,
            nextLocation.latitude,
            nextLocation.longitude
          ),
        },
      });
    },
    [claveUbicacionExterna]
  );

  const restaurarUbicacionGlobal = useCallback(() => {
    setUbicacionLocal(null);
  }, []);

  const resetAll = useCallback(() => {
    const fechaGlobalValida = Number.isNaN(fechaExternaMemo.getTime())
      ? new Date()
      : fechaExternaMemo;
    if (
      validateObserverInputs(
        ubicacionExterna.latitude,
        ubicacionExterna.longitude,
        fechaGlobalValida
      ) === null
    ) {
      setUbicacionLocal(null);
    } else {
      setUbicacionLocal({
        claveOrigen: claveUbicacionExterna,
        valor: {
          name: DEFAULT_STAR_CHART_LOCATION.name,
          latitude: DEFAULT_STAR_CHART_LOCATION.latitude,
          longitude: DEFAULT_STAR_CHART_LOCATION.longitude,
          timezone: DEFAULT_STAR_CHART_LOCATION.timezone,
        },
      });
    }
    setFechaLocal(
      Number.isNaN(fechaExternaMemo.getTime())
        ? { claveOrigen: claveFechaExterna, valor: new Date() }
        : null
    );
    setLayersState(DEFAULT_STAR_CHART_LAYERS);
    setSelectedStarId(null);
    setHoveredStarId(null);
  }, [claveFechaExterna, claveUbicacionExterna, fechaExternaMemo, ubicacionExterna]);

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
    timezone,
    date,
    layers,
    projectedStars,
    projectedConstellations,
    visibleStars,
    visibleCount,
    aboveHorizonCount,
    selectedStar,
    hoveredStar,
    isReady,
    error,
    usaUbicacionLocal,
    shiftHours,
    resetToNow,
    setCustomDate,
    setLocation,
    restaurarUbicacionGlobal,
    resetAll,
    setLayers,
    toggleLayer,
    setMaxMagnitude,
    setSelectedStar,
    selectStarById,
    setHoveredStar,
  };
}
