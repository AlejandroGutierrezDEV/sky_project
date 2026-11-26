import { Cloud, Droplets, Eye, Moon, Sun, Thermometer, Wind } from 'lucide-react';
import type {
  CalidadCieloCalculada,
  CondicionesMeteo,
  EscalaBortle,
  TemaVisual,
} from '../types/astronomy';

interface WeatherPanelProps {
  meteo: CondicionesMeteo | null;
  cargando: boolean;
  aviso: string | null;
  tema: TemaVisual;
  claseTarjeta: string;
  onSeleccionarHora: (fecha: Date) => void;
  calidadCielo?: CalidadCieloCalculada;
  bortle?: EscalaBortle;
}

const ESTILOS_VEREDICTO_OSCURO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  Aceptable: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  Desfavorable: 'border-rose-500/40 bg-rose-500/15 text-rose-400',
};

const ESTILOS_VEREDICTO_CLARO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'border-emerald-600/40 bg-emerald-500/15 text-emerald-700',
  Aceptable: 'border-amber-600/40 bg-amber-500/15 text-amber-700',
  Desfavorable: 'border-rose-600/40 bg-rose-500/15 text-rose-700',
};

const ESTILOS_CALIDAD_OSCURO: Record<CalidadCieloCalculada['veredicto'], string> = {
  Excelente: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  Bueno: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  Regular: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  Malo: 'border-rose-500/40 bg-rose-500/15 text-rose-400',
};

const ESTILOS_CALIDAD_CLARO: Record<CalidadCieloCalculada['veredicto'], string> = {
  Excelente: 'border-emerald-600/40 bg-emerald-500/15 text-emerald-700',
  Bueno: 'border-sky-600/40 bg-sky-500/15 text-sky-700',
  Regular: 'border-amber-600/40 bg-amber-500/15 text-amber-700',
  Malo: 'border-rose-600/40 bg-rose-500/15 text-rose-700',
};

const ESTILOS_CALIDAD_ROJO: Record<CalidadCieloCalculada['veredicto'], string> = {
  Excelente: 'border-red-600 bg-red-950/60 text-red-400',
  Bueno: 'border-red-700 bg-red-950/45 text-red-500',
  Regular: 'border-red-800 bg-black text-red-500',
  Malo: 'border-red-900 bg-black text-red-600',
};

const COLORES_BARRA_OSCURO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-emerald-400',
  Aceptable: 'bg-amber-400',
  Desfavorable: 'bg-rose-400',
};

const COLORES_BARRA_CLARO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-emerald-600',
  Aceptable: 'bg-amber-500',
  Desfavorable: 'bg-rose-600',
};

const COLORES_BARRA_ROJO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-red-500',
  Aceptable: 'bg-red-700',
  Desfavorable: 'bg-red-900',
};

function obtenerEstiloVeredicto(tema: TemaVisual, veredicto: CondicionesMeteo['veredicto']): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-500';
  if (tema === 'claro') return ESTILOS_VEREDICTO_CLARO[veredicto];
  return ESTILOS_VEREDICTO_OSCURO[veredicto];
}

function obtenerEstiloCalidad(
  tema: TemaVisual,
  veredicto: CalidadCieloCalculada['veredicto']
): string {
  if (tema === 'rojo') return ESTILOS_CALIDAD_ROJO[veredicto];
  if (tema === 'claro') return ESTILOS_CALIDAD_CLARO[veredicto];
  return ESTILOS_CALIDAD_OSCURO[veredicto];
}

function obtenerColorBarraFranja(
  tema: TemaVisual,
  veredicto: CondicionesMeteo['veredicto']
): string {
  if (tema === 'rojo') return COLORES_BARRA_ROJO[veredicto];
  if (tema === 'claro') return COLORES_BARRA_CLARO[veredicto];
  return COLORES_BARRA_OSCURO[veredicto];
}

export function WeatherPanel({
  meteo,
  cargando,
  aviso,
  tema,
  claseTarjeta,
  onSeleccionarHora,
  calidadCielo,
  bortle,
}: Readonly<WeatherPanelProps>) {
  const colorBarra =
    tema === 'rojo' ? 'bg-red-600' : tema === 'claro' ? 'bg-sky-600' : 'bg-sky-400';

  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <Cloud className="w-4 h-4" aria-hidden="true" /> Condiciones del Cielo
        </h2>

        {calidadCielo ? (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${obtenerEstiloCalidad(
              tema,
              calidadCielo.veredicto
            )}`}
          >
            {calidadCielo.veredicto}
          </span>
        ) : (
          meteo && (
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${obtenerEstiloVeredicto(
                tema,
                meteo.veredicto
              )}`}
            >
              {meteo.veredicto}
            </span>
          )
        )}
      </div>

      {calidadCielo && (
        <div className="p-2.5 rounded-xl border border-current/15 bg-current/5 space-y-1.5 text-xs">
          <p className="flex items-start gap-1.5 leading-snug opacity-90">
            <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-75" aria-hidden="true" />
            <span>{calidadCielo.motivoPrincipal}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] opacity-80">
            <span>NELM: {calidadCielo.magnitudLimiteVisible.toFixed(1)} mag</span>
            {bortle !== undefined && <span>Bortle {bortle}</span>}
            <span>
              Luna:{' '}
              {calidadCielo.penalizacionLunar > 0
                ? `-${calidadCielo.penalizacionLunar.toFixed(1)} mag`
                : 'sin penalización'}
            </span>
          </div>
        </div>
      )}

      {cargando && (
        <p role="status" aria-live="polite" className="text-xs opacity-70 font-mono">
          Consultando Open-Meteo...
        </p>
      )}

      {!cargando && meteo && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono opacity-75">
            <span>Pronóstico: {meteo.horaPronostico}</span>
            {meteo.esCache && (
              <span className="px-2 py-0.5 rounded-full border border-current/25">
                Desde caché
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs pt-1">
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Cloud className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.nubesTotal}%</div>
              <div className="text-[10px] opacity-65">Nubes</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Wind className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.vientoKmh}</div>
              <div className="text-[10px] opacity-65">km/h</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Droplets className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.humedad}%</div>
              <div className="text-[10px] opacity-65">Humedad</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Thermometer className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.temperatura}°</div>
              <div className="text-[10px] opacity-65">Temp.</div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono pt-1">
            {[
              { etiqueta: 'Nubes bajas (< 3 km)', valor: meteo.nubesBajas },
              { etiqueta: 'Nubes medias (3-8 km)', valor: meteo.nubesMedias },
              { etiqueta: 'Nubes altas (> 8 km)', valor: meteo.nubesAltas },
            ].map((capa) => (
              <div key={capa.etiqueta} className="space-y-1">
                <div className="flex justify-between opacity-80">
                  <span>{capa.etiqueta}</span>
                  <span>{capa.valor}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={capa.etiqueta}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={capa.valor}
                  className="w-full h-1.5 rounded-full bg-current/15 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all motion-reduce:transition-none ${colorBarra}`}
                    style={{ width: `${capa.valor}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {meteo.proximasHoras.length > 0 && (
            <div className="pt-2 border-t border-current/15 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="uppercase tracking-wider font-semibold opacity-75">
                  Ventana de las próximas 12 h
                </span>
                <span className="opacity-60">Claridad · clic para saltar</span>
              </div>

              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="grid grid-cols-12 gap-1 min-w-[432px] sm:min-w-0">
                  {meteo.proximasHoras.map((franja, indice) => {
                    const claridad = Math.min(100, Math.max(0, 100 - franja.nubesTotal));
                    const colorBarraFranja = obtenerColorBarraFranja(tema, franja.veredicto);
                    const esHoraActual = indice === 0;
                    const claseFranjaActiva = esHoraActual
                      ? 'border-current/40 bg-current/10'
                      : 'border-current/15 bg-current/5 hover:border-current/35 hover:bg-current/10';

                    return (
                      <button
                        key={franja.fechaISO}
                        type="button"
                        onClick={() => {
                          const fecha = new Date(franja.fechaISO);
                          if (!Number.isNaN(fecha.getTime())) {
                            onSeleccionarHora(fecha);
                          }
                        }}
                        title={`${franja.horaLocal} · Claridad ${claridad}% (Nubes ${franja.nubesTotal}%) · Viento ${franja.vientoKmh} km/h · ${franja.veredicto} · ${franja.esNoche ? 'Noche' : 'Día'}`}
                        aria-label={`Ver cielo a las ${franja.horaLocal}, claridad ${claridad}%, ${franja.veredicto}, ${franja.esNoche ? 'noche' : 'día'}`}
                        className={`flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-lg border cursor-pointer transition-colors motion-reduce:transition-none ${claseFranjaActiva}`}
                      >
                        <div className="w-2.5 h-11 rounded-full bg-current/10 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-full transition-all motion-reduce:transition-none ${colorBarraFranja}`}
                            style={{ height: `${claridad}%` }}
                          />
                        </div>
                        {franja.esNoche ? (
                          <Moon className="w-2.5 h-2.5 opacity-75" aria-hidden="true" />
                        ) : (
                          <Sun className="w-2.5 h-2.5 opacity-45" aria-hidden="true" />
                        )}
                        <span className="text-[9px] font-mono leading-none opacity-80">
                          {franja.horaLocal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!cargando && aviso && (
        <p role="status" aria-live="polite" className="text-xs opacity-70 font-mono">
          {aviso}
        </p>
      )}
    </section>
  );
}
