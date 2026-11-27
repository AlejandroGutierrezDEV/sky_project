import { useMemo } from 'react';
import {
  calcularConstelaciones,
  calcularEstrellas,
  calcularMessier,
} from '../core/skyCalculator';
import type {
  ConstelacionCalculada,
  EstrellaCalculada,
  FiltroTipoUI,
  FiltrosCatalogo,
  InstrumentoObservacion,
  MessierCalculado,
  TipoObjetoMessier,
  Ubicacion,
} from '../types/astronomy';

export const FILTROS_CATALOGO_POR_DEFECTO: FiltrosCatalogo = {
  tipo: 'Todos',
  instrumento: 'Todos',
  soloPorEncimaHorizonte: true,
};

export const GANANCIA_MAGNITUD_INSTRUMENTO: Readonly<Record<InstrumentoObservacion, number>> = {
  'Ojo desnudo': 0.0,
  Prismaticos: 3.0,
  Telescopio: 5.5,
};

export const JERARQUIA_INSTRUMENTO: Readonly<Record<InstrumentoObservacion, number>> = {
  'Ojo desnudo': 0,
  Prismaticos: 1,
  Telescopio: 2,
};

export function coincideFiltroTipoMessier(
  tipo: TipoObjetoMessier,
  filtro: FiltroTipoUI
): boolean {
  switch (filtro) {
    case 'Todos':
      return true;
    case 'Galaxia':
      return tipo === 'Galaxia';
    case 'Nebulosa':
      return tipo === 'Nebulosa' || tipo === 'RemanenteSupernova';
    case 'Cumulo':
      return tipo === 'CumuloGlobular' || tipo === 'CumuloAbierto';
  }
}

export function esCompatibleConInstrumento(
  minimo: InstrumentoObservacion,
  seleccionado: InstrumentoObservacion | 'Todos'
): boolean {
  if (seleccionado === 'Todos') return true;
  return JERARQUIA_INSTRUMENTO[minimo] <= JERARQUIA_INSTRUMENTO[seleccionado];
}

export function calcularMagnitudLimiteEfectiva(
  magnitudLimiteVisible: number,
  instrumento: InstrumentoObservacion | 'Todos'
): number {
  const base = Number.isFinite(magnitudLimiteVisible) ? magnitudLimiteVisible : 6.0;
  if (instrumento === 'Todos') {
    return Number(base.toFixed(1));
  }
  return Number((base + GANANCIA_MAGNITUD_INSTRUMENTO[instrumento]).toFixed(1));
}

export interface ParametrosFiltradoCatalogos {
  estrellas: readonly EstrellaCalculada[];
  messier: readonly MessierCalculado[];
  constelaciones: readonly ConstelacionCalculada[];
  magnitudLimiteVisible: number;
  filtros: FiltrosCatalogo;
}

export interface ResultadoFiltradoCatalogos {
  estrellas: EstrellaCalculada[];
  messier: MessierCalculado[];
  constelaciones: ConstelacionCalculada[];
  magnitudLimiteEfectiva: number;
}

export function filtrarCatalogos({
  estrellas,
  messier,
  constelaciones,
  magnitudLimiteVisible,
  filtros,
}: ParametrosFiltradoCatalogos): ResultadoFiltradoCatalogos {
  const magnitudLimiteEfectiva = calcularMagnitudLimiteEfectiva(
    magnitudLimiteVisible,
    filtros.instrumento
  );

  const estrellasFiltradas = estrellas
    .filter((est) => {
      if (filtros.soloPorEncimaHorizonte && est.altitud < 0) return false;
      return est.magnitud <= magnitudLimiteEfectiva;
    })
    .sort((a, b) => a.magnitud - b.magnitud || b.altitud - a.altitud);

  const messierFiltrados = messier
    .filter((obj) => {
      if (filtros.soloPorEncimaHorizonte && obj.altitud < 0) return false;
      if (!coincideFiltroTipoMessier(obj.tipo, filtros.tipo)) return false;
      if (filtros.instrumento !== 'Todos') {
        if (!esCompatibleConInstrumento(obj.instrumentoMinimo, filtros.instrumento)) {
          return false;
        }
        if (obj.magnitud > magnitudLimiteEfectiva) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => a.magnitud - b.magnitud || b.altitud - a.altitud);

  const constelacionesFiltradas = constelaciones
    .map((constelacion) => {
      if (!filtros.soloPorEncimaHorizonte) {
        return constelacion;
      }
      const segmentosVisibles = constelacion.segmentos.filter(
        (seg) => seg.desde.altitud >= 0 && seg.hasta.altitud >= 0
      );
      return {
        ...constelacion,
        segmentos: segmentosVisibles,
        visible: segmentosVisibles.length > 0,
      };
    })
    .filter((constelacion) => !filtros.soloPorEncimaHorizonte || constelacion.segmentos.length > 0)
    .sort((a, b) => b.centroAltitud - a.centroAltitud);

  return {
    estrellas: estrellasFiltradas,
    messier: messierFiltrados,
    constelaciones: constelacionesFiltradas,
    magnitudLimiteEfectiva,
  };
}

export interface ParametrosFiltrosCatalogo {
  ubicacion: Ubicacion;
  fecha: Date;
  magnitudLimiteVisible: number;
  filtros: FiltrosCatalogo;
}

export interface ResultadoFiltrosCatalogo {
  estrellas: EstrellaCalculada[];
  messier: MessierCalculado[];
  constelaciones: ConstelacionCalculada[];
  estrellasCompletas: EstrellaCalculada[];
  messierCompletos: MessierCalculado[];
  constelacionesCompletas: ConstelacionCalculada[];
  magnitudLimiteEfectiva: number;
  totalMessierSobreHorizonte: number;
}

export function useFiltrosCatalogo({
  ubicacion,
  fecha,
  magnitudLimiteVisible,
  filtros,
}: ParametrosFiltrosCatalogo): ResultadoFiltrosCatalogo {
  const catalogosCalculados = useMemo(() => {
    const estrellasCompletas = calcularEstrellas(fecha, ubicacion);
    const messierCompletos = calcularMessier(fecha, ubicacion);
    const constelacionesCompletas = calcularConstelaciones(fecha, ubicacion);
    return {
      estrellasCompletas,
      messierCompletos,
      constelacionesCompletas,
    };
  }, [fecha, ubicacion]);

  const resultadoFiltrado = useMemo(() => {
    const filtrado = filtrarCatalogos({
      estrellas: catalogosCalculados.estrellasCompletas,
      messier: catalogosCalculados.messierCompletos,
      constelaciones: catalogosCalculados.constelacionesCompletas,
      magnitudLimiteVisible,
      filtros,
    });

    const totalMessierSobreHorizonte = catalogosCalculados.messierCompletos.reduce(
      (acum, obj) => (obj.altitud >= 0 ? acum + 1 : acum),
      0
    );

    return {
      ...filtrado,
      totalMessierSobreHorizonte,
    };
  }, [catalogosCalculados, magnitudLimiteVisible, filtros]);

  return {
    estrellas: resultadoFiltrado.estrellas,
    messier: resultadoFiltrado.messier,
    constelaciones: resultadoFiltrado.constelaciones,
    estrellasCompletas: catalogosCalculados.estrellasCompletas,
    messierCompletos: catalogosCalculados.messierCompletos,
    constelacionesCompletas: catalogosCalculados.constelacionesCompletas,
    magnitudLimiteEfectiva: resultadoFiltrado.magnitudLimiteEfectiva,
    totalMessierSobreHorizonte: resultadoFiltrado.totalMessierSobreHorizonte,
  };
}
