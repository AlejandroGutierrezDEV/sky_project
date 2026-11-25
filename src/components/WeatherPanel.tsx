import { Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import type { CondicionesMeteo, TemaVisual } from '../types/astronomy';

interface WeatherPanelProps {
  meteo: CondicionesMeteo | null;
  cargando: boolean;
  aviso: string | null;
  tema: TemaVisual;
  claseTarjeta: string;
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

function obtenerEstiloVeredicto(tema: TemaVisual, veredicto: CondicionesMeteo['veredicto']): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-500';
  if (tema === 'claro') return ESTILOS_VEREDICTO_CLARO[veredicto];
  return ESTILOS_VEREDICTO_OSCURO[veredicto];
}

export function WeatherPanel({
  meteo,
  cargando,
  aviso,
  tema,
  claseTarjeta,
}: Readonly<WeatherPanelProps>) {
  const colorBarra =
    tema === 'rojo' ? 'bg-red-600' : tema === 'claro' ? 'bg-sky-600' : 'bg-sky-400';

  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <Cloud className="w-4 h-4" /> Condiciones del Cielo
        </h2>

        {meteo && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${obtenerEstiloVeredicto(
              tema,
              meteo.veredicto
            )}`}
          >
            {meteo.veredicto}
          </span>
        )}
      </div>

      {cargando && <p className="text-xs opacity-70 font-mono">Consultando Open-Meteo...</p>}

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

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs pt-1">
            <div className="p-2 rounded-xl border border-current/15 bg-current/5">
              <Cloud className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.nubesTotal}%</div>
              <div className="text-[10px] opacity-65">Nubes</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5">
              <Wind className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.vientoKmh}</div>
              <div className="text-[10px] opacity-65">km/h</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5">
              <Droplets className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.humedad}%</div>
              <div className="text-[10px] opacity-65">Humedad</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5">
              <Thermometer className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
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
                <div className="w-full h-1.5 rounded-full bg-current/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colorBarra}`}
                    style={{ width: `${capa.valor}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!cargando && aviso && <p className="text-xs opacity-70 font-mono">{aviso}</p>}
    </section>
  );
}
