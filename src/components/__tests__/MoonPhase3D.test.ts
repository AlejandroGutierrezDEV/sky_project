import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MoonPhase3D } from '../MoonPhase3D';
import {
  calcularAnguloFaseEsferico,
  calcularInstanteHoraLocalObservatorio,
  calcularRotacionHemisferioLunar,
  construirRutaIluminadaLunar,
  formatearFechaInputEnZona,
  formatearHoraEnZona,
  parsearFechaInputEnZona,
  resolverAnguloFaseLunar,
} from '../../utils/lunarCalculations';

describe('Fase lunar esférica y orientación hemisférica (MoonPhase3D)', () => {
  it('calcula el ángulo de fase esférico θ = arccos(1 - 2 · iluminación) sin aproximación lineal', () => {
    expect(calcularAnguloFaseEsferico(0)).toBeCloseTo(0, 5);
    expect(calcularAnguloFaseEsferico(25)).toBeCloseTo(60, 5); // arccos(0.5) = 60°, no 45° lineal
    expect(calcularAnguloFaseEsferico(50)).toBeCloseTo(90, 5);
    expect(calcularAnguloFaseEsferico(75)).toBeCloseTo(120, 5); // arccos(-0.5) = 120°, no 135° lineal
    expect(calcularAnguloFaseEsferico(100)).toBeCloseTo(180, 5);

    // Respeta fase menguante cuando no se pasa anguloFase explícito
    expect(resolverAnguloFaseLunar(25, 'Luna Menguante')).toBeCloseTo(300, 5);
    expect(resolverAnguloFaseLunar(25, 'Luna Creciente')).toBeCloseTo(60, 5);

    // Para 25% creciente (θ = 60°), cos(60°) = 0.5 => rx = 0.5 * 40 = 20
    const ruta25 = construirRutaIluminadaLunar(60, 50, 50, 40);
    expect(ruta25).toContain('A 20 40 0 0 0 50 10');
  });

  it('invierte la orientación del disco lunar 180° en el Hemisferio Sur (latitud < 0)', () => {
    expect(calcularRotacionHemisferioLunar(40.42)).toBe(0);
    expect(calcularRotacionHemisferioLunar(0)).toBe(0);
    expect(calcularRotacionHemisferioLunar(-33.87)).toBe(180);

    const htmlNorte = renderToStaticMarkup(
      createElement(MoonPhase3D, {
        iluminacion: 50,
        faseLunar: 'Cuarto Creciente',
        latitud: 40.42,
        tema: 'oscuro',
      })
    );
    expect(htmlNorte).toContain('data-hemisferio="norte"');
    expect(htmlNorte).toContain('data-rotacion="0"');
    expect(htmlNorte).not.toContain('rotate(180 50 50)');

    const htmlSur = renderToStaticMarkup(
      createElement(MoonPhase3D, {
        iluminacion: 50,
        faseLunar: 'Cuarto Creciente',
        latitud: -33.87,
        tema: 'oscuro',
      })
    );
    expect(htmlSur).toContain('data-hemisferio="sur"');
    expect(htmlSur).toContain('data-rotacion="180"');
    expect(htmlSur).toContain('transform="rotate(180 50 50)"');
  });

  it('calcula y formatea "Esta noche 23:30" en la zona horaria IANA del observatorio (Tokio y Canarias)', () => {
    const referenciaUTC = new Date('2026-10-15T12:00:00Z');

    const nocheTokio = calcularInstanteHoraLocalObservatorio(
      referenciaUTC,
      23,
      30,
      'Asia/Tokyo'
    );
    expect(formatearHoraEnZona(nocheTokio, 'Asia/Tokyo')).toBe('23:30');
    expect(formatearFechaInputEnZona(nocheTokio, 'Asia/Tokyo')).toBe('2026-10-15T23:30');
    // 23:30 en Tokio (UTC+9) = 14:30 UTC
    expect(nocheTokio.toISOString()).toBe('2026-10-15T14:30:00.000Z');

    const nocheCanarias = calcularInstanteHoraLocalObservatorio(
      referenciaUTC,
      23,
      30,
      'Atlantic/Canary'
    );
    expect(formatearHoraEnZona(nocheCanarias, 'Atlantic/Canary')).toBe('23:30');
    expect(formatearFechaInputEnZona(nocheCanarias, 'Atlantic/Canary')).toBe('2026-10-15T23:30');
    // 23:30 en Canarias en octubre (WEST = UTC+1) = 22:30 UTC
    expect(nocheCanarias.toISOString()).toBe('2026-10-15T22:30:00.000Z');

    // Ida y vuelta exacta al parsear desde datetime-local en la zona del observatorio
    const parseadaTokio = parsearFechaInputEnZona('2026-10-15T23:30', 'Asia/Tokyo');
    expect(parseadaTokio?.toISOString()).toBe('2026-10-15T14:30:00.000Z');
  });
});
