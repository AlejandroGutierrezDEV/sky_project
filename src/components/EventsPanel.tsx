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
          <CalendarClock className="w-4 h-4" /> Próximos Eventos Celestes
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

          return (
            <div
              key={ev.id}
              className="p-3 rounded-xl border border-current/15 bg-current/5 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  {ev.tipo === 'lluvia' ? (
                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'lluvia')}`} />
                  ) : (
                    <Eclipse className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'eclipse')}`} />
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
                  onClick={() => onSeleccionarFecha(ev.fechaPico)}
                  className="inline-flex items-center gap-1 underline decoration-dotted hover:opacity-100 cursor-pointer font-sans font-medium"
                >
                  Ver en mapa <ArrowUpRight className="w-3 h-3" />
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
