import { describe, expect, it } from 'vitest';
import {
  getCardinalDirection,
  normalizeHeading,
  shortestAngleDelta,
  smoothHeading,
} from '../compassMath';

describe('compassMath', () => {
  describe('normalizeHeading', () => {
    it('normaliza ángulos negativos y mayores o iguales a 360 al rango [0, 360)', () => {
      expect(normalizeHeading(0)).toBe(0);
      expect(normalizeHeading(360)).toBe(0);
      expect(normalizeHeading(725)).toBe(5);
      expect(normalizeHeading(-1)).toBe(359);
      expect(normalizeHeading(-360)).toBe(0);
      expect(normalizeHeading(-450)).toBe(270);
    });

    it('devuelve 0 ante valores no finitos', () => {
      expect(normalizeHeading(Number.NaN)).toBe(0);
      expect(normalizeHeading(Number.POSITIVE_INFINITY)).toBe(0);
      expect(normalizeHeading(Number.NEGATIVE_INFINITY)).toBe(0);
    });
  });

  describe('shortestAngleDelta', () => {
    it('toma el camino más corto al cruzar 359° <-> 1°', () => {
      expect(shortestAngleDelta(359, 1)).toBe(2);
      expect(shortestAngleDelta(1, 359)).toBe(-2);
      expect(shortestAngleDelta(350, 10)).toBe(20);
      expect(shortestAngleDelta(10, 350)).toBe(-20);
    });

    it('calcula deltas estándar en [-180, 180]', () => {
      expect(shortestAngleDelta(90, 90)).toBe(0);
      expect(shortestAngleDelta(0, 90)).toBe(90);
      expect(shortestAngleDelta(90, 0)).toBe(-90);
      expect(Math.abs(shortestAngleDelta(0, 180))).toBe(180);
    });
  });

  describe('smoothHeading', () => {
    it('interpola circularmente cruzando el norte sin dar la vuelta larga', () => {
      expect(smoothHeading(359, 1, 0.5)).toBe(0);
      expect(smoothHeading(1, 359, 0.5)).toBe(0);
      expect(smoothHeading(358, 2, 0.25)).toBe(359);
    });

    it('respeta los extremos alpha = 0 y alpha = 1', () => {
      expect(smoothHeading(45, 135, 0)).toBe(45);
      expect(smoothHeading(45, 135, 1)).toBe(135);
    });
  });

  describe('getCardinalDirection', () => {
    it('mapea correctamente los 8 puntos cardinales principales', () => {
      expect(getCardinalDirection(0)).toBe('N');
      expect(getCardinalDirection(359)).toBe('N');
      expect(getCardinalDirection(45)).toBe('NE');
      expect(getCardinalDirection(90)).toBe('E');
      expect(getCardinalDirection(135)).toBe('SE');
      expect(getCardinalDirection(180)).toBe('S');
      expect(getCardinalDirection(225)).toBe('SO');
      expect(getCardinalDirection(270)).toBe('O');
      expect(getCardinalDirection(315)).toBe('NO');
    });
  });
});
