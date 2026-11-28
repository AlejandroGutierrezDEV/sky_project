import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  FALLBACK_ALERT_COORDINATES,
  WeatherAlertServiceError,
  esErrorAbort,
  esRespuestaOpenMeteoValida,
  normalizarCoordenadasAvisos,
  obtenerAvisosMeteorologicos,
  transformarHourlyEnAvisos,
  type OpenMeteoAlertHourly,
} from '../weatherAlertService';
import { parsearDescartesGuardados } from '../../hooks/useWeatherAlerts';

function crearHourlyBase(horas: number): OpenMeteoAlertHourly {
  const baseMs = Date.UTC(2026, 10, 28, 12, 0, 0);
  const time: string[] = [];
  for (let i = 0; i < horas; i++) {
    const fecha = new Date(baseMs + i * 3600_000);
    time.push(fecha.toISOString().slice(0, 16));
  }
  return {
    time,
    weather_code: Array<number | null>(horas).fill(0),
    wind_gusts_10m: Array<number | null>(horas).fill(15),
    precipitation_probability: Array<number | null>(horas).fill(5),
    precipitation: Array<number | null>(horas).fill(0),
    temperature_2m: Array<number | null>(horas).fill(14),
    visibility: Array<number | null>(horas).fill(15_000),
  };
}

describe('weatherAlertService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aplica fallback seguro a Madrid cuando las coordenadas faltan o son inválidas', () => {
    expect(normalizarCoordenadasAvisos(undefined)).toEqual(FALLBACK_ALERT_COORDINATES);
    expect(normalizarCoordenadasAvisos({ latitude: Number.NaN, longitude: -3.7 })).toEqual(
      FALLBACK_ALERT_COORDINATES
    );
    expect(normalizarCoordenadasAvisos({ latitude: 95, longitude: 0 })).toEqual(
      FALLBACK_ALERT_COORDINATES
    );
    expect(normalizarCoordenadasAvisos({ latitude: 40, longitude: -181 })).toEqual(
      FALLBACK_ALERT_COORDINATES
    );

    const valida = normalizarCoordenadasAvisos({
      latitude: 28.4636,
      longitude: -16.2518,
      timezone: 'Atlantic/Canary',
      locationName: 'Tenerife',
    });
    expect(valida.usedFallback).toBe(false);
    expect(valida.timezone).toBe('Atlantic/Canary');
    expect(valida.locationName).toBe('Tenerife');
  });

  it('valida estrictamente la estructura JSON externa con type guards', () => {
    const hourlyValido = crearHourlyBase(3);
    expect(esRespuestaOpenMeteoValida({ hourly: hourlyValido })).toBe(true);

    // Longitud dispar
    expect(
      esRespuestaOpenMeteoValida({
        hourly: { ...hourlyValido, wind_gusts_10m: [10, 20] },
      })
    ).toBe(false);

    // Valores no finitos
    expect(
      esRespuestaOpenMeteoValida({
        hourly: { ...hourlyValido, temperature_2m: [10, Number.NaN, 12] },
      })
    ).toBe(false);

    // Fechas inválidas
    expect(
      esRespuestaOpenMeteoValida({
        hourly: { ...hourlyValido, time: ['no-es-fecha', '2026-11-28T13:00', '2026-11-28T14:00'] },
      })
    ).toBe(false);

    // Payload corrupto
    expect(esRespuestaOpenMeteoValida(null)).toBe(false);
    expect(esRespuestaOpenMeteoValida({})).toBe(false);
  });

  it('agrupa horas contiguas de la misma categoría conservando máxima severidad y pico', () => {
    const hourly = crearHourlyBase(8);
    // 6 horas seguidas de viento fuerte con escalada a severo y extremo
    hourly.wind_gusts_10m[1] = 55;
    hourly.wind_gusts_10m[2] = 68;
    hourly.wind_gusts_10m[3] = 76;
    hourly.wind_gusts_10m[4] = 94;
    hourly.wind_gusts_10m[5] = 62;
    hourly.wind_gusts_10m[6] = 51;

    const alertas = transformarHourlyEnAvisos(hourly);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].category).toBe('wind');
    expect(alertas[0].severity).toBe('extreme');
    expect(alertas[0].peakValue).toBe('94 km/h');
    expect(alertas[0].startsAt.toISOString()).toBe('2026-11-28T13:00:00.000Z');
    expect(alertas[0].endsAt.toISOString()).toBe('2026-11-28T19:00:00.000Z');
    expect(alertas[0].id).toBe('wind-2026-11-28T13:00:00.000Z');
  });

  it('ordena avisos por severidad descendente y por startsAt ascendente', () => {
    const hourly = crearHourlyBase(6);
    // Hora 0: niebla (moderate)
    hourly.visibility[0] = 600;
    // Hora 2: lluvia intensa (severe)
    hourly.precipitation[2] = 12.5;
    // Hora 4: tormenta con granizo (extreme)
    hourly.weather_code[4] = 99;
    // Hora 1: helada (moderate)
    hourly.temperature_2m[1] = -2;

    const alertas = transformarHourlyEnAvisos(hourly);
    expect(alertas.map((a) => `${a.category}:${a.severity}`)).toEqual([
      'storm:extreme',
      'rain:severe',
      'fog:moderate',
      'temperature:moderate',
    ]);
  });

  it('lanza error tipado INVALID_RESPONSE si la API devuelve datos corruptos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ hourly: { time: [] } }), { status: 200 })
    );

    await expect(obtenerAvisosMeteorologicos()).rejects.toMatchObject({
      name: 'WeatherAlertServiceError',
      code: 'INVALID_RESPONSE',
    });
  });

  it('propaga AbortError sin envolver cuando la señal externa ya fue cancelada', async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await obtenerAvisosMeteorologicos(undefined, controller.signal);
      expect.unreachable('Debía lanzar AbortError');
    } catch (error) {
      expect(esErrorAbort(error)).toBe(true);
      expect(error).not.toBeInstanceOf(WeatherAlertServiceError);
    }
  });
});

describe('parsearDescartesGuardados', () => {
  it('recupera silenciosamente de JSON corrupto y purga descartes caducados', () => {
    const ahora = 1_700_000_000_000;
    expect(parsearDescartesGuardados('{json roto', ahora)).toEqual([]);
    expect(parsearDescartesGuardados('{"no":"array"}', ahora)).toEqual([]);

    const mezcla = JSON.stringify([
      { id: 'wind-1', expiresAt: ahora - 1000 }, // caducado
      { id: 'rain-2', expiresAt: ahora + 60_000 }, // vigente
      { id: 'rain-2', expiresAt: ahora + 90_000 }, // duplicado
      { id: '', expiresAt: ahora + 60_000 }, // inválido
      { id: 'fog-3', expiresAt: 'invalido' }, // inválido
    ]);

    expect(parsearDescartesGuardados(mezcla, ahora)).toEqual([
      { id: 'rain-2', expiresAt: ahora + 60_000 },
    ]);
  });
});
