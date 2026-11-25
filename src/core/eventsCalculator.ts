import * as Astronomy from 'astronomy-engine';
import type { EventoCeleste, Ubicacion } from '../types/astronomy';
import { LLUVIAS_ESTRELLAS } from '../data/meteorShowers';
import { esEntradaAstronomicaValida } from './skyCalculator';

const NOMBRES_ECLIPSE: Record<string, string> = {
  Total: 'Total',
  Partial: 'Parcial',
  Annular: 'Anular',
  Penumbra: 'Penumbral',
};

function calcularDiasRestantes(desde: Date, hasta: Date): number {
  const inicioDia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
  const finDia = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()).getTime();
  return Math.round((finDia - inicioDia) / (1000 * 60 * 60 * 24));
}

function obtenerProximasLluvias(fechaBase: Date): EventoCeleste[] {
  const anioActual = fechaBase.getFullYear();

  return LLUVIAS_ESTRELLAS.map((lluvia) => {
    let fechaPico = new Date(anioActual, lluvia.mesPico - 1, lluvia.diaPico, 23, 30);
    if (calcularDiasRestantes(fechaBase, fechaPico) < 0) {
      fechaPico = new Date(anioActual + 1, lluvia.mesPico - 1, lluvia.diaPico, 23, 30);
    }

    return {
      id: `lluvia-${lluvia.id}-${fechaPico.getFullYear()}`,
      titulo: lluvia.nombre,
      tipo: 'lluvia' as const,
      fechaPico,
      diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
      resumen: `Máximo ~${lluvia.thz} meteoros/h`,
      detalle: `Radiante: Const. ${lluvia.radiante}`,
    };
  });
}

function obtenerProximosEclipses(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
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
    const tipoClave = String(lunar.kind);
    const tipoStr = NOMBRES_ECLIPSE[tipoClave] ?? 'Lunar';

    const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, fechaPico, observador, true, true);
    const horLuna = Astronomy.Horizon(fechaPico, observador, eqLuna.ra, eqLuna.dec, 'normal');

    const resumen =
      tipoClave === 'Penumbra'
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
      diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
      resumen,
      detalle,
    });

    fechaBusqueda = new Date(fechaPico.getTime() + 15 * 24 * 60 * 60 * 1000);
  }

  // 2. Próximos eclipses solares visibles sobre el horizonte en tu ubicación
  let fechaSolar = new Date(fechaBase);
  let encontrados = 0;
  let intentos = 0;

  while (encontrados < 2 && intentos < 8) {
    intentos++;
    const solar = Astronomy.SearchLocalSolarEclipse(fechaSolar, observador);
    const fechaPico = solar.peak.time.date;

    if (solar.peak.altitude > 0) {
      const tipoStr = NOMBRES_ECLIPSE[String(solar.kind)] ?? 'Solar';
      eventos.push({
        id: `eclipse-solar-${fechaPico.getTime()}`,
        titulo: `Eclipse Solar ${tipoStr}`,
        tipo: 'eclipse',
        fechaPico,
        diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
        resumen: `Ocultación local: ${Math.round(solar.obscuration * 100)}%`,
        detalle: `Altura del Sol en máximo: ${solar.peak.altitude.toFixed(1)}°`,
      });
      encontrados++;
    }

    fechaSolar = new Date(fechaPico.getTime() + 20 * 24 * 60 * 60 * 1000);
  }

  return eventos;
}

export function calcularProximosEventos(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
  if (!esEntradaAstronomicaValida(fechaBase, ubicacion)) return [];

  const lluvias = obtenerProximasLluvias(fechaBase);
  const eclipses = obtenerProximosEclipses(fechaBase, ubicacion);

  return [...lluvias, ...eclipses]
    .sort((a, b) => a.fechaPico.getTime() - b.fechaPico.getTime())
    .slice(0, 6);
}
