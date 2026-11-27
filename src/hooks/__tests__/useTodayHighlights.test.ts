import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { GeoCoordinates, TemaVisual } from '../../types/astronomy';
import { calcularDatosLunares } from '../../utils/lunarCalculations';
import {
  cargarDestacadosDeHoyAsync,
  generarDestacadosDeHoy,
} from '../useTodayHighlights';
import { TodayHighlightsWidget } from '../../components/widgets/TodayHighlightsWidget';

const MADRID: GeoCoordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
  timezone: 'Europe/Madrid',
  name: 'Madrid',
};

const POLO_NORTE: GeoCoordinates = {
  latitude: 85.0,
  longitude: 15.0,
  timezone: 'Arctic/Longyearbyen',
  name: 'Svalbard / Ártico',
};

describe('useTodayHighlights — priorización, fallback y AbortController', () => {
  it('nunca devuelve una lista vacía en días sin lluvias ni fase lunar exacta y ordena por prioridad', () => {
    // 2026-02-10: día tranquilo sin lluvia principal ni fase exacta
    const fechaTranquila = new Date('2026-02-10T18:00:00Z');
    const lunarData = calcularDatosLunares(fechaTranquila, MADRID, 657);
    const items = generarDestacadosDeHoy(MADRID, lunarData, {
      referenceDate: fechaTranquila,
      altitudeMeters: 657,
    });

    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(4);

    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].priority).toBeLessThanOrEqual(items[i].priority);
    }
  });

  it('asigna prioridad 1 a un hito de Luna Llena o iluminación >= 95%', () => {
    const fechaLunaLlena = new Date('2026-03-03T10:00:00Z');
    const lunarData = calcularDatosLunares(fechaLunaLlena, MADRID, 657);
    expect(lunarData).not.toBeNull();
    expect(lunarData!.illumination).toBeGreaterThanOrEqual(95);

    const items = generarDestacadosDeHoy(MADRID, lunarData, {
      referenceDate: fechaLunaLlena,
      altitudeMeters: 657,
    });

    const itemLunar = items.find((item) => item.category === 'lunar');
    expect(itemLunar).toBeDefined();
    expect(itemLunar?.priority).toBe(1);
  });

  it('funciona sin errores en coordenadas polares (sol de medianoche y noche polar)', () => {
    const fechaVerano = new Date('2026-06-21T12:00:00Z');
    const lunarVerano = calcularDatosLunares(fechaVerano, POLO_NORTE);
    const itemsVerano = generarDestacadosDeHoy(POLO_NORTE, lunarVerano, {
      referenceDate: fechaVerano,
    });

    expect(itemsVerano.length).toBeGreaterThan(0);
    expect(
      itemsVerano.some((item) => item.subtitle.includes('Sin ocaso hoy'))
    ).toBe(true);

    const fechaInvierno = new Date('2026-12-21T12:00:00Z');
    const lunarInvierno = calcularDatosLunares(fechaInvierno, POLO_NORTE);
    const itemsInvierno = generarDestacadosDeHoy(POLO_NORTE, lunarInvierno, {
      referenceDate: fechaInvierno,
    });

    expect(itemsInvierno.length).toBeGreaterThan(0);
    expect(
      itemsInvierno.some((item) => item.subtitle.includes('Sin orto hoy'))
    ).toBe(true);
  });

  it('cancela peticiones previas mediante AbortController al cambiar de ubicación rápidamente', async () => {
    const controller = new AbortController();
    const fecha = new Date('2026-05-10T20:00:00Z');
    const lunarData = calcularDatosLunares(fecha, MADRID);

    const fetchLento = vi.fn(
      (_coords: GeoCoordinates, signal: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const promesa = cargarDestacadosDeHoyAsync(
      MADRID,
      lunarData,
      { referenceDate: fecha, fetchExternalHighlights: fetchLento },
      controller.signal
    );

    controller.abort();

    await expect(promesa).rejects.toThrow();
  });
});

describe('TodayHighlightsWidget — semántica HTML, estados y temas', () => {
  const fecha = new Date('2026-02-10T18:00:00Z');
  const lunarData = calcularDatosLunares(fecha, MADRID, 657);
  const items = generarDestacadosDeHoy(MADRID, lunarData, { referenceDate: fecha });

  it('renderiza los 3 estados obligatorios (loading, error con reintento, empty) y tarjetas semánticas', () => {
    const htmlLoading = renderToStaticMarkup(
      createElement(TodayHighlightsWidget, {
        items: [],
        isLoading: true,
        error: null,
        lastUpdated: null,
        timezone: MADRID.timezone,
        locationName: MADRID.name,
        tema: 'oscuro',
        claseTarjeta: 'border',
        onRetry: () => undefined,
      })
    );
    expect(htmlLoading).toContain('aria-labelledby="today-highlights-heading"');
    expect(htmlLoading).toContain('role="status"');

    const htmlError = renderToStaticMarkup(
      createElement(TodayHighlightsWidget, {
        items: [],
        isLoading: false,
        error: 'Fallo simulado',
        lastUpdated: null,
        timezone: MADRID.timezone,
        locationName: MADRID.name,
        tema: 'oscuro',
        claseTarjeta: 'border',
        onRetry: () => undefined,
      })
    );
    expect(htmlError).toContain('role="alert"');
    expect(htmlError).toContain('aria-label="Reintentar carga de destacados de hoy"');

    const htmlEmpty = renderToStaticMarkup(
      createElement(TodayHighlightsWidget, {
        items: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
        timezone: MADRID.timezone,
        locationName: MADRID.name,
        tema: 'oscuro',
        claseTarjeta: 'border',
        onRetry: () => undefined,
      })
    );
    expect(htmlEmpty).toContain('Sin destacados disponibles');

    const temas: TemaVisual[] = ['oscuro', 'claro', 'rojo'];
    for (const tema of temas) {
      const htmlItems = renderToStaticMarkup(
        createElement(TodayHighlightsWidget, {
          items,
          isLoading: false,
          error: null,
          lastUpdated: fecha,
          timezone: MADRID.timezone,
          locationName: MADRID.name,
          tema,
          claseTarjeta: 'border',
          onRetry: () => undefined,
        })
      );
      expect(htmlItems).toContain('<ul');
      expect(htmlItems).toContain('<li');
      expect(htmlItems).toContain('<time');
      expect(htmlItems).toContain('Europe/Madrid');
    }
  });
});
