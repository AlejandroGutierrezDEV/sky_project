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
    const m4 = CATALOGO_MESSIER.find((m) => m.id === 'M4');
    const m99 = CATALOGO_MESSIER.find((m) => m.id === 'M99');
    const m101 = CATALOGO_MESSIER.find((m) => m.id === 'M101');
    expect(m4?.nombreComun).toBe('Cúmulo Globular en Escorpio');
    expect(m4?.nombreComun).not.toContain('Ojo de Gato');
    expect(m99?.nombreComun).toBe('Galaxia del Molinete de Coma');
    expect(m101?.nombreComun).toBe('Galaxia del Molinete');
    expect(m99?.nombreComun).not.toBe(m101?.nombreComun);
  });

  it('contiene un catálogo completo sin duplicadas (< 0.05°), sin capado artificial a 4.00 y con coordenadas saneadas', () => {
    expect(CATALOGO_ESTRELLAS.length).toBeGreaterThanOrEqual(400);

    const ids = new Set<string>();
    let boreales = 0;
    let australes = 0;
    let estrellasMag4 = 0;
    let capadasA4Exacto = 0;

    for (const est of CATALOGO_ESTRELLAS) {
      expect(ids.has(est.id)).toBe(false);
      ids.add(est.id);
      expect(est.magnitud).toBeLessThanOrEqual(5.0);
      if (est.magnitud <= 4.0) estrellasMag4 += 1;
      if (est.magnitud === 4.0) capadasA4Exacto += 1;
      expect(est.raHoras).toBeGreaterThanOrEqual(0);
      expect(est.raHoras).toBeLessThan(24);
      expect(est.decGrados).toBeGreaterThanOrEqual(-90);
      expect(est.decGrados).toBeLessThanOrEqual(90);
      if (est.decGrados >= 0) boreales += 1;
      else australes += 1;
    }

    expect(estrellasMag4).toBeGreaterThanOrEqual(400);
    expect(capadasA4Exacto).toBe(0);
    expect(boreales).toBeGreaterThanOrEqual(150);
    expect(australes).toBeGreaterThanOrEqual(150);

    // Las 5 entradas duplicadas eliminadas no deben reaparecer
    for (const idDuplicado of ['1 Ori', '7 Lac', 'PP Car', 'h UMa', 'v Cen']) {
      expect(ids.has(idDuplicado)).toBe(false);
    }

    // Ningún par de estrellas debe tener separación angular < 0.05°
    for (let i = 0; i < CATALOGO_ESTRELLAS.length; i++) {
      for (let j = i + 1; j < CATALOGO_ESTRELLAS.length; j++) {
        const a = CATALOGO_ESTRELLAS[i];
        const b = CATALOGO_ESTRELLAS[j];
        const sep = distanciaAngularEsfericaGrados(
          a.raHoras,
          a.decGrados,
          b.raHoras,
          b.decGrados
        );
        expect(sep).toBeGreaterThanOrEqual(0.05);
      }
    }

    // Coordenadas saneadas de Kap Phe y Bet Cam
    const kapPhe = CATALOGO_ESTRELLAS.find((e) => e.id === 'Kap Phe');
    const gamPhe = CATALOGO_ESTRELLAS.find((e) => e.id === 'Gam Phe');
    expect(kapPhe).toBeDefined();
    expect(gamPhe).toBeDefined();
    expect(kapPhe?.raHoras).toBeCloseTo(0.437, 2);
    expect(kapPhe?.decGrados).toBeCloseTo(-43.68, 1);
    expect(
      distanciaAngularEsfericaGrados(
        kapPhe!.raHoras,
        kapPhe!.decGrados,
        gamPhe!.raHoras,
        gamPhe!.decGrados
      )
    ).toBeGreaterThan(5);

    const betCam = CATALOGO_ESTRELLAS.find((e) => e.id === 'Bet Cam');
    const alpCam = CATALOGO_ESTRELLAS.find((e) => e.id === 'Alp Cam');
    expect(betCam).toBeDefined();
    expect(alpCam).toBeDefined();
    expect(betCam?.raHoras).toBeCloseTo(5.057, 2);
    expect(betCam?.decGrados).toBeCloseTo(60.44, 1);
    expect(betCam?.magnitud).toBeCloseTo(4.03, 2);
    expect(betCam?.raHoras).not.toBeCloseTo(alpCam!.raHoras, 2);

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

    // Verificar que el Cuadrado de Pegaso (PEG) no contiene diagonales internas erróneas
    const pegaso = CONSTELACIONES_IAU.find((c) => c.codigo === 'PEG');
    expect(pegaso).toBeDefined();
    const coincidePunto = (p: readonly [number, number], ra: number, dec: number) =>
      Math.abs(p[0] - ra) < 0.05 && Math.abs(p[1] - dec) < 0.2;
    const tieneDiagonalScheatAlgenib = pegaso!.segmentos.some(
      ([a, b]) =>
        (coincidePunto(a, 23.063, 28.08) && coincidePunto(b, 0.221, 15.18)) ||
        (coincidePunto(b, 23.063, 28.08) && coincidePunto(a, 0.221, 15.18))
    );
    const tieneDiagonalMarkabAlpheratz = pegaso!.segmentos.some(
      ([a, b]) =>
        (coincidePunto(a, 23.079, 15.21) && coincidePunto(b, 0.14, 29.09)) ||
        (coincidePunto(b, 23.079, 15.21) && coincidePunto(a, 0.14, 29.09))
    );
    expect(tieneDiagonalScheatAlgenib).toBe(false);
    expect(tieneDiagonalMarkabAlpheratz).toBe(false);
  });
});
