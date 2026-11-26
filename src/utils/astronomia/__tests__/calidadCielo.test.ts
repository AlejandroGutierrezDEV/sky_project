import { describe, expect, it } from 'vitest';
import {
  BORTLE_POR_DEFECTO,
  NELM_BASE_POR_BORTLE,
  NIVELES_BORTLE,
  calcularCalidadCielo,
  esEscalaBortleValida,
  normalizarEscalaBortle,
} from '../calidadCielo';
import { parsearFavoritosGuardados } from '../../../App';

describe('Calidad del cielo (Bortle + Luna + nubosidad)', () => {
  it('mapea EscalaBortle (1–9) de forma monótona decreciente entre 7.6 y 4.0', () => {
    expect(NELM_BASE_POR_BORTLE[1]).toBe(7.6);
    expect(NELM_BASE_POR_BORTLE[9]).toBe(4.0);

    for (let i = 1; i < NIVELES_BORTLE.length; i++) {
      const anterior = NELM_BASE_POR_BORTLE[NIVELES_BORTLE[i - 1]];
      const actual = NELM_BASE_POR_BORTLE[NIVELES_BORTLE[i]];
      expect(anterior).toBeGreaterThan(actual);
    }
  });

  it('mantiene penalizacionLunar exactamente en 0 cuando la Luna está bajo el horizonte (altitud <= 0)', () => {
    const lunaBajoHorizonte = calcularCalidadCielo(0, 2, {
      iluminacion: 1,
      altitudGrados: -15,
      faseNombre: 'Luna Llena',
    });
    const lunaEnHorizonte = calcularCalidadCielo(0, 2, {
      iluminacion: 1,
      altitudGrados: 0,
      faseNombre: 'Luna Llena',
    });

    expect(lunaBajoHorizonte.penalizacionLunar).toBe(0);
    expect(lunaBajoHorizonte.magnitudLimiteVisible).toBe(NELM_BASE_POR_BORTLE[2]);
    expect(lunaBajoHorizonte.veredicto).toBe('Excelente');

    expect(lunaEnHorizonte.penalizacionLunar).toBe(0);
    expect(lunaEnHorizonte.magnitudLimiteVisible).toBe(NELM_BASE_POR_BORTLE[2]);
  });

  it('reduce la magnitud límite en proporción a iluminación y seno de la altitud lunar', () => {
    const baja = calcularCalidadCielo(0, 2, {
      iluminacion: 1,
      altitudGrados: 15,
      faseNombre: 'Luna Llena',
    });
    const media = calcularCalidadCielo(0, 2, {
      iluminacion: 0.5,
      altitudGrados: 60,
      faseNombre: 'Cuarto Creciente',
    });
    const alta = calcularCalidadCielo(0, 2, {
      iluminacion: 1,
      altitudGrados: 60,
      faseNombre: 'Luna Llena',
    });

    expect(baja.penalizacionLunar).toBeGreaterThan(0);
    expect(alta.penalizacionLunar).toBeGreaterThan(baja.penalizacionLunar);
    expect(alta.penalizacionLunar).toBeCloseTo(media.penalizacionLunar * 2, 1);
    expect(alta.magnitudLimiteVisible).toBeLessThan(baja.magnitudLimiteVisible);
  });

  it('penaliza el veredicto con Luna alta (> 20°) e iluminada (> 60%) incluso con 0% de nubes', () => {
    const cieloOscuroConLuna = calcularCalidadCielo(0, 1, {
      iluminacion: 0.85,
      altitudGrados: 35,
      faseNombre: 'Gibosa Creciente',
    });

    expect(cieloOscuroConLuna.veredicto).toBe('Regular');
    expect(cieloOscuroConLuna.motivoPrincipal).toContain('Gibosa Creciente');

    const ciudadConLuna = calcularCalidadCielo(0, 8, {
      iluminacion: 0.95,
      altitudGrados: 45,
      faseNombre: 'Luna Llena',
    });
    expect(ciudadConLuna.veredicto).toBe('Malo');
  });

  it('clasifica como Malo ante nubosidad densa y sanitiza entradas inválidas sin producir NaN', () => {
    const cubierto = calcularCalidadCielo(85, 2, {
      iluminacion: 0,
      altitudGrados: -40,
      faseNombre: 'Luna Nueva',
    });
    expect(cubierto.veredicto).toBe('Malo');

    const invalido = calcularCalidadCielo(Number.NaN, BORTLE_POR_DEFECTO, {
      iluminacion: Number.POSITIVE_INFINITY,
      altitudGrados: Number.NaN,
      faseNombre: '',
    });
    expect(Number.isFinite(invalido.magnitudLimiteVisible)).toBe(true);
    expect(invalido.penalizacionLunar).toBe(0);
    expect(esEscalaBortleValida(4)).toBe(true);
    expect(esEscalaBortleValida(10)).toBe(false);
    expect(normalizarEscalaBortle('invalido')).toBe(4);
  });
});

describe('Retrocompatibilidad de observatorios favoritos en localStorage', () => {
  it('asigna bortle: 4 por defecto a observatorios antiguos sin propiedad bortle', () => {
    const rawAntiguo = JSON.stringify([
      {
        id: 'fav-teide',
        nombre: 'Observatorio del Teide',
        latitud: 28.3,
        longitud: -16.51,
        altitud: 2390,
      },
      {
        id: 'fav-ciudad',
        nombre: 'Azotea Urbana',
        latitud: 40.42,
        longitud: -3.7,
        altitud: 650,
        bortle: 8,
      },
    ]);

    const favoritos = parsearFavoritosGuardados(rawAntiguo);
    expect(favoritos).toHaveLength(2);
    expect(favoritos[0].bortle).toBe(4);
    expect(favoritos[1].bortle).toBe(8);
  });

  it('descarta JSON corrupto o registros con bortle fuera de rango sin lanzar excepciones', () => {
    expect(parsearFavoritosGuardados('{json-roto')).toEqual([]);
    expect(
      parsearFavoritosGuardados(
        JSON.stringify([
          {
            id: 'fav-malo',
            nombre: 'Inválido',
            latitud: 40,
            longitud: -3,
            altitud: 100,
            bortle: 12,
          },
        ])
      )
    ).toEqual([]);
  });
});
