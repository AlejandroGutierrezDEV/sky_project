import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Clock,
  Download,
  LocateFixed,
  Printer,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CategoriaAstroObjetivo,
  EstadoVisibilidadObjetivo,
  MetadatosExportacionSesion,
  ObjetivoPlanificado,
  TemaVisual,
} from '../types/astronomy';
import {
  descargarSesionMarkdown,
  formatearDec,
  formatearEtiquetaCulminacionEnZona,
  formatearRA,
  imprimirHojaObservacionPDF,
} from '../utils/exportarSesion';
import { normalizarZonaHoraria, obtenerClaveDiaCivil } from '../utils/lunarCalculations';
import { MAX_LONGITUD_NOTA } from '../hooks/usePlanificadorSesion';

interface PlanificadorSesionModalProps {
  tema: TemaVisual;
  objetivos: ObjetivoPlanificado[];
  metadatos: MetadatosExportacionSesion;
  onMarcarObservado: (id: string) => void;
  onActualizarNota: (id: string, texto: string) => void;
  onEliminarObjetivo: (objetivo: ObjetivoPlanificado) => void;
  onLimpiarSesion: () => void;
  onLocalizarEnMapa?: (objetivo: ObjetivoPlanificado) => void;
  onCerrar: () => void;
}

interface HojaImpresionSesionProps {
  objetivos: ObjetivoPlanificado[];
  metadatos: MetadatosExportacionSesion;
}

const ETIQUETA_CATEGORIA: Readonly<Record<CategoriaAstroObjetivo, string>> = {
  messier: 'Messier',
  estrella: 'Estrella',
  planeta: 'Planeta',
};

const CLASE_PANEL_MODAL: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-950/95 border-cyan-400/25 text-slate-100 shadow-2xl shadow-black/80',
  claro: 'bg-slate-50 border-slate-300 text-slate-900 shadow-2xl shadow-slate-900/20',
  rojo: 'bg-black border-red-800 text-red-500 shadow-2xl shadow-black',
};

const CLASE_ACENTO: Record<TemaVisual, string> = {
  oscuro: 'text-cyan-300',
  claro: 'text-sky-700',
  rojo: 'text-red-500',
};

const CLASE_BARRA_PROGRESO: Record<TemaVisual, string> = {
  oscuro: 'bg-cyan-400',
  claro: 'bg-sky-600',
  rojo: 'bg-red-600',
};

function obtenerClaseBotonPrimario(tema: TemaVisual): string {
  if (tema === 'rojo') {
    return 'border-red-600 bg-red-950/80 text-red-300 hover:bg-red-950';
  }
  if (tema === 'claro') {
    return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
  }
  return 'border-cyan-400/50 bg-cyan-600/90 text-white hover:bg-cyan-500';
}

function obtenerClaseBotonSecundario(tema: TemaVisual): string {
  if (tema === 'rojo') {
    return 'border-red-800 bg-black text-red-400 hover:bg-red-950/60';
  }
  if (tema === 'claro') {
    return 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100';
  }
  return 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800';
}

function obtenerClaseBotonPeligro(tema: TemaVisual, confirmando: boolean): string {
  if (confirmando) {
    if (tema === 'rojo') return 'border-red-500 bg-red-950 text-red-200 hover:bg-red-900/80';
    if (tema === 'claro') return 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700';
    return 'border-rose-500 bg-rose-600 text-white hover:bg-rose-500';
  }
  if (tema === 'rojo') return 'border-red-800/80 text-red-400 hover:bg-red-950/60';
  if (tema === 'claro') return 'border-rose-300 text-rose-700 hover:bg-rose-50';
  return 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15';
}

function obtenerClaseInsigniaVisibilidad(
  tema: TemaVisual,
  estado: EstadoVisibilidadObjetivo
): string {
  if (tema === 'rojo') {
    if (estado === 'optimo_noche') return 'border-red-600 bg-red-950/70 text-red-300';
    if (estado === 'visible_parcial') return 'border-red-800 bg-red-950/35 text-red-400';
    return 'border-red-900/80 bg-black text-red-600';
  }

  if (tema === 'claro') {
    if (estado === 'optimo_noche') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    if (estado === 'visible_parcial') return 'border-amber-300 bg-amber-50 text-amber-800';
    return 'border-rose-300 bg-rose-50 text-rose-800';
  }

  if (estado === 'optimo_noche') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  if (estado === 'visible_parcial') return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
  return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
}

function obtenerTextoEstadoVisibilidad(estado: EstadoVisibilidadObjetivo): string {
  if (estado === 'optimo_noche') return 'Óptimo esta noche';
  if (estado === 'visible_parcial') return 'Culminación diurna';
  return 'No sale';
}

function formatearFechaEncabezado(fecha: Date, timezone: string): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const tzSegura = normalizarZonaHoraria(timezone);
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long',
      timeZone: tzSegura,
    }).format(valida);
  } catch {
    return obtenerClaveDiaCivil(valida, tzSegura);
  }
}

export function PlanificadorSesionModal({
  tema,
  objetivos,
  metadatos,
  onMarcarObservado,
  onActualizarNota,
  onEliminarObjetivo,
  onLimpiarSesion,
  onLocalizarEnMapa,
  onCerrar,
}: PlanificadorSesionModalProps) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null);
  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false);
  const timeoutConfirmarRef = useRef<number | null>(null);

  const total = objetivos.length;
  const observados = objetivos.filter((o) => o.observado).length;
  const porcentaje = total > 0 ? Math.round((observados / total) * 100) : 0;

  useEffect(() => {
    botonCerrarRef.current?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const manejarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    };

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', manejarTecla);
      if (timeoutConfirmarRef.current !== null) {
        window.clearTimeout(timeoutConfirmarRef.current);
      }
    };
  }, [onCerrar]);

  const manejarClickLimpiar = () => {
    if (!confirmandoLimpiar) {
      setConfirmandoLimpiar(true);
      if (timeoutConfirmarRef.current !== null) {
        window.clearTimeout(timeoutConfirmarRef.current);
      }
      timeoutConfirmarRef.current = window.setTimeout(() => {
        setConfirmandoLimpiar(false);
        timeoutConfirmarRef.current = null;
      }, 3000);
      return;
    }

    if (timeoutConfirmarRef.current !== null) {
      window.clearTimeout(timeoutConfirmarRef.current);
      timeoutConfirmarRef.current = null;
    }
    setConfirmandoLimpiar(false);
    onLimpiarSesion();
  };

  const claseAcento = CLASE_ACENTO[tema];
  const claseEsquemaInput = tema !== 'claro' ? '[color-scheme:dark]' : '';

  return (
    <div
      className="no-imprimir fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onCerrar();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className={`hud-esquinas hud-${tema} relative w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-3xl border overflow-hidden ${CLASE_PANEL_MODAL[tema]}`}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-6 pb-4 border-b border-current/15 shrink-0 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-[0.25em] font-mono ${claseAcento}`}>
                Hoja de campo offline
              </p>
              <h2
                id={idTitulo}
                className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 mt-0.5"
              >
                <ClipboardList className={`w-5 h-5 shrink-0 ${claseAcento}`} aria-hidden="true" />
                Planificador de sesión nocturna
              </h2>
              <p id={idDescripcion} className="text-xs opacity-75 mt-1">
                Objetivos ordenados automáticamente por su hora óptima de culminación meridiana.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] font-mono opacity-80">
                <span>{metadatos.ubicacionNombre}</span>
                <span aria-hidden="true">·</span>
                <span>{formatearFechaEncabezado(metadatos.fecha, metadatos.timezone)}</span>
                <span aria-hidden="true">·</span>
                <span>Bortle {metadatos.bortle}</span>
                <span aria-hidden="true">·</span>
                <span>{metadatos.faseLunar}</span>
              </div>
            </div>

            <button
              ref={botonCerrarRef}
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar el planificador de sesión nocturna"
              className="grid place-items-center min-w-11 min-h-11 rounded-xl border border-current/25 hover:bg-current/10 cursor-pointer shrink-0 transition-colors motion-reduce:transition-none"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Barra de progreso y acciones de exportación */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-52 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span>
                  Progreso: <strong>{observados}</strong> de <strong>{total}</strong> observados
                </span>
                <span className="opacity-75">{porcentaje}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Progreso de objetivos observados"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, total)}
                aria-valuenow={observados}
                className="h-2 rounded-full bg-current/15 overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${CLASE_BARRA_PROGRESO[tema]}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={total === 0}
                onClick={() => descargarSesionMarkdown(objetivos, metadatos, metadatos.timezone)}
                className={`inline-flex items-center gap-1.5 px-3 min-h-10 sm:min-h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed ${obtenerClaseBotonPrimario(
                  tema
                )}`}
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Descargar .MD
              </button>
              <button
                type="button"
                disabled={total === 0}
                onClick={imprimirHojaObservacionPDF}
                className={`inline-flex items-center gap-1.5 px-3 min-h-10 sm:min-h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed ${obtenerClaseBotonSecundario(
                  tema
                )}`}
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Guardar PDF
              </button>
              {total > 0 && (
                <button
                  type="button"
                  onClick={manejarClickLimpiar}
                  aria-label={
                    confirmandoLimpiar
                      ? 'Confirmar vaciado de todos los objetivos de la sesión'
                      : 'Vaciar lista de objetivos de la sesión'
                  }
                  className={`inline-flex items-center gap-1.5 px-3 min-h-10 sm:min-h-9 rounded-xl border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonPeligro(
                    tema,
                    confirmandoLimpiar
                  )}`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {confirmandoLimpiar ? '¿Confirmar?' : 'Vaciar'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de objetivos o estado vacío */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
          {total === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-current/25 bg-current/5 space-y-3">
              <Sparkles className={`w-8 h-8 mx-auto opacity-80 ${claseAcento}`} aria-hidden="true" />
              <div className="space-y-1 max-w-md mx-auto">
                <p className="font-display font-semibold text-base">
                  Tu hoja de observación está vacía
                </p>
                <p className="text-xs opacity-75 leading-relaxed">
                  Selecciona cualquier objeto Messier, estrella o planeta en el mapa celeste, en el
                  buscador o en el panel del Sistema Solar y pulsa{' '}
                  <strong>«Objetivo esta noche»</strong> para planificar su hora óptima de tránsito.
                </p>
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {objetivos.map((obj) => {
                const esNuncaSale = obj.estadoVisibilidad === 'nunca_sale';
                const tituloPrincipal =
                  obj.nombre.toLowerCase() === obj.codigo.toLowerCase()
                    ? obj.nombre
                    : `${obj.codigo} · ${obj.nombre}`;

                return (
                  <li
                    key={obj.id}
                    className={`rounded-2xl border p-3.5 sm:p-4 transition-colors motion-reduce:transition-none ${
                      esNuncaSale
                        ? 'border-current/20 opacity-75 bg-current/5'
                        : obj.observado
                          ? 'border-current/20 bg-current/5'
                          : 'border-current/25 bg-current/[0.03]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Casilla observado */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={obj.observado}
                        aria-label={`Marcar ${tituloPrincipal} como ${
                          obj.observado ? 'pendiente' : 'observado'
                        }`}
                        onClick={() => onMarcarObservado(obj.id)}
                        className={`mt-0.5 grid place-items-center min-w-10 min-h-10 sm:min-w-8 sm:min-h-8 rounded-lg border cursor-pointer shrink-0 transition-colors motion-reduce:transition-none ${
                          obj.observado
                            ? obtenerClaseBotonPrimario(tema)
                            : 'border-current/35 hover:bg-current/10'
                        }`}
                      >
                        {obj.observado && <Check className="w-4 h-4" aria-hidden="true" />}
                      </button>

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-display font-bold text-sm sm:text-base ${
                                  obj.observado ? 'line-through opacity-65' : ''
                                }`}
                              >
                                {tituloPrincipal}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/25 opacity-80">
                                {ETIQUETA_CATEGORIA[obj.categoria]}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono opacity-75 mt-0.5">
                              <span>{obj.constelacion || '—'}</span>
                              <span>Mag {obj.magnitud.toFixed(1)}</span>
                              <span>AR {formatearRA(obj.raHoras)}</span>
                              <span>Dec {formatearDec(obj.decGrados)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onLocalizarEnMapa && !esNuncaSale && (
                              <button
                                type="button"
                                onClick={() => {
                                  onLocalizarEnMapa(obj);
                                  onCerrar();
                                }}
                                aria-label={`Localizar ${tituloPrincipal} en el mapa celeste`}
                                title="Localizar en el mapa celeste"
                                className="grid place-items-center min-w-9 min-h-9 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer transition-colors motion-reduce:transition-none"
                              >
                                <LocateFixed className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEliminarObjetivo(obj)}
                              aria-label={`Quitar ${tituloPrincipal} de la sesión`}
                              title="Quitar de la sesión"
                              className="grid place-items-center min-w-9 min-h-9 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer opacity-75 hover:opacity-100 transition-colors motion-reduce:transition-none"
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Etiqueta horaria de culminación */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border ${obtenerClaseInsigniaVisibilidad(
                              tema,
                              obj.estadoVisibilidad
                            )}`}
                          >
                            {esNuncaSale ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <span className="font-semibold">
                              {obtenerTextoEstadoVisibilidad(obj.estadoVisibilidad)}:
                            </span>
                            <span>{obj.etiquetaHoraria}</span>
                          </span>
                        </div>

                        {/* Campo breve de notas */}
                        <div>
                          <input
                            type="text"
                            maxLength={MAX_LONGITUD_NOTA}
                            value={obj.notas ?? ''}
                            onChange={(e) => onActualizarNota(obj.id, e.target.value)}
                            aria-label={`Notas de observación para ${tituloPrincipal}`}
                            placeholder="Notas de campo (ocular, filtro, transparencia, dibujo...)"
                            className={`w-full min-h-9 px-3 py-1.5 rounded-lg border border-current/20 bg-transparent text-xs placeholder:opacity-50 focus:outline-none focus:border-current/60 ${claseEsquemaInput}`}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Vista dedicada para exportación PDF mediante `@media print` y `window.print()`.
 * Permanece oculta en pantalla y se renderiza en alto contraste vectorial al imprimir.
 */
export function HojaImpresionSesion({ objetivos, metadatos }: HojaImpresionSesionProps) {
  const observados = objetivos.filter((o) => o.observado).length;

  return (
    <section
      aria-label="Hoja de observación nocturna imprimible"
      className="hoja-impresion-sesion"
    >
      <header className="hoja-impresion-cabecera">
        <div>
          <h1>Hoja de Observación Nocturna — SkyProject</h1>
          <p className="hoja-impresion-subtitulo">
            Lista ordenada por culminación meridiana para trabajo de campo sin conexión
          </p>
        </div>
        <div className="hoja-impresion-progreso">
          Progreso: {observados} / {objetivos.length}
        </div>
      </header>

      <dl className="hoja-impresion-metadatos">
        <div>
          <dt>Fecha</dt>
          <dd>{formatearFechaEncabezado(metadatos.fecha, metadatos.timezone)}</dd>
        </div>
        <div>
          <dt>Ubicación</dt>
          <dd>{metadatos.ubicacionNombre || 'Observatorio sin nombre'}</dd>
        </div>
        <div>
          <dt>Cielo (Bortle)</dt>
          <dd>Escala Bortle {metadatos.bortle}</dd>
        </div>
        <div>
          <dt>Fase lunar</dt>
          <dd>{metadatos.faseLunar || 'Sin datos'}</dd>
        </div>
      </dl>

      {objetivos.length === 0 ? (
        <p className="hoja-impresion-vacia">
          No hay objetivos seleccionados en esta sesión nocturna.
        </p>
      ) : (
        <table className="hoja-impresion-tabla">
          <thead>
            <tr>
              <th scope="col" className="col-check">
                Obs.
              </th>
              <th scope="col">Astro</th>
              <th scope="col">Cat.</th>
              <th scope="col">Constelación</th>
              <th scope="col" className="col-num">
                Mag
              </th>
              <th scope="col">Coordenadas (AR / Dec)</th>
              <th scope="col">Hora óptima / Culminación</th>
              <th scope="col">Notas de campo</th>
            </tr>
          </thead>
          <tbody>
            {objetivos.map((obj) => {
              const tituloPrincipal =
                obj.nombre.toLowerCase() === obj.codigo.toLowerCase()
                  ? obj.nombre
                  : `${obj.codigo} · ${obj.nombre}`;
              return (
                <tr key={obj.id}>
                  <td className="col-check">{obj.observado ? '☑' : '☐'}</td>
                  <td className="col-astro">{tituloPrincipal}</td>
                  <td>{ETIQUETA_CATEGORIA[obj.categoria]}</td>
                  <td>{obj.constelacion || '—'}</td>
                  <td className="col-num">{obj.magnitud.toFixed(1)}</td>
                  <td className="col-mono">
                    {formatearRA(obj.raHoras)} / {formatearDec(obj.decGrados)}
                  </td>
                  <td>{formatearEtiquetaCulminacionEnZona(obj, metadatos.timezone)}</td>
                  <td>{obj.notas && obj.notas.trim().length > 0 ? obj.notas : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
