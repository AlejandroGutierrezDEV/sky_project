export type TemaVisual = 'oscuro' | 'claro' | 'rojo';

export interface Ubicacion {
  latitud: number;
  longitud: number;
  altitud: number;
  nombre: string;
}

export interface CuerpoCeleste {
  id: string;
  nombre: string;
  tipo: 'planeta' | 'luna';
  altitud: number;
  acimut: number;
  direccion: string;
  magnitud: number;
  iluminacion?: number;
  faseLunar?: string;
  visible: boolean;
  color: string;
}

export interface EstrellaCatalogo {
  id: string;
  nombre: string;
  constelacion: string;
  ra: number;
  dec: number;
  magnitud: number;
}

export interface EstrellaCalculada extends EstrellaCatalogo {
  altitud: number;
  acimut: number;
  visible: boolean;
}

export interface LineaConstelacion {
  constelacion: string;
  tramos: [string, string][];
}
export interface CondicionesMeteo {
  horaPronostico: string;
  nubesTotal: number;
  nubesBajas: number;
  nubesMedias: number;
  nubesAltas: number;
  humedad: number;
  vientoKmh: number;
  temperatura: number;
  veredicto: 'Excelente' | 'Aceptable' | 'Desfavorable';
  esCache?: boolean;
}
export type TipoMessier = 'nebulosa' | 'cumulo' | 'galaxia';

export interface ObjetoMessier {
  id: string;
  nombre: string;
  tipo: TipoMessier;
  constelacion: string;
  ra: number;
  dec: number;
  magnitud: number;
  dificultad: 'Fácil' | 'Moderada';
}

export interface MessierCalculado extends ObjetoMessier {
  altitud: number;
  acimut: number;
  visible: boolean;
}

export interface EventoCeleste {
  id: string;
  titulo: string;
  tipo: 'lluvia' | 'eclipse';
  fechaPico: Date;
  diasRestantes: number;
  resumen: string;
  detalle: string;
}