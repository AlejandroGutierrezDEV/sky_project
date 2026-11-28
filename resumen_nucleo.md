This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/App.tsx, src/index.css, src/components/SkyMap.tsx, src/components/Compass3DModal.tsx, src/components/PlanificadorSesionModal.tsx, src/components/WeatherPanel.tsx, src/components/EventsPanel.tsx, src/components/Navbar.tsx, src/core/**, src/services/**, src/utils/**, index.html, vite.config.ts, package.json
- Files matching these patterns are excluded: **/*.test.ts, **/*.test.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
src/
  components/
    Compass3DModal.tsx
    EventsPanel.tsx
    Navbar.tsx
    PlanificadorSesionModal.tsx
    SkyMap.tsx
    WeatherPanel.tsx
  core/
    eventsCalculator.ts
    skyCalculator.ts
    weatherService.ts
  services/
    weatherAlertService.ts
  utils/
    astronomia/
      calidadCielo.ts
      culminacion.ts
      declinacionMagnetica.ts
    compassMath.ts
    exportarSesion.ts
    lunarCalculations.ts
    skyProjection.ts
  App.tsx
  index.css
index.html
package.json
vite.config.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/services/weatherAlertService.ts">
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
</file>

<file path="src/utils/astronomia/calidadCielo.ts">
import type {
  CalidadCieloCalculada,
  DatosLunares,
  EscalaBortle,
} from '../../types/astronomy';

export const BORTLE_POR_DEFECTO: EscalaBortle = 4;

/**
 * Magnitud límite cenital a simple vista (NELM) en cielo despejado sin Luna
 * según la escala de cielo oscuro de Bortle (1 a 9).
 */
export const NELM_BASE_POR_BORTLE: Readonly<Record<EscalaBortle, number>> = {
  1: 7.6,
  2: 7.1,
  3: 6.6,
  4: 6.2,
  5: 5.7,
  6: 5.2,
  7: 4.8,
  8: 4.4,
  9: 4.0,
};

export const DESCRIPCIONES_BORTLE: Readonly<Record<EscalaBortle, string>> = {
  1: 'Bortle 1 · Cielo oscuro excelente',
  2: 'Bortle 2 · Cielo oscuro típico',
  3: 'Bortle 3 · Cielo rural',
  4: 'Bortle 4 · Transición rural/suburbana',
  5: 'Bortle 5 · Cielo suburbano',
  6: 'Bortle 6 · Suburbano brillante',
  7: 'Bortle 7 · Transición suburbana/urbana',
  8: 'Bortle 8 · Cielo urbano',
  9: 'Bortle 9 · Centro urbano',
};

export const NIVELES_BORTLE: readonly EscalaBortle[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const PENALIZACION_LUNAR_MAXIMA_MAG = 2.7;
const MAGNITUD_LIMITE_MINIMA = 0.5;
const VEREDICTOS_POR_NIVEL: readonly CalidadCieloCalculada['veredicto'][] = [
  'Malo',
  'Regular',
  'Bueno',
  'Excelente',
];

export function esEscalaBortleValida(valor: unknown): valor is EscalaBortle {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 9;
}

export function normalizarEscalaBortle(valor: unknown): EscalaBortle {
  return esEscalaBortleValida(valor) ? valor : BORTLE_POR_DEFECTO;
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Calcula la calidad real de observación astronómica combinando cobertura nubosa,
 * escala Bortle del observatorio y brillo/altitud de la Luna.
 */
export function calcularCalidadCielo(
  nubesPct: number,
  bortle: EscalaBortle,
  luna: DatosLunares
): CalidadCieloCalculada {
  const nubes = Number.isFinite(nubesPct) ? acotar(nubesPct, 0, 100) : 0;
  const escalaBortle = normalizarEscalaBortle(bortle);
  const iluminacion = Number.isFinite(luna.iluminacion) ? acotar(luna.iluminacion, 0, 1) : 0;
  const altitudGrados = Number.isFinite(luna.altitudGrados)
    ? acotar(luna.altitudGrados, -90, 90)
    : -90;
  const faseNombre =
    typeof luna.faseNombre === 'string' && luna.faseNombre.trim().length > 0
      ? luna.faseNombre.trim()
      : 'Luna';

  const nelmBase = NELM_BASE_POR_BORTLE[escalaBortle];

  let penalizacionLunar = 0;
  if (altitudGrados > 0 && iluminacion > 0) {
    const altitudRadianes = (altitudGrados * Math.PI) / 180;
    const perdidaBruta = PENALIZACION_LUNAR_MAXIMA_MAG * iluminacion * Math.sin(altitudRadianes);
    penalizacionLunar = Number(perdidaBruta.toFixed(2));
  }

  const magnitudLimiteVisible = Number(
    Math.max(MAGNITUD_LIMITE_MINIMA, nelmBase - penalizacionLunar).toFixed(1)
  );

  // Evaluación por nubosidad
  let nivelNubes = 3;
  let motivoNubes = '';
  if (nubes > 65) {
    nivelNubes = 0;
    motivoNubes = `Nubosidad densa (${Math.round(nubes)}%) impide la observación`;
  } else if (nubes > 35) {
    nivelNubes = 1;
    motivoNubes = `Nubosidad parcial (${Math.round(nubes)}%) limita la sesión`;
  } else if (nubes > 15) {
    nivelNubes = 2;
    motivoNubes = `Intervalos de nubes ligeras (${Math.round(nubes)}%)`;
  }

  // Evaluación por interferencia lunar en cielo profundo
  const lunaAltaEIluminada = altitudGrados > 20 && iluminacion > 0.6;
  let nivelLuna = 3;
  let motivoLuna = '';
  if (lunaAltaEIluminada) {
    nivelLuna = 1;
    motivoLuna = `Brillo de ${faseNombre} (${Math.round(iluminacion * 100)}%, alt ${Math.round(
      altitudGrados
    )}°) limita el cielo profundo`;
  } else if (altitudGrados > 0 && penalizacionLunar >= 0.45) {
    nivelLuna = 2;
    motivoLuna = `Presencia de ${faseNombre} (${Math.round(iluminacion * 100)}%) reduce el contraste`;
  }

  // Evaluación por contaminación lumínica (escala Bortle)
  let nivelBortle = 3;
  let motivoBortle = '';
  if (escalaBortle === 9) {
    nivelBortle = 0;
    motivoBortle = 'Contaminación lumínica extrema (Bortle 9)';
  } else if (escalaBortle >= 7) {
    nivelBortle = 1;
    motivoBortle = `Contaminación lumínica urbana (Bortle ${escalaBortle})`;
  } else if (escalaBortle >= 5) {
    nivelBortle = 2;
    motivoBortle = `Contaminación lumínica moderada (Bortle ${escalaBortle})`;
  }

  let nivelFinal = Math.min(nivelNubes, nivelLuna, nivelBortle);

  // Degradación compuesta cuando concurre Luna alta brillante con cielo urbano o nuboso
  if (lunaAltaEIluminada && (nubes > 35 || escalaBortle >= 8)) {
    nivelFinal = 0;
  }

  let motivoPrincipal: string;
  if (nivelFinal === 3) {
    motivoPrincipal =
      altitudGrados <= 0 && iluminacion > 0.5
        ? 'Cielo despejado y oscuro (Luna bajo el horizonte)'
        : 'Cielo despejado y oscuro, óptimo para cielo profundo';
  } else if (nivelNubes <= nivelFinal && motivoNubes) {
    motivoPrincipal = motivoNubes;
  } else if (lunaAltaEIluminada && (nivelFinal <= 1 || nivelLuna <= nivelFinal)) {
    motivoPrincipal = motivoLuna;
  } else if (nivelLuna <= nivelFinal && motivoLuna) {
    motivoPrincipal = motivoLuna;
  } else if (motivoBortle) {
    motivoPrincipal = motivoBortle;
  } else {
    motivoPrincipal = motivoNubes || motivoLuna || 'Condiciones limitadas de observación';
  }

  return {
    magnitudLimiteVisible,
    penalizacionLunar,
    veredicto: VEREDICTOS_POR_NIVEL[nivelFinal],
    motivoPrincipal,
  };
}
</file>

<file path="src/utils/astronomia/culminacion.ts">
import * as Astronomy from 'astronomy-engine';
import type {
  EstadoVisibilidadObjetivo,
  ObjetivoPlanificado,
} from '../../types/astronomy';

const RAZON_SIDEREO_A_SOLAR = 23.934469591898 / 24;
const DIA_SIDEREO_MS = 23.934469591898 * 3_600_000;
const MS_POR_HORA = 3_600_000;
const UMBRALES_NOCHE_GRADOS = [-18, -12, -6, 0] as const;

export interface VentanaNocturna {
  inicio: Date;
  fin: Date;
}

export interface ResultadoCulminacionAstro {
  horaCulminacion: Date | null;
  altitudMaximaGrados: number;
  estadoVisibilidad: EstadoVisibilidadObjetivo;
  etiquetaHoraria: string;
}

function normalizarHoras24(horas: number): number {
  return ((horas % 24) + 24) % 24;
}

function diferenciaHorasCorta(objetivoHoras: number, referenciaHoras: number): number {
  return ((((objetivoHoras - referenciaHoras + 12) % 24) + 24) % 24) - 12;
}

function formatearHoraCorta(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Calcula el Tiempo Sidéreo Local (LST) en horas [0, 24) para una fecha y longitud dadas.
 */
export function calcularTiempoSidereoLocal(fecha: Date, longitud: number): number {
  const gastHoras = Astronomy.SiderealTime(fecha);
  return normalizarHoras24(gastHoras + longitud / 15);
}

/**
 * Calcula la altitud teórica sobre el horizonte (en grados) dado RA, Dec, latitud y LST.
 */
function calcularAltitudDesdeLST(
  raHoras: number,
  decGrados: number,
  latitud: number,
  lstHoras: number
): number {
  const haRad = (normalizarHoras24(lstHoras - raHoras) * 15 * Math.PI) / 180;
  const latRad = (latitud * Math.PI) / 180;
  const decRad = (decGrados * Math.PI) / 180;
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const sinClampeado = Math.max(-1, Math.min(1, sinAlt));
  return (Math.asin(sinClampeado) * 180) / Math.PI;
}

/**
 * Determina la ventana nocturna (ocaso -> orto astronómico) relevante para la fecha de referencia.
 * Si en latitudes altas el Sol no alcanza -18°, degrada progresivamente a crepúsculo náutico,
 * civil, horizonte o ventana solar nocturna de respaldo (21:00–05:00 solar local).
 */
export function calcularVentanaNocturna(
  latitud: number,
  longitud: number,
  fechaReferencia: Date
): VentanaNocturna {
  const observador = new Astronomy.Observer(latitud, longitud, 0);

  let altitudSolActual = 10;
  try {
    const eqSol = Astronomy.Equator(Astronomy.Body.Sun, fechaReferencia, observador, true, true);
    const horSol = Astronomy.Horizon(fechaReferencia, observador, eqSol.ra, eqSol.dec, 'normal');
    altitudSolActual = horSol.altitude;
  } catch {
    // Mantiene valor de respaldo diurno
  }

  for (const umbral of UMBRALES_NOCHE_GRADOS) {
    try {
      let inicio: Date | null = null;
      let fin: Date | null = null;

      if (altitudSolActual < umbral) {
        // Ya estamos dentro de la ventana nocturna: buscar ocaso previo y orto siguiente
        const inicioBusqueda = new Date(fechaReferencia.getTime() - 24 * MS_POR_HORA);
        let candidatoOcaso = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          -1,
          inicioBusqueda,
          1.2,
          umbral
        );
        // Asegura tomar el último ocaso <= fechaReferencia
        while (candidatoOcaso && candidatoOcaso.date.getTime() <= fechaReferencia.getTime()) {
          inicio = candidatoOcaso.date;
          const siguienteBase = new Date(candidatoOcaso.date.getTime() + 60_000);
          const siguiente = Astronomy.SearchAltitude(
            Astronomy.Body.Sun,
            observador,
            -1,
            siguienteBase,
            1.2,
            umbral
          );
          if (!siguiente || siguiente.date.getTime() > fechaReferencia.getTime()) {
            break;
          }
          candidatoOcaso = siguiente;
        }

        const eventoOrto = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          +1,
          fechaReferencia,
          1.2,
          umbral
        );
        if (eventoOrto) {
          fin = eventoOrto.date;
        }
      } else {
        // Estamos fuera de la ventana nocturna: buscar próximo ocaso y su orto posterior
        const eventoOcaso = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          -1,
          fechaReferencia,
          1.2,
          umbral
        );
        if (eventoOcaso) {
          inicio = eventoOcaso.date;
          const eventoOrto = Astronomy.SearchAltitude(
            Astronomy.Body.Sun,
            observador,
            +1,
            new Date(inicio.getTime() + 60_000),
            1.2,
            umbral
          );
          if (eventoOrto) {
            fin = eventoOrto.date;
          }
        }
      }

      if (inicio && fin && fin.getTime() > inicio.getTime()) {
        return { inicio, fin };
      }
    } catch {
      // Intenta el siguiente umbral de crepúsculo
    }
  }

  // Respaldo para sol de medianoche o noche polar continua: ventana de 8h centrada en medianoche solar
  const horaSolarLocal = normalizarHoras24(
    fechaReferencia.getUTCHours() +
      fechaReferencia.getUTCMinutes() / 60 +
      fechaReferencia.getUTCSeconds() / 3600 +
      longitud / 15
  );
  const horasHastaMedianoche =
    horaSolarLocal < 6 ? -horaSolarLocal : 24 - horaSolarLocal;
  const medianocheSolarMs = fechaReferencia.getTime() + horasHastaMedianoche * MS_POR_HORA;

  return {
    inicio: new Date(medianocheSolarMs - 4 * MS_POR_HORA),
    fin: new Date(medianocheSolarMs + 4 * MS_POR_HORA),
  };
}

/**
 * Calcula la hora exacta de tránsito por el meridiano local (HA = 0) a partir del LST,
 * su altitud máxima teórica y si culmina dentro de la ventana nocturna.
 */
export function calcularCulminacionAstro(
  raHoras: number,
  decGrados: number,
  latitud: number,
  longitud: number,
  fechaReferencia: Date
): ResultadoCulminacionAstro {
  const entradasValidas =
    Number.isFinite(raHoras) &&
    Number.isFinite(decGrados) &&
    decGrados >= -90 &&
    decGrados <= 90 &&
    Number.isFinite(latitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    Number.isFinite(longitud) &&
    longitud >= -180 &&
    longitud <= 180 &&
    !Number.isNaN(fechaReferencia.getTime());

  if (!entradasValidas) {
    return {
      horaCulminacion: null,
      altitudMaximaGrados: 0,
      estadoVisibilidad: 'nunca_sale',
      etiquetaHoraria: 'No visible desde esta latitud',
    };
  }

  const altitudMaximaGrados = Number((90 - Math.abs(latitud - decGrados)).toFixed(1));
  const nuncaSale =
    (latitud >= 0 && decGrados <= latitud - 90) ||
    (latitud < 0 && decGrados >= latitud + 90) ||
    altitudMaximaGrados <= 0;

  if (nuncaSale) {
    return {
      horaCulminacion: null,
      altitudMaximaGrados,
      estadoVisibilidad: 'nunca_sale',
      etiquetaHoraria: 'No visible desde esta latitud',
    };
  }

  const raNormalizada = normalizarHoras24(raHoras);
  const ventana = calcularVentanaNocturna(latitud, longitud, fechaReferencia);
  const centroNocheMs = (ventana.inicio.getTime() + ventana.fin.getTime()) / 2;
  const centroNoche = new Date(centroNocheMs);

  // Primer cálculo del tránsito más cercano al centro de la noche usando LST
  const lstCentro = calcularTiempoSidereoLocal(centroNoche, longitud);
  const deltaInicialHoras = diferenciaHorasCorta(raNormalizada, lstCentro);
  let horaCulminacion = new Date(
    centroNocheMs + deltaInicialHoras * RAZON_SIDEREO_A_SOLAR * MS_POR_HORA
  );

  // Refinamiento iterativo para compensar precisión del día sidéreo y nutación (< 1 s)
  const lstRefinado = calcularTiempoSidereoLocal(horaCulminacion, longitud);
  const ajusteHoras = diferenciaHorasCorta(raNormalizada, lstRefinado);
  horaCulminacion = new Date(
    horaCulminacion.getTime() + ajusteHoras * RAZON_SIDEREO_A_SOLAR * MS_POR_HORA
  );

  // En noches invernales largas (> 12h), comprobar si ±1 día sidéreo cae dentro de la ventana
  const inicioMs = ventana.inicio.getTime();
  const finMs = ventana.fin.getTime();
  let culmMs = horaCulminacion.getTime();

  if (culmMs < inicioMs || culmMs > finMs) {
    const anteriorMs = culmMs - DIA_SIDEREO_MS;
    const siguienteMs = culmMs + DIA_SIDEREO_MS;
    if (anteriorMs >= inicioMs && anteriorMs <= finMs) {
      culmMs = anteriorMs;
      horaCulminacion = new Date(culmMs);
    } else if (siguienteMs >= inicioMs && siguienteMs <= finMs) {
      culmMs = siguienteMs;
      horaCulminacion = new Date(culmMs);
    }
  }

  const altRedondeada = Math.round(altitudMaximaGrados);

  if (culmMs >= inicioMs && culmMs <= finMs) {
    return {
      horaCulminacion,
      altitudMaximaGrados,
      estadoVisibilidad: 'optimo_noche',
      etiquetaHoraria: `${formatearHoraCorta(horaCulminacion)} (Alt. máx ${altRedondeada}°)`,
    };
  }

  // Culminación diurna: determinar si conviene observar justo tras el anochecer o antes del amanecer
  const lstInicio = calcularTiempoSidereoLocal(ventana.inicio, longitud);
  const lstFin = calcularTiempoSidereoLocal(ventana.fin, longitud);
  const altAnochecer = calcularAltitudDesdeLST(raNormalizada, decGrados, latitud, lstInicio);
  const altAmanecer = calcularAltitudDesdeLST(raNormalizada, decGrados, latitud, lstFin);

  const mejorAlAnochecer =
    altAnochecer !== altAmanecer ? altAnochecer > altAmanecer : culmMs < inicioMs;

  const etiquetaHoraria = mejorAlAnochecer
    ? `Tras el anochecer (poniéndose · Culm. ${formatearHoraCorta(horaCulminacion)})`
    : `Antes del amanecer (saliendo · Culm. ${formatearHoraCorta(horaCulminacion)})`;

  return {
    horaCulminacion,
    altitudMaximaGrados,
    estadoVisibilidad: 'visible_parcial',
    etiquetaHoraria,
  };
}

const PRIORIDAD_VISIBILIDAD: Readonly<Record<EstadoVisibilidadObjetivo, number>> = {
  optimo_noche: 0,
  visible_parcial: 1,
  nunca_sale: 2,
};

/**
 * Comparador para ordenar los objetivos de una sesión nocturna:
 * 1. Astros con culminación durante la noche astronómica, en orden cronológico.
 * 2. Astros con culminación diurna (visibilidad parcial), en orden cronológico (poniéndose -> saliendo).
 * 3. Astros que nunca salen desde esta latitud, al final de la lista.
 */
export function ordenarPorCulminacionNocturna(
  a: ObjetivoPlanificado,
  b: ObjetivoPlanificado
): number {
  const diffEstado =
    PRIORIDAD_VISIBILIDAD[a.estadoVisibilidad] - PRIORIDAD_VISIBILIDAD[b.estadoVisibilidad];
  if (diffEstado !== 0) return diffEstado;

  if (a.horaCulminacion && b.horaCulminacion) {
    const diffHora = a.horaCulminacion.getTime() - b.horaCulminacion.getTime();
    if (diffHora !== 0) return diffHora;
  } else if (a.horaCulminacion) {
    return -1;
  } else if (b.horaCulminacion) {
    return 1;
  }

  const diffAlt = b.altitudMaximaGrados - a.altitudMaximaGrados;
  if (diffAlt !== 0) return diffAlt;

  return a.codigo.localeCompare(b.codigo, 'es');
}
</file>

<file path="src/utils/astronomia/declinacionMagnetica.ts">
/**
 * Modelo geomagnético esférico armónico simplificado basado en los coeficientes
 * de Gauss del World Magnetic Model 2025 (WMM2025, grado y orden N = 4),
 * proyectados a época media 2026.5 (válido para la ventana 2025–2030).
 *
 * Referencia de signos:
 * - Positivo (+): Norte magnético al Este del Norte geográfico (E).
 * - Negativo (-): Norte magnético al Oeste del Norte geográfico (O).
 */

interface CoeficienteGauss {
  n: number;
  m: number;
  g: number; // nT (época 2025.0)
  h: number; // nT (época 2025.0)
  dg: number; // nT/año
  dh: number; // nT/año
}

const GRADO_MAXIMO = 4;
const ANIOS_DESDE_EPOCA_2025 = 1.5; // Época de referencia 2026.5
const LATITUD_LIMITE_POLAR = 89.99;

/** Coeficientes principales y variación secular WMM2025 (n = 1..4). */
const COEFICIENTES_WMM2025: readonly CoeficienteGauss[] = [
  // Grado 1 (dipolo principal)
  { n: 1, m: 0, g: -29351.8, h: 0.0, dg: 12.0, dh: 0.0 },
  { n: 1, m: 1, g: -1410.8, h: 4545.4, dg: 9.7, dh: -21.5 },
  // Grado 2 (cuadrupolo)
  { n: 2, m: 0, g: -2556.6, h: 0.0, dg: -11.6, dh: 0.0 },
  { n: 2, m: 1, g: 2951.1, h: -3133.6, dg: -5.2, dh: -27.7 },
  { n: 2, m: 2, g: 1649.3, h: -815.1, dg: -8.0, dh: -12.1 },
  // Grado 3 (octupolo)
  { n: 3, m: 0, g: 1361.0, h: 0.0, dg: -1.3, dh: 0.0 },
  { n: 3, m: 1, g: -2404.1, h: -56.6, dg: -4.2, dh: 4.0 },
  { n: 3, m: 2, g: 1243.8, h: 237.5, dg: 0.4, dh: -0.3 },
  { n: 3, m: 3, g: 453.6, h: -549.5, dg: -15.6, dh: -4.1 },
  // Grado 4 (hexadecapolo)
  { n: 4, m: 0, g: 895.0, h: 0.0, dg: -1.6, dh: 0.0 },
  { n: 4, m: 1, g: 799.5, h: 278.6, dg: -2.4, dh: -1.1 },
  { n: 4, m: 2, g: 55.7, h: -133.9, dg: -6.0, dh: 4.1 },
  { n: 4, m: 3, g: -281.1, h: 212.0, dg: 5.6, dh: 1.6 },
  { n: 4, m: 4, g: 12.1, h: -375.6, dg: -7.0, dh: -4.4 },
];

function factorial(n: number): number {
  let resultado = 1;
  for (let i = 2; i <= n; i++) {
    resultado *= i;
  }
  return resultado;
}

/** Factor de cuasi-normalización de Schmidt S(n, m). */
const FACTORES_SCHMIDT: readonly (readonly number[])[] = Array.from(
  { length: GRADO_MAXIMO + 1 },
  (_, n) =>
    Array.from({ length: n + 1 }, (_, m) => {
      const escalaM = m === 0 ? 1 : 2;
      return Math.sqrt((escalaM * factorial(n - m)) / factorial(n + m));
    })
);

function normalizarLongitud(longitud: number): number {
  const normalizada = ((((longitud + 180) % 360) + 360) % 360) - 180;
  return normalizada === -180 && longitud > 0 ? 180 : normalizada;
}

/**
 * Calcula la declinación magnética aproximada en grados [-180, 180]
 * para las coordenadas geográficas proporcionadas.
 *
 * Devuelve un valor finito acotado incluso en latitudes polares extremas,
 * en `(0, 0)` o ante entradas no finitas (fallback seguro `0`).
 */
export function calcularDeclinacionMagnetica(latitud: number, longitud: number): number {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return 0;
  }

  const latAcotada = Math.min(LATITUD_LIMITE_POLAR, Math.max(-LATITUD_LIMITE_POLAR, latitud));
  const lonNormalizada = normalizarLongitud(longitud);

  const latRad = (latAcotada * Math.PI) / 180;
  const lonRad = (lonNormalizada * Math.PI) / 180;

  // x = cos(colatitud) = sin(lat), y = sin(colatitud) = cos(lat) > 0
  const x = Math.sin(latRad);
  const y = Math.cos(latRad);

  // Polinomios asociados de Legendre (sin normalizar) y sus derivadas respecto a la colatitud
  const p: number[][] = Array.from({ length: GRADO_MAXIMO + 1 }, (_, n) =>
    new Array<number>(n + 1).fill(0)
  );
  const dp: number[][] = Array.from({ length: GRADO_MAXIMO + 1 }, (_, n) =>
    new Array<number>(n + 1).fill(0)
  );

  p[0][0] = 1;
  dp[0][0] = 0;

  for (let m = 1; m <= GRADO_MAXIMO; m++) {
    const factor = 2 * m - 1;
    p[m][m] = factor * y * p[m - 1][m - 1];
    dp[m][m] = factor * (x * p[m - 1][m - 1] + y * dp[m - 1][m - 1]);
  }

  for (let m = 0; m < GRADO_MAXIMO; m++) {
    const factor = 2 * m + 1;
    p[m + 1][m] = factor * x * p[m][m];
    dp[m + 1][m] = factor * (-y * p[m][m] + x * dp[m][m]);
  }

  for (let n = 2; n <= GRADO_MAXIMO; n++) {
    for (let m = 0; m <= n - 2; m++) {
      const inv = 1 / (n - m);
      const a = 2 * n - 1;
      const b = n + m - 1;
      p[n][m] = (a * x * p[n - 1][m] - b * p[n - 2][m]) * inv;
      dp[n][m] = (a * (-y * p[n - 1][m] + x * dp[n - 1][m]) - b * dp[n - 2][m]) * inv;
    }
  }

  // Componentes horizontales del campo geomagnético: Norte (campoX) y Este (campoY)
  let campoX = 0;
  let campoY = 0;

  for (const coef of COEFICIENTES_WMM2025) {
    const gActual = coef.g + coef.dg * ANIOS_DESDE_EPOCA_2025;
    const hActual = coef.h + coef.dh * ANIOS_DESDE_EPOCA_2025;
    const schmidt = FACTORES_SCHMIDT[coef.n][coef.m];
    const cosMLon = Math.cos(coef.m * lonRad);
    const sinMLon = Math.sin(coef.m * lonRad);

    campoX += (gActual * cosMLon + hActual * sinMLon) * schmidt * dp[coef.n][coef.m];
    if (coef.m > 0) {
      campoY +=
        coef.m * (gActual * sinMLon - hActual * cosMLon) * schmidt * p[coef.n][coef.m];
    }
  }

  campoY /= y;

  const declinacionGrados = (Math.atan2(campoY, campoX) * 180) / Math.PI;
  if (!Number.isFinite(declinacionGrados)) {
    return 0;
  }

  const acotada = Math.min(180, Math.max(-180, declinacionGrados));
  const redondeada = Number(acotada.toFixed(2));
  return Object.is(redondeada, -0) ? 0 : redondeada;
}

/** Formatea la declinación magnética para indicadores discretos en la interfaz. */
export function formatearDeclinacionMagnetica(declinacion: number): string {
  if (!Number.isFinite(declinacion)) return '0.0°';
  const redondeada = Number(declinacion.toFixed(1));
  if (Math.abs(redondeada) < 0.05) return '0.0°';
  if (redondeada > 0) return `+${redondeada.toFixed(1)}° E`;
  return `${redondeada.toFixed(1)}° O`;
}
</file>

<file path="src/utils/compassMath.ts">
import type { CardinalDirection } from '../types/compass';

const DIRECCIONES_CARDINALES: readonly CardinalDirection[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SO',
  'O',
  'NO',
];

const FACTOR_SUAVIZADO_DEFECTO = 0.22;

/**
 * Normaliza cualquier ángulo en grados al rango continuo [0, 360).
 * Devuelve 0 de forma segura ante valores no finitos (NaN, Infinity).
 */
export function normalizeHeading(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    return 0;
  }
  const normalizado = ((degrees % 360) + 360) % 360;
  return normalizado === 0 ? 0 : normalizado;
}

/**
 * Calcula la diferencia angular más corta entre dos rumbos en el rango [-180, 180].
 * Un valor positivo indica giro horario; un valor negativo, giro antihorario.
 */
export function shortestAngleDelta(from: number, to: number): number {
  const origen = normalizeHeading(from);
  const destino = normalizeHeading(to);
  const delta = ((destino - origen + 540) % 360) - 180;
  return Object.is(delta, -0) ? 0 : delta;
}

/**
 * Aplica interpolación circular (filtro paso-bajo exponencial) para suavizar
 * lecturas ruidosas del magnetómetro sin saltos al cruzar 0° / 360°.
 */
export function smoothHeading(
  current: number,
  target: number,
  alpha: number = FACTOR_SUAVIZADO_DEFECTO
): number {
  const factor = Number.isFinite(alpha)
    ? Math.min(1, Math.max(0, alpha))
    : FACTOR_SUAVIZADO_DEFECTO;
  const delta = shortestAngleDelta(current, target);
  return normalizeHeading(current + delta * factor);
}

/**
 * Mapea un azimut en grados [0, 360) a uno de los 8 puntos cardinales principales.
 */
export function getCardinalDirection(heading: number): CardinalDirection {
  const normalizado = normalizeHeading(heading);
  const indice = Math.floor((normalizado + 22.5) / 45) % DIRECCIONES_CARDINALES.length;
  return DIRECCIONES_CARDINALES[indice] ?? 'N';
}
</file>

<file path="src/utils/exportarSesion.ts">
import type {
  CategoriaAstroObjetivo,
  MetadatosExportacionSesion,
  ObjetivoPlanificado,
} from '../types/astronomy';

const ETIQUETA_CATEGORIA: Readonly<Record<CategoriaAstroObjetivo, string>> = {
  messier: 'Messier',
  estrella: 'Estrella',
  planeta: 'Planeta',
};

/**
 * Formatea Ascensión Recta (horas decimales) a formato "HHh MM.Mm".
 */
export function formatearRA(raHoras: number): string {
  if (!Number.isFinite(raHoras)) return '—';
  const normalizada = ((raHoras % 24) + 24) % 24;
  let horas = Math.floor(normalizada);
  let minutos = Math.round((normalizada - horas) * 600) / 10;
  if (minutos >= 60) {
    minutos = 0;
    horas = (horas + 1) % 24;
  }
  const hStr = String(horas).padStart(2, '0');
  const mStr = minutos.toFixed(1).padStart(4, '0');
  return `${hStr}h ${mStr}m`;
}

/**
 * Formatea Declinación (grados decimales) a formato "+DD° MM'".
 */
export function formatearDec(decGrados: number): string {
  if (!Number.isFinite(decGrados)) return '—';
  const signo = decGrados >= 0 ? '+' : '-';
  const abs = Math.abs(decGrados);
  let grados = Math.floor(abs);
  let minutos = Math.round((abs - grados) * 60);
  if (minutos >= 60) {
    minutos = 0;
    grados += 1;
  }
  const gStr = String(grados).padStart(2, '0');
  const mStr = String(minutos).padStart(2, '0');
  return `${signo}${gStr}° ${mStr}'`;
}

function escaparCeldaMarkdown(texto: string): string {
  return texto.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function formatearFechaArchivo(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const anio = valida.getFullYear();
  const mes = String(valida.getMonth() + 1).padStart(2, '0');
  const dia = String(valida.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearFechaLegible(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'full',
    }).format(valida);
  } catch {
    return formatearFechaArchivo(valida);
  }
}

/**
 * Genera el contenido completo en formato Markdown (.md) de la hoja de observación nocturna.
 */
export function generarMarkdownSesion(
  objetivos: readonly ObjetivoPlanificado[],
  metadatos: MetadatosExportacionSesion
): string {
  const fechaLegible = formatearFechaLegible(metadatos.fecha);
  const ubicacionLimpia = metadatos.ubicacionNombre.trim() || 'Observatorio sin nombre';
  const faseLimpia = metadatos.faseLunar.trim() || 'Sin datos';
  const bortleSeguro = Number.isFinite(metadatos.bortle) ? Math.round(metadatos.bortle) : 4;
  const observados = objetivos.filter((o) => o.observado).length;

  const lineas: string[] = [
    '# Hoja de Observación Nocturna — SkyProject',
    '',
    `- **Fecha:** ${fechaLegible}`,
    `- **Ubicación:** ${ubicacionLimpia}`,
    `- **Escala Bortle:** Bortle ${bortleSeguro}`,
    `- **Fase lunar:** ${faseLimpia}`,
    `- **Progreso:** ${observados} / ${objetivos.length} observados`,
    '',
  ];

  if (objetivos.length === 0) {
    lineas.push('_No hay objetivos añadidos en esta sesión._', '');
    return lineas.join('\n');
  }

  lineas.push(
    '## Lista de objetivos (ordenados por culminación nocturna)',
    '',
    '| Estado | Astro | Categoría | Constelación | Mag | Coordenadas (AR / Dec) | Hora óptima / Culminación | Notas |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |'
  );

  for (const obj of objetivos) {
    const casilla = obj.observado ? '- [x]' : '- [ ]';
    const tituloAstro =
      obj.nombre.toLowerCase() === obj.codigo.toLowerCase()
        ? obj.nombre
        : `${obj.codigo} · ${obj.nombre}`;
    const categoria = ETIQUETA_CATEGORIA[obj.categoria];
    const constelacion = obj.constelacion || '—';
    const mag = Number.isFinite(obj.magnitud) ? obj.magnitud.toFixed(1) : '—';
    const coords = `AR ${formatearRA(obj.raHoras)} / Dec ${formatearDec(obj.decGrados)}`;
    const notas = obj.notas && obj.notas.trim().length > 0 ? obj.notas : '—';

    lineas.push(
      `| ${casilla} | ${escaparCeldaMarkdown(tituloAstro)} | ${categoria} | ${escaparCeldaMarkdown(constelacion)} | ${mag} | ${coords} | ${escaparCeldaMarkdown(obj.etiquetaHoraria)} | ${escaparCeldaMarkdown(notas)} |`
    );
  }

  lineas.push('');
  return lineas.join('\n');
}

/**
 * Descarga la hoja de observación nocturna como archivo Markdown (.md)
 * revocando siempre la URL temporal del Blob para liberar memoria.
 */
export function descargarSesionMarkdown(
  objetivos: ObjetivoPlanificado[],
  metadatos: MetadatosExportacionSesion
): void {
  const contenido = generarMarkdownSesion(objetivos, metadatos);
  const blob = new Blob([contenido], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `sesion-observacion-${formatearFechaArchivo(metadatos.fecha)}.md`;
    enlace.rel = 'noopener';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prepara la vista imprimible dedicada (hoja @media print) y lanza la impresión/exportación a PDF.
 */
export function imprimirHojaObservacionPDF(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const cuerpo = document.body;
  cuerpo.classList.add('imprimiendo-sesion');

  const restaurar = () => {
    cuerpo.classList.remove('imprimiendo-sesion');
    window.removeEventListener('afterprint', restaurar);
  };

  window.addEventListener('afterprint', restaurar, { once: true });

  try {
    window.print();
  } finally {
    // Garantiza limpieza incluso en entornos donde afterprint no se dispara de forma síncrona
    window.setTimeout(restaurar, 500);
  }
}
</file>

<file path="src/utils/lunarCalculations.ts">
import * as Astronomy from 'astronomy-engine';
import type { GeoCoordinates, LunarData, MoonPhaseName } from '../types/astronomy';

export const CICLO_SINODICO_DIAS = 29.530588853;
export const ZONA_HORARIA_POR_DEFECTO = 'Europe/Madrid';
export const TEXTO_SIN_ORTO = 'Sin orto hoy';
export const TEXTO_SIN_OCASO = 'Sin ocaso hoy';

const MS_POR_DIA = 86_400_000;

export interface LimitesDiaCivilUTC {
  inicioDiaUTC: Date;
  finDiaUTC: Date;
  anio: number;
  mes: number;
  dia: number;
  claveDiaCivil: string;
}

export interface EfemeridesSolaresDia {
  amanecer: Date | null;
  atardecer: Date | null;
  crepusculoAstronomicoInicio: Date | null; // Sol baja de -18° (inicio noche astronómica)
  crepusculoAstronomicoFin: Date | null; // Sol sube de -18° (fin noche astronómica)
  horaDoradaInicio: Date | null; // Sol baja de +6° antes del atardecer
  horaAzulInicio: Date | null; // Sol baja de -4° tras el atardecer
  esDiaPolar: boolean;
  esNochePolar: boolean;
}

/**
 * Comprueba si una cadena corresponde a una zona horaria IANA válida
 * soportada por `Intl.DateTimeFormat`.
 */
export function esZonaHorariaIANAValida(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  const limpia = valor.trim();
  if (limpia.length === 0 || limpia.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: limpia });
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard estricto para validar coordenadas geográficas con zona horaria IANA.
 */
export function esGeoCoordinatesValido(valor: unknown): valor is GeoCoordinates {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const obj = valor as Record<string, unknown>;
  const nombreValido = obj.name === undefined || typeof obj.name === 'string';
  return (
    typeof obj.latitude === 'number' &&
    Number.isFinite(obj.latitude) &&
    obj.latitude >= -90 &&
    obj.latitude <= 90 &&
    typeof obj.longitude === 'number' &&
    Number.isFinite(obj.longitude) &&
    obj.longitude >= -180 &&
    obj.longitude <= 180 &&
    esZonaHorariaIANAValida(obj.timezone) &&
    nombreValido
  );
}

/**
 * Infiere de forma determinista y sin red una zona horaria IANA razonable a partir
 * de latitud y longitud cuando el usuario no ha indicado una explícitamente.
 */
export function inferirZonaHorariaPorCoordenadas(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return ZONA_HORARIA_POR_DEFECTO;
  }

  // Islas Canarias
  if (latitude >= 27.4 && latitude <= 29.6 && longitude >= -18.5 && longitude <= -13.2) {
    return 'Atlantic/Canary';
  }
  // España peninsular y Baleares
  if (latitude >= 35.8 && latitude <= 43.9 && longitude >= -9.5 && longitude <= 4.5) {
    return 'Europe/Madrid';
  }
  // Reino Unido e Irlanda
  if (latitude >= 49.8 && latitude <= 60.9 && longitude >= -10.8 && longitude <= 2.0) {
    return 'Europe/London';
  }
  // Europa Central / Svalbard (Noruega)
  if (latitude >= 44.0 && latitude <= 81.0 && longitude >= 4.5 && longitude <= 25.0) {
    return 'Europe/Berlin';
  }
  // Japón
  if (latitude >= 24.0 && latitude <= 46.0 && longitude >= 122.0 && longitude <= 146.0) {
    return 'Asia/Tokyo';
  }
  // Costa Este EE. UU.
  if (latitude >= 24.5 && latitude <= 47.5 && longitude >= -85.0 && longitude <= -66.5) {
    return 'America/New_York';
  }
  // Costa Oeste EE. UU.
  if (latitude >= 32.0 && latitude <= 49.0 && longitude >= -125.0 && longitude <= -114.0) {
    return 'America/Los_Angeles';
  }
  // Chile / Andes astronómicos
  if (latitude >= -56.0 && latitude <= -17.5 && longitude >= -76.0 && longitude <= -66.5) {
    return 'America/Santiago';
  }
  // Australia Este
  if (latitude >= -44.0 && latitude <= -10.0 && longitude >= 140.0 && longitude <= 155.0) {
    return 'Australia/Sydney';
  }

  // Fallback universal IANA basado en huso horario solar (POSIX Etc/GMT invierte el signo)
  const offsetHoras = Math.max(-12, Math.min(14, Math.round(longitude / 15)));
  if (offsetHoras === 0) return 'UTC';
  const etcTz = offsetHoras > 0 ? `Etc/GMT-${offsetHoras}` : `Etc/GMT+${Math.abs(offsetHoras)}`;
  return esZonaHorariaIANAValida(etcTz) ? etcTz : 'UTC';
}

export function normalizarZonaHoraria(timezone: unknown, latitude?: number, longitude?: number): string {
  if (esZonaHorariaIANAValida(timezone)) {
    return timezone.trim();
  }
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return inferirZonaHorariaPorCoordenadas(latitude, longitude);
  }
  return ZONA_HORARIA_POR_DEFECTO;
}

/**
 * Obtiene el desfase en milisegundos de una zona horaria IANA respecto a UTC en un instante dado.
 * Ejemplo: para `Europe/Madrid` en invierno (UTC+1) devuelve `+3_600_000`.
 */
function obtenerDesfaseZonaMs(fechaUTC: Date, timeZone: string): number {
  const formateador = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const partes = formateador.formatToParts(fechaUTC);
  let year = fechaUTC.getUTCFullYear();
  let month = fechaUTC.getUTCMonth() + 1;
  let day = fechaUTC.getUTCDate();
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const parte of partes) {
    const num = Number(parte.value);
    if (!Number.isFinite(num)) continue;
    if (parte.type === 'year') year = num;
    else if (parte.type === 'month') month = num;
    else if (parte.type === 'day') day = num;
    else if (parte.type === 'hour') hour = num === 24 ? 0 : num;
    else if (parte.type === 'minute') minute = num;
    else if (parte.type === 'second') second = num;
  }

  const comoUTC = Date.UTC(year, month - 1, day, hour, minute, second);
  // Truncar milisegundos del instante base para evitar errores de ±1ms
  const baseSinMs = Math.floor(fechaUTC.getTime() / 1000) * 1000;
  return comoUTC - baseSinMs;
}

/**
 * Convierte una fecha civil local `(anio, mes 1-12, dia, hora, minuto)` de una zona IANA
 * en el instante UTC exacto correspondiente, resolviendo transiciones DST.
 */
export function crearFechaUTCDesdeCivil(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  timeZone: string
): Date {
  const tzSegura = esZonaHorariaIANAValida(timeZone) ? timeZone : ZONA_HORARIA_POR_DEFECTO;
  const aproximacion = Date.UTC(anio, mes - 1, dia, hora, minuto, 0, 0);
  const desfase1 = obtenerDesfaseZonaMs(new Date(aproximacion), tzSegura);
  const paso1 = aproximacion - desfase1;
  const desfase2 = obtenerDesfaseZonaMs(new Date(paso1), tzSegura);
  return new Date(aproximacion - desfase2);
}

/**
 * Obtiene los componentes de calendario civil `(anio, mes, dia)` de un instante en `timeZone`.
 */
export function obtenerComponentesDiaCivil(
  fecha: Date,
  timeZone: string
): { anio: number; mes: number; dia: number; claveDiaCivil: string } {
  const tzSegura = esZonaHorariaIANAValida(timeZone) ? timeZone : ZONA_HORARIA_POR_DEFECTO;
  const fechaValida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tzSegura,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fechaValida);

  let anio = fechaValida.getUTCFullYear();
  let mes = fechaValida.getUTCMonth() + 1;
  let dia = fechaValida.getUTCDate();

  for (const parte of partes) {
    const num = Number(parte.value);
    if (!Number.isFinite(num)) continue;
    if (parte.type === 'year') anio = num;
    else if (parte.type === 'month') mes = num;
    else if (parte.type === 'day') dia = num;
  }

  const claveDiaCivil = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
    dia
  ).padStart(2, '0')}`;

  return { anio, mes, dia, claveDiaCivil };
}

/**
 * Calcula el inicio y fin exactos en UTC del día civil correspondiente a `fechaReferencia`
 * dentro de la zona horaria IANA `timezone` (respetando días DST de 23h/24h/25h).
 */
export function obtenerLimitesDiaCivilUTC(
  fechaReferencia: Date,
  timezone: string
): LimitesDiaCivilUTC {
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  const { anio, mes, dia, claveDiaCivil } = obtenerComponentesDiaCivil(fechaReferencia, tzSegura);
  const inicioDiaUTC = crearFechaUTCDesdeCivil(anio, mes, dia, 0, 0, tzSegura);

  const siguienteCivil = new Date(Date.UTC(anio, mes - 1, dia + 1));
  let finDiaUTC = crearFechaUTCDesdeCivil(
    siguienteCivil.getUTCFullYear(),
    siguienteCivil.getUTCMonth() + 1,
    siguienteCivil.getUTCDate(),
    0,
    0,
    tzSegura
  );

  if (finDiaUTC.getTime() <= inicioDiaUTC.getTime()) {
    finDiaUTC = new Date(inicioDiaUTC.getTime() + MS_POR_DIA);
  }

  return {
    inicioDiaUTC,
    finDiaUTC,
    anio,
    mes,
    dia,
    claveDiaCivil,
  };
}

/**
 * Clasifica el ángulo de fase lunar [0, 360) en una de las 8 fases lunares en español.
 */
export function obtenerNombreFaseLunarDesdeAngulo(anguloGrados: number): MoonPhaseName {
  const normalizado = ((anguloGrados % 360) + 360) % 360;
  if (normalizado < 22.5 || normalizado >= 337.5) return 'Luna Nueva';
  if (normalizado < 67.5) return 'Luna Creciente';
  if (normalizado < 112.5) return 'Cuarto Creciente';
  if (normalizado < 157.5) return 'Gibosa Creciente';
  if (normalizado < 202.5) return 'Luna Llena';
  if (normalizado < 247.5) return 'Gibosa Menguante';
  if (normalizado < 292.5) return 'Cuarto Menguante';
  return 'Luna Menguante';
}

/**
 * Formatea una hora en la zona horaria IANA indicada de forma segura.
 * Si `fecha` es `null` o inválida devuelve `textoFallback` sin lanzar `TypeError`.
 */
export function formatearHoraEnZona(
  fecha: Date | null | undefined,
  timezone: string,
  textoFallback = '—'
): string {
  if (!fecha || !(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return textoFallback;
  }
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: tzSegura,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(fecha);
  } catch {
    return textoFallback;
  }
}

/**
 * Formatea fecha corta (ej. "27 nov 2026") en la zona horaria IANA de la ubicación.
 */
export function formatearFechaCortaEnZona(
  fecha: Date | null | undefined,
  timezone: string,
  textoFallback = '—'
): string {
  if (!fecha || !(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return textoFallback;
  }
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: tzSegura,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
  } catch {
    return textoFallback;
  }
}

function buscarEventoEnRangoCivil(
  busqueda: () => Astronomy.AstroTime | null,
  inicioMs: number,
  finMs: number
): Date | null {
  try {
    const resultado = busqueda();
    if (!resultado) return null;
    const fecha = resultado.date;
    const ms = fecha.getTime();
    if (Number.isNaN(ms) || ms < inicioMs || ms >= finMs) {
      return null;
    }
    return fecha;
  } catch {
    return null;
  }
}

/**
 * Calcula de forma determinista todos los datos lunares (`LunarData`) en UTC
 * y evalúa orto/ocaso exactamente sobre el día civil de `coordinates.timezone`.
 */
export function calcularDatosLunares(
  fecha: Date,
  coordinates: GeoCoordinates,
  altitudMetros = 0
): LunarData | null {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  if (!esGeoCoordinatesValido(coordinates)) return null;

  const altitudSegura = Number.isFinite(altitudMetros)
    ? Math.max(-500, Math.min(9000, altitudMetros))
    : 0;

  const fechaUTC = new Date(fecha.getTime());
  const observador = new Astronomy.Observer(
    coordinates.latitude,
    coordinates.longitude,
    altitudSegura
  );

  // Fase normalizada [0, 1) e iluminación [0, 100] calculadas estrictamente en UTC
  const anguloBruto = Astronomy.MoonPhase(fechaUTC);
  const anguloNormalizado = ((anguloBruto % 360) + 360) % 360;
  const phase = Number((anguloNormalizado / 360).toFixed(6)) % 1;
  const phaseName = obtenerNombreFaseLunarDesdeAngulo(anguloNormalizado);

  const brilloLunar = Astronomy.Illumination(Astronomy.Body.Moon, fechaUTC);
  const fraccionSegura = Math.max(0, Math.min(1, brilloLunar.phase_fraction));
  const illumination = Number((fraccionSegura * 100).toFixed(1));

  // Edad lunar real en días desde la última Luna Nueva
  let ageDays = phase * CICLO_SINODICO_DIAS;
  try {
    const ultimaNueva = Astronomy.SearchMoonPhase(0, fechaUTC, -35);
    if (ultimaNueva) {
      const diasTranscurridos = (fechaUTC.getTime() - ultimaNueva.date.getTime()) / MS_POR_DIA;
      if (Number.isFinite(diasTranscurridos) && diasTranscurridos >= 0) {
        ageDays = Math.min(CICLO_SINODICO_DIAS, diasTranscurridos);
      }
    }
  } catch {
    // Mantiene el cálculo determinista basado en fase normalizada
  }
  ageDays = Number(ageDays.toFixed(2));

  // Orto y ocaso dentro del día civil de `coordinates.timezone`
  const { inicioDiaUTC, finDiaUTC } = obtenerLimitesDiaCivilUTC(fechaUTC, coordinates.timezone);
  const inicioMs = inicioDiaUTC.getTime();
  const finMs = finDiaUTC.getTime();
  const duracionDias = (finMs - inicioMs) / MS_POR_DIA;

  const moonrise = buscarEventoEnRangoCivil(
    () => Astronomy.SearchRiseSet(Astronomy.Body.Moon, observador, 1, inicioDiaUTC, duracionDias),
    inicioMs,
    finMs
  );

  const moonset = buscarEventoEnRangoCivil(
    () => Astronomy.SearchRiseSet(Astronomy.Body.Moon, observador, -1, inicioDiaUTC, duracionDias),
    inicioMs,
    finMs
  );

  // Próxima Luna Llena y próxima Luna Nueva a partir del instante UTC
  let nextFullMoon: Date | null = null;
  let nextNewMoon: Date | null = null;
  try {
    let cuarto = Astronomy.SearchMoonQuarter(fechaUTC);
    for (let i = 0; i < 6 && (!nextFullMoon || !nextNewMoon); i++) {
      if (cuarto.quarter === 2 && !nextFullMoon) {
        nextFullMoon = cuarto.time.date;
      } else if (cuarto.quarter === 0 && !nextNewMoon) {
        nextNewMoon = cuarto.time.date;
      }
      cuarto = Astronomy.NextMoonQuarter(cuarto);
    }
  } catch {
    // Fallback abajo si astronomy-engine no resolviera los cuartos
  }

  const diasHastaLlena = ((0.5 - phase + 1) % 1 || 1) * CICLO_SINODICO_DIAS;
  const diasHastaNueva = ((1 - phase) % 1 || 1) * CICLO_SINODICO_DIAS;

  return {
    phase,
    phaseName,
    illumination,
    ageDays,
    moonrise,
    moonset,
    nextFullMoon: nextFullMoon ?? new Date(fechaUTC.getTime() + diasHastaLlena * MS_POR_DIA),
    nextNewMoon: nextNewMoon ?? new Date(fechaUTC.getTime() + diasHastaNueva * MS_POR_DIA),
  };
}

/**
 * Calcula efemérides solares clave (orto, ocaso, crepúsculo astronómico y horas dorada/azul)
 * para el día civil de `coordinates.timezone`, cubriendo zonas polares sin lanzar errores.
 */
export function calcularEfemeridesSolaresDia(
  fecha: Date,
  coordinates: GeoCoordinates,
  altitudMetros = 0
): EfemeridesSolaresDia | null {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  if (!esGeoCoordinatesValido(coordinates)) return null;

  const altitudSegura = Number.isFinite(altitudMetros)
    ? Math.max(-500, Math.min(9000, altitudMetros))
    : 0;

  const observador = new Astronomy.Observer(
    coordinates.latitude,
    coordinates.longitude,
    altitudSegura
  );

  const { inicioDiaUTC, finDiaUTC } = obtenerLimitesDiaCivilUTC(fecha, coordinates.timezone);
  const inicioMs = inicioDiaUTC.getTime();
  const finMs = finDiaUTC.getTime();
  const duracionDias = (finMs - inicioMs) / MS_POR_DIA;

  const amanecer = buscarEventoEnRangoCivil(
    () => Astronomy.SearchRiseSet(Astronomy.Body.Sun, observador, 1, inicioDiaUTC, duracionDias),
    inicioMs,
    finMs
  );
  const atardecer = buscarEventoEnRangoCivil(
    () => Astronomy.SearchRiseSet(Astronomy.Body.Sun, observador, -1, inicioDiaUTC, duracionDias),
    inicioMs,
    finMs
  );

  const crepusculoAstronomicoInicio = buscarEventoEnRangoCivil(
    () =>
      Astronomy.SearchAltitude(Astronomy.Body.Sun, observador, -1, inicioDiaUTC, duracionDias, -18),
    inicioMs,
    finMs
  );
  const crepusculoAstronomicoFin = buscarEventoEnRangoCivil(
    () =>
      Astronomy.SearchAltitude(Astronomy.Body.Sun, observador, 1, inicioDiaUTC, duracionDias, -18),
    inicioMs,
    finMs
  );
  const horaDoradaInicio = buscarEventoEnRangoCivil(
    () =>
      Astronomy.SearchAltitude(Astronomy.Body.Sun, observador, -1, inicioDiaUTC, duracionDias, 6),
    inicioMs,
    finMs
  );
  const horaAzulInicio = buscarEventoEnRangoCivil(
    () =>
      Astronomy.SearchAltitude(Astronomy.Body.Sun, observador, -1, inicioDiaUTC, duracionDias, -4),
    inicioMs,
    finMs
  );

  // Mediodía civil para detectar día polar o noche polar cuando no hay orto ni ocaso
  const mediodiaUTC = new Date((inicioMs + finMs) / 2);
  const eqSol = Astronomy.Equator(Astronomy.Body.Sun, mediodiaUTC, observador, true, true);
  const horSol = Astronomy.Horizon(mediodiaUTC, observador, eqSol.ra, eqSol.dec, 'normal');

  const sinTransitoSolar = amanecer === null && atardecer === null;
  const esDiaPolar = sinTransitoSolar && horSol.altitude > 0;
  const esNochePolar = sinTransitoSolar && horSol.altitude <= 0;

  return {
    amanecer,
    atardecer,
    crepusculoAstronomicoInicio,
    crepusculoAstronomicoFin,
    horaDoradaInicio,
    horaAzulInicio,
    esDiaPolar,
    esNochePolar,
  };
}
</file>

<file path="src/utils/skyProjection.ts">
import type {
  HorizontalCoordinates,
  ProjectedPoint,
  ProjectedStar,
  SpectralClass,
  StarChartObserver,
} from '../types/starChart';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MS_PER_DAY = 86_400_000;
const UNIX_EPOCH_JD = 2_440_587.5;
const J2000_JD = 2_451_545.0;

const SPECTRAL_COLORS: Readonly<Record<SpectralClass, string>> = {
  O: '#9bb8ff',
  B: '#b6ccff',
  A: '#e8efff',
  F: '#fbf8ee',
  G: '#fff0c2',
  K: '#ffd29d',
  M: '#ffad75',
};

const SPECTRAL_LABELS: Readonly<Record<SpectralClass, string>> = {
  O: 'O · Azul intensa',
  B: 'B · Azul-blanca',
  A: 'A · Blanca azulada',
  F: 'F · Blanca cálida',
  G: 'G · Amarilla',
  K: 'K · Naranja suave',
  M: 'M · Naranja-rojiza',
};

/** Acota un valor numérico dentro del rango inclusivo [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normaliza un ángulo en grados al intervalo [0, 360). */
export function normalizeDegrees(deg: number): number {
  const normalized = ((deg % 360) + 360) % 360;
  return normalized === 360 || Object.is(normalized, -0) ? 0 : normalized;
}

/** Valida que un observador tenga coordenadas en rango y fecha válida. */
export function isValidStarChartObserver(observer: StarChartObserver): boolean {
  return (
    Number.isFinite(observer.latitude) &&
    observer.latitude >= -90 &&
    observer.latitude <= 90 &&
    Number.isFinite(observer.longitude) &&
    observer.longitude >= -180 &&
    observer.longitude <= 180 &&
    observer.date instanceof Date &&
    !Number.isNaN(observer.date.getTime())
  );
}

/** Convierte una fecha JavaScript (UTC) a Fecha Juliana (JD). */
export function toJulianDate(date: Date): number {
  return date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;
}

/**
 * Calcula el Tiempo Sidéreo Local (LST) en grados [0, 360)
 * usando la aproximación IAU/Meeus para GMST + longitud del observador (Este positivo).
 */
export function getLocalSiderealTimeDeg(date: Date, longitudeDeg: number): number {
  const jd = toJulianDate(date);
  const d = jd - J2000_JD;
  const t = d / 36_525;
  const gmstDeg =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38_710_000;

  return normalizeDegrees(gmstDeg + longitudeDeg);
}

/**
 * Transforma coordenadas ecuatoriales (RA en horas, Dec en grados)
 * a coordenadas horizontales (Altitud en [-90, 90], Azimut en [0, 360) desde N hacia E).
 * Usa clamping defensivo en [-1, 1] y atan2 para evitar NaN en los polos o en el cenit.
 */
export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  observer: StarChartObserver
): HorizontalCoordinates {
  const latRad = clamp(observer.latitude, -90, 90) * DEG_TO_RAD;
  const decRad = clamp(decDeg, -90, 90) * DEG_TO_RAD;
  const lstDeg = getLocalSiderealTimeDeg(observer.date, observer.longitude);
  const haRad = normalizeDegrees(lstDeg - raHours * 15) * DEG_TO_RAD;

  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinHa = Math.sin(haRad);
  const cosHa = Math.cos(haRad);

  const sinAlt = clamp(sinDec * sinLat + cosDec * cosLat * cosHa, -1, 1);
  const altitudeDeg = Math.asin(sinAlt) * RAD_TO_DEG;

  // Componentes locales Norte y Este en el plano del horizonte
  const north = sinDec * cosLat - cosDec * sinLat * cosHa;
  const east = -cosDec * sinHa;
  const azimuthDeg = normalizeDegrees(Math.atan2(east, north) * RAD_TO_DEG);

  return { altitudeDeg, azimuthDeg };
}

/**
 * Proyección estereográfica cenital sobre un disco de radio `radius`.
 * Convención celeste mirando hacia el cenit:
 * - Norte (0°) arriba: y = centerY - r
 * - Este (90°) a la izquierda: x = centerX - r
 * - Sur (180°) abajo: y = centerY + r
 * - Oeste (270°) a la derecha: x = centerX + r
 */
export function projectStereographic(
  altDeg: number,
  azDeg: number,
  centerX: number,
  centerY: number,
  radius: number
): ProjectedPoint {
  // Evita singularidad en el nadir (alt = -90°) al proyectar extremos bajo el horizonte
  const safeAlt = clamp(altDeg, -85, 90);
  const zenithDistanceRad = ((90 - safeAlt) / 2) * DEG_TO_RAD;
  const projectedRadius = radius * Math.tan(zenithDistanceRad);
  const azRad = azDeg * DEG_TO_RAD;

  return {
    x: centerX - projectedRadius * Math.sin(azRad),
    y: centerY - projectedRadius * Math.cos(azRad),
  };
}

/** Convierte la magnitud aparente en radio visual de estrella (píxeles CSS). */
export function magnitudeToRadius(magnitude: number): number {
  return clamp(4.35 - magnitude * 0.62, 1.35, 5.4);
}

/** Devuelve el color sutil realista asociado a una clase espectral. */
export function getSpectralColor(spectralClass: SpectralClass): string {
  return SPECTRAL_COLORS[spectralClass];
}

/** Devuelve una descripción legible en español de la clase espectral. */
export function getSpectralLabel(spectralClass: SpectralClass): string {
  return SPECTRAL_LABELS[spectralClass];
}

/** Convierte un azimut en grados [0, 360) a abreviatura cardinal en español. */
export function azimuthToCardinal(azimuthDeg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
  const normalized = normalizeDegrees(azimuthDeg);
  const index = Math.round(normalized / 45) % dirs.length;
  return dirs[index] ?? 'N';
}

/**
 * Localiza la estrella visible más cercana al punto (x, y) dentro del radio `hitRadius`.
 * Si varias estrellas están dentro del radio, devuelve la de menor distancia euclídea.
 */
export function findNearestStar(
  x: number,
  y: number,
  stars: ReadonlyArray<ProjectedStar>,
  hitRadius = 16
): ProjectedStar | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || hitRadius <= 0) {
    return null;
  }

  let nearest: ProjectedStar | null = null;
  let minDistance = hitRadius;

  for (const candidate of stars) {
    if (!candidate.visible) continue;
    const dist = Math.hypot(candidate.x - x, candidate.y - y);
    if (dist <= minDistance) {
      minDistance = dist;
      nearest = candidate;
    }
  }

  return nearest;
}
</file>

<file path="src/components/PlanificadorSesionModal.tsx">
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
  formatearRA,
  imprimirHojaObservacionPDF,
} from '../utils/exportarSesion';
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

function formatearFechaEncabezado(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long',
    }).format(valida);
  } catch {
    return valida.toISOString().slice(0, 10);
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
                <span>{formatearFechaEncabezado(metadatos.fecha)}</span>
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
                onClick={() => descargarSesionMarkdown(objetivos, metadatos)}
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
          <dd>{formatearFechaEncabezado(metadatos.fecha)}</dd>
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
                  <td>{obj.etiquetaHoraria}</td>
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
</file>

<file path="vite.config.ts">
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SkyProject — Observatorio Personal',
        short_name: 'SkyProject',
        description: 'Mapa celeste interactivo, efemérides y meteorología astronómica offline-first.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
</file>

<file path="index.html">
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.open-meteo.com; object-src 'none'; base-uri 'self'; form-action 'self';"
    />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#020617" />
    <title>SkyProject — Mapa Celeste</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</file>

<file path="package.json">
{
  "name": "sky_project",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@capacitor/core": "^8.6.2",
    "@fontsource-variable/inter": "^5.3.0",
    "@fontsource-variable/jetbrains-mono": "^5.3.0",
    "@fontsource-variable/space-grotesk": "^5.3.0",
    "@tailwindcss/vite": "^4.3.5",
    "astronomy-engine": "^2.1.19",
    "lucide-react": "^1.80.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "tailwindcss": "^4.3.5"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.6.2",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^10.14.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.7",
    "globals": "^17.13.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.72.1",
    "vite": "^8.3.6",
    "vite-plugin-pwa": "^2.0.0",
    "vitest": "^5.1.2"
  }
}
</file>

<file path="src/components/Navbar.tsx">
import { useEffect, useId, useState } from 'react';
import { BookOpen, ClipboardList, Compass, Crosshair, Eye, MapPin, Menu, Moon, Sparkles, Sun, Telescope, X } from 'lucide-react';
import type { TemaVisual, Ubicacion, VistaActiva } from '../types/astronomy';

interface NavbarProps {
  tema: TemaVisual;
  onCambiarTema: (tema: TemaVisual) => void;
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  onAbrirBrujula: () => void;
  onAbrirPlanificador: () => void;
  totalObjetivosSesion: number;
  ubicacion: Ubicacion;
  panelUbicacionAbierto: boolean;
  onAlternarUbicacion: () => void;
  onDetectarGPS: () => void;
  cargandoGPS: boolean;
}

interface ElementoNavegacion {
  vista: VistaActiva;
  etiqueta: string;
  descripcion: string;
  Icono: typeof Telescope;
}

const ELEMENTOS_NAVEGACION: ElementoNavegacion[] = [
  {
    vista: 'observatorio',
    etiqueta: 'Observatorio',
    descripcion: 'Mapa celeste, meteorología, eventos y Sistema Solar',
    Icono: Telescope,
  },
  {
    vista: 'carta',
    etiqueta: 'Carta Astronómica',
    descripcion: 'Planisferio 2D interactivo con estrellas y constelaciones',
    Icono: Sparkles,
  },
  {
    vista: 'guia',
    etiqueta: 'Guía de uso',
    descripcion: 'Cómo usar SkyProject y astronomía básica',
    Icono: BookOpen,
  },
];

const OPCIONES_TEMA: { tema: TemaVisual; etiqueta: string; Icono: typeof Moon; titulo: string }[] = [
  { tema: 'oscuro', etiqueta: 'Oscuro', Icono: Moon, titulo: 'Tema oscuro' },
  { tema: 'claro', etiqueta: 'Claro', Icono: Sun, titulo: 'Tema claro' },
  {
    tema: 'rojo',
    etiqueta: 'Filtro Rojo',
    Icono: Eye,
    titulo: 'Protege tu adaptación ocular en el campo',
  },
];

const CLASES_BARRA: Record<TemaVisual, string> = {
  oscuro:
    'bg-slate-950/60 backdrop-blur-xl border-b border-cyan-400/15 shadow-[0_1px_24px_-12px_rgb(34_211_238/0.35)]',
  claro: 'bg-slate-50/90 backdrop-blur-xl border-b border-slate-300 text-slate-900 shadow-sm shadow-slate-900/8',
  rojo: 'bg-black border-b border-red-900/80',
};

const CLASES_MENU_MOVIL: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-950/90 backdrop-blur-xl border-cyan-400/15',
  claro: 'bg-slate-50/95 backdrop-blur-xl border-slate-300 text-slate-900',
  rojo: 'bg-black border-red-900/80',
};

const CLASE_ACENTO: Record<TemaVisual, string> = {
  oscuro: 'text-cyan-300',
  claro: 'text-sky-700',
  rojo: 'text-red-500',
};

function obtenerClaseNavActiva(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-transparent opacity-80 hover:opacity-100 hover:bg-current/5';
  if (tema === 'rojo') return 'border-red-700 bg-red-950/70 text-red-400';
  if (tema === 'claro') return 'border-slate-900 bg-slate-900 text-slate-50';
  return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200';
}

function obtenerClaseBotonTema(temaActual: TemaVisual, boton: TemaVisual): string {
  if (temaActual !== boton) return 'opacity-80 hover:opacity-100';
  if (boton === 'oscuro') return 'bg-cyan-600/90 text-white';
  if (boton === 'claro') return 'bg-slate-900 text-slate-50';
  return 'bg-red-950 text-red-500 border border-red-600';
}

function obtenerClaseBotonBrujula(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-700 bg-red-950/50 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-slate-300 bg-slate-100/90 text-slate-900 hover:border-sky-700 hover:text-sky-800';
  return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-300/70';
}

export function Navbar({
  tema,
  onCambiarTema,
  vistaActiva,
  onCambiarVista,
  onAbrirBrujula,
  onAbrirPlanificador,
  totalObjetivosSesion,
  ubicacion,
  panelUbicacionAbierto,
  onAlternarUbicacion,
  onDetectarGPS,
  cargandoGPS,
}: NavbarProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const idMenu = useId();
  const claseAcento = CLASE_ACENTO[tema];

  // Cierra el menú móvil con Escape
  useEffect(() => {
    if (!menuAbierto) return;
    const manejarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [menuAbierto]);

  const irAVista = (vista: VistaActiva) => {
    onCambiarVista(vista);
    setMenuAbierto(false);
  };

  const abrirBrujula = () => {
    setMenuAbierto(false);
    onAbrirBrujula();
  };

  const abrirPlanificador = () => {
    setMenuAbierto(false);
    onAbrirPlanificador();
  };

  const selectorTema = (compacto: boolean) => (
    <div
      role="group"
      aria-label="Tema visual"
      className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5"
    >
      {OPCIONES_TEMA.map(({ tema: opcion, etiqueta, Icono, titulo }) => (
        <button
          key={opcion}
          type="button"
          onClick={() => onCambiarTema(opcion)}
          aria-label={`Cambiar a ${titulo.toLowerCase()}`}
          aria-pressed={tema === opcion}
          title={titulo}
          className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 min-h-11 md:min-h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${obtenerClaseBotonTema(
            tema,
            opcion
          )}`}
        >
          <Icono className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className={compacto ? 'hidden xl:inline' : ''}>{etiqueta}</span>
          {compacto && <span className="sr-only xl:hidden">{etiqueta}</span>}
        </button>
      ))}
    </div>
  );

  const botonUbicacion = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          onAlternarUbicacion();
          setMenuAbierto(false);
        }}
        aria-expanded={panelUbicacionAbierto}
        aria-controls="panel-ubicacion"
        title="Configurar punto de observación"
        className="flex min-w-0 items-center gap-1.5 px-2.5 min-h-11 md:min-h-9 rounded-lg border border-current/20 hover:bg-current/10 text-xs cursor-pointer transition-colors"
      >
        <MapPin className={`w-3.5 h-3.5 shrink-0 ${claseAcento}`} aria-hidden="true" />
        <span className="truncate max-w-48 lg:max-w-40">{ubicacion.nombre}</span>
        <span className="font-mono opacity-70 hidden lg:inline">
          {ubicacion.latitud.toFixed(2)}°, {ubicacion.longitud.toFixed(2)}°
        </span>
      </button>
      <button
        type="button"
        onClick={onDetectarGPS}
        disabled={cargandoGPS}
        aria-label={cargandoGPS ? 'Obteniendo ubicación GPS' : 'Usar ubicación GPS actual'}
        title="Usar ubicación GPS actual"
        className="flex items-center justify-center min-w-11 min-h-11 md:min-w-9 md:min-h-9 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer disabled:opacity-50 transition-colors"
      >
        <Crosshair
          className={`w-4 h-4 ${cargandoGPS ? 'motion-safe:animate-spin' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );

  return (
    <nav
      aria-label="Navegación principal"
      className={`sticky top-0 z-30 transition-colors duration-300 ${CLASES_BARRA[tema]}`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        {/* Marca */}
        <button
          type="button"
          onClick={() => irAVista('observatorio')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
          aria-label="SkyProject, ir al Observatorio"
        >
          <span
            className={`relative grid place-items-center w-9 h-9 rounded-xl border border-current/25 ${claseAcento}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" stroke="currentColor">
              <circle cx="16" cy="16" r="11" strokeWidth="1.5" strokeOpacity="0.6" />
              <ellipse cx="16" cy="16" rx="11" ry="4.5" strokeWidth="1.2" strokeOpacity="0.45" />
              <path d="M16 3v4M16 25v4M3 16h4M25 16h4" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold tracking-tight leading-none">
              SkyProject
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] opacity-60 font-mono mt-1 truncate">
              Observatorio personal
            </span>
          </span>
        </button>

        {/* Navegación de escritorio */}
        <div className="hidden md:flex items-center gap-1">
          {ELEMENTOS_NAVEGACION.map(({ vista, etiqueta, descripcion, Icono }) => {
            const activo = vistaActiva === vista;
            return (
              <button
                key={vista}
                type="button"
                onClick={() => irAVista(vista)}
                aria-current={activo ? 'page' : undefined}
                title={descripcion}
                className={`flex items-center gap-2 px-3 min-h-9 rounded-lg border text-sm font-medium font-display cursor-pointer transition-colors ${obtenerClaseNavActiva(
                  tema,
                  activo
                )}`}
              >
                <Icono className="w-4 h-4" aria-hidden="true" />
                {etiqueta}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Acceso directo al Planificador de sesión nocturna */}
          <button
            type="button"
            onClick={abrirPlanificador}
            aria-haspopup="dialog"
            aria-label={
              totalObjetivosSesion > 0
                ? `Abrir planificador de sesión nocturna (${totalObjetivosSesion} objetivos)`
                : 'Abrir planificador de sesión nocturna'
            }
            title="Abrir el planificador de sesión nocturna"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 min-h-11 md:min-h-9 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${obtenerClaseBotonBrujula(
              tema
            )}`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="font-display hidden sm:inline">Sesión</span>
            {totalObjetivosSesion > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-current/15 font-mono text-[10px] leading-none">
                {totalObjetivosSesion}
              </span>
            )}
          </button>

          {/* Acceso directo a la Brújula 3D (siempre visible) */}
          <button
            type="button"
            onClick={abrirBrujula}
            aria-haspopup="dialog"
            title="Abrir la Brújula Astronómica 3D"
            className={`flex items-center gap-2 pl-2 pr-3 min-h-11 md:min-h-9 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${obtenerClaseBotonBrujula(
              tema
            )}`}
          >
            <span
              className="grid place-items-center w-7 h-7 rounded-full border border-current/40"
              aria-hidden="true"
            >
              <Compass className="w-4 h-4 brujula-icono-animada" />
            </span>
            <span className="font-display">Brújula 3D</span>
          </button>

          {/* Controles de escritorio */}
          <div className="hidden md:flex items-center gap-2">
            {botonUbicacion}
            {selectorTema(true)}
          </div>

          {/* Botón hamburguesa (móvil) */}
          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            aria-expanded={menuAbierto}
            aria-controls={idMenu}
            aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            className="md:hidden grid place-items-center min-w-11 min-h-11 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer"
          >
            {menuAbierto ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      <div
        id={idMenu}
        hidden={!menuAbierto}
        className={`md:hidden border-t ${CLASES_MENU_MOVIL[tema]}`}
      >
        <div className="px-4 py-4 space-y-4">
          <ul className="space-y-1.5">
            {ELEMENTOS_NAVEGACION.map(({ vista, etiqueta, descripcion, Icono }) => {
              const activo = vistaActiva === vista;
              return (
                <li key={vista}>
                  <button
                    type="button"
                    onClick={() => irAVista(vista)}
                    aria-current={activo ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 min-h-12 rounded-xl border text-left cursor-pointer transition-colors ${obtenerClaseNavActiva(
                      tema,
                      activo
                    )}`}
                  >
                    <Icono className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-display font-semibold text-sm">{etiqueta}</span>
                      <span className="block text-[11px] opacity-70 truncate">{descripcion}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-60">
              Punto de observación
            </p>
            {botonUbicacion}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-60">Tema visual</p>
            {selectorTema(false)}
          </div>
        </div>
      </div>
    </nav>
  );
}
</file>

<file path="src/core/eventsCalculator.ts">
import * as Astronomy from 'astronomy-engine';
import type { EventoCeleste, Ubicacion } from '../types/astronomy';
import { LLUVIAS_ESTRELLAS } from '../data/meteorShowers';
import { esEntradaAstronomicaValida } from './skyCalculator';
import {
  crearFechaUTCDesdeCivil,
  normalizarZonaHoraria,
  obtenerComponentesDiaCivil,
} from '../utils/lunarCalculations';

const NOMBRES_ECLIPSE: Record<string, string> = {
  total: 'Total',
  partial: 'Parcial',
  annular: 'Anular',
  penumbral: 'Penumbral',
};

function calcularDiasRestantesEnZona(desde: Date, hasta: Date, timezone: string): number {
  const cDesde = obtenerComponentesDiaCivil(desde, timezone);
  const cHasta = obtenerComponentesDiaCivil(hasta, timezone);
  const inicioDia = Date.UTC(cDesde.anio, cDesde.mes - 1, cDesde.dia);
  const finDia = Date.UTC(cHasta.anio, cHasta.mes - 1, cHasta.dia);
  return Math.round((finDia - inicioDia) / (1000 * 60 * 60 * 24));
}

function obtenerProximasLluvias(fechaBase: Date, timezone: string): EventoCeleste[] {
  const { anio: anioActual } = obtenerComponentesDiaCivil(fechaBase, timezone);

  return LLUVIAS_ESTRELLAS.map((lluvia) => {
    let fechaPico = crearFechaUTCDesdeCivil(
      anioActual,
      lluvia.mesPico,
      lluvia.diaPico,
      23,
      30,
      timezone
    );
    if (calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone) < 0) {
      fechaPico = crearFechaUTCDesdeCivil(
        anioActual + 1,
        lluvia.mesPico,
        lluvia.diaPico,
        23,
        30,
        timezone
      );
    }

    const anioPico = obtenerComponentesDiaCivil(fechaPico, timezone).anio;

    return {
      id: `lluvia-${lluvia.id}-${anioPico}`,
      titulo: lluvia.nombre,
      tipo: 'lluvia' as const,
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen: `Máximo ~${lluvia.thz} meteoros/h`,
      detalle: `Radiante: Const. ${lluvia.radiante}`,
    };
  });
}

function obtenerProximosEclipses(
  fechaBase: Date,
  ubicacion: Ubicacion,
  timezone: string
): EventoCeleste[] {
  const eventos: EventoCeleste[] = [];
  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  // 1. Próximos 2 eclipses lunares con comprobación de visibilidad local
  let fechaBusqueda = new Date(fechaBase);
  for (let i = 0; i < 2; i++) {
    const lunar = Astronomy.SearchLunarEclipse(fechaBusqueda);
    const fechaPico = lunar.peak.date;
    const tipoClave = String(lunar.kind).toLowerCase();
    const tipoStr = NOMBRES_ECLIPSE[tipoClave] ?? 'Lunar';

    const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, fechaPico, observador, true, true);
    const horLuna = Astronomy.Horizon(fechaPico, observador, eqLuna.ra, eqLuna.dec, 'normal');

    const resumen =
      tipoClave === 'penumbral'
        ? 'Eclipse penumbral (oscurecimiento sutil)'
        : `Oscurecimiento: ${Math.round(lunar.obscuration * 100)}%`;

    const detalle =
      horLuna.altitude > 0
        ? `Visible desde tu ubicación (Luna a ${horLuna.altitude.toFixed(1)}° en el máximo)`
        : `No visible desde tu ubicación (Luna bajo el horizonte: ${horLuna.altitude.toFixed(1)}°)`;

    eventos.push({
      id: `eclipse-lunar-${fechaPico.getTime()}`,
      titulo: `Eclipse Lunar ${tipoStr}`,
      tipo: 'eclipse',
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen,
      detalle,
    });

    fechaBusqueda = new Date(fechaPico.getTime() + 15 * 24 * 60 * 60 * 1000);
  }

  // 2. Próximos eclipses solares visibles sobre el horizonte en tu ubicación
  let fechaSolar = new Date(fechaBase);
  let encontrados = 0;
  let intentos = 0;
  let primerEclipseSolar: Astronomy.LocalSolarEclipseInfo | null = null;

  while (encontrados < 2 && intentos < 16) {
    intentos++;
    const solar = Astronomy.SearchLocalSolarEclipse(fechaSolar, observador);
    const fechaPico = solar.peak.time.date;

    if (!primerEclipseSolar) {
      primerEclipseSolar = solar;
    }

    if (solar.peak.altitude > 0) {
      const tipoStr = NOMBRES_ECLIPSE[String(solar.kind).toLowerCase()] ?? 'Solar';
      const porcentajeOcultacion = Number.isFinite(solar.obscuration)
        ? Math.round(solar.obscuration * 100)
        : 0;
      eventos.push({
        id: `eclipse-solar-${fechaPico.getTime()}`,
        titulo: `Eclipse Solar ${tipoStr}`,
        tipo: 'eclipse',
        fechaPico,
        diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
        resumen: `Ocultación local: ${porcentajeOcultacion}%`,
        detalle: `Altura del Sol en máximo: ${solar.peak.altitude.toFixed(1)}°`,
      });
      encontrados++;
    }

    fechaSolar = new Date(fechaPico.getTime() + 20 * 24 * 60 * 60 * 1000);
  }

  if (encontrados === 0 && primerEclipseSolar) {
    const fechaPico = primerEclipseSolar.peak.time.date;
    const tipoStr = NOMBRES_ECLIPSE[String(primerEclipseSolar.kind).toLowerCase()] ?? 'Solar';
    const porcentajeOcultacion = Number.isFinite(primerEclipseSolar.obscuration)
      ? Math.round(primerEclipseSolar.obscuration * 100)
      : 0;
    eventos.push({
      id: `eclipse-solar-${fechaPico.getTime()}`,
      titulo: `Eclipse Solar ${tipoStr}`,
      tipo: 'eclipse',
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen: `Ocultación local: ${porcentajeOcultacion}%`,
      detalle: `No visible desde tu ubicación (Sol bajo el horizonte: ${primerEclipseSolar.peak.altitude.toFixed(1)}°)`,
    });
  }

  return eventos;
}

export function calcularProximosEventos(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
  if (!esEntradaAstronomicaValida(fechaBase, ubicacion)) return [];

  const zonaHoraria = normalizarZonaHoraria(
    ubicacion.timezone,
    ubicacion.latitud,
    ubicacion.longitud
  );

  const lluvias = obtenerProximasLluvias(fechaBase, zonaHoraria);
  const eclipses = obtenerProximosEclipses(fechaBase, ubicacion, zonaHoraria);

  return [...lluvias, ...eclipses]
    .sort((a, b) => a.fechaPico.getTime() - b.fechaPico.getTime())
    .slice(0, 6);
}
</file>

<file path="src/core/weatherService.ts">
import type { CondicionesMeteo, FranjaHorariaMeteo, Ubicacion } from '../types/astronomy';
import { calcularEstadoSolar, esEntradaAstronomicaValida } from './skyCalculator';
import { formatearHoraEnZona } from '../utils/lunarCalculations';

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

function formatearHoraLocalFranja(fecha: Date, timezone?: string): string {
  if (timezone) {
    return formatearHoraEnZona(fecha, timezone);
  }
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
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
      horaLocal: formatearHoraLocalFranja(fechaFranja, ubicacion.timezone),
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
</file>

<file path="src/components/Compass3DModal.tsx">
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTecladoReact, PointerEvent as EventoPunteroReact } from 'react';
import { ArrowDown, ArrowUp, Check, Compass, Hand, Navigation, Smartphone, Target, X } from 'lucide-react';
import type {
  ConstructorOrientacionConPermiso,
  CuerpoCeleste,
  EstadoSensorBrujula,
  EventoOrientacionDispositivo,
  ObjetivoBrujula,
  OrientacionBrujula,
  TemaVisual,
  Ubicacion,
} from '../types/astronomy';
import {
  calcularDeclinacionMagnetica,
  formatearDeclinacionMagnetica,
} from '../utils/astronomia/declinacionMagnetica';
import { useCompassFilter } from '../hooks/useCompassFilter';
import { CompassFilter } from './CompassFilter';

interface Compass3DModalProps {
  tema: TemaVisual;
  cuerpos: CuerpoCeleste[];
  ubicacion: Pick<Ubicacion, 'latitud' | 'longitud'>;
  objetivoSeleccionado?: ObjetivoBrujula | null;
  cargandoCuerpos?: boolean;
  errorCuerpos?: string | null;
  onCerrar: () => void;
}

/* ── Utilidades angulares ─────────────────────────────────────────── */

function normalizarAngulo(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
}

/** Convierte rumbo magnético a acimut geográfico verdadero aplicando la declinación local. */
// eslint-disable-next-line react-refresh/only-export-components
export function aplicarDeclinacionMagnetica(
  rumboMagnetico: number,
  declinacionGrados: number
): number {
  if (!Number.isFinite(rumboMagnetico)) return 0;
  const declinacion = Number.isFinite(declinacionGrados) ? declinacionGrados : 0;
  return normalizarAngulo(rumboMagnetico + declinacion);
}

/** Diferencia por el camino más corto en el círculo, en el rango [-180, 180). */
function diferenciaAngular(destino: number, origen: number): number {
  return ((((destino - origen) % 360) + 540) % 360) - 180;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

const DIRECCIONES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;

function direccionCardinal(rumbo: number): string {
  return DIRECCIONES[Math.round(normalizarAngulo(rumbo) / 45) % 8];
}

function puntoPolar(angulo: number, radio: number): { x: number; y: number } {
  const rad = (angulo * Math.PI) / 180;
  return { x: CENTRO + Math.sin(rad) * radio, y: CENTRO - Math.cos(rad) * radio };
}

/* ── Geometría estática del disco (viewBox -20 -20 440 440) ──────── */

const CENTRO = 200;
const RADIO_ESFERA = 196;
const RADIO_MARCADORES = 187;
const RADIO_MARCAS = 175;
const MARGEN_ALINEACION = 8;
const INCLINACION_VISUAL_MAX = 65;
const UMBRAL_PROYECCION_HORIZONTAL = 0.15;
const ALTITUD_MANUAL_MIN = -60;
const ALTITUD_MANUAL_MAX = 90;
const ALTITUD_MANUAL_INICIAL = 25;

function obtenerAnguloPantalla(): number {
  if (typeof window === 'undefined') return 0;
  const angulo = window.screen?.orientation?.angle;
  return typeof angulo === 'number' && Number.isFinite(angulo) ? normalizarAngulo(angulo) : 0;
}

/**
 * Proyección matricial 3D estándar W3C (rotación intrínseca Z-X'-Y'') del vector
 * de la cámara trasera (0, 0, -1) al marco terrestre ENU (Este-Norte-Arriba),
 * compensando la rotación de pantalla (0°, 90°, 180°, 270°).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calcularOrientacionDesdeSensores(
  alpha: number,
  beta: number,
  gamma: number,
  anguloPantalla: number
): { rumbo: number; altitudApuntado: number } {
  const a = (alpha * Math.PI) / 180;
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  const s = (normalizarAngulo(anguloPantalla) * Math.PI) / 180;

  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  const cg = Math.cos(g);
  const sg = Math.sin(g);

  // Vector cámara trasera [0, 0, -1] proyectado por R = Rz(a) * Rx(b) * Ry(g)
  // (invariante respecto a la rotación de pantalla Rz(-s) alrededor del eje Z del dispositivo)
  const camX = -ca * sg - sa * sb * cg;
  const camY = -sa * sg + ca * sb * cg;
  const camZ = -cb * cg;

  const altitudApuntado = (Math.asin(limitar(camZ, -1, 1)) * 180) / Math.PI;

  let vx = camX;
  let vy = camY;

  // Cuando la proyección horizontal de la cámara trasera es casi nula (teléfono plano
  // o apuntando cerca del cenit), proyectar el borde superior de la pantalla Rz(-s) * [0, 1, 0]
  if (Math.hypot(vx, vy) < UMBRAL_PROYECCION_HORIZONTAL) {
    const cs = Math.cos(s);
    const ss = Math.sin(s);

    // Primera y segunda columnas de R (ejes +X y +Y del dispositivo en ENU)
    const r11 = ca * cg - sa * sb * sg;
    const r21 = sa * cg + ca * sb * sg;
    const r12 = -sa * cb;
    const r22 = ca * cb;

    // Si camZ > 0 (cámara apuntando casi al cenit), invertir el vector superior mantiene
    // la continuidad del acimut sin salto de 180° al pasar de ~81° a 90° de elevación.
    const signo = camZ > 0 ? -1 : 1;
    vx = signo * (r11 * ss + r12 * cs);
    vy = signo * (r21 * ss + r22 * cs);
  }

  const rumbo = normalizarAngulo((Math.atan2(vx, vy) * 180) / Math.PI);
  return { rumbo, altitudApuntado };
}

interface MarcaGraduacion {
  angulo: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tipo: 'menor' | 'media' | 'mayor';
}

const MARCAS: MarcaGraduacion[] = Array.from({ length: 72 }, (_, i) => {
  const angulo = i * 5;
  const tipo: MarcaGraduacion['tipo'] = angulo % 45 === 0 ? 'mayor' : angulo % 15 === 0 ? 'media' : 'menor';
  const largo = tipo === 'mayor' ? 16 : tipo === 'media' ? 11 : 5;
  const exterior = puntoPolar(angulo, RADIO_MARCAS);
  const interior = puntoPolar(angulo, RADIO_MARCAS - largo);
  return { angulo, x1: exterior.x, y1: exterior.y, x2: interior.x, y2: interior.y, tipo };
});

interface EtiquetaDisco {
  angulo: number;
  texto: string;
  x: number;
  y: number;
  tipo: 'cardinal' | 'intercardinal' | 'grado';
}

const ETIQUETAS: EtiquetaDisco[] = Array.from({ length: 24 }, (_, i) => {
  const angulo = i * 15;
  if (angulo % 90 === 0) {
    const p = puntoPolar(angulo, 141);
    return { angulo, texto: DIRECCIONES[angulo / 45], ...p, tipo: 'cardinal' as const };
  }
  if (angulo % 45 === 0) {
    const p = puntoPolar(angulo, 143);
    return { angulo, texto: DIRECCIONES[angulo / 45], ...p, tipo: 'intercardinal' as const };
  }
  const p = puntoPolar(angulo, 145);
  return { angulo, texto: String(angulo), ...p, tipo: 'grado' as const };
});

/* ── Paletas por tema (Filtro Rojo: solo rojos sobre negro puro) ── */

interface PaletaBrujula {
  esfera: string;
  esferaBorde: string;
  capa: string;
  marcaMenor: string;
  marcaMayor: string;
  texto: string;
  textoSuave: string;
  acento: string;
  norte: string;
  sur: string;
  aro: string;
  marcadorFijo: string | null;
  claseBackdrop: string;
  clasePanel: string;
  claseAcento: string;
  claseLectura: string;
  claseBotonPrimario: string;
  claseAviso: string;
  claseEstadoOk: string;
  claseEstadoAviso: string;
}

const PALETAS: Record<TemaVisual, PaletaBrujula> = {
  oscuro: {
    esfera: 'rgba(2,6,23,0.9)',
    esferaBorde: 'rgba(34,211,238,0.5)',
    capa: 'rgba(15,23,42,0.95)',
    marcaMenor: 'rgba(148,163,184,0.55)',
    marcaMayor: '#e2e8f0',
    texto: '#e2e8f0',
    textoSuave: '#94a3b8',
    acento: '#22d3ee',
    norte: '#f43f5e',
    sur: '#64748b',
    aro: 'rgba(34,211,238,0.3)',
    marcadorFijo: null,
    claseBackdrop: 'bg-slate-950/65',
    clasePanel: 'bg-slate-950/90 border-cyan-400/25 text-slate-100 shadow-2xl shadow-black/60',
    claseAcento: 'text-cyan-300',
    claseLectura: 'bg-slate-950/90 border-cyan-400/40 text-slate-50',
    claseBotonPrimario: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/25',
    claseAviso: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100',
    claseEstadoOk: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    claseEstadoAviso: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  claro: {
    esfera: 'rgba(248,250,252,0.96)',
    esferaBorde: '#334155',
    capa: '#cbd5e1',
    marcaMenor: '#94a3b8',
    marcaMayor: '#0f172a',
    texto: '#0f172a',
    textoSuave: '#475569',
    acento: '#0369a1',
    norte: '#e11d48',
    sur: '#94a3b8',
    aro: 'rgba(51,65,85,0.28)',
    marcadorFijo: null,
    claseBackdrop: 'bg-slate-900/45',
    clasePanel: 'bg-slate-50/95 border-slate-300 text-slate-900 shadow-2xl shadow-slate-900/20',
    claseAcento: 'text-sky-700',
    claseLectura: 'bg-slate-50/95 border-slate-300 text-slate-900',
    claseBotonPrimario: 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800',
    claseAviso: 'border-sky-600/50 bg-sky-50 text-sky-900',
    claseEstadoOk: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    claseEstadoAviso: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  rojo: {
    esfera: '#000000',
    esferaBorde: '#991b1b',
    capa: '#450a0a',
    marcaMenor: '#7f1d1d',
    marcaMayor: '#dc2626',
    texto: '#ef4444',
    textoSuave: '#b91c1c',
    acento: '#ef4444',
    norte: '#f87171',
    sur: '#7f1d1d',
    aro: 'rgba(153,27,27,0.55)',
    marcadorFijo: '#b91c1c',
    claseBackdrop: 'bg-black/90',
    clasePanel: 'bg-black border-red-800 text-red-500',
    claseAcento: 'text-red-500',
    claseLectura: 'bg-black border-red-700 text-red-500',
    claseBotonPrimario: 'bg-red-950 border-red-600 text-red-400 hover:bg-red-900/60',
    claseAviso: 'border-red-600 bg-red-950/60 text-red-400',
    claseEstadoOk: 'border-red-700 bg-red-950/50 text-red-400',
    claseEstadoAviso: 'border-red-900 bg-black text-red-600',
  },
};

const MENSAJES_ESTADO: Record<EstadoSensorBrujula, string> = {
  inactivo: 'Sensores en espera: pulsa «Activar sensores del dispositivo».',
  solicitando: 'Solicitando permiso de orientación…',
  buscando: 'Buscando lecturas del magnetómetro…',
  activo: 'Sensores activos: la brújula sigue a tu dispositivo.',
  denegado: 'Permiso denegado. Puedes seguir en modo simulación.',
  'no-disponible': 'Este equipo no dispone de sensores de orientación. Modo simulación activo.',
  inseguro: 'Los sensores requieren una conexión segura (HTTPS). Modo simulación activo.',
  'sin-lecturas': 'No se reciben lecturas del sensor en este equipo. Modo simulación activo.',
};

/** Determina el estado inicial de los sensores sin efectos secundarios. */
function detectarEstadoInicial(): EstadoSensorBrujula {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return 'no-disponible';
  }
  if (!window.isSecureContext) return 'inseguro';
  const constructor = DeviceOrientationEvent as unknown as ConstructorOrientacionConPermiso;
  return typeof constructor.requestPermission === 'function' ? 'inactivo' : 'buscando';
}

function prefiereMovimientoReducido(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function etiquetaMarcador(nombre: string): string {
  const token = nombre.split(' ')[0];
  if (/^M\d+$/i.test(token)) return token.slice(0, 3);
  return nombre.slice(0, 2);
}

const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Compass3DModal({
  tema,
  cuerpos,
  ubicacion,
  objetivoSeleccionado = null,
  cargandoCuerpos = false,
  errorCuerpos = null,
  onCerrar,
}: Compass3DModalProps) {
  const paleta = PALETAS[tema];
  const idTitulo = useId();
  const idDescripcion = useId();

  const declinacionMagnetica = useMemo(
    () => calcularDeclinacionMagnetica(ubicacion.latitud, ubicacion.longitud),
    [ubicacion.latitud, ubicacion.longitud]
  );
  const etiquetaDeclinacion = useMemo(
    () => formatearDeclinacionMagnetica(declinacionMagnetica),
    [declinacionMagnetica]
  );
  const declinacionRef = useRef(declinacionMagnetica);
  useEffect(() => {
    declinacionRef.current = declinacionMagnetica;
  }, [declinacionMagnetica]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null);
  const discoRef = useRef<HTMLDivElement | null>(null);

  const [estadoSensor, setEstadoSensor] = useState<EstadoSensorBrujula>(detectarEstadoInicial);
  const [referenciaSensor, setReferenciaSensor] = useState<'absoluta' | 'relativa' | null>(null);
  const [intentoSensor, setIntentoSensor] = useState(0);
  const [modoManual, setModoManual] = useState(false);
  const [rumboManual, setRumboManual] = useState(0);
  const [altitudManual, setAltitudManual] = useState(ALTITUD_MANUAL_INICIAL);
  const [visual, setVisual] = useState<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const [movimientoReducido] = useState(prefiereMovimientoReducido);

  const objetivoRef = useRef<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const visualRef = useRef<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const animacionIdRef = useRef<number>(0);
  const simulacionRef = useRef(true);
  const lecturaRecibidaRef = useRef(false);
  const lecturaAbsolutaRef = useRef(false);
  const referenciaRef = useRef<'absoluta' | 'relativa' | null>(null);
  const arrastreRef = useRef<{ idPuntero: number; anguloPrevio: number } | null>(null);

  const simulacion = modoManual || estadoSensor !== 'activo';
  const escuchando =
    estadoSensor === 'buscando' || estadoSensor === 'activo' || estadoSensor === 'sin-lecturas';

  // Referencia estable al callback de cierre (evita reiniciar el foco en cada render del padre)
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  /* Bloqueo de scroll, foco inicial, Escape y trampa de foco */
  useEffect(() => {
    const elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonCerrarRef.current?.focus();

    const manejarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrarRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !panelRef.current) return;
      const enfocables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
      ).filter((el) => !el.hasAttribute('hidden'));
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = overflowPrevio;
      elementoPrevio?.focus();
    };
  }, []);

  /* Suavizado angular bajo demanda (camino más corto, sin bucle activo en reposo) */
  const programarSuavizado = useCallback(() => {
    if (animacionIdRef.current !== 0) return;
    const factor = movimientoReducido ? 0.45 : 0.16;

    const paso = () => {
      const objetivo = objetivoRef.current;
      const actual = visualRef.current;
      const difRumbo = diferenciaAngular(objetivo.rumbo, actual.rumbo);
      const difInclinacion = objetivo.inclinacion - actual.inclinacion;
      const difAltitud = objetivo.altitudApuntado - actual.altitudApuntado;

      if (
        Math.abs(difRumbo) < 0.05 &&
        Math.abs(difInclinacion) < 0.05 &&
        Math.abs(difAltitud) < 0.05
      ) {
        if (
          actual.rumbo !== objetivo.rumbo ||
          actual.inclinacion !== objetivo.inclinacion ||
          actual.altitudApuntado !== objetivo.altitudApuntado
        ) {
          const exacto: OrientacionBrujula = {
            rumbo: objetivo.rumbo,
            inclinacion: objetivo.inclinacion,
            altitudApuntado: objetivo.altitudApuntado,
          };
          visualRef.current = exacto;
          setVisual(exacto);
        }
        animacionIdRef.current = 0;
        return;
      }

      const rumbo =
        Math.abs(difRumbo) < 0.05
          ? objetivo.rumbo
          : normalizarAngulo(actual.rumbo + difRumbo * factor);
      const inclinacion =
        Math.abs(difInclinacion) < 0.05
          ? objetivo.inclinacion
          : actual.inclinacion + difInclinacion * factor;
      const altitudApuntado =
        Math.abs(difAltitud) < 0.05
          ? objetivo.altitudApuntado
          : actual.altitudApuntado + difAltitud * factor;

      const siguiente: OrientacionBrujula = { rumbo, inclinacion, altitudApuntado };
      visualRef.current = siguiente;
      setVisual(siguiente);
      animacionIdRef.current = window.requestAnimationFrame(paso);
    };

    animacionIdRef.current = window.requestAnimationFrame(paso);
  }, [movimientoReducido]);

  useEffect(() => {
    return () => {
      if (animacionIdRef.current !== 0) {
        window.cancelAnimationFrame(animacionIdRef.current);
        animacionIdRef.current = 0;
      }
    };
  }, []);

  /* Sincroniza el objetivo con los controles manuales en modo simulación */
  useEffect(() => {
    simulacionRef.current = simulacion;
    if (simulacion) {
      const altitudAcotada = limitar(altitudManual, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX);
      objetivoRef.current = {
        rumbo: normalizarAngulo(rumboManual),
        inclinacion: limitar(altitudAcotada, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX),
        altitudApuntado: altitudAcotada,
      };
      programarSuavizado();
    }
  }, [simulacion, rumboManual, altitudManual, programarSuavizado]);

  /* Escucha de sensores: deviceorientationabsolute (prioritario) + deviceorientation */
  useEffect(() => {
    if (!escuchando || typeof DeviceOrientationEvent === 'undefined') return;

    const procesarOrientacion = (evento: Event) => {
      if (!(evento instanceof DeviceOrientationEvent)) return;
      const datos = evento as EventoOrientacionDispositivo;
      const anguloPantalla = obtenerAnguloPantalla();

      const alpha = typeof datos.alpha === 'number' && Number.isFinite(datos.alpha) ? datos.alpha : null;
      const beta = typeof datos.beta === 'number' && Number.isFinite(datos.beta) ? datos.beta : null;
      const gamma = typeof datos.gamma === 'number' && Number.isFinite(datos.gamma) ? datos.gamma : null;

      let rumbo: number | null = null;
      let altitudApuntado = 0;
      let absoluta = false;

      if (typeof datos.webkitCompassHeading === 'number' && Number.isFinite(datos.webkitCompassHeading)) {
        // Safari iOS: rumbo magnético absoluto referido al Norte magnético -> aplicar declinación local
        const rumboMagnetico = normalizarAngulo(datos.webkitCompassHeading + anguloPantalla);
        rumbo = aplicarDeclinacionMagnetica(rumboMagnetico, declinacionRef.current);
        absoluta = true;
        if (beta !== null || gamma !== null) {
          altitudApuntado = calcularOrientacionDesdeSensores(
            alpha ?? 0,
            beta ?? 0,
            gamma ?? 0,
            anguloPantalla
          ).altitudApuntado;
        }
      } else if (alpha !== null) {
        absoluta = evento.type === 'deviceorientationabsolute' || datos.absolute;
        // Si ya llegan lecturas absolutas, se descartan las relativas
        if (!absoluta && lecturaAbsolutaRef.current) return;
        const orientacion = calcularOrientacionDesdeSensores(
          alpha,
          beta ?? 0,
          gamma ?? 0,
          anguloPantalla
        );
        rumbo = absoluta
          ? aplicarDeclinacionMagnetica(orientacion.rumbo, declinacionRef.current)
          : orientacion.rumbo;
        altitudApuntado = beta !== null || gamma !== null ? orientacion.altitudApuntado : 0;
      }

      if (rumbo === null) return;
      if (absoluta) lecturaAbsolutaRef.current = true;

      const altitudAcotada = limitar(altitudApuntado, -90, 90);
      const inclinacion = limitar(altitudAcotada, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX);

      if (!simulacionRef.current) {
        objetivoRef.current = { rumbo, inclinacion, altitudApuntado: altitudAcotada };
        programarSuavizado();
      }

      const referencia = absoluta ? 'absoluta' : 'relativa';
      if (referenciaRef.current !== referencia) {
        referenciaRef.current = referencia;
        setReferenciaSensor(referencia);
      }
      if (!lecturaRecibidaRef.current) {
        lecturaRecibidaRef.current = true;
        setEstadoSensor('activo');
      }
    };

    const admiteAbsoluto = 'ondeviceorientationabsolute' in window;
    if (admiteAbsoluto) {
      window.addEventListener('deviceorientationabsolute', procesarOrientacion);
    }
    window.addEventListener('deviceorientation', procesarOrientacion);

    const temporizador = window.setTimeout(() => {
      if (!lecturaRecibidaRef.current) {
        setEstadoSensor((prev) => (prev === 'buscando' ? 'sin-lecturas' : prev));
      }
    }, 2500);

    return () => {
      window.clearTimeout(temporizador);
      if (admiteAbsoluto) {
        window.removeEventListener('deviceorientationabsolute', procesarOrientacion);
      }
      window.removeEventListener('deviceorientation', procesarOrientacion);
    };
  }, [escuchando, intentoSensor, programarSuavizado]);

  const activarSensores = async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setEstadoSensor('no-disponible');
      return;
    }
    if (!window.isSecureContext) {
      setEstadoSensor('inseguro');
      return;
    }
    const constructor = DeviceOrientationEvent as unknown as ConstructorOrientacionConPermiso;
    if (typeof constructor.requestPermission === 'function') {
      setEstadoSensor('solicitando');
      try {
        const respuesta = await constructor.requestPermission();
        if (respuesta !== 'granted') {
          setEstadoSensor('denegado');
          return;
        }
      } catch {
        setEstadoSensor('denegado');
        return;
      }
    }
    lecturaRecibidaRef.current = false;
    lecturaAbsolutaRef.current = false;
    setModoManual(false);
    setEstadoSensor('buscando');
    setIntentoSensor((prev) => prev + 1);
  };

  const pasarAModoManual = () => {
    setRumboManual(Math.round(visualRef.current.rumbo));
    setAltitudManual(
      Math.round(limitar(visualRef.current.altitudApuntado, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX))
    );
    setModoManual(true);
  };

  /* Arrastre sobre la brújula (ratón o dedo) */
  const anguloDesdePuntero = (clienteX: number, clienteY: number): number | null => {
    const elemento = discoRef.current;
    if (!elemento) return null;
    const rect = elemento.getBoundingClientRect();
    const dx = clienteX - (rect.left + rect.width / 2);
    const dy = clienteY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 8) return null;
    return normalizarAngulo((Math.atan2(dx, -dy) * 180) / Math.PI);
  };

  const manejarPunteroAbajo = (evento: EventoPunteroReact<HTMLDivElement>) => {
    const angulo = anguloDesdePuntero(evento.clientX, evento.clientY);
    if (angulo === null) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastreRef.current = { idPuntero: evento.pointerId, anguloPrevio: angulo };
    if (!simulacion) pasarAModoManual();
    else setModoManual(true);
  };

  const manejarPunteroMovido = (evento: EventoPunteroReact<HTMLDivElement>) => {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.idPuntero !== evento.pointerId) return;
    const angulo = anguloDesdePuntero(evento.clientX, evento.clientY);
    if (angulo === null) return;
    const delta = diferenciaAngular(angulo, arrastre.anguloPrevio);
    arrastre.anguloPrevio = angulo;
    // Girar el disco en sentido horario equivale a reducir el rumbo
    setRumboManual((prev) => normalizarAngulo(prev - delta));
  };

  const finalizarArrastre = (evento: EventoPunteroReact<HTMLDivElement>) => {
    if (arrastreRef.current?.idPuntero === evento.pointerId) {
      arrastreRef.current = null;
    }
  };

  const manejarTeclaDisco = (evento: EventoTecladoReact<HTMLDivElement>) => {
    const paso = evento.shiftKey ? 15 : 1;
    let delta = 0;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') delta = paso;
    else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') delta = -paso;
    else return;
    evento.preventDefault();
    if (!simulacion) {
      setRumboManual(normalizarAngulo(Math.round(visualRef.current.rumbo) + delta));
      setAltitudManual(
        Math.round(limitar(visualRef.current.altitudApuntado, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX))
      );
      setModoManual(true);
      return;
    }
    setModoManual(true);
    setRumboManual((prev) => normalizarAngulo(Math.round(prev) + delta));
  };

  /* Datos derivados */
  const rumboEntero = Math.round(visual.rumbo) % 360;
  const cardinal = direccionCardinal(visual.rumbo);
  const altitudEntera = Math.round(visual.altitudApuntado);
  const inclinacionVisual = limitar(visual.inclinacion, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX);

  const {
    selectedFilter,
    setSelectedFilter,
    planetOptions,
    activePlanets,
    isLoading: cargandoFiltro,
    error: errorFiltro,
  } = useCompassFilter({
    cuerpos,
    isLoading: cargandoCuerpos,
    error: errorCuerpos,
  });

  const planetaEnfocado =
    selectedFilter === 'all' ? null : (activePlanets[0] ?? null);

  const objetivosEnDisco = useMemo<ObjetivoBrujula[]>(() => {
    const listaPlanetas: ObjetivoBrujula[] = activePlanets.map((planeta) => ({
      id: planeta.id,
      nombre: planeta.name,
      acimut: planeta.azimuthDeg,
      altitud: planeta.altitudeDeg,
      color: planeta.accentColor ?? '#e2e8f0',
      bajoHorizonte: !planeta.isAboveHorizon,
    }));

    // Cuando hay un planeta enfocado, el disco se centra exclusivamente en ese planeta
    if (selectedFilter !== 'all') {
      return listaPlanetas;
    }

    const lista: ObjetivoBrujula[] = [...listaPlanetas];

    // En modo 'all' añadimos también la Luna sobre el horizonte
    for (const cuerpo of cuerpos) {
      if (cuerpo.tipo === 'luna' && cuerpo.altitud > 0 && Number.isFinite(cuerpo.acimut)) {
        lista.unshift({
          id: cuerpo.id,
          nombre: cuerpo.nombre,
          acimut: cuerpo.acimut,
          altitud: cuerpo.altitud,
          color: cuerpo.color,
          bajoHorizonte: false,
        });
      }
    }

    // Y el astro seleccionado en el mapa (estrella/Messier/etc.) si está sobre el horizonte
    if (
      objetivoSeleccionado &&
      objetivoSeleccionado.altitud > 0 &&
      Number.isFinite(objetivoSeleccionado.acimut) &&
      !lista.some(
        (item) => item.id.toLowerCase() === objetivoSeleccionado.id.toLowerCase()
      )
    ) {
      lista.unshift({ ...objetivoSeleccionado, bajoHorizonte: false });
    }

    return lista;
  }, [activePlanets, cuerpos, objetivoSeleccionado, selectedFilter]);

  const alineado = useMemo<ObjetivoBrujula | null>(() => {
    let candidato: ObjetivoBrujula | null = null;
    let mejorDiferencia = Number.POSITIVE_INFINITY;
    for (const objetivo of objetivosEnDisco) {
      // En vista 'all' evitamos saltar alertas de alineación por planetas bajo el horizonte
      if (selectedFilter === 'all' && objetivo.bajoHorizonte) continue;
      const dif = Math.abs(diferenciaAngular(objetivo.acimut, visual.rumbo));
      if (dif <= MARGEN_ALINEACION && dif < mejorDiferencia) {
        mejorDiferencia = dif;
        candidato = objetivo;
      }
    }
    return candidato;
  }, [objetivosEnDisco, selectedFilter, visual.rumbo]);

  const alineadoBajoHorizonte = Boolean(alineado?.bajoHorizonte);
  const difElevacion =
    alineado && !alineadoBajoHorizonte ? alineado.altitud - visual.altitudApuntado : null;
  const alturaAlineada = difElevacion !== null && Math.abs(difElevacion) <= MARGEN_ALINEACION;
  const gradosElevacion = difElevacion !== null ? Math.round(Math.abs(difElevacion)) : 0;
  const direccionElevacion: 'alineada' | 'subir' | 'bajar' | null =
    difElevacion === null ? null : alturaAlineada ? 'alineada' : difElevacion > 0 ? 'subir' : 'bajar';
  const textoGuiaElevacion =
    direccionElevacion === null
      ? null
      : direccionElevacion === 'alineada'
        ? 'Altura alineada'
        : direccionElevacion === 'subir'
          ? `Sube el móvil ${gradosElevacion}°`
          : `Baja el móvil ${gradosElevacion}°`;

  const mostrarBotonActivar =
    estadoSensor === 'inactivo' || estadoSensor === 'denegado' || estadoSensor === 'sin-lecturas';
  const estadoCorrecto = estadoSensor === 'activo';
  const mensajeEstado =
    estadoSensor === 'activo' && referenciaSensor === 'relativa'
      ? 'Sensores activos (orientación relativa: el Norte puede no ser exacto en este navegador).'
      : MENSAJES_ESTADO[estadoSensor];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md ${paleta.claseBackdrop}`}
      onPointerDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className={`hud-esquinas hud-${tema} relative w-full max-w-xl max-h-[94dvh] overflow-y-auto overscroll-contain rounded-3xl border p-4 sm:p-6 ${paleta.clasePanel}`}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] uppercase tracking-[0.25em] font-mono ${paleta.claseAcento}`}>
              Instrumento de orientación
            </p>
            <h2 id={idTitulo} className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Compass className={`w-5 h-5 ${paleta.claseAcento}`} aria-hidden="true" />
              Brújula Astronómica 3D
            </h2>
            <p id={idDescripcion} className="text-xs opacity-75 mt-1">
              Gira con tu dispositivo o arrastra el disco. Los marcadores del anillo exterior son la
              Luna, los planetas y el astro seleccionado sobre el horizonte.
            </p>
            <p className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md border border-current/20 bg-current/5 font-mono text-[11px] opacity-80">
              <span>Decl. Mag: {etiquetaDeclinacion}</span>
              <span aria-hidden="true">·</span>
              <span>Norte geográfico</span>
            </p>
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la brújula"
            className="grid place-items-center min-w-11 min-h-11 rounded-xl border border-current/25 hover:bg-current/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Brújula 3D */}
        <div className="relative mx-auto mt-4 w-[min(80vw,22rem)] aspect-square select-none">
          <div
            ref={discoRef}
            role="slider"
            tabIndex={0}
            aria-label="Rumbo de la brújula"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={rumboEntero}
            aria-valuetext={`${rumboEntero} grados, ${cardinal}, altitud ${altitudEntera} grados`}
            onPointerDown={manejarPunteroAbajo}
            onPointerMove={manejarPunteroMovido}
            onPointerUp={finalizarArrastre}
            onPointerCancel={finalizarArrastre}
            onKeyDown={manejarTeclaDisco}
            className="absolute inset-0 rounded-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ perspective: '1000px', touchAction: 'none' }}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${inclinacionVisual}deg)`,
              }}
            >
              {/* Grosor del instrumento (capas inferiores) */}
              {[-18, -12, -6].map((z) => (
                <div
                  key={z}
                  aria-hidden="true"
                  className="absolute inset-[3%] rounded-full"
                  style={{
                    transform: `translateZ(${z}px)`,
                    backgroundColor: paleta.capa,
                    border: `1px solid ${paleta.esferaBorde}`,
                    opacity: 0.85,
                  }}
                />
              ))}

              {/* Disco giratorio (SVG) */}
              <svg
                viewBox="-20 -20 440 440"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
                style={{ transform: 'translateZ(0px)' }}
              >
                <circle
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO_ESFERA}
                  fill={paleta.esfera}
                  stroke={paleta.esferaBorde}
                  strokeWidth="2"
                />
                <circle
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO_MARCAS + 2}
                  fill="none"
                  stroke={paleta.aro}
                  strokeWidth="1"
                />
                <circle cx={CENTRO} cy={CENTRO} r={110} fill="none" stroke={paleta.aro} strokeDasharray="2 5" />

                <g transform={`rotate(${-visual.rumbo} ${CENTRO} ${CENTRO})`}>
                  {MARCAS.map((m) => (
                    <line
                      key={m.angulo}
                      x1={m.x1}
                      y1={m.y1}
                      x2={m.x2}
                      y2={m.y2}
                      stroke={
                        m.angulo === 0 ? paleta.norte : m.tipo === 'menor' ? paleta.marcaMenor : paleta.marcaMayor
                      }
                      strokeWidth={m.tipo === 'mayor' ? 2.5 : m.tipo === 'media' ? 1.6 : 1}
                      strokeLinecap="round"
                    />
                  ))}

                  {ETIQUETAS.map((e) => (
                    <text
                      key={e.angulo}
                      x={e.x}
                      y={e.y}
                      transform={`rotate(${visual.rumbo} ${e.x} ${e.y})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily={
                        e.tipo === 'grado'
                          ? "'JetBrains Mono Variable', ui-monospace, monospace"
                          : "'Space Grotesk Variable', system-ui, sans-serif"
                      }
                      fontWeight={e.tipo === 'grado' ? 500 : 700}
                      fontSize={e.tipo === 'cardinal' ? 24 : e.tipo === 'intercardinal' ? 14 : 10.5}
                      fill={
                        e.angulo === 0 ? paleta.norte : e.tipo === 'grado' ? paleta.textoSuave : paleta.texto
                      }
                    >
                      {e.texto}
                    </text>
                  ))}

                  {/* Aguja: norte destacado y cola sur */}
                  <polygon
                    points={`${CENTRO},${CENTRO - 122} ${CENTRO - 9},${CENTRO - 76} ${CENTRO + 9},${CENTRO - 76}`}
                    fill={paleta.norte}
                  />
                  <polygon
                    points={`${CENTRO},${CENTRO + 108} ${CENTRO - 7},${CENTRO + 76} ${CENTRO + 7},${CENTRO + 76}`}
                    fill={paleta.sur}
                  />

                  {/* Línea guía radial hacia el planeta enfocado */}
                  {planetaEnfocado && (() => {
                    const destino = puntoPolar(planetaEnfocado.azimuthDeg, RADIO_MARCADORES - 12);
                    return (
                      <line
                        x1={CENTRO}
                        y1={CENTRO}
                        x2={destino.x}
                        y2={destino.y}
                        stroke={paleta.acento}
                        strokeWidth="1.75"
                        strokeDasharray={planetaEnfocado.isAboveHorizon ? '4 3' : '2 4'}
                        opacity={planetaEnfocado.isAboveHorizon ? 0.75 : 0.55}
                      />
                    );
                  })()}

                  {/* Marcadores astronómicos en su acimut real */}
                  {objetivosEnDisco.map((objetivo) => {
                    const p = puntoPolar(objetivo.acimut, RADIO_MARCADORES);
                    const esAlineado = alineado?.id === objetivo.id;
                    const esEnfocado = planetaEnfocado?.id === objetivo.id;
                    const esSeleccionado =
                      esEnfocado ||
                      objetivoSeleccionado?.id.toLowerCase() === objetivo.id.toLowerCase();
                    const bajoHorizonte = Boolean(objetivo.bajoHorizonte);
                    const color = paleta.marcadorFijo ?? objetivo.color;
                    const etiqueta = etiquetaMarcador(objetivo.nombre);
                    const opacidadMarcador = bajoHorizonte && !esEnfocado ? 0.5 : 1;
                    return (
                      <g
                        key={objetivo.id}
                        transform={`rotate(${visual.rumbo} ${p.x} ${p.y})`}
                        opacity={opacidadMarcador}
                      >
                        {(esAlineado || esSeleccionado) && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={14}
                            fill="none"
                            stroke={paleta.acento}
                            strokeWidth={esAlineado || esEnfocado ? '2' : '1.4'}
                            strokeDasharray={bajoHorizonte || !esAlineado ? '3 2' : undefined}
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={9.5}
                          fill={
                            bajoHorizonte
                              ? paleta.esfera
                              : esAlineado
                                ? paleta.acento
                                : color
                          }
                          stroke={
                            bajoHorizonte
                              ? tema === 'claro'
                                ? paleta.textoSuave
                                : color
                              : paleta.esfera
                          }
                          strokeWidth={bajoHorizonte ? '1.8' : '1.5'}
                          strokeDasharray={bajoHorizonte ? '2.5 2' : undefined}
                        />
                        <text
                          x={p.x}
                          y={p.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={etiqueta.length > 2 ? '7.5' : '8.5'}
                          fontWeight={700}
                          fontFamily="'Space Grotesk Variable', system-ui, sans-serif"
                          fill={
                            bajoHorizonte
                              ? tema === 'claro'
                                ? paleta.texto
                                : color
                              : tema === 'rojo'
                                ? '#000000'
                                : '#0f172a'
                          }
                        >
                          {etiqueta}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Línea de fe fija (dirección del dispositivo) */}
                <polygon
                  points={`${CENTRO},${CENTRO - RADIO_ESFERA + 14} ${CENTRO - 10},${-16} ${CENTRO + 10},${-16}`}
                  fill={paleta.acento}
                />
              </svg>

              {/* Cardán: meridianos de la cúpula que giran con el rumbo */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ transformStyle: 'preserve-3d', transform: `rotateZ(${-visual.rumbo}deg)` }}
              >
                <div
                  className="absolute inset-[6%] rounded-full"
                  style={{ border: `1.5px solid ${paleta.aro}`, transform: 'rotateY(90deg)' }}
                />
                <div
                  className="absolute inset-[6%] rounded-full"
                  style={{ border: `1px solid ${paleta.aro}`, transform: 'rotateX(90deg)' }}
                />
              </div>
            </div>
          </div>

          {/* Lectura central (plana, siempre legible) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] aspect-square rounded-full border flex flex-col items-center justify-center ${paleta.claseLectura}`}
          >
            <span className="font-mono font-bold text-3xl sm:text-4xl leading-none tabular-nums">
              {String(rumboEntero).padStart(3, '0')}°
            </span>
            <span className={`font-display font-bold text-sm mt-1 ${paleta.claseAcento}`}>{cardinal}</span>
            <span className="font-mono text-[10px] opacity-75 mt-0.5 tabular-nums">
              Alt {altitudEntera}°
            </span>
          </div>
        </div>

        {/* Aviso de alineación */}
        <div aria-live="polite" className="min-h-12 mt-3 flex items-center justify-center">
          {alineado ? (
            <p
              className={`alineacion-pulso inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3.5 py-2 rounded-2xl border text-sm font-medium text-center ${
                alineadoBajoHorizonte
                  ? paleta.claseEstadoAviso
                  : alturaAlineada
                    ? paleta.claseEstadoOk
                    : paleta.claseAviso
              }`}
            >
              <Target className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Apuntando hacia {alineado.nombre} ·{' '}
                {alineadoBajoHorizonte ? (
                  <span className="font-mono">
                    Bajo el horizonte · {Math.round(alineado.altitud)}°
                  </span>
                ) : (
                  <span className="font-mono">Alt {Math.round(alineado.altitud)}°</span>
                )}
              </span>
              {textoGuiaElevacion && (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold">
                  {direccionElevacion === 'alineada' ? (
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : direccionElevacion === 'subir' ? (
                    <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {textoGuiaElevacion}
                </span>
              )}
            </p>
          ) : planetaEnfocado ? (
            <p className="text-xs opacity-80 text-center font-mono">
              {planetaEnfocado.name} · Az {Math.round(planetaEnfocado.azimuthDeg)}° (
              {direccionCardinal(planetaEnfocado.azimuthDeg)}) ·{' '}
              {planetaEnfocado.isAboveHorizon
                ? `Alt ${Math.round(planetaEnfocado.altitudeDeg)}°`
                : `Bajo el horizonte · ${Math.round(planetaEnfocado.altitudeDeg)}°`}
            </p>
          ) : (
            <p className="text-xs opacity-65 text-center">
              {objetivosEnDisco.length > 0
                ? 'Gira hasta situar un marcador bajo la línea de fe superior.'
                : 'Ahora mismo no hay objetivos disponibles en la brújula.'}
            </p>
          )}
        </div>

        {/* Estado de sensores */}
        <div className="mt-2 space-y-3">
          <p
            role="status"
            className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl border ${
              estadoCorrecto ? paleta.claseEstadoOk : paleta.claseEstadoAviso
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{mensajeEstado}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {mostrarBotonActivar && (
              <button
                type="button"
                onClick={() => {
                  void activarSensores();
                }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${paleta.claseBotonPrimario}`}
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                Activar sensores del dispositivo
              </button>
            )}
            {estadoSensor === 'activo' && (
              <button
                type="button"
                onClick={() => (modoManual ? setModoManual(false) : pasarAModoManual())}
                aria-pressed={modoManual}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border border-current/30 hover:bg-current/10 text-sm font-medium cursor-pointer transition-colors"
              >
                <Hand className="w-4 h-4" aria-hidden="true" />
                {modoManual ? 'Volver a los sensores' : 'Modo manual'}
              </button>
            )}
          </div>

          {/* Controles de simulación */}
          {simulacion && (
            <fieldset className="p-3 rounded-2xl border border-current/20 bg-current/5 space-y-1">
              <legend className="px-1.5 text-[10px] uppercase tracking-[0.2em] font-mono opacity-75">
                Modo simulación
              </legend>
              <label className="block">
                <span className="flex items-center justify-between text-xs">
                  <span>Rumbo</span>
                  <span className="font-mono">{String(Math.round(normalizarAngulo(rumboManual)) % 360).padStart(3, '0')}°</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={359}
                  step={1}
                  value={Math.round(normalizarAngulo(rumboManual)) % 360}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    if (!Number.isFinite(valor)) return;
                    setModoManual(true);
                    setRumboManual(limitar(valor, 0, 359));
                  }}
                  className={`rango-hud ${paleta.claseAcento}`}
                />
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-xs">
                  <span>Altitud de apuntado</span>
                  <span className="font-mono tabular-nums">
                    {altitudManual > 0 ? '+' : ''}
                    {altitudManual}°
                  </span>
                </span>
                <input
                  type="range"
                  min={ALTITUD_MANUAL_MIN}
                  max={ALTITUD_MANUAL_MAX}
                  step={1}
                  value={altitudManual}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    if (!Number.isFinite(valor)) return;
                    setModoManual(true);
                    setAltitudManual(limitar(valor, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX));
                  }}
                  className={`rango-hud ${paleta.claseAcento}`}
                />
              </label>
              <p className="text-[11px] opacity-70">
                También puedes arrastrar el disco o usar las flechas del teclado (Mayús: pasos de 15°).
              </p>
            </fieldset>
          )}

          {/* Filtro inferior de todos los planetas del Sistema Solar */}
          <CompassFilter
            tema={tema}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            planetOptions={planetOptions}
            isLoading={cargandoFiltro}
            error={errorFiltro}
          />
        </div>
      </div>
    </div>
  );
}
</file>

<file path="src/components/EventsPanel.tsx">
import { CalendarClock, Sparkles, Eclipse, ArrowUpRight } from 'lucide-react';
import type { EventoCeleste, TemaVisual } from '../types/astronomy';
import {
  ZONA_HORARIA_POR_DEFECTO,
  formatearFechaCortaEnZona,
} from '../utils/lunarCalculations';

interface EventsPanelProps {
  eventos: EventoCeleste[];
  tema: TemaVisual;
  claseTarjeta: string;
  timezone?: string;
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
  if (tema === 'claro') return tipo === 'lluvia' ? 'text-amber-700' : 'text-sky-700';
  return tipo === 'lluvia' ? 'text-amber-400' : 'text-sky-400';
}

function obtenerClaseBadgeDias(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 text-red-500';
  if (tema === 'claro') return 'border-sky-700/40 bg-sky-50 text-sky-800';
  return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
}

export function EventsPanel({
  eventos,
  tema,
  claseTarjeta,
  timezone = ZONA_HORARIA_POR_DEFECTO,
  onSeleccionarFecha,
}: Readonly<EventsPanelProps>) {
  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <CalendarClock className="w-4 h-4" aria-hidden="true" /> Próximos Eventos Celestes
        </h2>
        <span className="text-[11px] opacity-60">Lluvias y Eclipses</span>
      </div>

      <div className="space-y-2.5">
        {eventos.map((ev) => {
          const fechaTexto = formatearFechaCortaEnZona(ev.fechaPico, timezone);

          const claseHoverEvento =
            tema === 'rojo'
              ? 'hover:border-red-600/80'
              : tema === 'claro'
                ? 'hover:border-slate-300 hover:shadow-md'
                : 'hover:border-sky-500/40';

          return (
            <div
              key={ev.id}
              className={`tarjeta-3d p-3.5 rounded-xl border border-current/15 bg-current/5 flex flex-col gap-1.5 ${claseHoverEvento}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  {ev.tipo === 'lluvia' ? (
                    <Sparkles
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'lluvia')}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <Eclipse
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'eclipse')}`}
                      aria-hidden="true"
                    />
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
                  type="button"
                  onClick={() => onSeleccionarFecha(ev.fechaPico)}
                  aria-label={`Ver ${ev.titulo} en el mapa celeste`}
                  className="inline-flex items-center gap-1 min-h-9 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 no-underline hover:opacity-100 cursor-pointer font-sans font-medium transition-colors"
                >
                  Ver en mapa <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
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
</file>

<file path="src/components/WeatherPanel.tsx">
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
  Excelente: 'border-emerald-700/40 bg-emerald-50 text-emerald-800',
  Aceptable: 'border-amber-700/40 bg-amber-50 text-amber-800',
  Desfavorable: 'border-rose-700/40 bg-rose-50 text-rose-800',
};

const ESTILOS_CALIDAD_OSCURO: Record<CalidadCieloCalculada['veredicto'], string> = {
  Excelente: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  Bueno: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  Regular: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  Malo: 'border-rose-500/40 bg-rose-500/15 text-rose-400',
};

const ESTILOS_CALIDAD_CLARO: Record<CalidadCieloCalculada['veredicto'], string> = {
  Excelente: 'border-emerald-700/40 bg-emerald-50 text-emerald-800',
  Bueno: 'border-sky-700/40 bg-sky-50 text-sky-800',
  Regular: 'border-amber-700/40 bg-amber-50 text-amber-800',
  Malo: 'border-rose-700/40 bg-rose-50 text-rose-800',
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
</file>

<file path="src/index.css">
@import "tailwindcss";

/* Sistema tipográfico astronómico (fuentes locales vía @fontsource-variable) */
@theme {
  --font-display: 'Space Grotesk Variable', system-ui, sans-serif;
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}

@layer base {
  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1,
  h2,
  h3 {
    font-family: var(--font-display);
    letter-spacing: -0.01em;
  }

  /* Tokens semánticos por tema visual */
  .tema-oscuro {
    --superficie-base: #020617;
    --superficie-tarjeta: rgb(15 23 42 / 0.55);
    --borde-tarjeta: rgb(34 211 238 / 0.15);
    --texto-primario: #f1f5f9;
    --texto-secundario: #cbd5e1;
    --texto-atenuado: #94a3b8;
  }

  /* Modo Claro: pizarra/papel astronómico suave con alto contraste WCAG AA */
  .tema-claro {
    --superficie-base: #e2e8f0;
    --superficie-tarjeta: #f8fafc;
    --borde-tarjeta: #cbd5e1;
    --texto-primario: #0f172a;
    --texto-secundario: #334155;
    --texto-atenuado: #64748b;
    accent-color: #0369a1;
  }

  .tema-claro *:focus-visible {
    outline-color: #0369a1;
  }

  .tema-claro ::selection {
    background-color: #bae6fd;
    color: #0f172a;
  }

  /* Filtro Rojo: ningún acento del navegador puede salir del espectro rojo */
  .tema-rojo {
    --superficie-base: #000000;
    --superficie-tarjeta: rgb(0 0 0 / 0.9);
    --borde-tarjeta: rgb(127 29 29 / 0.7);
    --texto-primario: #ef4444;
    --texto-secundario: #dc2626;
    --texto-atenuado: #b91c1c;
    accent-color: #dc2626;
  }

  .tema-rojo *:focus-visible {
    outline-color: #dc2626;
  }

  .tema-rojo ::selection {
    background-color: #7f1d1d;
    color: #f87171;
  }

  button,
  a,
  input,
  [role="slider"] {
    -webkit-tap-highlight-color: transparent;
  }
}

@layer utilities {
  .tarjeta-3d {
    transform-style: preserve-3d;
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 240ms ease,
      border-color 240ms ease,
      opacity 200ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .tarjeta-3d:hover {
      transform: perspective(900px) translateY(-2px) rotateX(1.2deg);
    }
  }

  /* ── Estética HUD de observatorio ─────────────────────────────── */
  .hud-esquinas {
    position: relative;
  }

  /* Esquinas técnicas discretas (marcas de retícula en las 4 esquinas) */
  .hud-esquinas::before {
    content: '';
    position: absolute;
    inset: 6px;
    pointer-events: none;
    border-radius: inherit;
    --hud-l: 12px;
    --hud-g: 1.5px;
    background:
      linear-gradient(var(--hud-color), var(--hud-color)) top left / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top left / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top right / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top right / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom left / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom left / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom right / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom right / var(--hud-g) var(--hud-l) no-repeat;
  }

  /* Oscuro: brillo cian tenue */
  .hud-oscuro {
    --hud-color: rgb(34 211 238 / 0.45);
    box-shadow:
      0 0 0 1px rgb(34 211 238 / 0.04),
      0 0 24px -12px rgb(34 211 238 / 0.35),
      0 20px 25px -5px rgb(0 0 0 / 0.3);
  }

  /* Claro: acabado limpio de carta técnica con borde definido */
  .hud-claro {
    --hud-color: rgb(51 65 85 / 0.5);
  }

  /* Rojo: líneas finas rojo oscuro, sin brillo */
  .hud-rojo {
    --hud-color: rgb(153 27 27 / 0.9);
  }

  /* Rejilla técnica tenue para fondos de instrumentos */
  .hud-rejilla {
    background-image:
      linear-gradient(to right, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  /* Icono de brújula con oscilación sutil */
  .brujula-icono-animada {
    animation: brujula-oscilar 4.5s ease-in-out infinite;
    transform-origin: center;
  }

  .alineacion-pulso {
    animation: alineacion-pulso 1.6s ease-in-out infinite;
  }

  /* Deslizadores HUD: usan currentColor para respetar los 3 temas */
  .rango-hud {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 2.5rem;
    background: transparent;
    cursor: pointer;
    touch-action: pan-y;
  }

  .rango-hud::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 9999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }

  .rango-hud::-moz-range-track {
    height: 4px;
    border-radius: 9999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }

  .rango-hud::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -9px;
    border-radius: 9999px;
    background: currentColor;
    border: 3px solid color-mix(in srgb, currentColor 35%, black);
  }

  .rango-hud::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: currentColor;
    border: 3px solid color-mix(in srgb, currentColor 35%, black);
  }

  /* Barra de desplazamiento oculta para carruseles horizontales táctiles */
  .ocultar-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .ocultar-scrollbar::-webkit-scrollbar {
    display: none;
  }
}

@keyframes brujula-oscilar {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(14deg);
  }
}

@keyframes alineacion-pulso {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-3d,
  .tarjeta-3d:hover {
    transform: none;
    transition: none;
  }

  .brujula-icono-animada,
  .alineacion-pulso {
    animation: none;
  }
}

/* ── Hoja imprimible de observación nocturna (PDF vía window.print) ── */
.hoja-impresion-sesion {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 12mm;
  }

  html,
  body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .no-imprimir {
    display: none !important;
  }

  .hoja-impresion-sesion {
    display: block !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: var(--font-sans);
    font-size: 10pt;
    line-height: 1.35;
  }

  .hoja-impresion-cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12pt;
    border-bottom: 1.5pt solid #000000;
    padding-bottom: 6pt;
    margin-bottom: 10pt;
  }

  .hoja-impresion-cabecera h1 {
    font-family: var(--font-display);
    font-size: 16pt;
    font-weight: 700;
    margin: 0;
    color: #000000;
  }

  .hoja-impresion-subtitulo {
    font-size: 9pt;
    margin: 2pt 0 0 0;
    color: #222222;
  }

  .hoja-impresion-progreso {
    font-family: var(--font-mono);
    font-size: 10pt;
    font-weight: 700;
    border: 1pt solid #000000;
    padding: 3pt 8pt;
    white-space: nowrap;
  }

  .hoja-impresion-metadatos {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8pt;
    margin: 0 0 12pt 0;
    padding: 6pt 8pt;
    border: 0.75pt solid #000000;
  }

  .hoja-impresion-metadatos dt {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #333333;
  }

  .hoja-impresion-metadatos dd {
    margin: 1pt 0 0 0;
    font-weight: 600;
    font-size: 9.5pt;
    color: #000000;
  }

  .hoja-impresion-tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }

  .hoja-impresion-tabla thead {
    display: table-header-group;
  }

  .hoja-impresion-tabla tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .hoja-impresion-tabla th,
  .hoja-impresion-tabla td {
    border: 0.6pt solid #000000;
    padding: 4.5pt 6pt;
    text-align: left;
    vertical-align: top;
    color: #000000;
  }

  .hoja-impresion-tabla th {
    background: #eeeeee !important;
    font-weight: 700;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .hoja-impresion-tabla .col-check {
    width: 28pt;
    text-align: center;
    font-size: 12pt;
    line-height: 1;
  }

  .hoja-impresion-tabla .col-astro {
    font-weight: 700;
  }

  .hoja-impresion-tabla .col-num {
    text-align: right;
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .hoja-impresion-tabla .col-mono {
    font-family: var(--font-mono);
    font-size: 8.5pt;
    white-space: nowrap;
  }

  .hoja-impresion-vacia {
    border: 0.75pt dashed #000000;
    padding: 16pt;
    text-align: center;
    font-style: italic;
  }
}
</file>

<file path="src/core/skyCalculator.ts">
import * as Astronomy from 'astronomy-engine';
import type {
  AstroSeleccionado,
  ConstelacionCalculada,
  CuerpoCeleste,
  EfemeridesTransito,
  EstadoCieloSolar,
  EstrellaCalculada,
  FaseCrepusculo,
  MessierCalculado,
  MoonPhaseName,
  PuntoTrayectoria,
  SegmentoHorizontalConstelacion,
  Ubicacion,
} from '../types/astronomy';
import { CATALOGO_MESSIER } from '../data/messier110';
import { CATALOGO_ESTRELLAS } from '../data/estrellasMag4';
import { CONSTELACIONES_IAU } from '../data/constelacionesIAU';
import {
  formatearHoraEnZona,
  normalizarZonaHoraria,
  obtenerLimitesDiaCivilUTC,
  obtenerNombreFaseLunarDesdeAngulo,
} from '../utils/lunarCalculations';

const CUERPOS_A_CALCULAR: {
  body: Astronomy.Body;
  nombre: string;
  tipo: CuerpoCeleste['tipo'];
  color: string;
}[] = [
  { body: Astronomy.Body.Moon, nombre: 'Luna', tipo: 'luna', color: '#f8fafc' },
  { body: Astronomy.Body.Mercury, nombre: 'Mercurio', tipo: 'planeta', color: '#94a3b8' },
  { body: Astronomy.Body.Venus, nombre: 'Venus', tipo: 'planeta', color: '#fef08a' },
  { body: Astronomy.Body.Mars, nombre: 'Marte', tipo: 'planeta', color: '#f87171' },
  { body: Astronomy.Body.Jupiter, nombre: 'Júpiter', tipo: 'planeta', color: '#fdba74' },
  { body: Astronomy.Body.Saturn, nombre: 'Saturno', tipo: 'planeta', color: '#fde047' },
  { body: Astronomy.Body.Uranus, nombre: 'Urano', tipo: 'planeta', color: '#67e8f9' },
  { body: Astronomy.Body.Neptune, nombre: 'Neptuno', tipo: 'planeta', color: '#60a5fa' },
];

export function esEntradaAstronomicaValida(fecha: Date, ubicacion: Ubicacion): boolean {
  if (Number.isNaN(fecha.getTime())) return false;
  if (!Number.isFinite(ubicacion.latitud) || ubicacion.latitud < -90 || ubicacion.latitud > 90) {
    return false;
  }
  if (!Number.isFinite(ubicacion.longitud) || ubicacion.longitud < -180 || ubicacion.longitud > 180) {
    return false;
  }
  if (!Number.isFinite(ubicacion.altitud)) return false;
  return true;
}

function gradosADireccion(acimut: number): string {
  const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const indice = Math.round(acimut / 45) % 8;
  return puntos[indice];
}

function obtenerNombreFaseLunar(angulo: number): MoonPhaseName {
  return obtenerNombreFaseLunarDesdeAngulo(angulo);
}

function clasificarFaseSolar(altitudSol: number): FaseCrepusculo {
  if (altitudSol >= 0) return 'Día';
  if (altitudSol >= -6) return 'Crepúsculo civil';
  if (altitudSol >= -12) return 'Crepúsculo náutico';
  if (altitudSol >= -18) return 'Crepúsculo astronómico';
  return 'Noche astronómica';
}

function precesarJ2000AFecha(
  raJ2000Horas: number,
  decJ2000Grados: number,
  fecha: Date,
  rotacionEqjEqd: Astronomy.RotationMatrix
): { ra: number; dec: number } {
  const esferaJ2000 = new Astronomy.Spherical(decJ2000Grados, raJ2000Horas * 15, 1);
  const vectorJ2000 = Astronomy.VectorFromSphere(esferaJ2000, fecha);
  const vectorFecha = Astronomy.RotateVector(rotacionEqjEqd, vectorJ2000);
  const ecuatorialFecha = Astronomy.EquatorFromVector(vectorFecha);
  return { ra: ecuatorialFecha.ra, dec: ecuatorialFecha.dec };
}

function crearConvertidorJ2000Horizontal(
  fecha: Date,
  observador: Astronomy.Observer
): (raJ2000Horas: number, decJ2000Grados: number) => { altitud: number; acimut: number } {
  const rotacion = Astronomy.Rotation_EQJ_HOR(fecha, observador);
  return (raJ2000Horas: number, decJ2000Grados: number) => {
    const esferaJ2000 = new Astronomy.Spherical(decJ2000Grados, raJ2000Horas * 15, 1);
    const vectorJ2000 = Astronomy.VectorFromSphere(esferaJ2000, fecha);
    const vectorHor = Astronomy.RotateVector(rotacion, vectorJ2000);
    const horizontal = Astronomy.HorizonFromVector(vectorHor, 'normal');
    return {
      altitud: horizontal.lat,
      acimut: horizontal.lon,
    };
  };
}

export function calcularEstadoSolar(fecha: Date, ubicacion: Ubicacion): EstadoCieloSolar | null {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return null;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const ecuatorial = Astronomy.Equator(Astronomy.Body.Sun, fecha, observador, true, true);
  const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
  const altitudSol = Number(horizontal.altitude.toFixed(1));

  return {
    altitudSol,
    fase: clasificarFaseSolar(horizontal.altitude),
  };
}

export function calcularCielo(fecha: Date, ubicacion: Ubicacion): CuerpoCeleste[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  return CUERPOS_A_CALCULAR.map(({ body, nombre, tipo, color }) => {
    const ecuatorial = Astronomy.Equator(body, fecha, observador, true, true);
    const ecuatorialJ2000 = Astronomy.Equator(body, fecha, observador, false, true);
    const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
    const brillo = Astronomy.Illumination(body, fecha);
    const constelacion = Astronomy.Constellation(ecuatorialJ2000.ra, ecuatorialJ2000.dec);

    let faseLunar: MoonPhaseName | undefined;
    let anguloFase: number | undefined;
    if (tipo === 'luna') {
      anguloFase = Astronomy.MoonPhase(fecha);
      faseLunar = obtenerNombreFaseLunar(anguloFase);
    }

    return {
      id: body.toString(),
      nombre,
      tipo,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      direccion: gradosADireccion(horizontal.azimuth),
      magnitud: Number(brillo.mag.toFixed(1)),
      raHoras: Number(ecuatorial.ra.toFixed(4)),
      decGrados: Number(ecuatorial.dec.toFixed(4)),
      constelacionIAU: constelacion.symbol.toUpperCase(),
      iluminacion: Number((brillo.phase_fraction * 100).toFixed(0)),
      faseLunar,
      anguloFase,
      visible: horizontal.altitude > 0,
      color,
    };
  }).sort((a, b) => b.altitud - a.altitud);
}

export function calcularEstrellas(fecha: Date, ubicacion: Ubicacion): EstrellaCalculada[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CATALOGO_ESTRELLAS.map((estrella) => {
    const { altitud, acimut } = convertirHorizontal(estrella.raHoras, estrella.decGrados);
    return {
      ...estrella,
      altitud: Number(altitud.toFixed(1)),
      acimut: Number(acimut.toFixed(1)),
      visible: altitud > 0,
    };
  });
}

export function calcularMessier(fecha: Date, ubicacion: Ubicacion): MessierCalculado[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CATALOGO_MESSIER.map((obj) => {
    const { altitud, acimut } = convertirHorizontal(obj.raHoras, obj.decGrados);
    return {
      ...obj,
      altitud: Number(altitud.toFixed(1)),
      acimut: Number(acimut.toFixed(1)),
      visible: altitud > 10,
    };
  });
}

export function calcularConstelaciones(
  fecha: Date,
  ubicacion: Ubicacion
): ConstelacionCalculada[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CONSTELACIONES_IAU.map((constelacion) => {
    const segmentos: SegmentoHorizontalConstelacion[] = [];
    let sxVisible = 0;
    let syVisible = 0;
    let szVisible = 0;
    let conteoVisible = 0;
    let sxTotal = 0;
    let syTotal = 0;
    let szTotal = 0;

    const acumularVertice = (alt: number, az: number) => {
      const altRad = (alt * Math.PI) / 180;
      const azRad = (az * Math.PI) / 180;
      const cosAlt = Math.cos(altRad);
      const vx = cosAlt * Math.cos(azRad);
      const vy = cosAlt * Math.sin(azRad);
      const vz = Math.sin(altRad);

      sxTotal += vx;
      syTotal += vy;
      szTotal += vz;

      if (alt >= 0) {
        sxVisible += vx;
        syVisible += vy;
        szVisible += vz;
        conteoVisible += 1;
      }
    };

    for (const [desdeJ2000, hastaJ2000] of constelacion.segmentos) {
      const p1 = convertirHorizontal(desdeJ2000[0], desdeJ2000[1]);
      const p2 = convertirHorizontal(hastaJ2000[0], hastaJ2000[1]);

      acumularVertice(p1.altitud, p1.acimut);
      acumularVertice(p2.altitud, p2.acimut);

      segmentos.push({
        desde: {
          altitud: Number(p1.altitud.toFixed(1)),
          acimut: Number(p1.acimut.toFixed(1)),
        },
        hasta: {
          altitud: Number(p2.altitud.toFixed(1)),
          acimut: Number(p2.acimut.toFixed(1)),
        },
      });
    }

    const sx = conteoVisible > 0 ? sxVisible : sxTotal;
    const sy = conteoVisible > 0 ? syVisible : syTotal;
    const sz = conteoVisible > 0 ? szVisible : szTotal;
    const norma = Math.hypot(sx, sy, sz) || 1;
    const centroAltRad = Math.asin(Math.max(-1, Math.min(1, sz / norma)));
    const centroAzRad = Math.atan2(sy, sx);
    const centroAltitud = Number(((centroAltRad * 180) / Math.PI).toFixed(1));
    const centroAcimutGrados = (centroAzRad * 180) / Math.PI;
    const centroAcimut = Number((((centroAcimutGrados % 360) + 360) % 360).toFixed(1));

    const visible = segmentos.some((s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0);

    return {
      codigo: constelacion.codigo,
      nombreEs: constelacion.nombreEs,
      nombreLatin: constelacion.nombreLatin,
      estacion: constelacion.estacion,
      segmentos,
      centroAltitud,
      centroAcimut,
      visible,
    };
  });
}

function formatearHoraEtiqueta(fecha: Date, timezone?: string): string {
  if (timezone) {
    return formatearHoraEnZona(fecha, timezone);
  }
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function calcularTrayectoriaAstro(
  astro: AstroSeleccionado,
  fecha: Date,
  ubicacion: Ubicacion
): PuntoTrayectoria[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const puntos: PuntoTrayectoria[] = [];
  const pasoMs = 30 * 60_000;

  if (astro.categoria === 'cuerpo') {
    const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === astro.id);
    if (!cuerpoDef) return [];

    for (let i = -12; i <= 12; i++) {
      const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
      const ecuatorial = Astronomy.Equator(cuerpoDef.body, fechaPaso, observador, true, true);
      const horizontal = Astronomy.Horizon(
        fechaPaso,
        observador,
        ecuatorial.ra,
        ecuatorial.dec,
        'normal'
      );
      puntos.push({
        altitud: Number(horizontal.altitude.toFixed(1)),
        acimut: Number(horizontal.azimuth.toFixed(1)),
        horaEtiqueta: formatearHoraEtiqueta(fechaPaso, ubicacion.timezone),
      });
    }
    return puntos;
  }

  if (astro.categoria === 'constelacion') {
    return [];
  }

  const catalogo =
    astro.categoria === 'estrella'
      ? CATALOGO_ESTRELLAS.find((e) => e.id === astro.id)
      : CATALOGO_MESSIER.find((m) => m.id === astro.id);

  if (!catalogo) return [];

  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);
  const { ra, dec } = precesarJ2000AFecha(
    catalogo.raHoras,
    catalogo.decGrados,
    fecha,
    rotacion
  );

  for (let i = -12; i <= 12; i++) {
    const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
    const horizontal = Astronomy.Horizon(fechaPaso, observador, ra, dec, 'normal');
    puntos.push({
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      horaEtiqueta: formatearHoraEtiqueta(fechaPaso, ubicacion.timezone),
    });
  }

  return puntos;
}

export function calcularTransitoCuerpo(
  idCuerpo: string,
  fecha: Date,
  ubicacion: Ubicacion
): EfemeridesTransito {
  const vacio: EfemeridesTransito = {
    salida: null,
    culminacion: null,
    puesta: null,
    alturaMaxima: null,
  };

  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return vacio;

  const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === idCuerpo);
  if (!cuerpoDef) return vacio;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  const zonaHoraria = normalizarZonaHoraria(
    ubicacion.timezone,
    ubicacion.latitud,
    ubicacion.longitud
  );
  const { inicioDiaUTC, finDiaUTC } = obtenerLimitesDiaCivilUTC(fecha, zonaHoraria);
  const inicioMs = inicioDiaUTC.getTime();
  const finMs = finDiaUTC.getTime();
  const duracionDias = (finMs - inicioMs) / 86_400_000;

  let salida: Date | null = null;
  let puesta: Date | null = null;
  let culminacion: Date | null = null;
  let alturaMaxima: number | null = null;

  try {
    const eventoSalida = Astronomy.SearchRiseSet(
      cuerpoDef.body,
      observador,
      1,
      inicioDiaUTC,
      duracionDias
    );
    if (eventoSalida) {
      const ms = eventoSalida.date.getTime();
      if (ms >= inicioMs && ms < finMs) salida = eventoSalida.date;
    }
  } catch {
    // Mantiene salida en null en latitudes o fechas sin orto
  }

  try {
    const eventoPuesta = Astronomy.SearchRiseSet(
      cuerpoDef.body,
      observador,
      -1,
      inicioDiaUTC,
      duracionDias
    );
    if (eventoPuesta) {
      const ms = eventoPuesta.date.getTime();
      if (ms >= inicioMs && ms < finMs) puesta = eventoPuesta.date;
    }
  } catch {
    // Mantiene puesta en null en latitudes o fechas sin ocaso
  }

  try {
    const eventoCulminacion = Astronomy.SearchHourAngle(
      cuerpoDef.body,
      observador,
      0,
      inicioDiaUTC,
      1
    );
    culminacion = eventoCulminacion.time.date;
    alturaMaxima = Number(eventoCulminacion.hor.altitude.toFixed(1));
  } catch {
    // Mantiene culminación en null si no es resoluble
  }

  return {
    salida,
    culminacion,
    puesta,
    alturaMaxima,
  };
}
</file>

<file path="src/components/SkyMap.tsx">
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Compass,
  EyeOff,
  FileText,
  Globe,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CelestialThemePalette,
  ConstelacionCalculada,
  CuerpoCeleste,
  EscalaBortle,
  EstrellaCalculada,
  InstrumentoObservacion,
  MessierCalculado,
  ModoMapa,
  PuntoTrayectoria,
  TemaVisual,
  TipoObjetoMessier,
} from '../types/astronomy';
import { obtenerEstrellasDeConstelacion } from '../data/celestialDetails';
import { obtenerNombreConstelacionIAU } from '../data/constelacionesIAU';
import type { EntradaObjetivoSesion } from '../hooks/usePlanificadorSesion';
import { obtenerPaletaCeleste } from '../theme/celestialPalettes';
import { formatearDec, formatearRA } from '../utils/exportarSesion';

interface SkyMapProps {
  cuerpos: CuerpoCeleste[];
  estrellas: EstrellaCalculada[];
  messier: MessierCalculado[];
  constelaciones: ConstelacionCalculada[];
  estrellasCompletas?: EstrellaCalculada[];
  messierCompletos?: MessierCalculado[];
  constelacionesCompletas?: ConstelacionCalculada[];
  tema: TemaVisual;
  modoMapa: ModoMapa;
  onCambiarModoMapa: (modo: ModoMapa) => void;
  mostrarConstelaciones: boolean;
  mostrarEstrellas: boolean;
  mostrarMessier: boolean;
  astroSeleccionado: AstroSeleccionado | null;
  focusedBodyId?: string | null;
  focusedBodyName?: string;
  isSheetOpen?: boolean;
  onToggleSheet?: (open?: boolean) => void;
  onClearFocus?: () => void;
  trayectoria: PuntoTrayectoria[];
  onSeleccionarAstro: (astro: AstroSeleccionado | null) => void;
  contadorFoco?: number;
  magnitudLimiteVisible?: number;
  bortle?: EscalaBortle;
  instrumentoActivo?: InstrumentoObservacion | 'Todos';
  objetivoDetalleSeleccionado?: EntradaObjetivoSesion | null;
  esObjetivoEnSesion?: boolean;
  onToggleObjetivo?: (astro: EntradaObjetivoSesion) => void;
}

interface Camara3D {
  rotAz: number;
  tilt: number;
}

interface PuntoProyectado {
  x: number;
  y: number;
  escala: number;
  profundidad: number;
}

interface ObjetoHover {
  id: string;
  categoria: CategoriaAstro;
  nombreCorto: string;
  nombre: string;
  subtitulo: string;
  altitud: number;
  acimut: number;
  magnitud: number | null;
  x: number;
  y: number;
}

interface ConstelacionInteractiva {
  codigo: string;
  nombreEs: string;
  nombreLatin: string;
  centroAltitud: number;
  centroAcimut: number;
  xCentro: number;
  yCentro: number;
  segmentos2D: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

function distanciaPuntoASegmento(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

interface CacheEscenaCanvas {
  canvas: HTMLCanvasElement;
  ancho: number;
  alto: number;
}

const TAMANO_CANVAS = 560;
const CAMARA_INICIAL: Camara3D = { rotAz: 0, tilt: 32 };
const DURACION_TRANSICION_CAMARA_MS = 480;

function normalizarAcimut(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

function diferenciaAngularCorta(origen: number, destino: number): number {
  return ((destino - origen + 540) % 360) - 180;
}

function calcularTiltParaAltitud(altitud: number): number {
  return Math.max(12, Math.min(85, 16 + altitud * 0.72));
}

function buscarPosicionAstroVisible(
  astro: AstroSeleccionado,
  cuerpos: CuerpoCeleste[],
  estrellas: EstrellaCalculada[],
  messier: MessierCalculado[],
  constelaciones: ConstelacionCalculada[]
): { altitud: number; acimut: number } | null {
  if (astro.categoria === 'cuerpo') {
    const cuerpo = cuerpos.find((c) => c.id === astro.id);
    return cuerpo && cuerpo.altitud > 0 ? { altitud: cuerpo.altitud, acimut: cuerpo.acimut } : null;
  }
  if (astro.categoria === 'estrella') {
    const estrella = estrellas.find((e) => e.id === astro.id);
    return estrella && estrella.altitud >= 0
      ? { altitud: estrella.altitud, acimut: estrella.acimut }
      : null;
  }
  if (astro.categoria === 'constelacion') {
    const constelacion = constelaciones.find((c) => c.codigo === astro.id);
    if (!constelacion) return null;
    const tieneVisible = constelacion.segmentos.some(
      (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
    );
    return tieneVisible || constelacion.centroAltitud >= 0
      ? {
          altitud: Math.max(0, constelacion.centroAltitud),
          acimut: constelacion.centroAcimut,
        }
      : null;
  }
  const objMessier = messier.find((m) => m.id === astro.id);
  return objMessier && objMessier.altitud >= 0
    ? { altitud: objMessier.altitud, acimut: objMessier.acimut }
    : null;
}

interface CajaEtiqueta {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ETIQUETA_TIPO_MESSIER: Readonly<Record<TipoObjetoMessier, string>> = {
  Galaxia: 'Galaxia',
  Nebulosa: 'Nebulosa',
  CumuloGlobular: 'Cúmulo globular',
  CumuloAbierto: 'Cúmulo abierto',
  RemanenteSupernova: 'Remanente supernova',
  Asterismo: 'Asterismo',
};

const ETIQUETA_INSTRUMENTO: Readonly<Record<InstrumentoObservacion, string>> = {
  'Ojo desnudo': 'Ojo desnudo',
  Prismaticos: 'Prismáticos',
  Telescopio: 'Telescopio',
};

function dibujarTextoConHalo(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  colorTexto: string,
  colorHalo: string,
  grosorHalo = 3
) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = grosorHalo;
  ctx.strokeStyle = colorHalo;
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = colorTexto;
  ctx.fillText(texto, x, y);
  ctx.restore();
}

function obtenerColorEstrellaBV(
  bv: number | undefined,
  tema: TemaVisual,
  fallback: string
): string {
  if (tema === 'rojo') return fallback;
  if (bv === undefined || !Number.isFinite(bv)) return fallback;
  if (tema === 'claro') {
    if (bv < 0.0) return '#1d4ed8';
    if (bv < 0.4) return '#1e40af';
    if (bv < 0.8) return '#0f172a';
    if (bv < 1.3) return '#92400e';
    return '#991b1b';
  }
  if (bv < 0.0) return '#93c5fd';
  if (bv < 0.4) return '#e0f2fe';
  if (bv < 0.8) return '#fef9c3';
  if (bv < 1.3) return '#fed7aa';
  return '#fca5a5';
}

function intentarReservarEtiqueta(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  cajas: CajaEtiqueta[],
  tamanoCanvas: number,
  alineacion: CanvasTextAlign = 'left',
  alturaTexto = 11
): boolean {
  const ancho = ctx.measureText(texto).width;
  const margen = 3;
  const x1 =
    alineacion === 'center'
      ? x - ancho / 2
      : alineacion === 'right'
        ? x - ancho
        : x;
  const x2 = x1 + ancho;
  const y1 = y - alturaTexto;
  const y2 = y + 2;

  if (x1 < 10 || x2 > tamanoCanvas - 10 || y1 < 10 || y2 > tamanoCanvas - 10) {
    return false;
  }

  for (const caja of cajas) {
    const separaX = x2 + margen < caja.x1 || x1 - margen > caja.x2;
    const separaY = y2 + margen < caja.y1 || y1 - margen > caja.y2;
    if (!separaX && !separaY) {
      return false;
    }
  }

  cajas.push({ x1, y1, x2, y2 });
  return true;
}

const CLASES_TOOLTIP: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-900/90 border-sky-500/40 text-slate-100 backdrop-blur-md',
  claro: 'bg-slate-50/95 border-slate-300 text-slate-900 shadow-md backdrop-blur-md',
  rojo: 'bg-black border-red-600 text-red-500',
};

const CARDINALES = [
  { label: 'N', az: 0, destacar: true },
  { label: 'NE', az: 45, destacar: false },
  { label: 'E', az: 90, destacar: false },
  { label: 'SE', az: 135, destacar: false },
  { label: 'S', az: 180, destacar: false },
  { label: 'SO', az: 225, destacar: false },
  { label: 'O', az: 270, destacar: false },
  { label: 'NO', az: 315, destacar: false },
];

function proyectar2D(
  altitud: number,
  acimut: number,
  cx: number,
  cy: number,
  radio: number
): PuntoProyectado {
  const r = radio * ((90 - altitud) / 90);
  const rad = (acimut * Math.PI) / 180;
  return {
    x: cx - r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
    escala: 1,
    profundidad: 0,
  };
}

function proyectar3D(
  altitud: number,
  acimut: number,
  cx: number,
  cy: number,
  size: number,
  camara: Camara3D,
  factorRadio = 1
): PuntoProyectado {
  const altRad = (altitud * Math.PI) / 180;
  const azRel = ((acimut - camara.rotAz) * Math.PI) / 180;
  const cosAlt = Math.cos(altRad) * factorRadio;

  const x3 = -cosAlt * Math.sin(azRel);
  const y3 = Math.sin(altRad) * factorRadio;
  const z3 = -cosAlt * Math.cos(azRel);

  const tiltRad = (camara.tilt * Math.PI) / 180;
  const yRot = y3 * Math.cos(tiltRad) - z3 * Math.sin(tiltRad);
  const zRot = y3 * Math.sin(tiltRad) + z3 * Math.cos(tiltRad);

  const distCam = 2.9;
  const escala = distCam / (distCam - zRot);
  const radio3D = size * 0.36;
  const baseY = cy + size * 0.14;

  return {
    x: cx + x3 * radio3D * escala,
    y: baseY - yRot * radio3D * escala,
    escala,
    profundidad: zRot,
  };
}

function dibujarBaseMapa2D(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  radio: number,
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  ctx.fillStyle = paleta.background;
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radio);
  if (tema === 'claro') {
    grad.addColorStop(0, '#eff6ff');
    grad.addColorStop(1, paleta.domeSurface);
  } else if (tema === 'rojo') {
    grad.addColorStop(0, paleta.domeSurface);
    grad.addColorStop(1, '#050000');
  } else {
    grad.addColorStop(0, paleta.domeSurface);
    grad.addColorStop(1, paleta.background);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = paleta.horizonLine;
  ctx.stroke();

  ctx.strokeStyle = paleta.gridPrimary;
  ctx.lineWidth = tema === 'claro' ? 1.1 : 1;
  ctx.setLineDash([4, 4]);

  for (const alt of [30, 60]) {
    const rAnillo = radio * ((90 - alt) / 90);
    ctx.beginPath();
    ctx.arc(cx, cy, rAnillo, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = paleta.gridSecondary;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radio);
  ctx.lineTo(cx, cy + radio);
  ctx.moveTo(cx - radio, cy);
  ctx.lineTo(cx + radio, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = 'bold 13px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const { label, az, destacar } of CARDINALES) {
    const pos = proyectar2D(-7, az, cx, cy, radio);
    const colorTexto = destacar ? paleta.highlightAccent : paleta.labelText;
    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, label, pos.x, pos.y, colorTexto, paleta.labelHalo, 3.2);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(label, pos.x, pos.y);
    }
  }
}

function dibujarBaseMapa3D(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  camara: Camara3D,
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  ctx.fillStyle = paleta.background;
  ctx.fillRect(0, 0, size, size);

  // Halo atmosférico / bóveda detrás del hemisferio celeste
  const cenit = proyectar3D(45, camara.rotAz, cx, cy, size, camara);
  const gradCupula = ctx.createRadialGradient(cenit.x, cenit.y, 12, cx, cy, size * 0.48);
  if (tema === 'claro') {
    gradCupula.addColorStop(0, '#eff6ff');
    gradCupula.addColorStop(0.65, paleta.domeSurface);
    gradCupula.addColorStop(1, paleta.background);
  } else {
    gradCupula.addColorStop(0, paleta.domeSurface);
    gradCupula.addColorStop(1, paleta.background);
  }
  ctx.fillStyle = gradCupula;
  ctx.fillRect(0, 0, size, size);

  // Plano del horizonte (alt = 0°)
  ctx.beginPath();
  const pasos = 72;
  for (let i = 0; i <= pasos; i++) {
    const az = (i / pasos) * 360;
    const p = proyectar3D(0, az, cx, cy, size, camara);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  if (tema === 'claro') {
    ctx.save();
    ctx.globalAlpha = paleta.domeOpacity;
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = tema === 'rojo' ? 'rgba(30, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.55)';
    ctx.fill();
  }
  ctx.lineWidth = tema === 'claro' ? 2 : 1.8;
  ctx.strokeStyle = paleta.horizonLine;
  ctx.stroke();

  // Anillos de altitud 30° y 60° en 3D
  ctx.strokeStyle = paleta.gridPrimary;
  ctx.lineWidth = tema === 'claro' ? 1.15 : 1;
  ctx.setLineDash([4, 4]);

  for (const alt of [30, 60]) {
    ctx.beginPath();
    for (let i = 0; i <= pasos; i++) {
      const az = (i / pasos) * 360;
      const p = proyectar3D(alt, az, cx, cy, size, camara);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Meridianos principales (N-S y E-O) sobre la cúpula
  ctx.strokeStyle = paleta.gridSecondary;
  for (const azBase of [0, 90]) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const ang = (i / 36) * 180;
      const alt = ang <= 90 ? ang : 180 - ang;
      const az = ang <= 90 ? azBase : azBase + 180;
      const p = proyectar3D(alt, az, cx, cy, size, camara);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Puntos cardinales en el perímetro del horizonte 3D
  ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const { label, az, destacar } of CARDINALES) {
    const p = proyectar3D(0, az, cx, cy, size, camara, 1.12);
    const alpha = tema === 'claro'
      ? Math.max(0.75, Math.min(1, 0.85 + p.profundidad * 0.2))
      : Math.max(0.45, Math.min(1, 0.72 + p.profundidad * 0.3));
    const colorTexto = destacar ? paleta.highlightAccent : paleta.labelText;
    ctx.globalAlpha = alpha;
    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, label, p.x, p.y, colorTexto, paleta.labelHalo, 3.2);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(label, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

interface EtiquetaPendiente {
  texto: string;
  x: number;
  y: number;
  color: string;
  fuente: string;
  alineacion: CanvasTextAlign;
  altura: number;
}

function dibujarConstelaciones(
  ctx: CanvasRenderingContext2D,
  constelaciones: ConstelacionCalculada[],
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  paleta: CelestialThemePalette,
  tema: TemaVisual,
  interactivasConstelacion: ConstelacionInteractiva[],
  destacada = false
): EtiquetaPendiente[] {
  const etiquetas: EtiquetaPendiente[] = [];

  ctx.save();
  ctx.strokeStyle = destacada
    ? tema === 'rojo'
      ? '#ff3b3b'
      : paleta.highlightAccent
    : paleta.constellationLine;
  ctx.lineWidth = destacada ? (tema === 'claro' ? 2.4 : 2.1) : tema === 'claro' ? 1.25 : 1.0;
  ctx.lineCap = 'round';

  for (const constelacion of constelaciones) {
    const segmentos2D: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let sumaX = 0;
    let sumaY = 0;
    let conteoPuntos = 0;

    for (const segmento of constelacion.segmentos) {
      if (segmento.desde.altitud < 0 || segmento.hasta.altitud < 0) continue;
      const p1 = proyectarFn(segmento.desde.altitud, segmento.desde.acimut);
      const p2 = proyectarFn(segmento.hasta.altitud, segmento.hasta.acimut);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      segmentos2D.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      sumaX += p1.x + p2.x;
      sumaY += p1.y + p2.y;
      conteoPuntos += 2;
    }

    if (segmentos2D.length > 0) {
      const posCentro =
        constelacion.centroAltitud >= 0
          ? proyectarFn(constelacion.centroAltitud, constelacion.centroAcimut)
          : { x: sumaX / conteoPuntos, y: sumaY / conteoPuntos };

      interactivasConstelacion.push({
        codigo: constelacion.codigo,
        nombreEs: constelacion.nombreEs,
        nombreLatin: constelacion.nombreLatin,
        centroAltitud: constelacion.centroAltitud,
        centroAcimut: constelacion.centroAcimut,
        xCentro: posCentro.x,
        yCentro: posCentro.y,
        segmentos2D,
      });

      if (destacada || constelacion.centroAltitud >= 5) {
        etiquetas.push({
          texto: constelacion.nombreEs,
          x: posCentro.x,
          y: posCentro.y,
          color: destacada
            ? tema === 'rojo'
              ? '#ff5555'
              : paleta.highlightAccent
            : tema === 'claro'
              ? '#1e3a8a'
              : paleta.labelText,
          fuente: destacada
            ? 'bold 12px system-ui, sans-serif'
            : tema === 'claro'
              ? '600 9px system-ui, sans-serif'
              : '9px system-ui, sans-serif',
          alineacion: 'center',
          altura: destacada ? 12 : 9,
        });
      }
    }
  }

  ctx.restore();
  return etiquetas;
}

function dibujarEstrellas(
  ctx: CanvasRenderingContext2D,
  estrellas: EstrellaCalculada[],
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  paleta: CelestialThemePalette,
  tema: TemaVisual,
  interactivos: ObjetoHover[],
  magnitudLimiteVisible?: number
): EtiquetaPendiente[] {
  const limiteMagnitud =
    typeof magnitudLimiteVisible === 'number' && Number.isFinite(magnitudLimiteVisible)
      ? magnitudLimiteVisible
      : Number.POSITIVE_INFINITY;

  const visibles = estrellas
    .filter((est) => est.altitud >= 0 && est.magnitud <= limiteMagnitud)
    .map((est) => ({ pos: proyectarFn(est.altitud, est.acimut), data: est }))
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  const candidatasEtiquetas: { mag: number; etiqueta: EtiquetaPendiente }[] = [];

  for (const { pos, data } of visibles) {
    const tamanoBase = Math.max(1.0, 3.6 - data.magnitud * 0.62);
    const tamano = tamanoBase * Math.max(0.75, Math.min(1.25, pos.escala));
    const colorEstrella = obtenerColorEstrellaBV(
      data.indiceColorBV,
      tema,
      paleta.starDefault
    );

    // Halo luminoso sutil para estrellas muy brillantes
    if (data.magnitud < 1.5) {
      const radioHalo = tamano * 3.2;
      const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radioHalo);
      if (tema === 'rojo') {
        halo.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (tema === 'claro') {
        halo.addColorStop(0, `${colorEstrella}38`);
        halo.addColorStop(1, `${colorEstrella}00`);
      } else {
        halo.addColorStop(0, `${colorEstrella}66`);
        halo.addColorStop(1, `${colorEstrella}00`);
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radioHalo, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, tamano, 0, Math.PI * 2);
    ctx.fillStyle = colorEstrella;
    ctx.fill();

    if (data.nombre && data.magnitud <= 2.1) {
      candidatasEtiquetas.push({
        mag: data.magnitud,
        etiqueta: {
          texto: data.nombre,
          x: pos.x + tamano + 4,
          y: pos.y + 3,
          color: paleta.labelText,
          fuente: tema === 'claro' ? '600 10px system-ui, sans-serif' : '10px system-ui, sans-serif',
          alineacion: 'left',
          altura: 10,
        },
      });
    }

    const nombreVisible = data.nombre ?? data.id;
    interactivos.push({
      id: data.id,
      categoria: 'estrella',
      nombreCorto: nombreVisible,
      nombre: nombreVisible,
      subtitulo: data.nombre ? `Estrella (${data.id})` : `Estrella ${data.id}`,
      altitud: data.altitud,
      acimut: data.acimut,
      magnitud: data.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }

  return candidatasEtiquetas
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 24)
    .map((item) => item.etiqueta);
}

function dibujarSimboloMessier(
  ctx: CanvasRenderingContext2D,
  tipo: TipoObjetoMessier,
  x: number,
  y: number,
  r: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;

  if (tipo === 'Galaxia') {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r * 0.62, -0.45, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === 'CumuloGlobular') {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.moveTo(x - r * 0.9, y);
    ctx.lineTo(x + r * 0.9, y);
    ctx.moveTo(x, y - r * 0.9);
    ctx.lineTo(x, y + r * 0.9);
    ctx.stroke();
  } else if (tipo === 'CumuloAbierto') {
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === 'Nebulosa' || tipo === 'RemanenteSupernova') {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.95);
    ctx.lineTo(x + r * 0.9, y + r * 0.75);
    ctx.lineTo(x - r * 0.9, y + r * 0.75);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function dibujarMessier(
  ctx: CanvasRenderingContext2D,
  messier: MessierCalculado[],
  tema: TemaVisual,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
): EtiquetaPendiente[] {
  const colorMessier =
    tema === 'rojo' ? '#dc2626' : tema === 'claro' ? '#047857' : '#34d399';
  const visibles = messier
    .filter((obj) => obj.altitud >= 0)
    .sort((a, b) => a.magnitud - b.magnitud);

  const etiquetas: EtiquetaPendiente[] = [];
  const mostrarTodosEtiquetados = visibles.length <= 25;

  for (const obj of visibles) {
    const pos = proyectarFn(obj.altitud, obj.acimut);
    const r = 5.5 * Math.max(0.8, Math.min(1.2, pos.escala));

    dibujarSimboloMessier(ctx, obj.tipo, pos.x, pos.y, r, colorMessier);

    if ((mostrarTodosEtiquetados || obj.magnitud <= 8.0) && etiquetas.length < 28) {
      etiquetas.push({
        texto: obj.id,
        x: pos.x + r + 3,
        y: pos.y + 3,
        color: colorMessier,
        fuente: '10px ui-monospace, monospace',
        alineacion: 'left',
        altura: 10,
      });
    }

    const nombreVisible = obj.nombreComun
      ? `${obj.id} · ${obj.nombreComun}`
      : `${obj.id} · ${obj.nombreNGC}`;

    interactivos.push({
      id: obj.id,
      categoria: 'messier',
      nombreCorto: nombreVisible,
      nombre: nombreVisible,
      subtitulo: `${ETIQUETA_TIPO_MESSIER[obj.tipo]} · ${obtenerNombreConstelacionIAU(
        obj.constelacionIAU
      )} · ${ETIQUETA_INSTRUMENTO[obj.instrumentoMinimo]} · ${obj.tamanoArcmin}'`,
      altitud: obj.altitud,
      acimut: obj.acimut,
      magnitud: obj.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }

  return etiquetas;
}

function dibujarCuerpos(
  ctx: CanvasRenderingContext2D,
  cuerpos: CuerpoCeleste[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
): EtiquetaPendiente[] {
  const visibles = cuerpos
    .filter((c) => c.altitud > 0)
    .map((c) => ({ cuerpo: c, pos: proyectarFn(c.altitud, c.acimut) }))
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  const etiquetas: EtiquetaPendiente[] = [];

  for (const { cuerpo, pos } of visibles) {
    const colorCuerpo = tema === 'rojo' ? '#ff2a2a' : cuerpo.color;
    const rBase = cuerpo.tipo === 'luna' ? 7 : 5.5;
    const rCuerpo = rBase * Math.max(0.8, Math.min(1.25, pos.escala));

    // Halo exterior
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCuerpo + 5, 0, Math.PI * 2);
    ctx.fillStyle =
      tema === 'rojo'
        ? 'rgba(255, 0, 0, 0.2)'
        : tema === 'claro'
          ? 'rgba(15, 23, 42, 0.14)'
          : `${colorCuerpo}33`;
    ctx.fill();

    // Anillo inclinado de Saturno
    const esSaturno = cuerpo.id === 'Saturn' || cuerpo.nombre === 'Saturno';
    if (esSaturno) {
      ctx.save();
      ctx.strokeStyle =
        tema === 'rojo' ? '#dc2626' : tema === 'claro' ? '#92400e' : '#fde68a';
      ctx.lineWidth = tema === 'claro' ? 1.8 : 1.6;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rCuerpo * 2.15, rCuerpo * 0.72, -0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Disco del cuerpo
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCuerpo, 0, Math.PI * 2);
    ctx.fillStyle = colorCuerpo;
    ctx.fill();
    if (tema === 'claro') {
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = paleta.horizonLine;
      ctx.stroke();
    }

    etiquetas.push({
      texto: cuerpo.nombre,
      x: pos.x + rCuerpo + (esSaturno ? 10 : 6),
      y: pos.y + 4,
      color: tema === 'claro' ? paleta.labelText : colorCuerpo,
      fuente: 'bold 12px system-ui, sans-serif',
      alineacion: 'left',
      altura: 12,
    });

    interactivos.push({
      id: cuerpo.id,
      categoria: 'cuerpo',
      nombreCorto: cuerpo.nombre,
      nombre: cuerpo.nombre,
      subtitulo: cuerpo.faseLunar ? `${cuerpo.faseLunar} (${cuerpo.iluminacion}%)` : 'Planeta',
      altitud: cuerpo.altitud,
      acimut: cuerpo.acimut,
      magnitud: cuerpo.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }

  return etiquetas;
}

function dibujarEtiquetasPrioritarias(
  ctx: CanvasRenderingContext2D,
  grupos: readonly EtiquetaPendiente[][],
  tamanoCanvas: number,
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  const cajas: CajaEtiqueta[] = [];
  ctx.save();

  for (const grupo of grupos) {
    for (const etiqueta of grupo) {
      ctx.font = etiqueta.fuente;
      if (
        intentarReservarEtiqueta(
          ctx,
          etiqueta.texto,
          etiqueta.x,
          etiqueta.y,
          cajas,
          tamanoCanvas,
          etiqueta.alineacion,
          etiqueta.altura
        )
      ) {
        ctx.textAlign = etiqueta.alineacion;
        if (tema === 'claro') {
          dibujarTextoConHalo(
            ctx,
            etiqueta.texto,
            etiqueta.x,
            etiqueta.y,
            etiqueta.color,
            paleta.labelHalo,
            3
          );
        } else {
          ctx.fillStyle = etiqueta.color;
          ctx.fillText(etiqueta.texto, etiqueta.x, etiqueta.y);
        }
      }
    }
  }

  ctx.restore();
}

function dibujarTrayectoria(
  ctx: CanvasRenderingContext2D,
  trayectoria: PuntoTrayectoria[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  proyectarFn: (alt: number, az: number) => PuntoProyectado
) {
  if (trayectoria.length === 0) return;

  const colorLinea =
    tema === 'rojo'
      ? 'rgba(239, 68, 68, 0.8)'
      : tema === 'claro'
        ? 'rgba(29, 78, 216, 0.82)'
        : 'rgba(56, 189, 248, 0.78)';
  const colorPunto =
    tema === 'rojo' ? '#ff3b3b' : tema === 'claro' ? paleta.highlightAccent : '#7dd3fc';
  const colorTexto =
    tema === 'rojo'
      ? 'rgba(252, 165, 165, 0.88)'
      : tema === 'claro'
        ? paleta.labelText
        : 'rgba(186, 230, 253, 0.9)';

  ctx.save();
  ctx.strokeStyle = colorLinea;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();

  let enTrazo = false;
  const puntosVisibles: { pos: PuntoProyectado; horaEtiqueta: string; indice: number }[] = [];

  for (let i = 0; i < trayectoria.length; i++) {
    const punto = trayectoria[i];
    if (punto.altitud > 0) {
      const pos = proyectarFn(punto.altitud, punto.acimut);
      if (!enTrazo) {
        ctx.moveTo(pos.x, pos.y);
        enTrazo = true;
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
      puntosVisibles.push({ pos, horaEtiqueta: punto.horaEtiqueta, indice: i });
    } else {
      enTrazo = false;
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (const { pos, horaEtiqueta, indice } of puntosVisibles) {
    // Mostrar marcadores horarios discretos cada hora (índices pares)
    if (indice % 2 !== 0) continue;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = colorPunto;
    ctx.fill();

    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, horaEtiqueta, pos.x, pos.y - 5, colorTexto, paleta.labelHalo, 2.8);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(horaEtiqueta, pos.x, pos.y - 5);
    }
  }

  ctx.restore();
}

function dibujarReticulaSeleccion(
  ctx: CanvasRenderingContext2D,
  astroSeleccionado: AstroSeleccionado | null,
  interactivos: ObjetoHover[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  fasePulso: number
) {
  if (!astroSeleccionado) return;

  const objetivo = interactivos.find(
    (item) => item.id === astroSeleccionado.id && item.categoria === astroSeleccionado.categoria
  );
  if (!objetivo) return;

  const colorPrincipal = tema === 'rojo' ? '#ff3b3b' : paleta.highlightAccent;
  const radioBase = objetivo.categoria === 'cuerpo' ? 14 : 11;
  const radioPulso = radioBase + fasePulso * 4.5;

  ctx.save();

  // Anillo exterior pulsante
  ctx.beginPath();
  ctx.arc(objetivo.x, objetivo.y, radioPulso, 0, Math.PI * 2);
  ctx.strokeStyle = colorPrincipal;
  ctx.globalAlpha = 0.85 - fasePulso * 0.45;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Anillo interior y marcas de retícula
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(objetivo.x, objetivo.y, radioBase - 1, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  const tamMarca = 4.5;
  const inicio = radioBase + 1;
  ctx.beginPath();
  ctx.moveTo(objetivo.x - inicio - tamMarca, objetivo.y);
  ctx.lineTo(objetivo.x - inicio, objetivo.y);
  ctx.moveTo(objetivo.x + inicio, objetivo.y);
  ctx.lineTo(objetivo.x + inicio + tamMarca, objetivo.y);
  ctx.moveTo(objetivo.x, objetivo.y - inicio - tamMarca);
  ctx.lineTo(objetivo.x, objetivo.y - inicio);
  ctx.moveTo(objetivo.x, objetivo.y + inicio);
  ctx.lineTo(objetivo.x, objetivo.y + inicio + tamMarca);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

export function SkyMap({
  cuerpos,
  estrellas,
  messier,
  constelaciones,
  estrellasCompletas,
  messierCompletos,
  constelacionesCompletas,
  tema,
  modoMapa,
  onCambiarModoMapa,
  mostrarConstelaciones,
  mostrarEstrellas,
  mostrarMessier,
  astroSeleccionado,
  focusedBodyId = null,
  focusedBodyName,
  isSheetOpen = false,
  onToggleSheet,
  onClearFocus,
  trayectoria,
  onSeleccionarAstro,
  contadorFoco = 0,
  magnitudLimiteVisible,
  bortle,
  instrumentoActivo = 'Todos',
  objetivoDetalleSeleccionado = null,
  esObjetivoEnSesion = false,
  onToggleObjetivo,
}: Readonly<SkyMapProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const escenaBaseRef = useRef<CacheEscenaCanvas | null>(null);
  const [camara, setCamara] = useState<Camara3D>(CAMARA_INICIAL);
  const [hoverInfo, setHoverInfo] = useState<ObjetoHover | null>(null);

  const listaEstrellasFoco = estrellasCompletas ?? estrellas;
  const listaMessierFoco = messierCompletos ?? messier;
  const listaConstelacionesFoco = constelacionesCompletas ?? constelaciones;

  const camaraRef = useRef<Camara3D>(CAMARA_INICIAL);
  const animacionCamaraRef = useRef<number>(0);
  const datosAstrosRef = useRef({
    cuerpos,
    estrellas: listaEstrellasFoco,
    messier: listaMessierFoco,
    constelaciones: listaConstelacionesFoco,
  });
  const puntosInteractivosRef = useRef<ObjetoHover[]>([]);
  const constelacionesInteractivasRef = useRef<ConstelacionInteractiva[]>([]);
  const arrastreRef = useRef<{
    activo: boolean;
    pointerId: number;
    inicioX: number;
    inicioY: number;
    ultimoX: number;
    ultimoY: number;
    movido: boolean;
  } | null>(null);

  useEffect(() => {
    camaraRef.current = camara;
  }, [camara]);

  useEffect(() => {
    datosAstrosRef.current = {
      cuerpos,
      estrellas: listaEstrellasFoco,
      messier: listaMessierFoco,
      constelaciones: listaConstelacionesFoco,
    };
  }, [cuerpos, listaEstrellasFoco, listaMessierFoco, listaConstelacionesFoco]);

  const avisoBajoHorizonte = useMemo(() => {
    if (!focusedBodyId) return null;
    const cuerpo = cuerpos.find((c) => c.id === focusedBodyId);
    if (cuerpo) {
      return cuerpo.altitud <= 0
        ? { nombre: cuerpo.nombre, altitud: cuerpo.altitud, acimut: cuerpo.acimut }
        : null;
    }
    const constelacion = listaConstelacionesFoco.find((c) => c.codigo === focusedBodyId);
    if (constelacion) {
      const tieneSegmentoVisible = constelacion.segmentos.some(
        (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
      );
      return !tieneSegmentoVisible
        ? {
            nombre: constelacion.nombreEs,
            altitud: constelacion.centroAltitud,
            acimut: constelacion.centroAcimut,
          }
        : null;
    }
    const objMessier = listaMessierFoco.find((m) => m.id === focusedBodyId);
    if (objMessier) {
      return objMessier.altitud < 0
        ? {
            nombre: objMessier.nombreComun
              ? `${objMessier.id} · ${objMessier.nombreComun}`
              : objMessier.id,
            altitud: objMessier.altitud,
            acimut: objMessier.acimut,
          }
        : null;
    }
    const estrella = listaEstrellasFoco.find((e) => e.id === focusedBodyId);
    if (estrella) {
      return estrella.altitud < 0
        ? {
            nombre: estrella.nombre ?? estrella.id,
            altitud: estrella.altitud,
            acimut: estrella.acimut,
          }
        : null;
    }
    return null;
  }, [focusedBodyId, cuerpos, listaConstelacionesFoco, listaMessierFoco, listaEstrellasFoco]);

  const cancelarAnimacionCamara = () => {
    if (animacionCamaraRef.current !== 0) {
      window.cancelAnimationFrame(animacionCamaraRef.current);
      animacionCamaraRef.current = 0;
    }
  };

  useEffect(() => {
    if (modoMapa !== '3D' || !astroSeleccionado) return;

    const {
      cuerpos: listaCuerpos,
      estrellas: listaEstrellas,
      messier: listaMessier,
      constelaciones: listaConstelaciones,
    } = datosAstrosRef.current;
    const posicion = buscarPosicionAstroVisible(
      astroSeleccionado,
      listaCuerpos,
      listaEstrellas,
      listaMessier,
      listaConstelaciones
    );
    if (!posicion) return;

    const destino: Camara3D = {
      rotAz: normalizarAcimut(posicion.acimut),
      tilt: calcularTiltParaAltitud(posicion.altitud),
    };

    const prefiereMovimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (animacionCamaraRef.current !== 0) {
      window.cancelAnimationFrame(animacionCamaraRef.current);
      animacionCamaraRef.current = 0;
    }

    if (prefiereMovimientoReducido) {
      animacionCamaraRef.current = window.requestAnimationFrame(() => {
        animacionCamaraRef.current = 0;
        camaraRef.current = destino;
        setCamara(destino);
      });
      return () => {
        if (animacionCamaraRef.current !== 0) {
          window.cancelAnimationFrame(animacionCamaraRef.current);
          animacionCamaraRef.current = 0;
        }
      };
    }

    const origen = camaraRef.current;
    const deltaAz = diferenciaAngularCorta(origen.rotAz, destino.rotAz);
    const deltaTilt = destino.tilt - origen.tilt;

    if (Math.abs(deltaAz) < 0.2 && Math.abs(deltaTilt) < 0.2) return;

    let inicio = 0;
    const paso = (tiempo: number) => {
      if (inicio === 0) inicio = tiempo;
      const progreso = Math.min(1, (tiempo - inicio) / DURACION_TRANSICION_CAMARA_MS);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      const siguiente: Camara3D = {
        rotAz: normalizarAcimut(origen.rotAz + deltaAz * suavizado),
        tilt: origen.tilt + deltaTilt * suavizado,
      };
      camaraRef.current = siguiente;
      setCamara(siguiente);

      if (progreso < 1) {
        animacionCamaraRef.current = window.requestAnimationFrame(paso);
      } else {
        animacionCamaraRef.current = 0;
      }
    };

    animacionCamaraRef.current = window.requestAnimationFrame(paso);

    return () => {
      if (animacionCamaraRef.current !== 0) {
        window.cancelAnimationFrame(animacionCamaraRef.current);
        animacionCamaraRef.current = 0;
      }
    };
  }, [astroSeleccionado, modoMapa, contadorFoco]);

  const claveEscenaBase = useMemo(
    () => ({
      cuerpos,
      estrellas,
      messier,
      constelaciones,
      listaEstrellasFoco,
      listaMessierFoco,
      listaConstelacionesFoco,
      tema,
      modoMapa,
      camara,
      mostrarConstelaciones,
      mostrarEstrellas,
      mostrarMessier,
      trayectoria,
      magnitudLimiteVisible,
      astroSeleccionado,
      focusedBodyId,
    }),
    [
      cuerpos,
      estrellas,
      messier,
      constelaciones,
      listaEstrellasFoco,
      listaMessierFoco,
      listaConstelacionesFoco,
      tema,
      modoMapa,
      camara,
      mostrarConstelaciones,
      mostrarEstrellas,
      mostrarMessier,
      trayectoria,
      magnitudLimiteVisible,
      astroSeleccionado,
      focusedBodyId,
    ]
  );

  // Effect 1: Renderizado de la escena celeste base en el canvas secundario
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = TAMANO_CANVAS;
    const tamanoBuffer = Math.round(size * dpr);

    let cache = escenaBaseRef.current;
    if (!cache) {
      const canvasBase = document.createElement('canvas');
      canvasBase.width = tamanoBuffer;
      canvasBase.height = tamanoBuffer;
      cache = {
        canvas: canvasBase,
        ancho: tamanoBuffer,
        alto: tamanoBuffer,
      };
      escenaBaseRef.current = cache;
    } else if (cache.ancho !== tamanoBuffer || cache.alto !== tamanoBuffer) {
      cache.canvas.width = tamanoBuffer;
      cache.canvas.height = tamanoBuffer;
      cache.ancho = tamanoBuffer;
      cache.alto = tamanoBuffer;
    }

    const ctxBase = cache.canvas.getContext('2d');
    if (!ctxBase) return;

    const cx = size / 2;
    const cy = size / 2;
    const radio = size / 2 - 36;
    const paleta = obtenerPaletaCeleste(tema);

    const proyectarFn =
      modoMapa === '2D'
        ? (alt: number, az: number) => proyectar2D(alt, az, cx, cy, radio)
        : (alt: number, az: number) => proyectar3D(alt, az, cx, cy, size, camara);

    ctxBase.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxBase.clearRect(0, 0, size, size);
    const interactivos: ObjetoHover[] = [];
    const constelacionesInteractivas: ConstelacionInteractiva[] = [];

    if (modoMapa === '2D') {
      dibujarBaseMapa2D(ctxBase, size, cx, cy, radio, paleta, tema);
      ctxBase.save();
      ctxBase.beginPath();
      ctxBase.arc(cx, cy, radio, 0, Math.PI * 2);
      ctxBase.clip();
    } else {
      dibujarBaseMapa3D(ctxBase, size, cx, cy, camara, paleta, tema);
      ctxBase.save();
    }

    let etiquetasConstelaciones: EtiquetaPendiente[] = [];
    let etiquetasEstrellas: EtiquetaPendiente[] = [];
    let etiquetasMessier: EtiquetaPendiente[] = [];
    let etiquetasCuerpos: EtiquetaPendiente[] = [];

    if (focusedBodyId !== null) {
      // Modo Foco reactivo: mantiene horizonte/cardinales y aísla únicamente el objeto enfocado
      const cuerpoEnfocado = cuerpos.find((c) => c.id === focusedBodyId);
      const constelacionEnfocada = !cuerpoEnfocado
        ? listaConstelacionesFoco.find((c) => c.codigo === focusedBodyId)
        : undefined;
      const messierEnfocado =
        !cuerpoEnfocado && !constelacionEnfocada
          ? listaMessierFoco.find((m) => m.id === focusedBodyId)
          : undefined;
      const estrellaEnfocada =
        !cuerpoEnfocado && !constelacionEnfocada && !messierEnfocado
          ? listaEstrellasFoco.find((e) => e.id === focusedBodyId)
          : undefined;

      if (constelacionEnfocada) {
        etiquetasConstelaciones = dibujarConstelaciones(
          ctxBase,
          [constelacionEnfocada],
          proyectarFn,
          paleta,
          tema,
          constelacionesInteractivas,
          true
        );
        const estrellasMiembro = obtenerEstrellasDeConstelacion(
          constelacionEnfocada.codigo,
          listaEstrellasFoco
        );
        etiquetasEstrellas = dibujarEstrellas(
          ctxBase,
          estrellasMiembro,
          proyectarFn,
          paleta,
          tema,
          interactivos
        );
        const targetConst = constelacionesInteractivas[0];
        if (targetConst) {
          interactivos.push({
            id: targetConst.codigo,
            categoria: 'constelacion',
            nombreCorto: targetConst.nombreEs,
            nombre: targetConst.nombreEs,
            subtitulo: `Constelación · ${targetConst.nombreLatin}`,
            altitud: targetConst.centroAltitud,
            acimut: targetConst.centroAcimut,
            magnitud: null,
            x: targetConst.xCentro,
            y: targetConst.yCentro,
          });
        }
      } else if (cuerpoEnfocado) {
        dibujarTrayectoria(ctxBase, trayectoria, tema, paleta, proyectarFn);
        etiquetasCuerpos = dibujarCuerpos(
          ctxBase,
          [cuerpoEnfocado],
          tema,
          paleta,
          proyectarFn,
          interactivos
        );
      } else if (messierEnfocado) {
        dibujarTrayectoria(ctxBase, trayectoria, tema, paleta, proyectarFn);
        etiquetasMessier = dibujarMessier(
          ctxBase,
          [messierEnfocado],
          tema,
          proyectarFn,
          interactivos
        );
      } else if (estrellaEnfocada) {
        dibujarTrayectoria(ctxBase, trayectoria, tema, paleta, proyectarFn);
        etiquetasEstrellas = dibujarEstrellas(
          ctxBase,
          [estrellaEnfocada],
          proyectarFn,
          paleta,
          tema,
          interactivos
        );
      }
    } else {
      etiquetasConstelaciones = mostrarConstelaciones
        ? dibujarConstelaciones(
            ctxBase,
            constelaciones,
            proyectarFn,
            paleta,
            tema,
            constelacionesInteractivas
          )
        : [];

      etiquetasEstrellas = mostrarEstrellas
        ? dibujarEstrellas(
            ctxBase,
            estrellas,
            proyectarFn,
            paleta,
            tema,
            interactivos,
            magnitudLimiteVisible
          )
        : [];

      etiquetasMessier = mostrarMessier
        ? dibujarMessier(ctxBase, messier, tema, proyectarFn, interactivos)
        : [];

      dibujarTrayectoria(ctxBase, trayectoria, tema, paleta, proyectarFn);
      etiquetasCuerpos = dibujarCuerpos(
        ctxBase,
        cuerpos,
        tema,
        paleta,
        proyectarFn,
        interactivos
      );
    }

    const etiquetasSeleccionado: EtiquetaPendiente[] = [];
    if (astroSeleccionado && astroSeleccionado.categoria !== 'constelacion') {
      const objSeleccionado = interactivos.find(
        (item) =>
          item.id === astroSeleccionado.id &&
          item.categoria === astroSeleccionado.categoria
      );
      if (objSeleccionado && objSeleccionado.categoria !== 'cuerpo') {
        etiquetasSeleccionado.push({
          texto: objSeleccionado.nombreCorto,
          x: objSeleccionado.x + 10,
          y: objSeleccionado.y + 3,
          color: tema === 'rojo' ? '#ff5555' : paleta.highlightAccent,
          fuente: 'bold 11px system-ui, sans-serif',
          alineacion: 'left',
          altura: 11,
        });
      }
    }

    dibujarEtiquetasPrioritarias(
      ctxBase,
      [
        etiquetasSeleccionado,
        etiquetasCuerpos,
        etiquetasMessier,
        etiquetasEstrellas,
        etiquetasConstelaciones,
      ],
      size,
      paleta,
      tema
    );

    ctxBase.restore();
    puntosInteractivosRef.current = interactivos;
    constelacionesInteractivasRef.current = constelacionesInteractivas;
  }, [
    cuerpos,
    estrellas,
    messier,
    constelaciones,
    listaEstrellasFoco,
    listaMessierFoco,
    listaConstelacionesFoco,
    tema,
    modoMapa,
    camara,
    mostrarConstelaciones,
    mostrarEstrellas,
    mostrarMessier,
    trayectoria,
    magnitudLimiteVisible,
    astroSeleccionado,
    focusedBodyId,
  ]);

  // Effect 2: Composición desde el canvas cacheado y animación de la retícula de selección
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = TAMANO_CANVAS;
    const tamanoBuffer = Math.round(size * dpr);
    if (canvas.width !== tamanoBuffer || canvas.height !== tamanoBuffer) {
      canvas.width = tamanoBuffer;
      canvas.height = tamanoBuffer;
    }

    const { tema: temaActual, modoMapa: modoActual } = claveEscenaBase;

    const dibujarFrame = (fasePulso: number) => {
      const base = escenaBaseRef.current;
      if (!base) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(base.canvas, 0, 0, size, size);

      if (astroSeleccionado) {
        ctx.save();
        if (modoActual === '2D') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 36, 0, Math.PI * 2);
          ctx.clip();
        }
        dibujarReticulaSeleccion(
          ctx,
          astroSeleccionado,
          puntosInteractivosRef.current,
          temaActual,
          obtenerPaletaCeleste(temaActual),
          fasePulso
        );
        ctx.restore();
      }
    };

    const prefiereMovimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!astroSeleccionado || prefiereMovimientoReducido) {
      dibujarFrame(0.5);
      return;
    }

    // Dibujar inmediatamente para evitar frames en blanco al cambiar escena o tamaño
    dibujarFrame((Math.sin(performance.now() / 320) + 1) / 2);

    let animacionId = 0;
    const animar = (tiempo: number) => {
      const fase = (Math.sin(tiempo / 320) + 1) / 2;
      dibujarFrame(fase);
      animacionId = window.requestAnimationFrame(animar);
    };
    animacionId = window.requestAnimationFrame(animar);

    return () => {
      window.cancelAnimationFrame(animacionId);
    };
  }, [astroSeleccionado, claveEscenaBase]);

  const buscarAstroEnPuntero = (e: PointerEvent<HTMLCanvasElement>): ObjetoHover | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = 560 / rect.width;
    const scaleY = 560 / rect.height;
    const posX = (e.clientX - rect.left) * scaleX;
    const posY = (e.clientY - rect.top) * scaleY;

    const umbral = e.pointerType === 'touch' ? 28 : 18;
    const candidatos: { obj: ObjetoHover; dist: number }[] = [];
    let distMin = umbral;

    for (const obj of puntosInteractivosRef.current) {
      if (obj.categoria === 'constelacion') continue;
      const dist = Math.hypot(obj.x - posX, obj.y - posY);
      if (dist < umbral) {
        candidatos.push({ obj, dist });
        if (dist < distMin) distMin = dist;
      }
    }

    if (candidatos.length > 0) {
      const prioridadCategoria: Record<CategoriaAstro, number> = {
        cuerpo: 4,
        messier: 3,
        estrella: 2,
        constelacion: 1,
      };

      const cercanos = candidatos.filter((c) => c.dist <= distMin + 6);
      cercanos.sort((a, b) => {
        const diffPrio =
          prioridadCategoria[b.obj.categoria] - prioridadCategoria[a.obj.categoria];
        if (diffPrio !== 0) return diffPrio;
        const diffDist = a.dist - b.dist;
        if (Math.abs(diffDist) > 1.5) return diffDist;
        return (a.obj.magnitud ?? 99) - (b.obj.magnitud ?? 99);
      });

      return cercanos[0].obj;
    }

    // Si no se tocó un astro puntual, comprobar líneas o centro de constelaciones visibles
    const umbralConst = e.pointerType === 'touch' ? 22 : 13;
    let mejorConst: ConstelacionInteractiva | null = null;
    let distConstMin = umbralConst;

    for (const c of constelacionesInteractivasRef.current) {
      const distCentro = Math.hypot(c.xCentro - posX, c.yCentro - posY);
      if (distCentro < distConstMin) {
        distConstMin = distCentro;
        mejorConst = c;
      }
      for (const seg of c.segmentos2D) {
        const dSeg = distanciaPuntoASegmento(posX, posY, seg.x1, seg.y1, seg.x2, seg.y2);
        if (dSeg < distConstMin) {
          distConstMin = dSeg;
          mejorConst = c;
        }
      }
    }

    if (!mejorConst) return null;

    return {
      id: mejorConst.codigo,
      categoria: 'constelacion',
      nombreCorto: mejorConst.nombreEs,
      nombre: mejorConst.nombreEs,
      subtitulo: `Constelación · ${mejorConst.nombreLatin}`,
      altitud: mejorConst.centroAltitud,
      acimut: mejorConst.centroAcimut,
      magnitud: null,
      x: mejorConst.xCentro,
      y: mejorConst.yCentro,
    };
  };

  const inspeccionarPuntero = (e: PointerEvent<HTMLCanvasElement>) => {
    setHoverInfo(buscarAstroEnPuntero(e));
  };

  const manejarPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (modoMapa === '3D') {
      cancelarAnimacionCamara();
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastreRef.current = {
        activo: true,
        pointerId: e.pointerId,
        inicioX: e.clientX,
        inicioY: e.clientY,
        ultimoX: e.clientX,
        ultimoY: e.clientY,
        movido: false,
      };
      return;
    }
    inspeccionarPuntero(e);
  };

  const manejarPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    if (modoMapa === '3D' && arrastre && arrastre.activo && arrastre.pointerId === e.pointerId) {
      const dx = e.clientX - arrastre.ultimoX;
      const dy = e.clientY - arrastre.ultimoY;
      if (Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) > 4) {
        arrastre.movido = true;
      }
      arrastre.ultimoX = e.clientX;
      arrastre.ultimoY = e.clientY;

      setCamara((prev) => ({
        rotAz: (prev.rotAz - dx * 0.45 + 360) % 360,
        tilt: Math.max(12, Math.min(85, prev.tilt + dy * 0.35)),
      }));
      return;
    }

    inspeccionarPuntero(e);
  };

  const manejarPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    const fueArrastre = Boolean(arrastre && arrastre.pointerId === e.pointerId && arrastre.movido);

    if (arrastre && arrastre.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      arrastreRef.current = null;
    }

    if (fueArrastre) return;

    if (modoMapa === '3D') {
      inspeccionarPuntero(e);
    }

    const encontrado = buscarAstroEnPuntero(e);
    if (encontrado) {
      if (
        focusedBodyId !== null &&
        encontrado.id === focusedBodyId &&
        onToggleSheet &&
        !isSheetOpen
      ) {
        onToggleSheet(true);
        return;
      }
      onSeleccionarAstro({
        id: encontrado.id,
        nombre: encontrado.nombreCorto,
        categoria: encontrado.categoria,
      });
    } else if (astroSeleccionado && focusedBodyId === null) {
      onSeleccionarAstro(null);
    }
  };

  const manejarPointerCancel = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    if (arrastre && arrastre.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      arrastreRef.current = null;
    }
  };

  const manejarKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (modoMapa !== '3D') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, rotAz: normalizarAcimut(prev.rotAz - 10) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, rotAz: normalizarAcimut(prev.rotAz + 10) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, tilt: Math.min(85, prev.tilt + 5) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, tilt: Math.max(12, prev.tilt - 5) }));
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'Home') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara(CAMARA_INICIAL);
    }
  };

  const claseBotonVista = (activo: boolean) => {
    if (!activo) return 'opacity-70 hover:opacity-100';
    if (tema === 'rojo') return 'bg-red-950 text-red-500 border border-red-600';
    if (tema === 'claro') return 'bg-slate-800 text-white';
    return 'bg-sky-600 text-white';
  };

  const claseBotonObjetivo = (activo: boolean) => {
    if (!activo) return 'border-current/30 hover:bg-current/10';
    if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
    if (tema === 'claro') return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
    return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
  };

  return (
    <div className="relative flex flex-col items-center justify-center space-y-3">
      {/* Controles de Vista 2D / 3D */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
        <div
          role="group"
          aria-label="Modo de proyección del mapa"
          className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5"
        >
          <button
            type="button"
            aria-pressed={modoMapa === '2D'}
            onClick={() => onCambiarModoMapa('2D')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoMapa === '2D'
            )}`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" /> 2D Planisferio
          </button>
          <button
            type="button"
            aria-pressed={modoMapa === '3D'}
            onClick={() => onCambiarModoMapa('3D')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoMapa === '3D'
            )}`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" /> 3D Bóveda
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof magnitudLimiteVisible === 'number' && Number.isFinite(magnitudLimiteVisible) && (
            <span
              title="Magnitud límite visible estimada según escala Bortle, brillo lunar e instrumento"
              className="px-2 py-0.5 rounded-lg border border-current/20 bg-current/5 font-mono text-[11px] opacity-85"
            >
              {instrumentoActivo !== 'Todos'
                ? `Límite ≤ ${magnitudLimiteVisible.toFixed(1)} mag · ${
                    ETIQUETA_INSTRUMENTO[instrumentoActivo]
                  }`
                : `NELM ≤ ${magnitudLimiteVisible.toFixed(1)} mag${
                    bortle !== undefined ? ` · B${bortle}` : ''
                  }`}
            </span>
          )}
          {modoMapa === '3D' ? (
            <>
              <span className="opacity-65 hidden sm:inline">Arrastra para rotar el cielo</span>
              <button
                type="button"
                onClick={() => {
                  cancelarAnimacionCamara();
                  setCamara(CAMARA_INICIAL);
                }}
                className="min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" /> Centrar
              </button>
            </>
          ) : (
            <span className="opacity-60">Toca o pasa el cursor sobre un astro</span>
          )}
        </div>
      </div>

      <div className="relative w-full max-w-140">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={
            modoMapa === '3D'
              ? 'Bóveda celeste interactiva en 3D con estrellas, constelaciones, objetos Messier y planetas'
              : 'Mapa celeste interactivo con estrellas, constelaciones, objetos Messier y planetas'
          }
          onKeyDown={manejarKeyDown}
          onPointerDown={manejarPointerDown}
          onPointerMove={manejarPointerMove}
          onPointerUp={manejarPointerUp}
          onPointerCancel={manejarPointerCancel}
          onPointerLeave={() => {
            if (!arrastreRef.current?.activo) setHoverInfo(null);
          }}
          className={`w-full aspect-square rounded-2xl shadow-2xl ${
            tema === 'claro' ? 'border border-slate-300' : ''
          } ${
            modoMapa === '3D' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-crosshair'
          }`}
        />

        {/* Chip flotante de control del Modo Foco */}
        {focusedBodyId !== null && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute top-2.5 inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-10 px-3 py-1.5 rounded-xl border text-xs flex flex-wrap items-center justify-center gap-2 shadow-lg ${CLASES_TOOLTIP[tema]}`}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold max-w-44 sm:max-w-56 truncate">
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                En foco: {focusedBodyName ?? astroSeleccionado?.nombre ?? focusedBodyId}
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              {onToggleSheet && (
                <button
                  type="button"
                  onClick={() => onToggleSheet()}
                  aria-label={
                    isSheetOpen
                      ? 'Ocultar ficha técnica manteniendo el foco'
                      : 'Ver ficha técnica del objeto enfocado'
                  }
                  className={`min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${claseBotonObjetivo(
                    !isSheetOpen
                  )}`}
                >
                  <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{isSheetOpen ? 'Ocultar ficha' : 'Ver ficha'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => (onClearFocus ? onClearFocus() : onSeleccionarAstro(null))}
                aria-label="Salir del modo foco y mostrar todo el cielo"
                className="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/30 hover:bg-current/10 font-medium cursor-pointer transition-colors motion-reduce:transition-none"
              >
                <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Mostrar todo</span>
              </button>
            </div>
          </div>
        )}

        {/* Aviso discreto cuando el astro en foco se encuentra bajo el horizonte */}
        {avisoBajoHorizonte && (
          <div
            role="status"
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[85%] px-3.5 py-2 rounded-xl border text-xs text-center shadow-lg ${CLASES_TOOLTIP[tema]}`}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {avisoBajoHorizonte.nombre} está bajo el horizonte
            </span>
            <span className="block font-mono text-[11px] opacity-80 mt-0.5">
              Alt {avisoBajoHorizonte.altitud.toFixed(1)}° · Az {avisoBajoHorizonte.acimut.toFixed(1)}°
            </span>
          </div>
        )}
      </div>

      {astroSeleccionado && astroSeleccionado.categoria !== 'constelacion' && (
        <div
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${CLASES_TOOLTIP[tema]}`}
        >
          <div className="min-w-0 space-y-0.5">
            <div className="font-semibold flex flex-wrap items-center gap-2">
              <span>Trayectoria ±6h: {astroSeleccionado.nombre}</span>
              {objetivoDetalleSeleccionado && (
                <span className="font-mono text-[11px] opacity-80">
                  Mag {objetivoDetalleSeleccionado.magnitud.toFixed(1)}
                </span>
              )}
            </div>
            {objetivoDetalleSeleccionado && (
              <div className="font-mono text-[11px] opacity-75 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                {objetivoDetalleSeleccionado.constelacion && (
                  <span>{objetivoDetalleSeleccionado.constelacion}</span>
                )}
                <span>AR {formatearRA(objetivoDetalleSeleccionado.raHoras)}</span>
                <span>Dec {formatearDec(objetivoDetalleSeleccionado.decGrados)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {objetivoDetalleSeleccionado && onToggleObjetivo && (
              <button
                type="button"
                aria-pressed={esObjetivoEnSesion}
                onClick={() => onToggleObjetivo(objetivoDetalleSeleccionado)}
                className={`min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${claseBotonObjetivo(
                  esObjetivoEnSesion
                )}`}
              >
                {esObjetivoEnSesion ? (
                  <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>Objetivo esta noche</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSeleccionarAstro(null)}
              aria-label="Quitar selección de astro"
              className="min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer transition-colors motion-reduce:transition-none"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Limpiar
            </button>
          </div>
        </div>
      )}

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`w-full min-h-11 px-4 py-2 rounded-xl border text-xs font-mono flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${CLASES_TOOLTIP[tema]}`}
      >
        {hoverInfo ? (
          <>
            <span className="font-bold text-sm">{hoverInfo.nombre}</span>
            <span className="opacity-80">{hoverInfo.subtitulo}</span>
            <span>Alt: {hoverInfo.altitud}°</span>
            <span>Acimut: {hoverInfo.acimut}°</span>
            {hoverInfo.magnitud !== null && <span>Mag: {hoverInfo.magnitud}</span>}
          </>
        ) : (
          <span className="font-sans opacity-65 text-center">
            Toca o pasa el cursor sobre un astro para ver sus coordenadas
          </span>
        )}
      </div>
    </div>
  );
}
</file>

<file path="src/App.tsx">
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Compass,
  Moon,
  Sun,
  Calendar,
  MapPin,
  Crosshair,
  Clock,
  Layers,
  Play,
  Pause,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  calcularCielo,
  calcularEstadoSolar,
  calcularTransitoCuerpo,
  calcularTrayectoriaAstro,
} from './core/skyCalculator';
import { obtenerCondicionesMeteo } from './core/weatherService';
import { calcularProximosEventos } from './core/eventsCalculator';
import { SkyMap } from './components/SkyMap';
import { BarraFiltrosCatalogo } from './components/BarraFiltrosCatalogo';
import { WeatherPanel } from './components/WeatherPanel';
import { WeatherAlertsPanel } from './components/weather/WeatherAlertsPanel';
import { EventsPanel } from './components/EventsPanel';
import { StarfieldBackground } from './components/StarfieldBackground';
import { MoonPhase3D } from './components/MoonPhase3D';
import { Navbar } from './components/Navbar';
import { AstronomyGuide } from './components/AstronomyGuide';
import { StarChartTab } from './components/star-chart/StarChartTab';
import { Compass3DModal } from './components/Compass3DModal';
import { CompassWidget } from './components/compass/CompassWidget';
import { CelestialDetailSheet } from './components/CelestialDetailSheet';
import {
  HojaImpresionSesion,
  PlanificadorSesionModal,
} from './components/PlanificadorSesionModal';
import { TodayHighlightsWidget } from './components/widgets/TodayHighlightsWidget';
import { useCelestialFocus } from './hooks/useCelestialFocus';
import { useLocation, MAX_NOMBRE_UBICACION, esUbicacionValida } from './hooks/useLocation';
import { useLunarData } from './hooks/useLunarData';
import { useTodayHighlights } from './hooks/useTodayHighlights';
import { usePreferenciasMapa } from './hooks/usePreferenciasMapa';
import { useTemaVisual } from './hooks/useTemaVisual';
import {
  usePlanificadorSesion,
  type EntradaObjetivoSesion,
} from './hooks/usePlanificadorSesion';
import {
  FILTROS_CATALOGO_POR_DEFECTO,
  useFiltrosCatalogo,
} from './hooks/useFiltrosCatalogo';
import { obtenerNombreConstelacionIAU } from './data/constelacionesIAU';
import {
  BORTLE_POR_DEFECTO,
  DESCRIPCIONES_BORTLE,
  NIVELES_BORTLE,
  calcularCalidadCielo,
  esEscalaBortleValida,
  normalizarEscalaBortle,
} from './utils/astronomia/calidadCielo';
import {
  TEXTO_SIN_OCASO,
  TEXTO_SIN_ORTO,
  esZonaHorariaIANAValida,
  formatearHoraEnZona,
  inferirZonaHorariaPorCoordenadas,
  normalizarZonaHoraria,
} from './utils/lunarCalculations';
import type { LiveEphemerisSnapshot } from './types/celestialDetails';
import type { WeatherAlertCoordinates } from './types/weatherAlerts';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CondicionesMeteo,
  CuerpoCeleste,
  DatosLunares,
  EfemeridesTransito,
  EscalaBortle,
  FiltrosCatalogo,
  MetadatosExportacionSesion,
  ObjetivoBrujula,
  ObjetivoPlanificado,
  TemaVisual,
  Ubicacion,
  UbicacionFavorita,
  VistaActiva,
} from './types/astronomy';

const CLAVE_FAVORITOS = 'skyproject_favoritos_v1';
const MAX_FAVORITOS = 8;
const MAX_RESULTADOS_BUSQUEDA = 8;
const UMBRAL_COORD_DUPLICADA = 0.01;

const ZONAS_HORARIAS_COMUNES: readonly { id: string; etiqueta: string }[] = [
  { id: 'auto', etiqueta: 'Automática (según coordenadas)' },
  { id: 'Europe/Madrid', etiqueta: 'Europe/Madrid (Península)' },
  { id: 'Atlantic/Canary', etiqueta: 'Atlantic/Canary (Canarias)' },
  { id: 'Europe/London', etiqueta: 'Europe/London (UTC/BST)' },
  { id: 'Europe/Berlin', etiqueta: 'Europe/Berlin (Europa Central)' },
  { id: 'Arctic/Longyearbyen', etiqueta: 'Arctic/Longyearbyen (Ártico)' },
  { id: 'America/New_York', etiqueta: 'America/New_York (Este EE. UU.)' },
  { id: 'America/Los_Angeles', etiqueta: 'America/Los_Angeles (Pacífico)' },
  { id: 'America/Santiago', etiqueta: 'America/Santiago (Chile / Andes)' },
  { id: 'Asia/Tokyo', etiqueta: 'Asia/Tokyo (Japón)' },
  { id: 'Australia/Sydney', etiqueta: 'Australia/Sydney (Australia)' },
  { id: 'UTC', etiqueta: 'UTC (Tiempo Universal)' },
];

const CLASES_CONTENEDOR: Record<TemaVisual, string> = {
  oscuro: 'bg-transparent text-slate-100',
  claro: 'bg-transparent text-slate-900',
  rojo: 'bg-transparent text-red-500',
};

const CLASES_TARJETA: Record<TemaVisual, string> = {
  oscuro:
    'hud-esquinas hud-oscuro bg-slate-900/55 backdrop-blur-md border-cyan-400/15',
  claro: 'hud-esquinas hud-claro bg-slate-50/92 backdrop-blur-md border-slate-300 shadow-md shadow-slate-900/8',
  rojo: 'hud-esquinas hud-rojo bg-black/90 border-red-900/70',
};

const CLASES_HOVER_TARJETA: Record<TemaVisual, string> = {
  oscuro: 'hover:border-sky-500/40',
  claro: 'hover:border-slate-400 hover:shadow-lg',
  rojo: 'hover:border-red-600/80',
};

interface FormularioUbicacion {
  nombre: string;
  latitud: string;
  longitud: string;
  altitud: string;
  bortle: EscalaBortle;
  timezone: string;
}

interface ErroresUbicacion {
  latitud?: string;
  longitud?: string;
  altitud?: string;
}

interface ResultadoBusquedaAstro {
  id: string;
  categoria: CategoriaAstro;
  nombreSeleccion: string;
  titulo: string;
  subtitulo: string;
  altitud: number;
  sobreHorizonte: boolean;
  textoBusqueda: string;
  prioridadInicio: boolean;
}

function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarUbicacionFavorita(valor: unknown): UbicacionFavorita | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const obj = valor as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.trim().length === 0) return null;
  if (!esUbicacionValida(valor)) return null;

  return {
    id: obj.id,
    nombre: valor.nombre,
    latitud: valor.latitud,
    longitud: valor.longitud,
    altitud: valor.altitud,
    bortle: normalizarEscalaBortle(valor.bortle),
    timezone: normalizarZonaHoraria(valor.timezone, valor.latitud, valor.longitud),
  };
}

/**
 * Parsea la lista de observatorios favoritos desde localStorage garantizando
 * retrocompatibilidad con registros antiguos sin campo `bortle` (asigna 4).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function parsearFavoritosGuardados(raw: string | null): UbicacionFavorita[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const resultados: UbicacionFavorita[] = [];
    for (const item of parsed) {
      const normalizado = normalizarUbicacionFavorita(item);
      if (normalizado) {
        resultados.push(normalizado);
        if (resultados.length >= MAX_FAVORITOS) break;
      }
    }
    return resultados;
  } catch {
    return [];
  }
}

function leerFavoritosGuardados(): UbicacionFavorita[] {
  try {
    return parsearFavoritosGuardados(localStorage.getItem(CLAVE_FAVORITOS));
  } catch {
    return [];
  }
}

function generarIdFavorito(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function esUbicacionDuplicada(a: Ubicacion, b: Ubicacion): boolean {
  const mismoNombre =
    normalizarTextoBusqueda(a.nombre) !== '' &&
    normalizarTextoBusqueda(a.nombre) === normalizarTextoBusqueda(b.nombre);
  const coordenadasCercanas =
    Math.abs(a.latitud - b.latitud) < UMBRAL_COORD_DUPLICADA &&
    Math.abs(a.longitud - b.longitud) < UMBRAL_COORD_DUPLICADA;
  return mismoNombre || coordenadasCercanas;
}

function guardarEnStorage(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Ignora errores de cuota o modo privado restringido
  }
}

function parsearNumeroEstricto(texto: string): number {
  const limpio = texto.trim();
  if (limpio === '') return Number.NaN;
  return Number(limpio);
}

function validarFormularioUbicacion(form: FormularioUbicacion): {
  errores: ErroresUbicacion;
  ubicacionValida: Ubicacion | null;
} {
  const errores: ErroresUbicacion = {};
  const lat = parsearNumeroEstricto(form.latitud);
  const lon = parsearNumeroEstricto(form.longitud);
  const alt = parsearNumeroEstricto(form.altitud);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errores.latitud = 'Debe estar entre -90 y 90.';
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errores.longitud = 'Debe estar entre -180 y 180.';
  }
  if (!Number.isFinite(alt) || alt < -500 || alt > 9000) {
    errores.altitud = 'Debe estar entre -500 y 9000 m.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, ubicacionValida: null };
  }

  const timezoneResuelta =
    form.timezone === 'auto' || !esZonaHorariaIANAValida(form.timezone)
      ? inferirZonaHorariaPorCoordenadas(lat, lon)
      : form.timezone;

  return {
    errores,
    ubicacionValida: {
      nombre: form.nombre.slice(0, MAX_NOMBRE_UBICACION),
      latitud: lat,
      longitud: lon,
      altitud: alt,
      bortle: normalizarEscalaBortle(form.bortle),
      timezone: timezoneResuelta,
    },
  };
}

function obtenerClaseOptionSelect(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-black text-red-500';
  if (tema === 'claro') return 'bg-slate-50 text-slate-900';
  return 'bg-slate-950 text-slate-100';
}

function obtenerClaseBotonAplicar(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/70 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  return 'border-sky-500/60 bg-sky-600 text-white hover:bg-sky-500';
}

function obtenerClaseErrorInline(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-rose-400 bg-rose-50 text-rose-800';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function obtenerEstadoVisibilidadCuerpo(cuerpo: CuerpoCeleste): {
  etiqueta: string;
  opacidad: string;
} {
  if (cuerpo.altitud > 5) {
    return { etiqueta: 'Sobre el horizonte', opacidad: 'opacity-100' };
  }
  if (cuerpo.altitud > 0) {
    return { etiqueta: 'Muy bajo en el horizonte', opacidad: 'opacity-85' };
  }
  return { etiqueta: 'Bajo el horizonte', opacidad: 'opacity-65' };
}

function formatearFechaParaInput(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const copia = new Date(valida);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 16);
}

function obtenerClaseBotonControlActivo(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'opacity-75 hover:opacity-100';
  if (tema === 'rojo') return 'bg-red-950 text-red-500 border border-red-600';
  if (tema === 'claro') return 'bg-slate-800 text-white';
  return 'bg-sky-600 text-white';
}

function obtenerClaseTarjetaSeleccionada(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-500 ring-1 ring-red-500/50';
  if (tema === 'claro') return 'border-sky-600 ring-1 ring-sky-600/30';
  return 'border-sky-400/80 ring-1 ring-sky-400/40';
}

function obtenerClaseDesplegableBusqueda(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-black border-red-700 text-red-500 shadow-lg shadow-black/80';
  if (tema === 'claro')
    return 'bg-slate-50/95 border-slate-300 text-slate-900 shadow-lg shadow-slate-900/12 backdrop-blur-md';
  return 'bg-slate-950/95 border-slate-700 text-slate-100 shadow-xl shadow-black/60 backdrop-blur-md';
}

function obtenerClaseItemBusqueda(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'hover:bg-current/10';
  if (tema === 'rojo') return 'bg-red-950/80 text-red-400';
  if (tema === 'claro') return 'bg-sky-100 text-slate-900';
  return 'bg-sky-500/20 text-sky-100';
}

function obtenerClaseInsigniaHorizonte(tema: TemaVisual, sobreHorizonte: boolean): string {
  if (!sobreHorizonte) return 'border-current/25 opacity-75';
  if (tema === 'rojo') return 'border-red-600/80 bg-red-950/50 text-red-400';
  if (tema === 'claro') return 'border-emerald-400 bg-emerald-50 text-emerald-800';
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
}

function obtenerClaseChipFavorito(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:border-current/45';
  if (tema === 'rojo') return 'border-red-500 bg-red-950/60 text-red-400';
  if (tema === 'claro') return 'border-sky-600 bg-sky-50 text-sky-900';
  return 'border-sky-400/70 bg-sky-500/15 text-sky-200';
}

function obtenerClaseBotonRestablecer(tema: TemaVisual, confirmando: boolean): string {
  if (confirmando) {
    if (tema === 'rojo') return 'border-red-500 bg-red-950 text-red-300 hover:bg-red-900/80';
    if (tema === 'claro') return 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700';
    return 'border-rose-500 bg-rose-600/90 text-white hover:bg-rose-500';
  }
  if (tema === 'rojo') return 'border-red-800/80 text-red-400 hover:bg-red-950/60';
  if (tema === 'claro') return 'border-rose-300 text-rose-700 hover:bg-rose-50';
  return 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15';
}

function obtenerClaseAvisoExito(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
}

function obtenerClaseBotonObjetivoPlaneta(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:bg-current/10';
  if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
  if (tema === 'claro') return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
  return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
}

function obtenerConstelacionEstrella(idEstrella: string): string {
  const partes = idEstrella.trim().split(/\s+/);
  const sufijo = partes[partes.length - 1] ?? '';
  if (sufijo.length === 3) {
    return obtenerNombreConstelacionIAU(sufijo.toUpperCase());
  }
  return '—';
}

function construirObjetivoPlaneta(cuerpo: CuerpoCeleste): EntradaObjetivoSesion | null {
  if (cuerpo.tipo !== 'planeta') return null;
  if (typeof cuerpo.raHoras !== 'number' || typeof cuerpo.decGrados !== 'number') return null;
  return {
    id: `planeta-${cuerpo.id}`,
    codigo: cuerpo.nombre,
    nombre: cuerpo.nombre,
    categoria: 'planeta',
    magnitud: cuerpo.magnitud,
    constelacion: cuerpo.constelacionIAU
      ? obtenerNombreConstelacionIAU(cuerpo.constelacionIAU)
      : 'Eclíptica',
    raHoras: cuerpo.raHoras,
    decGrados: cuerpo.decGrados,
  };
}

export function App() {
  const {
    ubicacion,
    coordinates,
    cargandoGPS,
    errorGPS,
    actualizarUbicacion,
    detectarGPS: detectarGPSHook,
    limpiarErrorGPS,
    restablecerUbicacion,
  } = useLocation();
  const [formUbicacion, setFormUbicacion] = useState<FormularioUbicacion>(() => ({
    nombre: ubicacion.nombre,
    latitud: String(ubicacion.latitud),
    longitud: String(ubicacion.longitud),
    altitud: String(ubicacion.altitud),
    bortle: normalizarEscalaBortle(ubicacion.bortle),
    timezone: coordinates.timezone,
  }));

  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [favoritos, setFavoritos] = useState<UbicacionFavorita[]>(leerFavoritosGuardados);
  const [avisoFavorito, setAvisoFavorito] = useState<string | null>(null);

  const [fechaStr, setFechaStr] = useState<string>(() => formatearFechaParaInput(new Date()));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidadMinPorSeg, setVelocidadMinPorSeg] = useState<15 | 60>(15);
  const [contadorFoco, setContadorFoco] = useState(0);

  const [busquedaAstro, setBusquedaAstro] = useState('');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [indiceResultadoActivo, setIndiceResultadoActivo] = useState(0);
  const buscadorRef = useRef<HTMLDivElement | null>(null);

  const { tema, setTema, restablecerTema } = useTemaVisual();
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('observatorio');
  const [brujulaAbierta, setBrujulaAbierta] = useState(false);
  const [planificadorAbierto, setPlanificadorAbierto] = useState(false);

  const {
    selectedBodyId,
    isFocusActive,
    isSheetOpen,
    sheetStatus,
    sheetData,
    errorMessage,
    selectBody,
    toggleSheet,
    clearFocus,
  } = useCelestialFocus({
    disableEscapeKey: brujulaAbierta || planificadorAbierto || buscadorAbierto,
  });

  const enfocarAstro = useCallback(
    (bodyId: string) => {
      selectBody(bodyId);
      setContadorFoco((prev) => prev + 1);
    },
    [selectBody]
  );
  const {
    preferencias,
    toggleCapa,
    setModoMapa,
    resetearDatosLocales,
  } = usePreferenciasMapa();
  const [filtrosCatalogo, setFiltrosCatalogo] = useState<FiltrosCatalogo>(
    FILTROS_CATALOGO_POR_DEFECTO
  );
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [avisoReset, setAvisoReset] = useState<string | null>(null);
  const timeoutResetRef = useRef<number | null>(null);
  const omitirGuardadoFavoritosRef = useRef(true);

  const coordenadasEstables = useMemo<Ubicacion>(
    () => ({
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      altitud: ubicacion.altitud,
      nombre: '',
      timezone: coordinates.timezone,
    }),
    [ubicacion.latitud, ubicacion.longitud, ubicacion.altitud, coordinates.timezone]
  );

  const coordenadasAvisosMeteo = useMemo<WeatherAlertCoordinates>(
    () => ({
      latitude: ubicacion.latitud,
      longitude: ubicacion.longitud,
      timezone: coordinates.timezone,
      locationName: coordinates.name || ubicacion.nombre,
    }),
    [ubicacion.latitud, ubicacion.longitud, coordinates.timezone, coordinates.name, ubicacion.nombre]
  );

  const fechaSeleccionada = useMemo(() => {
    const fecha = new Date(fechaStr);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }, [fechaStr]);

  const claveHoraUTC = fechaSeleccionada.toISOString().slice(0, 13);
  const claveConsultaMeteo = `${claveHoraUTC}|${coordenadasEstables.latitud.toFixed(2)}|${coordenadasEstables.longitud.toFixed(2)}|${coordinates.timezone}`;
  const [estadoMeteo, setEstadoMeteo] = useState<{
    clave: string;
    datos: CondicionesMeteo | null;
    aviso: string | null;
  }>({
    clave: '',
    datos: null,
    aviso: null,
  });

  const cargandoMeteo = estadoMeteo.clave !== claveConsultaMeteo;

  const { errores: erroresUbicacion, ubicacionValida: ubicacionFormularioValida } = useMemo(
    () => validarFormularioUbicacion(formUbicacion),
    [formUbicacion]
  );

  const hayErroresUbicacion = Object.keys(erroresUbicacion).length > 0;
  const bortleActual = normalizarEscalaBortle(ubicacion.bortle);
  const ubicacionSinCambios =
    ubicacionFormularioValida !== null &&
    ubicacionFormularioValida.nombre === ubicacion.nombre &&
    ubicacionFormularioValida.latitud === ubicacion.latitud &&
    ubicacionFormularioValida.longitud === ubicacion.longitud &&
    ubicacionFormularioValida.altitud === ubicacion.altitud &&
    normalizarEscalaBortle(ubicacionFormularioValida.bortle) === bortleActual &&
    (ubicacionFormularioValida.timezone ?? coordinates.timezone) === coordinates.timezone;

  useEffect(() => {
    if (omitirGuardadoFavoritosRef.current) {
      omitirGuardadoFavoritosRef.current = false;
      return;
    }
    guardarEnStorage(CLAVE_FAVORITOS, JSON.stringify(favoritos));
  }, [favoritos]);

  useEffect(() => {
    return () => {
      if (timeoutResetRef.current !== null) {
        window.clearTimeout(timeoutResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!buscadorAbierto) return;
    const manejarClickExterior = (evento: globalThis.PointerEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(evento.target as Node)) {
        setBuscadorAbierto(false);
      }
    };
    document.addEventListener('pointerdown', manejarClickExterior);
    return () => {
      document.removeEventListener('pointerdown', manejarClickExterior);
    };
  }, [buscadorAbierto]);

  useEffect(() => {
    if (!reproduciendo) return;
    const intervalo = window.setInterval(() => {
      setFechaStr((prev) => {
        const actual = new Date(prev);
        const base = Number.isNaN(actual.getTime()) ? new Date() : actual;
        const siguiente = new Date(base.getTime() + velocidadMinPorSeg * 60_000);
        return formatearFechaParaInput(siguiente);
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [reproduciendo, velocidadMinPorSeg]);

  useEffect(() => {
    const controller = new AbortController();
    const temporizador = window.setTimeout(() => {
      obtenerCondicionesMeteo(
        new Date(`${claveHoraUTC}:00:00Z`),
        coordenadasEstables,
        controller.signal
      )
        .then(({ datos, aviso }) => {
          if (controller.signal.aborted) return;
          setEstadoMeteo({ clave: claveConsultaMeteo, datos, aviso });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          if (controller.signal.aborted) return;
          setEstadoMeteo({
            clave: claveConsultaMeteo,
            datos: null,
            aviso: 'No se pudo obtener la previsión meteorológica.',
          });
        });
    }, 400);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [claveConsultaMeteo, claveHoraUTC, coordenadasEstables]);

  const estadoSolar = useMemo(
    () => calcularEstadoSolar(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const cuerpos = useMemo(
    () => calcularCielo(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const { lunarData } = useLunarData(coordinates, fechaSeleccionada, ubicacion.altitud);

  const {
    items: destacadosHoy,
    isLoading: cargandoDestacados,
    error: errorDestacados,
    lastUpdated: destacadosActualizadosEn,
    refetch: recargarDestacados,
  } = useTodayHighlights(coordinates, lunarData, {
    referenceDate: fechaSeleccionada,
    altitudeMeters: ubicacion.altitud,
    bortle: bortleActual,
    meteo: estadoMeteo.datos,
  });

  const datosLunares = useMemo<DatosLunares>(() => {
    const luna = cuerpos.find((c) => c.tipo === 'luna');
    if (!luna) {
      return {
        iluminacion: lunarData ? lunarData.illumination / 100 : 0,
        altitudGrados: -90,
        faseNombre: lunarData?.phaseName ?? 'Luna Nueva',
      };
    }
    return {
      iluminacion: (lunarData ? lunarData.illumination : (luna.iluminacion ?? 0)) / 100,
      altitudGrados: luna.altitud,
      faseNombre: lunarData?.phaseName ?? luna.faseLunar ?? 'Luna',
    };
  }, [cuerpos, lunarData]);

  const calidadCielo = useMemo(
    () => calcularCalidadCielo(estadoMeteo.datos?.nubesTotal ?? 0, bortleActual, datosLunares),
    [estadoMeteo.datos?.nubesTotal, bortleActual, datosLunares]
  );

  const {
    estrellas,
    messier,
    constelaciones,
    estrellasCompletas,
    messierCompletos,
    constelacionesCompletas,
    magnitudLimiteEfectiva,
    totalMessierSobreHorizonte,
  } = useFiltrosCatalogo({
    ubicacion: coordenadasEstables,
    fecha: fechaSeleccionada,
    magnitudLimiteVisible: calidadCielo.magnitudLimiteVisible,
    filtros: filtrosCatalogo,
  });

  const contextoSeleccionado = useMemo<{
    astro: AstroSeleccionado | null;
    ephemeris: LiveEphemerisSnapshot | null;
    fallbackName: string;
    fallbackSubtitle: string;
  }>(() => {
    if (!selectedBodyId) {
      return {
        astro: null,
        ephemeris: null,
        fallbackName: 'Objeto celeste',
        fallbackSubtitle: 'Catálogo astronómico',
      };
    }

    const cuerpo = cuerpos.find((c) => c.id === selectedBodyId);
    if (cuerpo) {
      return {
        astro: { id: cuerpo.id, nombre: cuerpo.nombre, categoria: 'cuerpo' },
        ephemeris: {
          azimuthDeg: cuerpo.acimut,
          altitudeDeg: cuerpo.altitud,
          isAboveHorizon: cuerpo.altitud > 0,
          magnitude: cuerpo.magnitud,
        },
        fallbackName: cuerpo.nombre,
        fallbackSubtitle: cuerpo.tipo === 'luna' ? 'Luna' : 'Planeta del Sistema Solar',
      };
    }

    const constelacion = constelacionesCompletas.find((c) => c.codigo === selectedBodyId);
    if (constelacion) {
      const tieneVisible = constelacion.segmentos.some(
        (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
      );
      return {
        astro: {
          id: constelacion.codigo,
          nombre: constelacion.nombreEs,
          categoria: 'constelacion',
        },
        ephemeris: {
          azimuthDeg: constelacion.centroAcimut,
          altitudeDeg: constelacion.centroAltitud,
          isAboveHorizon: tieneVisible || constelacion.centroAltitud >= 0,
        },
        fallbackName: constelacion.nombreEs,
        fallbackSubtitle: `Constelación IAU · ${constelacion.nombreLatin} (${constelacion.codigo})`,
      };
    }

    const objMessier = messierCompletos.find((m) => m.id === selectedBodyId);
    if (objMessier) {
      const nombreMessier = objMessier.nombreComun
        ? `${objMessier.id} · ${objMessier.nombreComun}`
        : `${objMessier.id} · ${objMessier.nombreNGC}`;
      return {
        astro: { id: objMessier.id, nombre: nombreMessier, categoria: 'messier' },
        ephemeris: {
          azimuthDeg: objMessier.acimut,
          altitudeDeg: objMessier.altitud,
          isAboveHorizon: objMessier.altitud >= 0,
          magnitude: objMessier.magnitud,
        },
        fallbackName: nombreMessier,
        fallbackSubtitle: `${objMessier.tipo} (${objMessier.nombreNGC}) · ${obtenerNombreConstelacionIAU(
          objMessier.constelacionIAU
        )}`,
      };
    }

    const estrella = estrellasCompletas.find((e) => e.id === selectedBodyId);
    if (estrella) {
      const nombreEstrella = estrella.nombre ?? estrella.id;
      return {
        astro: { id: estrella.id, nombre: nombreEstrella, categoria: 'estrella' },
        ephemeris: {
          azimuthDeg: estrella.acimut,
          altitudeDeg: estrella.altitud,
          isAboveHorizon: estrella.altitud >= 0,
          magnitude: estrella.magnitud,
        },
        fallbackName: nombreEstrella,
        fallbackSubtitle: `Estrella (${estrella.id}) · ${obtenerConstelacionEstrella(estrella.id)}`,
      };
    }

    return {
      astro: null,
      ephemeris: null,
      fallbackName: selectedBodyId,
      fallbackSubtitle: 'Catálogo astronómico',
    };
  }, [selectedBodyId, cuerpos, constelacionesCompletas, messierCompletos, estrellasCompletas]);

  const astroSeleccionado = contextoSeleccionado.astro;

  const {
    objetivosPlanificados,
    idsEnSesion,
    totalObjetivos: totalObjetivosSesion,
    toggleObjetivo,
    marcarObservado,
    actualizarNota,
    limpiarSesion,
  } = usePlanificadorSesion({
    latitud: coordenadasEstables.latitud,
    longitud: coordenadasEstables.longitud,
    fechaReferencia: fechaSeleccionada,
  });

  const metadatosSesion = useMemo<MetadatosExportacionSesion>(
    () => ({
      ubicacionNombre: ubicacion.nombre || 'Observatorio sin nombre',
      bortle: bortleActual,
      faseLunar: datosLunares.faseNombre,
      fecha: fechaSeleccionada,
    }),
    [ubicacion.nombre, bortleActual, datosLunares.faseNombre, fechaSeleccionada]
  );

  const objetivoDetalleSeleccionado = useMemo<EntradaObjetivoSesion | null>(() => {
    if (!astroSeleccionado || astroSeleccionado.categoria === 'constelacion') return null;
    if (astroSeleccionado.categoria === 'messier') {
      const obj = messierCompletos.find((m) => m.id === astroSeleccionado.id);
      if (!obj) return null;
      return {
        id: `messier-${obj.id}`,
        codigo: obj.id,
        nombre: obj.nombreComun ?? obj.nombreNGC,
        categoria: 'messier',
        magnitud: obj.magnitud,
        constelacion: obtenerNombreConstelacionIAU(obj.constelacionIAU),
        raHoras: obj.raHoras,
        decGrados: obj.decGrados,
      };
    }
    if (astroSeleccionado.categoria === 'estrella') {
      const estrella = estrellasCompletas.find((e) => e.id === astroSeleccionado.id);
      if (!estrella) return null;
      return {
        id: `estrella-${estrella.id}`,
        codigo: estrella.nombre ?? estrella.id,
        nombre: estrella.nombre ? `${estrella.nombre} (${estrella.id})` : estrella.id,
        categoria: 'estrella',
        magnitud: estrella.magnitud,
        constelacion: obtenerConstelacionEstrella(estrella.id),
        raHoras: estrella.raHoras,
        decGrados: estrella.decGrados,
      };
    }
    const cuerpo = cuerpos.find((c) => c.id === astroSeleccionado.id);
    if (!cuerpo) return null;
    return construirObjetivoPlaneta(cuerpo);
  }, [astroSeleccionado, messierCompletos, estrellasCompletas, cuerpos]);

  const resultadosBusqueda = useMemo<ResultadoBusquedaAstro[]>(() => {
    const consulta = normalizarTextoBusqueda(busquedaAstro);
    if (!consulta) return [];

    const coincidencias: ResultadoBusquedaAstro[] = [];

    for (const cuerpo of cuerpos) {
      const nombreNorm = normalizarTextoBusqueda(cuerpo.nombre);
      const idNorm = normalizarTextoBusqueda(cuerpo.id);
      if (nombreNorm.includes(consulta) || idNorm.includes(consulta)) {
        coincidencias.push({
          id: cuerpo.id,
          categoria: 'cuerpo',
          nombreSeleccion: cuerpo.nombre,
          titulo: cuerpo.nombre,
          subtitulo: cuerpo.tipo === 'luna' ? 'Luna' : 'Planeta',
          altitud: cuerpo.altitud,
          sobreHorizonte: cuerpo.altitud > 0,
          textoBusqueda: nombreNorm,
          prioridadInicio: nombreNorm.startsWith(consulta),
        });
      }
    }

    for (const constelacion of constelacionesCompletas) {
      const nombreEsNorm = normalizarTextoBusqueda(constelacion.nombreEs);
      const nombreLatinNorm = normalizarTextoBusqueda(constelacion.nombreLatin);
      const codigoNorm = normalizarTextoBusqueda(constelacion.codigo);
      if (
        nombreEsNorm.includes(consulta) ||
        nombreLatinNorm.includes(consulta) ||
        codigoNorm.includes(consulta)
      ) {
        const tieneVisible = constelacion.segmentos.some(
          (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
        );
        coincidencias.push({
          id: constelacion.codigo,
          categoria: 'constelacion',
          nombreSeleccion: constelacion.nombreEs,
          titulo: constelacion.nombreEs,
          subtitulo: `Constelación (${constelacion.codigo}) · ${constelacion.nombreLatin}`,
          altitud: constelacion.centroAltitud,
          sobreHorizonte: tieneVisible || constelacion.centroAltitud >= 0,
          textoBusqueda: `${nombreEsNorm} ${nombreLatinNorm} ${codigoNorm}`,
          prioridadInicio:
            nombreEsNorm.startsWith(consulta) ||
            nombreLatinNorm.startsWith(consulta) ||
            codigoNorm === consulta,
        });
      }
    }

    for (const estrella of estrellasCompletas) {
      const nombreEstrella = estrella.nombre ?? estrella.id;
      const nombreNorm = normalizarTextoBusqueda(nombreEstrella);
      const idNorm = normalizarTextoBusqueda(estrella.id);
      if (nombreNorm.includes(consulta) || idNorm.includes(consulta)) {
        coincidencias.push({
          id: estrella.id,
          categoria: 'estrella',
          nombreSeleccion: nombreEstrella,
          titulo: nombreEstrella,
          subtitulo: estrella.nombre
            ? `Estrella (${estrella.id}) · Mag ${estrella.magnitud}`
            : `Estrella · Mag ${estrella.magnitud}`,
          altitud: estrella.altitud,
          sobreHorizonte: estrella.altitud >= 0,
          textoBusqueda: `${nombreNorm} ${idNorm}`,
          prioridadInicio: nombreNorm.startsWith(consulta) || idNorm.startsWith(consulta),
        });
      }
    }

    for (const obj of messierCompletos) {
      const idNorm = normalizarTextoBusqueda(obj.id);
      const ngcNorm = normalizarTextoBusqueda(obj.nombreNGC);
      const comunNorm = normalizarTextoBusqueda(obj.nombreComun ?? '');
      const nombreConstEs = obtenerNombreConstelacionIAU(obj.constelacionIAU);
      const constNorm = normalizarTextoBusqueda(`${obj.constelacionIAU} ${nombreConstEs}`);
      if (
        idNorm.includes(consulta) ||
        ngcNorm.includes(consulta) ||
        comunNorm.includes(consulta) ||
        constNorm.includes(consulta)
      ) {
        const nombrePrincipal = obj.nombreComun
          ? `${obj.id} · ${obj.nombreComun}`
          : `${obj.id} · ${obj.nombreNGC}`;
        coincidencias.push({
          id: obj.id,
          categoria: 'messier',
          nombreSeleccion: nombrePrincipal,
          titulo: nombrePrincipal,
          subtitulo: `${obj.tipo} (${obj.nombreNGC}) · ${nombreConstEs}`,
          altitud: obj.altitud,
          sobreHorizonte: obj.altitud >= 0,
          textoBusqueda: `${idNorm} ${comunNorm} ${ngcNorm}`,
          prioridadInicio:
            idNorm.startsWith(consulta) ||
            comunNorm.startsWith(consulta) ||
            ngcNorm.startsWith(consulta),
        });
      }
    }

    return coincidencias
      .sort((a, b) => {
        if (a.prioridadInicio !== b.prioridadInicio) return a.prioridadInicio ? -1 : 1;
        if (a.sobreHorizonte !== b.sobreHorizonte) return a.sobreHorizonte ? -1 : 1;
        return b.altitud - a.altitud;
      })
      .slice(0, MAX_RESULTADOS_BUSQUEDA);
  }, [busquedaAstro, cuerpos, constelacionesCompletas, estrellasCompletas, messierCompletos]);

  const trayectoriaAstro = useMemo(
    () =>
      astroSeleccionado
        ? calcularTrayectoriaAstro(astroSeleccionado, fechaSeleccionada, coordenadasEstables)
        : [],
    [astroSeleccionado, fechaSeleccionada, coordenadasEstables]
  );

  const transitoSeleccionado: EfemeridesTransito | null = useMemo(() => {
    if (!astroSeleccionado || astroSeleccionado.categoria !== 'cuerpo') return null;
    return calcularTransitoCuerpo(astroSeleccionado.id, fechaSeleccionada, coordenadasEstables);
  }, [astroSeleccionado, fechaSeleccionada, coordenadasEstables]);

  const eventos = useMemo(
    () => calcularProximosEventos(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const objetivoBrujula = useMemo<ObjetivoBrujula | null>(() => {
    if (!astroSeleccionado) return null;
    if (astroSeleccionado.categoria === 'cuerpo') {
      const cuerpo = cuerpos.find((c) => c.id === astroSeleccionado.id);
      if (!cuerpo || cuerpo.altitud <= 0 || !Number.isFinite(cuerpo.acimut)) return null;
      return {
        id: cuerpo.id,
        nombre: cuerpo.nombre,
        acimut: cuerpo.acimut,
        altitud: cuerpo.altitud,
        color: cuerpo.color,
      };
    }
    if (astroSeleccionado.categoria === 'estrella') {
      const estrella = estrellasCompletas.find((e) => e.id === astroSeleccionado.id);
      if (!estrella || estrella.altitud <= 0 || !Number.isFinite(estrella.acimut)) return null;
      return {
        id: `estrella-${estrella.id}`,
        nombre: estrella.nombre ?? estrella.id,
        acimut: estrella.acimut,
        altitud: estrella.altitud,
        color: '#fde68a',
      };
    }
    if (astroSeleccionado.categoria === 'constelacion') {
      const constelacion = constelacionesCompletas.find(
        (c) => c.codigo === astroSeleccionado.id
      );
      if (
        !constelacion ||
        constelacion.centroAltitud <= 0 ||
        !Number.isFinite(constelacion.centroAcimut)
      ) {
        return null;
      }
      return {
        id: `constelacion-${constelacion.codigo}`,
        nombre: constelacion.nombreEs,
        acimut: constelacion.centroAcimut,
        altitud: constelacion.centroAltitud,
        color: '#38bdf8',
      };
    }
    const objMessier = messierCompletos.find((m) => m.id === astroSeleccionado.id);
    if (!objMessier || objMessier.altitud <= 0 || !Number.isFinite(objMessier.acimut)) return null;
    const nombreMessier = objMessier.nombreComun
      ? `${objMessier.id} · ${objMessier.nombreComun}`
      : `${objMessier.id} · ${objMessier.nombreNGC}`;
    return {
      id: `messier-${objMessier.id}`,
      nombre: nombreMessier,
      acimut: objMessier.acimut,
      altitud: objMessier.altitud,
      color: '#34d399',
    };
  }, [astroSeleccionado, cuerpos, constelacionesCompletas, estrellasCompletas, messierCompletos]);

  const actualizarCampoUbicacion = (
    campo: Exclude<keyof FormularioUbicacion, 'bortle'>,
    valor: string
  ) => {
    const valorSanitizado =
      campo === 'nombre' ? valor.slice(0, MAX_NOMBRE_UBICACION) : valor;
    setFormUbicacion((prev) => ({ ...prev, [campo]: valorSanitizado }));
    limpiarErrorGPS();
    setAvisoFavorito(null);
  };

  const actualizarBortleUbicacion = (valor: string) => {
    const numero = Number(valor);
    if (!esEscalaBortleValida(numero)) return;
    setFormUbicacion((prev) => ({ ...prev, bortle: numero }));
    limpiarErrorGPS();
    setAvisoFavorito(null);
  };

  const aplicarUbicacionManual = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limpiarErrorGPS();
    setAvisoFavorito(null);
    const { ubicacionValida } = validarFormularioUbicacion(formUbicacion);
    if (!ubicacionValida) return;

    const bortle = normalizarEscalaBortle(ubicacionValida.bortle);
    const timezone = normalizarZonaHoraria(
      ubicacionValida.timezone,
      ubicacionValida.latitud,
      ubicacionValida.longitud
    );
    actualizarUbicacion({ ...ubicacionValida, bortle, timezone });
    setFormUbicacion({
      nombre: ubicacionValida.nombre,
      latitud: String(ubicacionValida.latitud),
      longitud: String(ubicacionValida.longitud),
      altitud: String(ubicacionValida.altitud),
      bortle,
      timezone,
    });
  };

  const guardarUbicacionFavorita = () => {
    setAvisoFavorito(null);
    const { ubicacionValida } = validarFormularioUbicacion(formUbicacion);
    if (!ubicacionValida) {
      setAvisoFavorito('Corrige las coordenadas o la altitud antes de guardar en favoritos.');
      return;
    }

    const nombreLimpio = ubicacionValida.nombre.trim() || 'Observatorio sin nombre';
    const bortle = normalizarEscalaBortle(ubicacionValida.bortle);
    const timezone = normalizarZonaHoraria(
      ubicacionValida.timezone,
      ubicacionValida.latitud,
      ubicacionValida.longitud
    );
    const candidata: Ubicacion & { bortle: EscalaBortle } = {
      ...ubicacionValida,
      nombre: nombreLimpio,
      bortle,
      timezone,
    };

    const duplicado = favoritos.find((fav) => esUbicacionDuplicada(fav, candidata));
    if (duplicado) {
      if (duplicado.bortle !== bortle || duplicado.timezone !== timezone) {
        setFavoritos((prev) =>
          prev.map((fav) => (fav.id === duplicado.id ? { ...fav, bortle, timezone } : fav))
        );
        return;
      }
      setAvisoFavorito('Ya existe un favorito con ese nombre o en coordenadas muy cercanas.');
      return;
    }

    if (favoritos.length >= MAX_FAVORITOS) {
      setAvisoFavorito(`Has alcanzado el límite máximo de ${MAX_FAVORITOS} observatorios favoritos.`);
      return;
    }

    const nuevoFavorito: UbicacionFavorita = {
      ...candidata,
      id: generarIdFavorito(),
      bortle,
      timezone,
    };
    setFavoritos((prev) => [...prev, nuevoFavorito]);
  };

  const cargarUbicacionFavorita = (fav: UbicacionFavorita) => {
    limpiarErrorGPS();
    setAvisoFavorito(null);
    const bortle = normalizarEscalaBortle(fav.bortle);
    const timezone = normalizarZonaHoraria(fav.timezone, fav.latitud, fav.longitud);
    const seleccionada: Ubicacion = {
      nombre: fav.nombre,
      latitud: fav.latitud,
      longitud: fav.longitud,
      altitud: fav.altitud,
      bortle,
      timezone,
    };
    actualizarUbicacion(seleccionada);
    setFormUbicacion({
      nombre: seleccionada.nombre,
      latitud: String(seleccionada.latitud),
      longitud: String(seleccionada.longitud),
      altitud: String(seleccionada.altitud),
      bortle,
      timezone,
    });
  };

  const eliminarUbicacionFavorita = (id: string) => {
    setAvisoFavorito(null);
    setFavoritos((prev) => prev.filter((fav) => fav.id !== id));
  };

  const manejarRestablecerDatosLocales = () => {
    if (!confirmandoReset) {
      setAvisoReset(null);
      setConfirmandoReset(true);
      if (timeoutResetRef.current !== null) {
        window.clearTimeout(timeoutResetRef.current);
      }
      timeoutResetRef.current = window.setTimeout(() => {
        setConfirmandoReset(false);
        timeoutResetRef.current = null;
      }, 3000);
      return;
    }

    if (timeoutResetRef.current !== null) {
      window.clearTimeout(timeoutResetRef.current);
      timeoutResetRef.current = null;
    }
    setConfirmandoReset(false);
    omitirGuardadoFavoritosRef.current = favoritos.length > 0;

    resetearDatosLocales();
    limpiarSesion();

    setAvisoFavorito(null);
    const defecto = restablecerUbicacion();
    setFormUbicacion({
      nombre: defecto.nombre,
      latitud: String(defecto.latitud),
      longitud: String(defecto.longitud),
      altitud: String(defecto.altitud),
      bortle: BORTLE_POR_DEFECTO,
      timezone: normalizarZonaHoraria(defecto.timezone, defecto.latitud, defecto.longitud),
    });
    setFavoritos([]);
    restablecerTema();
    setAvisoReset('Datos locales restablecidos a los valores iniciales.');
  };

  const seleccionarResultadoBusqueda = (resultado: ResultadoBusquedaAstro) => {
    if (resultado.categoria === 'messier') {
      if (!preferencias.capas.messier) {
        toggleCapa('messier', true);
      }
      const visibleConFiltroActual = messier.some((m) => m.id === resultado.id);
      if (!visibleConFiltroActual) {
        setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO);
      }
    } else if (resultado.categoria === 'estrella' && !preferencias.capas.estrellas) {
      toggleCapa('estrellas', true);
    } else if (resultado.categoria === 'constelacion' && !preferencias.capas.constelaciones) {
      toggleCapa('constelaciones', true);
    }
    enfocarAstro(resultado.id);
    setBusquedaAstro(resultado.titulo);
    setBuscadorAbierto(false);
    setIndiceResultadoActivo(0);
  };

  const manejarTeclaBuscador = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (!buscadorAbierto || resultadosBusqueda.length === 0) {
      if (evento.key === 'Escape') {
        setBuscadorAbierto(false);
      }
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceResultadoActivo((prev) => (prev + 1) % resultadosBusqueda.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceResultadoActivo(
        (prev) => (prev - 1 + resultadosBusqueda.length) % resultadosBusqueda.length
      );
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const indiceSeguro = Math.min(indiceResultadoActivo, resultadosBusqueda.length - 1);
      const elegido = resultadosBusqueda[indiceSeguro];
      if (elegido) {
        seleccionarResultadoBusqueda(elegido);
      }
    } else if (evento.key === 'Escape') {
      setBuscadorAbierto(false);
    }
  };

  const manejarCambioFecha = (nuevoValor: string) => {
    if (!nuevoValor) return;
    const fecha = new Date(nuevoValor);
    if (Number.isNaN(fecha.getTime())) return;
    setReproduciendo(false);
    setFechaStr(nuevoValor);
  };

  const detectarGPS = () => {
    detectarGPSHook({
      onResuelta: (nuevaUbicacion) => {
        setFormUbicacion({
          nombre: nuevaUbicacion.nombre,
          latitud: String(nuevaUbicacion.latitud),
          longitud: String(nuevaUbicacion.longitud),
          altitud: String(nuevaUbicacion.altitud),
          bortle: normalizarEscalaBortle(nuevaUbicacion.bortle),
          timezone: normalizarZonaHoraria(
            nuevaUbicacion.timezone,
            nuevaUbicacion.latitud,
            nuevaUbicacion.longitud
          ),
        });
      },
    });
  };

  const ajustarTiempo = (modo: 'ahora' | 'noche' | 'mas1h') => {
    setReproduciendo(false);
    const base = modo === 'mas1h' ? new Date(fechaSeleccionada) : new Date();
    if (modo === 'noche') {
      base.setHours(23, 30, 0, 0);
    } else if (modo === 'mas1h') {
      base.setHours(base.getHours() + 1);
    }
    setFechaStr(formatearFechaParaInput(base));
  };

  const cambiarVista = (vista: VistaActiva) => {
    setVistaActiva(vista);
    const reducido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  };

  const abrirBrujula = () => setBrujulaAbierta(true);
  const cerrarBrujula = useCallback(() => setBrujulaAbierta(false), []);
  const abrirPlanificador = () => setPlanificadorAbierto(true);
  const cerrarPlanificador = useCallback(() => setPlanificadorAbierto(false), []);

  const localizarObjetivoEnMapa = useCallback(
    (objetivo: ObjetivoPlanificado) => {
      setVistaActiva('observatorio');
      if (objetivo.categoria === 'messier') {
        const idOriginal = objetivo.id.replace(/^messier-/, '');
        if (!preferencias.capas.messier) {
          toggleCapa('messier', true);
        }
        setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO);
        enfocarAstro(idOriginal);
      } else if (objetivo.categoria === 'estrella') {
        const idOriginal = objetivo.id.replace(/^estrella-/, '');
        if (!preferencias.capas.estrellas) {
          toggleCapa('estrellas', true);
        }
        enfocarAstro(idOriginal);
      } else {
        const idOriginal = objetivo.id.replace(/^planeta-/, '');
        enfocarAstro(idOriginal);
      }
    },
    [preferencias.capas.estrellas, preferencias.capas.messier, toggleCapa, enfocarAstro]
  );

  const clasesContenedor = CLASES_CONTENEDOR[tema];
  const clasesTarjeta = CLASES_TARJETA[tema];
  const claseHoverTarjeta = CLASES_HOVER_TARJETA[tema];
  const claseEsquemaInput = tema !== 'claro' ? '[color-scheme:dark]' : '';

  return (
    <>
      <div
        className={`no-imprimir tema-${tema} relative min-h-screen transition-colors duration-300 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${clasesContenedor}`}
      >
        <StarfieldBackground tema={tema} />
        <Navbar
          tema={tema}
          onCambiarTema={setTema}
          vistaActiva={vistaActiva}
          onCambiarVista={cambiarVista}
          onAbrirBrujula={abrirBrujula}
          onAbrirPlanificador={abrirPlanificador}
          totalObjetivosSesion={totalObjetivosSesion}
          ubicacion={ubicacion}
          panelUbicacionAbierto={editandoUbicacion}
          onAlternarUbicacion={() => setEditandoUbicacion((prev) => !prev)}
          onDetectarGPS={detectarGPS}
          cargandoGPS={cargandoGPS}
        />
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        {errorGPS && !editandoUbicacion && (
          <p
            role="alert"
            className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
          >
            {errorGPS}
          </p>
        )}

        {/* Panel desplegable de Ubicación */}
        {editandoUbicacion && (
          <section id="panel-ubicacion" className={`p-4 rounded-2xl border ${clasesTarjeta} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Configurar punto de observación
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={guardarUbicacionFavorita}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  Guardar en favoritos
                </button>
                <button
                  type="button"
                  onClick={detectarGPS}
                  disabled={cargandoGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                  {cargandoGPS ? 'Obteniendo GPS...' : 'Usar GPS del dispositivo'}
                </button>
              </div>
            </div>

            {errorGPS && (
              <p
                role="alert"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
              >
                {errorGPS}
              </p>
            )}

            {avisoFavorito && (
              <p
                role="status"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
              >
                {avisoFavorito}
              </p>
            )}

            <form onSubmit={aplicarUbicacionManual} className="space-y-3" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Nombre del lugar</span>
                  <input
                    type="text"
                    maxLength={MAX_NOMBRE_UBICACION}
                    value={formUbicacion.nombre}
                    onChange={(e) => actualizarCampoUbicacion('nombre', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent ${claseEsquemaInput}`}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Latitud (°N)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-90}
                    max={90}
                    step="0.0001"
                    aria-invalid={Boolean(erroresUbicacion.latitud)}
                    aria-describedby={erroresUbicacion.latitud ? 'error-latitud' : undefined}
                    value={formUbicacion.latitud}
                    onChange={(e) => actualizarCampoUbicacion('latitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.latitud && (
                    <span id="error-latitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.latitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Longitud (°E)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-180}
                    max={180}
                    step="0.0001"
                    aria-invalid={Boolean(erroresUbicacion.longitud)}
                    aria-describedby={erroresUbicacion.longitud ? 'error-longitud' : undefined}
                    value={formUbicacion.longitud}
                    onChange={(e) => actualizarCampoUbicacion('longitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.longitud && (
                    <span id="error-longitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.longitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Altitud (metros)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-500}
                    max={9000}
                    aria-invalid={Boolean(erroresUbicacion.altitud)}
                    aria-describedby={erroresUbicacion.altitud ? 'error-altitud' : undefined}
                    value={formUbicacion.altitud}
                    onChange={(e) => actualizarCampoUbicacion('altitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.altitud && (
                    <span id="error-altitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.altitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Escala Bortle (1–9)</span>
                  <select
                    aria-label="Escala Bortle de contaminación lumínica (1 a 9)"
                    value={formUbicacion.bortle}
                    onChange={(e) => actualizarBortleUbicacion(e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent text-xs cursor-pointer ${claseEsquemaInput}`}
                  >
                    {NIVELES_BORTLE.map((nivel) => (
                      <option
                        key={nivel}
                        value={nivel}
                        className={obtenerClaseOptionSelect(tema)}
                      >
                        {DESCRIPCIONES_BORTLE[nivel]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Zona horaria (IANA)</span>
                  <select
                    aria-label="Zona horaria IANA del observatorio"
                    value={formUbicacion.timezone}
                    onChange={(e) => actualizarCampoUbicacion('timezone', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent text-xs font-mono cursor-pointer ${claseEsquemaInput}`}
                  >
                    {ZONAS_HORARIAS_COMUNES.map((zona) => (
                      <option
                        key={zona.id}
                        value={zona.id}
                        className={obtenerClaseOptionSelect(tema)}
                      >
                        {zona.etiqueta}
                      </option>
                    ))}
                    {formUbicacion.timezone !== 'auto' &&
                      !ZONAS_HORARIAS_COMUNES.some((z) => z.id === formUbicacion.timezone) && (
                        <option
                          value={formUbicacion.timezone}
                          className={obtenerClaseOptionSelect(tema)}
                        >
                          {formUbicacion.timezone} (Actual)
                        </option>
                      )}
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={hayErroresUbicacion || ubicacionSinCambios}
                  className={`min-h-10 sm:min-h-8 px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-45 disabled:cursor-not-allowed ${obtenerClaseBotonAplicar(
                    tema
                  )}`}
                >
                  Aplicar ubicación
                </button>
              </div>
            </form>

            {favoritos.length > 0 && (
              <div className="pt-2 border-t border-current/15 space-y-2">
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Observatorios favoritos
                  </span>
                  <span className="font-mono">
                    {favoritos.length}/{MAX_FAVORITOS}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favoritos.map((fav) => {
                    const esActual =
                      Math.abs(fav.latitud - ubicacion.latitud) < 0.0005 &&
                      Math.abs(fav.longitud - ubicacion.longitud) < 0.0005 &&
                      fav.nombre === ubicacion.nombre;
                    return (
                      <div
                        key={fav.id}
                        className={`inline-flex items-center rounded-full border text-xs transition-colors ${obtenerClaseChipFavorito(
                          tema,
                          esActual
                        )}`}
                      >
                        <button
                          type="button"
                          onClick={() => cargarUbicacionFavorita(fav)}
                          title={`${fav.nombre} (${fav.latitud}°, ${fav.longitud}° · ${fav.altitud}m · Bortle ${fav.bortle})`}
                          className="pl-3 pr-2 py-1 cursor-pointer flex items-center gap-1.5 font-medium"
                        >
                          <MapPin className="w-3 h-3 opacity-75 shrink-0" aria-hidden="true" />
                          <span>{fav.nombre}</span>
                          <span className="font-mono text-[10px] opacity-70">B{fav.bortle}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarUbicacionFavorita(fav.id)}
                          aria-label={`Eliminar ${fav.nombre} de favoritos`}
                          title="Eliminar favorito"
                          className="pr-2.5 pl-1 py-1 opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-current/15 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <p className="font-medium">Restablecer datos locales</p>
                <p className="opacity-70">
                  Borra ubicación, favoritos, tema y preferencias del mapa guardadas en este navegador.
                </p>
              </div>
              <button
                type="button"
                onClick={manejarRestablecerDatosLocales}
                aria-label={
                  confirmandoReset
                    ? 'Confirmar borrado de ubicación, favoritos y preferencias guardadas'
                    : 'Restablecer ubicación, favoritos y preferencias guardadas'
                }
                className={`min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonRestablecer(
                  tema,
                  confirmandoReset
                )}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {confirmandoReset ? '¿Confirmar borrado?' : 'Restablecer datos'}
              </button>
            </div>

            {avisoReset && (
              <p
                role="status"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseAvisoExito(tema)}`}
              >
                {avisoReset}
              </p>
            )}
          </section>
        )}

        {vistaActiva === 'guia' ? (
          <AstronomyGuide
            tema={tema}
            claseTarjeta={clasesTarjeta}
            onVolver={() => cambiarVista('observatorio')}
            onAbrirBrujula={abrirBrujula}
          />
        ) : vistaActiva === 'carta' ? (
          <StarChartTab
            tema={tema}
            claseTarjeta={clasesTarjeta}
            initialLatitude={ubicacion.latitud}
            initialLongitude={ubicacion.longitud}
            initialLocationName={ubicacion.nombre}
          />
        ) : (
          <>
            <h1 className="sr-only">SkyProject · Observatorio</h1>
            {/* Barra de Tiempo y Capas */}
            <section
              className={`p-4 rounded-2xl border ${clasesTarjeta} flex flex-wrap items-center justify-between gap-4`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Calendar className="w-5 h-5 opacity-75" aria-hidden="true" />
                <input
                  type="datetime-local"
                  aria-label="Fecha y hora de observación"
                  value={fechaStr}
                  onChange={(e) => manejarCambioFecha(e.target.value)}
                  className={`w-full sm:w-auto min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono text-sm ${claseEsquemaInput}`}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('ahora')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('noche')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Esta noche 23:30
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('mas1h')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" /> +1h
                  </button>
                </div>
                {/* Control de Time-Lapse */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setReproduciendo((prev) => !prev)}
                    aria-pressed={reproduciendo}
                    className={`min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      reproduciendo
                    )}`}
                  >
                    {reproduciendo ? (
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {reproduciendo ? 'Pausa' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(15)}
                    aria-pressed={velocidadMinPorSeg === 15}
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      velocidadMinPorSeg === 15
                    )}`}
                  >
                    +15 min/s
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(60)}
                    aria-pressed={velocidadMinPorSeg === 60}
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      velocidadMinPorSeg === 60
                    )}`}
                  >
                    +1 h/s
                  </button>
                </div>
                {estadoSolar && (
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-current/20 bg-current/5 flex items-center gap-1.5">
                    {estadoSolar.altitudSol >= 0 ? (
                      <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {estadoSolar.fase} (Sol {estadoSolar.altitudSol}°)
                  </span>
                )}
              </div>

              {/* Capas del Mapa */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-70 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Capas:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.constelaciones}
                    onChange={(e) => toggleCapa('constelaciones', e.target.checked)}
                  />
                  <span>Constelaciones</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.estrellas}
                    onChange={(e) => toggleCapa('estrellas', e.target.checked)}
                  />
                  <span>Estrellas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.messier}
                    onChange={(e) => toggleCapa('messier', e.target.checked)}
                  />
                  <span>Messier</span>
                </label>
              </div>
            </section>

            {/* Widget Destacados de hoy */}
            <TodayHighlightsWidget
              items={destacadosHoy}
              isLoading={cargandoDestacados}
              error={errorDestacados}
              lastUpdated={destacadosActualizadosEn}
              timezone={coordinates.timezone}
              locationName={coordinates.name}
              tema={tema}
              claseTarjeta={clasesTarjeta}
              onRetry={recargarDestacados}
              onSelectTimestamp={(fechaObjetivo) => {
                if (Number.isNaN(fechaObjetivo.getTime())) return;
                setReproduciendo(false);
                setFechaStr(formatearFechaParaInput(fechaObjetivo));
              }}
            />

            {/* Contenido Principal: Mapa Celeste + Eventos / Meteo y Efemérides */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Columna Izquierda: Bóveda Celeste + Próximos Eventos */}
              <div className="lg:col-span-7 space-y-6">
                <div className={`p-4 md:p-6 rounded-2xl border ${clasesTarjeta}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                      Bóveda Celeste en Tiempo Real
                    </h2>

                    {/* Buscador global de astros */}
                    <div ref={buscadorRef} className="relative w-full sm:w-72">
                      <div className="relative flex items-center">
                        <Search
                          className="w-3.5 h-3.5 opacity-60 absolute left-2.5 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          role="combobox"
                          aria-label="Buscar astro en el catálogo"
                          aria-expanded={buscadorAbierto && busquedaAstro.trim().length > 0}
                          aria-controls="lista-resultados-astros"
                          aria-autocomplete="list"
                          aria-activedescendant={
                            buscadorAbierto && resultadosBusqueda[indiceResultadoActivo]
                              ? `opcion-astro-${resultadosBusqueda[indiceResultadoActivo].categoria}-${resultadosBusqueda[indiceResultadoActivo].id}`
                              : undefined
                          }
                          value={busquedaAstro}
                          onFocus={() => {
                            if (busquedaAstro.trim().length > 0) setBuscadorAbierto(true);
                          }}
                          onChange={(e) => {
                            setBusquedaAstro(e.target.value);
                            setBuscadorAbierto(e.target.value.trim().length > 0);
                            setIndiceResultadoActivo(0);
                          }}
                          onKeyDown={manejarTeclaBuscador}
                          placeholder="Buscar planeta, estrella, M31, Orión..."
                          className={`w-full pl-8 pr-7 py-1.5 rounded-xl border border-current/25 bg-transparent text-xs focus:outline-none focus:border-current/60 ${claseEsquemaInput}`}
                        />
                        {busquedaAstro && (
                          <button
                            type="button"
                            onClick={() => {
                              setBusquedaAstro('');
                              setBuscadorAbierto(false);
                              setIndiceResultadoActivo(0);
                            }}
                            aria-label="Limpiar búsqueda de astros"
                            className="absolute right-2 opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {buscadorAbierto && busquedaAstro.trim().length > 0 && (
                        <ul
                          id="lista-resultados-astros"
                          role="listbox"
                          aria-label="Resultados de búsqueda de astros"
                          className={`absolute z-30 mt-1.5 w-full rounded-xl border overflow-hidden ${obtenerClaseDesplegableBusqueda(
                            tema
                          )}`}
                        >
                          {resultadosBusqueda.length === 0 ? (
                            <li className="px-3 py-2.5 text-xs opacity-70">
                              Sin coincidencias en el catálogo.
                            </li>
                          ) : (
                            resultadosBusqueda.map((item, indice) => {
                              const activo = indice === indiceResultadoActivo;
                              return (
                                <li
                                  key={`${item.categoria}-${item.id}`}
                                  id={`opcion-astro-${item.categoria}-${item.id}`}
                                  role="option"
                                  aria-selected={activo}
                                >
                                  <button
                                    type="button"
                                    onMouseEnter={() => setIndiceResultadoActivo(indice)}
                                    onClick={() => seleccionarResultadoBusqueda(item)}
                                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${obtenerClaseItemBusqueda(
                                      tema,
                                      activo
                                    )}`}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-xs font-semibold truncate">
                                        {item.titulo}
                                      </span>
                                      <span className="block text-[11px] opacity-70 truncate">
                                        {item.subtitulo}
                                      </span>
                                    </span>
                                    <span
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${obtenerClaseInsigniaHorizonte(
                                        tema,
                                        item.sobreHorizonte
                                      )}`}
                                    >
                                      {item.sobreHorizonte ? 'Sobre' : 'Bajo'} · Alt {item.altitud}°
                                    </span>
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <BarraFiltrosCatalogo
                    filtros={filtrosCatalogo}
                    onCambiarFiltros={(actualizacion) =>
                      setFiltrosCatalogo((prev) => ({ ...prev, ...actualizacion }))
                    }
                    onResetearFiltros={() => setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO)}
                    tema={tema}
                    totalMessierFiltrados={messier.length}
                    totalMessierSobreHorizonte={totalMessierSobreHorizonte}
                    magnitudLimiteEfectiva={magnitudLimiteEfectiva}
                    capaMessierActiva={preferencias.capas.messier}
                  />
                  <SkyMap
                    cuerpos={cuerpos}
                    estrellas={estrellas}
                    messier={messier}
                    constelaciones={constelaciones}
                    estrellasCompletas={estrellasCompletas}
                    messierCompletos={messierCompletos}
                    constelacionesCompletas={constelacionesCompletas}
                    tema={tema}
                    modoMapa={preferencias.modoMapa}
                    onCambiarModoMapa={setModoMapa}
                    mostrarConstelaciones={preferencias.capas.constelaciones}
                    mostrarEstrellas={preferencias.capas.estrellas}
                    mostrarMessier={preferencias.capas.messier}
                    astroSeleccionado={astroSeleccionado}
                    focusedBodyId={isFocusActive ? selectedBodyId : null}
                    focusedBodyName={sheetData?.name ?? contextoSeleccionado.fallbackName}
                    isSheetOpen={isSheetOpen}
                    onToggleSheet={toggleSheet}
                    onClearFocus={clearFocus}
                    trayectoria={trayectoriaAstro}
                    onSeleccionarAstro={(astro) => {
                      if (astro) {
                        enfocarAstro(astro.id);
                      } else {
                        clearFocus();
                      }
                    }}
                    contadorFoco={contadorFoco}
                    magnitudLimiteVisible={magnitudLimiteEfectiva}
                    bortle={bortleActual}
                    instrumentoActivo={filtrosCatalogo.instrumento}
                    objetivoDetalleSeleccionado={objetivoDetalleSeleccionado}
                    esObjetivoEnSesion={
                      objetivoDetalleSeleccionado
                        ? idsEnSesion.has(objetivoDetalleSeleccionado.id)
                        : false
                    }
                    onToggleObjetivo={toggleObjetivo}
                  />
                </div>

                <EventsPanel
                  eventos={eventos}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
                  timezone={coordinates.timezone}
                  onSeleccionarFecha={(fechaEvento) => {
                    setReproduciendo(false);
                    setFechaStr(formatearFechaParaInput(fechaEvento));
                  }}
                />
              </div>

              {/* Columna Derecha: Meteorología + Sistema Solar */}
              <div className="lg:col-span-5 space-y-4">
                <WeatherPanel
                  meteo={estadoMeteo.datos}
                  cargando={cargandoMeteo}
                  aviso={estadoMeteo.aviso}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
                  calidadCielo={calidadCielo}
                  bortle={bortleActual}
                  onSeleccionarHora={(fechaHora) => {
                    if (Number.isNaN(fechaHora.getTime())) return;
                    setReproduciendo(false);
                    setFechaStr(formatearFechaParaInput(fechaHora));
                  }}
                />

                <WeatherAlertsPanel
                  coordinates={coordenadasAvisosMeteo}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
                />

                <CompassWidget tema={tema} claseTarjeta={clasesTarjeta} />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                      Sistema Solar y Luna
                    </h2>
                    <button
                      type="button"
                      onClick={abrirBrujula}
                      aria-haspopup="dialog"
                      className="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg border border-current/25 hover:bg-current/10 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 brujula-icono-animada" aria-hidden="true" />
                      Apuntar con la brújula
                    </button>
                  </div>
                  {cuerpos.map((obj) => {
                    const visibilidad = obtenerEstadoVisibilidadCuerpo(obj);
                    const esLunaConFase =
                      obj.tipo === 'luna' && obj.faseLunar !== undefined && obj.iluminacion !== undefined;
                    const estaSeleccionado =
                      astroSeleccionado?.categoria === 'cuerpo' && astroSeleccionado.id === obj.id;
                    const claseSeleccion = estaSeleccionado ? obtenerClaseTarjetaSeleccionada(tema) : '';
                    const objetivoPlaneta = construirObjetivoPlaneta(obj);
                    const estaEnPlanificador =
                      objetivoPlaneta !== null && idsEnSesion.has(objetivoPlaneta.id);

                    return (
                      <div
                        key={obj.id}
                        className={`w-full tarjeta-3d rounded-xl border ${clasesTarjeta} ${claseHoverTarjeta} ${claseSeleccion} ${
                          estaSeleccionado ? 'opacity-100' : visibilidad.opacidad
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={estaSeleccionado}
                          onClick={() => {
                            if (estaSeleccionado) {
                              clearFocus();
                            } else {
                              enfocarAstro(obj.id);
                            }
                          }}
                          className="w-full text-left cursor-pointer p-3.5"
                        >
                          <div className="flex items-center gap-3.5">
                            {esLunaConFase && (
                              <MoonPhase3D
                                iluminacion={obj.iluminacion ?? 0}
                                faseLunar={obj.faseLunar ?? ''}
                                anguloFase={obj.anguloFase}
                                tema={tema}
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: tema === 'rojo' ? '#ef4444' : obj.color }}
                                  />
                                  {obj.nombre}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full border border-current/25 shrink-0">
                                  {visibilidad.etiqueta}
                                </span>
                              </div>

                              <div className="text-xs flex flex-wrap items-center justify-between gap-2 opacity-85 font-mono">
                                <span className="flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                                  {obj.direccion} ({obj.acimut}°)
                                </span>
                                <span>Alt: {obj.altitud}°</span>
                                <span>Mag: {obj.magnitud}</span>
                                {obj.faseLunar && (
                                  <span>
                                    {lunarData ? lunarData.phaseName : obj.faseLunar} (
                                    {lunarData ? Math.round(lunarData.illumination) : obj.iluminacion}%)
                                  </span>
                                )}
                              </div>

                              {obj.tipo === 'luna' && lunarData && (
                                <div className="mt-1.5 text-[11px] font-mono opacity-75 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Edad: {lunarData.ageDays.toFixed(1)} d</span>
                                  <span>
                                    Orto:{' '}
                                    {formatearHoraEnZona(
                                      lunarData.moonrise,
                                      coordinates.timezone,
                                      TEXTO_SIN_ORTO
                                    )}
                                  </span>
                                  <span>
                                    Ocaso:{' '}
                                    {formatearHoraEnZona(
                                      lunarData.moonset,
                                      coordinates.timezone,
                                      TEXTO_SIN_OCASO
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {estaSeleccionado && transitoSeleccionado && (
                            <div className="mt-2.5 pt-2 border-t border-current/15 text-xs font-mono flex flex-wrap items-center justify-between gap-2 opacity-90">
                              <span>
                                Salida:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.salida,
                                  coordinates.timezone,
                                  TEXTO_SIN_ORTO
                                )}
                              </span>
                              <span>
                                Culminación:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.culminacion,
                                  coordinates.timezone,
                                  '—'
                                )}
                                {transitoSeleccionado.alturaMaxima !== null
                                  ? ` (${transitoSeleccionado.alturaMaxima}°)`
                                  : ''}
                              </span>
                              <span>
                                Puesta:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.puesta,
                                  coordinates.timezone,
                                  TEXTO_SIN_OCASO
                                )}
                              </span>
                            </div>
                          )}
                        </button>

                        {objetivoPlaneta && (
                          <div className="px-3.5 pb-3 pt-0 flex justify-end">
                            <button
                              type="button"
                              aria-pressed={estaEnPlanificador}
                              onClick={() => toggleObjetivo(objetivoPlaneta)}
                              className={`min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonObjetivoPlaneta(
                                tema,
                                estaEnPlanificador
                              )}`}
                            >
                              {estaEnPlanificador ? (
                                <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              )}
                              <span>Objetivo esta noche</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </main>
          </>
        )}
      </div>

      {vistaActiva === 'observatorio' && (
        <CelestialDetailSheet
          isOpen={isSheetOpen}
          status={sheetStatus}
          sheet={sheetData}
          fallbackName={contextoSeleccionado.fallbackName}
          fallbackSubtitle={contextoSeleccionado.fallbackSubtitle}
          ephemeris={contextoSeleccionado.ephemeris}
          errorMessage={errorMessage}
          tema={tema}
          onMinimize={() => toggleSheet(false)}
          onCloseAll={clearFocus}
          onRetry={selectedBodyId ? () => enfocarAstro(selectedBodyId) : undefined}
          objetivoSesion={objetivoDetalleSeleccionado}
          esObjetivoEnSesion={
            objetivoDetalleSeleccionado ? idsEnSesion.has(objetivoDetalleSeleccionado.id) : false
          }
          onToggleObjetivo={toggleObjetivo}
        />
      )}

      {brujulaAbierta && (
        <Compass3DModal
          tema={tema}
          cuerpos={cuerpos}
          ubicacion={ubicacion}
          objetivoSeleccionado={objetivoBrujula}
          onCerrar={cerrarBrujula}
        />
      )}

      {planificadorAbierto && (
        <PlanificadorSesionModal
          tema={tema}
          objetivos={objetivosPlanificados}
          metadatos={metadatosSesion}
          onMarcarObservado={marcarObservado}
          onActualizarNota={actualizarNota}
          onEliminarObjetivo={toggleObjetivo}
          onLimpiarSesion={limpiarSesion}
          onLocalizarEnMapa={localizarObjetivoEnMapa}
          onCerrar={cerrarPlanificador}
        />
      )}
      </div>
      <HojaImpresionSesion
        objetivos={objetivosPlanificados}
        metadatos={metadatosSesion}
      />
    </>
  );
}

export default App;
</file>

</files>
