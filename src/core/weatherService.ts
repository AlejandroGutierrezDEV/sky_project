import type { CondicionesMeteo, Ubicacion } from '../types/astronomy';
import { esEntradaAstronomicaValida } from './skyCalculator';

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

const CACHE_KEY = 'skyproject_meteo_cache_v2';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function esArrayDeStrings(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string');
}

function esArrayNumerico(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'number' || item === null);
}

function esOpenMeteoHourlyValido(valor: unknown): valor is OpenMeteoHourly {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    esArrayDeStrings(obj.time) &&
    esArrayNumerico(obj.cloud_cover) &&
    esArrayNumerico(obj.cloud_cover_low) &&
    esArrayNumerico(obj.cloud_cover_mid) &&
    esArrayNumerico(obj.cloud_cover_high) &&
    esArrayNumerico(obj.relative_humidity_2m) &&
    esArrayNumerico(obj.wind_speed_10m) &&
    esArrayNumerico(obj.temperature_2m)
  );
}

function leerCacheMeteo(): CacheMeteo | null {
  try {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    if (!cacheRaw) return null;
    const parsed: unknown = JSON.parse(cacheRaw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.claveUbicacion !== 'string' ||
      typeof obj.timestamp !== 'number' ||
      !Number.isFinite(obj.timestamp) ||
      !esOpenMeteoHourlyValido(obj.hourly)
    ) {
      return null;
    }

    return {
      claveUbicacion: obj.claveUbicacion,
      timestamp: obj.timestamp,
      hourly: obj.hourly,
    };
  } catch {
    return null;
  }
}

function guardarCacheMeteo(cache: CacheMeteo): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora errores de cuota o almacenamiento bloqueado
  }
}

function evaluarVeredicto(nubesTotal: number, vientoKmh: number): CondicionesMeteo['veredicto'] {
  if (nubesTotal <= 20 && vientoKmh <= 25) return 'Excelente';
  if (nubesTotal <= 50 && vientoKmh <= 35) return 'Aceptable';
  return 'Desfavorable';
}

function formatearClaveHoraUTC(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const hora = String(fecha.getUTCHours()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${hora}:00`;
}

function extraerDesdeHourly(
  hourly: OpenMeteoHourly,
  fecha: Date,
  esCache: boolean
): CondicionesMeteo | null {
  const claveHora = formatearClaveHoraUTC(fecha);
  const idx = hourly.time.indexOf(claveHora);
  if (idx === -1) return null;

  const nubesTotal = Math.round(hourly.cloud_cover[idx] ?? 0);
  const vientoKmh = Math.round(hourly.wind_speed_10m[idx] ?? 0);

  return {
    horaPronostico: `${claveHora.replace('T', ' ')} UTC`,
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
  ubicacion: Ubicacion,
  signal?: AbortSignal
): Promise<{ datos: CondicionesMeteo | null; aviso: string | null }> {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) {
    return { datos: null, aviso: 'Fecha o coordenadas inválidas.' };
  }

  const claveUbicacion = `${ubicacion.latitud.toFixed(2)},${ubicacion.longitud.toFixed(2)}`;
  const cache = leerCacheMeteo();

  const cacheValida =
    cache !== null &&
    cache.claveUbicacion === claveUbicacion &&
    Date.now() - cache.timestamp < CACHE_TTL_MS;

  if (cacheValida) {
    const datos = extraerDesdeHourly(cache.hourly, fecha, true);
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
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('forecast_days', '14');

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error('Error HTTP Open-Meteo');

    const json: unknown = await res.json();
    const hourly =
      typeof json === 'object' && json !== null
        ? (json as Record<string, unknown>).hourly
        : null;

    if (!esOpenMeteoHourlyValido(hourly)) {
      throw new Error('Respuesta meteorológica con formato inesperado');
    }

    const nuevoCache: CacheMeteo = {
      claveUbicacion,
      timestamp: Date.now(),
      hourly,
    };
    guardarCacheMeteo(nuevoCache);

    const datos = extraerDesdeHourly(hourly, fecha, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

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
