export type TemaVisual = 'oscuro' | 'claro' | 'rojo';

export interface Ubicacion {
  latitud: number;
  longitud: number;
  altitud: number;
  nombre: string;
}

export interface UbicacionFavorita extends Ubicacion {
  id: string;
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
  anguloFase?: number;
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
export interface FranjaHorariaMeteo {
  fechaISO: string;
  horaLocal: string;
  nubesTotal: number;
  vientoKmh: number;
  veredicto: CondicionesMeteo['veredicto'];
  esNoche: boolean;
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
  proximasHoras: FranjaHorariaMeteo[];
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

export interface LluviaAnual {
  id: string;
  nombre: string;
  mesPico: number; // 1-12
  diaPico: number;
  thz: number; // Meteoros por hora en condiciones ideales
  radiante: string;
}

export type FaseCrepusculo =
  | 'Día'
  | 'Crepúsculo civil'
  | 'Crepúsculo náutico'
  | 'Crepúsculo astronómico'
  | 'Noche astronómica';

export interface EstadoCieloSolar {
  altitudSol: number;
  fase: FaseCrepusculo;
}

export type CategoriaAstro = 'cuerpo' | 'estrella' | 'messier';

export interface AstroSeleccionado {
  id: string;
  nombre: string;
  categoria: CategoriaAstro;
}

export interface PuntoTrayectoria {
  altitud: number;
  acimut: number;
  horaEtiqueta: string;
}

export interface EfemeridesTransito {
  salida: Date | null;
  culminacion: Date | null;
  puesta: Date | null;
  alturaMaxima: number | null;
}

/** Vistas principales de la aplicación (navegación sin router). */
export type VistaActiva = 'observatorio' | 'guia';

/** Resultado de la solicitud de permiso de sensores (Safari iOS 13+). */
export type PermisoOrientacion = 'granted' | 'denied' | 'default';

/** Evento de orientación con la extensión propietaria de Safari iOS. */
export interface EventoOrientacionDispositivo extends DeviceOrientationEvent {
  /** Rumbo magnético en grados (0 = Norte), solo en WebKit/iOS. */
  readonly webkitCompassHeading?: number;
  /** Precisión estimada del rumbo en grados, solo en WebKit/iOS. */
  readonly webkitCompassAccuracy?: number;
}

/** Constructor de DeviceOrientationEvent con el método estático opcional de iOS. */
export interface ConstructorOrientacionConPermiso {
  requestPermission?: () => Promise<PermisoOrientacion>;
}

export type EstadoSensorBrujula =
  | 'inactivo'
  | 'solicitando'
  | 'buscando'
  | 'activo'
  | 'denegado'
  | 'no-disponible'
  | 'inseguro'
  | 'sin-lecturas';

export interface OrientacionBrujula {
  /** Rumbo en grados [0, 360). */
  rumbo: number;
  /** Cabeceo/inclinación del dispositivo en grados. */
  inclinacion: number;
}

export interface ObjetivoBrujula {
  id: string;
  nombre: string;
  acimut: number;
  altitud: number;
  color: string;
}