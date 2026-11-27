import { describe, expect, it } from 'vitest';
import {
  CELESTIAL_TECHNICAL_SHEETS,
  VALID_CELESTIAL_IDS,
  obtenerEstrellasDeConstelacion,
} from '../celestialDetails';
import { CONSTELACIONES_IAU } from '../constelacionesIAU';
import { CATALOGO_ESTRELLAS } from '../estrellasMag4';
import { CATALOGO_MESSIER } from '../messier110';
import { isValidCelestialId } from '../../types/celestialDetails';
import { resolverAccionEscape } from '../../hooks/useCelestialFocus';

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

describe('CELESTIAL_TECHNICAL_SHEETS', () => {
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
      const ficha = CELESTIAL_TECHNICAL_SHEETS[id];
      expect(ficha).toBeDefined();
      expect(ficha.id).toBe(id);
      expect(ficha.description.length).toBeGreaterThan(30);
      expect(ficha.metrics.length).toBeGreaterThanOrEqual(4);
      expect(ficha.observationTips.length).toBeGreaterThanOrEqual(2);
      expect(ficha.visual.kind).toBe('planet_render');
      expect(ficha.visual.altText.trim().length).toBeGreaterThan(0);
    }

    expect(CELESTIAL_TECHNICAL_SHEETS.Moon.category).toBe('moon');
    expect(CELESTIAL_TECHNICAL_SHEETS.Saturn.visual.hasRings).toBe(true);
    expect(CELESTIAL_TECHNICAL_SHEETS.Uranus.visual.hasRings).toBe(true);
    expect(CELESTIAL_TECHNICAL_SHEETS.Mars.visual.hasRings).toBeUndefined();
  });

  it('cubre las 88 constelaciones IAU con diagramas normalizados [0..1] y aristas válidas', () => {
    for (const constelacion of CONSTELACIONES_IAU) {
      const ficha = CELESTIAL_TECHNICAL_SHEETS[constelacion.codigo];
      expect(ficha).toBeDefined();
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

  it('cubre los 110 objetos Messier diferenciando galaxias de otros objetos de cielo profundo', () => {
    for (const obj of CATALOGO_MESSIER) {
      const ficha = CELESTIAL_TECHNICAL_SHEETS[obj.id];
      expect(ficha).toBeDefined();
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

  it('mantiene estrellas sin nombre propio seleccionables para validar estado fallback/empty', () => {
    const estrellaSinNombre = CATALOGO_ESTRELLAS.find((e) => !e.nombre);
    expect(estrellaSinNombre).toBeDefined();
    if (!estrellaSinNombre) return;

    expect(VALID_CELESTIAL_IDS.has(estrellaSinNombre.id)).toBe(true);
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
