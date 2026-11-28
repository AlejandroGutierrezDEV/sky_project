import type { CondicionesMeteo, FranjaHorariaMeteo, Ubicacion } from '../types/astronomy';
import { calcularEstadoSolar, esEntradaAstronomicaValida } from './skyCalculator';
import { formatearHoraEnZona, normalizarZonaHoraria } from '../utils/lunarCalculations';

interface OpenMeteoHourly {
  time: string[];
  cloud_cover: (number | null)[];
  cloud_cover_low: (number | null)[];
  cloud_cover_mid: (number | null)[];
  cloud_cover_high: (number | null)[];
  relative_humidity_2m: (number | null)[];
  wind_speed_10m: (number | null)[];
  temperature_2m: (number | null)[];
}

interface EntradaCacheMeteo {
  timestamp: number;
  ultimoAcceso: number;
  hourly: OpenMeteoHourly;
}

type DiccionarioCacheMeteo = Record<string, EntradaCacheMeteo>;

const CACHE_KEY = 'skyproject_meteo_cache_v3';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const MAX_CACHE_UBICACIONES = 5;

function esArrayDeStrings(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string');
}

function esArrayNumerico(valor: unknown): valor is (number | null)[] {
  return (
    Array.isArray(valor) &&
    valor.every((item) => (typeof item === 'number' && Number.isFinite(item)) || item === null)
  );
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

function esEntradaCacheMeteoValida(valor: unknown): valor is EntradaCacheMeteo {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    typeof obj.timestamp === 'number' &&
    Number.isFinite(obj.timestamp) &&
    typeof obj.ultimoAcceso === 'number' &&
    Number.isFinite(obj.ultimoAcceso) &&
    esOpenMeteoHourlyValido(obj.hourly)
  );
}

function leerDiccionarioCache(): DiccionarioCacheMeteo {
  try {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    if (!cacheRaw) return {};
    const parsed: unknown = JSON.parse(cacheRaw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const diccionario: DiccionarioCacheMeteo = {};
    for (const [clave, entrada] of Object.entries(parsed as Record<string, unknown>)) {
      if (esEntradaCacheMeteoValida(entrada)) {
        diccionario[clave] = entrada;
      }
    }
    return diccionario;
  } catch {
    return {};
  }
}

function guardarDiccionarioCache(diccionario: DiccionarioCacheMeteo): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(diccionario));
  } catch {
    // Ignora errores de cuota o almacenamiento bloqueado
  }
}

function guardarEntradaCache(claveUbicacion: string, hourly: OpenMeteoHourly): void {
  const diccionario = leerDiccionarioCache();
  const ahora = Date.now();
  diccionario[claveUbicacion] = {
    timestamp: ahora,
    ultimoAcceso: ahora,
    hourly,
  };

  const entradasRecortadas = Object.entries(diccionario)
    .sort(([, a], [, b]) => b.ultimoAcceso - a.ultimoAcceso)
    .slice(0, MAX_CACHE_UBICACIONES);

  guardarDiccionarioCache(Object.fromEntries(entradasRecortadas));
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

function formatearHoraLocalFranja(fecha: Date, ubicacion: Ubicacion): string {
  const zonaHoraria = normalizarZonaHoraria(
    ubicacion.timezone,
    ubicacion.latitud,
    ubicacion.longitud
  );
  return formatearHoraEnZona(fecha, zonaHoraria);
}

function extraerDesdeHourly(
  hourly: OpenMeteoHourly,
  fecha: Date,
  ubicacion: Ubicacion,
  esCache: boolean
): CondicionesMeteo | null {
  const claveHora = formatearClaveHoraUTC(fecha);
  const idx = hourly.time.indexOf(claveHora);
  if (idx === -1) return null;

  const nubesTotal = Math.round(hourly.cloud_cover[idx] ?? 0);
  const vientoKmh = Math.round(hourly.wind_speed_10m[idx] ?? 0);

  const proximasHoras: FranjaHorariaMeteo[] = [];
  const limite = Math.min(idx + 12, hourly.time.length);

  for (let i = idx; i < limite; i++) {
    const horaRaw = hourly.time[i];
    const fechaISO = horaRaw.endsWith('Z') ? horaRaw : `${horaRaw}:00Z`;
    const fechaFranja = new Date(fechaISO);
    if (Number.isNaN(fechaFranja.getTime())) continue;

    const nubesFranja = Math.min(100, Math.max(0, Math.round(hourly.cloud_cover[i] ?? 0)));
    const vientoFranja = Math.max(0, Math.round(hourly.wind_speed_10m[i] ?? 0));
    const estadoSolar = calcularEstadoSolar(fechaFranja, ubicacion);

    proximasHoras.push({
      fechaISO,
      horaLocal: formatearHoraLocalFranja(fechaFranja, ubicacion),
      nubesTotal: nubesFranja,
      vientoKmh: vientoFranja,
      veredicto: evaluarVeredicto(nubesFranja, vientoFranja),
      esNoche: estadoSolar !== null && estadoSolar.altitudSol < -6,
    });
  }

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
    proximasHoras,
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
  const diccionario = leerDiccionarioCache();
  const entradaCache = diccionario[claveUbicacion] ?? null;

  const cacheValida =
    entradaCache !== null && Date.now() - entradaCache.timestamp < CACHE_TTL_MS;

  if (cacheValida) {
    diccionario[claveUbicacion] = {
      ...entradaCache,
      ultimoAcceso: Date.now(),
    };
    guardarDiccionarioCache(diccionario);
    const datos = extraerDesdeHourly(entradaCache.hourly, fecha, ubicacion, true);
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

    guardarEntradaCache(claveUbicacion, hourly);

    const datos = extraerDesdeHourly(hourly, fecha, ubicacion, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    if (entradaCache) {
      const datos = extraerDesdeHourly(entradaCache.hourly, fecha, ubicacion, true);
      return {
        datos,
        aviso: datos ? 'Sin conexión: mostrando datos guardados en caché.' : 'Sin conexión.',
      };
    }
    return { datos: null, aviso: 'No se pudo obtener la previsión meteorológica.' };
  }
}
