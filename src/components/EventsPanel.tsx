import { CalendarClock, Sparkles, Eclipse, ArrowUpRight } from 'lucide-react';
import type { EventoCeleste, TemaVisual } from '../types/astronomy';

interface EventsPanelProps {
  eventos: EventoCeleste[];
  tema: TemaVisual;
  claseTarjeta: string;
  onSeleccionarFecha: (fecha: Date) => void;
}

function formatearBadgeDias(dias: number): string {
  if (dias < 0) return 'Ayer';
  if (dias === 0) return '¡Hoy!';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

function obtenerClaseIconoEvento(tema: TemaVisual, tipo: EventoCeleste['tipo']): string {
  if (tema === 'rojo') return 'text-red-500';
  if (tema === 'claro') return tipo === 'lluvia' ? 'text-amber-600' : 'text-sky-600';
  return tipo === 'lluvia' ? 'text-amber-400' : 'text-sky-400';
}

function obtenerClaseBadgeDias(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 text-red-500';
  if (tema === 'claro') return 'border-sky-600/40 bg-sky-500/10 text-sky-700';
  return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
}

export function EventsPanel({
  eventos,
  tema,
  claseTarjeta,
  onSeleccionarFecha,
}: Readonly<EventsPanelProps>) {
  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <CalendarClock className="w-4 h-4" aria-hidden="true" /> Próximos Eventos Celestes
        </h2>
        <span className="text-[11px] opacity-60">Lluvias y Eclipses</span>
      </div>

      <div className="space-y-2.5">
        {eventos.map((ev) => {
          const fechaTexto = ev.fechaPico.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          const claseHoverEvento =
            tema === 'rojo'
              ? 'hover:border-red-600/80'
              : tema === 'claro'
                ? 'hover:border-slate-300 hover:shadow-md'
                : 'hover:border-sky-500/40';

          return (
            <div
              key={ev.id}
              className={`tarjeta-3d p-3.5 rounded-xl border border-current/15 bg-current/5 flex flex-col gap-1.5 ${claseHoverEvento}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  {ev.tipo === 'lluvia' ? (
                    <Sparkles
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'lluvia')}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <Eclipse
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'eclipse')}`}
                      aria-hidden="true"
                    />
                  )}
                  {ev.titulo}
                </span>

                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${obtenerClaseBadgeDias(
                    tema
                  )}`}
                >
                  {formatearBadgeDias(ev.diasRestantes)}
                </span>
              </div>

              <div className="text-xs opacity-80 font-mono flex flex-wrap items-center justify-between gap-2">
                <span>
                  {fechaTexto} · {ev.resumen}
                </span>
                <button
                  type="button"
                  onClick={() => onSeleccionarFecha(ev.fechaPico)}
                  aria-label={`Ver ${ev.titulo} en el mapa celeste`}
                  className="inline-flex items-center gap-1 min-h-9 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 no-underline hover:opacity-100 cursor-pointer font-sans font-medium transition-colors"
                >
                  Ver en mapa <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
              <p className="text-[11px] opacity-65">{ev.detalle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
