import { describe, expect, it } from 'vitest';
import {
  aplicarDeclinacionMagnetica,
  calcularOrientacionDesdeSensores,
} from '../Compass3DModal';

/** Distancia angular mínima entre dos rumbos en grados [0, 180]. */
function errorAngular(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

describe('Orientación 3D de la Brújula Astronómica (W3C Z-X\'-Y\'\')', () => {
  it('mantiene rumbo estable y altitud real al levantar el móvil apuntando al cielo (40°–85°)', () => {
    const casosNorte = [
      { beta: 90, altEsperada: 0 },
      { beta: 130, altEsperada: 40 },
      { beta: 150, altEsperada: 60 },
      { beta: 175, altEsperada: 85 },
    ];

    for (const { beta, altEsperada } of casosNorte) {
      const res = calcularOrientacionDesdeSensores(0, beta, 0, 0);
      expect(errorAngular(res.rumbo, 0)).toBeLessThan(0.01);
      expect(res.altitudApuntado).toBeCloseTo(altEsperada, 2);
    }

    // Apuntando al Este (90°) a +45° y +85° de elevación (sin salto de 180° cerca del cenit)
    const este45 = calcularOrientacionDesdeSensores(270, 135, 0, 0);
    expect(errorAngular(este45.rumbo, 90)).toBeLessThan(0.01);
    expect(este45.altitudApuntado).toBeCloseTo(45, 2);

    const este85 = calcularOrientacionDesdeSensores(270, 175, 0, 0);
    expect(errorAngular(este85.rumbo, 90)).toBeLessThan(0.01);
    expect(este85.altitudApuntado).toBeCloseTo(85, 2);
  });

  it('evita el salto de 180° por Gimbal Lock ante parametrizaciones equivalentes de Euler', () => {
    const directo = calcularOrientacionDesdeSensores(0, 135, 0, 0);
    const equivalenteEuler = calcularOrientacionDesdeSensores(180, 45, 180, 0);

    expect(errorAngular(directo.rumbo, equivalenteEuler.rumbo)).toBeLessThan(0.01);
    expect(directo.altitudApuntado).toBeCloseTo(45, 2);
    expect(equivalenteEuler.altitudApuntado).toBeCloseTo(45, 2);
  });

  it('usa el vector superior de respaldo cuando el teléfono está plano o casi plano', () => {
    const casosPlanos = [
      { alpha: 0, rumboEsperado: 0 },
      { alpha: 270, rumboEsperado: 90 },
      { alpha: 180, rumboEsperado: 180 },
      { alpha: 90, rumboEsperado: 270 },
    ];

    for (const { alpha, rumboEsperado } of casosPlanos) {
      const res = calcularOrientacionDesdeSensores(alpha, 0, 0, 0);
      expect(errorAngular(res.rumbo, rumboEsperado)).toBeLessThan(0.01);
      expect(res.altitudApuntado).toBeCloseTo(-90, 2);
    }

    // Casi plano (beta = 5°, proyección horizontal ~0.087 < 0.15) mirando al Este
    const casiPlanoEste = calcularOrientacionDesdeSensores(270, 5, 0, 0);
    expect(errorAngular(casiPlanoEste.rumbo, 90)).toBeLessThan(0.01);
    expect(casiPlanoEste.altitudApuntado).toBeCloseTo(-85, 2);
  });

  it('mantiene continuidad del rumbo en todo el barrido desde plano (0°) hasta el cenit (180°)', () => {
    // alpha = 315° corresponde a mirar hacia el Noreste (45°)
    for (let beta = 0; beta <= 180; beta += 5) {
      const res = calcularOrientacionDesdeSensores(315, beta, 0, 0);
      expect(errorAngular(res.rumbo, 45)).toBeLessThan(0.01);
      expect(res.altitudApuntado).toBeCloseTo(beta - 90, 2);
    }
  });

  it('compensa correctamente la rotación de pantalla (0°, 90°, 180°, 270°) en modo plano y levantado', () => {
    // Teléfono plano mirando al Norte en cada orientación de pantalla
    expect(errorAngular(calcularOrientacionDesdeSensores(0, 0, 0, 0).rumbo, 0)).toBeLessThan(0.01);
    expect(errorAngular(calcularOrientacionDesdeSensores(90, 0, 0, 90).rumbo, 0)).toBeLessThan(0.01);
    expect(errorAngular(calcularOrientacionDesdeSensores(180, 0, 0, 180).rumbo, 0)).toBeLessThan(0.01);
    expect(errorAngular(calcularOrientacionDesdeSensores(270, 0, 0, 270).rumbo, 0)).toBeLessThan(0.01);

    // Landscape-primary (90°) vertical mirando al Norte en el horizonte
    const landscapeNorte = calcularOrientacionDesdeSensores(90, 0, -90, 90);
    expect(errorAngular(landscapeNorte.rumbo, 0)).toBeLessThan(0.01);
    expect(landscapeNorte.altitudApuntado).toBeCloseTo(0, 2);

    // Landscape-primary (90°) apuntando al Sur a +30° de elevación
    const landscapeSur30 = calcularOrientacionDesdeSensores(90, 180, 60, 90);
    expect(errorAngular(landscapeSur30.rumbo, 180)).toBeLessThan(0.01);
    expect(landscapeSur30.altitudApuntado).toBeCloseTo(30, 2);

    // Landscape-primary (90°) apuntando casi al cenit (+85°) hacia el Norte
    const landscapeNorte85 = calcularOrientacionDesdeSensores(270, 180, 5, 90);
    expect(errorAngular(landscapeNorte85.rumbo, 0)).toBeLessThan(0.01);
    expect(landscapeNorte85.altitudApuntado).toBeCloseTo(85, 2);

    // Landscape-secondary (270°) vertical mirando al Norte en el horizonte
    const landscapeSecNorte = calcularOrientacionDesdeSensores(270, 0, 90, 270);
    expect(errorAngular(landscapeSecNorte.rumbo, 0)).toBeLessThan(0.01);
    expect(landscapeSecNorte.altitudApuntado).toBeCloseTo(0, 2);
  });

  it('aplica la declinación magnética al rumbo magnético manteniendo normalización [0, 360)', () => {
    expect(aplicarDeclinacionMagnetica(0, 1.5)).toBeCloseTo(1.5, 4);
    expect(aplicarDeclinacionMagnetica(359, 2.5)).toBeCloseTo(1.5, 4);
    expect(aplicarDeclinacionMagnetica(1, -3.5)).toBeCloseTo(357.5, 4);
    expect(aplicarDeclinacionMagnetica(180, -12.5)).toBeCloseTo(167.5, 4);
    expect(aplicarDeclinacionMagnetica(Number.NaN, 1.5)).toBe(0);
    expect(aplicarDeclinacionMagnetica(90, Number.NaN)).toBeCloseTo(90, 4);
  });
});
