import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  calcularCielo,
  calcularConstelaciones,
  calcularEstadoSolar,
  calcularEstrellas,
  calcularMessier,
  calcularTransitoCuerpo,
  calcularTrayectoriaAstro,
  esEntradaAstronomicaValida,
} from '../skyCalculator';
import { calcularProximosEventos } from '../eventsCalculator';
import {
  CLAVE_CACHE_METEO,
  MAX_HORAS_PRONOSTICO,
  esOpenMeteoHourlyValido,
  obtenerCondicionesMeteo,
} from '../weatherService';
import { obtenerAvisosMeteorologicos } from '../../services/weatherAlertService';
import {
  buscarObjetivoAlineado,
  construirObjetivosDiscoBrujula,
  construirOpcionesPlanetasBrujula,
  filtrarPlanetasActivos,
} from '../../hooks/useCompassFilter';
import type { CuerpoCeleste, ObjetivoBrujula, Ubicacion } from '../../types/astronomy';

const VALENCIA: Ubicacion = {
  latitud: 39.47,
  longitud: -0.38,
  altitud: 150,
  nombre: 'Valencia',
};

function crearMockStorage(): Storage {
  const almacen = new Map<string, string>();
  return {
    get length() {
      return almacen.size;
    },
    clear() {
      almacen.clear();
    },
    getItem(clave: string) {
      return almacen.get(clave) ?? null;
    },
    key(indice: number) {
      return Array.from(almacen.keys())[indice] ?? null;
    },
    removeItem(clave: string) {
      almacen.delete(clave);
    },
    setItem(clave: string, valor: string) {
      almacen.set(clave, valor);
    },
  };
}

function crearHourlySintetico(inicioUTC: Date, horas: number) {
  const time: string[] = [];
  const cloud_cover: number[] = [];
  const cloud_cover_low: number[] = [];
  const cloud_cover_mid: number[] = [];
  const cloud_cover_high: number[] = [];
  const relative_humidity_2m: number[] = [];
  const wind_speed_10m: number[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  const wind_gusts_10m: number[] = [];
  const precipitation_probability: number[] = [];
  const precipitation: number[] = [];
  const visibility: number[] = [];

  for (let i = 0; i < horas; i++) {
    const fecha = new Date(inicioUTC.getTime() + i * 3_600_000);
    const anio = fecha.getUTCFullYear();
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getUTCDate()).padStart(2, '0');
    const hora = String(fecha.getUTCHours()).padStart(2, '0');
    time.push(`${anio}-${mes}-${dia}T${hora}:00`);
    cloud_cover.push(10 + (i % 5) * 5);
    cloud_cover_low.push(5);
    cloud_cover_mid.push(10);
    cloud_cover_high.push(15);
    relative_humidity_2m.push(60);
    wind_speed_10m.push(12);
    temperature_2m.push(18.4);
    weather_code.push(0);
    wind_gusts_10m.push(20);
    precipitation_probability.push(10);
    precipitation.push(0);
    visibility.push(18_000);
  }

  return {
    time,
    cloud_cover,
    cloud_cover_low,
    cloud_cover_mid,
    cloud_cover_high,
    relative_humidity_2m,
    wind_speed_10m,
    temperature_2m,
    weather_code,
    wind_gusts_10m,
    precipitation_probability,
    precipitation,
    visibility,
  };
}

describe('Validación defensiva (esEntradaAstronomicaValida)', () => {
  const fechaValida = new Date('2026-06-15T22:00:00Z');

  it('acepta fechas y coordenadas dentro de los límites exactos', () => {
    expect(esEntradaAstronomicaValida(fechaValida, VALENCIA)).toBe(true);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: -90, longitud: -180 })
    ).toBe(true);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: 90, longitud: 180 })
    ).toBe(true);
  });

  it('rechaza fechas inválidas', () => {
    expect(esEntradaAstronomicaValida(new Date('invalid'), VALENCIA)).toBe(false);
  });

  it('rechaza latitudes y longitudes fuera de rango', () => {
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: -90.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: 90.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, longitud: -180.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, longitud: 180.01 })).toBe(false);
  });

  it('rechaza altitudes no finitas (NaN e Infinity)', () => {
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.NaN })).toBe(
      false
    );
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.POSITIVE_INFINITY })
    ).toBe(false);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.NEGATIVE_INFINITY })
    ).toBe(false);
  });
});

describe('Motor astronómico (skyCalculator)', () => {
  describe('calcularEstadoSolar', () => {
    it('clasifica correctamente Día al mediodía y Noche astronómica de madrugada en Valencia', () => {
      const mediodia = calcularEstadoSolar(new Date('2026-03-21T12:00:00Z'), VALENCIA);
      expect(mediodia).not.toBeNull();
      expect(mediodia?.fase).toBe('Día');
      expect(mediodia?.altitudSol).toBeGreaterThan(0);

      const noche = calcularEstadoSolar(new Date('2026-03-21T01:00:00Z'), VALENCIA);
      expect(noche).not.toBeNull();
      expect(noche?.fase).toBe('Noche astronómica');
      expect(noche?.altitudSol).toBeLessThan(-18);
    });

    it('clasifica crepúsculo civil/náutico/astronómico tras la puesta de sol', () => {
      const fasesCrepusculo = new Set([
        'Crepúsculo civil',
        'Crepúsculo náutico',
        'Crepúsculo astronómico',
      ]);
      const atardecer = calcularEstadoSolar(new Date('2026-03-21T18:45:00Z'), VALENCIA);
      expect(atardecer).not.toBeNull();
      expect(fasesCrepusculo.has(atardecer?.fase ?? '')).toBe(true);
    });

    it('devuelve null ante entradas inválidas', () => {
      expect(calcularEstadoSolar(new Date('invalid'), VALENCIA)).toBeNull();
      expect(
        calcularEstadoSolar(new Date('2026-03-21T12:00:00Z'), { ...VALENCIA, latitud: 95 })
      ).toBeNull();
    });
  });

  describe('calcularCielo', () => {
    it('devuelve los 8 cuerpos ordenados descendentemente por altitud con fase lunar solo en la Luna', () => {
      const cuerpos = calcularCielo(new Date('2026-03-21T22:00:00Z'), VALENCIA);
      expect(cuerpos).toHaveLength(8);

      for (let i = 1; i < cuerpos.length; i++) {
        expect(cuerpos[i - 1].altitud).toBeGreaterThanOrEqual(cuerpos[i].altitud);
      }

      const luna = cuerpos.find((c) => c.tipo === 'luna');
      expect(luna).toBeDefined();
      expect(luna?.faseLunar).toBeDefined();
      expect(luna?.anguloFase).toBeTypeOf('number');

      const planetas = cuerpos.filter((c) => c.tipo === 'planeta');
      expect(planetas).toHaveLength(7);
      for (const planeta of planetas) {
        expect(planeta.faseLunar).toBeUndefined();
        expect(planeta.anguloFase).toBeUndefined();
      }
    });
  });

  describe('calcularEstrellas, calcularMessier y calcularConstelaciones', () => {
    it('aplica precesión J2000 situando a Polaris cerca de la latitud del observador en el hemisferio norte', () => {
      const fecha = new Date('2026-03-21T22:00:00Z');
      const estrellas = calcularEstrellas(fecha, VALENCIA);
      const polaris = estrellas.find((e) => e.id === 'Alp UMi' || e.nombre === 'Polaris');

      expect(polaris).toBeDefined();
      expect(Math.abs((polaris?.altitud ?? 0) - VALENCIA.latitud)).toBeLessThan(1.5);
    });

    it('aplica umbral de visibilidad > 0° en estrellas y > 10° en objetos Messier', () => {
      const fecha = new Date('2026-03-21T22:00:00Z');
      const estrellas = calcularEstrellas(fecha, VALENCIA);
      const messier = calcularMessier(fecha, VALENCIA);

      expect(estrellas.length).toBeGreaterThanOrEqual(400);
      for (const estrella of estrellas) {
        if (estrella.altitud > 0.1) expect(estrella.visible).toBe(true);
        if (estrella.altitud < -0.1) expect(estrella.visible).toBe(false);
      }

      expect(messier).toHaveLength(110);
      for (const obj of messier) {
        if (obj.altitud > 10.1) expect(obj.visible).toBe(true);
        if (obj.altitud < 9.9) expect(obj.visible).toBe(false);
      }
    });

    it('proyecta las 88 constelaciones oficiales de la IAU y valida entradas inválidas', () => {
      const fecha = new Date('2026-03-21T22:00:00Z');
      const constelaciones = calcularConstelaciones(fecha, VALENCIA);

      expect(constelaciones).toHaveLength(88);
      for (const constelacion of constelaciones) {
        expect(Number.isFinite(constelacion.centroAltitud)).toBe(true);
        expect(Number.isFinite(constelacion.centroAcimut)).toBe(true);
        expect(constelacion.centroAcimut).toBeGreaterThanOrEqual(0);
        expect(constelacion.centroAcimut).toBeLessThan(360);
      }

      expect(calcularConstelaciones(new Date('invalid'), VALENCIA)).toEqual([]);
      expect(
        calcularConstelaciones(fecha, { ...VALENCIA, latitud: 95 })
      ).toEqual([]);
    });
  });

  describe('calcularTrayectoriaAstro y calcularTransitoCuerpo', () => {
    const fecha = new Date('2026-03-21T22:00:00Z');

    it('devuelve 25 puntos (-6h a +6h cada 30 min) para cuerpo, estrella y objeto Messier válidos', () => {
      const trajLuna = calcularTrayectoriaAstro(
        { id: 'Moon', nombre: 'Luna', categoria: 'cuerpo' },
        fecha,
        VALENCIA
      );
      const trajSirio = calcularTrayectoriaAstro(
        { id: 'Alp CMa', nombre: 'Sirio', categoria: 'estrella' },
        fecha,
        VALENCIA
      );
      const trajM31 = calcularTrayectoriaAstro(
        { id: 'M31', nombre: 'M31 · Galaxia de Andrómeda', categoria: 'messier' },
        fecha,
        VALENCIA
      );

      expect(trajLuna).toHaveLength(25);
      expect(trajSirio).toHaveLength(25);
      expect(trajM31).toHaveLength(25);
    });

    it('devuelve array vacío para IDs inexistentes y tránsito vacío para cuerpos inexistentes', () => {
      expect(
        calcularTrayectoriaAstro(
          { id: 'PlutonInexistente', nombre: 'Inexistente', categoria: 'cuerpo' },
          fecha,
          VALENCIA
        )
      ).toEqual([]);

      expect(
        calcularTrayectoriaAstro(
          { id: 'estrella-falsa', nombre: 'Falsa', categoria: 'estrella' },
          fecha,
          VALENCIA
        )
      ).toEqual([]);

      const transitoInvalido = calcularTransitoCuerpo('NoExiste', fecha, VALENCIA);
      expect(transitoInvalido).toEqual({
        salida: null,
        culminacion: null,
        puesta: null,
        alturaMaxima: null,
      });
    });

    it('calcula efemérides de tránsito válidas para un cuerpo existente', () => {
      const transito = calcularTransitoCuerpo('Moon', fecha, VALENCIA);
      expect(transito.culminacion).toBeInstanceOf(Date);
      expect(transito.alturaMaxima).toBeTypeOf('number');
    });

    it('descarta culminaciones devueltas por SearchHourAngle fuera del día civil (ms >= finMs)', () => {
      // Simula un tránsito lunar que cae al día civil siguiente (ms >= finMs)
      const fechaCivil = new Date('2026-06-15T12:00:00Z');
      const instanteDiaSiguiente = new Date('2026-06-16T00:15:00Z');
      const spyHourAngle = vi.spyOn(Astronomy, 'SearchHourAngle').mockReturnValue({
        time: Astronomy.MakeTime(instanteDiaSiguiente),
        hor: {
          ra: 0,
          dec: 0,
          azimuth: 180,
          altitude: 52.3,
        },
      });

      try {
        const transito = calcularTransitoCuerpo('Moon', fechaCivil, {
          ...VALENCIA,
          timezone: 'UTC',
        });
        expect(transito.culminacion).toBeNull();
        expect(transito.alturaMaxima).toBeNull();
      } finally {
        spyHourAngle.mockRestore();
      }
    });
  });
});

describe('Eventos astronómicos (eventsCalculator)', () => {
  it('devuelve como máximo 6 eventos ordenados cronológicamente con diasRestantes >= 0', () => {
    const fechaBase = new Date('2026-03-21T12:00:00Z');
    const eventos = calcularProximosEventos(fechaBase, VALENCIA);

    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos.length).toBeLessThanOrEqual(6);

    for (let i = 0; i < eventos.length; i++) {
      expect(eventos[i].diasRestantes).toBeGreaterThanOrEqual(0);
      if (i > 0) {
        expect(eventos[i].fechaPico.getTime()).toBeGreaterThanOrEqual(
          eventos[i - 1].fechaPico.getTime()
        );
      }
    }
  });

  it('diferencia eclipses lunares penumbrales frente a eclipses totales o parciales', () => {
    // 25 de marzo de 2024: eclipse lunar penumbral
    const eventosPenumbral = calcularProximosEventos(new Date('2024-03-20T12:00:00Z'), VALENCIA);
    const eclipsePenumbral = eventosPenumbral.find((ev) => ev.titulo.includes('Eclipse Lunar'));
    expect(eclipsePenumbral).toBeDefined();
    expect(eclipsePenumbral?.titulo).toBe('Eclipse Lunar Penumbral');
    expect(eclipsePenumbral?.resumen).toBe('Eclipse penumbral (oscurecimiento sutil)');

    // 14 de marzo de 2025: eclipse lunar total
    const eventosTotal = calcularProximosEventos(new Date('2025-03-01T12:00:00Z'), VALENCIA);
    const eclipseTotal = eventosTotal.find((ev) => ev.titulo.includes('Eclipse Lunar'));
    expect(eclipseTotal).toBeDefined();
    expect(eclipseTotal?.titulo).toBe('Eclipse Lunar Total');
    expect(eclipseTotal?.resumen).toMatch(/^Oscurecimiento: \d+%$/);
  });

  it('incluye un eclipse solar con aviso de no visibilidad si todos los próximos ocurren bajo el horizonte', () => {
    const fechaBase = new Date('2026-06-01T12:00:00Z');
    const fechaEclipseNocturno = new Date('2026-06-05T02:00:00Z');

    const spySolar = vi.spyOn(Astronomy, 'SearchLocalSolarEclipse').mockImplementation((fecha) => {
      const base = fecha instanceof Date ? fecha : new Date(fecha.toString());
      const fechaEvento =
        base.getTime() <= fechaEclipseNocturno.getTime()
          ? fechaEclipseNocturno
          : new Date(base.getTime() + 180 * 24 * 60 * 60 * 1000);
      const tiempo = Astronomy.MakeTime(fechaEvento);
      const evento: Astronomy.EclipseEvent = { time: tiempo, altitude: -14.5 };
      return {
        kind: Astronomy.EclipseKind.Partial,
        obscuration: 0.42,
        partial_begin: evento,
        total_begin: undefined,
        peak: evento,
        total_end: undefined,
        partial_end: evento,
      };
    });

    try {
      const eventos = calcularProximosEventos(fechaBase, VALENCIA);
      const eclipseSolar = eventos.find((ev) => ev.titulo.includes('Eclipse Solar'));

      expect(spySolar).toHaveBeenCalledTimes(16);
      expect(eclipseSolar).toBeDefined();
      expect(eclipseSolar?.titulo).toBe('Eclipse Solar Parcial');
      expect(eclipseSolar?.detalle).toBe(
        'No visible desde tu ubicación (Sol bajo el horizonte: -14.5°)'
      );
    } finally {
      spySolar.mockRestore();
    }
  });
});

describe('Servicio meteorológico (weatherService)', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = crearMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa la caché válida de localStorage sin invocar fetch y genera 12 franjas en proximasHoras', async () => {
    const fechaUTC = new Date('2026-06-15T20:00:00Z');
    const hourly = crearHourlySintetico(fechaUTC, 24);
    const ahora = Date.now();
    mockStorage.setItem(
      'skyproject_meteo_cache_v3',
      JSON.stringify({
        '39.47,-0.38': {
          timestamp: ahora,
          ultimoAcceso: ahora,
          hourly,
        },
      })
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado.aviso).toBeNull();
    expect(resultado.datos).not.toBeNull();
    expect(resultado.datos?.esCache).toBe(true);
    expect(resultado.datos?.horaPronostico).toBe('2026-06-15 20:00 UTC');
    expect(resultado.datos?.proximasHoras).toHaveLength(12);
    expect(resultado.datos?.proximasHoras[0].fechaISO).toBe('2026-06-15T20:00:00Z');
  });

  it('se recupera de forma segura ante JSON corrupto en localStorage y consulta Open-Meteo en UTC', async () => {
    const fechaUTC = new Date('2026-06-15T21:00:00Z');
    const hourly = crearHourlySintetico(fechaUTC, 18);
    mockStorage.setItem('skyproject_meteo_cache_v3', '{json-corrupto');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hourly }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const urlLlamada = String(fetchMock.mock.calls[0][0]);
    expect(urlLlamada).toContain('timezone=UTC');
    expect(resultado.aviso).toBeNull();
    expect(resultado.datos).not.toBeNull();
    expect(resultado.datos?.esCache).toBe(false);
    expect(resultado.datos?.horaPronostico).toBe('2026-06-15 21:00 UTC');
    expect(resultado.datos?.proximasHoras).toHaveLength(12);
  });

  it('rechaza respuestas de Open-Meteo con NaN o Infinity sin guardarlas ni propagar NaN', async () => {
    const fechaUTC = new Date('2026-06-15T21:00:00Z');
    const hourlyConNaN = crearHourlySintetico(fechaUTC, 12);
    hourlyConNaN.cloud_cover[0] = Number.NaN;

    const hourlyConInfinito = crearHourlySintetico(fechaUTC, 12);
    hourlyConInfinito.wind_speed_10m[0] = Number.POSITIVE_INFINITY;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hourly: hourlyConNaN }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hourly: hourlyConInfinito }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const resNaN = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);
    expect(resNaN.datos).toBeNull();
    expect(resNaN.aviso).toBe('No se pudo obtener la previsión meteorológica.');

    const resInfinito = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);
    expect(resInfinito.datos).toBeNull();
    expect(resInfinito.aviso).toBe('No se pudo obtener la previsión meteorológica.');
    expect(mockStorage.getItem('skyproject_meteo_cache_v3')).toBeNull();
  });

  it('conserva múltiples ubicaciones con expulsión LRU al superar 5 y mantiene fallback offline', async () => {
    const fechaUTC = new Date('2026-06-15T20:00:00Z');
    const hourly = crearHourlySintetico(fechaUTC, 18);

    let reloj = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      reloj += 1000;
      return reloj;
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hourly }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const ubicaciones: Ubicacion[] = [
      { latitud: 39.47, longitud: -0.38, altitud: 150, nombre: 'Valencia' },
      { latitud: 40.42, longitud: -3.7, altitud: 650, nombre: 'Madrid' },
      { latitud: 41.39, longitud: 2.17, altitud: 12, nombre: 'Barcelona' },
      { latitud: 37.39, longitud: -5.98, altitud: 7, nombre: 'Sevilla' },
      { latitud: 28.47, longitud: -16.25, altitud: 2390, nombre: 'Teide' },
      { latitud: 43.26, longitud: -2.93, altitud: 19, nombre: 'Bilbao' },
    ];

    // Carga las 5 primeras ubicaciones
    for (let i = 0; i < 5; i++) {
      const res = await obtenerCondicionesMeteo(fechaUTC, ubicaciones[i]);
      expect(res.datos?.esCache).toBe(false);
    }
    expect(fetchMock).toHaveBeenCalledTimes(5);

    // Reutiliza la primera ubicación desde caché para refrescar su ultimoAcceso (LRU)
    const resReutilizada = await obtenerCondicionesMeteo(fechaUTC, ubicaciones[0]);
    expect(resReutilizada.datos?.esCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);

    // Añade una sexta ubicación: debe expulsar a Madrid (índice 1) y conservar Valencia (índice 0)
    const resSexta = await obtenerCondicionesMeteo(fechaUTC, ubicaciones[5]);
    expect(resSexta.datos?.esCache).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(6);

    const cacheGuardada = JSON.parse(
      mockStorage.getItem('skyproject_meteo_cache_v3') ?? '{}'
    ) as Record<string, unknown>;
    const claves = Object.keys(cacheGuardada);
    expect(claves).toHaveLength(5);
    expect(claves).toContain('39.47,-0.38');
    expect(claves).toContain('43.26,-2.93');
    expect(claves).not.toContain('40.42,-3.70');

    // Expira el TTL (> 1 hora) y simula fallo de red: debe responder con fallback offline
    reloj += 2 * 60 * 60 * 1000;
    fetchMock.mockRejectedValueOnce(new Error('Sin conexión'));

    const resOffline = await obtenerCondicionesMeteo(fechaUTC, ubicaciones[0]);
    expect(resOffline.datos).not.toBeNull();
    expect(resOffline.datos?.esCache).toBe(true);
    expect(resOffline.aviso).toBe('Sin conexión: mostrando datos guardados en caché.');
  });

  it('rechaza arrays de Open-Meteo con longitud > 400 o longitudes dispares en red y localStorage', async () => {
    const fechaUTC = new Date('2026-06-15T20:00:00Z');
    const hourlyExcedido = crearHourlySintetico(fechaUTC, MAX_HORAS_PRONOSTICO + 1);
    expect(esOpenMeteoHourlyValido(hourlyExcedido)).toBe(false);

    const hourlyDispar = crearHourlySintetico(fechaUTC, 12);
    hourlyDispar.wind_gusts_10m.pop();
    expect(esOpenMeteoHourlyValido(hourlyDispar)).toBe(false);

    // Entrada corrupta (> 400 horas) en localStorage debe descartarse
    const ahora = Date.now();
    mockStorage.setItem(
      CLAVE_CACHE_METEO,
      JSON.stringify({
        '39.47,-0.38': {
          timestamp: ahora,
          ultimoAcceso: ahora,
          hourly: hourlyExcedido,
        },
      })
    );

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hourly: hourlyExcedido }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.datos).toBeNull();
    expect(res.aviso).toBe('No se pudo obtener la previsión meteorológica.');
  });

  it('sirve a WeatherPanel y WeatherAlertsPanel con una sola llamada HTTP y fallback offline compartido', async () => {
    const ahora = new Date();
    const inicioHoraActual = new Date(
      Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
        ahora.getUTCHours(),
        0,
        0
      )
    );
    const hourly = crearHourlySintetico(inicioHoraActual, 48);
    hourly.wind_gusts_10m[1] = 82; // Aviso severo de viento

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hourly }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Llamadas simultáneas de ambos consumidores para las mismas coordenadas: 1 sola petición HTTP
    const [resMeteo, resAvisos] = await Promise.all([
      obtenerCondicionesMeteo(inicioHoraActual, VALENCIA),
      obtenerAvisosMeteorologicos({
        latitude: VALENCIA.latitud,
        longitude: VALENCIA.longitud,
        timezone: 'Europe/Madrid',
        locationName: VALENCIA.nombre,
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resMeteo.datos).not.toBeNull();
    expect(resAvisos.alerts.some((a) => a.category === 'wind' && a.severity === 'severe')).toBe(
      true
    );

    // Una segunda lectura dentro del TTL tampoco dispara fetch
    const resAvisosCache = await obtenerAvisosMeteorologicos({
      latitude: VALENCIA.latitud,
      longitude: VALENCIA.longitud,
      timezone: 'Europe/Madrid',
      locationName: VALENCIA.nombre,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resAvisosCache.desdeCache).toBe(true);

    // Simula expiración de TTL y caída de red: ambos leen caché LRU compartida sin lanzar error
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
    fetchMock.mockRejectedValue(new Error('Sin cobertura'));

    const resMeteoOffline = await obtenerCondicionesMeteo(inicioHoraActual, VALENCIA);
    const resAvisosOffline = await obtenerAvisosMeteorologicos({
      latitude: VALENCIA.latitud,
      longitude: VALENCIA.longitud,
      timezone: 'Europe/Madrid',
      locationName: VALENCIA.nombre,
    });

    expect(resMeteoOffline.datos).not.toBeNull();
    expect(resMeteoOffline.datos?.esCache).toBe(true);
    expect(resAvisosOffline.desdeCache).toBe(true);
    expect(resAvisosOffline.avisoOffline).toContain('Sin conexión');
    expect(resAvisosOffline.alerts.some((a) => a.category === 'wind')).toBe(true);
  });
});

describe('Prioridad de objetivoSeleccionado en Brújula 3D', () => {
  const planetasMock: CuerpoCeleste[] = [
    {
      id: 'Saturn',
      nombre: 'Saturno',
      tipo: 'planeta',
      acimut: 240,
      altitud: -12,
      direccion: 'SO',
      magnitud: 0.8,
      visible: false,
      color: '#fde047',
    },
    {
      id: 'Mars',
      nombre: 'Marte',
      tipo: 'planeta',
      acimut: 110,
      altitud: 25,
      direccion: 'ESE',
      magnitud: 0.4,
      visible: true,
      color: '#f87171',
    },
  ];

  const sirio: ObjetivoBrujula = {
    id: 'estrella-Alp CMa',
    nombre: 'Sirio',
    acimut: 168,
    altitud: 31,
    color: '#fde68a',
  };

  const m42: ObjetivoBrujula = {
    id: 'messier-M42',
    nombre: 'M42 · Nebulosa de Orión',
    acimut: 185,
    altitud: 42,
    color: '#34d399',
  };

  it('mantiene visible objetivoSeleccionado en el disco y en el aviso de ±8° aunque haya filtro de planeta activo', () => {
    const { opciones } = construirOpcionesPlanetasBrujula(planetasMock);
    const activosSoloSaturno = filtrarPlanetasActivos(opciones, 'saturn');

    const objetivosConSirio = construirObjetivosDiscoBrujula({
      activePlanets: activosSoloSaturno,
      cuerpos: planetasMock,
      objetivoSeleccionado: sirio,
      selectedFilter: 'saturn',
    });

    expect(objetivosConSirio.some((o) => o.id === sirio.id)).toBe(true);
    expect(objetivosConSirio.some((o) => o.id === 'saturn')).toBe(true);

    // Alineación dentro de ±8° con Sirio pese a tener filtrado solo Saturno
    const alineadoSirio = buscarObjetivoAlineado(
      objetivosConSirio,
      174,
      'saturn',
      sirio
    );
    expect(alineadoSirio?.id).toBe(sirio.id);

    // También mantiene visible un objeto Messier incluso si no hay planetas activos
    const objetivosConM42 = construirObjetivosDiscoBrujula({
      activePlanets: [],
      cuerpos: [],
      objetivoSeleccionado: m42,
      selectedFilter: 'jupiter',
    });
    expect(objetivosConM42).toHaveLength(1);
    expect(objetivosConM42[0].id).toBe(m42.id);

    const alineadoM42 = buscarObjetivoAlineado(objetivosConM42, 180, 'jupiter', m42);
    expect(alineadoM42?.id).toBe(m42.id);
  });
});
