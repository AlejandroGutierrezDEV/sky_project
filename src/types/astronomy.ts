export type TemaVisual = 'oscuro' | 'claro' | 'rojo';

export type ThemeMode = 'dark' | 'light';

export interface CelestialThemePalette {
  /** Color de fondo del canvas/escena */
  background: string;
  /** Color base de la esfera/cúpula celeste */
  domeSurface: string;
  /** Opacidad de la cúpula (0 a 1) */
  domeOpacity: number;
  /** Líneas de cuadrícula (azimut, altitud, eclíptica) */
  gridPrimary: string;
  gridSecondary: string;
  horizonLine: string;
  /** Puntos cardinales y etiquetas de texto en la bóveda */
  labelText: string;
  labelHalo: string;
  /** Colores por defecto de astros y constelaciones */
  starDefault: string;
  constellationLine: string;
  highlightAccent: string;
}

export interface ThemePalettes {
  dark: CelestialThemePalette;
  light: CelestialThemePalette;
}

/** Type guard obligatorio para validar lectura desde localStorage */
export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

/** Type guard para los tres temas visuales soportados por SkyProject */
export function esTemaVisual(valor: unknown): valor is TemaVisual {
  return valor === 'oscuro' || valor === 'claro' || valor === 'rojo';
}

export type EscalaBortle = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Clave de día civil en zona horaria IANA del observatorio (ej. "2026-11-28"). */
export type ClaveDiaCivil = string;

export interface GeoCoordinates {
  latitude: number; // Rango válido: [-90, 90]
  longitude: number; // Rango válido: [-180, 180]
  timezone: string; // Formato IANA (ej. "Europe/Madrid")
  name?: string;
}

export type MoonPhaseName =
  | 'Luna Nueva'
  | 'Luna Creciente'
  | 'Cuarto Creciente'
  | 'Gibosa Creciente'
  | 'Luna Llena'
  | 'Gibosa Menguante'
  | 'Cuarto Menguante'
  | 'Luna Menguante';

export interface LunarData {
  phase: number; // Normalizado [0, 1)
  phaseName: MoonPhaseName;
  illumination: number; // Porcentaje [0, 100]
  ageDays: number; // Días del ciclo sinódico (~0 - 29.53)
  moonrise: Date | null; // null si es circumpolar o no sale ese día
  moonset: Date | null; // null si no se pone ese día
  nextFullMoon: Date;
  nextNewMoon: Date;
}

export interface DailyHighlightItem {
  id: string;
  category: 'lunar' | 'solar' | 'planetary' | 'meteor' | 'visibility';
  title: string;
  subtitle: string;
  timestamp?: Date;
  priority: 1 | 2 | 3; // 1 = Máxima relevancia hoy
  badgeText?: string;
}

export interface TodayHighlightsState {
  items: DailyHighlightItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface DatosLunares {
  iluminacion: number; // 0 a 1 (0% a 100%)
  altitudGrados: number; // -90 a +90
  faseNombre: string;
}

export interface CalidadCieloCalculada {
  magnitudLimiteVisible: number; // Ej: 6.8 en Bortle 2 sin Luna -> 4.1 con Luna llena
  penalizacionLunar: number; // Magnitudes perdidas por brillo lunar
  veredicto: 'Excelente' | 'Bueno' | 'Regular' | 'Malo';
  motivoPrincipal: string;
}

export interface Ubicacion {
  latitud: number;
  longitud: number;
  altitud: number;
  nombre: string;
  bortle?: EscalaBortle;
  timezone?: string;
}

export interface UbicacionFavorita extends Ubicacion {
  id: string;
  bortle: EscalaBortle;
}

export type ObservatorioFavorito = UbicacionFavorita;

export interface CuerpoCeleste {
  id: string;
  nombre: string;
  tipo: 'planeta' | 'luna';
  altitud: number;
  acimut: number;
  direccion: string;
  magnitud: number;
  raHoras?: number;
  decGrados?: number;
  constelacionIAU?: string;
  iluminacion?: number;
  faseLunar?: MoonPhaseName;
  anguloFase?: number;
  visible: boolean;
  color: string;
}

export type TipoObjetoMessier =
  | 'Galaxia'
  | 'Nebulosa'
  | 'CumuloGlobular'
  | 'CumuloAbierto'
  | 'RemanenteSupernova'
  | 'Asterismo';

export type FiltroTipoUI = 'Todos' | 'Galaxia' | 'Nebulosa' | 'Cumulo';

export type InstrumentoObservacion = 'Ojo desnudo' | 'Prismaticos' | 'Telescopio';

export type EstacionAstronomica =
  | 'Invierno'
  | 'Primavera'
  | 'Verano'
  | 'Otono'
  | 'Circumpolar';

export interface EstrellaCatalogo {
  id: string; // Código Bayer/Flamsteed o HIP
  nombre?: string;
  magnitud: number; // <= 4.0
  raHoras: number;
  decGrados: number;
  indiceColorBV?: number;
}

export interface EstrellaCalculada extends EstrellaCatalogo {
  altitud: number;
  acimut: number;
  visible: boolean;
}

export interface ConstelacionIAU {
  codigo: string; // Código oficial IAU 3 letras
  nombreEs: string;
  nombreLatin: string;
  estacion: EstacionAstronomica;
  // Pares de coordenadas [raHoras, decGrados] para dibujar los asterismos
  segmentos: Array<[[number, number], [number, number]]>;
}

export interface SegmentoHorizontalConstelacion {
  desde: { altitud: number; acimut: number };
  hasta: { altitud: number; acimut: number };
}

export interface ConstelacionCalculada {
  codigo: string;
  nombreEs: string;
  nombreLatin: string;
  estacion: EstacionAstronomica;
  segmentos: SegmentoHorizontalConstelacion[];
  centroAltitud: number;
  centroAcimut: number;
  visible: boolean;
}

export interface FiltrosCatalogo {
  tipo: FiltroTipoUI;
  instrumento: InstrumentoObservacion | 'Todos';
  soloPorEncimaHorizonte: boolean;
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
export interface ObjetoMessier {
  id: string; // 'M1' .. 'M110'
  nombreNGC: string;
  nombreComun?: string;
  tipo: TipoObjetoMessier;
  magnitud: number;
  raHoras: number; // Ascensión Recta J2000 (0 a 24)
  decGrados: number; // Declinación J2000 (-90 a +90)
  constelacionIAU: string; // Código 3 letras (ej. 'ORI', 'AND')
  instrumentoMinimo: InstrumentoObservacion;
  tamanoArcmin: string;
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

export type CategoriaAstro = 'cuerpo' | 'estrella' | 'messier' | 'constelacion';

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
export type VistaActiva = 'observatorio' | 'carta' | 'guia';

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
  /** Rumbo magnético/geográfico en grados [0, 360). */
  rumbo: number;
  /** Inclinación visual para la perspectiva 3D del disco en grados [-65, 65]. */
  inclinacion: number;
  /** Altitud real de apuntado sobre el horizonte en grados [-90, 90]. */
  altitudApuntado: number;
}

export interface ObjetivoBrujula {
  id: string;
  nombre: string;
  acimut: number;
  altitud: number;
  color: string;
  bajoHorizonte?: boolean;
}

export const SOLAR_SYSTEM_PLANET_IDS = [
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

export type PlanetId = (typeof SOLAR_SYSTEM_PLANET_IDS)[number];

/** 'all' muestra todos los planetas en la brújula; un PlanetId enfoca solo ese planeta */
export type CompassPlanetFilter = PlanetId | 'all';

export interface CompassPlanetOption {
  id: PlanetId;
  name: string;
  /** Azimut en grados [0, 360) */
  azimuthDeg: number;
  /** Altitud en grados [-90, 90] */
  altitudeDeg: number;
  /** True si altitudeDeg > 0 */
  isAboveHorizon: boolean;
  /** Color identificativo consistente con el mapa/bóveda */
  accentColor?: string;
}

export interface UseCompassFilterResult {
  selectedFilter: CompassPlanetFilter;
  setSelectedFilter: (filter: CompassPlanetFilter) => void;
  planetOptions: CompassPlanetOption[];
  activePlanets: CompassPlanetOption[];
  isLoading: boolean;
  error: string | null;
}

/** Type guard para validar entradas externas o persistencia en localStorage */
export function isCompassPlanetFilter(value: unknown): value is CompassPlanetFilter {
  return (
    value === 'all' ||
    (typeof value === 'string' &&
      (SOLAR_SYSTEM_PLANET_IDS as readonly string[]).includes(value))
  );
}

export type ModoMapa = '2D' | '3D';

export interface CapasMapa {
  constelaciones: boolean;
  estrellas: boolean;
  messier: boolean;
}

export interface PreferenciasVisualizacion {
  modoMapa: ModoMapa;
  capas: CapasMapa;
}

export type CategoriaAstroObjetivo = 'messier' | 'estrella' | 'planeta';

export type EstadoVisibilidadObjetivo = 'optimo_noche' | 'visible_parcial' | 'nunca_sale';

export interface ObjetivoSesion {
  id: string; // Ej: 'messier-M31', 'estrella-HIP32349'
  codigo: string; // 'M31', 'Sirio'
  nombre: string;
  categoria: CategoriaAstroObjetivo;
  magnitud: number;
  constelacion: string;
  raHoras: number;
  decGrados: number;
  observado: boolean;
  notas?: string;
}

export interface ObjetivoPlanificado extends ObjetivoSesion {
  horaCulminacion: Date | null; // Paso por el meridiano local
  altitudMaximaGrados: number; // 90 - |latitud - decGrados|
  estadoVisibilidad: EstadoVisibilidadObjetivo;
  etiquetaHoraria: string; // Ej: '01:42 (Alt. máx 78°)' o 'No visible desde esta latitud'
}

export interface MetadatosExportacionSesion {
  ubicacionNombre: string;
  bortle: number;
  faseLunar: string;
  fecha: Date;
}
