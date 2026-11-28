import { useId, useRef } from 'react';
import type { KeyboardEvent as EventoTecladoReact } from 'react';
import { AlertCircle, EyeOff, Loader2 } from 'lucide-react';
import type {
  CompassPlanetFilter,
  CompassPlanetOption,
  TemaVisual,
} from '../types/astronomy';

interface CompassFilterProps {
  tema: TemaVisual;
  selectedFilter: CompassPlanetFilter;
  onSelectFilter: (filter: CompassPlanetFilter) => void;
  planetOptions: CompassPlanetOption[];
  isLoading: boolean;
  error: string | null;
}

interface ClasesTemaFiltro {
  activo: string;
  inactivoVisible: string;
  inactivoBajoHorizonte: string;
  avisoBajoHorizonte: string;
  estadoError: string;
  estadoCarga: string;
  colorPuntoFijo: string | null;
}

const CLASES_TEMA: Record<TemaVisual, ClasesTemaFiltro> = {
  oscuro: {
    activo:
      'border-cyan-400/80 bg-cyan-500/20 text-cyan-100 shadow-sm shadow-cyan-500/20',
    inactivoVisible:
      'border-slate-700/90 bg-slate-900/70 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-800/80',
    inactivoBajoHorizonte:
      'border-dashed border-slate-700/80 bg-slate-900/40 text-slate-400 hover:border-slate-500 hover:text-slate-200',
    avisoBajoHorizonte:
      'border-amber-500/40 bg-amber-500/10 text-amber-200',
    estadoError:
      'border-rose-500/40 bg-rose-500/10 text-rose-200',
    estadoCarga:
      'border-slate-700/70 bg-slate-900/50 text-slate-300',
    colorPuntoFijo: null,
  },
  claro: {
    activo:
      'border-sky-700 bg-sky-700 text-white shadow-sm shadow-sky-900/15',
    inactivoVisible:
      'border-slate-300 bg-white text-slate-900 hover:border-sky-600/60 hover:bg-sky-50',
    inactivoBajoHorizonte:
      'border-dashed border-slate-300 bg-slate-100/80 text-slate-600 hover:border-slate-400 hover:text-slate-900',
    avisoBajoHorizonte:
      'border-amber-300 bg-amber-50 text-amber-900',
    estadoError:
      'border-rose-300 bg-rose-50 text-rose-800',
    estadoCarga:
      'border-slate-300 bg-slate-100 text-slate-700',
    colorPuntoFijo: null,
  },
  rojo: {
    activo:
      'border-red-500 bg-red-950/90 text-red-300',
    inactivoVisible:
      'border-red-900/80 bg-black text-red-500 hover:border-red-600 hover:bg-red-950/40',
    inactivoBajoHorizonte:
      'border-dashed border-red-900/70 bg-black text-red-700 hover:border-red-700 hover:text-red-500',
    avisoBajoHorizonte:
      'border-red-800 bg-red-950/50 text-red-400',
    estadoError:
      'border-red-700 bg-red-950/60 text-red-400',
    estadoCarga:
      'border-red-900/80 bg-black text-red-500',
    colorPuntoFijo: '#ef4444',
  },
};

function formatearGrados(valor: number): string {
  const redondeado = Math.round(valor);
  return `${redondeado}°`;
}

export function CompassFilter({
  tema,
  selectedFilter,
  onSelectFilter,
  planetOptions,
  isLoading,
  error,
}: CompassFilterProps) {
  const clases = CLASES_TEMA[tema];
  const idTituloFiltro = useId();
  const botonesRef = useRef<Array<HTMLButtonElement | null>>([]);

  const planetaSeleccionado =
    selectedFilter === 'all'
      ? null
      : (planetOptions.find((p) => p.id === selectedFilter) ?? null);

  const haySeleccionValida =
    selectedFilter === 'all' || planetaSeleccionado !== null;
  const esTodosEnfocable = selectedFilter === 'all' || !haySeleccionValida;

  const totalVisibles = planetOptions.filter((p) => p.isAboveHorizon).length;

  const opcionesFiltro: CompassPlanetFilter[] = [
    'all',
    ...planetOptions.map((planeta) => planeta.id),
  ];

  const manejarTeclaGrupo = (
    evento: EventoTecladoReact<HTMLButtonElement>,
    indiceActual: number
  ) => {
    let siguienteIndice: number | null = null;
    if (evento.key === 'ArrowRight') {
      siguienteIndice = (indiceActual + 1) % opcionesFiltro.length;
    } else if (evento.key === 'ArrowLeft') {
      siguienteIndice = (indiceActual - 1 + opcionesFiltro.length) % opcionesFiltro.length;
    } else if (evento.key === 'Home') {
      siguienteIndice = 0;
    } else if (evento.key === 'End') {
      siguienteIndice = opcionesFiltro.length - 1;
    }

    if (siguienteIndice === null) return;
    evento.preventDefault();
    const siguienteFiltro = opcionesFiltro[siguienteIndice];
    onSelectFilter(siguienteFiltro);
    botonesRef.current[siguienteIndice]?.focus();
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${clases.estadoCarga}`}
      >
        <Loader2 className="w-4 h-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span>Calculando posiciones planetarias…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${clases.estadoError}`}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  if (planetOptions.length === 0) {
    return (
      <p className="text-xs opacity-70 px-1 py-1.5">
        No hay datos planetarios disponibles para esta ubicación o fecha.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p id={idTituloFiltro} className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-70">
          Filtro de planetas
        </p>
        <p className="text-[10px] font-mono opacity-65 tabular-nums">
          {totalVisibles}/{planetOptions.length} sobre el horizonte
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={idTituloFiltro}
        className="flex flex-nowrap items-center gap-2 overflow-x-auto snap-x snap-mandatory ocultar-scrollbar pb-1 -mx-0.5 px-0.5"
      >
        {/* Opción "Todos" */}
        <button
          ref={(el) => {
            botonesRef.current[0] = el;
          }}
          type="button"
          role="radio"
          tabIndex={esTodosEnfocable ? 0 : -1}
          aria-checked={selectedFilter === 'all'}
          onClick={() => onSelectFilter('all')}
          onKeyDown={(e) => manejarTeclaGrupo(e, 0)}
          className={`snap-start shrink-0 inline-flex items-center gap-1.5 px-3 min-h-11 sm:min-h-10 rounded-xl border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
            selectedFilter === 'all' ? clases.activo : clases.inactivoVisible
          }`}
        >
          <span>Todos</span>
          <span className="font-mono text-[10px] opacity-75">({planetOptions.length})</span>
        </button>

        {/* Los 7 planetas del Sistema Solar */}
        {planetOptions.map((planeta, idx) => {
          const indiceBoton = idx + 1;
          const seleccionado = selectedFilter === planeta.id;
          const colorPunto = clases.colorPuntoFijo ?? planeta.accentColor ?? 'currentColor';
          const claseEstado = seleccionado
            ? clases.activo
            : planeta.isAboveHorizon
              ? clases.inactivoVisible
              : clases.inactivoBajoHorizonte;

          return (
            <button
              key={planeta.id}
              ref={(el) => {
                botonesRef.current[indiceBoton] = el;
              }}
              type="button"
              role="radio"
              tabIndex={seleccionado ? 0 : -1}
              aria-checked={seleccionado}
              aria-label={`${planeta.name}, acimut ${Math.round(planeta.azimuthDeg)} grados, ${
                planeta.isAboveHorizon
                  ? `sobre el horizonte a ${Math.round(planeta.altitudeDeg)} grados`
                  : `bajo el horizonte a ${Math.round(planeta.altitudeDeg)} grados`
              }`}
              onClick={() => onSelectFilter(planeta.id)}
              onKeyDown={(e) => manejarTeclaGrupo(e, indiceBoton)}
              className={`snap-start shrink-0 inline-flex items-center gap-1.5 px-3 min-h-11 sm:min-h-10 rounded-xl border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 ${claseEstado}`}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={
                  planeta.isAboveHorizon
                    ? { backgroundColor: colorPunto }
                    : {
                        border: `1.5px dashed ${colorPunto}`,
                        backgroundColor: 'transparent',
                      }
                }
              />
              <span>{planeta.name}</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                {formatearGrados(planeta.altitudeDeg)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalle de visibilidad del planeta enfocado (especialmente si está bajo el horizonte) */}
      {planetaSeleccionado && !planetaSeleccionado.isAboveHorizon && (
        <p
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${clases.avisoBajoHorizonte}`}
        >
          <span className="inline-flex items-center gap-1.5 font-medium min-w-0">
            <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {planetaSeleccionado.name}: Bajo el horizonte · {formatearGrados(planetaSeleccionado.altitudeDeg)}
            </span>
          </span>
          <span className="font-mono text-[11px] shrink-0 tabular-nums">
            Az {Math.round(planetaSeleccionado.azimuthDeg)}°
          </span>
        </p>
      )}
    </div>
  );
}
