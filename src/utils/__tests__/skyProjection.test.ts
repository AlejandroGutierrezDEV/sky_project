import { describe, expect, it } from 'vitest';
import {
  CONSTELLATIONS,
  DEFAULT_STAR_CHART_LOCATION,
  STAR_CATALOG,
} from '../../data/starCatalog';
import type { ProjectedStar, SpectralClass, StarChartObserver } from '../../types/starChart';
import {
  equatorialToHorizontal,
  findNearestStar,
  getLocalSiderealTimeDeg,
  getSpectralColor,
  isValidStarChartObserver,
  projectStereographic,
  toJulianDate,
} from '../skyProjection';

describe('Catálogo compacto de estrellas y constelaciones', () => {
  it('contiene entradas válidas con IDs únicos y rangos ecuatoriales correctos', () => {
    expect(STAR_CATALOG.length).toBeGreaterThanOrEqual(50);
    expect(CONSTELLATIONS.length).toBeGreaterThanOrEqual(12);

    const ids = new Set<string>();
    for (const star of STAR_CATALOG) {
      expect(ids.has(star.id)).toBe(false);
      ids.add(star.id);
      expect(star.raHours).toBeGreaterThanOrEqual(0);
      expect(star.raHours).toBeLessThan(24);
      expect(star.decDeg).toBeGreaterThanOrEqual(-90);
      expect(star.decDeg).toBeLessThanOrEqual(90);
      expect(star.constellation).toMatch(/^[A-Z]{3}$/);
    }

    for (const constellation of CONSTELLATIONS) {
      expect(constellation.segments.length).toBeGreaterThan(0);
      for (const [fromId, toId] of constellation.segments) {
        expect(ids.has(fromId)).toBe(true);
        expect(ids.has(toId)).toBe(true);
      }
    }
  });
});

describe('Motor de proyección celeste (skyProjection)', () => {
  it('calcula correctamente la Fecha Juliana para J2000 y época Unix', () => {
    expect(toJulianDate(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.0, 6);
    expect(toJulianDate(new Date('1970-01-01T00:00:00Z'))).toBeCloseTo(2440587.5, 6);
  });

  it('calcula el Tiempo Sidéreo Local dentro de [0, 360) y avanza ~15.041° por hora', () => {
    const t0 = new Date('2026-11-28T22:00:00Z');
    const t1 = new Date('2026-11-28T23:00:00Z');
    const lst0 = getLocalSiderealTimeDeg(t0, DEFAULT_STAR_CHART_LOCATION.longitude);
    const lst1 = getLocalSiderealTimeDeg(t1, DEFAULT_STAR_CHART_LOCATION.longitude);

    expect(lst0).toBeGreaterThanOrEqual(0);
    expect(lst0).toBeLessThan(360);
    const delta = (lst1 - lst0 + 360) % 360;
    expect(delta).toBeCloseTo(15.041, 2);
  });

  it('ubica a Polaris cerca del Norte a ~40° de altitud desde Madrid', () => {
    const polaris = STAR_CATALOG.find((s) => s.id === 'polaris');
    expect(polaris).toBeDefined();

    const observer: StarChartObserver = {
      latitude: DEFAULT_STAR_CHART_LOCATION.latitude,
      longitude: DEFAULT_STAR_CHART_LOCATION.longitude,
      date: new Date('2026-11-28T22:30:00Z'),
    };

    const horiz = equatorialToHorizontal(polaris!.raHours, polaris!.decDeg, observer);
    expect(horiz.altitudeDeg).toBeGreaterThan(39);
    expect(horiz.altitudeDeg).toBeLessThan(42);
    const angularDistFromNorth = Math.min(horiz.azimuthDeg, 360 - horiz.azimuthDeg);
    expect(angularDistFromNorth).toBeLessThan(2);
  });

  it('mantiene estabilidad numérica sin NaN en polos, cenit y Hemisferio Sur durante 24 horas', () => {
    const observers: StarChartObserver[] = [
      { latitude: 90, longitude: 0, date: new Date('2026-06-21T00:00:00Z') },
      { latitude: -90, longitude: 0, date: new Date('2026-06-21T00:00:00Z') },
      { latitude: -34.6037, longitude: -58.3816, date: new Date('2026-06-21T02:00:00Z') },
      { latitude: 0, longitude: 0, date: new Date('2026-03-21T00:00:00Z') },
    ];

    for (const baseObserver of observers) {
      for (let hourOffset = 0; hourOffset < 24; hourOffset += 3) {
        const obs: StarChartObserver = {
          ...baseObserver,
          date: new Date(baseObserver.date.getTime() + hourOffset * 3_600_000),
        };
        for (const star of STAR_CATALOG) {
          const { altitudeDeg, azimuthDeg } = equatorialToHorizontal(
            star.raHours,
            star.decDeg,
            obs
          );
          expect(Number.isFinite(altitudeDeg)).toBe(true);
          expect(Number.isFinite(azimuthDeg)).toBe(true);
          expect(altitudeDeg).toBeGreaterThanOrEqual(-90);
          expect(altitudeDeg).toBeLessThanOrEqual(90);
          expect(azimuthDeg).toBeGreaterThanOrEqual(0);
          expect(azimuthDeg).toBeLessThan(360);
        }
      }
    }

    // En Buenos Aires, Acrux (Dec -63.1°) es circumpolar (siempre sobre el horizonte) y Polaris siempre bajo él
    const buenosAires: StarChartObserver = {
      latitude: -34.6037,
      longitude: -58.3816,
      date: new Date('2026-05-15T02:00:00Z'),
    };
    const acrux = STAR_CATALOG.find((s) => s.id === 'acrux')!;
    const polaris = STAR_CATALOG.find((s) => s.id === 'polaris')!;
    expect(equatorialToHorizontal(acrux.raHours, acrux.decDeg, buenosAires).altitudeDeg).toBeGreaterThan(0);
    expect(equatorialToHorizontal(polaris.raHours, polaris.decDeg, buenosAires).altitudeDeg).toBeLessThan(0);
  });

  it('proyecta con orientación celeste correcta: Norte arriba, Este izquierda, Sur abajo y Oeste derecha', () => {
    const cx = 250;
    const cy = 250;
    const r = 200;

    const zenith = projectStereographic(90, 0, cx, cy, r);
    expect(zenith.x).toBeCloseTo(cx, 5);
    expect(zenith.y).toBeCloseTo(cy, 5);

    const north = projectStereographic(0, 0, cx, cy, r);
    expect(north.x).toBeCloseTo(cx, 5);
    expect(north.y).toBeCloseTo(cy - r, 5);

    const east = projectStereographic(0, 90, cx, cy, r);
    expect(east.x).toBeCloseTo(cx - r, 5);
    expect(east.y).toBeCloseTo(cy, 5);

    const south = projectStereographic(0, 180, cx, cy, r);
    expect(south.x).toBeCloseTo(cx, 5);
    expect(south.y).toBeCloseTo(cy + r, 5);

    const west = projectStereographic(0, 270, cx, cy, r);
    expect(west.x).toBeCloseTo(cx + r, 5);
    expect(west.y).toBeCloseTo(cy, 5);

    // Estabilidad incluso cerca del nadir (-90°)
    const nadir = projectStereographic(-90, 45, cx, cy, r);
    expect(Number.isFinite(nadir.x)).toBe(true);
    expect(Number.isFinite(nadir.y)).toBe(true);
  });

  it('encuentra la estrella visible más cercana respetando hitRadius y visibilidad', () => {
    const mockStars: ProjectedStar[] = [
      {
        star: STAR_CATALOG[0],
        horizontal: { altitudeDeg: 45, azimuthDeg: 180 },
        x: 100,
        y: 100,
        radius: 3,
        visible: true,
      },
      {
        star: STAR_CATALOG[1],
        horizontal: { altitudeDeg: 45, azimuthDeg: 182 },
        x: 108,
        y: 100,
        radius: 3,
        visible: true,
      },
      {
        star: STAR_CATALOG[2],
        horizontal: { altitudeDeg: -10, azimuthDeg: 180 },
        x: 102,
        y: 100,
        radius: 3,
        visible: false,
      },
    ];

    expect(findNearestStar(101, 100, mockStars, 14)?.star.id).toBe(STAR_CATALOG[0].id);
    expect(findNearestStar(107, 100, mockStars, 14)?.star.id).toBe(STAR_CATALOG[1].id);
    expect(findNearestStar(200, 200, mockStars, 14)).toBeNull();
  });

  it('valida observadores y devuelve colores espectrales para todas las clases', () => {
    expect(
      isValidStarChartObserver({ latitude: 40.4, longitude: -3.7, date: new Date() })
    ).toBe(true);
    expect(
      isValidStarChartObserver({ latitude: 95, longitude: 0, date: new Date() })
    ).toBe(false);
    expect(
      isValidStarChartObserver({ latitude: 40, longitude: 190, date: new Date() })
    ).toBe(false);
    expect(
      isValidStarChartObserver({ latitude: 40, longitude: 0, date: new Date('invalid') })
    ).toBe(false);

    const classes: SpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
    for (const cls of classes) {
      expect(getSpectralColor(cls)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
