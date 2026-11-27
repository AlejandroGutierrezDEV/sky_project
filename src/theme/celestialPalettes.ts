import type {
  CelestialThemePalette,
  TemaVisual,
  ThemeMode,
  ThemePalettes,
} from '../types/astronomy';

export { isThemeMode, esTemaVisual } from '../types/astronomy';
export type { CelestialThemePalette, ThemeMode, ThemePalettes };

/**
 * Paletas centralizadas para la bóveda celeste 3D y el planisferio 2D.
 * - `dark`: preserva el acabado nocturno profundo actual.
 * - `light`: estilo carta celeste / blueprint técnico de alto contraste (WCAG AA).
 */
export const CELESTIAL_PALETTES: ThemePalettes = {
  dark: {
    background: '#020617',
    domeSurface: '#0b1530',
    domeOpacity: 0.55,
    gridPrimary: 'rgba(148, 163, 184, 0.2)',
    gridSecondary: 'rgba(148, 163, 184, 0.14)',
    horizonLine: '#94a3b8',
    labelText: 'rgba(226, 232, 240, 0.86)',
    labelHalo: 'rgba(2, 6, 23, 0.82)',
    starDefault: '#f8fafc',
    constellationLine: 'rgba(56, 189, 248, 0.34)',
    highlightAccent: '#38bdf8',
  },
  light: {
    background: '#e2e8f0',
    domeSurface: '#dbeafe',
    domeOpacity: 0.78,
    gridPrimary: 'rgba(30, 58, 138, 0.34)',
    gridSecondary: 'rgba(51, 65, 85, 0.24)',
    horizonLine: '#0f172a',
    labelText: '#0f172a',
    labelHalo: '#f8fafc',
    starDefault: '#0f172a',
    constellationLine: 'rgba(30, 58, 138, 0.52)',
    highlightAccent: '#1d4ed8',
  },
};

/** Paleta específica para el modo de visión nocturna (Filtro Rojo estricto). */
export const PALETA_CELESTE_ROJO: CelestialThemePalette = {
  background: '#000000',
  domeSurface: '#140000',
  domeOpacity: 0.5,
  gridPrimary: 'rgba(220, 38, 38, 0.28)',
  gridSecondary: 'rgba(220, 38, 38, 0.18)',
  horizonLine: '#ef4444',
  labelText: '#ef4444',
  labelHalo: 'rgba(0, 0, 0, 0.9)',
  starDefault: '#ef4444',
  constellationLine: 'rgba(239, 68, 68, 0.38)',
  highlightAccent: '#ff2a2a',
};

/** Convierte el tema visual de la aplicación al modo binario base cuando aplica. */
export function mapearTemaAMode(tema: TemaVisual): ThemeMode {
  return tema === 'claro' ? 'light' : 'dark';
}

/** Devuelve la paleta celeste activa para cualquiera de los 3 temas visuales. */
export function obtenerPaletaCeleste(tema: TemaVisual): CelestialThemePalette {
  if (tema === 'rojo') return PALETA_CELESTE_ROJO;
  if (tema === 'claro') return CELESTIAL_PALETTES.light;
  return CELESTIAL_PALETTES.dark;
}
