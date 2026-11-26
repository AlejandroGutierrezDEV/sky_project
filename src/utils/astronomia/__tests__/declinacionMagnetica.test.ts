import { describe, expect, it } from 'vitest';
import {
  calcularDeclinacionMagnetica,
  formatearDeclinacionMagnetica,
} from '../declinacionMagnetica';

describe('Declinación magnética aproximada (WMM2025)', () => {
  it('mantiene error < 1° en la Península Ibérica y Europa occidental (época 2025–2030)', () => {
    // Valores de referencia WMM2025 (2026): Madrid ~+0.7°, Valencia ~+1.5°, Londres ~+1.2°
    const madrid = calcularDeclinacionMagnetica(40.42, -3.7);
    const valencia = calcularDeclinacionMagnetica(39.47, -0.38);
    const londres = calcularDeclinacionMagnetica(51.51, -0.13);

    expect(Math.abs(madrid - 0.7)).toBeLessThan(1.0);
    expect(Math.abs(valencia - 1.5)).toBeLessThan(1.0);
    expect(Math.abs(londres - 1.2)).toBeLessThan(1.0);
  });

  it('ofrece aproximación global coherente en signo y orden de magnitud', () => {
    // Nueva York ~-12.5° O, Tokio ~-7.9° O, Sídney ~+12.8° E
    const nuevaYork = calcularDeclinacionMagnetica(40.71, -74.01);
    const tokio = calcularDeclinacionMagnetica(35.68, 139.65);
    const sidney = calcularDeclinacionMagnetica(-33.87, 151.21);

    expect(nuevaYork).toBeLessThan(-9);
    expect(nuevaYork).toBeGreaterThan(-16);
    expect(tokio).toBeLessThan(-4);
    expect(tokio).toBeGreaterThan(-12);
    expect(sidney).toBeGreaterThan(9);
    expect(sidney).toBeLessThan(16);
  });

  it('devuelve un número finito acotado en [-180, 180] en (0, 0), polos extremos y valores no finitos', () => {
    const casosExtremos: [number, number][] = [
      [0, 0],
      [90, 0],
      [-90, 0],
      [89.999, 180],
      [-89.999, -180],
      [Number.NaN, 0],
      [40, Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY, Number.NaN],
    ];

    for (const [lat, lon] of casosExtremos) {
      const resultado = calcularDeclinacionMagnetica(lat, lon);
      expect(Number.isFinite(resultado)).toBe(true);
      expect(resultado).toBeGreaterThanOrEqual(-180);
      expect(resultado).toBeLessThanOrEqual(180);
    }
  });

  it('formatea correctamente el indicador discreto con orientación E/O', () => {
    expect(formatearDeclinacionMagnetica(0.84)).toBe('+0.8° E');
    expect(formatearDeclinacionMagnetica(-12.52)).toBe('-12.5° O');
    expect(formatearDeclinacionMagnetica(0.01)).toBe('0.0°');
    expect(formatearDeclinacionMagnetica(Number.NaN)).toBe('0.0°');
  });
});
