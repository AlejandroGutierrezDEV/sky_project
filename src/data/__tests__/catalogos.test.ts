import { describe, expect, it } from 'vitest';
import { CATALOGO_MESSIER } from '../messier110';
import { CATALOGO_ESTRELLAS } from '../estrellasMag4';
import { CONSTELACIONES_IAU, obtenerNombreConstelacionIAU } from '../constelacionesIAU';

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

  const x1 = Math.cos(dec1) * Math.cos(ra1);
  const y1 = Math.cos(dec1) * Math.sin(ra1);
  const z1 = Math.sin(dec1);

  const x2 = Math.cos(dec2) * Math.cos(ra2);
  const y2 = Math.cos(dec2) * Math.sin(ra2);
  const z2 = Math.sin(dec2);

  const productoEscalar = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  return (Math.acos(productoEscalar) * 180) / Math.PI;
}

describe('Integridad de catálogos offline', () => {
  it('contiene exactamente los 110 objetos Messier (M1–M110) con coordenadas y constelaciones válidas', () => {
    expect(CATALOGO_MESSIER).toHaveLength(110);

    const codigosIAU = new Set(CONSTELACIONES_IAU.map((c) => c.codigo));
    const ids = new Set<string>();

    for (let i = 1; i <= 110; i++) {
      const idEsperado = `M${i}`;
      const obj = CATALOGO_MESSIER.find((m) => m.id === idEsperado);
      expect(obj).toBeDefined();
      if (!obj) continue;

      expect(ids.has(obj.id)).toBe(false);
      ids.add(obj.id);
      expect(obj.nombreNGC.trim().length).toBeGreaterThan(0);
      expect(obj.tamanoArcmin.trim().length).toBeGreaterThan(0);
      expect(obj.raHoras).toBeGreaterThanOrEqual(0);
      expect(obj.raHoras).toBeLessThan(24);
      expect(obj.decGrados).toBeGreaterThanOrEqual(-90);
      expect(obj.decGrados).toBeLessThanOrEqual(90);
      expect(Number.isFinite(obj.magnitud)).toBe(true);
      expect(codigosIAU.has(obj.constelacionIAU)).toBe(true);
    }
  });

  it('contiene un catálogo completo de estrellas hasta magnitud 4.0 cubriendo ambos hemisferios', () => {
    expect(CATALOGO_ESTRELLAS.length).toBeGreaterThanOrEqual(400);

    const ids = new Set<string>();
    let boreales = 0;
    let australes = 0;

    for (const est of CATALOGO_ESTRELLAS) {
      expect(ids.has(est.id)).toBe(false);
      ids.add(est.id);
      expect(est.magnitud).toBeLessThanOrEqual(4.0);
      expect(est.raHoras).toBeGreaterThanOrEqual(0);
      expect(est.raHoras).toBeLessThan(24);
      expect(est.decGrados).toBeGreaterThanOrEqual(-90);
      expect(est.decGrados).toBeLessThanOrEqual(90);
      if (est.decGrados >= 0) boreales += 1;
      else australes += 1;
    }

    expect(boreales).toBeGreaterThanOrEqual(150);
    expect(australes).toBeGreaterThanOrEqual(150);

    const estrellasClave = [
      'Polaris',
      'Sirio',
      'Canopus',
      'Alfa Centauri',
      'Arturo',
      'Vega',
      'Betelgeuse',
      'Rigel',
      'Antares',
      'Acrux',
    ];
    const nombres = new Set(CATALOGO_ESTRELLAS.map((e) => e.nombre).filter(Boolean));
    for (const nombre of estrellasClave) {
      expect(nombres.has(nombre)).toBe(true);
    }
  });

  it('contiene exactamente las 88 constelaciones oficiales de la IAU con segmentos válidos', () => {
    expect(CONSTELACIONES_IAU).toHaveLength(88);

    const codigos = new Set<string>();
    for (const constelacion of CONSTELACIONES_IAU) {
      expect(constelacion.codigo).toMatch(/^[A-Z]{3}$/);
      expect(codigos.has(constelacion.codigo)).toBe(false);
      codigos.add(constelacion.codigo);

      expect(constelacion.nombreEs.trim().length).toBeGreaterThan(0);
      expect(constelacion.nombreLatin.trim().length).toBeGreaterThan(0);
      expect(constelacion.segmentos.length).toBeGreaterThan(0);

      for (const [inicio, fin] of constelacion.segmentos) {
        expect(inicio[0]).toBeGreaterThanOrEqual(0);
        expect(inicio[0]).toBeLessThan(24);
        expect(inicio[1]).toBeGreaterThanOrEqual(-90);
        expect(inicio[1]).toBeLessThanOrEqual(90);
        expect(fin[0]).toBeGreaterThanOrEqual(0);
        expect(fin[0]).toBeLessThan(24);
        expect(fin[1]).toBeGreaterThanOrEqual(-90);
        expect(fin[1]).toBeLessThanOrEqual(90);

        const separacion = distanciaAngularEsfericaGrados(
          inicio[0],
          inicio[1],
          fin[0],
          fin[1]
        );
        expect(separacion).toBeGreaterThan(0.1);
        expect(separacion).toBeLessThan(35);
      }
    }

    expect(obtenerNombreConstelacionIAU('ORI')).toBe('Orión');
    expect(obtenerNombreConstelacionIAU('CRU')).toBe('Cruz del Sur');
    expect(obtenerNombreConstelacionIAU('XXX')).toBe('XXX');
  });
});
