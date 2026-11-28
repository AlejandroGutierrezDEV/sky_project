import type { CondicionesMeteo, FranjaHorariaMeteo, Ubicacion } from '../types/astronomy';
import { calcularEstadoSolar, esEntradaAstronomicaValida } from './skyCalculator';
import { formatearHoraEnZona, normalizarZonaHoraria } from '../utils/lunarCalculations';

export type CodigoErrorMeteo =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'HTTP'
  | 'INVALID_RESPONSE';

export class ErrorServicioMeteo extends Error {
  readonly codigo: CodigoErrorMeteo;

  constructor(codigo: CodigoErrorMeteo, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorServicioMeteo';
    this.codigo = codigo;
  }
}

export interface OpenMeteoHourly {
  time: string[];
  cloud_cover: (number | null)[];
  cloud_cover_low: (number | null)[];
  cloud_cover_mid: (number | null)[];
  cloud_cover_high: (number | null)[];
  relative_humidity_2m: (number | null)[];
  wind_speed_10m: (number | null)[];
  temperature_2m: (number | null)[];
  weather_code: (number | null)[];
  wind_gusts_10m: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  visibility: (number | null)[];
}

export interface ResultadoPronosticoHorario {
  hourly: OpenMeteoHourly;
  esCache: boolean;
  sinConexion: boolean;
  timestamp: number;
}

export interface OpcionesConsultaMeteo {
  signal?: AbortSignal;
  forzarRed?: boolean;
}

interface EntradaCacheMeteo {
  timestamp: number;
  ultimoAcceso: number;
  hourly: OpenMeteoHourly;
}

type DiccionarioCacheMeteo = Record<string, EntradaCacheMeteo>;

interface PeticionEnCurso {
  controller: AbortController;
  suscriptores: number;
  promesa: Promise<ResultadoPronosticoHorario>;
}

export const CLAVE_CACHE_METEO = 'skyproject_meteo_cache_v3';
export const MAX_HORAS_PRONOSTICO = 400;
export const TIMEOUT_PETICION_METEO_MS = 9_000;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const MAX_CACHE_UBICACIONES = 5;
const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const VARIABLES_HORARIAS_COMBINADAS = [
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'relative_humidity_2m',
  'wind_speed_10m',
  'temperature_2m',
  'weather_code',
  'wind_gusts_10m',
  'precipitation_probability',
  'precipitation',
  'visibility',
].join(',');

const peticionesEnCurso = new Map<string, PeticionEnCurso>();

export function esErrorAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export function parsearFechaIsoUtc(raw: string): Date | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(trimmed)) {
    return null;
  }

  const tieneZona = /(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed);
  const tieneSegundos = /T\d{2}:\d{2}:\d{2}/.test(trimmed);
  let normalizada = trimmed;
  if (!tieneSegundos) {
    normalizada = tieneZona
      ? trimmed.replace(/(T\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/, '$1:00$2')
      : `${trimmed}:00Z`;
  } else if (!tieneZona) {
    normalizada = `${trimmed}Z`;
  }

  const fecha = new Date(normalizada);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function esArrayFechasIsoValido(valor: unknown): valor is string[] {
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.length <= MAX_HORAS_PRONOSTICO &&
    valor.every((item) => typeof item === 'string' && parsearFechaIsoUtc(item) !== null)
  );
}

function esArrayNumericoConLongitud(
  valor: unknown,
  longitudEsperada: number
): valor is (number | null)[] {
  return (
    Array.isArray(valor) &&
    valor.length === longitudEsperada &&
    valor.every((item) => (typeof item === 'number' && Number.isFinite(item)) || item === null)
  );
}

export function esOpenMeteoHourlyValido(valor: unknown): valor is OpenMeteoHourly {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const obj = valor as Record<string, unknown>;
  if (!esArrayFechasIsoValido(obj.time)) return false;

  const longitud = obj.time.length;
  return (
    esArrayNumericoConLongitud(obj.cloud_cover, longitud) &&
    esArrayNumericoConLongitud(obj.cloud_cover_low, longitud) &&
    esArrayNumericoConLongitud(obj.cloud_cover_mid, longitud) &&
    esArrayNumericoConLongitud(obj.cloud_cover_high, longitud) &&
    esArrayNumericoConLongitud(obj.relative_humidity_2m, longitud) &&
    esArrayNumericoConLongitud(obj.wind_speed_10m, longitud) &&
    esArrayNumericoConLongitud(obj.temperature_2m, longitud) &&
    esArrayNumericoConLongitud(obj.weather_code, longitud) &&
    esArrayNumericoConLongitud(obj.wind_gusts_10m, longitud) &&
    esArrayNumericoConLongitud(obj.precipitation_probability, longitud) &&
    esArrayNumericoConLongitud(obj.precipitation, longitud) &&
    esArrayNumericoConLongitud(obj.visibility, longitud)
  );
}

function esEntradaCacheMeteoValida(valor: unknown): valor is EntradaCacheMeteo {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
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
    const cacheRaw = globalThis.localStorage.getItem(CLAVE_CACHE_METEO);
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
    globalThis.localStorage.setItem(CLAVE_CACHE_METEO, JSON.stringify(diccionario));
  } catch {
    // Ignora errores de cuota o almacenamiento bloqueado
  }
}

function guardarEntradaCache(
  claveUbicacion: string,
  hourly: OpenMeteoHourly,
  timestamp: number
): void {
  const diccionario = leerDiccionarioCache();
  diccionario[claveUbicacion] = {
    timestamp,
    ultimoAcceso: timestamp,
    hourly,
  };

  const entradasRecortadas = Object.entries(diccionario)
    .sort(([, a], [, b]) => b.ultimoAcceso - a.ultimoAcceso)
    .slice(0, MAX_CACHE_UBICACIONES);

  guardarDiccionarioCache(Object.fromEntries(entradasRecortadas));
}

function construirClaveUbicacion(latitud: number, longitud: number): string {
  return `${latitud.toFixed(2)},${longitud.toFixed(2)}`;
}

function sonCoordenadasMeteoValidas(latitud: number, longitud: number): boolean {
  return (
    Number.isFinite(latitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    Number.isFinite(longitud) &&
    longitud >= -180 &&
    longitud <= 180
  );
}

function esperarPeticionConAbort(
  entrada: PeticionEnCurso,
  signal?: AbortSignal
): Promise<ResultadoPronosticoHorario> {
  if (!signal) {
    entrada.suscriptores += 1;
    return entrada.promesa.finally(() => {
      entrada.suscriptores = Math.max(0, entrada.suscriptores - 1);
    });
  }

  if (signal.aborted) {
    return Promise.reject(new DOMException('Petición cancelada por el usuario', 'AbortError'));
  }

  entrada.suscriptores += 1;
  return new Promise<ResultadoPronosticoHorario>((resolve, reject) => {
    let finalizado = false;

    const limpiar = () => {
      if (finalizado) return;
      finalizado = true;
      signal.removeEventListener('abort', alAbortar);
      entrada.suscriptores = Math.max(0, entrada.suscriptores - 1);
    };

    const alAbortar = () => {
      limpiar();
      if (entrada.suscriptores === 0) {
        entrada.controller.abort();
      }
      reject(new DOMException('Petición cancelada por el usuario', 'AbortError'));
    };

    signal.addEventListener('abort', alAbortar, { once: true });

    entrada.promesa.then(
      (resultado) => {
        if (finalizado) return;
        limpiar();
        resolve(resultado);
      },
      (error: unknown) => {
        if (finalizado) return;
        limpiar();
        reject(error);
      }
    );
  });
}

function iniciarDescargaOpenMeteo(
  ubicacion: Pick<Ubicacion, 'latitud' | 'longitud'>,
  claveUbicacion: string
): PeticionEnCurso {
  const controller = new AbortController();
  let tiempoAgotado = false;

  const url = new URL(OPEN_METEO_ENDPOINT);
  url.searchParams.set('latitude', String(ubicacion.latitud));
  url.searchParams.set('longitude', String(ubicacion.longitud));
  url.searchParams.set('hourly', VARIABLES_HORARIAS_COMBINADAS);
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '14');

  const entrada: PeticionEnCurso = {
    controller,
    suscriptores: 0,
    promesa: Promise.resolve({} as ResultadoPronosticoHorario),
  };

  const timeoutId = globalThis.setTimeout(() => {
    tiempoAgotado = true;
    controller.abort();
  }, TIMEOUT_PETICION_METEO_MS);

  entrada.promesa = (async (): Promise<ResultadoPronosticoHorario> => {
    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new ErrorServicioMeteo(
          'HTTP',
          `El servicio meteorológico respondió con error HTTP ${res.status}.`
        );
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new ErrorServicioMeteo(
          'INVALID_RESPONSE',
          'No se pudo interpretar la respuesta JSON del servicio meteorológico.'
        );
      }

      const hourly =
        typeof json === 'object' && json !== null && !Array.isArray(json)
          ? (json as Record<string, unknown>).hourly
          : null;

      if (!esOpenMeteoHourlyValido(hourly)) {
        throw new ErrorServicioMeteo(
          'INVALID_RESPONSE',
          'La respuesta meteorológica recibida está incompleta o tiene un formato no válido.'
        );
      }

      const ahora = Date.now();
      guardarEntradaCache(claveUbicacion, hourly, ahora);

      return {
        hourly,
        esCache: false,
        sinConexion: false,
        timestamp: ahora,
      };
    } catch (error: unknown) {
      if (error instanceof ErrorServicioMeteo) {
        throw error;
      }
      if (tiempoAgotado) {
        throw new ErrorServicioMeteo(
          'TIMEOUT',
          'La consulta meteorológica superó el tiempo de espera.'
        );
      }
      if (esErrorAbort(error)) {
        throw new DOMException('Petición cancelada', 'AbortError');
      }
      throw new ErrorServicioMeteo(
        'NETWORK',
        'No se pudo conectar con el servicio meteorológico.'
      );
    } finally {
      globalThis.clearTimeout(timeoutId);
      if (peticionesEnCurso.get(claveUbicacion) === entrada) {
        peticionesEnCurso.delete(claveUbicacion);
      }
    }
  })();

  peticionesEnCurso.set(claveUbicacion, entrada);
  return entrada;
}

/**
 * Cliente unificado de Open-Meteo (SSOT): realiza una única petición combinada,
 * deduplica llamadas simultáneas para las mismas coordenadas y mantiene caché LRU offline.
 */
export async function obtenerPronosticoHorarioOpenMeteo(
  ubicacion: Pick<Ubicacion, 'latitud' | 'longitud'>,
  opciones: OpcionesConsultaMeteo = {}
): Promise<ResultadoPronosticoHorario> {
  const { signal, forzarRed = false } = opciones;

  if (signal?.aborted) {
    throw new DOMException('Petición cancelada por el usuario', 'AbortError');
  }

  if (!sonCoordenadasMeteoValidas(ubicacion.latitud, ubicacion.longitud)) {
    throw new ErrorServicioMeteo('INVALID_RESPONSE', 'Coordenadas meteorológicas no válidas.');
  }

  const claveUbicacion = construirClaveUbicacion(ubicacion.latitud, ubicacion.longitud);
  const diccionario = leerDiccionarioCache();
  const entradaCache = diccionario[claveUbicacion] ?? null;

  const cacheValida =
    !forzarRed &&
    entradaCache !== null &&
    Date.now() - entradaCache.timestamp < CACHE_TTL_MS;

  if (cacheValida) {
    diccionario[claveUbicacion] = {
      ...entradaCache,
      ultimoAcceso: Date.now(),
    };
    guardarDiccionarioCache(diccionario);
    return {
      hourly: entradaCache.hourly,
      esCache: true,
      sinConexion: false,
      timestamp: entradaCache.timestamp,
    };
  }

  const peticionExistente = !forzarRed ? peticionesEnCurso.get(claveUbicacion) : undefined;
  const peticionActiva =
    peticionExistente ?? iniciarDescargaOpenMeteo(ubicacion, claveUbicacion);

  try {
    return await esperarPeticionConAbort(peticionActiva, signal);
  } catch (error: unknown) {
    if (signal?.aborted || esErrorAbort(error)) {
      throw new DOMException('Petición cancelada', 'AbortError');
    }

    if (entradaCache) {
      return {
        hourly: entradaCache.hourly,
        esCache: true,
        sinConexion: true,
        timestamp: entradaCache.timestamp,
      };
    }

    throw error;
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

  try {
    const resultado = await obtenerPronosticoHorarioOpenMeteo(ubicacion, { signal });
    const datos = extraerDesdeHourly(resultado.hourly, fecha, ubicacion, resultado.esCache);

    if (resultado.sinConexion) {
      return {
        datos,
        aviso: datos ? 'Sin conexión: mostrando datos guardados en caché.' : 'Sin conexión.',
      };
    }

    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch (error: unknown) {
    if (esErrorAbort(error)) {
      throw error;
    }
    return { datos: null, aviso: 'No se pudo obtener la previsión meteorológica.' };
  }
}
