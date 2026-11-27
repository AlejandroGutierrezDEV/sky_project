import * as Astronomy from 'astronomy-engine';
import type {
  AstroSeleccionado,
  ConstelacionCalculada,
  CuerpoCeleste,
  EfemeridesTransito,
  EstadoCieloSolar,
  EstrellaCalculada,
  FaseCrepusculo,
  MessierCalculado,
  PuntoTrayectoria,
  SegmentoHorizontalConstelacion,
  Ubicacion,
} from '../types/astronomy';
import { CATALOGO_MESSIER } from '../data/messier110';
import { CATALOGO_ESTRELLAS } from '../data/estrellasMag4';
import { CONSTELACIONES_IAU } from '../data/constelacionesIAU';

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

function crearConvertidorJ2000Horizontal(
  fecha: Date,
  observador: Astronomy.Observer
): (raJ2000Horas: number, decJ2000Grados: number) => { altitud: number; acimut: number } {
  const rotacion = Astronomy.Rotation_EQJ_HOR(fecha, observador);
  return (raJ2000Horas: number, decJ2000Grados: number) => {
    const esferaJ2000 = new Astronomy.Spherical(decJ2000Grados, raJ2000Horas * 15, 1);
    const vectorJ2000 = Astronomy.VectorFromSphere(esferaJ2000, fecha);
    const vectorHor = Astronomy.RotateVector(rotacion, vectorJ2000);
    const horizontal = Astronomy.HorizonFromVector(vectorHor, 'normal');
    return {
      altitud: horizontal.lat,
      acimut: horizontal.lon,
    };
  };
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
    const ecuatorialJ2000 = Astronomy.Equator(body, fecha, observador, false, true);
    const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
    const brillo = Astronomy.Illumination(body, fecha);
    const constelacion = Astronomy.Constellation(ecuatorialJ2000.ra, ecuatorialJ2000.dec);

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
      raHoras: Number(ecuatorial.ra.toFixed(4)),
      decGrados: Number(ecuatorial.dec.toFixed(4)),
      constelacionIAU: constelacion.symbol.toUpperCase(),
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
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CATALOGO_ESTRELLAS.map((estrella) => {
    const { altitud, acimut } = convertirHorizontal(estrella.raHoras, estrella.decGrados);
    return {
      ...estrella,
      altitud: Number(altitud.toFixed(1)),
      acimut: Number(acimut.toFixed(1)),
      visible: altitud > 0,
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
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CATALOGO_MESSIER.map((obj) => {
    const { altitud, acimut } = convertirHorizontal(obj.raHoras, obj.decGrados);
    return {
      ...obj,
      altitud: Number(altitud.toFixed(1)),
      acimut: Number(acimut.toFixed(1)),
      visible: altitud > 10,
    };
  });
}

export function calcularConstelaciones(
  fecha: Date,
  ubicacion: Ubicacion
): ConstelacionCalculada[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const convertirHorizontal = crearConvertidorJ2000Horizontal(fecha, observador);

  return CONSTELACIONES_IAU.map((constelacion) => {
    const segmentos: SegmentoHorizontalConstelacion[] = [];
    let sxVisible = 0;
    let syVisible = 0;
    let szVisible = 0;
    let conteoVisible = 0;
    let sxTotal = 0;
    let syTotal = 0;
    let szTotal = 0;

    const acumularVertice = (alt: number, az: number) => {
      const altRad = (alt * Math.PI) / 180;
      const azRad = (az * Math.PI) / 180;
      const cosAlt = Math.cos(altRad);
      const vx = cosAlt * Math.cos(azRad);
      const vy = cosAlt * Math.sin(azRad);
      const vz = Math.sin(altRad);

      sxTotal += vx;
      syTotal += vy;
      szTotal += vz;

      if (alt >= 0) {
        sxVisible += vx;
        syVisible += vy;
        szVisible += vz;
        conteoVisible += 1;
      }
    };

    for (const [desdeJ2000, hastaJ2000] of constelacion.segmentos) {
      const p1 = convertirHorizontal(desdeJ2000[0], desdeJ2000[1]);
      const p2 = convertirHorizontal(hastaJ2000[0], hastaJ2000[1]);

      acumularVertice(p1.altitud, p1.acimut);
      acumularVertice(p2.altitud, p2.acimut);

      segmentos.push({
        desde: {
          altitud: Number(p1.altitud.toFixed(1)),
          acimut: Number(p1.acimut.toFixed(1)),
        },
        hasta: {
          altitud: Number(p2.altitud.toFixed(1)),
          acimut: Number(p2.acimut.toFixed(1)),
        },
      });
    }

    const sx = conteoVisible > 0 ? sxVisible : sxTotal;
    const sy = conteoVisible > 0 ? syVisible : syTotal;
    const sz = conteoVisible > 0 ? szVisible : szTotal;
    const norma = Math.hypot(sx, sy, sz) || 1;
    const centroAltRad = Math.asin(Math.max(-1, Math.min(1, sz / norma)));
    const centroAzRad = Math.atan2(sy, sx);
    const centroAltitud = Number(((centroAltRad * 180) / Math.PI).toFixed(1));
    const centroAcimutGrados = (centroAzRad * 180) / Math.PI;
    const centroAcimut = Number((((centroAcimutGrados % 360) + 360) % 360).toFixed(1));

    const visible = segmentos.some((s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0);

    return {
      codigo: constelacion.codigo,
      nombreEs: constelacion.nombreEs,
      nombreLatin: constelacion.nombreLatin,
      estacion: constelacion.estacion,
      segmentos,
      centroAltitud,
      centroAcimut,
      visible,
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

  if (astro.categoria === 'constelacion') {
    return [];
  }

  const catalogo =
    astro.categoria === 'estrella'
      ? CATALOGO_ESTRELLAS.find((e) => e.id === astro.id)
      : CATALOGO_MESSIER.find((m) => m.id === astro.id);

  if (!catalogo) return [];

  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);
  const { ra, dec } = precesarJ2000AFecha(
    catalogo.raHoras,
    catalogo.decGrados,
    fecha,
    rotacion
  );

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
