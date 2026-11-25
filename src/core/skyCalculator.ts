import * as Astronomy from 'astronomy-engine';
import type {
  AstroSeleccionado,
  CuerpoCeleste,
  EfemeridesTransito,
  EstadoCieloSolar,
  EstrellaCalculada,
  FaseCrepusculo,
  MessierCalculado,
  PuntoTrayectoria,
  Ubicacion,
} from '../types/astronomy';
import { CATALOGO_MESSIER } from '../data/messierCatalog';
import { ESTRELLAS_BRILLANTES } from '../data/brightStars';

const CUERPOS_A_CALCULAR: {
  body: Astronomy.Body;
  nombre: string;
  tipo: CuerpoCeleste['tipo'];
  color: string;
}[] = [
  { body: Astronomy.Body.Moon, nombre: 'Luna', tipo: 'luna', color: '#f8fafc' },
  { body: Astronomy.Body.Mercury, nombre: 'Mercurio', tipo: 'planeta', color: '#94a3b8' },
  { body: Astronomy.Body.Venus, nombre: 'Venus', tipo: 'planeta', color: '#fef08a' },
  { body: Astronomy.Body.Mars, nombre: 'Marte', tipo: 'planeta', color: '#f87171' },
  { body: Astronomy.Body.Jupiter, nombre: 'Júpiter', tipo: 'planeta', color: '#fdba74' },
  { body: Astronomy.Body.Saturn, nombre: 'Saturno', tipo: 'planeta', color: '#fde047' },
  { body: Astronomy.Body.Uranus, nombre: 'Urano', tipo: 'planeta', color: '#67e8f9' },
  { body: Astronomy.Body.Neptune, nombre: 'Neptuno', tipo: 'planeta', color: '#60a5fa' },
];

export function esEntradaAstronomicaValida(fecha: Date, ubicacion: Ubicacion): boolean {
  if (Number.isNaN(fecha.getTime())) return false;
  if (!Number.isFinite(ubicacion.latitud) || ubicacion.latitud < -90 || ubicacion.latitud > 90) {
    return false;
  }
  if (!Number.isFinite(ubicacion.longitud) || ubicacion.longitud < -180 || ubicacion.longitud > 180) {
    return false;
  }
  if (!Number.isFinite(ubicacion.altitud)) return false;
  return true;
}

function gradosADireccion(acimut: number): string {
  const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const indice = Math.round(acimut / 45) % 8;
  return puntos[indice];
}

function obtenerNombreFaseLunar(angulo: number): string {
  if (angulo < 22.5 || angulo >= 337.5) return 'Luna Nueva';
  if (angulo < 67.5) return 'Luna Creciente';
  if (angulo < 112.5) return 'Cuarto Creciente';
  if (angulo < 157.5) return 'Gibosa Creciente';
  if (angulo < 202.5) return 'Luna Llena';
  if (angulo < 247.5) return 'Gibosa Menguante';
  if (angulo < 292.5) return 'Cuarto Menguante';
  return 'Luna Menguante';
}

function clasificarFaseSolar(altitudSol: number): FaseCrepusculo {
  if (altitudSol >= 0) return 'Día';
  if (altitudSol >= -6) return 'Crepúsculo civil';
  if (altitudSol >= -12) return 'Crepúsculo náutico';
  if (altitudSol >= -18) return 'Crepúsculo astronómico';
  return 'Noche astronómica';
}

function precesarJ2000AFecha(
  raJ2000Horas: number,
  decJ2000Grados: number,
  fecha: Date,
  rotacionEqjEqd: Astronomy.RotationMatrix
): { ra: number; dec: number } {
  const esferaJ2000 = new Astronomy.Spherical(decJ2000Grados, raJ2000Horas * 15, 1);
  const vectorJ2000 = Astronomy.VectorFromSphere(esferaJ2000, fecha);
  const vectorFecha = Astronomy.RotateVector(rotacionEqjEqd, vectorJ2000);
  const ecuatorialFecha = Astronomy.EquatorFromVector(vectorFecha);
  return { ra: ecuatorialFecha.ra, dec: ecuatorialFecha.dec };
}

export function calcularEstadoSolar(fecha: Date, ubicacion: Ubicacion): EstadoCieloSolar | null {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return null;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const ecuatorial = Astronomy.Equator(Astronomy.Body.Sun, fecha, observador, true, true);
  const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
  const altitudSol = Number(horizontal.altitude.toFixed(1));

  return {
    altitudSol,
    fase: clasificarFaseSolar(horizontal.altitude),
  };
}

export function calcularCielo(fecha: Date, ubicacion: Ubicacion): CuerpoCeleste[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  return CUERPOS_A_CALCULAR.map(({ body, nombre, tipo, color }) => {
    const ecuatorial = Astronomy.Equator(body, fecha, observador, true, true);
    const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
    const brillo = Astronomy.Illumination(body, fecha);

    let faseLunar: string | undefined;
    let anguloFase: number | undefined;
    if (tipo === 'luna') {
      anguloFase = Astronomy.MoonPhase(fecha);
      faseLunar = obtenerNombreFaseLunar(anguloFase);
    }

    return {
      id: body.toString(),
      nombre,
      tipo,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      direccion: gradosADireccion(horizontal.azimuth),
      magnitud: Number(brillo.mag.toFixed(1)),
      iluminacion: Number((brillo.phase_fraction * 100).toFixed(0)),
      faseLunar,
      anguloFase,
      visible: horizontal.altitude > 0,
      color,
    };
  }).sort((a, b) => b.altitud - a.altitud);
}

export function calcularEstrellas(fecha: Date, ubicacion: Ubicacion): EstrellaCalculada[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);

  return ESTRELLAS_BRILLANTES.map((estrella) => {
    const { ra, dec } = precesarJ2000AFecha(estrella.ra, estrella.dec, fecha, rotacion);
    const horizontal = Astronomy.Horizon(fecha, observador, ra, dec, 'normal');
    return {
      ...estrella,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 0,
    };
  });
}

export function calcularMessier(fecha: Date, ubicacion: Ubicacion): MessierCalculado[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);

  return CATALOGO_MESSIER.map((obj) => {
    const { ra, dec } = precesarJ2000AFecha(obj.ra, obj.dec, fecha, rotacion);
    const horizontal = Astronomy.Horizon(fecha, observador, ra, dec, 'normal');
    return {
      ...obj,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 10,
    };
  });
}

function formatearHoraEtiqueta(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function calcularTrayectoriaAstro(
  astro: AstroSeleccionado,
  fecha: Date,
  ubicacion: Ubicacion
): PuntoTrayectoria[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const puntos: PuntoTrayectoria[] = [];
  const pasoMs = 30 * 60_000;

  if (astro.categoria === 'cuerpo') {
    const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === astro.id);
    if (!cuerpoDef) return [];

    for (let i = -12; i <= 12; i++) {
      const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
      const ecuatorial = Astronomy.Equator(cuerpoDef.body, fechaPaso, observador, true, true);
      const horizontal = Astronomy.Horizon(
        fechaPaso,
        observador,
        ecuatorial.ra,
        ecuatorial.dec,
        'normal'
      );
      puntos.push({
        altitud: Number(horizontal.altitude.toFixed(1)),
        acimut: Number(horizontal.azimuth.toFixed(1)),
        horaEtiqueta: formatearHoraEtiqueta(fechaPaso),
      });
    }
    return puntos;
  }

  const catalogo =
    astro.categoria === 'estrella'
      ? ESTRELLAS_BRILLANTES.find((e) => e.id === astro.id)
      : CATALOGO_MESSIER.find((m) => m.id === astro.id);

  if (!catalogo) return [];

  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);
  const { ra, dec } = precesarJ2000AFecha(catalogo.ra, catalogo.dec, fecha, rotacion);

  for (let i = -12; i <= 12; i++) {
    const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
    const horizontal = Astronomy.Horizon(fechaPaso, observador, ra, dec, 'normal');
    puntos.push({
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      horaEtiqueta: formatearHoraEtiqueta(fechaPaso),
    });
  }

  return puntos;
}

export function calcularTransitoCuerpo(
  idCuerpo: string,
  fecha: Date,
  ubicacion: Ubicacion
): EfemeridesTransito {
  const vacio: EfemeridesTransito = {
    salida: null,
    culminacion: null,
    puesta: null,
    alturaMaxima: null,
  };

  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return vacio;

  const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === idCuerpo);
  if (!cuerpoDef) return vacio;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);

  let salida: Date | null = null;
  let puesta: Date | null = null;
  let culminacion: Date | null = null;
  let alturaMaxima: number | null = null;

  try {
    const eventoSalida = Astronomy.SearchRiseSet(cuerpoDef.body, observador, 1, inicioDia, 1);
    if (eventoSalida) salida = eventoSalida.date;
  } catch {
    // Mantiene salida en null en latitudes o fechas sin orto
  }

  try {
    const eventoPuesta = Astronomy.SearchRiseSet(cuerpoDef.body, observador, -1, inicioDia, 1);
    if (eventoPuesta) puesta = eventoPuesta.date;
  } catch {
    // Mantiene puesta en null en latitudes o fechas sin ocaso
  }

  try {
    const eventoCulminacion = Astronomy.SearchHourAngle(
      cuerpoDef.body,
      observador,
      0,
      inicioDia,
      1
    );
    culminacion = eventoCulminacion.time.date;
    alturaMaxima = Number(eventoCulminacion.hor.altitude.toFixed(1));
  } catch {
    // Mantiene culminación en null si no es resoluble
  }

  return {
    salida,
    culminacion,
    puesta,
    alturaMaxima,
  };
}
