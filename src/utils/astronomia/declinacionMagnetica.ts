/**
 * Modelo geomagnético esférico armónico simplificado basado en los coeficientes
 * de Gauss del World Magnetic Model 2025 (WMM2025, grado y orden N = 4),
 * proyectados a época media 2026.5 (válido para la ventana 2025–2030).
 *
 * Referencia de signos:
 * - Positivo (+): Norte magnético al Este del Norte geográfico (E).
 * - Negativo (-): Norte magnético al Oeste del Norte geográfico (O).
 */

interface CoeficienteGauss {
  n: number;
  m: number;
  g: number; // nT (época 2025.0)
  h: number; // nT (época 2025.0)
  dg: number; // nT/año
  dh: number; // nT/año
}

const GRADO_MAXIMO = 4;
const ANIOS_DESDE_EPOCA_2025 = 1.5; // Época de referencia 2026.5
const LATITUD_LIMITE_POLAR = 89.99;

/** Coeficientes principales y variación secular WMM2025 (n = 1..4). */
const COEFICIENTES_WMM2025: readonly CoeficienteGauss[] = [
  // Grado 1 (dipolo principal)
  { n: 1, m: 0, g: -29351.8, h: 0.0, dg: 12.0, dh: 0.0 },
  { n: 1, m: 1, g: -1410.8, h: 4545.4, dg: 9.7, dh: -21.5 },
  // Grado 2 (cuadrupolo)
  { n: 2, m: 0, g: -2556.6, h: 0.0, dg: -11.6, dh: 0.0 },
  { n: 2, m: 1, g: 2951.1, h: -3133.6, dg: -5.2, dh: -27.7 },
  { n: 2, m: 2, g: 1649.3, h: -815.1, dg: -8.0, dh: -12.1 },
  // Grado 3 (octupolo)
  { n: 3, m: 0, g: 1361.0, h: 0.0, dg: -1.3, dh: 0.0 },
  { n: 3, m: 1, g: -2404.1, h: -56.6, dg: -4.2, dh: 4.0 },
  { n: 3, m: 2, g: 1243.8, h: 237.5, dg: 0.4, dh: -0.3 },
  { n: 3, m: 3, g: 453.6, h: -549.5, dg: -15.6, dh: -4.1 },
  // Grado 4 (hexadecapolo)
  { n: 4, m: 0, g: 895.0, h: 0.0, dg: -1.6, dh: 0.0 },
  { n: 4, m: 1, g: 799.5, h: 278.6, dg: -2.4, dh: -1.1 },
  { n: 4, m: 2, g: 55.7, h: -133.9, dg: -6.0, dh: 4.1 },
  { n: 4, m: 3, g: -281.1, h: 212.0, dg: 5.6, dh: 1.6 },
  { n: 4, m: 4, g: 12.1, h: -375.6, dg: -7.0, dh: -4.4 },
];

function factorial(n: number): number {
  let resultado = 1;
  for (let i = 2; i <= n; i++) {
    resultado *= i;
  }
  return resultado;
}

/** Factor de cuasi-normalización de Schmidt S(n, m). */
const FACTORES_SCHMIDT: readonly (readonly number[])[] = Array.from(
  { length: GRADO_MAXIMO + 1 },
  (_, n) =>
    Array.from({ length: n + 1 }, (_, m) => {
      const escalaM = m === 0 ? 1 : 2;
      return Math.sqrt((escalaM * factorial(n - m)) / factorial(n + m));
    })
);

function normalizarLongitud(longitud: number): number {
  const normalizada = ((((longitud + 180) % 360) + 360) % 360) - 180;
  return normalizada === -180 && longitud > 0 ? 180 : normalizada;
}

/**
 * Calcula la declinación magnética aproximada en grados [-180, 180]
 * para las coordenadas geográficas proporcionadas.
 *
 * Devuelve un valor finito acotado incluso en latitudes polares extremas,
 * en `(0, 0)` o ante entradas no finitas (fallback seguro `0`).
 */
export function calcularDeclinacionMagnetica(latitud: number, longitud: number): number {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return 0;
  }

  const latAcotada = Math.min(LATITUD_LIMITE_POLAR, Math.max(-LATITUD_LIMITE_POLAR, latitud));
  const lonNormalizada = normalizarLongitud(longitud);

  const latRad = (latAcotada * Math.PI) / 180;
  const lonRad = (lonNormalizada * Math.PI) / 180;

  // x = cos(colatitud) = sin(lat), y = sin(colatitud) = cos(lat) > 0
  const x = Math.sin(latRad);
  const y = Math.cos(latRad);

  // Polinomios asociados de Legendre (sin normalizar) y sus derivadas respecto a la colatitud
  const p: number[][] = Array.from({ length: GRADO_MAXIMO + 1 }, (_, n) =>
    new Array<number>(n + 1).fill(0)
  );
  const dp: number[][] = Array.from({ length: GRADO_MAXIMO + 1 }, (_, n) =>
    new Array<number>(n + 1).fill(0)
  );

  p[0][0] = 1;
  dp[0][0] = 0;

  for (let m = 1; m <= GRADO_MAXIMO; m++) {
    const factor = 2 * m - 1;
    p[m][m] = factor * y * p[m - 1][m - 1];
    dp[m][m] = factor * (x * p[m - 1][m - 1] + y * dp[m - 1][m - 1]);
  }

  for (let m = 0; m < GRADO_MAXIMO; m++) {
    const factor = 2 * m + 1;
    p[m + 1][m] = factor * x * p[m][m];
    dp[m + 1][m] = factor * (-y * p[m][m] + x * dp[m][m]);
  }

  for (let n = 2; n <= GRADO_MAXIMO; n++) {
    for (let m = 0; m <= n - 2; m++) {
      const inv = 1 / (n - m);
      const a = 2 * n - 1;
      const b = n + m - 1;
      p[n][m] = (a * x * p[n - 1][m] - b * p[n - 2][m]) * inv;
      dp[n][m] = (a * (-y * p[n - 1][m] + x * dp[n - 1][m]) - b * dp[n - 2][m]) * inv;
    }
  }

  // Componentes horizontales del campo geomagnético: Norte (campoX) y Este (campoY)
  let campoX = 0;
  let campoY = 0;

  for (const coef of COEFICIENTES_WMM2025) {
    const gActual = coef.g + coef.dg * ANIOS_DESDE_EPOCA_2025;
    const hActual = coef.h + coef.dh * ANIOS_DESDE_EPOCA_2025;
    const schmidt = FACTORES_SCHMIDT[coef.n][coef.m];
    const cosMLon = Math.cos(coef.m * lonRad);
    const sinMLon = Math.sin(coef.m * lonRad);

    campoX += (gActual * cosMLon + hActual * sinMLon) * schmidt * dp[coef.n][coef.m];
    if (coef.m > 0) {
      campoY +=
        coef.m * (gActual * sinMLon - hActual * cosMLon) * schmidt * p[coef.n][coef.m];
    }
  }

  campoY /= y;

  const declinacionGrados = (Math.atan2(campoY, campoX) * 180) / Math.PI;
  if (!Number.isFinite(declinacionGrados)) {
    return 0;
  }

  const acotada = Math.min(180, Math.max(-180, declinacionGrados));
  const redondeada = Number(acotada.toFixed(2));
  return Object.is(redondeada, -0) ? 0 : redondeada;
}

/** Formatea la declinación magnética para indicadores discretos en la interfaz. */
export function formatearDeclinacionMagnetica(declinacion: number): string {
  if (!Number.isFinite(declinacion)) return '0.0°';
  const redondeada = Number(declinacion.toFixed(1));
  if (Math.abs(redondeada) < 0.05) return '0.0°';
  if (redondeada > 0) return `+${redondeada.toFixed(1)}° E`;
  return `${redondeada.toFixed(1)}° O`;
}
