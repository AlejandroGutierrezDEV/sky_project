import * as Astronomy from 'astronomy-engine';
import type { CuerpoCeleste, EstrellaCalculada, MessierCalculado, Ubicacion } from '../types/astronomy';
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

export function calcularCielo(fecha: Date, ubicacion: Ubicacion): CuerpoCeleste[] {
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
    if (tipo === 'luna') {
      const anguloFase = Astronomy.MoonPhase(fecha);
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
      visible: horizontal.altitude > 5,
      color,
    };
  }).sort((a, b) => b.altitud - a.altitud);
}

export function calcularEstrellas(fecha: Date, ubicacion: Ubicacion): EstrellaCalculada[] {
  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  return ESTRELLAS_BRILLANTES.map((estrella) => {
    const horizontal = Astronomy.Horizon(fecha, observador, estrella.ra, estrella.dec, 'normal');
    return {
      ...estrella,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 0,
    };
  });
  
}
export function calcularMessier(fecha: Date, ubicacion: Ubicacion): MessierCalculado[] {
  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  return CATALOGO_MESSIER.map((obj) => {
    const horizontal = Astronomy.Horizon(fecha, observador, obj.ra, obj.dec, 'normal');
    return {
      ...obj,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 10,
    };
  });
}