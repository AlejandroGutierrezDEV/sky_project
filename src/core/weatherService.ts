import type { CondicionesMeteo, Ubicacion } from '../types/astronomy';

interface OpenMeteoHourly {
  time: string[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  temperature_2m: number[];
}

interface CacheMeteo {
  claveUbicacion: string;
  timestamp: number;
  hourly: OpenMeteoHourly;
}

const CACHE_KEY = 'skyproject_meteo_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function evaluarVeredicto(nubesTotal: number, vientoKmh: number): CondicionesMeteo['veredicto'] {
  if (nubesTotal <= 20 && vientoKmh <= 25) return 'Excelente';
  if (nubesTotal <= 50 && vientoKmh <= 35) return 'Aceptable';
  return 'Desfavorable';
}

function formatearClaveHora(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${hora}:00`;
}

function extraerDesdeHourly(
  hourly: OpenMeteoHourly,
  fecha: Date,
  esCache: boolean
): CondicionesMeteo | null {
  const claveHora = formatearClaveHora(fecha);
  const idx = hourly.time.indexOf(claveHora);
  if (idx === -1) return null;

  const nubesTotal = Math.round(hourly.cloud_cover[idx] ?? 0);
  const vientoKmh = Math.round(hourly.wind_speed_10m[idx] ?? 0);

  return {
    horaPronostico: claveHora.replace('T', ' '),
    nubesTotal,
    nubesBajas: Math.round(hourly.cloud_cover_low[idx] ?? 0),
    nubesMedias: Math.round(hourly.cloud_cover_mid[idx] ?? 0),
    nubesAltas: Math.round(hourly.cloud_cover_high[idx] ?? 0),
    humedad: Math.round(hourly.relative_humidity_2m[idx] ?? 0),
    vientoKmh,
    temperatura: Number((hourly.temperature_2m[idx] ?? 0).toFixed(1)),
    veredicto: evaluarVeredicto(nubesTotal, vientoKmh),
    esCache,
  };
}

export async function obtenerCondicionesMeteo(
  fecha: Date,
  ubicacion: Ubicacion
): Promise<{ datos: CondicionesMeteo | null; aviso: string | null }> {
  const claveUbicacion = `${ubicacion.latitud.toFixed(2)},${ubicacion.longitud.toFixed(2)}`;
  const cacheRaw = localStorage.getItem(CACHE_KEY);
  const cache: CacheMeteo | null = cacheRaw ? JSON.parse(cacheRaw) : null;

  const cacheValida =
    cache &&
    cache.claveUbicacion === claveUbicacion &&
    Date.now() - cache.timestamp < CACHE_TTL_MS;

  if (cacheValida) {
    const datos = extraerDesdeHourly(cache.hourly, fecha, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(ubicacion.latitud));
    url.searchParams.set('longitude', String(ubicacion.longitud));
    url.searchParams.set(
      'hourly',
      'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_speed_10m,temperature_2m'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '14');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Error HTTP Open-Meteo');

    const json = await res.json();
    const nuevoCache: CacheMeteo = {
      claveUbicacion,
      timestamp: Date.now(),
      hourly: json.hourly,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(nuevoCache));

    const datos = extraerDesdeHourly(json.hourly, fecha, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch {
    if (cache && cache.claveUbicacion === claveUbicacion) {
      const datos = extraerDesdeHourly(cache.hourly, fecha, true);
      return {
        datos,
        aviso: datos ? 'Sin conexión: mostrando datos guardados en caché.' : 'Sin conexión.',
      };
    }
    return { datos: null, aviso: 'No se pudo obtener la previsión meteorológica.' };
  }
}