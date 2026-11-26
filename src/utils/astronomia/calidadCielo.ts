import type {
  CalidadCieloCalculada,
  DatosLunares,
  EscalaBortle,
} from '../../types/astronomy';

export const BORTLE_POR_DEFECTO: EscalaBortle = 4;

/**
 * Magnitud límite cenital a simple vista (NELM) en cielo despejado sin Luna
 * según la escala de cielo oscuro de Bortle (1 a 9).
 */
export const NELM_BASE_POR_BORTLE: Readonly<Record<EscalaBortle, number>> = {
  1: 7.6,
  2: 7.1,
  3: 6.6,
  4: 6.2,
  5: 5.7,
  6: 5.2,
  7: 4.8,
  8: 4.4,
  9: 4.0,
};

export const DESCRIPCIONES_BORTLE: Readonly<Record<EscalaBortle, string>> = {
  1: 'Bortle 1 · Cielo oscuro excelente',
  2: 'Bortle 2 · Cielo oscuro típico',
  3: 'Bortle 3 · Cielo rural',
  4: 'Bortle 4 · Transición rural/suburbana',
  5: 'Bortle 5 · Cielo suburbano',
  6: 'Bortle 6 · Suburbano brillante',
  7: 'Bortle 7 · Transición suburbana/urbana',
  8: 'Bortle 8 · Cielo urbano',
  9: 'Bortle 9 · Centro urbano',
};

export const NIVELES_BORTLE: readonly EscalaBortle[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const PENALIZACION_LUNAR_MAXIMA_MAG = 2.7;
const MAGNITUD_LIMITE_MINIMA = 0.5;
const VEREDICTOS_POR_NIVEL: readonly CalidadCieloCalculada['veredicto'][] = [
  'Malo',
  'Regular',
  'Bueno',
  'Excelente',
];

export function esEscalaBortleValida(valor: unknown): valor is EscalaBortle {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 9;
}

export function normalizarEscalaBortle(valor: unknown): EscalaBortle {
  return esEscalaBortleValida(valor) ? valor : BORTLE_POR_DEFECTO;
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Calcula la calidad real de observación astronómica combinando cobertura nubosa,
 * escala Bortle del observatorio y brillo/altitud de la Luna.
 */
export function calcularCalidadCielo(
  nubesPct: number,
  bortle: EscalaBortle,
  luna: DatosLunares
): CalidadCieloCalculada {
  const nubes = Number.isFinite(nubesPct) ? acotar(nubesPct, 0, 100) : 0;
  const escalaBortle = normalizarEscalaBortle(bortle);
  const iluminacion = Number.isFinite(luna.iluminacion) ? acotar(luna.iluminacion, 0, 1) : 0;
  const altitudGrados = Number.isFinite(luna.altitudGrados)
    ? acotar(luna.altitudGrados, -90, 90)
    : -90;
  const faseNombre =
    typeof luna.faseNombre === 'string' && luna.faseNombre.trim().length > 0
      ? luna.faseNombre.trim()
      : 'Luna';

  const nelmBase = NELM_BASE_POR_BORTLE[escalaBortle];

  let penalizacionLunar = 0;
  if (altitudGrados > 0 && iluminacion > 0) {
    const altitudRadianes = (altitudGrados * Math.PI) / 180;
    const perdidaBruta = PENALIZACION_LUNAR_MAXIMA_MAG * iluminacion * Math.sin(altitudRadianes);
    penalizacionLunar = Number(perdidaBruta.toFixed(2));
  }

  const magnitudLimiteVisible = Number(
    Math.max(MAGNITUD_LIMITE_MINIMA, nelmBase - penalizacionLunar).toFixed(1)
  );

  // Evaluación por nubosidad
  let nivelNubes = 3;
  let motivoNubes = '';
  if (nubes > 65) {
    nivelNubes = 0;
    motivoNubes = `Nubosidad densa (${Math.round(nubes)}%) impide la observación`;
  } else if (nubes > 35) {
    nivelNubes = 1;
    motivoNubes = `Nubosidad parcial (${Math.round(nubes)}%) limita la sesión`;
  } else if (nubes > 15) {
    nivelNubes = 2;
    motivoNubes = `Intervalos de nubes ligeras (${Math.round(nubes)}%)`;
  }

  // Evaluación por interferencia lunar en cielo profundo
  const lunaAltaEIluminada = altitudGrados > 20 && iluminacion > 0.6;
  let nivelLuna = 3;
  let motivoLuna = '';
  if (lunaAltaEIluminada) {
    nivelLuna = 1;
    motivoLuna = `Brillo de ${faseNombre} (${Math.round(iluminacion * 100)}%, alt ${Math.round(
      altitudGrados
    )}°) limita el cielo profundo`;
  } else if (altitudGrados > 0 && penalizacionLunar >= 0.45) {
    nivelLuna = 2;
    motivoLuna = `Presencia de ${faseNombre} (${Math.round(iluminacion * 100)}%) reduce el contraste`;
  }

  // Evaluación por contaminación lumínica (escala Bortle)
  let nivelBortle = 3;
  let motivoBortle = '';
  if (escalaBortle === 9) {
    nivelBortle = 0;
    motivoBortle = 'Contaminación lumínica extrema (Bortle 9)';
  } else if (escalaBortle >= 7) {
    nivelBortle = 1;
    motivoBortle = `Contaminación lumínica urbana (Bortle ${escalaBortle})`;
  } else if (escalaBortle >= 5) {
    nivelBortle = 2;
    motivoBortle = `Contaminación lumínica moderada (Bortle ${escalaBortle})`;
  }

  let nivelFinal = Math.min(nivelNubes, nivelLuna, nivelBortle);

  // Degradación compuesta cuando concurre Luna alta brillante con cielo urbano o nuboso
  if (lunaAltaEIluminada && (nubes > 35 || escalaBortle >= 8)) {
    nivelFinal = 0;
  }

  let motivoPrincipal: string;
  if (nivelFinal === 3) {
    motivoPrincipal =
      altitudGrados <= 0 && iluminacion > 0.5
        ? 'Cielo despejado y oscuro (Luna bajo el horizonte)'
        : 'Cielo despejado y oscuro, óptimo para cielo profundo';
  } else if (nivelNubes <= nivelFinal && motivoNubes) {
    motivoPrincipal = motivoNubes;
  } else if (lunaAltaEIluminada && (nivelFinal <= 1 || nivelLuna <= nivelFinal)) {
    motivoPrincipal = motivoLuna;
  } else if (nivelLuna <= nivelFinal && motivoLuna) {
    motivoPrincipal = motivoLuna;
  } else if (motivoBortle) {
    motivoPrincipal = motivoBortle;
  } else {
    motivoPrincipal = motivoNubes || motivoLuna || 'Condiciones limitadas de observación';
  }

  return {
    magnitudLimiteVisible,
    penalizacionLunar,
    veredicto: VEREDICTOS_POR_NIVEL[nivelFinal],
    motivoPrincipal,
  };
}
