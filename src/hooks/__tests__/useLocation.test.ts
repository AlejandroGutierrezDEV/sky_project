import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_UBICACION,
  UBICACION_POR_DEFECTO,
  aGeoCoordinates,
  esUbicacionValida,
  guardarUbicacionEnStorage,
  leerUbicacionGuardada,
  resolverFallbackGeolocalizacion,
} from '../useLocation';

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

describe('useLocation — validación defensiva y persistencia en localStorage', () => {
  let mockStorage: ReturnType<typeof crearStorageMemoria>;

  beforeEach(() => {
    mockStorage = crearStorageMemoria();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hace fallback por defecto a Madrid (40.4168, -3.7038, Europe/Madrid) si no hay datos', () => {
    const ubicacion = leerUbicacionGuardada();
    expect(ubicacion.latitud).toBe(40.4168);
    expect(ubicacion.longitud).toBe(-3.7038);
    expect(ubicacion.timezone).toBe('Europe/Madrid');
  });

  it('se recupera sin errores ante JSON corrupto, coordenadas fuera de rango o tipos inválidos', () => {
    mockStorage.setItem(CLAVE_UBICACION, '{corrupto');
    expect(leerUbicacionGuardada()).toEqual(UBICACION_POR_DEFECTO);

    mockStorage.setItem(
      CLAVE_UBICACION,
      JSON.stringify({
        nombre: 'Latitud imposible',
        latitud: 120,
        longitud: -3.7,
        altitud: 600,
        timezone: 'Europe/Madrid',
      })
    );
    expect(leerUbicacionGuardada()).toEqual(UBICACION_POR_DEFECTO);

    mockStorage.setItem(
      CLAVE_UBICACION,
      JSON.stringify({
        nombre: 'Zona falsa',
        latitud: 40.4,
        longitud: -3.7,
        altitud: 600,
        timezone: 'Not/A_Zone',
      })
    );
    expect(leerUbicacionGuardada()).toEqual(UBICACION_POR_DEFECTO);

    expect(
      esUbicacionValida({
        nombre: 'NaN coords',
        latitud: Number.NaN,
        longitud: 0,
        altitud: 0,
      })
    ).toBe(false);
  });

  it('mantiene retrocompatibilidad con ubicaciones antiguas sin campo timezone', () => {
    mockStorage.setItem(
      CLAVE_UBICACION,
      JSON.stringify({
        nombre: 'Teide',
        latitud: 28.3,
        longitud: -16.5,
        altitud: 2390,
      })
    );

    const cargada = leerUbicacionGuardada();
    expect(cargada.nombre).toBe('Teide');
    expect(cargada.latitud).toBe(28.3);
    expect(cargada.timezone).toBe('Atlantic/Canary');
    expect(cargada.bortle).toBe(4);
  });

  it('aplica fallback de geolocalización a la última ubicación válida guardada o Madrid', () => {
    // Sin nada guardado -> Madrid
    expect(resolverFallbackGeolocalizacion()).toEqual(UBICACION_POR_DEFECTO);

    // Con ubicación válida guardada -> recupera esa ubicación
    guardarUbicacionEnStorage({
      nombre: 'Tokio',
      latitud: 35.6762,
      longitud: 139.6503,
      altitud: 40,
      bortle: 8,
      timezone: 'Asia/Tokyo',
    });

    const fallback = resolverFallbackGeolocalizacion();
    expect(fallback.nombre).toBe('Tokio');
    expect(fallback.timezone).toBe('Asia/Tokyo');

    const coords = aGeoCoordinates(fallback);
    expect(coords).toEqual({
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
      name: 'Tokio',
    });
  });
});
