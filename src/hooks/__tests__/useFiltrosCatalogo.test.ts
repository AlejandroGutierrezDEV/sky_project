import { describe, expect, it } from 'vitest';
import {
  FILTROS_CATALOGO_POR_DEFECTO,
  calcularMagnitudLimiteEfectiva,
  coincideFiltroTipoMessier,
  esCompatibleConInstrumento,
  filtrarCatalogos,
} from '../useFiltrosCatalogo';
import type {
  ConstelacionCalculada,
  EstrellaCalculada,
  MessierCalculado,
} from '../../types/astronomy';

const ESTRELLAS_MUESTRA: EstrellaCalculada[] = [
  { id: 'Alp CMa', nombre: 'Sirio', magnitud: -1.46, raHoras: 6.75, decGrados: -16.7, altitud: 32, acimut: 180, visible: true },
  { id: 'Alp Ori', nombre: 'Betelgeuse', magnitud: 0.42, raHoras: 5.92, decGrados: 7.4, altitud: 45, acimut: 170, visible: true },
  { id: 'Gam Ori', nombre: 'Bellatrix', magnitud: 1.64, raHoras: 5.42, decGrados: 6.3, altitud: 44, acimut: 175, visible: true },
  { id: 'Tau Ori', magnitud: 3.59, raHoras: 5.29, decGrados: -6.8, altitud: 28, acimut: 190, visible: true },
  { id: 'Eta Car', magnitud: 4.0, raHoras: 10.7, decGrados: -59.6, altitud: -12, acimut: 180, visible: false },
];

const MESSIER_MUESTRA: MessierCalculado[] = [
  {
    id: 'M31',
    nombreNGC: 'NGC 224',
    nombreComun: 'Galaxia de Andrómeda',
    tipo: 'Galaxia',
    magnitud: 3.4,
    raHoras: 0.71,
    decGrados: 41.27,
    constelacionIAU: 'AND',
    instrumentoMinimo: 'Ojo desnudo',
    tamanoArcmin: '178×63',
    altitud: 50,
    acimut: 290,
    visible: true,
  },
  {
    id: 'M13',
    nombreNGC: 'NGC 6205',
    nombreComun: 'Gran Cúmulo de Hércules',
    tipo: 'CumuloGlobular',
    magnitud: 5.8,
    raHoras: 16.7,
    decGrados: 36.46,
    constelacionIAU: 'HER',
    instrumentoMinimo: 'Ojo desnudo',
    tamanoArcmin: '20',
    altitud: 38,
    acimut: 95,
    visible: true,
  },
  {
    id: 'M45',
    nombreNGC: 'Mel 22',
    nombreComun: 'Las Pléyades',
    tipo: 'CumuloAbierto',
    magnitud: 1.6,
    raHoras: 3.78,
    decGrados: 24.12,
    constelacionIAU: 'TAU',
    instrumentoMinimo: 'Ojo desnudo',
    tamanoArcmin: '110',
    altitud: 60,
    acimut: 220,
    visible: true,
  },
  {
    id: 'M1',
    nombreNGC: 'NGC 1952',
    nombreComun: 'Nebulosa del Cangrejo',
    tipo: 'RemanenteSupernova',
    magnitud: 8.4,
    raHoras: 5.58,
    decGrados: 22.01,
    constelacionIAU: 'TAU',
    instrumentoMinimo: 'Prismaticos',
    tamanoArcmin: '6×4',
    altitud: 42,
    acimut: 160,
    visible: true,
  },
  {
    id: 'M57',
    nombreNGC: 'NGC 6720',
    nombreComun: 'Nebulosa del Anillo',
    tipo: 'Nebulosa',
    magnitud: 8.8,
    raHoras: 18.89,
    decGrados: 33.03,
    constelacionIAU: 'LYR',
    instrumentoMinimo: 'Telescopio',
    tamanoArcmin: '1.4×1.0',
    altitud: 35,
    acimut: 75,
    visible: true,
  },
  {
    id: 'M7',
    nombreNGC: 'NGC 6475',
    nombreComun: 'Cúmulo de Ptolomeo',
    tipo: 'CumuloAbierto',
    magnitud: 3.3,
    raHoras: 17.9,
    decGrados: -34.79,
    constelacionIAU: 'SCO',
    instrumentoMinimo: 'Ojo desnudo',
    tamanoArcmin: '80',
    altitud: -8,
    acimut: 170,
    visible: false,
  },
];

const CONSTELACIONES_MUESTRA: ConstelacionCalculada[] = [
  {
    codigo: 'ORI',
    nombreEs: 'Orión',
    nombreLatin: 'Orion',
    estacion: 'Invierno',
    segmentos: [
      { desde: { altitud: 45, acimut: 170 }, hasta: { altitud: 44, acimut: 175 } },
      { desde: { altitud: 12, acimut: 165 }, hasta: { altitud: -4, acimut: 160 } },
    ],
    centroAltitud: 35,
    centroAcimut: 172,
    visible: true,
  },
  {
    codigo: 'CRU',
    nombreEs: 'Cruz del Sur',
    nombreLatin: 'Crux',
    estacion: 'Primavera',
    segmentos: [
      { desde: { altitud: -20, acimut: 180 }, hasta: { altitud: -25, acimut: 182 } },
    ],
    centroAltitud: -22,
    centroAcimut: 181,
    visible: false,
  },
];

describe('useFiltrosCatalogo (funciones puras de filtrado)', () => {
  it('agrupa correctamente Cumulo (globular + abierto) y Nebulosa (nebulosa + remanente supernova)', () => {
    expect(coincideFiltroTipoMessier('CumuloGlobular', 'Cumulo')).toBe(true);
    expect(coincideFiltroTipoMessier('CumuloAbierto', 'Cumulo')).toBe(true);
    expect(coincideFiltroTipoMessier('Galaxia', 'Cumulo')).toBe(false);

    expect(coincideFiltroTipoMessier('Nebulosa', 'Nebulosa')).toBe(true);
    expect(coincideFiltroTipoMessier('RemanenteSupernova', 'Nebulosa')).toBe(true);
    expect(coincideFiltroTipoMessier('Asterismo', 'Nebulosa')).toBe(false);
    expect(coincideFiltroTipoMessier('Asterismo', 'Todos')).toBe(true);
  });

  it('calcula la magnitud límite efectiva sumando la ganancia de cada instrumento a Bortle/Luna', () => {
    expect(calcularMagnitudLimiteEfectiva(4.5, 'Todos')).toBe(4.5);
    expect(calcularMagnitudLimiteEfectiva(4.5, 'Ojo desnudo')).toBe(4.5);
    expect(calcularMagnitudLimiteEfectiva(4.5, 'Prismaticos')).toBe(7.5);
    expect(calcularMagnitudLimiteEfectiva(4.5, 'Telescopio')).toBe(10.0);
    expect(calcularMagnitudLimiteEfectiva(Number.NaN, 'Prismaticos')).toBe(9.0);
  });

  it('respeta la jerarquía acumulativa de instrumentos', () => {
    expect(esCompatibleConInstrumento('Ojo desnudo', 'Ojo desnudo')).toBe(true);
    expect(esCompatibleConInstrumento('Prismaticos', 'Ojo desnudo')).toBe(false);
    expect(esCompatibleConInstrumento('Ojo desnudo', 'Prismaticos')).toBe(true);
    expect(esCompatibleConInstrumento('Telescopio', 'Prismaticos')).toBe(false);
    expect(esCompatibleConInstrumento('Telescopio', 'Telescopio')).toBe(true);
  });

  it('descarta astros y segmentos bajo el horizonte cuando soloPorEncimaHorizonte está activo', () => {
    const res = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 6.0,
      filtros: FILTROS_CATALOGO_POR_DEFECTO,
    });

    expect(res.estrellas.every((e) => e.altitud >= 0)).toBe(true);
    expect(res.estrellas.map((e) => e.id)).toEqual(['Alp CMa', 'Alp Ori', 'Gam Ori', 'Tau Ori']);
    expect(res.messier.some((m) => m.id === 'M7')).toBe(false);
    expect(res.constelaciones).toHaveLength(1);
    expect(res.constelaciones[0].codigo).toBe('ORI');
    // Conserva tanto segmentos sobre el horizonte como los que lo cruzan para recorte exacto en alt = 0
    expect(res.constelaciones[0].segmentos).toHaveLength(2);
  });

  it('no descarta estrellas ni objetos Messier por magnitud límite de equipo cuando instrumento es Todos', () => {
    const res = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 2.0,
      filtros: {
        tipo: 'Todos',
        instrumento: 'Todos',
        soloPorEncimaHorizonte: true,
      },
    });

    // Con instrumento 'Todos', Tau Ori (mag 3.59) y M57 (mag 8.8) no deben descartarse por magnitud límite
    expect(res.estrellas.map((e) => e.id)).toEqual(['Alp CMa', 'Alp Ori', 'Gam Ori', 'Tau Ori']);
    expect(res.messier.map((m) => m.id)).toEqual(['M45', 'M31', 'M13', 'M1', 'M57']);
  });

  it('combina instrumento con magnitudLimiteVisible (Bortle/Luna) y devuelve 0 resultados ante filtros restrictivos', () => {
    // En cielo urbano con Luna (NELM 4.1), a ojo desnudo solo M31 (3.4) y M45 (1.6) pasan; M13 (5.8) queda fuera
    const resOjo = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 4.1,
      filtros: {
        tipo: 'Todos',
        instrumento: 'Ojo desnudo',
        soloPorEncimaHorizonte: true,
      },
    });
    expect(resOjo.magnitudLimiteEfectiva).toBe(4.1);
    expect(resOjo.messier.map((m) => m.id)).toEqual(['M45', 'M31']);

    // Con prismáticos en el mismo cielo (4.1 + 3.0 = 7.1), M13 (5.8) entra pero M1 (8.4) sigue fuera
    const resPrismaticos = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 4.1,
      filtros: {
        tipo: 'Todos',
        instrumento: 'Prismaticos',
        soloPorEncimaHorizonte: true,
      },
    });
    expect(resPrismaticos.magnitudLimiteEfectiva).toBe(7.1);
    expect(resPrismaticos.messier.map((m) => m.id)).toEqual(['M45', 'M31', 'M13']);

    // Con telescopio (4.1 + 5.5 = 9.6) y filtro Nebulosa, entran M1 (RemanenteSupernova) y M57 (Nebulosa)
    const resNebulosasTelescopio = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 4.1,
      filtros: {
        tipo: 'Nebulosa',
        instrumento: 'Telescopio',
        soloPorEncimaHorizonte: true,
      },
    });
    expect(resNebulosasTelescopio.messier.map((m) => m.id)).toEqual(['M1', 'M57']);

    // Nebulosa a ojo desnudo con cielo muy pobre (NELM 3.0) devuelve 0 resultados (estado vacío)
    const resVacio = filtrarCatalogos({
      estrellas: ESTRELLAS_MUESTRA,
      messier: MESSIER_MUESTRA,
      constelaciones: CONSTELACIONES_MUESTRA,
      magnitudLimiteVisible: 3.0,
      filtros: {
        tipo: 'Nebulosa',
        instrumento: 'Ojo desnudo',
        soloPorEncimaHorizonte: true,
      },
    });
    expect(resVacio.messier).toHaveLength(0);
  });
});
