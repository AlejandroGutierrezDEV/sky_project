import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CELESTIAL_PALETTES,
  PALETA_CELESTE_ROJO,
  esTemaVisual,
  isThemeMode,
  mapearTemaAMode,
  obtenerPaletaCeleste,
} from '../celestialPalettes';
import {
  CLAVE_TEMA_STORAGE,
  leerTemaGuardado,
  parsearTemaGuardado,
} from '../../hooks/useTemaVisual';

describe('paletas celestes y validación de tema', () => {
  it('valida ThemeMode estrictamente con isThemeMode', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('rojo')).toBe(false);
    expect(isThemeMode('')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
    expect(isThemeMode(123)).toBe(false);
  });

  it('valida los tres temas de SkyProject con esTemaVisual', () => {
    expect(esTemaVisual('oscuro')).toBe(true);
    expect(esTemaVisual('claro')).toBe(true);
    expect(esTemaVisual('rojo')).toBe(true);
    expect(esTemaVisual('dark')).toBe(false);
    expect(esTemaVisual('invalido')).toBe(false);
  });

  it('expone paletas completas y diferenciadas para dark, light y rojo', () => {
    expect(obtenerPaletaCeleste('oscuro')).toBe(CELESTIAL_PALETTES.dark);
    expect(obtenerPaletaCeleste('claro')).toBe(CELESTIAL_PALETTES.light);
    expect(obtenerPaletaCeleste('rojo')).toBe(PALETA_CELESTE_ROJO);

    expect(CELESTIAL_PALETTES.light.background).not.toBe(CELESTIAL_PALETTES.dark.background);
    expect(CELESTIAL_PALETTES.light.labelText).toBe('#0f172a');
    expect(CELESTIAL_PALETTES.light.labelHalo).toBe('#f8fafc');
    expect(CELESTIAL_PALETTES.light.domeOpacity).toBeGreaterThan(0);
    expect(CELESTIAL_PALETTES.light.domeOpacity).toBeLessThanOrEqual(1);
    expect(mapearTemaAMode('claro')).toBe('light');
    expect(mapearTemaAMode('oscuro')).toBe('dark');
    expect(mapearTemaAMode('rojo')).toBe('dark');
  });

  it('normaliza valores guardados locales y ThemeMode en parsearTemaGuardado', () => {
    expect(parsearTemaGuardado('claro')).toBe('claro');
    expect(parsearTemaGuardado('oscuro')).toBe('oscuro');
    expect(parsearTemaGuardado('rojo')).toBe('rojo');
    expect(parsearTemaGuardado('light')).toBe('claro');
    expect(parsearTemaGuardado('dark')).toBe('oscuro');
    expect(parsearTemaGuardado('corrupto')).toBeNull();
    expect(parsearTemaGuardado('')).toBeNull();
    expect(parsearTemaGuardado(null)).toBeNull();
  });

  describe('leerTemaGuardado con localStorage', () => {
    const almacen = new Map<string, string>();

    beforeEach(() => {
      almacen.clear();
      vi.stubGlobal('localStorage', {
        getItem: (clave: string) => almacen.get(clave) ?? null,
        setItem: (clave: string, valor: string) => {
          almacen.set(clave, valor);
        },
        removeItem: (clave: string) => {
          almacen.delete(clave);
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('hace fallback seguro a oscuro cuando localStorage está vacío o corrupto', () => {
      expect(leerTemaGuardado()).toBe('oscuro');

      almacen.set(CLAVE_TEMA_STORAGE, '{"roto": true}');
      expect(leerTemaGuardado()).toBe('oscuro');

      almacen.set(CLAVE_TEMA_STORAGE, '');
      expect(leerTemaGuardado()).toBe('oscuro');
    });

    it('recupera valores válidos incluyendo compatibilidad con dark/light', () => {
      almacen.set(CLAVE_TEMA_STORAGE, 'claro');
      expect(leerTemaGuardado()).toBe('claro');

      almacen.set(CLAVE_TEMA_STORAGE, 'rojo');
      expect(leerTemaGuardado()).toBe('rojo');

      almacen.set(CLAVE_TEMA_STORAGE, 'light');
      expect(leerTemaGuardado()).toBe('claro');
    });

    it('no lanza error si localStorage arroja una excepción', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('Acceso denegado');
        },
      });
      expect(leerTemaGuardado()).toBe('oscuro');
    });
  });
});
