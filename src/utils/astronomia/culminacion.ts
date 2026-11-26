import * as Astronomy from 'astronomy-engine';
import type {
  EstadoVisibilidadObjetivo,
  ObjetivoPlanificado,
} from '../../types/astronomy';

const RAZON_SIDEREO_A_SOLAR = 23.934469591898 / 24;
const DIA_SIDEREO_MS = 23.934469591898 * 3_600_000;
const MS_POR_HORA = 3_600_000;
const UMBRALES_NOCHE_GRADOS = [-18, -12, -6, 0] as const;

export interface VentanaNocturna {
  inicio: Date;
  fin: Date;
}

export interface ResultadoCulminacionAstro {
  horaCulminacion: Date | null;
  altitudMaximaGrados: number;
  estadoVisibilidad: EstadoVisibilidadObjetivo;
  etiquetaHoraria: string;
}

function normalizarHoras24(horas: number): number {
  return ((horas % 24) + 24) % 24;
}

function diferenciaHorasCorta(objetivoHoras: number, referenciaHoras: number): number {
  return ((((objetivoHoras - referenciaHoras + 12) % 24) + 24) % 24) - 12;
}

function formatearHoraCorta(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Calcula el Tiempo Sidéreo Local (LST) en horas [0, 24) para una fecha y longitud dadas.
 */
export function calcularTiempoSidereoLocal(fecha: Date, longitud: number): number {
  const gastHoras = Astronomy.SiderealTime(fecha);
  return normalizarHoras24(gastHoras + longitud / 15);
}

/**
 * Calcula la altitud teórica sobre el horizonte (en grados) dado RA, Dec, latitud y LST.
 */
function calcularAltitudDesdeLST(
  raHoras: number,
  decGrados: number,
  latitud: number,
  lstHoras: number
): number {
  const haRad = (normalizarHoras24(lstHoras - raHoras) * 15 * Math.PI) / 180;
  const latRad = (latitud * Math.PI) / 180;
  const decRad = (decGrados * Math.PI) / 180;
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const sinClampeado = Math.max(-1, Math.min(1, sinAlt));
  return (Math.asin(sinClampeado) * 180) / Math.PI;
}

/**
 * Determina la ventana nocturna (ocaso -> orto astronómico) relevante para la fecha de referencia.
 * Si en latitudes altas el Sol no alcanza -18°, degrada progresivamente a crepúsculo náutico,
 * civil, horizonte o ventana solar nocturna de respaldo (21:00–05:00 solar local).
 */
export function calcularVentanaNocturna(
  latitud: number,
  longitud: number,
  fechaReferencia: Date
): VentanaNocturna {
  const observador = new Astronomy.Observer(latitud, longitud, 0);

  let altitudSolActual = 10;
  try {
    const eqSol = Astronomy.Equator(Astronomy.Body.Sun, fechaReferencia, observador, true, true);
    const horSol = Astronomy.Horizon(fechaReferencia, observador, eqSol.ra, eqSol.dec, 'normal');
    altitudSolActual = horSol.altitude;
  } catch {
    // Mantiene valor de respaldo diurno
  }

  for (const umbral of UMBRALES_NOCHE_GRADOS) {
    try {
      let inicio: Date | null = null;
      let fin: Date | null = null;

      if (altitudSolActual < umbral) {
        // Ya estamos dentro de la ventana nocturna: buscar ocaso previo y orto siguiente
        const inicioBusqueda = new Date(fechaReferencia.getTime() - 24 * MS_POR_HORA);
        let candidatoOcaso = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          -1,
          inicioBusqueda,
          1.2,
          umbral
        );
        // Asegura tomar el último ocaso <= fechaReferencia
        while (candidatoOcaso && candidatoOcaso.date.getTime() <= fechaReferencia.getTime()) {
          inicio = candidatoOcaso.date;
          const siguienteBase = new Date(candidatoOcaso.date.getTime() + 60_000);
          const siguiente = Astronomy.SearchAltitude(
            Astronomy.Body.Sun,
            observador,
            -1,
            siguienteBase,
            1.2,
            umbral
          );
          if (!siguiente || siguiente.date.getTime() > fechaReferencia.getTime()) {
            break;
          }
          candidatoOcaso = siguiente;
        }

        const eventoOrto = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          +1,
          fechaReferencia,
          1.2,
          umbral
        );
        if (eventoOrto) {
          fin = eventoOrto.date;
        }
      } else {
        // Estamos fuera de la ventana nocturna: buscar próximo ocaso y su orto posterior
        const eventoOcaso = Astronomy.SearchAltitude(
          Astronomy.Body.Sun,
          observador,
          -1,
          fechaReferencia,
          1.2,
          umbral
        );
        if (eventoOcaso) {
          inicio = eventoOcaso.date;
          const eventoOrto = Astronomy.SearchAltitude(
            Astronomy.Body.Sun,
            observador,
            +1,
            new Date(inicio.getTime() + 60_000),
            1.2,
            umbral
          );
          if (eventoOrto) {
            fin = eventoOrto.date;
          }
        }
      }

      if (inicio && fin && fin.getTime() > inicio.getTime()) {
        return { inicio, fin };
      }
    } catch {
      // Intenta el siguiente umbral de crepúsculo
    }
  }

  // Respaldo para sol de medianoche o noche polar continua: ventana de 8h centrada en medianoche solar
  const horaSolarLocal = normalizarHoras24(
    fechaReferencia.getUTCHours() +
      fechaReferencia.getUTCMinutes() / 60 +
      fechaReferencia.getUTCSeconds() / 3600 +
      longitud / 15
  );
  const horasHastaMedianoche =
    horaSolarLocal < 6 ? -horaSolarLocal : 24 - horaSolarLocal;
  const medianocheSolarMs = fechaReferencia.getTime() + horasHastaMedianoche * MS_POR_HORA;

  return {
    inicio: new Date(medianocheSolarMs - 4 * MS_POR_HORA),
    fin: new Date(medianocheSolarMs + 4 * MS_POR_HORA),
  };
}

/**
 * Calcula la hora exacta de tránsito por el meridiano local (HA = 0) a partir del LST,
 * su altitud máxima teórica y si culmina dentro de la ventana nocturna.
 */
export function calcularCulminacionAstro(
  raHoras: number,
  decGrados: number,
  latitud: number,
  longitud: number,
  fechaReferencia: Date
): ResultadoCulminacionAstro {
  const entradasValidas =
    Number.isFinite(raHoras) &&
    Number.isFinite(decGrados) &&
    decGrados >= -90 &&
    decGrados <= 90 &&
    Number.isFinite(latitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    Number.isFinite(longitud) &&
    longitud >= -180 &&
    longitud <= 180 &&
    !Number.isNaN(fechaReferencia.getTime());

  if (!entradasValidas) {
    return {
      horaCulminacion: null,
      altitudMaximaGrados: 0,
      estadoVisibilidad: 'nunca_sale',
      etiquetaHoraria: 'No visible desde esta latitud',
    };
  }

  const altitudMaximaGrados = Number((90 - Math.abs(latitud - decGrados)).toFixed(1));
  const nuncaSale =
    (latitud >= 0 && decGrados <= latitud - 90) ||
    (latitud < 0 && decGrados >= latitud + 90) ||
    altitudMaximaGrados <= 0;

  if (nuncaSale) {
    return {
      horaCulminacion: null,
      altitudMaximaGrados,
      estadoVisibilidad: 'nunca_sale',
      etiquetaHoraria: 'No visible desde esta latitud',
    };
  }

  const raNormalizada = normalizarHoras24(raHoras);
  const ventana = calcularVentanaNocturna(latitud, longitud, fechaReferencia);
  const centroNocheMs = (ventana.inicio.getTime() + ventana.fin.getTime()) / 2;
  const centroNoche = new Date(centroNocheMs);

  // Primer cálculo del tránsito más cercano al centro de la noche usando LST
  const lstCentro = calcularTiempoSidereoLocal(centroNoche, longitud);
  const deltaInicialHoras = diferenciaHorasCorta(raNormalizada, lstCentro);
  let horaCulminacion = new Date(
    centroNocheMs + deltaInicialHoras * RAZON_SIDEREO_A_SOLAR * MS_POR_HORA
  );

  // Refinamiento iterativo para compensar precisión del día sidéreo y nutación (< 1 s)
  const lstRefinado = calcularTiempoSidereoLocal(horaCulminacion, longitud);
  const ajusteHoras = diferenciaHorasCorta(raNormalizada, lstRefinado);
  horaCulminacion = new Date(
    horaCulminacion.getTime() + ajusteHoras * RAZON_SIDEREO_A_SOLAR * MS_POR_HORA
  );

  // En noches invernales largas (> 12h), comprobar si ±1 día sidéreo cae dentro de la ventana
  const inicioMs = ventana.inicio.getTime();
  const finMs = ventana.fin.getTime();
  let culmMs = horaCulminacion.getTime();

  if (culmMs < inicioMs || culmMs > finMs) {
    const anteriorMs = culmMs - DIA_SIDEREO_MS;
    const siguienteMs = culmMs + DIA_SIDEREO_MS;
    if (anteriorMs >= inicioMs && anteriorMs <= finMs) {
      culmMs = anteriorMs;
      horaCulminacion = new Date(culmMs);
    } else if (siguienteMs >= inicioMs && siguienteMs <= finMs) {
      culmMs = siguienteMs;
      horaCulminacion = new Date(culmMs);
    }
  }

  const altRedondeada = Math.round(altitudMaximaGrados);

  if (culmMs >= inicioMs && culmMs <= finMs) {
    return {
      horaCulminacion,
      altitudMaximaGrados,
      estadoVisibilidad: 'optimo_noche',
      etiquetaHoraria: `${formatearHoraCorta(horaCulminacion)} (Alt. máx ${altRedondeada}°)`,
    };
  }

  // Culminación diurna: determinar si conviene observar justo tras el anochecer o antes del amanecer
  const lstInicio = calcularTiempoSidereoLocal(ventana.inicio, longitud);
  const lstFin = calcularTiempoSidereoLocal(ventana.fin, longitud);
  const altAnochecer = calcularAltitudDesdeLST(raNormalizada, decGrados, latitud, lstInicio);
  const altAmanecer = calcularAltitudDesdeLST(raNormalizada, decGrados, latitud, lstFin);

  const mejorAlAnochecer =
    altAnochecer !== altAmanecer ? altAnochecer > altAmanecer : culmMs < inicioMs;

  const etiquetaHoraria = mejorAlAnochecer
    ? `Tras el anochecer (poniéndose · Culm. ${formatearHoraCorta(horaCulminacion)})`
    : `Antes del amanecer (saliendo · Culm. ${formatearHoraCorta(horaCulminacion)})`;

  return {
    horaCulminacion,
    altitudMaximaGrados,
    estadoVisibilidad: 'visible_parcial',
    etiquetaHoraria,
  };
}

const PRIORIDAD_VISIBILIDAD: Readonly<Record<EstadoVisibilidadObjetivo, number>> = {
  optimo_noche: 0,
  visible_parcial: 1,
  nunca_sale: 2,
};

/**
 * Comparador para ordenar los objetivos de una sesión nocturna:
 * 1. Astros con culminación durante la noche astronómica, en orden cronológico.
 * 2. Astros con culminación diurna (visibilidad parcial), en orden cronológico (poniéndose -> saliendo).
 * 3. Astros que nunca salen desde esta latitud, al final de la lista.
 */
export function ordenarPorCulminacionNocturna(
  a: ObjetivoPlanificado,
  b: ObjetivoPlanificado
): number {
  const diffEstado =
    PRIORIDAD_VISIBILIDAD[a.estadoVisibilidad] - PRIORIDAD_VISIBILIDAD[b.estadoVisibilidad];
  if (diffEstado !== 0) return diffEstado;

  if (a.horaCulminacion && b.horaCulminacion) {
    const diffHora = a.horaCulminacion.getTime() - b.horaCulminacion.getTime();
    if (diffHora !== 0) return diffHora;
  } else if (a.horaCulminacion) {
    return -1;
  } else if (b.horaCulminacion) {
    return 1;
  }

  const diffAlt = b.altitudMaximaGrados - a.altitudMaximaGrados;
  if (diffAlt !== 0) return diffAlt;

  return a.codigo.localeCompare(b.codigo, 'es');
}
