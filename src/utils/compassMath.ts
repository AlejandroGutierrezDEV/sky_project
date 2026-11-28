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
