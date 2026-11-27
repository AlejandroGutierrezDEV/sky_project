import * as Astronomy from 'astronomy-engine';
import type { EventoCeleste, Ubicacion } from '../types/astronomy';
import { LLUVIAS_ESTRELLAS } from '../data/meteorShowers';
import { esEntradaAstronomicaValida } from './skyCalculator';
import {
  crearFechaUTCDesdeCivil,
  normalizarZonaHoraria,
  obtenerComponentesDiaCivil,
} from '../utils/lunarCalculations';

const NOMBRES_ECLIPSE: Record<string, string> = {
  total: 'Total',
  partial: 'Parcial',
  annular: 'Anular',
  penumbral: 'Penumbral',
};

function calcularDiasRestantesEnZona(desde: Date, hasta: Date, timezone: string): number {
  const cDesde = obtenerComponentesDiaCivil(desde, timezone);
  const cHasta = obtenerComponentesDiaCivil(hasta, timezone);
  const inicioDia = Date.UTC(cDesde.anio, cDesde.mes - 1, cDesde.dia);
  const finDia = Date.UTC(cHasta.anio, cHasta.mes - 1, cHasta.dia);
  return Math.round((finDia - inicioDia) / (1000 * 60 * 60 * 24));
}

function obtenerProximasLluvias(fechaBase: Date, timezone: string): EventoCeleste[] {
  const { anio: anioActual } = obtenerComponentesDiaCivil(fechaBase, timezone);

  return LLUVIAS_ESTRELLAS.map((lluvia) => {
    let fechaPico = crearFechaUTCDesdeCivil(
      anioActual,
      lluvia.mesPico,
      lluvia.diaPico,
      23,
      30,
      timezone
    );
    if (calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone) < 0) {
      fechaPico = crearFechaUTCDesdeCivil(
        anioActual + 1,
        lluvia.mesPico,
        lluvia.diaPico,
        23,
        30,
        timezone
      );
    }

    const anioPico = obtenerComponentesDiaCivil(fechaPico, timezone).anio;

    return {
      id: `lluvia-${lluvia.id}-${anioPico}`,
      titulo: lluvia.nombre,
      tipo: 'lluvia' as const,
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen: `Máximo ~${lluvia.thz} meteoros/h`,
      detalle: `Radiante: Const. ${lluvia.radiante}`,
    };
  });
}

function obtenerProximosEclipses(
  fechaBase: Date,
  ubicacion: Ubicacion,
  timezone: string
): EventoCeleste[] {
  const eventos: EventoCeleste[] = [];
  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  // 1. Próximos 2 eclipses lunares con comprobación de visibilidad local
  let fechaBusqueda = new Date(fechaBase);
  for (let i = 0; i < 2; i++) {
    const lunar = Astronomy.SearchLunarEclipse(fechaBusqueda);
    const fechaPico = lunar.peak.date;
    const tipoClave = String(lunar.kind).toLowerCase();
    const tipoStr = NOMBRES_ECLIPSE[tipoClave] ?? 'Lunar';

    const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, fechaPico, observador, true, true);
    const horLuna = Astronomy.Horizon(fechaPico, observador, eqLuna.ra, eqLuna.dec, 'normal');

    const resumen =
      tipoClave === 'penumbral'
        ? 'Eclipse penumbral (oscurecimiento sutil)'
        : `Oscurecimiento: ${Math.round(lunar.obscuration * 100)}%`;

    const detalle =
      horLuna.altitude > 0
        ? `Visible desde tu ubicación (Luna a ${horLuna.altitude.toFixed(1)}° en el máximo)`
        : `No visible desde tu ubicación (Luna bajo el horizonte: ${horLuna.altitude.toFixed(1)}°)`;

    eventos.push({
      id: `eclipse-lunar-${fechaPico.getTime()}`,
      titulo: `Eclipse Lunar ${tipoStr}`,
      tipo: 'eclipse',
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen,
      detalle,
    });

    fechaBusqueda = new Date(fechaPico.getTime() + 15 * 24 * 60 * 60 * 1000);
  }

  // 2. Próximos eclipses solares visibles sobre el horizonte en tu ubicación
  let fechaSolar = new Date(fechaBase);
  let encontrados = 0;
  let intentos = 0;
  let primerEclipseSolar: Astronomy.LocalSolarEclipseInfo | null = null;

  while (encontrados < 2 && intentos < 16) {
    intentos++;
    const solar = Astronomy.SearchLocalSolarEclipse(fechaSolar, observador);
    const fechaPico = solar.peak.time.date;

    if (!primerEclipseSolar) {
      primerEclipseSolar = solar;
    }

    if (solar.peak.altitude > 0) {
      const tipoStr = NOMBRES_ECLIPSE[String(solar.kind).toLowerCase()] ?? 'Solar';
      const porcentajeOcultacion = Number.isFinite(solar.obscuration)
        ? Math.round(solar.obscuration * 100)
        : 0;
      eventos.push({
        id: `eclipse-solar-${fechaPico.getTime()}`,
        titulo: `Eclipse Solar ${tipoStr}`,
        tipo: 'eclipse',
        fechaPico,
        diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
        resumen: `Ocultación local: ${porcentajeOcultacion}%`,
        detalle: `Altura del Sol en máximo: ${solar.peak.altitude.toFixed(1)}°`,
      });
      encontrados++;
    }

    fechaSolar = new Date(fechaPico.getTime() + 20 * 24 * 60 * 60 * 1000);
  }

  if (encontrados === 0 && primerEclipseSolar) {
    const fechaPico = primerEclipseSolar.peak.time.date;
    const tipoStr = NOMBRES_ECLIPSE[String(primerEclipseSolar.kind).toLowerCase()] ?? 'Solar';
    const porcentajeOcultacion = Number.isFinite(primerEclipseSolar.obscuration)
      ? Math.round(primerEclipseSolar.obscuration * 100)
      : 0;
    eventos.push({
      id: `eclipse-solar-${fechaPico.getTime()}`,
      titulo: `Eclipse Solar ${tipoStr}`,
      tipo: 'eclipse',
      fechaPico,
      diasRestantes: calcularDiasRestantesEnZona(fechaBase, fechaPico, timezone),
      resumen: `Ocultación local: ${porcentajeOcultacion}%`,
      detalle: `No visible desde tu ubicación (Sol bajo el horizonte: ${primerEclipseSolar.peak.altitude.toFixed(1)}°)`,
    });
  }

  return eventos;
}

export function calcularProximosEventos(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
  if (!esEntradaAstronomicaValida(fechaBase, ubicacion)) return [];

  const zonaHoraria = normalizarZonaHoraria(
    ubicacion.timezone,
    ubicacion.latitud,
    ubicacion.longitud
  );

  const lluvias = obtenerProximasLluvias(fechaBase, zonaHoraria);
  const eclipses = obtenerProximosEclipses(fechaBase, ubicacion, zonaHoraria);

  return [...lluvias, ...eclipses]
    .sort((a, b) => a.fechaPico.getTime() - b.fechaPico.getTime())
    .slice(0, 6);
}
