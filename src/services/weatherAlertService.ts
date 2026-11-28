import type {
  AlertCategory,
  AlertSeverity,
  WeatherAlert,
  WeatherAlertCoordinates,
} from '../types/weatherAlerts';

export type WeatherAlertErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'HTTP'
  | 'INVALID_RESPONSE';

export class WeatherAlertServiceError extends Error {
  readonly code: WeatherAlertErrorCode;

  constructor(code: WeatherAlertErrorCode, message: string) {
    super(message);
    this.name = 'WeatherAlertServiceError';
    this.code = code;
  }
}

export interface ResolvedWeatherAlertCoordinates {
  latitude: number;
  longitude: number;
  timezone: string;
  locationName: string;
  usedFallback: boolean;
}

export interface OpenMeteoAlertHourly {
  time: string[];
  weather_code: (number | null)[];
  wind_gusts_10m: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  temperature_2m: (number | null)[];
  visibility: (number | null)[];
}

export interface OpenMeteoAlertsResponse {
  hourly: OpenMeteoAlertHourly;
}

export const FALLBACK_ALERT_COORDINATES: Readonly<ResolvedWeatherAlertCoordinates> = {
  latitude: 40.4168,
  longitude: -3.7038,
  timezone: 'Europe/Madrid',
  locationName: 'Madrid',
  usedFallback: true,
};

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 9_000;
const FORECAST_HOURS = 48;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ALERT_SOURCE = 'Open-Meteo';

const SEVERITY_RANK: Readonly<Record<AlertSeverity, number>> = {
  info: 1,
  moderate: 2,
  severe: 3,
  extreme: 4,
};

const STORM_CODES_EXTREME = new Set<number>([96, 99]);
const STORM_CODES_SEVERE = new Set<number>([95]);
const FOG_CODES = new Set<number>([45, 48]);

function esObjetoRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esZonaHorariaValida(tz: string | undefined): tz is string {
  if (!tz || tz.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: tz }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function normalizarCoordenadasAvisos(
  coordinates?: WeatherAlertCoordinates
): ResolvedWeatherAlertCoordinates {
  if (!coordinates) {
    return { ...FALLBACK_ALERT_COORDINATES };
  }

  const { latitude, longitude, timezone, locationName } = coordinates;
  const latValida =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90;
  const lonValida =
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;

  if (!latValida || !lonValida) {
    return { ...FALLBACK_ALERT_COORDINATES };
  }

  const zonaResuelta = esZonaHorariaValida(timezone) ? timezone : 'UTC';
  const nombreLimpio =
    typeof locationName === 'string' && locationName.trim().length > 0
      ? locationName.trim()
      : `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;

  return {
    latitude,
    longitude,
    timezone: zonaResuelta,
    locationName: nombreLimpio,
    usedFallback: false,
  };
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
    valor.every((item) => typeof item === 'string' && parsearFechaIsoUtc(item) !== null)
  );
}

function esArrayNumericoNullable(valor: unknown, longitudEsperada: number): valor is (number | null)[] {
  return (
    Array.isArray(valor) &&
    valor.length === longitudEsperada &&
    valor.every((item) => item === null || (typeof item === 'number' && Number.isFinite(item)))
  );
}

export function esRespuestaOpenMeteoValida(valor: unknown): valor is OpenMeteoAlertsResponse {
  if (!esObjetoRegistro(valor)) return false;
  const hourly = valor.hourly;
  if (!esObjetoRegistro(hourly)) return false;
  if (!esArrayFechasIsoValido(hourly.time)) return false;

  const longitud = hourly.time.length;
  return (
    esArrayNumericoNullable(hourly.weather_code, longitud) &&
    esArrayNumericoNullable(hourly.wind_gusts_10m, longitud) &&
    esArrayNumericoNullable(hourly.precipitation_probability, longitud) &&
    esArrayNumericoNullable(hourly.precipitation, longitud) &&
    esArrayNumericoNullable(hourly.temperature_2m, longitud) &&
    esArrayNumericoNullable(hourly.visibility, longitud)
  );
}

export function esErrorAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

interface CandidatoHorario {
  groupKey: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  astronomyImpact: string;
  startsAt: Date;
  endsAt: Date;
  metricValue: number;
  peakDirection: 'max' | 'min';
  formatPeak: (valor: number) => string;
}

interface BloqueAcumulado {
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  astronomyImpact: string;
  startsAt: Date;
  endsAt: Date;
  peakMetric: number;
  peakDirection: 'max' | 'min';
  formatPeak: (valor: number) => string;
}

function evaluarHora(
  fecha: Date,
  codigoWmo: number | null,
  rachasKmh: number | null,
  probPrecip: number | null,
  precipMm: number | null,
  tempC: number | null,
  visibilidadM: number | null
): CandidatoHorario[] {
  const resultados: CandidatoHorario[] = [];
  const finHora = new Date(fecha.getTime() + ONE_HOUR_MS);

  // 1. Tormenta eléctrica / granizo
  if (codigoWmo !== null && (STORM_CODES_EXTREME.has(codigoWmo) || STORM_CODES_SEVERE.has(codigoWmo))) {
    const esGranizo = STORM_CODES_EXTREME.has(codigoWmo);
    const severity: AlertSeverity = esGranizo ? 'extreme' : 'severe';
    const probTexto =
      probPrecip !== null && probPrecip > 0 ? ` (prob. ${Math.round(probPrecip)}%)` : '';
    resultados.push({
      groupKey: 'storm',
      category: 'storm',
      severity,
      title: esGranizo ? 'Tormenta con granizo' : 'Tormenta eléctrica',
      description: esGranizo
        ? `Actividad tormentosa intensa con posible granizo prevista${probTexto}.`
        : `Actividad tormentosa y descargas eléctricas previstas en la zona${probTexto}.`,
      astronomyImpact:
        'Peligro eléctrico y riesgo de daños por agua o granizo; no montar equipos en exterior.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: codigoWmo,
      peakDirection: 'max',
      formatPeak: (codigo) =>
        codigo === 99
          ? 'Granizo intenso'
          : codigo === 96
            ? 'Tormenta con granizo'
            : 'Tormenta eléctrica',
    });
  }

  // 2. Rachas de viento
  if (rachasKmh !== null && rachasKmh >= 50) {
    let severity: AlertSeverity = 'moderate';
    let title = 'Rachas fuertes de viento';
    let description = 'Se prevén rachas capaces de desestabilizar trípodes y equipos ligeros.';
    if (rachasKmh >= 90) {
      severity = 'extreme';
      title = 'Rachas huracanadas de viento';
      description = 'Rachas muy peligrosas con alto riesgo de caída de objetos y vuelco de monturas.';
    } else if (rachasKmh >= 70) {
      severity = 'severe';
      title = 'Rachas muy fuertes de viento';
      description = 'Viento intenso que compromete la seguridad del observador y la estabilidad del equipo.';
    }
    resultados.push({
      groupKey: 'wind',
      category: 'wind',
      severity,
      title,
      description,
      astronomyImpact:
        'Riesgo para trípodes, telescopios y seguimiento astrofotográfico por vibración o vuelco.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: rachasKmh,
      peakDirection: 'max',
      formatPeak: (valor) => `${Math.round(valor)} km/h`,
    });
  }

  // 3. Lluvia intensa
  if (precipMm !== null && precipMm >= 4) {
    const esSevera = precipMm >= 10;
    const severity: AlertSeverity = esSevera ? 'severe' : 'moderate';
    const probTexto =
      probPrecip !== null && probPrecip > 0 ? ` con probabilidad del ${Math.round(probPrecip)}%` : '';
    resultados.push({
      groupKey: 'rain',
      category: 'rain',
      severity,
      title: esSevera ? 'Lluvia muy intensa' : 'Lluvia intensa',
      description: esSevera
        ? `Precipitaciones abundantes previstas${probTexto}.`
        : `Precipitaciones significativas previstas${probTexto}.`,
      astronomyImpact:
        'Riesgo de agua en ópticas, oculares y electrónica; suspender observación al aire libre.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: precipMm,
      peakDirection: 'max',
      formatPeak: (valor) => `${valor.toFixed(1)} mm/h`,
    });
  }

  // 4. Niebla / baja visibilidad
  const hayCodigoNiebla = codigoWmo !== null && FOG_CODES.has(codigoWmo);
  const hayBajaVisibilidad = visibilidadM !== null && visibilidadM < 1000;
  if (hayCodigoNiebla || hayBajaVisibilidad) {
    const esEngelante = codigoWmo === 48;
    const visValor = visibilidadM !== null ? visibilidadM : 999;
    resultados.push({
      groupKey: 'fog',
      category: 'fog',
      severity: 'moderate',
      title: esEngelante ? 'Niebla engelante' : 'Niebla densa',
      description: hayBajaVisibilidad
        ? 'Visibilidad reducida por debajo de 1 km y alta humedad en superficie.'
        : 'Bancos de niebla previstos que reducen drásticamente la transparencia atmosférica.',
      astronomyImpact:
        'Condensación rápida en lentes y espejos; pérdida casi total de visibilidad celeste.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: visValor,
      peakDirection: 'min',
      formatPeak: (valor) =>
        visibilidadM !== null && valor < 1000
          ? `${Math.max(0, Math.round(valor))} m vis.`
          : esEngelante
            ? 'Niebla engelante'
            : 'Vis. < 1 km',
    });
  }

  // 5. Temperaturas extremas (heladas o calor extremo)
  if (tempC !== null && tempC <= 0) {
    const esSevera = tempC <= -5;
    resultados.push({
      groupKey: 'temperature-cold',
      category: 'temperature',
      severity: esSevera ? 'severe' : 'moderate',
      title: esSevera ? 'Helada intensa' : 'Temperatura bajo cero',
      description: esSevera
        ? 'Frío intenso con riesgo elevado de hielo y congelación en superficie.'
        : 'Temperaturas iguales o inferiores a 0 °C durante la franja prevista.',
      astronomyImpact:
        'Formación de escarcha en la óptica, menor autonomía en baterías y rigidez en la montura.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: tempC,
      peakDirection: 'min',
      formatPeak: (valor) => `${Math.round(valor)} °C`,
    });
  } else if (tempC !== null && tempC >= 36) {
    const esSevera = tempC >= 40;
    resultados.push({
      groupKey: 'temperature-heat',
      category: 'temperature',
      severity: esSevera ? 'severe' : 'moderate',
      title: esSevera ? 'Calor extremo' : 'Temperatura muy elevada',
      description: esSevera
        ? 'Calor extremo previsto; evitar exposición prolongada y recalentar el equipo.'
        : 'Temperaturas muy altas previstas en la zona de observación.',
      astronomyImpact:
        'Aumento de ruido térmico en cámaras, turbulencia local y aclimatación lenta del telescopio.',
      startsAt: fecha,
      endsAt: finHora,
      metricValue: tempC,
      peakDirection: 'max',
      formatPeak: (valor) => `${Math.round(valor)} °C`,
    });
  }

  return resultados;
}

export function transformarHourlyEnAvisos(hourly: OpenMeteoAlertHourly): WeatherAlert[] {
  const totalHoras = Math.min(hourly.time.length, FORECAST_HOURS);
  const bloquesActivos = new Map<string, BloqueAcumulado>();
  const bloquesCerrados: BloqueAcumulado[] = [];

  for (let i = 0; i < totalHoras; i++) {
    const fecha = parsearFechaIsoUtc(hourly.time[i]);
    if (!fecha) continue;

    const candidatos = evaluarHora(
      fecha,
      hourly.weather_code[i],
      hourly.wind_gusts_10m[i],
      hourly.precipitation_probability[i],
      hourly.precipitation[i],
      hourly.temperature_2m[i],
      hourly.visibility[i]
    );

    const clavesEnHora = new Set<string>();

    for (const candidato of candidatos) {
      clavesEnHora.add(candidato.groupKey);
      const existente = bloquesActivos.get(candidato.groupKey);

      if (existente && existente.endsAt.getTime() === candidato.startsAt.getTime()) {
        existente.endsAt = candidato.endsAt;

        if (SEVERITY_RANK[candidato.severity] > SEVERITY_RANK[existente.severity]) {
          existente.severity = candidato.severity;
          existente.title = candidato.title;
          existente.description = candidato.description;
          existente.astronomyImpact = candidato.astronomyImpact;
        }

        const esNuevoPico =
          candidato.peakDirection === 'max'
            ? candidato.metricValue > existente.peakMetric
            : candidato.metricValue < existente.peakMetric;

        if (esNuevoPico) {
          existente.peakMetric = candidato.metricValue;
          existente.formatPeak = candidato.formatPeak;
        }
      } else {
        if (existente) {
          bloquesCerrados.push(existente);
        }
        bloquesActivos.set(candidato.groupKey, {
          category: candidato.category,
          severity: candidato.severity,
          title: candidato.title,
          description: candidato.description,
          astronomyImpact: candidato.astronomyImpact,
          startsAt: candidato.startsAt,
          endsAt: candidato.endsAt,
          peakMetric: candidato.metricValue,
          peakDirection: candidato.peakDirection,
          formatPeak: candidato.formatPeak,
        });
      }
    }

    // Cerrar bloques cuya categoría no estuvo activa en esta hora
    for (const [clave, bloque] of bloquesActivos.entries()) {
      if (!clavesEnHora.has(clave)) {
        bloquesCerrados.push(bloque);
        bloquesActivos.delete(clave);
      }
    }
  }

  for (const bloque of bloquesActivos.values()) {
    bloquesCerrados.push(bloque);
  }

  const alertas: WeatherAlert[] = bloquesCerrados.map((bloque) => ({
    id: `${bloque.category}-${bloque.startsAt.toISOString()}`,
    category: bloque.category,
    severity: bloque.severity,
    title: bloque.title,
    description: bloque.description,
    astronomyImpact: bloque.astronomyImpact,
    startsAt: bloque.startsAt,
    endsAt: bloque.endsAt,
    peakValue: bloque.formatPeak(bloque.peakMetric),
    source: ALERT_SOURCE,
  }));

  return alertas.sort((a, b) => {
    const diffSev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (diffSev !== 0) return diffSev;
    const diffInicio = a.startsAt.getTime() - b.startsAt.getTime();
    if (diffInicio !== 0) return diffInicio;
    return a.category.localeCompare(b.category);
  });
}

export interface FetchWeatherAlertsResult {
  alerts: WeatherAlert[];
  resolvedCoordinates: ResolvedWeatherAlertCoordinates;
  fetchedAt: Date;
}

export async function obtenerAvisosMeteorologicos(
  coordinates?: WeatherAlertCoordinates,
  signal?: AbortSignal
): Promise<FetchWeatherAlertsResult> {
  if (signal?.aborted) {
    throw new DOMException('Petición cancelada por el usuario', 'AbortError');
  }

  const resolvedCoordinates = normalizarCoordenadasAvisos(coordinates);

  const params = new URLSearchParams({
    latitude: resolvedCoordinates.latitude.toFixed(4),
    longitude: resolvedCoordinates.longitude.toFixed(4),
    hourly:
      'weather_code,wind_gusts_10m,precipitation_probability,precipitation,temperature_2m,visibility',
    forecast_hours: String(FORECAST_HOURS),
    wind_speed_unit: 'kmh',
    timezone: 'UTC',
  });

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    controller.abort();
  };

  signal?.addEventListener('abort', onExternalAbort, { once: true });

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPEN_METEO_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new WeatherAlertServiceError(
        'HTTP',
        `El servicio meteorológico respondió con error HTTP ${response.status}.`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new WeatherAlertServiceError(
        'INVALID_RESPONSE',
        'No se pudo interpretar la respuesta JSON del servicio meteorológico.'
      );
    }

    if (!esRespuestaOpenMeteoValida(payload)) {
      throw new WeatherAlertServiceError(
        'INVALID_RESPONSE',
        'La respuesta meteorológica recibida está incompleta o tiene un formato no válido.'
      );
    }

    const alerts = transformarHourlyEnAvisos(payload.hourly);
    return {
      alerts,
      resolvedCoordinates,
      fetchedAt: new Date(),
    };
  } catch (error: unknown) {
    if (error instanceof WeatherAlertServiceError) {
      throw error;
    }
    if (timedOut) {
      throw new WeatherAlertServiceError(
        'TIMEOUT',
        'La consulta de avisos meteorológicos superó el tiempo de espera.'
      );
    }
    if (signal?.aborted || esErrorAbort(error)) {
      throw new DOMException('Petición cancelada', 'AbortError');
    }
    throw new WeatherAlertServiceError(
      'NETWORK',
      'No se pudo conectar con el servicio de avisos meteorológicos.'
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
