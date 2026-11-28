import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Eye,
  Info,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { useWeatherAlerts } from '../../hooks/useWeatherAlerts';
import type { TemaVisual } from '../../types/astronomy';
import type {
  AlertCategory,
  AlertSeverity,
  WeatherAlert,
  WeatherAlertCoordinates,
} from '../../types/weatherAlerts';

export interface WeatherAlertsPanelProps {
  coordinates?: WeatherAlertCoordinates;
  tema?: TemaVisual;
  claseTarjeta?: string;
}

const ETIQUETA_SEVERIDAD: Readonly<Record<AlertSeverity, string>> = {
  extreme: 'Extremo',
  severe: 'Severo',
  moderate: 'Moderado',
  info: 'Informativo',
};

const ETIQUETA_CATEGORIA: Readonly<Record<AlertCategory, string>> = {
  storm: 'Tormenta',
  wind: 'Viento',
  rain: 'Lluvia',
  fog: 'Niebla',
  temperature: 'Temperatura',
  clouds: 'Nubosidad',
};

function formatearVentanaHoraria(
  inicio: Date,
  fin: Date,
  timezone: string
): { inicioTexto: string; finTexto: string } {
  try {
    const fmtDiaHora = new Intl.DateTimeFormat('es-ES', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const fmtSoloHora = new Intl.DateTimeFormat('es-ES', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const fmtDia = new Intl.DateTimeFormat('es-ES', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const mismoDia = fmtDia.format(inicio) === fmtDia.format(fin);
    return {
      inicioTexto: fmtDiaHora.format(inicio),
      finTexto: mismoDia ? fmtSoloHora.format(fin) : fmtDiaHora.format(fin),
    };
  } catch {
    return {
      inicioTexto: inicio.toISOString().slice(5, 16).replace('T', ' '),
      finTexto: fin.toISOString().slice(11, 16),
    };
  }
}

function formatearHoraActualizacion(fecha: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  } catch {
    return fecha.toISOString().slice(11, 16);
  }
}

function obtenerEstilosTarjetaAlerta(
  tema: TemaVisual,
  severity: AlertSeverity
): { contenedor: string; badge: string; acento: string } {
  if (tema === 'rojo') {
    switch (severity) {
      case 'extreme':
        return {
          contenedor: 'border-red-500 bg-red-950/55 text-red-400',
          badge: 'border-red-400 bg-red-950 text-red-300',
          acento: 'text-red-400',
        };
      case 'severe':
        return {
          contenedor: 'border-red-600/90 bg-red-950/35 text-red-400',
          badge: 'border-red-500 bg-red-950/80 text-red-400',
          acento: 'text-red-500',
        };
      case 'moderate':
        return {
          contenedor: 'border-red-800 bg-black/80 text-red-500',
          badge: 'border-red-700 bg-red-950/50 text-red-400',
          acento: 'text-red-500',
        };
      case 'info':
        return {
          contenedor: 'border-red-900/80 bg-black/70 text-red-500',
          badge: 'border-red-800 bg-black text-red-500',
          acento: 'text-red-600',
        };
    }
  }

  if (tema === 'claro') {
    switch (severity) {
      case 'extreme':
        return {
          contenedor: 'border-rose-700 bg-rose-50 text-slate-900',
          badge: 'border-rose-800 bg-rose-700 text-white',
          acento: 'text-rose-800',
        };
      case 'severe':
        return {
          contenedor: 'border-orange-700/70 bg-orange-50 text-slate-900',
          badge: 'border-orange-800/50 bg-orange-100 text-orange-950',
          acento: 'text-orange-800',
        };
      case 'moderate':
        return {
          contenedor: 'border-amber-700/60 bg-amber-50 text-slate-900',
          badge: 'border-amber-800/40 bg-amber-100 text-amber-950',
          acento: 'text-amber-800',
        };
      case 'info':
        return {
          contenedor: 'border-sky-700/50 bg-sky-50 text-slate-900',
          badge: 'border-sky-800/40 bg-sky-100 text-sky-950',
          acento: 'text-sky-800',
        };
    }
  }

  // Tema oscuro (por defecto)
  switch (severity) {
    case 'extreme':
      return {
        contenedor: 'border-rose-500/80 bg-rose-950/45 text-slate-100',
        badge: 'border-rose-400/70 bg-rose-600 text-white',
        acento: 'text-rose-300',
      };
    case 'severe':
      return {
        contenedor: 'border-orange-500/70 bg-orange-950/35 text-slate-100',
        badge: 'border-orange-400/60 bg-orange-500/25 text-orange-200',
        acento: 'text-orange-300',
      };
    case 'moderate':
      return {
        contenedor: 'border-amber-500/60 bg-amber-950/25 text-slate-100',
        badge: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
        acento: 'text-amber-300',
      };
    case 'info':
      return {
        contenedor: 'border-sky-500/50 bg-sky-950/25 text-slate-100',
        badge: 'border-sky-400/50 bg-sky-500/20 text-sky-200',
        acento: 'text-sky-300',
      };
  }
}

function obtenerEstiloEstadoPositivo(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-800/80 bg-red-950/25 text-red-400';
  if (tema === 'claro') return 'border-emerald-700/35 bg-emerald-50 text-emerald-900';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

function obtenerEstiloError(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/45 text-red-400';
  if (tema === 'claro') return 'border-rose-600/50 bg-rose-50 text-rose-900';
  return 'border-rose-500/50 bg-rose-950/35 text-rose-200';
}

function renderIconoCategoria(category: AlertCategory, className: string) {
  const props = { className, 'aria-hidden': true as const };
  switch (category) {
    case 'storm':
      return <CloudLightning {...props} />;
    case 'wind':
      return <Wind {...props} />;
    case 'rain':
      return <CloudRain {...props} />;
    case 'fog':
      return <CloudFog {...props} />;
    case 'temperature':
      return <Thermometer {...props} />;
    case 'clouds':
      return <Cloud {...props} />;
  }
}

function renderIconoSeveridad(severity: AlertSeverity) {
  const props = { className: 'w-3 h-3 shrink-0', 'aria-hidden': true as const };
  switch (severity) {
    case 'extreme':
      return <AlertOctagon {...props} />;
    case 'severe':
      return <ShieldAlert {...props} />;
    case 'moderate':
      return <AlertTriangle {...props} />;
    case 'info':
      return <Info {...props} />;
  }
}

function TarjetaAlerta({
  alert,
  timezone,
  tema,
  onDismiss,
}: Readonly<{
  alert: WeatherAlert;
  timezone: string;
  tema: TemaVisual;
  onDismiss: (id: string) => void;
}>) {
  const estilos = obtenerEstilosTarjetaAlerta(tema, alert.severity);
  const ventana = formatearVentanaHoraria(alert.startsAt, alert.endsAt, timezone);

  return (
    <li className={`p-3 rounded-xl border border-l-4 space-y-2 ${estilos.contenedor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {renderIconoCategoria(alert.category, `w-4 h-4 mt-0.5 shrink-0 ${estilos.acento}`)}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold leading-tight">{alert.title}</h3>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${estilos.badge}`}
              >
                {renderIconoSeveridad(alert.severity)}
                {ETIQUETA_SEVERIDAD[alert.severity]}
              </span>
              {alert.peakValue && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border border-current/25 bg-current/5">
                  Pico: {alert.peakValue}
                </span>
              )}
            </div>

            <p className="text-[11px] font-mono opacity-85">
              <span>{ETIQUETA_CATEGORIA[alert.category]} · </span>
              <time dateTime={alert.startsAt.toISOString()}>{ventana.inicioTexto}</time>
              <span aria-hidden="true"> – </span>
              <span className="sr-only"> hasta </span>
              <time dateTime={alert.endsAt.toISOString()}>{ventana.finTexto}</time>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          aria-label={`Descartar aviso de ${alert.title}`}
          title={`Descartar aviso de ${alert.title}`}
          className="min-h-9 min-w-9 sm:min-h-7 sm:min-w-7 inline-flex items-center justify-center rounded-lg border border-current/20 hover:bg-current/10 opacity-80 hover:opacity-100 cursor-pointer transition-colors motion-reduce:transition-none shrink-0"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <p className="text-xs leading-relaxed opacity-90">{alert.description}</p>

      <p className="text-xs leading-snug p-2 rounded-lg border border-current/15 bg-current/5">
        <span className="font-semibold">Impacto astronómico: </span>
        <span className="opacity-90">{alert.astronomyImpact}</span>
      </p>
    </li>
  );
}

export function WeatherAlertsPanel({
  coordinates,
  tema = 'oscuro',
  claseTarjeta = '',
}: Readonly<WeatherAlertsPanelProps>) {
  const {
    alerts,
    activeAlerts,
    dismissedCount,
    isLoading,
    error,
    lastUpdated,
    resolvedCoordinates,
    refresh,
    dismissAlert,
    restoreDismissed,
  } = useWeatherAlerts(coordinates);

  const hayAlertasCriticas = activeAlerts.some(
    (alert) => alert.severity === 'severe' || alert.severity === 'extreme'
  );

  const claseBaseContenedor =
    claseTarjeta.trim().length > 0
      ? claseTarjeta
      : tema === 'rojo'
        ? 'bg-black/90 border-red-900/70 text-red-500'
        : tema === 'claro'
          ? 'bg-slate-50/95 border-slate-300 text-slate-900'
          : 'bg-slate-900/60 border-cyan-400/15 text-slate-100';

  const resumenEstado = isLoading
    ? 'Consultando avisos meteorológicos para las próximas 48 horas.'
    : error
      ? `Error al consultar avisos meteorológicos: ${error}`
      : activeAlerts.length > 0
        ? `${activeAlerts.length} ${activeAlerts.length === 1 ? 'aviso meteorológico activo' : 'avisos meteorológicos activos'}.`
        : dismissedCount > 0
          ? `Todos los avisos meteorológicos (${dismissedCount}) han sido ocultados.`
          : 'Sin avisos meteorológicos activos para las próximas 48 horas.';

  return (
    <section
      aria-labelledby="weather-alerts-heading"
      aria-busy={isLoading}
      className={`p-4 rounded-2xl border space-y-3 ${claseBaseContenedor}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="weather-alerts-heading"
            className="font-semibold text-sm uppercase tracking-wider opacity-80 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Avisos Meteorológicos</span>
          </h2>
          <p className="text-[11px] font-mono opacity-70 truncate">
            {resolvedCoordinates.locationName}
            {resolvedCoordinates.usedFallback ? ' (ubicación por defecto)' : ''}
            {lastUpdated && (
              <>
                {' · Act. '}
                <time dateTime={lastUpdated.toISOString()}>
                  {formatearHoraActualizacion(lastUpdated, resolvedCoordinates.timezone)}
                </time>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {dismissedCount > 0 && activeAlerts.length > 0 && (
            <button
              type="button"
              onClick={restoreDismissed}
              className="min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Restaurar ocultos ({dismissedCount})
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            aria-label="Actualizar avisos meteorológicos"
            className="min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`}
              aria-hidden="true"
            />
            Actualizar
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {resumenEstado}
      </p>

      {isLoading ? (
        <div className="space-y-2.5" aria-label="Cargando avisos meteorológicos">
          <div className="min-h-[88px] rounded-xl border border-current/15 bg-current/5 p-3 space-y-2 animate-pulse motion-reduce:animate-none">
            <div className="h-3.5 w-2/5 rounded bg-current/15" />
            <div className="h-3 w-3/5 rounded bg-current/10" />
            <div className="h-3 w-4/5 rounded bg-current/10" />
          </div>
          <div className="min-h-[88px] rounded-xl border border-current/15 bg-current/5 p-3 space-y-2 animate-pulse motion-reduce:animate-none">
            <div className="h-3.5 w-1/3 rounded bg-current/15" />
            <div className="h-3 w-1/2 rounded bg-current/10" />
            <div className="h-3 w-3/4 rounded bg-current/10" />
          </div>
        </div>
      ) : error ? (
        <div className={`p-3 rounded-xl border space-y-2.5 ${obtenerEstiloError(tema)}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">No se pudieron cargar los avisos</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-current/35 hover:bg-current/10 text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : activeAlerts.length === 0 ? (
        alerts.length > 0 && dismissedCount > 0 ? (
          <div className="p-3 rounded-xl border border-current/20 bg-current/5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">
                {dismissedCount === 1
                  ? 'Hay 1 aviso meteorológico oculto'
                  : `Hay ${dismissedCount} avisos meteorológicos ocultos`}
              </p>
              <p className="opacity-75">
                Todos los avisos previstos para las próximas 48 h han sido descartados manualmente.
              </p>
            </div>
            <button
              type="button"
              onClick={restoreDismissed}
              className="min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-current/30 hover:bg-current/10 text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Mostrar avisos ocultos
            </button>
          </div>
        ) : (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${obtenerEstiloEstadoPositivo(tema)}`}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">Sin avisos meteorológicos activos</p>
              <p className="opacity-85">
                No se prevén tormentas, rachas peligrosas, lluvias intensas, niebla densa ni
                temperaturas extremas en las próximas 48 h.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {hayAlertasCriticas && (
            <div
              role="alert"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${obtenerEstiloError(tema)}`}
            >
              <AlertOctagon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Atención: hay avisos meteorológicos severos o extremos previstos. Extrema la
                precaución con tu equipo y seguridad.
              </span>
            </div>
          )}

          <ul className="space-y-2.5" aria-label="Lista de avisos meteorológicos activos">
            {activeAlerts.map((alert) => (
              <TarjetaAlerta
                key={alert.id}
                alert={alert}
                timezone={resolvedCoordinates.timezone}
                tema={tema}
                onDismiss={dismissAlert}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
