import { describe, expect, it } from 'vitest';
import type { GeoCoordinates } from '../../types/astronomy';
import {
  CICLO_SINODICO_DIAS,
  TEXTO_SIN_OCASO,
  TEXTO_SIN_ORTO,
  calcularDatosLunares,
  calcularEfemeridesSolaresDia,
  esGeoCoordinatesValido,
  esZonaHorariaIANAValida,
  formatearHoraEnZona,
  inferirZonaHorariaPorCoordenadas,
  obtenerLimitesDiaCivilUTC,
} from '../lunarCalculations';

const MADRID: GeoCoordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
  timezone: 'Europe/Madrid',
  name: 'Madrid',
};

const TOKYO: GeoCoordinates = {
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: 'Asia/Tokyo',
  name: 'Tokio',
};

const NEW_YORK: GeoCoordinates = {
  latitude: 40.7128,
  longitude: -74.006,
  timezone: 'America/New_York',
  name: 'Nueva York',
};

const POLO_NORTE: GeoCoordinates = {
  latitude: 85.0,
  longitude: 15.0,
  timezone: 'Arctic/Longyearbyen',
  name: 'Ártico extremo',
};

describe('lunarCalculations — validaciones y zonas horarias IANA', () => {
  it('valida zonas horarias IANA y GeoCoordinates de forma estricta', () => {
    expect(esZonaHorariaIANAValida('Europe/Madrid')).toBe(true);
    expect(esZonaHorariaIANAValida('Asia/Tokyo')).toBe(true);
    expect(esZonaHorariaIANAValida('UTC')).toBe(true);
    expect(esZonaHorariaIANAValida('Mars/Olympus')).toBe(false);
    expect(esZonaHorariaIANAValida('')).toBe(false);
    expect(esZonaHorariaIANAValida(123)).toBe(false);

    expect(esGeoCoordinatesValido(MADRID)).toBe(true);
    expect(esGeoCoordinatesValido({ ...MADRID, latitude: 91 })).toBe(false);
    expect(esGeoCoordinatesValido({ ...MADRID, longitude: -181 })).toBe(false);
    expect(esGeoCoordinatesValido({ ...MADRID, latitude: Number.NaN })).toBe(false);
    expect(esGeoCoordinatesValido({ ...MADRID, timezone: 'Invalid/Zone' })).toBe(false);
  });

  it('infiere zonas IANA válidas offline para diferentes coordenadas del planeta', () => {
    expect(inferirZonaHorariaPorCoordenadas(40.4168, -3.7038)).toBe('Europe/Madrid');
    expect(inferirZonaHorariaPorCoordenadas(28.46, -16.25)).toBe('Atlantic/Canary');
    expect(inferirZonaHorariaPorCoordenadas(35.68, 139.65)).toBe('Asia/Tokyo');
    const zonaRemota = inferirZonaHorariaPorCoordenadas(-15.0, -145.0);
    expect(esZonaHorariaIANAValida(zonaRemota)).toBe(true);
  });

  it('calcula límites exactos de día civil UTC distintos para zonas horarias con desfase', () => {
    // 2026-06-15T23:30:00Z ya es 16 de junio en Madrid (UTC+2) y Tokio (UTC+9), pero 15 de junio en Nueva York (UTC-4)
    const instante = new Date('2026-06-15T23:30:00Z');
    const limMadrid = obtenerLimitesDiaCivilUTC(instante, MADRID.timezone);
    const limTokyo = obtenerLimitesDiaCivilUTC(instante, TOKYO.timezone);
    const limNY = obtenerLimitesDiaCivilUTC(instante, NEW_YORK.timezone);

    expect(limMadrid.claveDiaCivil).toBe('2026-06-16');
    expect(limTokyo.claveDiaCivil).toBe('2026-06-16');
    expect(limNY.claveDiaCivil).toBe('2026-06-15');

    expect(limMadrid.inicioDiaUTC.toISOString()).toBe('2026-06-15T22:00:00.000Z');
    expect(limTokyo.inicioDiaUTC.toISOString()).toBe('2026-06-15T15:00:00.000Z');
    expect(limNY.inicioDiaUTC.toISOString()).toBe('2026-06-15T04:00:00.000Z');
  });

  it('formatea horas en la zona horaria indicada y usa fallback sin TypeError ante null', () => {
    const fecha = new Date('2026-01-15T12:00:00Z');
    expect(formatearHoraEnZona(fecha, 'Europe/Madrid')).toBe('13:00');
    expect(formatearHoraEnZona(fecha, 'Asia/Tokyo')).toBe('21:00');
    expect(formatearHoraEnZona(fecha, 'America/New_York')).toBe('07:00');

    expect(formatearHoraEnZona(null, 'Europe/Madrid', TEXTO_SIN_ORTO)).toBe('Sin orto hoy');
    expect(formatearHoraEnZona(undefined, 'Europe/Madrid', TEXTO_SIN_OCASO)).toBe('Sin ocaso hoy');
    expect(formatearHoraEnZona(new Date('invalid'), 'Europe/Madrid', TEXTO_SIN_ORTO)).toBe(
      'Sin orto hoy'
    );
  });
});

describe('calcularDatosLunares — determinismo UTC y casos límite', () => {
  it('devuelve fase [0, 1), iluminación [0, 100], edad válida y próximos hitos futuros', () => {
    const fecha = new Date('2026-03-03T12:00:00Z'); // Próximo a Luna Llena
    const datos = calcularDatosLunares(fecha, MADRID, 657);

    expect(datos).not.toBeNull();
    expect(datos!.phase).toBeGreaterThanOrEqual(0);
    expect(datos!.phase).toBeLessThan(1);
    expect(datos!.illumination).toBeGreaterThanOrEqual(0);
    expect(datos!.illumination).toBeLessThanOrEqual(100);
    expect(datos!.ageDays).toBeGreaterThanOrEqual(0);
    expect(datos!.ageDays).toBeLessThanOrEqual(CICLO_SINODICO_DIAS);
    expect(datos!.nextFullMoon.getTime()).toBeGreaterThanOrEqual(fecha.getTime());
    expect(datos!.nextNewMoon.getTime()).toBeGreaterThanOrEqual(fecha.getTime());
  });

  it('garantiza que moonrise y moonset caen dentro del día civil de la zona seleccionada', () => {
    const fecha = new Date('2026-06-15T23:30:00Z');
    const datosTokyo = calcularDatosLunares(fecha, TOKYO);
    const limTokyo = obtenerLimitesDiaCivilUTC(fecha, TOKYO.timezone);

    expect(datosTokyo).not.toBeNull();
    if (datosTokyo!.moonrise) {
      expect(datosTokyo!.moonrise.getTime()).toBeGreaterThanOrEqual(
        limTokyo.inicioDiaUTC.getTime()
      );
      expect(datosTokyo!.moonrise.getTime()).toBeLessThan(limTokyo.finDiaUTC.getTime());
    }
    if (datosTokyo!.moonset) {
      expect(datosTokyo!.moonset.getTime()).toBeGreaterThanOrEqual(
        limTokyo.inicioDiaUTC.getTime()
      );
      expect(datosTokyo!.moonset.getTime()).toBeLessThan(limTokyo.finDiaUTC.getTime());
    }
  });

  it('maneja coordenadas polares extremas sin errores devolviendo null cuando la Luna es circumpolar', () => {
    // 2026-06-21 en latitud +85°: la Luna con declinación alta/baja no cruza el horizonte ese día
    const fechaSolsticio = new Date('2026-06-21T12:00:00Z');
    const datosPolares = calcularDatosLunares(fechaSolsticio, POLO_NORTE);
    const solaresPolares = calcularEfemeridesSolaresDia(fechaSolsticio, POLO_NORTE);

    expect(datosPolares).not.toBeNull();
    expect(solaresPolares).not.toBeNull();
    expect(solaresPolares!.esDiaPolar).toBe(true);
    expect(solaresPolares!.amanecer).toBeNull();
    expect(solaresPolares!.atardecer).toBeNull();

    // Formateo seguro incluso si moonrise o moonset es null
    const ortoTexto = formatearHoraEnZona(
      datosPolares!.moonrise,
      POLO_NORTE.timezone,
      TEXTO_SIN_ORTO
    );
    const ocasoTexto = formatearHoraEnZona(
      datosPolares!.moonset,
      POLO_NORTE.timezone,
      TEXTO_SIN_OCASO
    );
    expect(typeof ortoTexto).toBe('string');
    expect(typeof ocasoTexto).toBe('string');

    // Solsticio de invierno en +85° -> noche polar continua
    const fechaInvierno = new Date('2026-12-21T12:00:00Z');
    const solaresInvierno = calcularEfemeridesSolaresDia(fechaInvierno, POLO_NORTE);
    expect(solaresInvierno?.esNochePolar).toBe(true);
    expect(solaresInvierno?.amanecer).toBeNull();
    expect(solaresInvierno?.atardecer).toBeNull();
  });

  it('devuelve null ante fechas inválidas o coordenadas fuera de rango', () => {
    expect(calcularDatosLunares(new Date('invalid'), MADRID)).toBeNull();
    expect(
      calcularDatosLunares(new Date('2026-06-15T12:00:00Z'), { ...MADRID, latitude: -95 })
    ).toBeNull();
  });
});
