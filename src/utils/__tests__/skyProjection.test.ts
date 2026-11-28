import { describe, expect, it } from 'vitest';
import { CONSTELACIONES_IAU } from '../../data/constelacionesIAU';
import { CATALOGO_ESTRELLAS } from '../../data/estrellasMag4';
import { DEFAULT_STAR_CHART_LOCATION } from '../../hooks/useStarChart';
import type { ProjectedStar, SpectralClass, StarChartObserver } from '../../types/starChart';
import {
  ALTITUD_MINIMA_ESTEREOGRAFICA,
  adaptarEstrellasParaCarta,
  equatorialToHorizontal,
  findNearestStar,
  getLocalSiderealTimeDeg,
  getSpectralColor,
  isValidStarChartObserver,
  projectStereographic,
  recortarSegmentoAlHorizonte,
  toJulianDate,
} from '../skyProjection';

const ESTRELLAS_CARTA = adaptarEstrellasParaCarta(CATALOGO_ESTRELLAS);

describe('Adaptación de catálogos SSOT para la Carta Astronómica', () => {
  it('adapta CATALOGO_ESTRELLAS y consume las 88 constelaciones IAU sin catálogos paralelos', () => {
    expect(ESTRELLAS_CARTA.length).toBeGreaterThanOrEqual(400);
    expect(CONSTELACIONES_IAU).toHaveLength(88);

    const ids = new Set<string>();
    for (const star of ESTRELLAS_CARTA) {
      expect(ids.has(star.id)).toBe(false);
      ids.add(star.id);
      expect(star.raHours).toBeGreaterThanOrEqual(0);
      expect(star.raHours).toBeLessThan(24);
      expect(star.decDeg).toBeGreaterThanOrEqual(-90);
      expect(star.decDeg).toBeLessThanOrEqual(90);
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
    const polaris = ESTRELLAS_CARTA.find((s) => s.id === 'Alp UMi');
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
        for (const star of ESTRELLAS_CARTA) {
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
    const acrux = ESTRELLAS_CARTA.find((s) => s.id === 'Alp1 Cru')!;
    const polaris = ESTRELLAS_CARTA.find((s) => s.id === 'Alp UMi')!;
    expect(equatorialToHorizontal(acrux.raHours, acrux.decDeg, buenosAires).altitudeDeg).toBeGreaterThan(0);
    expect(equatorialToHorizontal(polaris.raHours, polaris.decDeg, buenosAires).altitudeDeg).toBeLessThan(0);
  });

  it('proyecta con orientación celeste correcta y protege contra la singularidad del nadir (alt <= -85°)', () => {
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

    // Estabilidad acotada incluso en -85° y -90° (sin división por cero ni estiramiento infinito)
    const limiteNadir = projectStereographic(ALTITUD_MINIMA_ESTEREOGRAFICA, 45, cx, cy, r);
    const nadirExacto = projectStereographic(-90, 45, cx, cy, r);
    expect(Number.isFinite(nadirExacto.x)).toBe(true);
    expect(Number.isFinite(nadirExacto.y)).toBe(true);
    expect(nadirExacto.x).toBeCloseTo(limiteNadir.x, 5);
    expect(nadirExacto.y).toBeCloseTo(limiteNadir.y, 5);
  });

  it('recorta segmentos de constelación que cruzan el horizonte por interpolación lineal en alt = 0°', () => {
    // Cruce normal cruzando el meridiano 0°/360° (350° -> 10°)
    const cruzadoNorte = recortarSegmentoAlHorizonte(
      { altitud: 10, acimut: 350 },
      { altitud: -10, acimut: 10 }
    );
    expect(cruzadoNorte).not.toBeNull();
    expect(cruzadoNorte?.desde).toEqual({ altitud: 10, acimut: 350 });
    expect(cruzadoNorte?.hasta.altitud).toBe(0);
    expect(cruzadoNorte?.hasta.acimut).toBeCloseTo(0, 5);

    // Extremo inicial bajo el horizonte y final sobre el horizonte
    const inverso = recortarSegmentoAlHorizonte(
      { altitud: -5, acimut: 90 },
      { altitud: 15, acimut: 110 }
    );
    expect(inverso?.desde.altitud).toBe(0);
    expect(inverso?.desde.acimut).toBeCloseTo(95, 5);
    expect(inverso?.hasta).toEqual({ altitud: 15, acimut: 110 });

    // Segmento completamente bajo el horizonte se descarta
    expect(
      recortarSegmentoAlHorizonte(
        { altitud: -5, acimut: 90 },
        { altitud: -20, acimut: 110 }
      )
    ).toBeNull();
  });

  it('encuentra la estrella visible más cercana respetando hitRadius y visibilidad', () => {
    const mockStars: ProjectedStar[] = [
      {
        star: ESTRELLAS_CARTA[0],
        horizontal: { altitudeDeg: 45, azimuthDeg: 180 },
        x: 100,
        y: 100,
        radius: 3,
        visible: true,
      },
      {
        star: ESTRELLAS_CARTA[1],
        horizontal: { altitudeDeg: 45, azimuthDeg: 182 },
        x: 108,
        y: 100,
        radius: 3,
        visible: true,
      },
      {
        star: ESTRELLAS_CARTA[2],
        horizontal: { altitudeDeg: -10, azimuthDeg: 180 },
        x: 102,
        y: 100,
        radius: 3,
        visible: false,
      },
    ];

    expect(findNearestStar(101, 100, mockStars, 14)?.star.id).toBe(ESTRELLAS_CARTA[0].id);
    expect(findNearestStar(107, 100, mockStars, 14)?.star.id).toBe(ESTRELLAS_CARTA[1].id);
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
