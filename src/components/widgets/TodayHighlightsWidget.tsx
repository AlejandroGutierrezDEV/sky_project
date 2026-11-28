import { useId } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  Moon,
  Orbit,
  RefreshCw,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { DailyHighlightItem, TemaVisual } from '../../types/astronomy';
import { formatearHoraEnZona } from '../../utils/lunarCalculations';

export interface TodayHighlightsWidgetProps {
  items: DailyHighlightItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  timezone: string;
  locationName?: string;
  tema: TemaVisual;
  claseTarjeta: string;
  onRetry: () => void;
  onSelectTimestamp?: (date: Date) => void;
}

const ETIQUETA_CATEGORIA: Readonly<Record<DailyHighlightItem['category'], string>> = {
  lunar: 'Lunar',
  solar: 'Solar',
  planetary: 'Planetario',
  meteor: 'Meteoros',
  visibility: 'Visibilidad',
};

const ETIQUETA_PRIORIDAD: Readonly<Record<DailyHighlightItem['priority'], string>> = {
  1: 'Clave hoy',
  2: 'Destacado',
  3: 'Referencia',
};

function renderIconoCategoria(
  category: DailyHighlightItem['category'],
  claseColor: string
) {
  const props = { className: `w-4 h-4 shrink-0 ${claseColor}`, 'aria-hidden': true as const };
  switch (category) {
    case 'lunar':
      return <Moon {...props} />;
    case 'solar':
      return <Sun {...props} />;
    case 'planetary':
      return <Orbit {...props} />;
    case 'meteor':
      return <Sparkles {...props} />;
    case 'visibility':
      return <Eye {...props} />;
  }
}

function obtenerClaseIconoCategoria(
  tema: TemaVisual,
  category: DailyHighlightItem['category']
): string {
  if (tema === 'rojo') return 'text-red-500';
  if (tema === 'claro') {
    switch (category) {
      case 'lunar':
        return 'text-indigo-700';
      case 'solar':
        return 'text-amber-700';
      case 'planetary':
        return 'text-sky-700';
      case 'meteor':
        return 'text-violet-700';
      case 'visibility':
        return 'text-emerald-700';
    }
  }
  switch (category) {
    case 'lunar':
      return 'text-indigo-300';
    case 'solar':
      return 'text-amber-300';
    case 'planetary':
      return 'text-cyan-300';
    case 'meteor':
      return 'text-fuchsia-300';
    case 'visibility':
      return 'text-emerald-300';
  }
}

function obtenerClaseBadge(
  tema: TemaVisual,
  priority: DailyHighlightItem['priority']
): string {
  if (tema === 'rojo') {
    if (priority === 1) return 'border-red-500 bg-red-950/75 text-red-400';
    if (priority === 2) return 'border-red-700 bg-red-950/45 text-red-500';
    return 'border-red-900 bg-black text-red-500';
  }
  if (tema === 'claro') {
    if (priority === 1) return 'border-sky-700/40 bg-sky-100 text-sky-900';
    if (priority === 2) return 'border-emerald-700/35 bg-emerald-50 text-emerald-800';
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }
  if (priority === 1) return 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200';
  if (priority === 2) return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300';
  return 'border-slate-600/60 bg-slate-800/70 text-slate-300';
}

function obtenerClaseBordeItem(
  tema: TemaVisual,
  priority: DailyHighlightItem['priority']
): string {
  if (tema === 'rojo') {
    return priority === 1
      ? 'border-red-600/80 bg-red-950/25 hover:border-red-500'
      : 'border-red-900/70 bg-black/70 hover:border-red-700';
  }
  if (tema === 'claro') {
    return priority === 1
      ? 'border-sky-300 bg-white/90 hover:border-sky-500 shadow-xs'
      : 'border-slate-200 bg-white/75 hover:border-slate-300';
  }
  return priority === 1
    ? 'border-cyan-400/35 bg-slate-900/70 hover:border-cyan-400/60'
    : 'border-current/15 bg-current/5 hover:border-sky-400/40';
}

function obtenerClaseBotonReintento(tema: TemaVisual): string {
  if (tema === 'rojo') {
    return 'border-red-600 bg-red-950/70 text-red-400 hover:bg-red-950';
  }
  if (tema === 'claro') {
    return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  }
  return 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25';
}

function obtenerClaseErrorCaja(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-700 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-rose-300 bg-rose-50 text-rose-800';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
}

function obtenerClaseSkeleton(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-red-950/60';
  if (tema === 'claro') return 'bg-slate-200';
  return 'bg-slate-700/60';
}

const SKELETON_SLOTS = [0, 1, 2, 3] as const;

export function TodayHighlightsWidget({
  items,
  isLoading,
  error,
  lastUpdated,
  timezone,
  locationName,
  tema,
  claseTarjeta,
  onRetry,
  onSelectTimestamp,
}: Readonly<TodayHighlightsWidgetProps>) {
  const headingId = useId();
  const claseSkeleton = obtenerClaseSkeleton(tema);
  const horaActualizacion = lastUpdated
    ? formatearHoraEnZona(lastUpdated, timezone)
    : null;

  return (
    <section
      aria-labelledby={headingId}
      className={`p-4 md:p-5 rounded-2xl border space-y-3.5 ${claseTarjeta}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles
            className={`w-4 h-4 shrink-0 ${obtenerClaseIconoCategoria(tema, 'planetary')}`}
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="font-semibold text-sm uppercase tracking-wider opacity-85"
          >
            Destacados de hoy
          </h2>
          {locationName && (
            <span className="text-xs opacity-65 truncate hidden sm:inline">
              · {locationName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono opacity-75">
          <span
            className="px-2 py-0.5 rounded-full border border-current/20 bg-current/5"
            title="Zona horaria IANA aplicada a los horarios de hoy"
          >
            {timezone}
          </span>
          {horaActualizacion && !isLoading && !error && (
            <span className="hidden sm:inline opacity-80">
              Act. {horaActualizacion}
            </span>
          )}
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            aria-label="Actualizar destacados de hoy"
            title="Actualizar destacados de hoy"
            className="inline-flex items-center justify-center min-w-11 min-h-11 sm:min-w-8 sm:min-h-8 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer disabled:opacity-50 transition-colors motion-reduce:transition-none"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Estado Loading: skeletons con altura estable para evitar CLS */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Calculando destacados astronómicos de hoy"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
        >
          {SKELETON_SLOTS.map((slot) => (
            <div
              key={slot}
              className="min-h-[126px] p-3.5 rounded-xl border border-current/15 bg-current/5 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`h-4 w-24 rounded-md motion-safe:animate-pulse ${claseSkeleton}`} />
                <div className={`h-5 w-16 rounded-full motion-safe:animate-pulse ${claseSkeleton}`} />
              </div>
              <div className="space-y-1.5">
                <div className={`h-4 w-4/5 rounded-md motion-safe:animate-pulse ${claseSkeleton}`} />
                <div className={`h-3 w-full rounded-md motion-safe:animate-pulse ${claseSkeleton}`} />
                <div className={`h-3 w-2/3 rounded-md motion-safe:animate-pulse ${claseSkeleton}`} />
              </div>
              <div className={`h-3 w-20 rounded-md motion-safe:animate-pulse ${claseSkeleton}`} />
            </div>
          ))}
        </div>
      )}

      {/* Estado Error con botón de reintento accesible */}
      {!isLoading && error && (
        <div
          role="alert"
          className={`min-h-[126px] p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${obtenerClaseErrorCaja(
            tema
          )}`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                No se pudieron cargar los destacados de hoy
              </p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            aria-label="Reintentar carga de destacados de hoy"
            className={`min-h-11 sm:min-h-9 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer shrink-0 transition-colors motion-reduce:transition-none ${obtenerClaseBotonReintento(
              tema
            )}`}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Empty / Fallback */}
      {!isLoading && !error && items.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          className="min-h-[126px] p-4 rounded-xl border border-current/15 bg-current/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              Sin destacados disponibles para esta configuración
            </p>
            <p className="text-xs opacity-75">
              Comprueba las coordenadas del observatorio o actualiza para recalcular las efemérides de hoy.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            aria-label="Recalcular destacados de hoy"
            className={`min-h-11 sm:min-h-9 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer shrink-0 transition-colors motion-reduce:transition-none ${obtenerClaseBotonReintento(
              tema
            )}`}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Recalcular
          </button>
        </div>
      )}

      {/* Lista semántica de tarjetas priorizadas */}
      {!isLoading && !error && items.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {items.map((item) => {
            const tieneHoraValida =
              item.timestamp instanceof Date && !Number.isNaN(item.timestamp.getTime());
            const horaFormateada = tieneHoraValida
              ? formatearHoraEnZona(item.timestamp, timezone)
              : null;
            const iconoColor = obtenerClaseIconoCategoria(tema, item.category);
            const badgeTexto = item.badgeText ?? ETIQUETA_PRIORIDAD[item.priority];

            return (
              <li
                key={item.id}
                className={`tarjeta-3d min-h-[126px] p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${obtenerClaseBordeItem(
                  tema,
                  item.priority
                )}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide opacity-75">
                      {renderIconoCategoria(item.category, iconoColor)}
                      <span>{ETIQUETA_CATEGORIA[item.category]}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 ${obtenerClaseBadge(
                        tema,
                        item.priority
                      )}`}
                    >
                      {badgeTexto}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
                  <p className="text-xs opacity-80 leading-relaxed">{item.subtitle}</p>
                </div>

                <div className="pt-1.5 border-t border-current/10 flex items-center justify-between gap-2 text-[11px] font-mono opacity-80">
                  {tieneHoraValida && item.timestamp && horaFormateada ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0 opacity-75" aria-hidden="true" />
                        <time dateTime={item.timestamp.toISOString()}>
                          {horaFormateada}
                        </time>
                      </span>
                      {onSelectTimestamp && (
                        <button
                          type="button"
                          onClick={() => onSelectTimestamp(item.timestamp as Date)}
                          aria-label={`Ver ${item.title} a las ${horaFormateada} en el mapa celeste`}
                          className="min-h-11 sm:min-h-7 inline-flex items-center px-3 sm:px-2 py-1 sm:py-0.5 rounded-md border border-current/25 hover:bg-current/10 font-sans font-medium cursor-pointer transition-colors motion-reduce:transition-none"
                        >
                          Ver hora
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="opacity-70">{ETIQUETA_PRIORIDAD[item.priority]}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
