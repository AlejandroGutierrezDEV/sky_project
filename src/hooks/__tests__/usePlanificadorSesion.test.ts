import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_PLANIFICADOR_SESION,
  esObjetivoSesionValido,
  guardarObjetivosEnStorage,
  leerObjetivosGuardados,
  parsearObjetivosGuardados,
  planificarObjetivosSesion,
} from '../usePlanificadorSesion';
import type { ObjetivoSesion } from '../../types/astronomy';

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

const OBJETIVO_M31: ObjetivoSesion = {
  id: 'messier-M31',
  codigo: 'M31',
  nombre: 'Galaxia de Andrómeda',
  categoria: 'messier',
  magnitud: 3.4,
  constelacion: 'Andrómeda',
  raHoras: 0.712,
  decGrados: 41.27,
  observado: false,
  notas: 'Usar ocular de 25mm',
};

const OBJETIVO_ACRUX: ObjetivoSesion = {
  id: 'estrella-Alp Cru',
  codigo: 'Acrux',
  nombre: 'Acrux (Alp Cru)',
  categoria: 'estrella',
  magnitud: 0.77,
  constelacion: 'Cruz del Sur',
  raHoras: 12.443,
  decGrados: -63.1,
  observado: false,
};

describe('Validación y persistencia de usePlanificadorSesion', () => {
  let mockStorage: ReturnType<typeof crearStorageMemoria>;

  beforeEach(() => {
    mockStorage = crearStorageMemoria();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('valida objetivos correctos y rechaza estructuras corruptas con esObjetivoSesionValido', () => {
    expect(esObjetivoSesionValido(OBJETIVO_M31)).toBe(true);
    expect(esObjetivoSesionValido(null)).toBe(false);
    expect(esObjetivoSesionValido([])).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, categoria: 'cometa' })).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, raHoras: 25 })).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, decGrados: -95 })).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, magnitud: Number.NaN })).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, observado: 'si' })).toBe(false);
    expect(esObjetivoSesionValido({ ...OBJETIVO_M31, notas: 123 })).toBe(false);
  });

  it('descarta elementos corruptos y duplicados de localStorage conservando los válidos', () => {
    const raw = JSON.stringify([
      OBJETIVO_M31,
      { id: 'roto', categoria: 'desconocida' },
      null,
      { ...OBJETIVO_M31, notas: 'Duplicado que debe ignorarse' },
      OBJETIVO_ACRUX,
    ]);

    const recuperados = parsearObjetivosGuardados(raw);
    expect(recuperados).toHaveLength(2);
    expect(recuperados[0].id).toBe('messier-M31');
    expect(recuperados[0].notas).toBe('Usar ocular de 25mm');
    expect(recuperados[1].id).toBe('estrella-Alp Cru');
  });

  it('gestiona JSON corrupto y errores de cuota en localStorage sin lanzar excepciones', () => {
    mockStorage.setItem(CLAVE_PLANIFICADOR_SESION, '{json-invalido');
    expect(leerObjetivosGuardados()).toEqual([]);

    guardarObjetivosEnStorage([OBJETIVO_M31]);
    expect(leerObjetivosGuardados()).toHaveLength(1);

    mockStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => guardarObjetivosEnStorage([OBJETIVO_M31])).not.toThrow();
  });

  it('enriquece y ordena objetivos relegando los que nunca salen al final', () => {
    const planificados = planificarObjetivosSesion(
      [OBJETIVO_ACRUX, OBJETIVO_M31],
      39.47,
      -0.38,
      new Date('2026-10-15T20:00:00Z'),
      'Europe/Madrid'
    );

    expect(planificados).toHaveLength(2);
    expect(planificados[0].codigo).toBe('M31');
    expect(planificados[0].estadoVisibilidad).toBe('optimo_noche');
    expect(planificados[1].codigo).toBe('Acrux');
    expect(planificados[1].estadoVisibilidad).toBe('nunca_sale');
    expect(planificados[1].horaCulminacion).toBeNull();
  });
});
