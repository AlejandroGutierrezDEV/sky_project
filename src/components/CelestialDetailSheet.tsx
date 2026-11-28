import { useEffect, useId, useRef } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Compass,
  Eye,
  EyeOff,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { CelestialPreview } from './CelestialPreview';
import { resolverColoresEstrellaBV } from '../data/celestialDetails';
import type { EntradaObjetivoSesion } from '../hooks/usePlanificadorSesion';
import type { TemaVisual } from '../types/astronomy';
import type {
  CelestialCategory,
  CelestialTechnicalSheet,
  CelestialVisualSpec,
  LiveEphemerisSnapshot,
  SheetLoadStatus,
} from '../types/celestialDetails';

export interface CelestialDetailSheetProps {
  isOpen: boolean;
  status: SheetLoadStatus;
  sheet: CelestialTechnicalSheet | null;
  fallbackName?: string;
  fallbackSubtitle?: string;
  ephemeris: LiveEphemerisSnapshot | null;
  errorMessage: string | null;
  tema: TemaVisual;
  onMinimize: () => void;
  onCloseAll: () => void;
  onRetry?: () => void;
  onApuntarEnBrujula?: () => void;
  objetivoSesion?: EntradaObjetivoSesion | null;
  esObjetivoEnSesion?: boolean;
  onToggleObjetivo?: (astro: EntradaObjetivoSesion) => void;
}

const ETIQUETA_CATEGORIA: Readonly<Record<CelestialCategory, string>> = {
  planet: 'Planeta',
  constellation: 'Constelación',
  galaxy: 'Galaxia',
  star: 'Estrella',
  moon: 'Luna',
  sun: 'Sol',
  deep_sky: 'Cielo profundo',
};

function obtenerClasesPanel(tema: TemaVisual): string {
  if (tema === 'rojo') {
    return 'bg-black/96 border-red-700 text-red-500 shadow-[0_-12px_40px_rgba(0,0,0,0.95)]';
  }
  if (tema === 'claro') {
    return 'bg-slate-50/98 border-slate-300 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] backdrop-blur-md';
  }
  return 'bg-slate-950/95 border-cyan-400/25 text-slate-100 shadow-[0_-16px_48px_rgba(0,0,0,0.72)] backdrop-blur-md';
}

function obtenerClasesBadgeCategoria(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600/80 bg-red-950/60 text-red-400';
  if (tema === 'claro') return 'border-sky-300 bg-sky-50 text-sky-900';
  return 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200';
}

function obtenerClasesBadgeHorizonte(tema: TemaVisual, visible: boolean): string {
  if (!visible) {
    if (tema === 'rojo') return 'border-red-800/80 bg-red-950/30 text-red-500/80';
    if (tema === 'claro') return 'border-slate-300 bg-slate-200/80 text-slate-700';
    return 'border-slate-700 bg-slate-900/80 text-slate-300';
  }
  if (tema === 'rojo') return 'border-red-500 bg-red-950/70 text-red-400';
  if (tema === 'claro') return 'border-emerald-400 bg-emerald-50 text-emerald-900';
  return 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300';
}

function obtenerClasesTarjetaMetrica(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-900/80 bg-red-950/20';
  if (tema === 'claro') return 'border-slate-200 bg-white';
  return 'border-slate-800 bg-slate-900/65';
}

function obtenerClasesBotonPrimario(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/70 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  return 'border-sky-500/60 bg-sky-600 text-white hover:bg-sky-500';
}

function obtenerClasesBotonSecundario(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-800/80 text-red-400 hover:bg-red-950/60';
  if (tema === 'claro') return 'border-slate-300 text-slate-800 hover:bg-slate-200/70';
  return 'border-slate-700 text-slate-200 hover:bg-slate-800/80';
}

function obtenerClasesBotonObjetivo(tema: TemaVisual, activo: boolean): string {
  if (!activo) return obtenerClasesBotonSecundario(tema);
  if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
  if (tema === 'claro') return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
  return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
}

function obtenerClasesAlerta(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-rose-300 bg-rose-50 text-rose-900';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
}

function formatearGrados(valor: number): string {
  return Number.isFinite(valor) ? `${valor.toFixed(1)}°` : '—';
}

function renderEstadoEfemerides(
  ephemeris: LiveEphemerisSnapshot | null,
  tema: TemaVisual
) {
  if (!ephemeris) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${obtenerClasesBadgeHorizonte(
            tema,
            ephemeris.isAboveHorizon
          )}`}
        >
          {ephemeris.isAboveHorizon ? (
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {ephemeris.isAboveHorizon ? 'Visible ahora' : 'Bajo el horizonte'}
        </span>
        {typeof ephemeris.magnitude === 'number' && Number.isFinite(ephemeris.magnitude) && (
          <span className="px-2.5 py-1 rounded-full border border-current/20 font-mono text-[11px] opacity-90">
            Mag {ephemeris.magnitude.toFixed(1)}
          </span>
        )}
      </div>

      <div
        className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-center font-mono text-xs ${obtenerClasesTarjetaMetrica(
          tema
        )}`}
      >
        <div>
          <span className="block text-[10px] uppercase tracking-wider font-sans opacity-70">
            Altitud actual
          </span>
          <span className="font-semibold">{formatearGrados(ephemeris.altitudeDeg)}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-wider font-sans opacity-70">
            Azimut actual
          </span>
          <span className="font-semibold">{formatearGrados(ephemeris.azimuthDeg)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel/drawer desplegable accesible con vista dividida en 2 columnas:
 * representación visual grande a la izquierda + ficha astronómica y consejos a la derecha.
 */
export function CelestialDetailSheet({
  isOpen,
  status,
  sheet,
  fallbackName = 'Objeto celeste',
  fallbackSubtitle = 'Objeto del catálogo celeste',
  ephemeris,
  errorMessage,
  tema,
  onMinimize,
  onCloseAll,
  onRetry,
  onApuntarEnBrujula,
  objetivoSesion = null,
  esObjetivoEnSesion = false,
  onToggleObjetivo,
}: Readonly<CelestialDetailSheetProps>) {
  const tituloId = useId();
  const encabezadoFocoRef = useRef<HTMLDivElement | null>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      elementoPrevioRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      encabezadoFocoRef.current?.focus();
      return;
    }

    const previo = elementoPrevioRef.current;
    elementoPrevioRef.current = null;
    if (previo && previo.isConnected) {
      previo.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      elementoPrevioRef.current = null;
    };
  }, []);

  if (!isOpen) return null;

  const tituloVisible = sheet?.name ?? fallbackName;
  const tieneIndiceBV =
    typeof ephemeris?.indiceColorBV === 'number' && Number.isFinite(ephemeris.indiceColorBV);
  const infoEspectral = resolverColoresEstrellaBV(ephemeris?.indiceColorBV, tema);
  const visualFallback: CelestialVisualSpec = {
    kind: 'star_render',
    primaryColor: infoEspectral.colorPrimario,
    secondaryColor: infoEspectral.colorSecundario,
    altText: tieneIndiceBV
      ? `Representación estelar espectral de ${tituloVisible} (${infoEspectral.clase}, color ${infoEspectral.descripcionColor})`
      : `Representación estelar genérica de ${tituloVisible}`,
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby={tituloId}
        className={`pointer-events-auto max-w-5xl mx-auto rounded-2xl border overflow-hidden flex flex-col max-h-[82dvh] transition-all duration-200 motion-reduce:transition-none ${obtenerClasesPanel(
          tema
        )}`}
      >
        {/* Cabecera fija con foco inicial accesible y controles de acción */}
        <header className="px-4 py-3 border-b border-current/15 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div
            ref={encabezadoFocoRef}
            tabIndex={-1}
            className="flex items-center gap-2 min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <Compass className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75 truncate">
              Ficha técnica · Modo Foco
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onApuntarEnBrujula && (
              <button
                type="button"
                onClick={onApuntarEnBrujula}
                aria-haspopup="dialog"
                aria-label={`Apuntar hacia ${tituloVisible} en la Brújula 3D`}
                className={`min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClasesBotonSecundario(
                  tema
                )}`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Apuntar en Brújula 3D</span>
              </button>
            )}

            {objetivoSesion && onToggleObjetivo && (
              <button
                type="button"
                aria-pressed={esObjetivoEnSesion}
                onClick={() => onToggleObjetivo(objetivoSesion)}
                className={`min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClasesBotonObjetivo(
                  tema,
                  esObjetivoEnSesion
                )}`}
              >
                {esObjetivoEnSesion ? (
                  <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>Objetivo esta noche</span>
              </button>
            )}

            <button
              type="button"
              onClick={onMinimize}
              aria-label="Ver en mapa y ocultar ficha manteniendo el foco"
              className={`min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClasesBotonPrimario(
                tema
              )}`}
            >
              <MapIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Ver en mapa
            </button>

            <button
              type="button"
              onClick={onCloseAll}
              aria-label="Cerrar ficha y mostrar todo el cielo"
              className={`min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClasesBotonSecundario(
                tema
              )}`}
            >
              <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Cerrar y ver todo
            </button>
          </div>
        </header>

        {/* Cuerpo con scroll interno fluido para móvil y escritorio */}
        <div className="overflow-y-auto p-4 md:p-6">
          {status === 'loading' && (
            <div
              role="status"
              aria-live="polite"
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
            >
              <div className="md:col-span-5 space-y-3">
                <div className="aspect-square w-full max-w-68 mx-auto rounded-2xl border border-current/15 bg-current/10 animate-pulse motion-reduce:animate-none" />
                {renderEstadoEfemerides(ephemeris, tema)}
              </div>
              <div className="md:col-span-7 space-y-4">
                <h2 id={tituloId} className="text-xl font-bold">
                  {tituloVisible}
                </h2>
                <p className="text-xs opacity-75">Cargando ficha técnica astronómica…</p>
                <div className="space-y-2 animate-pulse motion-reduce:animate-none">
                  <div className="h-3.5 rounded bg-current/15 w-5/6" />
                  <div className="h-3.5 rounded bg-current/15 w-full" />
                  <div className="h-3.5 rounded bg-current/15 w-3/4" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-pulse motion-reduce:animate-none">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="h-14 rounded-xl border border-current/15 bg-current/10" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 space-y-3">
                <CelestialPreview visual={visualFallback} category="star" tema={tema} />
                {renderEstadoEfemerides(ephemeris, tema)}
              </div>
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h2 id={tituloId} className="text-xl font-bold">
                    {tituloVisible}
                  </h2>
                  <p className="text-xs opacity-75 mt-0.5">{fallbackSubtitle}</p>
                </div>

                <div
                  role="alert"
                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${obtenerClasesAlerta(
                    tema
                  )}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      {errorMessage ??
                        'No se pudo cargar la ficha técnica completa. Seguimos mostrando sus coordenadas efeméricas en vivo.'}
                    </p>
                  </div>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-current/40 hover:bg-current/10 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Reintentar carga
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'empty' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 space-y-3">
                <CelestialPreview visual={visualFallback} category="star" tema={tema} />
                {renderEstadoEfemerides(ephemeris, tema)}
              </div>
              <div className="md:col-span-7 space-y-4">
                <div>
                  <span
                    className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mb-2 ${obtenerClasesBadgeCategoria(
                      tema
                    )}`}
                  >
                    Catálogo celeste
                  </span>
                  <h2 id={tituloId} className="text-xl font-bold">
                    {tituloVisible}
                  </h2>
                  <p className="text-xs opacity-75 mt-0.5">{fallbackSubtitle}</p>
                </div>

                <p className="text-sm leading-relaxed opacity-85">
                  Este objeto aún no dispone de una ficha divulgativa ampliada en el catálogo
                  offline, pero puedes consultar su posición en tiempo real y mantenerlo aislado en
                  la bóveda 3D y el planisferio 2D.
                </p>

                {ephemeris && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className={`p-3 rounded-xl border ${obtenerClasesTarjetaMetrica(tema)}`}>
                      <span className="block text-[11px] opacity-70">Estado</span>
                      <span className="text-sm font-semibold">
                        {ephemeris.isAboveHorizon ? 'Sobre horizonte' : 'Bajo horizonte'}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${obtenerClasesTarjetaMetrica(tema)}`}>
                      <span className="block text-[11px] opacity-70">Altitud</span>
                      <span className="text-sm font-mono font-semibold">
                        {formatearGrados(ephemeris.altitudeDeg)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${obtenerClasesTarjetaMetrica(tema)}`}>
                      <span className="block text-[11px] opacity-70">Azimut</span>
                      <span className="text-sm font-mono font-semibold">
                        {formatearGrados(ephemeris.azimuthDeg)}
                      </span>
                    </div>
                    {tieneIndiceBV && typeof ephemeris.indiceColorBV === 'number' && (
                      <div className={`p-3 rounded-xl border col-span-2 sm:col-span-3 ${obtenerClasesTarjetaMetrica(tema)}`}>
                        <span className="block text-[11px] opacity-70">
                          Color espectral (índice B−V)
                        </span>
                        <span className="text-sm font-semibold flex flex-wrap items-center gap-2 mt-0.5">
                          <span
                            aria-hidden="true"
                            className="w-3 h-3 rounded-full border border-current/30 shrink-0"
                            style={{ backgroundColor: infoEspectral.colorPrimario }}
                          />
                          <span>{infoEspectral.clase}</span>
                          <span className="font-mono text-xs opacity-75">
                            B−V {ephemeris.indiceColorBV >= 0 ? `+${ephemeris.indiceColorBV.toFixed(2)}` : ephemeris.indiceColorBV.toFixed(2)} · {infoEspectral.temperatura}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === 'ready' && sheet && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Columna Izquierda: Visual grande + categoría + estado efemérico en vivo */}
              <div className="md:col-span-5 space-y-3.5">
                <CelestialPreview
                  visual={sheet.visual}
                  category={sheet.category}
                  tema={tema}
                />

                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${obtenerClasesBadgeCategoria(
                      tema
                    )}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    {ETIQUETA_CATEGORIA[sheet.category]}
                  </span>
                </div>

                {renderEstadoEfemerides(ephemeris, tema)}
              </div>

              {/* Columna Derecha: Descripción, métricas técnicas y consejos */}
              <div className="md:col-span-7 space-y-5">
                <div>
                  <h2 id={tituloId} className="text-2xl font-bold tracking-tight">
                    {sheet.name}
                  </h2>
                  <p className="text-sm opacity-75 mt-0.5">{sheet.subtitle}</p>
                </div>

                <p className="text-sm leading-relaxed opacity-90">{sheet.description}</p>

                {sheet.metrics.length > 0 && (
                  <section aria-label="Datos astronómicos principales" className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                      Datos astronómicos
                    </h3>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {sheet.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className={`p-2.5 rounded-xl border ${obtenerClasesTarjetaMetrica(tema)}`}
                        >
                          <dt className="text-[11px] opacity-70 truncate">{metric.label}</dt>
                          <dd className="text-sm font-semibold font-mono mt-0.5 break-words">
                            {metric.value}
                            {metric.unit ? (
                              <span className="text-[11px] font-sans font-normal opacity-75 ml-1">
                                {metric.unit}
                              </span>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {sheet.observationTips.length > 0 && (
                  <section aria-label="Consejos de observación" className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                      Consejos de observación
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm leading-relaxed opacity-90">
                      {sheet.observationTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0"
                          />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
