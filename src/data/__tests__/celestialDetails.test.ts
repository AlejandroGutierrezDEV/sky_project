import { describe, expect, it } from 'vitest';
import {
  CELESTIAL_TECHNICAL_SHEETS,
  VALID_CELESTIAL_IDS,
  obtenerEstrellasDeConstelacion,
  obtenerFichaTecnica,
} from '../celestialDetails';
import { CONSTELACIONES_IAU } from '../constelacionesIAU';
import { CATALOGO_ESTRELLAS } from '../estrellasMag4';
import { CATALOGO_MESSIER } from '../messier110';
import { isValidCelestialId } from '../../types/celestialDetails';
import { resolverAccionEscape } from '../../hooks/useCelestialFocus';

function distanciaAngularEsfericaGrados(
  ra1Horas: number,
  dec1Grados: number,
  ra2Horas: number,
  dec2Grados: number
): number {
  const ra1 = (ra1Horas * 15 * Math.PI) / 180;
  const dec1 = (dec1Grados * Math.PI) / 180;
  const ra2 = (ra2Horas * 15 * Math.PI) / 180;
  const dec2 = (dec2Grados * Math.PI) / 180;
  const dot =
    Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2) + Math.sin(dec1) * Math.sin(dec2);
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

describe('isValidCelestialId', () => {
  it('valida IDs presentes en el conjunto permitido', () => {
    expect(isValidCelestialId('Saturn', VALID_CELESTIAL_IDS)).toBe(true);
    expect(isValidCelestialId('ORI', VALID_CELESTIAL_IDS)).toBe(true);
    expect(isValidCelestialId('M31', VALID_CELESTIAL_IDS)).toBe(true);
    expect(isValidCelestialId('Alp CMa', VALID_CELESTIAL_IDS)).toBe(true);
  });

  it('rechaza valores vacíos, desconocidos o de tipo inválido', () => {
    expect(isValidCelestialId('', VALID_CELESTIAL_IDS)).toBe(false);
    expect(isValidCelestialId('   ', VALID_CELESTIAL_IDS)).toBe(false);
    expect(isValidCelestialId('Pluto', VALID_CELESTIAL_IDS)).toBe(false);
    expect(isValidCelestialId(null, VALID_CELESTIAL_IDS)).toBe(false);
    expect(isValidCelestialId(undefined, VALID_CELESTIAL_IDS)).toBe(false);
    expect(isValidCelestialId(123, VALID_CELESTIAL_IDS)).toBe(false);
  });
});

describe('obtenerFichaTecnica y CELESTIAL_TECHNICAL_SHEETS (carga perezosa)', () => {
  it('cubre los 7 planetas y la Luna con configuración visual adecuada', () => {
    const cuerposEsperados = [
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ];

    for (const id of cuerposEsperados) {
      const ficha = obtenerFichaTecnica(id);
      expect(ficha).toBeDefined();
      if (!ficha) continue;
      expect(ficha.id).toBe(id);
      expect(ficha.description.length).toBeGreaterThan(30);
      expect(ficha.metrics.length).toBeGreaterThanOrEqual(4);
      expect(ficha.observationTips.length).toBeGreaterThanOrEqual(2);
      expect(ficha.visual.kind).toBe('planet_render');
      expect(ficha.visual.altText.trim().length).toBeGreaterThan(0);
    }

    expect(obtenerFichaTecnica('Moon')?.category).toBe('moon');
    expect(obtenerFichaTecnica('Saturn')?.visual.hasRings).toBe(true);
    expect(obtenerFichaTecnica('Uranus')?.visual.hasRings).toBe(true);
    expect(obtenerFichaTecnica('Mars')?.visual.hasRings).toBeUndefined();
  });

  it('cachea las fichas generadas bajo demanda y admite IDs prefijados y acceso retrocompatible', () => {
    const primera = obtenerFichaTecnica('M31');
    const segunda = obtenerFichaTecnica('M31');
    const porPrefijo = obtenerFichaTecnica('messier:M31');
    const porProxy = CELESTIAL_TECHNICAL_SHEETS.M31;

    expect(primera).toBeDefined();
    expect(segunda).toBe(primera);
    expect(porPrefijo).toBe(primera);
    expect(porProxy).toBe(primera);

    const umiDirecta = obtenerFichaTecnica('UMI');
    const umiPrefijo = obtenerFichaTecnica('constelacion:UMI');
    expect(umiDirecta).toBeDefined();
    expect(umiPrefijo).toBe(umiDirecta);

    const polarisDirecta = obtenerFichaTecnica('Alp UMi');
    const polarisPrefijo = obtenerFichaTecnica('estrella:Alp UMi');
    expect(polarisDirecta).toBeDefined();
    expect(polarisPrefijo).toBe(polarisDirecta);
  });

  it('cubre las 88 constelaciones IAU con diagramas normalizados [0..1] y aristas válidas', () => {
    for (const constelacion of CONSTELACIONES_IAU) {
      const ficha = obtenerFichaTecnica(constelacion.codigo);
      expect(ficha).toBeDefined();
      if (!ficha) continue;
      expect(ficha.category).toBe('constellation');
      expect(ficha.visual.kind).toBe('constellation_diagram');

      const puntos = ficha.visual.diagramPoints ?? [];
      const aristas = ficha.visual.diagramEdges ?? [];
      expect(puntos.length).toBeGreaterThanOrEqual(2);
      expect(aristas.length).toBeGreaterThanOrEqual(1);

      for (const punto of puntos) {
        expect(punto.x).toBeGreaterThanOrEqual(0);
        expect(punto.x).toBeLessThanOrEqual(1);
        expect(punto.y).toBeGreaterThanOrEqual(0);
        expect(punto.y).toBeLessThanOrEqual(1);
      }

      for (const [a, b] of aristas) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(puntos.length);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(puntos.length);
        expect(a).not.toBe(b);
      }
    }
  });

  it('conserva la proporción angular real en UMI (Polaris–Yildun frente a Yildun–Kochab) sin estiramiento polar', () => {
    const fichaUMI = obtenerFichaTecnica('UMI');
    expect(fichaUMI).toBeDefined();
    const puntos = fichaUMI?.visual.diagramPoints ?? [];
    // Orden de vértices de UMI en CONSTELACIONES_IAU:
    // 0: Polaris [2.53, 89.26], 1: Yildun [17.537, 86.59], 4: Kochab [14.845, 74.16]
    expect(puntos.length).toBeGreaterThanOrEqual(5);

    const polaris = puntos[0];
    const yildun = puntos[1];
    const kochab = puntos[4];

    const distProyectadaPolarisYildun = Math.hypot(polaris.x - yildun.x, polaris.y - yildun.y);
    const distProyectadaYildunKochab = Math.hypot(yildun.x - kochab.x, yildun.y - kochab.y);
    const proporcionProyectada = distProyectadaPolarisYildun / distProyectadaYildunKochab;

    const angRealPolarisYildun = distanciaAngularEsfericaGrados(2.53, 89.26, 17.537, 86.59);
    const angRealYildunKochab = distanciaAngularEsfericaGrados(17.537, 86.59, 14.845, 74.16);
    const proporcionAngularReal = angRealPolarisYildun / angRealYildunKochab;

    expect(Math.abs(proporcionProyectada - proporcionAngularReal)).toBeLessThan(0.03);
  });

  it('conserva la proporción angular real en OCT (constelación del polo sur celeste)', () => {
    const fichaOCT = obtenerFichaTecnica('OCT');
    expect(fichaOCT).toBeDefined();
    const puntos = fichaOCT?.visual.diagramPoints ?? [];
    // 0: [21.691, -77.39], 1: [22.523, -81.38], 2: [14.448, -88.12]
    expect(puntos).toHaveLength(3);

    const d01 = Math.hypot(puntos[0].x - puntos[1].x, puntos[0].y - puntos[1].y);
    const d12 = Math.hypot(puntos[1].x - puntos[2].x, puntos[1].y - puntos[2].y);
    const proporcionProyectada = d01 / d12;

    const ang01 = distanciaAngularEsfericaGrados(21.691, -77.39, 22.523, -81.38);
    const ang12 = distanciaAngularEsfericaGrados(22.523, -81.38, 14.448, -88.12);
    const proporcionReal = ang01 / ang12;

    expect(Math.abs(proporcionProyectada - proporcionReal)).toBeLessThan(0.03);
  });

  it('cubre los 110 objetos Messier diferenciando galaxias de otros objetos de cielo profundo', () => {
    for (const obj of CATALOGO_MESSIER) {
      const ficha = obtenerFichaTecnica(obj.id);
      expect(ficha).toBeDefined();
      if (!ficha) continue;
      expect(ficha.id).toBe(obj.id);
      expect(ficha.metrics.length).toBeGreaterThanOrEqual(4);
      expect(ficha.observationTips.length).toBeGreaterThanOrEqual(2);

      if (obj.tipo === 'Galaxia') {
        expect(ficha.category).toBe('galaxy');
        expect(ficha.visual.kind).toBe('galaxy_render');
      } else {
        expect(ficha.category).toBe('deep_sky');
      }
    }
  });

  it('conserva metrics[0].label === "Designación" y añade la distancia estimada en fichas Messier curadas', () => {
    for (const idCurado of ['M31', 'M42', 'M13']) {
      const ficha = obtenerFichaTecnica(idCurado);
      expect(ficha).toBeDefined();
      if (!ficha) continue;

      expect(ficha.metrics[0].label).toBe('Designación');
      expect(ficha.metrics[0].value).toContain(idCurado);

      const metricaDistancia = ficha.metrics.find((m) => m.label === 'Distancia estimada');
      expect(metricaDistancia).toBeDefined();
      expect(metricaDistancia?.value.trim().length).toBeGreaterThan(0);
    }
  });

  it('mantiene estrellas sin nombre propio seleccionables para validar estado fallback/empty', () => {
    const estrellaSinNombre = CATALOGO_ESTRELLAS.find((e) => !e.nombre);
    expect(estrellaSinNombre).toBeDefined();
    if (!estrellaSinNombre) return;

    expect(VALID_CELESTIAL_IDS.has(estrellaSinNombre.id)).toBe(true);
    expect(obtenerFichaTecnica(estrellaSinNombre.id)).toBeUndefined();
    expect(CELESTIAL_TECHNICAL_SHEETS[estrellaSinNombre.id]).toBeUndefined();
  });
});

describe('obtenerEstrellasDeConstelacion', () => {
  it('recupera las estrellas integrantes de Orión incluyendo Betelgeuse y Rigel', () => {
    const estrellasOrion = obtenerEstrellasDeConstelacion('ORI', CATALOGO_ESTRELLAS);
    const ids = new Set(estrellasOrion.map((e) => e.id));
    expect(ids.has('Alp Ori')).toBe(true);
    expect(ids.has('Bet Ori')).toBe(true);
    expect(ids.has('Eps Ori')).toBe(true);
    expect(ids.has('Alp CMa')).toBe(false);
  });
});

describe('resolverAccionEscape', () => {
  it('cierra primero la ficha cuando está abierta y luego sale del foco', () => {
    expect(resolverAccionEscape(true, true)).toBe('close_sheet');
    expect(resolverAccionEscape(false, true)).toBe('clear_focus');
    expect(resolverAccionEscape(false, false)).toBe('none');
  });
});
