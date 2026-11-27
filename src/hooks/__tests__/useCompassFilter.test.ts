import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SOLAR_SYSTEM_PLANET_IDS,
  isCompassPlanetFilter,
  type CuerpoCeleste,
} from '../../types/astronomy';
import {
  CLAVE_FILTRO_BRUJULA,
  construirOpcionesPlanetasBrujula,
  filtrarPlanetasActivos,
  guardarFiltroBrujulaEnStorage,
  leerFiltroBrujulaGuardado,
  normalizarIdPlaneta,
} from '../useCompassFilter';

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

function crearCuerpoMock(
  id: string,
  nombre: string,
  tipo: CuerpoCeleste['tipo'],
  acimut: number,
  altitud: number,
  color = '#ffffff'
): CuerpoCeleste {
  return {
    id,
    nombre,
    tipo,
    acimut,
    altitud,
    direccion: 'N',
    magnitud: 0,
    visible: altitud > 0,
    color,
  };
}

const CUERPOS_COMPLETOS: CuerpoCeleste[] = [
  crearCuerpoMock('Moon', 'Luna', 'luna', 120, 40, '#f8fafc'),
  crearCuerpoMock('Neptune', 'Neptuno', 'planeta', 250.4, -14.2, '#60a5fa'),
  crearCuerpoMock('Mercury', 'Mercurio', 'planeta', 95.1, 8.5, '#94a3b8'),
  crearCuerpoMock('Venus', 'Venus', 'planeta', 110.2, 22.0, '#fef08a'),
  crearCuerpoMock('Mars', 'Marte', 'planeta', 180.0, -3.5, '#f87171'),
  crearCuerpoMock('Jupiter', 'Júpiter', 'planeta', 215.5, 48.3, '#fdba74'),
  crearCuerpoMock('Saturn', 'Saturno', 'planeta', 240.0, 0, '#fde047'),
  crearCuerpoMock('Uranus', 'Urano', 'planeta', 310.7, 19.4, '#67e8f9'),
];

describe('isCompassPlanetFilter y normalizarIdPlaneta', () => {
  it('acepta "all" y los 7 planetas del Sistema Solar', () => {
    expect(isCompassPlanetFilter('all')).toBe(true);
    for (const id of SOLAR_SYSTEM_PLANET_IDS) {
      expect(isCompassPlanetFilter(id)).toBe(true);
    }
  });

  it('rechaza valores desconocidos, nulos o de tipo incorrecto', () => {
    expect(isCompassPlanetFilter(null)).toBe(false);
    expect(isCompassPlanetFilter(undefined)).toBe(false);
    expect(isCompassPlanetFilter('pluto')).toBe(false);
    expect(isCompassPlanetFilter('moon')).toBe(false);
    expect(isCompassPlanetFilter('Mars')).toBe(false);
    expect(isCompassPlanetFilter(42)).toBe(false);
    expect(isCompassPlanetFilter({})).toBe(false);
  });

  it('normaliza identificadores de astronomy-engine a PlanetId', () => {
    expect(normalizarIdPlaneta('Mercury')).toBe('mercury');
    expect(normalizarIdPlaneta('NEPTUNE')).toBe('neptune');
    expect(normalizarIdPlaneta('Moon')).toBeNull();
    expect(normalizarIdPlaneta('Pluto')).toBeNull();
  });
});

describe('construirOpcionesPlanetasBrujula y filtrarPlanetasActivos', () => {
  it('devuelve los 7 planetas en orden canónico incluyendo los que están bajo el horizonte', () => {
    const { opciones, error } = construirOpcionesPlanetasBrujula(CUERPOS_COMPLETOS);

    expect(error).toBeNull();
    expect(opciones.map((p) => p.id)).toEqual([...SOLAR_SYSTEM_PLANET_IDS]);

    const saturno = opciones.find((p) => p.id === 'saturn');
    expect(saturno?.altitudeDeg).toBe(0);
    expect(saturno?.isAboveHorizon).toBe(false);

    const neptuno = opciones.find((p) => p.id === 'neptune');
    expect(neptuno?.altitudeDeg).toBeCloseTo(-14.2, 2);
    expect(neptuno?.azimuthDeg).toBeCloseTo(250.4, 2);
    expect(neptuno?.isAboveHorizon).toBe(false);

    const jupiter = opciones.find((p) => p.id === 'jupiter');
    expect(jupiter?.isAboveHorizon).toBe(true);
  });

  it('normaliza azimut a [0, 360) y acota altitud a [-90, 90]', () => {
    const { opciones } = construirOpcionesPlanetasBrujula([
      crearCuerpoMock('Mars', 'Marte', 'planeta', -30, 120, '#f87171'),
      crearCuerpoMock('Venus', 'Venus', 'planeta', 370, -110, '#fef08a'),
    ]);

    expect(opciones[0]).toMatchObject({
      id: 'venus',
      azimuthDeg: 10,
      altitudeDeg: -90,
      isAboveHorizon: false,
    });
    expect(opciones[1]).toMatchObject({
      id: 'mars',
      azimuthDeg: 330,
      altitudeDeg: 90,
      isAboveHorizon: true,
    });
  });

  it('devuelve error cuando los planetas tienen coordenadas inválidas', () => {
    const { opciones, error } = construirOpcionesPlanetasBrujula([
      crearCuerpoMock('Mars', 'Marte', 'planeta', Number.NaN, 15, '#f87171'),
    ]);

    expect(opciones).toEqual([]);
    expect(error).toBeTruthy();
  });

  it('filtra correctamente entre "all" y un planeta concreto (incluso bajo el horizonte)', () => {
    const { opciones } = construirOpcionesPlanetasBrujula(CUERPOS_COMPLETOS);

    expect(filtrarPlanetasActivos(opciones, 'all')).toHaveLength(7);

    const soloNeptuno = filtrarPlanetasActivos(opciones, 'neptune');
    expect(soloNeptuno).toHaveLength(1);
    expect(soloNeptuno[0].id).toBe('neptune');
    expect(soloNeptuno[0].isAboveHorizon).toBe(false);
  });
});

describe('persistencia segura del filtro en localStorage', () => {
  let mockStorage: ReturnType<typeof crearStorageMemoria>;

  beforeEach(() => {
    mockStorage = crearStorageMemoria();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa "all" por defecto si no hay valor guardado', () => {
    expect(leerFiltroBrujulaGuardado()).toBe('all');
  });

  it('guarda y recupera un planeta válido', () => {
    guardarFiltroBrujulaEnStorage('saturn');
    expect(leerFiltroBrujulaGuardado()).toBe('saturn');
  });

  it('hace fallback seguro a "all" ante JSON corrupto o planeta desconocido', () => {
    mockStorage.setItem(CLAVE_FILTRO_BRUJULA, '{corrupto');
    expect(leerFiltroBrujulaGuardado()).toBe('all');

    mockStorage.setItem(CLAVE_FILTRO_BRUJULA, JSON.stringify('pluto'));
    expect(leerFiltroBrujulaGuardado()).toBe('all');
  });

  it('no lanza excepciones si localStorage falla al leer o escribir', () => {
    mockStorage.getItem.mockImplementation(() => {
      throw new Error('Storage bloqueado');
    });
    expect(leerFiltroBrujulaGuardado()).toBe('all');

    mockStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => guardarFiltroBrujulaEnStorage('venus')).not.toThrow();
  });
});
