import * as Astronomy from 'astronomy-engine';
import type { ClaveDiaCivil, GeoCoordinates, LunarData, MoonPhaseName } from '../types/astronomy';

export const CICLO_SINODICO_DIAS = 29.530588853;
export const ZONA_HORARIA_POR_DEFECTO = 'Europe/Madrid';
export const TEXTO_SIN_ORTO = 'Sin orto hoy';
export const TEXTO_SIN_OCASO = 'Sin ocaso hoy';

const MS_POR_DIA = 86_400_000;
const cacheFormateadoresDiaCivil = new Map<string, Intl.DateTimeFormat>();

export interface LimitesDiaCivilUTC {
  inicioDiaUTC: Date;
  finDiaUTC: Date;
  anio: number;
  mes: number;
  dia: number;
  claveDiaCivil: ClaveDiaCivil;
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

function obtenerFormateadorDiaCivil(timeZone: string): Intl.DateTimeFormat {
  const existente = cacheFormateadoresDiaCivil.get(timeZone);
  if (existente) return existente;
  const nuevo = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  cacheFormateadoresDiaCivil.set(timeZone, nuevo);
  return nuevo;
}

/**
 * Obtiene los componentes de calendario civil `(anio, mes, dia)` de un instante en `timeZone`.
 */
export function obtenerComponentesDiaCivil(
  fecha: Date,
  timeZone: string
): { anio: number; mes: number; dia: number; claveDiaCivil: ClaveDiaCivil } {
  const tzSegura = esZonaHorariaIANAValida(timeZone) ? timeZone : ZONA_HORARIA_POR_DEFECTO;
  const fechaValida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const partes = obtenerFormateadorDiaCivil(tzSegura).formatToParts(fechaValida);

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

  const claveDiaCivil: ClaveDiaCivil = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
    dia
  ).padStart(2, '0')}`;

  return { anio, mes, dia, claveDiaCivil };
}

/**
 * Calcula la clave de día civil (`YYYY-MM-DD`) de un instante en la zona horaria IANA indicada.
 */
export function obtenerClaveDiaCivil(fecha: Date, timezone: string): ClaveDiaCivil {
  return obtenerComponentesDiaCivil(fecha, timezone).claveDiaCivil;
}

/**
 * Construye una fecha UTC determinista anclada a una `ClaveDiaCivil` (`YYYY-MM-DD`)
 * y a la zona horaria IANA del observatorio (por defecto a las 12:00 locales).
 */
export function obtenerFechaReferenciaDiaCivil(
  claveDiaCivil: ClaveDiaCivil,
  timezone: string,
  horaLocal = 12
): Date {
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(claveDiaCivil.trim());
  if (coincidencia) {
    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);
    const horaSegura = Number.isFinite(horaLocal)
      ? Math.max(0, Math.min(23, Math.trunc(horaLocal)))
      : 12;
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return crearFechaUTCDesdeCivil(anio, mes, dia, horaSegura, 0, tzSegura);
    }
  }
  const { anio, mes, dia } = obtenerComponentesDiaCivil(new Date(), tzSegura);
  return crearFechaUTCDesdeCivil(anio, mes, dia, 12, 0, tzSegura);
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
 * Calcula el instante UTC exacto correspondiente a una hora y minuto locales (`hora:minuto`)
 * del día civil actual de `fechaReferencia` dentro de la zona horaria IANA `timezone`.
 */
export function calcularInstanteHoraLocalObservatorio(
  fechaReferencia: Date,
  hora: number,
  minuto: number,
  timezone: string
): Date {
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  const { anio, mes, dia } = obtenerComponentesDiaCivil(fechaReferencia, tzSegura);
  const horaSegura = Number.isFinite(hora) ? Math.max(0, Math.min(23, Math.trunc(hora))) : 0;
  const minutoSeguro = Number.isFinite(minuto) ? Math.max(0, Math.min(59, Math.trunc(minuto))) : 0;
  return crearFechaUTCDesdeCivil(anio, mes, dia, horaSegura, minutoSeguro, tzSegura);
}

/**
 * Formatea un instante UTC como cadena `YYYY-MM-DDTHH:MM` en la zona horaria IANA del observatorio
 * para controles `<input type="datetime-local">` sin depender del huso del navegador.
 */
export function formatearFechaInputEnZona(fecha: Date, timezone: string): string {
  const tzSegura = esZonaHorariaIANAValida(timezone) ? timezone : ZONA_HORARIA_POR_DEFECTO;
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tzSegura,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(valida);

  let anio = String(valida.getUTCFullYear()).padStart(4, '0');
  let mes = String(valida.getUTCMonth() + 1).padStart(2, '0');
  let dia = String(valida.getUTCDate()).padStart(2, '0');
  let hora = '00';
  let minuto = '00';

  for (const parte of partes) {
    if (parte.type === 'year') anio = parte.value.padStart(4, '0');
    else if (parte.type === 'month') mes = parte.value.padStart(2, '0');
    else if (parte.type === 'day') dia = parte.value.padStart(2, '0');
    else if (parte.type === 'hour') hora = parte.value === '24' ? '00' : parte.value.padStart(2, '0');
    else if (parte.type === 'minute') minuto = parte.value.padStart(2, '0');
  }

  return `${anio}-${mes}-${dia}T${hora}:${minuto}`;
}

/**
 * Parsea un valor `YYYY-MM-DDTHH:MM` de un `<input type="datetime-local">`
 * interpretándolo estrictamente en la zona horaria IANA `timezone`.
 */
export function parsearFechaInputEnZona(valorInput: string, timezone: string): Date | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    valorInput.trim()
  );
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const hora = Number(coincidencia[4]);
  const minuto = Number(coincidencia[5]);

  if (
    !Number.isFinite(anio) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return null;
  }

  const fecha = crearFechaUTCDesdeCivil(anio, mes, dia, hora, minuto, timezone);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Calcula el ángulo de fase esférico θ (en grados, [0, 180]) a partir del porcentaje
 * de iluminación lunar [0, 100] mediante θ = arccos(1 - 2 · iluminacion).
 */
export function calcularAnguloFaseEsferico(iluminacionPorcentaje: number): number {
  const porcentajeValido = Number.isFinite(iluminacionPorcentaje) ? iluminacionPorcentaje : 0;
  const fraccion = Math.max(0, Math.min(1, porcentajeValido / 100));
  const coseno = Math.max(-1, Math.min(1, 1 - 2 * fraccion));
  return (Math.acos(coseno) * 180) / Math.PI;
}

/**
 * Devuelve la rotación visual (0° en Hemisferio Norte/ecuador, 180° en Hemisferio Sur)
 * para representar la orientación correcta del disco lunar según la latitud del observador.
 */
export function calcularRotacionHemisferioLunar(latitud?: number): 0 | 180 {
  if (typeof latitud === 'number' && Number.isFinite(latitud) && latitud < 0) {
    return 180;
  }
  return 0;
}

/**
 * Resuelve el ángulo de fase efectivo en grados [0, 360) combinando `anguloFase`
 * (si está disponible) o la fórmula esférica θ = arccos(1 - 2 · iluminación)
 * respetando si la fase textual corresponde a un periodo menguante.
 */
export function resolverAnguloFaseLunar(
  iluminacionPorcentaje: number,
  faseLunar: string,
  anguloFase?: number
): number {
  if (typeof anguloFase === 'number' && Number.isFinite(anguloFase)) {
    return ((anguloFase % 360) + 360) % 360;
  }
  const thetaGrados = calcularAnguloFaseEsferico(iluminacionPorcentaje);
  const esMenguante = faseLunar.toLowerCase().includes('menguante');
  return esMenguante ? (360 - thetaGrados) % 360 : thetaGrados;
}

/**
 * Construye el trazado SVG de la región iluminada del disco lunar (en orientación boreal base)
 * usando la proyección elíptica del terminador esférico rx = |cos(θ)| · r.
 */
export function construirRutaIluminadaLunar(
  anguloGrados: number,
  cx: number,
  cy: number,
  r: number
): string | null {
  const normalizado = ((anguloGrados % 360) + 360) % 360;
  if (normalizado < 2 || normalizado > 358) return null;
  if (Math.abs(normalizado - 180) < 2) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }

  const rad = (normalizado * Math.PI) / 180;
  const rx = Number(Math.max(0.5, Math.abs(Math.cos(rad)) * r).toFixed(2));

  if (normalizado < 180) {
    // Fase creciente (Hemisferio Norte: limbo derecho iluminado)
    const sweepTerminador = normalizado < 90 ? 0 : 1;
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminador} ${cx} ${cy - r} Z`;
  }

  // Fase menguante (Hemisferio Norte: limbo izquierdo iluminado)
  const sweepTerminador = normalizado < 270 ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminador} ${cx} ${cy - r} Z`;
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
