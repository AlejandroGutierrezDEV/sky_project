import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Compass,
  Eye,
  Layers,
  MapPin,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { TemaVisual, Ubicacion } from '../../types/astronomy';
import { obtenerNombreConstelacionIAU } from '../../data/constelacionesIAU';
import {
  DEFAULT_CANVAS_PADDING,
  DEFAULT_STAR_CHART_LOCATION,
  MAX_MAGNITUDE_LIMIT,
  MIN_MAGNITUDE_LIMIT,
  useStarChart,
} from '../../hooks/useStarChart';
import {
  formatearFechaCortaEnZona,
  formatearFechaInputEnZona,
  formatearHoraEnZona,
  parsearFechaInputEnZona,
} from '../../utils/lunarCalculations';
import {
  azimuthToCardinal,
  getLocalSiderealTimeDeg,
  getSpectralColor,
  getSpectralLabel,
} from '../../utils/skyProjection';
import { StarChartCanvas } from './StarChartCanvas';

export interface StarChartTabProps {
  tema?: TemaVisual;
  claseTarjeta?: string;
  ubicacion?: Ubicacion;
  fechaSeleccionada?: Date;
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocationName?: string;
  initialTimezone?: string;
}

interface PresetObservatorio {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const PRESETS_UBICACION: ReadonlyArray<PresetObservatorio> = [
  {
    id: 'madrid',
    name: DEFAULT_STAR_CHART_LOCATION.name,
    latitude: DEFAULT_STAR_CHART_LOCATION.latitude,
    longitude: DEFAULT_STAR_CHART_LOCATION.longitude,
    timezone: DEFAULT_STAR_CHART_LOCATION.timezone,
  },
  {
    id: 'canarias',
    name: 'Teide (Canarias)',
    latitude: 28.2724,
    longitude: -16.6425,
    timezone: 'Atlantic/Canary',
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: 'America/Argentina/Buenos_Aires',
  },
  {
    id: 'sidney',
    name: 'Sídney',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
  },
];

function formatSiderealTime(lstDeg: number): string {
  const totalSeconds = Math.round((lstDeg / 15) * 3600) % 86_400;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function getCardFallbackClass(tema: TemaVisual): string {
  if (tema === 'rojo') return 'hud-esquinas hud-rojo bg-black/90 border-red-900/70';
  if (tema === 'claro') {
    return 'hud-esquinas hud-claro bg-slate-50/92 backdrop-blur-md border-slate-300 shadow-md shadow-slate-900/8';
  }
  return 'hud-esquinas hud-oscuro bg-slate-900/55 backdrop-blur-md border-cyan-400/15';
}

function getAccentButtonClass(tema: TemaVisual, active: boolean): string {
  if (!active) {
    return 'border-current/25 hover:bg-current/10';
  }
  if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  return 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
}

function getOptionClass(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-black text-red-500';
  if (tema === 'claro') return 'bg-slate-50 text-slate-900';
  return 'bg-slate-950 text-slate-100';
}

function getAlertClass(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-300';
  if (tema === 'claro') return 'border-amber-400 bg-amber-50 text-amber-950';
  return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
}

function getErrorClass(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/60 text-red-300';
  if (tema === 'claro') return 'border-rose-400 bg-rose-50 text-rose-900';
  return 'border-rose-500/45 bg-rose-500/10 text-rose-200';
}

export function StarChartTab({
  tema = 'oscuro',
  claseTarjeta,
  ubicacion,
  fechaSeleccionada,
  initialLatitude = DEFAULT_STAR_CHART_LOCATION.latitude,
  initialLongitude = DEFAULT_STAR_CHART_LOCATION.longitude,
  initialLocationName = DEFAULT_STAR_CHART_LOCATION.name,
  initialTimezone,
}: StarChartTabProps) {
  const latitudGlobal = ubicacion?.latitud ?? initialLatitude;
  const longitudGlobal = ubicacion?.longitud ?? initialLongitude;
  const nombreGlobal = ubicacion?.nombre ?? initialLocationName;
  const zonaGlobal = ubicacion?.timezone ?? initialTimezone;

  const [canvasSize, setCanvasSize] = useState<number>(560);
  const [editingLocation, setEditingLocation] = useState<boolean>(false);
  const [borradorUbicacion, setBorradorUbicacion] = useState<{
    claveOrigen: string;
    nombre: string;
    latitud: string;
    longitud: string;
  } | null>(null);

  const {
    observer,
    locationName,
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
    toggleLayer,
    setMaxMagnitude,
    setSelectedStar,
    selectStarById,
    setHoveredStar,
  } = useStarChart({
    initialLatitude: latitudGlobal,
    initialLongitude: longitudGlobal,
    initialLocationName: nombreGlobal,
    initialTimezone: zonaGlobal,
    initialDate: fechaSeleccionada,
    viewportSize: canvasSize,
    padding: DEFAULT_CANVAS_PADDING,
  });

  const claveOrigenFormulario = `${observer.latitude}|${observer.longitude}|${locationName}|${timezone}`;
  const borradorActivo =
    borradorUbicacion !== null && borradorUbicacion.claveOrigen === claveOrigenFormulario
      ? borradorUbicacion
      : null;

  const nameInput = borradorActivo?.nombre ?? locationName;
  const latInput = borradorActivo?.latitud ?? String(observer.latitude);
  const lonInput = borradorActivo?.longitud ?? String(observer.longitude);

  const actualizarCampoBorrador = (campo: 'nombre' | 'latitud' | 'longitud', valor: string) => {
    setBorradorUbicacion({
      claveOrigen: claveOrigenFormulario,
      nombre: campo === 'nombre' ? valor : nameInput,
      latitud: campo === 'latitud' ? valor : latInput,
      longitud: campo === 'longitud' ? valor : lonInput,
    });
  };

  const handleSizeChange = useCallback((nextSize: number) => {
    setCanvasSize(nextSize);
  }, []);

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) {
      setCustomDate(new Date(Number.NaN));
      return;
    }
    const parsed = parsearFechaInputEnZona(raw, timezone);
    setCustomDate(parsed ?? new Date(Number.NaN));
  };

  const handleApplyLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLat = latInput.trim() === '' ? Number.NaN : Number(latInput);
    const parsedLon = lonInput.trim() === '' ? Number.NaN : Number(lonInput);
    setBorradorUbicacion(null);
    setLocation({
      name: nameInput.trim() || 'Ubicación personalizada',
      latitude: parsedLat,
      longitude: parsedLon,
    });
  };

  const handleSelectPreset = (preset: PresetObservatorio) => {
    setBorradorUbicacion(null);
    setLocation({
      name: preset.name,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
  };

  const handleUsarObservatorioGlobal = () => {
    setBorradorUbicacion(null);
    restaurarUbicacionGlobal();
  };

  const handleResetAll = () => {
    setBorradorUbicacion(null);
    resetAll();
  };

  const siderealLabel = useMemo(() => {
    if (error !== null) return '—';
    const lstDeg = getLocalSiderealTimeDeg(observer.date, observer.longitude);
    return formatSiderealTime(lstDeg);
  }, [error, observer.date, observer.longitude]);

  const cardClass = claseTarjeta ?? getCardFallbackClass(tema);
  const inputSchemeClass = tema !== 'claro' ? '[color-scheme:dark]' : '';
  const activeHoverOrSelected = selectedStar ?? hoveredStar;

  return (
    <section aria-labelledby="star-chart-heading" className="space-y-6">
      {/* Cabecera de la pestaña */}
      <header
        className={`p-4 md:p-5 rounded-2xl border ${cardClass} flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 opacity-85" aria-hidden="true" />
            <h1
              id="star-chart-heading"
              className="font-display text-xl md:text-2xl font-bold tracking-tight"
            >
              Carta Astronómica
            </h1>
          </div>
          <p className="text-xs md:text-sm opacity-75">
            Planisferio 2D estereográfico en tiempo real · Norte arriba, Este a la
            izquierda y Oeste a la derecha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-current/20 bg-current/5">
            <MapPin className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
            <span>{locationName}</span>
            {error === null && (
              <span className="opacity-70">
                ({observer.latitude.toFixed(2)}°, {observer.longitude.toFixed(2)}°)
              </span>
            )}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-current/20 bg-current/5"
            title="Tiempo Sidéreo Local aproximado"
          >
            <Clock className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
            TSL {siderealLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-current/20 bg-current/5">
            <Eye className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
            {visibleCount} visibles
          </span>
        </div>
      </header>

      {/* Layout principal: Planisferio protagonista + panel lateral de controles e inspección */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna principal del lienzo */}
        <div className={`lg:col-span-8 p-4 md:p-6 rounded-2xl border ${cardClass} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
              <Compass className="w-4 h-4" aria-hidden="true" />
              Bóveda celeste cenital
            </span>
            <span className="font-mono opacity-75">
              {error === null
                ? `${formatearFechaCortaEnZona(date, timezone)} · ${formatearHoraEnZona(
                    date,
                    timezone
                  )}`
                : 'Fecha no válida'}
            </span>
          </div>

          {error !== null ? (
            <div
              role="alert"
              className={`p-6 rounded-2xl border text-center space-y-4 ${getErrorClass(
                tema
              )}`}
            >
              <AlertTriangle className="w-8 h-8 mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="font-display font-semibold text-base">
                  Parámetros de observación no válidos
                </h2>
                <p className="text-xs md:text-sm opacity-90">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleResetAll}
                className={`inline-flex items-center gap-1.5 px-4 min-h-10 rounded-xl border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  true
                )}`}
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Restablecer a Madrid y hora actual
              </button>
            </div>
          ) : (
            <>
              <StarChartCanvas
                projectedStars={projectedStars}
                constellations={projectedConstellations}
                layers={layers}
                selectedStar={selectedStar}
                hoveredStar={hoveredStar}
                date={date}
                timezone={timezone}
                locationName={locationName}
                visibleCount={visibleCount}
                tema={tema}
                padding={DEFAULT_CANVAS_PADDING}
                onSizeChange={handleSizeChange}
                onSelectStar={setSelectedStar}
                onHoverStar={setHoveredStar}
              />

              {/* Estado vacío cuando el filtro de magnitud oculta todas las estrellas sobre el horizonte */}
              {isReady && visibleCount === 0 && (
                <div
                  role="status"
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${getAlertClass(
                    tema
                  )}`}
                >
                  <p>
                    No hay estrellas visibles sobre el horizonte con magnitud ≤{' '}
                    <span className="font-mono font-semibold">
                      {layers.maxMagnitude.toFixed(1)}
                    </span>{' '}
                    ({aboveHorizonCount} disponibles en catálogo sobre el horizonte).
                  </p>
                  <button
                    type="button"
                    onClick={() => setMaxMagnitude(4.5)}
                    className="px-3 min-h-9 rounded-lg border border-current/40 hover:bg-current/10 font-semibold cursor-pointer transition-colors motion-reduce:transition-none"
                  >
                    Restaurar mag. 4.5
                  </button>
                </div>
              )}

              {/* Resumen discreto bajo el canvas */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-current/15 text-[11px] opacity-75">
                <span>
                  Toca o haz clic sobre cualquier estrella para inspeccionar sus
                  coordenadas.
                </span>
                {activeHoverOrSelected && activeHoverOrSelected.visible && (
                  <span className="font-mono">
                    {activeHoverOrSelected.star.name} · Alt{' '}
                    {activeHoverOrSelected.horizontal.altitudeDeg.toFixed(1)}° · Az{' '}
                    {activeHoverOrSelected.horizontal.azimuthDeg.toFixed(1)}°{' '}
                    {azimuthToCardinal(activeHoverOrSelected.horizontal.azimuthDeg)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Barra lateral: control temporal, capas, ubicación aislada e inspección */}
        <aside
          aria-label="Controles e inspección de la carta astronómica"
          className="lg:col-span-4 space-y-4"
        >
          {/* Control temporal */}
          <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
            <h2 className="font-semibold text-xs uppercase tracking-wider opacity-75 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              Control temporal
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => shiftHours(-1)}
                className="min-h-10 rounded-xl border border-current/25 hover:bg-current/10 text-xs font-mono font-semibold cursor-pointer transition-colors motion-reduce:transition-none"
              >
                -1h
              </button>
              <button
                type="button"
                onClick={resetToNow}
                className={`min-h-10 rounded-xl border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  true
                )}`}
              >
                Ahora
              </button>
              <button
                type="button"
                onClick={() => shiftHours(1)}
                className="min-h-10 rounded-xl border border-current/25 hover:bg-current/10 text-xs font-mono font-semibold cursor-pointer transition-colors motion-reduce:transition-none"
              >
                +1h
              </button>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="opacity-75">Fecha y hora local</span>
              <input
                type="datetime-local"
                aria-label={`Fecha y hora de la carta astronómica (${timezone})`}
                value={Number.isNaN(date.getTime()) ? '' : formatearFechaInputEnZona(date, timezone)}
                onChange={handleDateChange}
                className={`w-full min-h-10 px-3 py-1.5 rounded-xl border border-current/25 bg-transparent font-mono text-xs ${inputSchemeClass}`}
              />
            </label>
          </div>

          {/* Control de capas y magnitud límite */}
          <div className={`p-4 rounded-2xl border ${cardClass} space-y-3.5`}>
            <h2 className="font-semibold text-xs uppercase tracking-wider opacity-75 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              Capas visibles
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={layers.showConstellations}
                onClick={() => toggleLayer('showConstellations')}
                className={`min-h-10 px-2.5 py-1.5 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  layers.showConstellations
                )}`}
              >
                Constelaciones
              </button>
              <button
                type="button"
                aria-pressed={layers.showConstellationLabels}
                onClick={() => toggleLayer('showConstellationLabels')}
                className={`min-h-10 px-2.5 py-1.5 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  layers.showConstellationLabels
                )}`}
              >
                Nombres const.
              </button>
              <button
                type="button"
                aria-pressed={layers.showStarLabels}
                onClick={() => toggleLayer('showStarLabels')}
                className={`min-h-10 px-2.5 py-1.5 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  layers.showStarLabels
                )}`}
              >
                Nombres estrellas
              </button>
              <button
                type="button"
                aria-pressed={layers.showAltAzGrid}
                onClick={() => toggleLayer('showAltAzGrid')}
                className={`min-h-10 px-2.5 py-1.5 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                  tema,
                  layers.showAltAzGrid
                )}`}
              >
                Cuadrícula Alt/Az
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="star-chart-mag-slider" className="opacity-80">
                  Magnitud límite
                </label>
                <span className="font-mono font-semibold">
                  ≤ {layers.maxMagnitude.toFixed(1)}
                </span>
              </div>
              <input
                id="star-chart-mag-slider"
                type="range"
                min={MIN_MAGNITUDE_LIMIT}
                max={MAX_MAGNITUDE_LIMIT}
                step={0.1}
                value={layers.maxMagnitude}
                onChange={(e) => setMaxMagnitude(Number(e.target.value))}
                className="rango-hud"
              />
              <div className="flex justify-between text-[10px] font-mono opacity-60">
                <span>Más brillantes ({MIN_MAGNITUDE_LIMIT.toFixed(1)})</span>
                <span>Más tenues ({MAX_MAGNITUDE_LIMIT.toFixed(1)})</span>
              </div>
            </div>
          </div>

          {/* Panel de inspección de estrella */}
          <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-xs uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Inspección estelar
              </h2>
              {selectedStar && (
                <button
                  type="button"
                  onClick={() => setSelectedStar(null)}
                  aria-label="Cerrar inspección de estrella"
                  className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-current/10 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <label className="block space-y-1 text-xs">
              <span className="opacity-75">Selector rápido de estrellas visibles</span>
              <select
                aria-label="Seleccionar una estrella visible en la carta"
                value={selectedStar?.star.id ?? ''}
                onChange={(e) => selectStarById(e.target.value || null)}
                disabled={visibleStars.length === 0 || error !== null}
                className={`w-full min-h-10 px-3 py-1.5 rounded-xl border border-current/25 bg-transparent text-xs cursor-pointer disabled:opacity-50 ${inputSchemeClass}`}
              >
                <option value="" className={getOptionClass(tema)}>
                  {visibleStars.length > 0
                    ? `Elegir entre ${visibleStars.length} estrellas visibles...`
                    : 'Sin estrellas visibles con este filtro'}
                </option>
                {visibleStars.map((item) => (
                  <option
                    key={item.star.id}
                    value={item.star.id}
                    className={getOptionClass(tema)}
                  >
                    {item.star.name} ({item.star.constellation}) · mag{' '}
                    {item.star.magnitude.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            {selectedStar ? (
              <div className="p-3.5 rounded-xl border border-current/20 bg-current/5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base leading-tight flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block shrink-0 border border-current/25"
                        style={{
                          backgroundColor:
                            tema === 'rojo'
                              ? '#ef4444'
                              : getSpectralColor(selectedStar.star.spectralClass),
                        }}
                        aria-hidden="true"
                      />
                      {selectedStar.star.name}
                    </h3>
                    <p className="text-xs opacity-75 mt-0.5">
                      {obtenerNombreConstelacionIAU(selectedStar.star.constellation)} (
                      {selectedStar.star.constellation})
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-current/25 shrink-0">
                    {selectedStar.horizontal.altitudeDeg < 0
                      ? 'Bajo horizonte'
                      : selectedStar.visible
                        ? 'Visible'
                        : 'Filtrada'}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2 rounded-lg border border-current/15">
                    <dt className="text-[10px] uppercase tracking-wider opacity-65">
                      Magnitud
                    </dt>
                    <dd className="font-mono font-semibold mt-0.5">
                      {selectedStar.star.magnitude.toFixed(2)}
                    </dd>
                  </div>
                  <div className="p-2 rounded-lg border border-current/15">
                    <dt className="text-[10px] uppercase tracking-wider opacity-65">
                      Clase espectral
                    </dt>
                    <dd className="font-mono font-semibold mt-0.5">
                      {getSpectralLabel(selectedStar.star.spectralClass)}
                    </dd>
                  </div>
                  <div className="p-2 rounded-lg border border-current/15">
                    <dt className="text-[10px] uppercase tracking-wider opacity-65">
                      Altitud
                    </dt>
                    <dd className="font-mono font-semibold mt-0.5">
                      {selectedStar.horizontal.altitudeDeg.toFixed(1)}°
                    </dd>
                  </div>
                  <div className="p-2 rounded-lg border border-current/15">
                    <dt className="text-[10px] uppercase tracking-wider opacity-65">
                      Azimut
                    </dt>
                    <dd className="font-mono font-semibold mt-0.5">
                      {selectedStar.horizontal.azimuthDeg.toFixed(1)}°{' '}
                      {azimuthToCardinal(selectedStar.horizontal.azimuthDeg)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-xs opacity-70 leading-relaxed">
                Selecciona una estrella en el planisferio o desde la lista desplegable
                para ver su constelación, magnitud, tipo espectral y posición horizontal
                exacta.
              </p>
            )}
          </div>

          {/* Ubicación sincronizada con el observatorio global (presets Norte/Sur + coordenadas manuales) */}
          <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-xs uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                Ubicación del observador
              </h2>
              <div className="flex items-center gap-2">
                {usaUbicacionLocal && (
                  <button
                    type="button"
                    onClick={handleUsarObservatorioGlobal}
                    className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Observatorio global
                  </button>
                )}
                <button
                  type="button"
                  aria-expanded={editingLocation}
                  onClick={() => setEditingLocation((prev) => !prev)}
                  className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
                >
                  {editingLocation ? 'Ocultar' : 'Cambiar'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS_UBICACION.map((preset) => {
                const isActive =
                  Math.abs(observer.latitude - preset.latitude) < 0.01 &&
                  Math.abs(observer.longitude - preset.longitude) < 0.01;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 min-h-8 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                      tema,
                      isActive
                    )}`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {editingLocation && (
              <form onSubmit={handleApplyLocation} className="space-y-2.5 pt-2 border-t border-current/15" noValidate>
                <label className="block space-y-1 text-xs">
                  <span className="opacity-75">Nombre</span>
                  <input
                    type="text"
                    maxLength={48}
                    value={nameInput}
                    onChange={(e) => actualizarCampoBorrador('nombre', e.target.value)}
                    className={`w-full min-h-9 px-2.5 py-1 rounded-lg border border-current/25 bg-transparent text-xs ${inputSchemeClass}`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-xs">
                    <span className="opacity-75">Latitud (°)</span>
                    <input
                      type="number"
                      step="0.0001"
                      min={-90}
                      max={90}
                      value={latInput}
                      onChange={(e) => actualizarCampoBorrador('latitud', e.target.value)}
                      className={`w-full min-h-9 px-2.5 py-1 rounded-lg border border-current/25 bg-transparent font-mono text-xs ${inputSchemeClass}`}
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="opacity-75">Longitud (°)</span>
                    <input
                      type="number"
                      step="0.0001"
                      min={-180}
                      max={180}
                      value={lonInput}
                      onChange={(e) => actualizarCampoBorrador('longitud', e.target.value)}
                      className={`w-full min-h-9 px-2.5 py-1 rounded-lg border border-current/25 bg-transparent font-mono text-xs ${inputSchemeClass}`}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className={`w-full min-h-9 rounded-lg border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none ${getAccentButtonClass(
                    tema,
                    true
                  )}`}
                >
                  Aplicar coordenadas
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
