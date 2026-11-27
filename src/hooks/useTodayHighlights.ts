import { useCallback, useEffect, useState } from 'react';
import { calcularCielo } from '../core/skyCalculator';
import { calcularProximosEventos } from '../core/eventsCalculator';
import type {
  CondicionesMeteo,
  DailyHighlightItem,
  EscalaBortle,
  GeoCoordinates,
  LunarData,
  TodayHighlightsState,
  Ubicacion,
} from '../types/astronomy';
import {
  TEXTO_SIN_OCASO,
  TEXTO_SIN_ORTO,
  calcularDatosLunares,
  calcularEfemeridesSolaresDia,
  esGeoCoordinatesValido,
  formatearHoraEnZona,
  obtenerComponentesDiaCivil,
} from '../utils/lunarCalculations';

const MAX_HIGHLIGHTS = 4;
const MS_24_HORAS = 24 * 60 * 60 * 1000;

export interface UseTodayHighlightsOptions {
  referenceDate?: Date;
  altitudeMeters?: number;
  bortle?: EscalaBortle;
  meteo?: CondicionesMeteo | null;
  /**
   * Proveedor asíncrono opcional para enriquecer destacados con efemérides externas.
   * Recibe la `AbortSignal` activa para cancelar peticiones obsoletas al cambiar de ubicación.
   */
  fetchExternalHighlights?: (
    coordinates: GeoCoordinates,
    signal: AbortSignal
  ) => Promise<DailyHighlightItem[]>;
}

export interface UseTodayHighlightsResult extends TodayHighlightsState {
  refetch: () => void;
}

interface EstadoInternoHighlights {
  clave: string;
  items: DailyHighlightItem[];
  error: string | null;
  lastUpdated: Date | null;
}

function esErrorAbort(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function crearUbicacionDesdeCoords(
  coordinates: GeoCoordinates,
  altitudeMeters = 0,
  bortle?: EscalaBortle
): Ubicacion {
  const altitudSegura = Number.isFinite(altitudeMeters)
    ? Math.max(-500, Math.min(9000, altitudeMeters))
    : 0;
  return {
    latitud: coordinates.latitude,
    longitud: coordinates.longitude,
    altitud: altitudSegura,
    nombre: coordinates.name ?? 'Ubicación activa',
    bortle,
    timezone: coordinates.timezone,
  };
}

function describirOrtoOcasoLunar(lunarData: LunarData, timezone: string): string {
  const orto =
    lunarData.moonrise !== null
      ? `Orto ${formatearHoraEnZona(lunarData.moonrise, timezone, TEXTO_SIN_ORTO)}`
      : TEXTO_SIN_ORTO;
  const ocaso =
    lunarData.moonset !== null
      ? `Ocaso ${formatearHoraEnZona(lunarData.moonset, timezone, TEXTO_SIN_OCASO)}`
      : TEXTO_SIN_OCASO;
  return `${orto} · ${ocaso}`;
}

function construirDestacadoLunar(
  lunarData: LunarData,
  fechaRef: Date,
  timezone: string
): DailyHighlightItem {
  const iluminacionRedondeada = Math.round(lunarData.illumination);
  const msHastaLlena = lunarData.nextFullMoon.getTime() - fechaRef.getTime();
  const msHastaNueva = lunarData.nextNewMoon.getTime() - fechaRef.getTime();
  const horasHastaLlena = msHastaLlena / 3_600_000;
  const horasHastaNueva = msHastaNueva / 3_600_000;
  const resumenOrtoOcaso = describirOrtoOcasoLunar(lunarData, timezone);

  if (lunarData.illumination >= 95 || (msHastaLlena >= 0 && msHastaLlena <= MS_24_HORAS)) {
    const esInminente = msHastaLlena >= 0 && msHastaLlena <= MS_24_HORAS;
    const horaLlena = formatearHoraEnZona(lunarData.nextFullMoon, timezone);
    return {
      id: 'lunar-hito-llena',
      category: 'lunar',
      title: esInminente ? 'Luna Llena en las próximas 24 h' : 'Luna Llena brillante hoy',
      subtitle: `${lunarData.phaseName} (${iluminacionRedondeada}%) · ${
        esInminente ? `Plenilunio a las ${horaLlena} · ` : ''
      }${resumenOrtoOcaso}`,
      timestamp: esInminente ? lunarData.nextFullMoon : (lunarData.moonrise ?? undefined),
      priority: 1,
      badgeText: `Ilum. ${iluminacionRedondeada}%`,
    };
  }

  if (lunarData.illumination <= 5 || (msHastaNueva >= 0 && msHastaNueva <= MS_24_HORAS)) {
    const esInminente = msHastaNueva >= 0 && msHastaNueva <= MS_24_HORAS;
    const horaNueva = formatearHoraEnZona(lunarData.nextNewMoon, timezone);
    return {
      id: 'lunar-hito-nueva',
      category: 'lunar',
      title: 'Luna Nueva: cielo sin brillo lunar',
      subtitle: `Ideal para cielo profundo (${iluminacionRedondeada}%)${
        esInminente ? ` · Novilunio ${horaNueva}` : ''
      } · ${resumenOrtoOcaso}`,
      timestamp: esInminente ? lunarData.nextNewMoon : undefined,
      priority: 1,
      badgeText: `Edad ${lunarData.ageDays.toFixed(1)} d`,
    };
  }

  const prioridadLunar: 1 | 2 | 3 =
    horasHastaLlena <= 48 || horasHastaNueva <= 48 ? 2 : 3;

  return {
    id: 'lunar-fase-hoy',
    category: 'lunar',
    title: `${lunarData.phaseName} (${iluminacionRedondeada}%)`,
    subtitle: `Edad lunar ${lunarData.ageDays.toFixed(1)} días · ${resumenOrtoOcaso}`,
    timestamp: lunarData.moonrise ?? lunarData.moonset ?? undefined,
    priority: prioridadLunar,
    badgeText: `Ilum. ${iluminacionRedondeada}%`,
  };
}

/**
 * Genera de forma pura y determinista los destacados astronómicos del día civil
 * para la ubicación y zona horaria activas, ordenados por prioridad (1 -> 3)
 * y garantizando que el resultado nunca quede vacío.
 */
export function generarDestacadosDeHoy(
  coordinates: GeoCoordinates,
  lunarDataEntrada: LunarData | null,
  options?: Pick<UseTodayHighlightsOptions, 'referenceDate' | 'altitudeMeters' | 'bortle' | 'meteo'>
): DailyHighlightItem[] {
  if (!esGeoCoordinatesValido(coordinates)) {
    return [];
  }

  const fechaRef =
    options?.referenceDate instanceof Date && !Number.isNaN(options.referenceDate.getTime())
      ? new Date(options.referenceDate.getTime())
      : new Date();

  const altitud = options?.altitudeMeters ?? 0;
  const ubicacion = crearUbicacionDesdeCoords(coordinates, altitud, options?.bortle);
  const lunarData = lunarDataEntrada ?? calcularDatosLunares(fechaRef, coordinates, altitud);
  const solares = calcularEfemeridesSolaresDia(fechaRef, coordinates, altitud);
  const candidatos: DailyHighlightItem[] = [];

  // 1. Eventos celestes activos hoy o inminentes (lluvias de meteoros y eclipses)
  const eventos = calcularProximosEventos(fechaRef, ubicacion);
  for (const evento of eventos) {
    if (evento.diasRestantes < 0 || evento.diasRestantes > 3) continue;
    const esHoy = evento.diasRestantes === 0;
    const categoria: DailyHighlightItem['category'] =
      evento.tipo === 'lluvia'
        ? 'meteor'
        : evento.titulo.toLowerCase().includes('lunar')
          ? 'lunar'
          : 'solar';

    candidatos.push({
      id: `evento-${evento.id}`,
      category: categoria,
      title: evento.titulo,
      subtitle: `${evento.resumen} · ${evento.detalle}`,
      timestamp: evento.fechaPico,
      priority: esHoy ? 1 : 2,
      badgeText: esHoy
        ? '¡Hoy!'
        : evento.diasRestantes === 1
          ? 'Mañana'
          : `En ${evento.diasRestantes} días`,
    });
  }

  // 2. Hito o estado lunar del día
  if (lunarData) {
    candidatos.push(construirDestacadoLunar(lunarData, fechaRef, coordinates.timezone));
  }

  // 3. Ventana óptima de observación nocturna (crepúsculo astronómico + Luna + nubes)
  if (solares) {
    const nubes = options?.meteo?.nubesTotal;
    const cieloDespejado = nubes === undefined || nubes <= 30;
    const lunaSuave = !lunarData || lunarData.illumination <= 35;

    if (solares.esDiaPolar) {
      candidatos.push({
        id: 'visibilidad-dia-polar',
        category: 'visibility',
        title: 'Sol de medianoche (sin ocaso hoy)',
        subtitle: `${TEXTO_SIN_OCASO} · Observación solar segura con filtro certificado y seguimiento diurno.`,
        priority: 2,
        badgeText: 'Día polar',
      });
    } else if (solares.esNochePolar) {
      candidatos.push({
        id: 'visibilidad-noche-polar',
        category: 'visibility',
        title: 'Noche polar continua para cielo profundo',
        subtitle: `${TEXTO_SIN_ORTO} · Oscuridad prolongada durante las 24 h${
          nubes !== undefined ? ` · Nubes ${nubes}%` : ''
        }.`,
        priority: lunaSuave && cieloDespejado ? 1 : 2,
        badgeText: 'Noche polar',
      });
    } else if (solares.crepusculoAstronomicoInicio) {
      const inicioNoche = formatearHoraEnZona(
        solares.crepusculoAstronomicoInicio,
        coordinates.timezone
      );
      const finNoche = solares.crepusculoAstronomicoFin
        ? formatearHoraEnZona(solares.crepusculoAstronomicoFin, coordinates.timezone)
        : null;
      const esOptima = lunaSuave && cieloDespejado;
      const detalleMeteo = nubes !== undefined ? ` · Nubosidad ${nubes}%` : '';
      const detalleLunar = lunarData
        ? ` · Luna ${Math.round(lunarData.illumination)}%`
        : '';

      candidatos.push({
        id: 'visibilidad-ventana-nocturna',
        category: 'visibility',
        title: esOptima
          ? 'Ventana óptima de cielo profundo'
          : 'Ventana de noche astronómica',
        subtitle: `Oscuridad desde las ${inicioNoche}${
          finNoche ? ` (fin ${finNoche})` : ''
        }${detalleLunar}${detalleMeteo}`,
        timestamp: solares.crepusculoAstronomicoInicio,
        priority: esOptima ? 1 : 2,
        badgeText: esOptima ? 'Óptima' : 'Noche astr.',
      });
    } else {
      const textoOcaso =
        solares.atardecer !== null
          ? `Ocaso ${formatearHoraEnZona(solares.atardecer, coordinates.timezone, TEXTO_SIN_OCASO)}`
          : TEXTO_SIN_OCASO;
      candidatos.push({
        id: 'visibilidad-noches-blancas',
        category: 'visibility',
        title: 'Crepúsculo persistente en alta latitud',
        subtitle: `${textoOcaso} · El Sol no desciende bajo -18° hoy; prioriza Luna y planetas brillantes.`,
        timestamp: solares.atardecer ?? undefined,
        priority: 2,
        badgeText: 'Alta latitud',
      });
    }

    // 4. Horas dorada y azul (garantiza valor útil incluso en días tranquilos)
    if (!solares.esDiaPolar && !solares.esNochePolar && (solares.horaDoradaInicio || solares.atardecer)) {
      const horaDorada = solares.horaDoradaInicio
        ? formatearHoraEnZona(solares.horaDoradaInicio, coordinates.timezone)
        : null;
      const horaOcaso =
        solares.atardecer !== null
          ? formatearHoraEnZona(solares.atardecer, coordinates.timezone, TEXTO_SIN_OCASO)
          : TEXTO_SIN_OCASO;
      const horaAzul = solares.horaAzulInicio
        ? formatearHoraEnZona(solares.horaAzulInicio, coordinates.timezone)
        : null;

      const partesSol: string[] = [];
      if (horaDorada) partesSol.push(`Dorada ${horaDorada}`);
      partesSol.push(solares.atardecer ? `Ocaso ${horaOcaso}` : TEXTO_SIN_OCASO);
      if (horaAzul) partesSol.push(`Azul ${horaAzul}`);

      candidatos.push({
        id: 'solar-horas-crepusculo',
        category: 'solar',
        title: 'Hora dorada y hora azul',
        subtitle: partesSol.join(' · '),
        timestamp: solares.horaDoradaInicio ?? solares.atardecer ?? undefined,
        priority: 3,
        badgeText: 'Crepúsculo',
      });
    }
  }

  // 5. Planeta más brillante visible ahora o en la ventana nocturna de hoy
  const instantePlanetas = solares?.crepusculoAstronomicoInicio ?? solares?.atardecer ?? fechaRef;
  const cuerposActuales = calcularCielo(fechaRef, ubicacion);
  const planetasVisiblesAhora = cuerposActuales.filter(
    (c) => c.tipo === 'planeta' && c.altitud > 5
  );
  const poolPlanetas =
    planetasVisiblesAhora.length > 0
      ? planetasVisiblesAhora
      : calcularCielo(instantePlanetas, ubicacion).filter(
          (c) => c.tipo === 'planeta' && c.altitud > 5
        );

  if (poolPlanetas.length > 0) {
    const planetaDestacado = [...poolPlanetas].sort((a, b) => a.magnitud - b.magnitud)[0];
    const esAhora = planetasVisiblesAhora.length > 0;
    const esMuyBrillante = planetaDestacado.magnitud <= -1.0 && planetaDestacado.altitud >= 15;

    candidatos.push({
      id: `planeta-${planetaDestacado.id.toLowerCase()}`,
      category: 'planetary',
      title: `${planetaDestacado.nombre} destacado ${esAhora ? 'ahora' : 'esta noche'}`,
      subtitle: `Mag ${planetaDestacado.magnitud.toFixed(1)} · Altitud ${planetaDestacado.altitud}° · Rumbo ${planetaDestacado.direccion} (${planetaDestacado.acimut}°)${
        !esAhora
          ? ` a las ${formatearHoraEnZona(instantePlanetas, coordinates.timezone)}`
          : ''
      }`,
      timestamp: esAhora ? fechaRef : instantePlanetas,
      priority: esMuyBrillante ? 2 : 3,
      badgeText: `Mag ${planetaDestacado.magnitud.toFixed(1)}`,
    });
  }

  // Orden estricto por prioridad (1 = máxima relevancia hoy) y deduplicación por id
  const vistos = new Set<string>();
  const ordenados = candidatos
    .sort((a, b) => a.priority - b.priority)
    .filter((item) => {
      if (vistos.has(item.id)) return false;
      vistos.add(item.id);
      return true;
    });

  return ordenados.slice(0, MAX_HIGHLIGHTS);
}

/**
 * Ejecuta la agregación asíncrona de destacados con soporte de cancelación vía `AbortSignal`.
 * Evita condiciones de carrera cuando el usuario cambia rápidamente de ciudad o zona horaria.
 */
export async function cargarDestacadosDeHoyAsync(
  coordinates: GeoCoordinates,
  lunarData: LunarData | null,
  options: UseTodayHighlightsOptions | undefined,
  signal: AbortSignal
): Promise<DailyHighlightItem[]> {
  if (signal.aborted) {
    throw new DOMException('Cálculo de destacados cancelado', 'AbortError');
  }

  if (!esGeoCoordinatesValido(coordinates)) {
    throw new Error('Coordenadas o zona horaria inválidas.');
  }

  // Cede un turno al bucle de eventos para permitir cancelación limpia ante cambios rápidos
  await Promise.resolve();
  if (signal.aborted) {
    throw new DOMException('Cálculo de destacados cancelado', 'AbortError');
  }

  const base = generarDestacadosDeHoy(coordinates, lunarData, options);

  if (!options?.fetchExternalHighlights) {
    return base;
  }

  const externos = await options.fetchExternalHighlights(coordinates, signal);
  if (signal.aborted) {
    throw new DOMException('Cálculo de destacados cancelado', 'AbortError');
  }

  const combinados = [...externos, ...base].sort((a, b) => a.priority - b.priority);
  const vistos = new Set<string>();
  const resultado: DailyHighlightItem[] = [];
  for (const item of combinados) {
    if (vistos.has(item.id)) continue;
    vistos.add(item.id);
    resultado.push(item);
    if (resultado.length >= MAX_HIGHLIGHTS) break;
  }
  return resultado;
}

/**
 * Hook de agregación para el widget "Destacados de hoy".
 * Recalcula ante cambios de ubicación/zona horaria o fase lunar y cancela peticiones previas con `AbortController`.
 */
export function useTodayHighlights(
  coordinates: GeoCoordinates,
  lunarData: LunarData | null,
  options?: UseTodayHighlightsOptions
): UseTodayHighlightsResult {
  const [refetchNonce, setRefetchNonce] = useState(0);
  const [estado, setEstado] = useState<EstadoInternoHighlights>({
    clave: '',
    items: [],
    error: null,
    lastUpdated: null,
  });

  const fechaRefValida =
    options?.referenceDate instanceof Date && !Number.isNaN(options.referenceDate.getTime())
      ? options.referenceDate
      : null;

  const { claveDiaCivil } = obtenerComponentesDiaCivil(
    fechaRefValida ?? new Date(),
    coordinates.timezone
  );

  // Precisión por cuarto de hora para evitar recálculos excesivos durante time-lapse
  const bloqueTemporal =
    fechaRefValida !== null ? Math.floor(fechaRefValida.getTime() / (15 * 60_000)) : 'hoy';

  const lunarClave = lunarData
    ? `${lunarData.phaseName}|${Math.round(lunarData.illumination)}|${
        lunarData.moonrise?.getTime() ?? 'null'
      }|${lunarData.moonset?.getTime() ?? 'null'}`
    : 'sin-luna';

  const altitudeMeters = options?.altitudeMeters ?? 0;
  const bortle = options?.bortle;
  const nubesTotal = options?.meteo?.nubesTotal;
  const fetchExternalHighlights = options?.fetchExternalHighlights;

  const claveConsulta = [
    coordinates.latitude.toFixed(4),
    coordinates.longitude.toFixed(4),
    coordinates.timezone,
    claveDiaCivil,
    String(bloqueTemporal),
    lunarClave,
    String(altitudeMeters),
    String(bortle ?? ''),
    String(nubesTotal ?? ''),
    String(refetchNonce),
  ].join('|');

  useEffect(() => {
    const controller = new AbortController();

    const fechaEjecucion = fechaRefValida ? new Date(fechaRefValida.getTime()) : new Date();
    const opcionesEjecucion: UseTodayHighlightsOptions = {
      referenceDate: fechaEjecucion,
      altitudeMeters,
      bortle,
      meteo: options?.meteo,
      fetchExternalHighlights,
    };

    cargarDestacadosDeHoyAsync(coordinates, lunarData, opcionesEjecucion, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setEstado({
          clave: claveConsulta,
          items,
          error: null,
          lastUpdated: new Date(),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || esErrorAbort(error)) return;
        const mensaje =
          error instanceof Error && error.message
            ? error.message
            : 'No se pudieron calcular los destacados astronómicos de hoy.';
        setEstado({
          clave: claveConsulta,
          items: [],
          error: mensaje,
          lastUpdated: null,
        });
      });

    return () => {
      controller.abort();
    };
    // Dependencias estables encapsuladas en claveConsulta + callbacks/referencias relevantes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConsulta, fetchExternalHighlights]);

  const refetch = useCallback(() => {
    setRefetchNonce((prev) => prev + 1);
  }, []);

  const isLoading = estado.clave !== claveConsulta;

  return {
    items: isLoading ? [] : estado.items,
    isLoading,
    error: isLoading ? null : estado.error,
    lastUpdated: isLoading ? null : estado.lastUpdated,
    refetch,
  };
}
