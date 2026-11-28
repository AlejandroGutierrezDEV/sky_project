import type { EstrellaCatalogo } from '../types/astronomy';
import type {
  HorizontalCoordinates,
  ProjectedPoint,
  ProjectedStar,
  SpectralClass,
  StarCatalogEntry,
  StarChartObserver,
} from '../types/starChart';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MS_PER_DAY = 86_400_000;
const UNIX_EPOCH_JD = 2_440_587.5;
const J2000_JD = 2_451_545.0;

/** Altitud mínima segura para evitar la singularidad en el nadir (-90°) en proyección estereográfica. */
export const ALTITUD_MINIMA_ESTEREOGRAFICA = -85;

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

export interface PuntoHorizontal {
  altitud: number;
  acimut: number;
}

/**
 * Recorta un segmento en coordenadas horizontales al plano del horizonte (`altitud = 0°`)
 * mediante interpolación lineal usando el camino angular más corto en azimut.
 * Devuelve `null` si todo el segmento queda bajo el horizonte o tiene longitud nula sobre él.
 */
export function recortarSegmentoAlHorizonte(
  desde: PuntoHorizontal,
  hasta: PuntoHorizontal
): { desde: PuntoHorizontal; hasta: PuntoHorizontal } | null {
  const a1 = desde.altitud;
  const a2 = hasta.altitud;

  if (!Number.isFinite(a1) || !Number.isFinite(a2)) return null;
  if (!Number.isFinite(desde.acimut) || !Number.isFinite(hasta.acimut)) return null;

  if (a1 < 0 && a2 < 0) return null;
  if ((a1 <= 0 && a2 < 0) || (a2 <= 0 && a1 < 0)) return null;
  if (a1 >= 0 && a2 >= 0) {
    return { desde, hasta };
  }

  const deltaAlt = a2 - a1;
  if (deltaAlt === 0) return null;

  const t = (0 - a1) / deltaAlt;
  const deltaAz = ((hasta.acimut - desde.acimut + 540) % 360) - 180;
  const acimutCruce = normalizeDegrees(desde.acimut + t * deltaAz);
  const puntoHorizonte: PuntoHorizontal = { altitud: 0, acimut: acimutCruce };

  if (a1 > 0) {
    return { desde, hasta: puntoHorizonte };
  }
  return { desde: puntoHorizonte, hasta };
}

/**
 * Convierte el índice de color B-V a la clase espectral principal (O, B, A, F, G, K, M).
 */
export function indiceColorBVAClaseEspectral(indiceColorBV?: number): SpectralClass {
  if (indiceColorBV === undefined || !Number.isFinite(indiceColorBV)) return 'A';
  if (indiceColorBV < -0.22) return 'O';
  if (indiceColorBV < 0.0) return 'B';
  if (indiceColorBV < 0.3) return 'A';
  if (indiceColorBV < 0.58) return 'F';
  if (indiceColorBV < 0.82) return 'G';
  if (indiceColorBV < 1.4) return 'K';
  return 'M';
}

/**
 * Adapta el catálogo estelar único (`CATALOGO_ESTRELLAS`) al formato de entrada de la Carta Astronómica.
 */
export function adaptarEstrellasParaCarta(
  estrellas: readonly EstrellaCatalogo[]
): StarCatalogEntry[] {
  return estrellas.map((estrella) => {
    const partes = estrella.id.trim().split(/\s+/);
    const sufijo = partes[partes.length - 1] ?? '';
    const codigoIAU = /^[A-Za-z]{3}$/.test(sufijo) ? sufijo.toUpperCase() : '—';

    return {
      id: estrella.id,
      name: estrella.nombre ?? estrella.id,
      constellation: codigoIAU,
      raHours: estrella.raHoras,
      decDeg: estrella.decGrados,
      magnitude: estrella.magnitud,
      spectralClass: indiceColorBVAClaseEspectral(estrella.indiceColorBV),
    };
  });
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
  if (!Number.isFinite(altDeg) || !Number.isFinite(azDeg) || !Number.isFinite(radius) || radius <= 0) {
    return { x: centerX, y: centerY };
  }
  // Evita singularidad y estiramientos extremos cerca del nadir (alt <= -85°)
  const safeAlt = clamp(altDeg, ALTITUD_MINIMA_ESTEREOGRAFICA, 90);
  const zenithDistanceRad = ((90 - safeAlt) / 2) * DEG_TO_RAD;
  const cosZenith = Math.cos(zenithDistanceRad);
  const projectedRadius =
    Math.abs(cosZenith) < 1e-6 ? radius : radius * (Math.sin(zenithDistanceRad) / cosZenith);
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
