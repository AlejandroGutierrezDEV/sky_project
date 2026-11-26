import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_PREFERENCIAS_MAPA,
  CLAVES_DATOS_LOCALES,
  PREFERENCIAS_POR_DEFECTO,
  esPreferenciaValida,
  guardarPreferenciasEnStorage,
  leerPreferenciasGuardadas,
  limpiarDatosLocalesStorage,
} from '../usePreferenciasMapa';

function crearStorageMemoria() {
  const datos = new Map<string, string>();
  return {
    getItem: vi.fn((clave: string) => datos.get(clave) ?? null),
    setItem: vi.fn((clave: string, valor: string) => {
      datos.set(clave, valor);
    }),
    removeItem: vi.fn((clave: string) => {
      datos.delete(clave);
    }),
    clear: vi.fn(() => {
      datos.clear();
    }),
    key: vi.fn((indice: number) => Array.from(datos.keys())[indice] ?? null),
    get length() {
      return datos.size;
    },
  };
}

describe('esPreferenciaValida', () => {
  it('acepta preferencias válidas en 2D y 3D', () => {
    expect(
      esPreferenciaValida({
        modoMapa: '2D',
        capas: { constelaciones: true, estrellas: false, messier: true },
      })
    ).toBe(true);

    expect(
      esPreferenciaValida({
        modoMapa: '3D',
        capas: { constelaciones: false, estrellas: false, messier: false },
      })
    ).toBe(true);
  });

  it('rechaza valores nulos, primitivos, arrays o estructuras manipuladas', () => {
    expect(esPreferenciaValida(null)).toBe(false);
    expect(esPreferenciaValida(undefined)).toBe(false);
    expect(esPreferenciaValida('2D')).toBe(false);
    expect(esPreferenciaValida([])).toBe(false);
    expect(
      esPreferenciaValida({
        modoMapa: '2d',
        capas: { constelaciones: true, estrellas: true, messier: true },
      })
    ).toBe(false);
    expect(
      esPreferenciaValida({
        modoMapa: '3D',
        capas: { constelaciones: 1, estrellas: true, messier: true },
      })
    ).toBe(false);
    expect(
      esPreferenciaValida({
        modoMapa: '3D',
        capas: { constelaciones: true, estrellas: true },
      })
    ).toBe(false);
    expect(
      esPreferenciaValida({
        modoMapa: '3D',
        capas: null,
      })
    ).toBe(false);
  });
});

describe('persistencia segura en localStorage', () => {
  let mockStorage: ReturnType<typeof crearStorageMemoria>;

  beforeEach(() => {
    mockStorage = crearStorageMemoria();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve valores por defecto cuando no hay datos guardados', () => {
    expect(leerPreferenciasGuardadas()).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it('recupera preferencias válidas guardadas previamente', () => {
    const personalizadas = {
      modoMapa: '3D' as const,
      capas: { constelaciones: false, estrellas: true, messier: false },
    };
    guardarPreferenciasEnStorage(personalizadas);
    expect(leerPreferenciasGuardadas()).toEqual(personalizadas);
  });

  it('devuelve valores por defecto sin lanzar ante JSON corrupto o manipulado', () => {
    mockStorage.setItem(CLAVE_PREFERENCIAS_MAPA, '{json-roto');
    expect(leerPreferenciasGuardadas()).toEqual(PREFERENCIAS_POR_DEFECTO);

    mockStorage.setItem(
      CLAVE_PREFERENCIAS_MAPA,
      JSON.stringify({ modoMapa: '4D', capas: { constelaciones: 'si', estrellas: true, messier: true } })
    );
    expect(leerPreferenciasGuardadas()).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it('no lanza excepciones si localStorage.setItem falla por cuota excedida o modo privado', () => {
    mockStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() =>
      guardarPreferenciasEnStorage({
        modoMapa: '3D',
        capas: { constelaciones: true, estrellas: false, messier: true },
      })
    ).not.toThrow();
  });

  it('limpia todas las claves locales configuradas y no lanza si removeItem falla', () => {
    for (const clave of CLAVES_DATOS_LOCALES) {
      mockStorage.setItem(clave, 'valor-prueba');
    }

    limpiarDatosLocalesStorage();

    for (const clave of CLAVES_DATOS_LOCALES) {
      expect(mockStorage.getItem(clave)).toBeNull();
    }

    mockStorage.removeItem.mockImplementation(() => {
      throw new Error('Almacenamiento bloqueado');
    });
    expect(() => limpiarDatosLocalesStorage()).not.toThrow();
  });
});
