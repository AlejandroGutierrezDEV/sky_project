import { useMemo } from 'react';
import type { GeoCoordinates, LunarData } from '../types/astronomy';
import { calcularDatosLunares, esGeoCoordinatesValido } from '../utils/lunarCalculations';

export interface UseLunarDataResult {
  lunarData: LunarData | null;
  error: string | null;
}

/**
 * Hook determinista para obtener datos lunares completos (`LunarData`) en UTC
 * sincronizados con la ubicación y zona horaria activas.
 */
export function useLunarData(
  coordinates: GeoCoordinates,
  referenceDate?: Date,
  altitudMetros = 0
): UseLunarDataResult {
  const timestampValido =
    referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
      ? referenceDate.getTime()
      : null;

  return useMemo<UseLunarDataResult>(() => {
    if (!esGeoCoordinatesValido(coordinates)) {
      return {
        lunarData: null,
        error: 'Coordenadas o zona horaria inválidas para calcular efemérides lunares.',
      };
    }

    const fechaCalculo = timestampValido !== null ? new Date(timestampValido) : new Date();
    const datos = calcularDatosLunares(fechaCalculo, coordinates, altitudMetros);

    if (!datos) {
      return {
        lunarData: null,
        error: 'No se pudieron calcular los datos lunares para la fecha indicada.',
      };
    }

    return {
      lunarData: datos,
      error: null,
    };
  }, [
    coordinates,
    timestampValido,
    altitudMetros,
  ]);
}
