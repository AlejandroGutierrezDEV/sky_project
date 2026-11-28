import type { KeyboardEvent } from 'react';
import { AlertTriangle, Compass, Loader2, Navigation, Radio, Sliders } from 'lucide-react';
import { useCompass } from '../../hooks/useCompass';
import type { TemaVisual } from '../../types/astronomy';

interface CompassWidgetProps {
  tema?: TemaVisual;
  claseTarjeta?: string;
}

const ACCESOS_CARDINALES: readonly { etiqueta: 'N' | 'E' | 'S' | 'O'; grados: number; nombre: string }[] = [
  { etiqueta: 'N', grados: 0, nombre: 'Norte (0°)' },
  { etiqueta: 'E', grados: 90, nombre: 'Este (90°)' },
  { etiqueta: 'S', grados: 180, nombre: 'Sur (180°)' },
  { etiqueta: 'O', grados: 270, nombre: 'Oeste (270°)' },
];

const MARCAS_GRADOS: readonly number[] = Array.from({ length: 24 }, (_, indice) => indice * 15);

const CARDINALES_SECUNDARIOS: readonly { etiqueta: string; grados: number }[] = [
  { etiqueta: 'NE', grados: 45 },
  { etiqueta: 'SE', grados: 135 },
  { etiqueta: 'SO', grados: 225 },
  { etiqueta: 'NO', grados: 315 },
];

function obtenerClaseTarjetaPorDefecto(tema: TemaVisual): string {
  if (tema === 'rojo') return 'hud-esquinas hud-rojo bg-black/90 border-red-900/70 text-red-500';
  if (tema === 'claro') return 'hud-esquinas hud-claro bg-slate-50/92 border-slate-300 text-slate-900 shadow-md';
  return 'hud-esquinas hud-oscuro bg-slate-900/55 backdrop-blur-md border-cyan-400/15 text-slate-100';
}

function obtenerColorAcentoNorte(tema: TemaVisual): string {
  if (tema === 'rojo') return '#ef4444';
  if (tema === 'claro') return '#0369a1';
  return '#22d3ee';
}

function obtenerClaseBotonPrimario(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/75 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  return 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30';
}

function obtenerClaseInsigniaVivo(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600/80 bg-red-950/50 text-red-400';
  if (tema === 'claro') return 'border-emerald-400 bg-emerald-50 text-emerald-800';
  return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300';
}

function obtenerClaseAvisoCalibracion(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-700/80 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-amber-400 bg-amber-50 text-amber-900';
  return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
}

function obtenerClaseError(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-400';
  if (tema === 'claro') return 'border-rose-400 bg-rose-50 text-rose-800';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function obtenerClaseBotonCardinal(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:bg-current/10';
  if (tema === 'rojo') return 'border-red-500 bg-red-950 text-red-300 font-bold';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white font-bold';
  return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 font-bold';
}

function formatearGrados(heading: number): string {
  const redondeado = Math.round(heading) % 360;
  return String(redondeado < 0 ? redondeado + 360 : redondeado).padStart(3, '0');
}

export function CompassWidget({ tema = 'oscuro', claseTarjeta }: CompassWidgetProps) {
  const {
    heading,
    cumulativeRotation,
    cardinal,
    mode,
    sensorStatus,
    accuracy,
    needsCalibration,
    error,
    requestSensorAccess,
    setManualHeading,
    setMode,
  } = useCompass();

  const gradosRedondeados = Math.round(heading) % 360;
  const gradosFormateados = formatearGrados(heading);
  const colorNorte = obtenerColorAcentoNorte(tema);
  const tarjetaClase = claseTarjeta ?? obtenerClaseTarjetaPorDefecto(tema);
  const puedeAlternarModo = sensorStatus === 'active';
  const mostrarControlManual =
    mode === 'manual' ||
    sensorStatus === 'unsupported' ||
    sensorStatus === 'denied' ||
    sensorStatus === 'error';

  const manejarTecladoDial = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') {
      return;
    }
    evento.preventDefault();
    const paso = evento.shiftKey ? 10 : 1;
    const delta = evento.key === 'ArrowRight' ? paso : -paso;
    setManualHeading(heading + delta);
  };

  return (
    <section
      aria-labelledby="compass-heading"
      className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${tarjetaClase}`}
    >
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 opacity-85 shrink-0" aria-hidden="true" />
          <h2 id="compass-heading" className="font-semibold text-sm uppercase tracking-wider opacity-85">
            Brújula Astronómica
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'sensor' && sensorStatus === 'active' && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono ${obtenerClaseInsigniaVivo(
                tema
              )}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-current motion-safe:animate-pulse"
                aria-hidden="true"
              />
              Sensor en vivo
            </span>
          )}

          {puedeAlternarModo && (
            <div
              role="group"
              aria-label="Modo de brújula"
              className="inline-flex items-center rounded-lg border border-current/25 p-0.5 text-[11px]"
            >
              <button
                type="button"
                onClick={() => setMode('sensor')}
                aria-pressed={mode === 'sensor'}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors motion-reduce:transition-none ${
                  mode === 'sensor' ? obtenerClaseBotonCardinal(tema, true) : 'opacity-75 hover:opacity-100'
                }`}
              >
                Sensor
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                aria-pressed={mode === 'manual'}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors motion-reduce:transition-none ${
                  mode === 'manual' ? obtenerClaseBotonCardinal(tema, true) : 'opacity-75 hover:opacity-100'
                }`}
              >
                Manual
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cuerpo principal: Dial + Lectura */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Dial SVG interactivo */}
        <figure
          role="img"
          aria-label={`Brújula apuntando a ${gradosFormateados} grados ${cardinal}`}
          className="relative shrink-0 w-44 h-44 sm:w-48 sm:h-48 select-none"
        >
          {/* Indicador fijo superior (rumbo actual) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 pointer-events-none"
            aria-hidden="true"
          >
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
              <path d="M7 12L1 1H13L7 12Z" fill={colorNorte} />
            </svg>
          </div>

          <div
            tabIndex={0}
            onKeyDown={manejarTecladoDial}
            aria-label="Dial de brújula. Usa las flechas izquierda y derecha para ajustar el rumbo manualmente."
            className="w-full h-full rounded-full border border-current/25 bg-current/5 p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg
              viewBox="0 0 200 200"
              className={`w-full h-full ${
                mode === 'manual'
                  ? 'transition-transform duration-200 ease-out motion-reduce:transition-none'
                  : ''
              }`}
              style={{ transform: `rotate(${-cumulativeRotation}deg)` }}
              aria-hidden="true"
            >
              {/* Anillos concéntricos */}
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.28"
                strokeWidth="1.5"
              />
              <circle
                cx="100"
                cy="100"
                r="62"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.14"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Marcas de grados cada 15° */}
              {MARCAS_GRADOS.map((angulo) => {
                const esPrincipal = angulo % 90 === 0;
                const esSecundario = angulo % 45 === 0 && !esPrincipal;
                const yInicio = esPrincipal ? 10 : esSecundario ? 13 : 16;
                return (
                  <line
                    key={angulo}
                    x1="100"
                    y1={yInicio}
                    x2="100"
                    y2="22"
                    stroke={angulo === 0 ? colorNorte : 'currentColor'}
                    strokeOpacity={angulo === 0 ? 1 : esPrincipal ? 0.85 : esSecundario ? 0.55 : 0.3}
                    strokeWidth={esPrincipal ? 2.2 : 1.2}
                    strokeLinecap="round"
                    transform={`rotate(${angulo} 100 100)`}
                  />
                );
              })}

              {/* Rosa de los vientos central */}
              <polygon points="100,46 108,100 100,92 92,100" fill={colorNorte} fillOpacity="0.9" />
              <polygon
                points="100,154 108,100 100,108 92,100"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <circle cx="100" cy="100" r="4.5" fill="currentColor" />

              {/* Puntos cardinales principales */}
              <text
                x="100"
                y="38"
                textAnchor="middle"
                fill={colorNorte}
                fontSize="16"
                fontWeight="700"
                fontFamily="var(--font-display)"
              >
                N
              </text>
              <text
                x="166"
                y="105"
                textAnchor="middle"
                fill="currentColor"
                fillOpacity="0.85"
                fontSize="13"
                fontWeight="600"
                fontFamily="var(--font-display)"
              >
                E
              </text>
              <text
                x="100"
                y="174"
                textAnchor="middle"
                fill="currentColor"
                fillOpacity="0.85"
                fontSize="13"
                fontWeight="600"
                fontFamily="var(--font-display)"
              >
                S
              </text>
              <text
                x="34"
                y="105"
                textAnchor="middle"
                fill="currentColor"
                fillOpacity="0.85"
                fontSize="13"
                fontWeight="600"
                fontFamily="var(--font-display)"
              >
                O
              </text>

              {/* Puntos cardinales secundarios */}
              {CARDINALES_SECUNDARIOS.map(({ etiqueta, grados }) => {
                const rad = ((grados - 90) * Math.PI) / 180;
                const x = 100 + Math.cos(rad) * 66;
                const y = 100 + Math.sin(rad) * 66 + 3.5;
                return (
                  <text
                    key={etiqueta}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="currentColor"
                    fillOpacity="0.55"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                  >
                    {etiqueta}
                  </text>
                );
              })}
            </svg>
          </div>
        </figure>

        {/* Panel derecho: lectura numérica + acciones según estado */}
        <div className="flex-1 w-full space-y-3">
          {/* Lectura numérica accesible */}
          <div className="flex items-baseline justify-between gap-3 border-b border-current/15 pb-2.5">
            <div aria-live="polite" aria-atomic="true" className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums">
                {gradosFormateados}°
              </span>
              <span className="font-display text-lg font-semibold opacity-85">{cardinal}</span>
            </div>

            <span className="text-[11px] font-mono opacity-70 inline-flex items-center gap-1">
              {mode === 'sensor' ? (
                <>
                  <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                  {accuracy !== null ? `±${Math.round(accuracy)}°` : 'Magnetómetro'}
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                  Modo manual
                </>
              )}
            </span>
          </div>

          {/* Estado: Idle o Solicitando permiso (iOS 13+ / activación manual) */}
          {(sensorStatus === 'idle' || sensorStatus === 'requesting') && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  void requestSensorAccess();
                }}
                disabled={sensorStatus === 'requesting'}
                className={`w-full min-h-10 px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-60 disabled:cursor-wait ${obtenerClaseBotonPrimario(
                  tema
                )}`}
              >
                {sensorStatus === 'requesting' ? (
                  <>
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
                    Solicitando permiso de sensores...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    Activar sensores de brújula
                  </>
                )}
              </button>
            </div>
          )}

          {/* Aviso de calibración si accuracy > 25° */}
          {mode === 'sensor' && sensorStatus === 'active' && needsCalibration && (
            <p
              role="status"
              className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-2 ${obtenerClaseAvisoCalibracion(
                tema
              )}`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Mueve el dispositivo en forma de 8 para calibrar</span>
            </p>
          )}

          {/* Estado: Denegado o Error */}
          {(sensorStatus === 'denied' || sensorStatus === 'error') && (
            <div role="alert" className={`text-xs px-3 py-2.5 rounded-xl border space-y-2 ${obtenerClaseError(tema)}`}>
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {error ??
                    'No se pudo activar el sensor de orientación. Usa el control manual disponible debajo.'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  void requestSensorAccess();
                }}
                className="min-h-8 px-2.5 py-1 rounded-lg border border-current/40 hover:bg-current/10 text-[11px] font-medium cursor-pointer"
              >
                Reintentar sensores
              </button>
            </div>
          )}

          {/* Fallback Escritorio / Control Manual */}
          {mostrarControlManual && (
            <div className="space-y-2.5 pt-1">
              {sensorStatus === 'unsupported' && (
                <p className="text-[11px] opacity-75">
                  Sensores de orientación no detectados en este dispositivo. Control manual activo.
                </p>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] opacity-75">
                  <label htmlFor="compass-manual-slider" className="font-medium">
                    Azimut manual
                  </label>
                  <span className="font-mono">0° – 359°</span>
                </div>
                <input
                  id="compass-manual-slider"
                  type="range"
                  min={0}
                  max={359}
                  step={1}
                  value={gradosRedondeados}
                  onChange={(evento) => setManualHeading(Number(evento.target.value))}
                  aria-label="Ajustar azimut manualmente"
                  className="rango-hud"
                />
              </div>

              {/* Accesos rápidos N / E / S / O */}
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Puntos cardinales rápidos">
                {ACCESOS_CARDINALES.map(({ etiqueta, grados, nombre }) => {
                  const activo = gradosRedondeados === grados;
                  return (
                    <button
                      key={etiqueta}
                      type="button"
                      onClick={() => setManualHeading(grados)}
                      aria-label={`Apuntar al ${nombre}`}
                      aria-pressed={activo}
                      className={`min-h-10 rounded-xl border text-xs font-mono cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonCardinal(
                        tema,
                        activo
                      )}`}
                    >
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
