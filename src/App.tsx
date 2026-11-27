import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Compass,
  Moon,
  Sun,
  Calendar,
  MapPin,
  Crosshair,
  Clock,
  Layers,
  Play,
  Pause,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  calcularCielo,
  calcularEstadoSolar,
  calcularTransitoCuerpo,
  calcularTrayectoriaAstro,
} from './core/skyCalculator';
import { obtenerCondicionesMeteo } from './core/weatherService';
import { calcularProximosEventos } from './core/eventsCalculator';
import { SkyMap } from './components/SkyMap';
import { BarraFiltrosCatalogo } from './components/BarraFiltrosCatalogo';
import { WeatherPanel } from './components/WeatherPanel';
import { EventsPanel } from './components/EventsPanel';
import { StarfieldBackground } from './components/StarfieldBackground';
import { MoonPhase3D } from './components/MoonPhase3D';
import { Navbar } from './components/Navbar';
import { AstronomyGuide } from './components/AstronomyGuide';
import { Compass3DModal } from './components/Compass3DModal';
import { CelestialDetailSheet } from './components/CelestialDetailSheet';
import {
  HojaImpresionSesion,
  PlanificadorSesionModal,
} from './components/PlanificadorSesionModal';
import { TodayHighlightsWidget } from './components/widgets/TodayHighlightsWidget';
import { useCelestialFocus } from './hooks/useCelestialFocus';
import { useLocation, MAX_NOMBRE_UBICACION, esUbicacionValida } from './hooks/useLocation';
import { useLunarData } from './hooks/useLunarData';
import { useTodayHighlights } from './hooks/useTodayHighlights';
import { usePreferenciasMapa } from './hooks/usePreferenciasMapa';
import { useTemaVisual } from './hooks/useTemaVisual';
import {
  usePlanificadorSesion,
  type EntradaObjetivoSesion,
} from './hooks/usePlanificadorSesion';
import {
  FILTROS_CATALOGO_POR_DEFECTO,
  useFiltrosCatalogo,
} from './hooks/useFiltrosCatalogo';
import { obtenerNombreConstelacionIAU } from './data/constelacionesIAU';
import {
  BORTLE_POR_DEFECTO,
  DESCRIPCIONES_BORTLE,
  NIVELES_BORTLE,
  calcularCalidadCielo,
  esEscalaBortleValida,
  normalizarEscalaBortle,
} from './utils/astronomia/calidadCielo';
import {
  TEXTO_SIN_OCASO,
  TEXTO_SIN_ORTO,
  esZonaHorariaIANAValida,
  formatearHoraEnZona,
  inferirZonaHorariaPorCoordenadas,
  normalizarZonaHoraria,
} from './utils/lunarCalculations';
import type { LiveEphemerisSnapshot } from './types/celestialDetails';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CondicionesMeteo,
  CuerpoCeleste,
  DatosLunares,
  EfemeridesTransito,
  EscalaBortle,
  FiltrosCatalogo,
  MetadatosExportacionSesion,
  ObjetivoBrujula,
  ObjetivoPlanificado,
  TemaVisual,
  Ubicacion,
  UbicacionFavorita,
  VistaActiva,
} from './types/astronomy';

const CLAVE_FAVORITOS = 'skyproject_favoritos_v1';
const MAX_FAVORITOS = 8;
const MAX_RESULTADOS_BUSQUEDA = 8;
const UMBRAL_COORD_DUPLICADA = 0.01;

const ZONAS_HORARIAS_COMUNES: readonly { id: string; etiqueta: string }[] = [
  { id: 'auto', etiqueta: 'Automática (según coordenadas)' },
  { id: 'Europe/Madrid', etiqueta: 'Europe/Madrid (Península)' },
  { id: 'Atlantic/Canary', etiqueta: 'Atlantic/Canary (Canarias)' },
  { id: 'Europe/London', etiqueta: 'Europe/London (UTC/BST)' },
  { id: 'Europe/Berlin', etiqueta: 'Europe/Berlin (Europa Central)' },
  { id: 'Arctic/Longyearbyen', etiqueta: 'Arctic/Longyearbyen (Ártico)' },
  { id: 'America/New_York', etiqueta: 'America/New_York (Este EE. UU.)' },
  { id: 'America/Los_Angeles', etiqueta: 'America/Los_Angeles (Pacífico)' },
  { id: 'America/Santiago', etiqueta: 'America/Santiago (Chile / Andes)' },
  { id: 'Asia/Tokyo', etiqueta: 'Asia/Tokyo (Japón)' },
  { id: 'Australia/Sydney', etiqueta: 'Australia/Sydney (Australia)' },
  { id: 'UTC', etiqueta: 'UTC (Tiempo Universal)' },
];

const CLASES_CONTENEDOR: Record<TemaVisual, string> = {
  oscuro: 'bg-transparent text-slate-100',
  claro: 'bg-transparent text-slate-900',
  rojo: 'bg-transparent text-red-500',
};

const CLASES_TARJETA: Record<TemaVisual, string> = {
  oscuro:
    'hud-esquinas hud-oscuro bg-slate-900/55 backdrop-blur-md border-cyan-400/15',
  claro: 'hud-esquinas hud-claro bg-slate-50/92 backdrop-blur-md border-slate-300 shadow-md shadow-slate-900/8',
  rojo: 'hud-esquinas hud-rojo bg-black/90 border-red-900/70',
};

const CLASES_HOVER_TARJETA: Record<TemaVisual, string> = {
  oscuro: 'hover:border-sky-500/40',
  claro: 'hover:border-slate-400 hover:shadow-lg',
  rojo: 'hover:border-red-600/80',
};

interface FormularioUbicacion {
  nombre: string;
  latitud: string;
  longitud: string;
  altitud: string;
  bortle: EscalaBortle;
  timezone: string;
}

interface ErroresUbicacion {
  latitud?: string;
  longitud?: string;
  altitud?: string;
}

interface ResultadoBusquedaAstro {
  id: string;
  categoria: CategoriaAstro;
  nombreSeleccion: string;
  titulo: string;
  subtitulo: string;
  altitud: number;
  sobreHorizonte: boolean;
  textoBusqueda: string;
  prioridadInicio: boolean;
}

function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarUbicacionFavorita(valor: unknown): UbicacionFavorita | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const obj = valor as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.trim().length === 0) return null;
  if (!esUbicacionValida(valor)) return null;

  return {
    id: obj.id,
    nombre: valor.nombre,
    latitud: valor.latitud,
    longitud: valor.longitud,
    altitud: valor.altitud,
    bortle: normalizarEscalaBortle(valor.bortle),
    timezone: normalizarZonaHoraria(valor.timezone, valor.latitud, valor.longitud),
  };
}

/**
 * Parsea la lista de observatorios favoritos desde localStorage garantizando
 * retrocompatibilidad con registros antiguos sin campo `bortle` (asigna 4).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function parsearFavoritosGuardados(raw: string | null): UbicacionFavorita[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const resultados: UbicacionFavorita[] = [];
    for (const item of parsed) {
      const normalizado = normalizarUbicacionFavorita(item);
      if (normalizado) {
        resultados.push(normalizado);
        if (resultados.length >= MAX_FAVORITOS) break;
      }
    }
    return resultados;
  } catch {
    return [];
  }
}

function leerFavoritosGuardados(): UbicacionFavorita[] {
  try {
    return parsearFavoritosGuardados(localStorage.getItem(CLAVE_FAVORITOS));
  } catch {
    return [];
  }
}

function generarIdFavorito(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function esUbicacionDuplicada(a: Ubicacion, b: Ubicacion): boolean {
  const mismoNombre =
    normalizarTextoBusqueda(a.nombre) !== '' &&
    normalizarTextoBusqueda(a.nombre) === normalizarTextoBusqueda(b.nombre);
  const coordenadasCercanas =
    Math.abs(a.latitud - b.latitud) < UMBRAL_COORD_DUPLICADA &&
    Math.abs(a.longitud - b.longitud) < UMBRAL_COORD_DUPLICADA;
  return mismoNombre || coordenadasCercanas;
}

function guardarEnStorage(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Ignora errores de cuota o modo privado restringido
  }
}

function parsearNumeroEstricto(texto: string): number {
  const limpio = texto.trim();
  if (limpio === '') return Number.NaN;
  return Number(limpio);
}

function validarFormularioUbicacion(form: FormularioUbicacion): {
  errores: ErroresUbicacion;
  ubicacionValida: Ubicacion | null;
} {
  const errores: ErroresUbicacion = {};
  const lat = parsearNumeroEstricto(form.latitud);
  const lon = parsearNumeroEstricto(form.longitud);
  const alt = parsearNumeroEstricto(form.altitud);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errores.latitud = 'Debe estar entre -90 y 90.';
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errores.longitud = 'Debe estar entre -180 y 180.';
  }
  if (!Number.isFinite(alt) || alt < -500 || alt > 9000) {
    errores.altitud = 'Debe estar entre -500 y 9000 m.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, ubicacionValida: null };
  }

  const timezoneResuelta =
    form.timezone === 'auto' || !esZonaHorariaIANAValida(form.timezone)
      ? inferirZonaHorariaPorCoordenadas(lat, lon)
      : form.timezone;

  return {
    errores,
    ubicacionValida: {
      nombre: form.nombre.slice(0, MAX_NOMBRE_UBICACION),
      latitud: lat,
      longitud: lon,
      altitud: alt,
      bortle: normalizarEscalaBortle(form.bortle),
      timezone: timezoneResuelta,
    },
  };
}

function obtenerClaseOptionSelect(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-black text-red-500';
  if (tema === 'claro') return 'bg-slate-50 text-slate-900';
  return 'bg-slate-950 text-slate-100';
}

function obtenerClaseBotonAplicar(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/70 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800';
  return 'border-sky-500/60 bg-sky-600 text-white hover:bg-sky-500';
}

function obtenerClaseErrorInline(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-rose-400 bg-rose-50 text-rose-800';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function obtenerEstadoVisibilidadCuerpo(cuerpo: CuerpoCeleste): {
  etiqueta: string;
  opacidad: string;
} {
  if (cuerpo.altitud > 5) {
    return { etiqueta: 'Sobre el horizonte', opacidad: 'opacity-100' };
  }
  if (cuerpo.altitud > 0) {
    return { etiqueta: 'Muy bajo en el horizonte', opacidad: 'opacity-85' };
  }
  return { etiqueta: 'Bajo el horizonte', opacidad: 'opacity-65' };
}

function formatearFechaParaInput(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const copia = new Date(valida);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 16);
}

function obtenerClaseBotonControlActivo(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'opacity-75 hover:opacity-100';
  if (tema === 'rojo') return 'bg-red-950 text-red-500 border border-red-600';
  if (tema === 'claro') return 'bg-slate-800 text-white';
  return 'bg-sky-600 text-white';
}

function obtenerClaseTarjetaSeleccionada(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-500 ring-1 ring-red-500/50';
  if (tema === 'claro') return 'border-sky-600 ring-1 ring-sky-600/30';
  return 'border-sky-400/80 ring-1 ring-sky-400/40';
}

function obtenerClaseDesplegableBusqueda(tema: TemaVisual): string {
  if (tema === 'rojo') return 'bg-black border-red-700 text-red-500 shadow-lg shadow-black/80';
  if (tema === 'claro')
    return 'bg-slate-50/95 border-slate-300 text-slate-900 shadow-lg shadow-slate-900/12 backdrop-blur-md';
  return 'bg-slate-950/95 border-slate-700 text-slate-100 shadow-xl shadow-black/60 backdrop-blur-md';
}

function obtenerClaseItemBusqueda(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'hover:bg-current/10';
  if (tema === 'rojo') return 'bg-red-950/80 text-red-400';
  if (tema === 'claro') return 'bg-sky-100 text-slate-900';
  return 'bg-sky-500/20 text-sky-100';
}

function obtenerClaseInsigniaHorizonte(tema: TemaVisual, sobreHorizonte: boolean): string {
  if (!sobreHorizonte) return 'border-current/25 opacity-75';
  if (tema === 'rojo') return 'border-red-600/80 bg-red-950/50 text-red-400';
  if (tema === 'claro') return 'border-emerald-400 bg-emerald-50 text-emerald-800';
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
}

function obtenerClaseChipFavorito(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:border-current/45';
  if (tema === 'rojo') return 'border-red-500 bg-red-950/60 text-red-400';
  if (tema === 'claro') return 'border-sky-600 bg-sky-50 text-sky-900';
  return 'border-sky-400/70 bg-sky-500/15 text-sky-200';
}

function obtenerClaseBotonRestablecer(tema: TemaVisual, confirmando: boolean): string {
  if (confirmando) {
    if (tema === 'rojo') return 'border-red-500 bg-red-950 text-red-300 hover:bg-red-900/80';
    if (tema === 'claro') return 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700';
    return 'border-rose-500 bg-rose-600/90 text-white hover:bg-rose-500';
  }
  if (tema === 'rojo') return 'border-red-800/80 text-red-400 hover:bg-red-950/60';
  if (tema === 'claro') return 'border-rose-300 text-rose-700 hover:bg-rose-50';
  return 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15';
}

function obtenerClaseAvisoExito(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
}

function obtenerClaseBotonObjetivoPlaneta(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:bg-current/10';
  if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
  if (tema === 'claro') return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
  return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
}

function obtenerConstelacionEstrella(idEstrella: string): string {
  const partes = idEstrella.trim().split(/\s+/);
  const sufijo = partes[partes.length - 1] ?? '';
  if (sufijo.length === 3) {
    return obtenerNombreConstelacionIAU(sufijo.toUpperCase());
  }
  return '—';
}

function construirObjetivoPlaneta(cuerpo: CuerpoCeleste): EntradaObjetivoSesion | null {
  if (cuerpo.tipo !== 'planeta') return null;
  if (typeof cuerpo.raHoras !== 'number' || typeof cuerpo.decGrados !== 'number') return null;
  return {
    id: `planeta-${cuerpo.id}`,
    codigo: cuerpo.nombre,
    nombre: cuerpo.nombre,
    categoria: 'planeta',
    magnitud: cuerpo.magnitud,
    constelacion: cuerpo.constelacionIAU
      ? obtenerNombreConstelacionIAU(cuerpo.constelacionIAU)
      : 'Eclíptica',
    raHoras: cuerpo.raHoras,
    decGrados: cuerpo.decGrados,
  };
}

export function App() {
  const {
    ubicacion,
    coordinates,
    cargandoGPS,
    errorGPS,
    actualizarUbicacion,
    detectarGPS: detectarGPSHook,
    limpiarErrorGPS,
    restablecerUbicacion,
  } = useLocation();
  const [formUbicacion, setFormUbicacion] = useState<FormularioUbicacion>(() => ({
    nombre: ubicacion.nombre,
    latitud: String(ubicacion.latitud),
    longitud: String(ubicacion.longitud),
    altitud: String(ubicacion.altitud),
    bortle: normalizarEscalaBortle(ubicacion.bortle),
    timezone: coordinates.timezone,
  }));

  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [favoritos, setFavoritos] = useState<UbicacionFavorita[]>(leerFavoritosGuardados);
  const [avisoFavorito, setAvisoFavorito] = useState<string | null>(null);

  const [fechaStr, setFechaStr] = useState<string>(() => formatearFechaParaInput(new Date()));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidadMinPorSeg, setVelocidadMinPorSeg] = useState<15 | 60>(15);
  const [contadorFoco, setContadorFoco] = useState(0);

  const [busquedaAstro, setBusquedaAstro] = useState('');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [indiceResultadoActivo, setIndiceResultadoActivo] = useState(0);
  const buscadorRef = useRef<HTMLDivElement | null>(null);

  const { tema, setTema, restablecerTema } = useTemaVisual();
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('observatorio');
  const [brujulaAbierta, setBrujulaAbierta] = useState(false);
  const [planificadorAbierto, setPlanificadorAbierto] = useState(false);

  const {
    selectedBodyId,
    isFocusActive,
    isSheetOpen,
    sheetStatus,
    sheetData,
    errorMessage,
    selectBody,
    toggleSheet,
    clearFocus,
  } = useCelestialFocus({
    disableEscapeKey: brujulaAbierta || planificadorAbierto || buscadorAbierto,
  });

  const enfocarAstro = useCallback(
    (bodyId: string) => {
      selectBody(bodyId);
      setContadorFoco((prev) => prev + 1);
    },
    [selectBody]
  );
  const {
    preferencias,
    toggleCapa,
    setModoMapa,
    resetearDatosLocales,
  } = usePreferenciasMapa();
  const [filtrosCatalogo, setFiltrosCatalogo] = useState<FiltrosCatalogo>(
    FILTROS_CATALOGO_POR_DEFECTO
  );
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [avisoReset, setAvisoReset] = useState<string | null>(null);
  const timeoutResetRef = useRef<number | null>(null);
  const omitirGuardadoFavoritosRef = useRef(true);

  const coordenadasEstables = useMemo<Ubicacion>(
    () => ({
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      altitud: ubicacion.altitud,
      nombre: '',
      timezone: coordinates.timezone,
    }),
    [ubicacion.latitud, ubicacion.longitud, ubicacion.altitud, coordinates.timezone]
  );

  const fechaSeleccionada = useMemo(() => {
    const fecha = new Date(fechaStr);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }, [fechaStr]);

  const claveHoraUTC = fechaSeleccionada.toISOString().slice(0, 13);
  const claveConsultaMeteo = `${claveHoraUTC}|${coordenadasEstables.latitud.toFixed(2)}|${coordenadasEstables.longitud.toFixed(2)}|${coordinates.timezone}`;
  const [estadoMeteo, setEstadoMeteo] = useState<{
    clave: string;
    datos: CondicionesMeteo | null;
    aviso: string | null;
  }>({
    clave: '',
    datos: null,
    aviso: null,
  });

  const cargandoMeteo = estadoMeteo.clave !== claveConsultaMeteo;

  const { errores: erroresUbicacion, ubicacionValida: ubicacionFormularioValida } = useMemo(
    () => validarFormularioUbicacion(formUbicacion),
    [formUbicacion]
  );

  const hayErroresUbicacion = Object.keys(erroresUbicacion).length > 0;
  const bortleActual = normalizarEscalaBortle(ubicacion.bortle);
  const ubicacionSinCambios =
    ubicacionFormularioValida !== null &&
    ubicacionFormularioValida.nombre === ubicacion.nombre &&
    ubicacionFormularioValida.latitud === ubicacion.latitud &&
    ubicacionFormularioValida.longitud === ubicacion.longitud &&
    ubicacionFormularioValida.altitud === ubicacion.altitud &&
    normalizarEscalaBortle(ubicacionFormularioValida.bortle) === bortleActual &&
    (ubicacionFormularioValida.timezone ?? coordinates.timezone) === coordinates.timezone;

  useEffect(() => {
    if (omitirGuardadoFavoritosRef.current) {
      omitirGuardadoFavoritosRef.current = false;
      return;
    }
    guardarEnStorage(CLAVE_FAVORITOS, JSON.stringify(favoritos));
  }, [favoritos]);

  useEffect(() => {
    return () => {
      if (timeoutResetRef.current !== null) {
        window.clearTimeout(timeoutResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!buscadorAbierto) return;
    const manejarClickExterior = (evento: globalThis.PointerEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(evento.target as Node)) {
        setBuscadorAbierto(false);
      }
    };
    document.addEventListener('pointerdown', manejarClickExterior);
    return () => {
      document.removeEventListener('pointerdown', manejarClickExterior);
    };
  }, [buscadorAbierto]);

  useEffect(() => {
    if (!reproduciendo) return;
    const intervalo = window.setInterval(() => {
      setFechaStr((prev) => {
        const actual = new Date(prev);
        const base = Number.isNaN(actual.getTime()) ? new Date() : actual;
        const siguiente = new Date(base.getTime() + velocidadMinPorSeg * 60_000);
        return formatearFechaParaInput(siguiente);
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [reproduciendo, velocidadMinPorSeg]);

  useEffect(() => {
    const controller = new AbortController();
    const temporizador = window.setTimeout(() => {
      obtenerCondicionesMeteo(
        new Date(`${claveHoraUTC}:00:00Z`),
        coordenadasEstables,
        controller.signal
      )
        .then(({ datos, aviso }) => {
          if (controller.signal.aborted) return;
          setEstadoMeteo({ clave: claveConsultaMeteo, datos, aviso });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          if (controller.signal.aborted) return;
          setEstadoMeteo({
            clave: claveConsultaMeteo,
            datos: null,
            aviso: 'No se pudo obtener la previsión meteorológica.',
          });
        });
    }, 400);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [claveConsultaMeteo, claveHoraUTC, coordenadasEstables]);

  const estadoSolar = useMemo(
    () => calcularEstadoSolar(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const cuerpos = useMemo(
    () => calcularCielo(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const { lunarData } = useLunarData(coordinates, fechaSeleccionada, ubicacion.altitud);

  const {
    items: destacadosHoy,
    isLoading: cargandoDestacados,
    error: errorDestacados,
    lastUpdated: destacadosActualizadosEn,
    refetch: recargarDestacados,
  } = useTodayHighlights(coordinates, lunarData, {
    referenceDate: fechaSeleccionada,
    altitudeMeters: ubicacion.altitud,
    bortle: bortleActual,
    meteo: estadoMeteo.datos,
  });

  const datosLunares = useMemo<DatosLunares>(() => {
    const luna = cuerpos.find((c) => c.tipo === 'luna');
    if (!luna) {
      return {
        iluminacion: lunarData ? lunarData.illumination / 100 : 0,
        altitudGrados: -90,
        faseNombre: lunarData?.phaseName ?? 'Luna Nueva',
      };
    }
    return {
      iluminacion: (lunarData ? lunarData.illumination : (luna.iluminacion ?? 0)) / 100,
      altitudGrados: luna.altitud,
      faseNombre: lunarData?.phaseName ?? luna.faseLunar ?? 'Luna',
    };
  }, [cuerpos, lunarData]);

  const calidadCielo = useMemo(
    () => calcularCalidadCielo(estadoMeteo.datos?.nubesTotal ?? 0, bortleActual, datosLunares),
    [estadoMeteo.datos?.nubesTotal, bortleActual, datosLunares]
  );

  const {
    estrellas,
    messier,
    constelaciones,
    estrellasCompletas,
    messierCompletos,
    constelacionesCompletas,
    magnitudLimiteEfectiva,
    totalMessierSobreHorizonte,
  } = useFiltrosCatalogo({
    ubicacion: coordenadasEstables,
    fecha: fechaSeleccionada,
    magnitudLimiteVisible: calidadCielo.magnitudLimiteVisible,
    filtros: filtrosCatalogo,
  });

  const contextoSeleccionado = useMemo<{
    astro: AstroSeleccionado | null;
    ephemeris: LiveEphemerisSnapshot | null;
    fallbackName: string;
    fallbackSubtitle: string;
  }>(() => {
    if (!selectedBodyId) {
      return {
        astro: null,
        ephemeris: null,
        fallbackName: 'Objeto celeste',
        fallbackSubtitle: 'Catálogo astronómico',
      };
    }

    const cuerpo = cuerpos.find((c) => c.id === selectedBodyId);
    if (cuerpo) {
      return {
        astro: { id: cuerpo.id, nombre: cuerpo.nombre, categoria: 'cuerpo' },
        ephemeris: {
          azimuthDeg: cuerpo.acimut,
          altitudeDeg: cuerpo.altitud,
          isAboveHorizon: cuerpo.altitud > 0,
          magnitude: cuerpo.magnitud,
        },
        fallbackName: cuerpo.nombre,
        fallbackSubtitle: cuerpo.tipo === 'luna' ? 'Luna' : 'Planeta del Sistema Solar',
      };
    }

    const constelacion = constelacionesCompletas.find((c) => c.codigo === selectedBodyId);
    if (constelacion) {
      const tieneVisible = constelacion.segmentos.some(
        (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
      );
      return {
        astro: {
          id: constelacion.codigo,
          nombre: constelacion.nombreEs,
          categoria: 'constelacion',
        },
        ephemeris: {
          azimuthDeg: constelacion.centroAcimut,
          altitudeDeg: constelacion.centroAltitud,
          isAboveHorizon: tieneVisible || constelacion.centroAltitud >= 0,
        },
        fallbackName: constelacion.nombreEs,
        fallbackSubtitle: `Constelación IAU · ${constelacion.nombreLatin} (${constelacion.codigo})`,
      };
    }

    const objMessier = messierCompletos.find((m) => m.id === selectedBodyId);
    if (objMessier) {
      const nombreMessier = objMessier.nombreComun
        ? `${objMessier.id} · ${objMessier.nombreComun}`
        : `${objMessier.id} · ${objMessier.nombreNGC}`;
      return {
        astro: { id: objMessier.id, nombre: nombreMessier, categoria: 'messier' },
        ephemeris: {
          azimuthDeg: objMessier.acimut,
          altitudeDeg: objMessier.altitud,
          isAboveHorizon: objMessier.altitud >= 0,
          magnitude: objMessier.magnitud,
        },
        fallbackName: nombreMessier,
        fallbackSubtitle: `${objMessier.tipo} (${objMessier.nombreNGC}) · ${obtenerNombreConstelacionIAU(
          objMessier.constelacionIAU
        )}`,
      };
    }

    const estrella = estrellasCompletas.find((e) => e.id === selectedBodyId);
    if (estrella) {
      const nombreEstrella = estrella.nombre ?? estrella.id;
      return {
        astro: { id: estrella.id, nombre: nombreEstrella, categoria: 'estrella' },
        ephemeris: {
          azimuthDeg: estrella.acimut,
          altitudeDeg: estrella.altitud,
          isAboveHorizon: estrella.altitud >= 0,
          magnitude: estrella.magnitud,
        },
        fallbackName: nombreEstrella,
        fallbackSubtitle: `Estrella (${estrella.id}) · ${obtenerConstelacionEstrella(estrella.id)}`,
      };
    }

    return {
      astro: null,
      ephemeris: null,
      fallbackName: selectedBodyId,
      fallbackSubtitle: 'Catálogo astronómico',
    };
  }, [selectedBodyId, cuerpos, constelacionesCompletas, messierCompletos, estrellasCompletas]);

  const astroSeleccionado = contextoSeleccionado.astro;

  const {
    objetivosPlanificados,
    idsEnSesion,
    totalObjetivos: totalObjetivosSesion,
    toggleObjetivo,
    marcarObservado,
    actualizarNota,
    limpiarSesion,
  } = usePlanificadorSesion({
    latitud: coordenadasEstables.latitud,
    longitud: coordenadasEstables.longitud,
    fechaReferencia: fechaSeleccionada,
  });

  const metadatosSesion = useMemo<MetadatosExportacionSesion>(
    () => ({
      ubicacionNombre: ubicacion.nombre || 'Observatorio sin nombre',
      bortle: bortleActual,
      faseLunar: datosLunares.faseNombre,
      fecha: fechaSeleccionada,
    }),
    [ubicacion.nombre, bortleActual, datosLunares.faseNombre, fechaSeleccionada]
  );

  const objetivoDetalleSeleccionado = useMemo<EntradaObjetivoSesion | null>(() => {
    if (!astroSeleccionado || astroSeleccionado.categoria === 'constelacion') return null;
    if (astroSeleccionado.categoria === 'messier') {
      const obj = messierCompletos.find((m) => m.id === astroSeleccionado.id);
      if (!obj) return null;
      return {
        id: `messier-${obj.id}`,
        codigo: obj.id,
        nombre: obj.nombreComun ?? obj.nombreNGC,
        categoria: 'messier',
        magnitud: obj.magnitud,
        constelacion: obtenerNombreConstelacionIAU(obj.constelacionIAU),
        raHoras: obj.raHoras,
        decGrados: obj.decGrados,
      };
    }
    if (astroSeleccionado.categoria === 'estrella') {
      const estrella = estrellasCompletas.find((e) => e.id === astroSeleccionado.id);
      if (!estrella) return null;
      return {
        id: `estrella-${estrella.id}`,
        codigo: estrella.nombre ?? estrella.id,
        nombre: estrella.nombre ? `${estrella.nombre} (${estrella.id})` : estrella.id,
        categoria: 'estrella',
        magnitud: estrella.magnitud,
        constelacion: obtenerConstelacionEstrella(estrella.id),
        raHoras: estrella.raHoras,
        decGrados: estrella.decGrados,
      };
    }
    const cuerpo = cuerpos.find((c) => c.id === astroSeleccionado.id);
    if (!cuerpo) return null;
    return construirObjetivoPlaneta(cuerpo);
  }, [astroSeleccionado, messierCompletos, estrellasCompletas, cuerpos]);

  const resultadosBusqueda = useMemo<ResultadoBusquedaAstro[]>(() => {
    const consulta = normalizarTextoBusqueda(busquedaAstro);
    if (!consulta) return [];

    const coincidencias: ResultadoBusquedaAstro[] = [];

    for (const cuerpo of cuerpos) {
      const nombreNorm = normalizarTextoBusqueda(cuerpo.nombre);
      const idNorm = normalizarTextoBusqueda(cuerpo.id);
      if (nombreNorm.includes(consulta) || idNorm.includes(consulta)) {
        coincidencias.push({
          id: cuerpo.id,
          categoria: 'cuerpo',
          nombreSeleccion: cuerpo.nombre,
          titulo: cuerpo.nombre,
          subtitulo: cuerpo.tipo === 'luna' ? 'Luna' : 'Planeta',
          altitud: cuerpo.altitud,
          sobreHorizonte: cuerpo.altitud > 0,
          textoBusqueda: nombreNorm,
          prioridadInicio: nombreNorm.startsWith(consulta),
        });
      }
    }

    for (const constelacion of constelacionesCompletas) {
      const nombreEsNorm = normalizarTextoBusqueda(constelacion.nombreEs);
      const nombreLatinNorm = normalizarTextoBusqueda(constelacion.nombreLatin);
      const codigoNorm = normalizarTextoBusqueda(constelacion.codigo);
      if (
        nombreEsNorm.includes(consulta) ||
        nombreLatinNorm.includes(consulta) ||
        codigoNorm.includes(consulta)
      ) {
        const tieneVisible = constelacion.segmentos.some(
          (s) => s.desde.altitud >= 0 && s.hasta.altitud >= 0
        );
        coincidencias.push({
          id: constelacion.codigo,
          categoria: 'constelacion',
          nombreSeleccion: constelacion.nombreEs,
          titulo: constelacion.nombreEs,
          subtitulo: `Constelación (${constelacion.codigo}) · ${constelacion.nombreLatin}`,
          altitud: constelacion.centroAltitud,
          sobreHorizonte: tieneVisible || constelacion.centroAltitud >= 0,
          textoBusqueda: `${nombreEsNorm} ${nombreLatinNorm} ${codigoNorm}`,
          prioridadInicio:
            nombreEsNorm.startsWith(consulta) ||
            nombreLatinNorm.startsWith(consulta) ||
            codigoNorm === consulta,
        });
      }
    }

    for (const estrella of estrellasCompletas) {
      const nombreEstrella = estrella.nombre ?? estrella.id;
      const nombreNorm = normalizarTextoBusqueda(nombreEstrella);
      const idNorm = normalizarTextoBusqueda(estrella.id);
      if (nombreNorm.includes(consulta) || idNorm.includes(consulta)) {
        coincidencias.push({
          id: estrella.id,
          categoria: 'estrella',
          nombreSeleccion: nombreEstrella,
          titulo: nombreEstrella,
          subtitulo: estrella.nombre
            ? `Estrella (${estrella.id}) · Mag ${estrella.magnitud}`
            : `Estrella · Mag ${estrella.magnitud}`,
          altitud: estrella.altitud,
          sobreHorizonte: estrella.altitud >= 0,
          textoBusqueda: `${nombreNorm} ${idNorm}`,
          prioridadInicio: nombreNorm.startsWith(consulta) || idNorm.startsWith(consulta),
        });
      }
    }

    for (const obj of messierCompletos) {
      const idNorm = normalizarTextoBusqueda(obj.id);
      const ngcNorm = normalizarTextoBusqueda(obj.nombreNGC);
      const comunNorm = normalizarTextoBusqueda(obj.nombreComun ?? '');
      const nombreConstEs = obtenerNombreConstelacionIAU(obj.constelacionIAU);
      const constNorm = normalizarTextoBusqueda(`${obj.constelacionIAU} ${nombreConstEs}`);
      if (
        idNorm.includes(consulta) ||
        ngcNorm.includes(consulta) ||
        comunNorm.includes(consulta) ||
        constNorm.includes(consulta)
      ) {
        const nombrePrincipal = obj.nombreComun
          ? `${obj.id} · ${obj.nombreComun}`
          : `${obj.id} · ${obj.nombreNGC}`;
        coincidencias.push({
          id: obj.id,
          categoria: 'messier',
          nombreSeleccion: nombrePrincipal,
          titulo: nombrePrincipal,
          subtitulo: `${obj.tipo} (${obj.nombreNGC}) · ${nombreConstEs}`,
          altitud: obj.altitud,
          sobreHorizonte: obj.altitud >= 0,
          textoBusqueda: `${idNorm} ${comunNorm} ${ngcNorm}`,
          prioridadInicio:
            idNorm.startsWith(consulta) ||
            comunNorm.startsWith(consulta) ||
            ngcNorm.startsWith(consulta),
        });
      }
    }

    return coincidencias
      .sort((a, b) => {
        if (a.prioridadInicio !== b.prioridadInicio) return a.prioridadInicio ? -1 : 1;
        if (a.sobreHorizonte !== b.sobreHorizonte) return a.sobreHorizonte ? -1 : 1;
        return b.altitud - a.altitud;
      })
      .slice(0, MAX_RESULTADOS_BUSQUEDA);
  }, [busquedaAstro, cuerpos, constelacionesCompletas, estrellasCompletas, messierCompletos]);

  const trayectoriaAstro = useMemo(
    () =>
      astroSeleccionado
        ? calcularTrayectoriaAstro(astroSeleccionado, fechaSeleccionada, coordenadasEstables)
        : [],
    [astroSeleccionado, fechaSeleccionada, coordenadasEstables]
  );

  const transitoSeleccionado: EfemeridesTransito | null = useMemo(() => {
    if (!astroSeleccionado || astroSeleccionado.categoria !== 'cuerpo') return null;
    return calcularTransitoCuerpo(astroSeleccionado.id, fechaSeleccionada, coordenadasEstables);
  }, [astroSeleccionado, fechaSeleccionada, coordenadasEstables]);

  const eventos = useMemo(
    () => calcularProximosEventos(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const objetivoBrujula = useMemo<ObjetivoBrujula | null>(() => {
    if (!astroSeleccionado) return null;
    if (astroSeleccionado.categoria === 'cuerpo') {
      const cuerpo = cuerpos.find((c) => c.id === astroSeleccionado.id);
      if (!cuerpo || cuerpo.altitud <= 0 || !Number.isFinite(cuerpo.acimut)) return null;
      return {
        id: cuerpo.id,
        nombre: cuerpo.nombre,
        acimut: cuerpo.acimut,
        altitud: cuerpo.altitud,
        color: cuerpo.color,
      };
    }
    if (astroSeleccionado.categoria === 'estrella') {
      const estrella = estrellasCompletas.find((e) => e.id === astroSeleccionado.id);
      if (!estrella || estrella.altitud <= 0 || !Number.isFinite(estrella.acimut)) return null;
      return {
        id: `estrella-${estrella.id}`,
        nombre: estrella.nombre ?? estrella.id,
        acimut: estrella.acimut,
        altitud: estrella.altitud,
        color: '#fde68a',
      };
    }
    if (astroSeleccionado.categoria === 'constelacion') {
      const constelacion = constelacionesCompletas.find(
        (c) => c.codigo === astroSeleccionado.id
      );
      if (
        !constelacion ||
        constelacion.centroAltitud <= 0 ||
        !Number.isFinite(constelacion.centroAcimut)
      ) {
        return null;
      }
      return {
        id: `constelacion-${constelacion.codigo}`,
        nombre: constelacion.nombreEs,
        acimut: constelacion.centroAcimut,
        altitud: constelacion.centroAltitud,
        color: '#38bdf8',
      };
    }
    const objMessier = messierCompletos.find((m) => m.id === astroSeleccionado.id);
    if (!objMessier || objMessier.altitud <= 0 || !Number.isFinite(objMessier.acimut)) return null;
    const nombreMessier = objMessier.nombreComun
      ? `${objMessier.id} · ${objMessier.nombreComun}`
      : `${objMessier.id} · ${objMessier.nombreNGC}`;
    return {
      id: `messier-${objMessier.id}`,
      nombre: nombreMessier,
      acimut: objMessier.acimut,
      altitud: objMessier.altitud,
      color: '#34d399',
    };
  }, [astroSeleccionado, cuerpos, constelacionesCompletas, estrellasCompletas, messierCompletos]);

  const actualizarCampoUbicacion = (
    campo: Exclude<keyof FormularioUbicacion, 'bortle'>,
    valor: string
  ) => {
    const valorSanitizado =
      campo === 'nombre' ? valor.slice(0, MAX_NOMBRE_UBICACION) : valor;
    setFormUbicacion((prev) => ({ ...prev, [campo]: valorSanitizado }));
    limpiarErrorGPS();
    setAvisoFavorito(null);
  };

  const actualizarBortleUbicacion = (valor: string) => {
    const numero = Number(valor);
    if (!esEscalaBortleValida(numero)) return;
    setFormUbicacion((prev) => ({ ...prev, bortle: numero }));
    limpiarErrorGPS();
    setAvisoFavorito(null);
  };

  const aplicarUbicacionManual = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limpiarErrorGPS();
    setAvisoFavorito(null);
    const { ubicacionValida } = validarFormularioUbicacion(formUbicacion);
    if (!ubicacionValida) return;

    const bortle = normalizarEscalaBortle(ubicacionValida.bortle);
    const timezone = normalizarZonaHoraria(
      ubicacionValida.timezone,
      ubicacionValida.latitud,
      ubicacionValida.longitud
    );
    actualizarUbicacion({ ...ubicacionValida, bortle, timezone });
    setFormUbicacion({
      nombre: ubicacionValida.nombre,
      latitud: String(ubicacionValida.latitud),
      longitud: String(ubicacionValida.longitud),
      altitud: String(ubicacionValida.altitud),
      bortle,
      timezone,
    });
  };

  const guardarUbicacionFavorita = () => {
    setAvisoFavorito(null);
    const { ubicacionValida } = validarFormularioUbicacion(formUbicacion);
    if (!ubicacionValida) {
      setAvisoFavorito('Corrige las coordenadas o la altitud antes de guardar en favoritos.');
      return;
    }

    const nombreLimpio = ubicacionValida.nombre.trim() || 'Observatorio sin nombre';
    const bortle = normalizarEscalaBortle(ubicacionValida.bortle);
    const timezone = normalizarZonaHoraria(
      ubicacionValida.timezone,
      ubicacionValida.latitud,
      ubicacionValida.longitud
    );
    const candidata: Ubicacion & { bortle: EscalaBortle } = {
      ...ubicacionValida,
      nombre: nombreLimpio,
      bortle,
      timezone,
    };

    const duplicado = favoritos.find((fav) => esUbicacionDuplicada(fav, candidata));
    if (duplicado) {
      if (duplicado.bortle !== bortle || duplicado.timezone !== timezone) {
        setFavoritos((prev) =>
          prev.map((fav) => (fav.id === duplicado.id ? { ...fav, bortle, timezone } : fav))
        );
        return;
      }
      setAvisoFavorito('Ya existe un favorito con ese nombre o en coordenadas muy cercanas.');
      return;
    }

    if (favoritos.length >= MAX_FAVORITOS) {
      setAvisoFavorito(`Has alcanzado el límite máximo de ${MAX_FAVORITOS} observatorios favoritos.`);
      return;
    }

    const nuevoFavorito: UbicacionFavorita = {
      ...candidata,
      id: generarIdFavorito(),
      bortle,
      timezone,
    };
    setFavoritos((prev) => [...prev, nuevoFavorito]);
  };

  const cargarUbicacionFavorita = (fav: UbicacionFavorita) => {
    limpiarErrorGPS();
    setAvisoFavorito(null);
    const bortle = normalizarEscalaBortle(fav.bortle);
    const timezone = normalizarZonaHoraria(fav.timezone, fav.latitud, fav.longitud);
    const seleccionada: Ubicacion = {
      nombre: fav.nombre,
      latitud: fav.latitud,
      longitud: fav.longitud,
      altitud: fav.altitud,
      bortle,
      timezone,
    };
    actualizarUbicacion(seleccionada);
    setFormUbicacion({
      nombre: seleccionada.nombre,
      latitud: String(seleccionada.latitud),
      longitud: String(seleccionada.longitud),
      altitud: String(seleccionada.altitud),
      bortle,
      timezone,
    });
  };

  const eliminarUbicacionFavorita = (id: string) => {
    setAvisoFavorito(null);
    setFavoritos((prev) => prev.filter((fav) => fav.id !== id));
  };

  const manejarRestablecerDatosLocales = () => {
    if (!confirmandoReset) {
      setAvisoReset(null);
      setConfirmandoReset(true);
      if (timeoutResetRef.current !== null) {
        window.clearTimeout(timeoutResetRef.current);
      }
      timeoutResetRef.current = window.setTimeout(() => {
        setConfirmandoReset(false);
        timeoutResetRef.current = null;
      }, 3000);
      return;
    }

    if (timeoutResetRef.current !== null) {
      window.clearTimeout(timeoutResetRef.current);
      timeoutResetRef.current = null;
    }
    setConfirmandoReset(false);
    omitirGuardadoFavoritosRef.current = favoritos.length > 0;

    resetearDatosLocales();
    limpiarSesion();

    setAvisoFavorito(null);
    const defecto = restablecerUbicacion();
    setFormUbicacion({
      nombre: defecto.nombre,
      latitud: String(defecto.latitud),
      longitud: String(defecto.longitud),
      altitud: String(defecto.altitud),
      bortle: BORTLE_POR_DEFECTO,
      timezone: normalizarZonaHoraria(defecto.timezone, defecto.latitud, defecto.longitud),
    });
    setFavoritos([]);
    restablecerTema();
    setAvisoReset('Datos locales restablecidos a los valores iniciales.');
  };

  const seleccionarResultadoBusqueda = (resultado: ResultadoBusquedaAstro) => {
    if (resultado.categoria === 'messier') {
      if (!preferencias.capas.messier) {
        toggleCapa('messier', true);
      }
      const visibleConFiltroActual = messier.some((m) => m.id === resultado.id);
      if (!visibleConFiltroActual) {
        setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO);
      }
    } else if (resultado.categoria === 'estrella' && !preferencias.capas.estrellas) {
      toggleCapa('estrellas', true);
    } else if (resultado.categoria === 'constelacion' && !preferencias.capas.constelaciones) {
      toggleCapa('constelaciones', true);
    }
    enfocarAstro(resultado.id);
    setBusquedaAstro(resultado.titulo);
    setBuscadorAbierto(false);
    setIndiceResultadoActivo(0);
  };

  const manejarTeclaBuscador = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (!buscadorAbierto || resultadosBusqueda.length === 0) {
      if (evento.key === 'Escape') {
        setBuscadorAbierto(false);
      }
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceResultadoActivo((prev) => (prev + 1) % resultadosBusqueda.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceResultadoActivo(
        (prev) => (prev - 1 + resultadosBusqueda.length) % resultadosBusqueda.length
      );
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const indiceSeguro = Math.min(indiceResultadoActivo, resultadosBusqueda.length - 1);
      const elegido = resultadosBusqueda[indiceSeguro];
      if (elegido) {
        seleccionarResultadoBusqueda(elegido);
      }
    } else if (evento.key === 'Escape') {
      setBuscadorAbierto(false);
    }
  };

  const manejarCambioFecha = (nuevoValor: string) => {
    if (!nuevoValor) return;
    const fecha = new Date(nuevoValor);
    if (Number.isNaN(fecha.getTime())) return;
    setReproduciendo(false);
    setFechaStr(nuevoValor);
  };

  const detectarGPS = () => {
    detectarGPSHook({
      onResuelta: (nuevaUbicacion) => {
        setFormUbicacion({
          nombre: nuevaUbicacion.nombre,
          latitud: String(nuevaUbicacion.latitud),
          longitud: String(nuevaUbicacion.longitud),
          altitud: String(nuevaUbicacion.altitud),
          bortle: normalizarEscalaBortle(nuevaUbicacion.bortle),
          timezone: normalizarZonaHoraria(
            nuevaUbicacion.timezone,
            nuevaUbicacion.latitud,
            nuevaUbicacion.longitud
          ),
        });
      },
    });
  };

  const ajustarTiempo = (modo: 'ahora' | 'noche' | 'mas1h') => {
    setReproduciendo(false);
    const base = modo === 'mas1h' ? new Date(fechaSeleccionada) : new Date();
    if (modo === 'noche') {
      base.setHours(23, 30, 0, 0);
    } else if (modo === 'mas1h') {
      base.setHours(base.getHours() + 1);
    }
    setFechaStr(formatearFechaParaInput(base));
  };

  const cambiarVista = (vista: VistaActiva) => {
    setVistaActiva(vista);
    const reducido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  };

  const abrirBrujula = () => setBrujulaAbierta(true);
  const cerrarBrujula = useCallback(() => setBrujulaAbierta(false), []);
  const abrirPlanificador = () => setPlanificadorAbierto(true);
  const cerrarPlanificador = useCallback(() => setPlanificadorAbierto(false), []);

  const localizarObjetivoEnMapa = useCallback(
    (objetivo: ObjetivoPlanificado) => {
      setVistaActiva('observatorio');
      if (objetivo.categoria === 'messier') {
        const idOriginal = objetivo.id.replace(/^messier-/, '');
        if (!preferencias.capas.messier) {
          toggleCapa('messier', true);
        }
        setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO);
        enfocarAstro(idOriginal);
      } else if (objetivo.categoria === 'estrella') {
        const idOriginal = objetivo.id.replace(/^estrella-/, '');
        if (!preferencias.capas.estrellas) {
          toggleCapa('estrellas', true);
        }
        enfocarAstro(idOriginal);
      } else {
        const idOriginal = objetivo.id.replace(/^planeta-/, '');
        enfocarAstro(idOriginal);
      }
    },
    [preferencias.capas.estrellas, preferencias.capas.messier, toggleCapa, enfocarAstro]
  );

  const clasesContenedor = CLASES_CONTENEDOR[tema];
  const clasesTarjeta = CLASES_TARJETA[tema];
  const claseHoverTarjeta = CLASES_HOVER_TARJETA[tema];
  const claseEsquemaInput = tema !== 'claro' ? '[color-scheme:dark]' : '';

  return (
    <>
      <div
        className={`no-imprimir tema-${tema} relative min-h-screen transition-colors duration-300 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${clasesContenedor}`}
      >
        <StarfieldBackground tema={tema} />
        <Navbar
          tema={tema}
          onCambiarTema={setTema}
          vistaActiva={vistaActiva}
          onCambiarVista={cambiarVista}
          onAbrirBrujula={abrirBrujula}
          onAbrirPlanificador={abrirPlanificador}
          totalObjetivosSesion={totalObjetivosSesion}
          ubicacion={ubicacion}
          panelUbicacionAbierto={editandoUbicacion}
          onAlternarUbicacion={() => setEditandoUbicacion((prev) => !prev)}
          onDetectarGPS={detectarGPS}
          cargandoGPS={cargandoGPS}
        />
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        {errorGPS && !editandoUbicacion && (
          <p
            role="alert"
            className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
          >
            {errorGPS}
          </p>
        )}

        {/* Panel desplegable de Ubicación */}
        {editandoUbicacion && (
          <section id="panel-ubicacion" className={`p-4 rounded-2xl border ${clasesTarjeta} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Configurar punto de observación
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={guardarUbicacionFavorita}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  Guardar en favoritos
                </button>
                <button
                  type="button"
                  onClick={detectarGPS}
                  disabled={cargandoGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                  {cargandoGPS ? 'Obteniendo GPS...' : 'Usar GPS del dispositivo'}
                </button>
              </div>
            </div>

            {errorGPS && (
              <p
                role="alert"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
              >
                {errorGPS}
              </p>
            )}

            {avisoFavorito && (
              <p
                role="status"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
              >
                {avisoFavorito}
              </p>
            )}

            <form onSubmit={aplicarUbicacionManual} className="space-y-3" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Nombre del lugar</span>
                  <input
                    type="text"
                    maxLength={MAX_NOMBRE_UBICACION}
                    value={formUbicacion.nombre}
                    onChange={(e) => actualizarCampoUbicacion('nombre', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent ${claseEsquemaInput}`}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Latitud (°N)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-90}
                    max={90}
                    step="0.0001"
                    aria-invalid={Boolean(erroresUbicacion.latitud)}
                    aria-describedby={erroresUbicacion.latitud ? 'error-latitud' : undefined}
                    value={formUbicacion.latitud}
                    onChange={(e) => actualizarCampoUbicacion('latitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.latitud && (
                    <span id="error-latitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.latitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Longitud (°E)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-180}
                    max={180}
                    step="0.0001"
                    aria-invalid={Boolean(erroresUbicacion.longitud)}
                    aria-describedby={erroresUbicacion.longitud ? 'error-longitud' : undefined}
                    value={formUbicacion.longitud}
                    onChange={(e) => actualizarCampoUbicacion('longitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.longitud && (
                    <span id="error-longitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.longitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Altitud (metros)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={-500}
                    max={9000}
                    aria-invalid={Boolean(erroresUbicacion.altitud)}
                    aria-describedby={erroresUbicacion.altitud ? 'error-altitud' : undefined}
                    value={formUbicacion.altitud}
                    onChange={(e) => actualizarCampoUbicacion('altitud', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                  />
                  {erroresUbicacion.altitud && (
                    <span id="error-altitud" className="block text-[11px] opacity-90">
                      {erroresUbicacion.altitud}
                    </span>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Escala Bortle (1–9)</span>
                  <select
                    aria-label="Escala Bortle de contaminación lumínica (1 a 9)"
                    value={formUbicacion.bortle}
                    onChange={(e) => actualizarBortleUbicacion(e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent text-xs cursor-pointer ${claseEsquemaInput}`}
                  >
                    {NIVELES_BORTLE.map((nivel) => (
                      <option
                        key={nivel}
                        value={nivel}
                        className={obtenerClaseOptionSelect(tema)}
                      >
                        {DESCRIPCIONES_BORTLE[nivel]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs opacity-70">Zona horaria (IANA)</span>
                  <select
                    aria-label="Zona horaria IANA del observatorio"
                    value={formUbicacion.timezone}
                    onChange={(e) => actualizarCampoUbicacion('timezone', e.target.value)}
                    className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent text-xs font-mono cursor-pointer ${claseEsquemaInput}`}
                  >
                    {ZONAS_HORARIAS_COMUNES.map((zona) => (
                      <option
                        key={zona.id}
                        value={zona.id}
                        className={obtenerClaseOptionSelect(tema)}
                      >
                        {zona.etiqueta}
                      </option>
                    ))}
                    {formUbicacion.timezone !== 'auto' &&
                      !ZONAS_HORARIAS_COMUNES.some((z) => z.id === formUbicacion.timezone) && (
                        <option
                          value={formUbicacion.timezone}
                          className={obtenerClaseOptionSelect(tema)}
                        >
                          {formUbicacion.timezone} (Actual)
                        </option>
                      )}
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={hayErroresUbicacion || ubicacionSinCambios}
                  className={`min-h-10 sm:min-h-8 px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-45 disabled:cursor-not-allowed ${obtenerClaseBotonAplicar(
                    tema
                  )}`}
                >
                  Aplicar ubicación
                </button>
              </div>
            </form>

            {favoritos.length > 0 && (
              <div className="pt-2 border-t border-current/15 space-y-2">
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Observatorios favoritos
                  </span>
                  <span className="font-mono">
                    {favoritos.length}/{MAX_FAVORITOS}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favoritos.map((fav) => {
                    const esActual =
                      Math.abs(fav.latitud - ubicacion.latitud) < 0.0005 &&
                      Math.abs(fav.longitud - ubicacion.longitud) < 0.0005 &&
                      fav.nombre === ubicacion.nombre;
                    return (
                      <div
                        key={fav.id}
                        className={`inline-flex items-center rounded-full border text-xs transition-colors ${obtenerClaseChipFavorito(
                          tema,
                          esActual
                        )}`}
                      >
                        <button
                          type="button"
                          onClick={() => cargarUbicacionFavorita(fav)}
                          title={`${fav.nombre} (${fav.latitud}°, ${fav.longitud}° · ${fav.altitud}m · Bortle ${fav.bortle})`}
                          className="pl-3 pr-2 py-1 cursor-pointer flex items-center gap-1.5 font-medium"
                        >
                          <MapPin className="w-3 h-3 opacity-75 shrink-0" aria-hidden="true" />
                          <span>{fav.nombre}</span>
                          <span className="font-mono text-[10px] opacity-70">B{fav.bortle}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarUbicacionFavorita(fav.id)}
                          aria-label={`Eliminar ${fav.nombre} de favoritos`}
                          title="Eliminar favorito"
                          className="pr-2.5 pl-1 py-1 opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-current/15 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <p className="font-medium">Restablecer datos locales</p>
                <p className="opacity-70">
                  Borra ubicación, favoritos, tema y preferencias del mapa guardadas en este navegador.
                </p>
              </div>
              <button
                type="button"
                onClick={manejarRestablecerDatosLocales}
                aria-label={
                  confirmandoReset
                    ? 'Confirmar borrado de ubicación, favoritos y preferencias guardadas'
                    : 'Restablecer ubicación, favoritos y preferencias guardadas'
                }
                className={`min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonRestablecer(
                  tema,
                  confirmandoReset
                )}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {confirmandoReset ? '¿Confirmar borrado?' : 'Restablecer datos'}
              </button>
            </div>

            {avisoReset && (
              <p
                role="status"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseAvisoExito(tema)}`}
              >
                {avisoReset}
              </p>
            )}
          </section>
        )}

        {vistaActiva === 'guia' ? (
          <AstronomyGuide
            tema={tema}
            claseTarjeta={clasesTarjeta}
            onVolver={() => cambiarVista('observatorio')}
            onAbrirBrujula={abrirBrujula}
          />
        ) : (
          <>
            <h1 className="sr-only">SkyProject · Observatorio</h1>
            {/* Barra de Tiempo y Capas */}
            <section
              className={`p-4 rounded-2xl border ${clasesTarjeta} flex flex-wrap items-center justify-between gap-4`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Calendar className="w-5 h-5 opacity-75" aria-hidden="true" />
                <input
                  type="datetime-local"
                  aria-label="Fecha y hora de observación"
                  value={fechaStr}
                  onChange={(e) => manejarCambioFecha(e.target.value)}
                  className={`w-full sm:w-auto min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono text-sm ${claseEsquemaInput}`}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('ahora')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('noche')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Esta noche 23:30
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('mas1h')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" /> +1h
                  </button>
                </div>
                {/* Control de Time-Lapse */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setReproduciendo((prev) => !prev)}
                    aria-pressed={reproduciendo}
                    className={`min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      reproduciendo
                    )}`}
                  >
                    {reproduciendo ? (
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {reproduciendo ? 'Pausa' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(15)}
                    aria-pressed={velocidadMinPorSeg === 15}
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      velocidadMinPorSeg === 15
                    )}`}
                  >
                    +15 min/s
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(60)}
                    aria-pressed={velocidadMinPorSeg === 60}
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      velocidadMinPorSeg === 60
                    )}`}
                  >
                    +1 h/s
                  </button>
                </div>
                {estadoSolar && (
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-current/20 bg-current/5 flex items-center gap-1.5">
                    {estadoSolar.altitudSol >= 0 ? (
                      <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {estadoSolar.fase} (Sol {estadoSolar.altitudSol}°)
                  </span>
                )}
              </div>

              {/* Capas del Mapa */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-70 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Capas:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.constelaciones}
                    onChange={(e) => toggleCapa('constelaciones', e.target.checked)}
                  />
                  <span>Constelaciones</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.estrellas}
                    onChange={(e) => toggleCapa('estrellas', e.target.checked)}
                  />
                  <span>Estrellas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferencias.capas.messier}
                    onChange={(e) => toggleCapa('messier', e.target.checked)}
                  />
                  <span>Messier</span>
                </label>
              </div>
            </section>

            {/* Widget Destacados de hoy */}
            <TodayHighlightsWidget
              items={destacadosHoy}
              isLoading={cargandoDestacados}
              error={errorDestacados}
              lastUpdated={destacadosActualizadosEn}
              timezone={coordinates.timezone}
              locationName={coordinates.name}
              tema={tema}
              claseTarjeta={clasesTarjeta}
              onRetry={recargarDestacados}
              onSelectTimestamp={(fechaObjetivo) => {
                if (Number.isNaN(fechaObjetivo.getTime())) return;
                setReproduciendo(false);
                setFechaStr(formatearFechaParaInput(fechaObjetivo));
              }}
            />

            {/* Contenido Principal: Mapa Celeste + Eventos / Meteo y Efemérides */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Columna Izquierda: Bóveda Celeste + Próximos Eventos */}
              <div className="lg:col-span-7 space-y-6">
                <div className={`p-4 md:p-6 rounded-2xl border ${clasesTarjeta}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                      Bóveda Celeste en Tiempo Real
                    </h2>

                    {/* Buscador global de astros */}
                    <div ref={buscadorRef} className="relative w-full sm:w-72">
                      <div className="relative flex items-center">
                        <Search
                          className="w-3.5 h-3.5 opacity-60 absolute left-2.5 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          role="combobox"
                          aria-label="Buscar astro en el catálogo"
                          aria-expanded={buscadorAbierto && busquedaAstro.trim().length > 0}
                          aria-controls="lista-resultados-astros"
                          aria-autocomplete="list"
                          aria-activedescendant={
                            buscadorAbierto && resultadosBusqueda[indiceResultadoActivo]
                              ? `opcion-astro-${resultadosBusqueda[indiceResultadoActivo].categoria}-${resultadosBusqueda[indiceResultadoActivo].id}`
                              : undefined
                          }
                          value={busquedaAstro}
                          onFocus={() => {
                            if (busquedaAstro.trim().length > 0) setBuscadorAbierto(true);
                          }}
                          onChange={(e) => {
                            setBusquedaAstro(e.target.value);
                            setBuscadorAbierto(e.target.value.trim().length > 0);
                            setIndiceResultadoActivo(0);
                          }}
                          onKeyDown={manejarTeclaBuscador}
                          placeholder="Buscar planeta, estrella, M31, Orión..."
                          className={`w-full pl-8 pr-7 py-1.5 rounded-xl border border-current/25 bg-transparent text-xs focus:outline-none focus:border-current/60 ${claseEsquemaInput}`}
                        />
                        {busquedaAstro && (
                          <button
                            type="button"
                            onClick={() => {
                              setBusquedaAstro('');
                              setBuscadorAbierto(false);
                              setIndiceResultadoActivo(0);
                            }}
                            aria-label="Limpiar búsqueda de astros"
                            className="absolute right-2 opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {buscadorAbierto && busquedaAstro.trim().length > 0 && (
                        <ul
                          id="lista-resultados-astros"
                          role="listbox"
                          aria-label="Resultados de búsqueda de astros"
                          className={`absolute z-30 mt-1.5 w-full rounded-xl border overflow-hidden ${obtenerClaseDesplegableBusqueda(
                            tema
                          )}`}
                        >
                          {resultadosBusqueda.length === 0 ? (
                            <li className="px-3 py-2.5 text-xs opacity-70">
                              Sin coincidencias en el catálogo.
                            </li>
                          ) : (
                            resultadosBusqueda.map((item, indice) => {
                              const activo = indice === indiceResultadoActivo;
                              return (
                                <li
                                  key={`${item.categoria}-${item.id}`}
                                  id={`opcion-astro-${item.categoria}-${item.id}`}
                                  role="option"
                                  aria-selected={activo}
                                >
                                  <button
                                    type="button"
                                    onMouseEnter={() => setIndiceResultadoActivo(indice)}
                                    onClick={() => seleccionarResultadoBusqueda(item)}
                                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${obtenerClaseItemBusqueda(
                                      tema,
                                      activo
                                    )}`}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-xs font-semibold truncate">
                                        {item.titulo}
                                      </span>
                                      <span className="block text-[11px] opacity-70 truncate">
                                        {item.subtitulo}
                                      </span>
                                    </span>
                                    <span
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${obtenerClaseInsigniaHorizonte(
                                        tema,
                                        item.sobreHorizonte
                                      )}`}
                                    >
                                      {item.sobreHorizonte ? 'Sobre' : 'Bajo'} · Alt {item.altitud}°
                                    </span>
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <BarraFiltrosCatalogo
                    filtros={filtrosCatalogo}
                    onCambiarFiltros={(actualizacion) =>
                      setFiltrosCatalogo((prev) => ({ ...prev, ...actualizacion }))
                    }
                    onResetearFiltros={() => setFiltrosCatalogo(FILTROS_CATALOGO_POR_DEFECTO)}
                    tema={tema}
                    totalMessierFiltrados={messier.length}
                    totalMessierSobreHorizonte={totalMessierSobreHorizonte}
                    magnitudLimiteEfectiva={magnitudLimiteEfectiva}
                    capaMessierActiva={preferencias.capas.messier}
                  />
                  <SkyMap
                    cuerpos={cuerpos}
                    estrellas={estrellas}
                    messier={messier}
                    constelaciones={constelaciones}
                    estrellasCompletas={estrellasCompletas}
                    messierCompletos={messierCompletos}
                    constelacionesCompletas={constelacionesCompletas}
                    tema={tema}
                    modoMapa={preferencias.modoMapa}
                    onCambiarModoMapa={setModoMapa}
                    mostrarConstelaciones={preferencias.capas.constelaciones}
                    mostrarEstrellas={preferencias.capas.estrellas}
                    mostrarMessier={preferencias.capas.messier}
                    astroSeleccionado={astroSeleccionado}
                    focusedBodyId={isFocusActive ? selectedBodyId : null}
                    focusedBodyName={sheetData?.name ?? contextoSeleccionado.fallbackName}
                    isSheetOpen={isSheetOpen}
                    onToggleSheet={toggleSheet}
                    onClearFocus={clearFocus}
                    trayectoria={trayectoriaAstro}
                    onSeleccionarAstro={(astro) => {
                      if (astro) {
                        enfocarAstro(astro.id);
                      } else {
                        clearFocus();
                      }
                    }}
                    contadorFoco={contadorFoco}
                    magnitudLimiteVisible={magnitudLimiteEfectiva}
                    bortle={bortleActual}
                    instrumentoActivo={filtrosCatalogo.instrumento}
                    objetivoDetalleSeleccionado={objetivoDetalleSeleccionado}
                    esObjetivoEnSesion={
                      objetivoDetalleSeleccionado
                        ? idsEnSesion.has(objetivoDetalleSeleccionado.id)
                        : false
                    }
                    onToggleObjetivo={toggleObjetivo}
                  />
                </div>

                <EventsPanel
                  eventos={eventos}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
                  timezone={coordinates.timezone}
                  onSeleccionarFecha={(fechaEvento) => {
                    setReproduciendo(false);
                    setFechaStr(formatearFechaParaInput(fechaEvento));
                  }}
                />
              </div>

              {/* Columna Derecha: Meteorología + Sistema Solar */}
              <div className="lg:col-span-5 space-y-4">
                <WeatherPanel
                  meteo={estadoMeteo.datos}
                  cargando={cargandoMeteo}
                  aviso={estadoMeteo.aviso}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
                  calidadCielo={calidadCielo}
                  bortle={bortleActual}
                  onSeleccionarHora={(fechaHora) => {
                    if (Number.isNaN(fechaHora.getTime())) return;
                    setReproduciendo(false);
                    setFechaStr(formatearFechaParaInput(fechaHora));
                  }}
                />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                      Sistema Solar y Luna
                    </h2>
                    <button
                      type="button"
                      onClick={abrirBrujula}
                      aria-haspopup="dialog"
                      className="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg border border-current/25 hover:bg-current/10 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 brujula-icono-animada" aria-hidden="true" />
                      Apuntar con la brújula
                    </button>
                  </div>
                  {cuerpos.map((obj) => {
                    const visibilidad = obtenerEstadoVisibilidadCuerpo(obj);
                    const esLunaConFase =
                      obj.tipo === 'luna' && obj.faseLunar !== undefined && obj.iluminacion !== undefined;
                    const estaSeleccionado =
                      astroSeleccionado?.categoria === 'cuerpo' && astroSeleccionado.id === obj.id;
                    const claseSeleccion = estaSeleccionado ? obtenerClaseTarjetaSeleccionada(tema) : '';
                    const objetivoPlaneta = construirObjetivoPlaneta(obj);
                    const estaEnPlanificador =
                      objetivoPlaneta !== null && idsEnSesion.has(objetivoPlaneta.id);

                    return (
                      <div
                        key={obj.id}
                        className={`w-full tarjeta-3d rounded-xl border ${clasesTarjeta} ${claseHoverTarjeta} ${claseSeleccion} ${
                          estaSeleccionado ? 'opacity-100' : visibilidad.opacidad
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={estaSeleccionado}
                          onClick={() => {
                            if (estaSeleccionado) {
                              clearFocus();
                            } else {
                              enfocarAstro(obj.id);
                            }
                          }}
                          className="w-full text-left cursor-pointer p-3.5"
                        >
                          <div className="flex items-center gap-3.5">
                            {esLunaConFase && (
                              <MoonPhase3D
                                iluminacion={obj.iluminacion ?? 0}
                                faseLunar={obj.faseLunar ?? ''}
                                anguloFase={obj.anguloFase}
                                tema={tema}
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: tema === 'rojo' ? '#ef4444' : obj.color }}
                                  />
                                  {obj.nombre}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full border border-current/25 shrink-0">
                                  {visibilidad.etiqueta}
                                </span>
                              </div>

                              <div className="text-xs flex flex-wrap items-center justify-between gap-2 opacity-85 font-mono">
                                <span className="flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                                  {obj.direccion} ({obj.acimut}°)
                                </span>
                                <span>Alt: {obj.altitud}°</span>
                                <span>Mag: {obj.magnitud}</span>
                                {obj.faseLunar && (
                                  <span>
                                    {lunarData ? lunarData.phaseName : obj.faseLunar} (
                                    {lunarData ? Math.round(lunarData.illumination) : obj.iluminacion}%)
                                  </span>
                                )}
                              </div>

                              {obj.tipo === 'luna' && lunarData && (
                                <div className="mt-1.5 text-[11px] font-mono opacity-75 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Edad: {lunarData.ageDays.toFixed(1)} d</span>
                                  <span>
                                    Orto:{' '}
                                    {formatearHoraEnZona(
                                      lunarData.moonrise,
                                      coordinates.timezone,
                                      TEXTO_SIN_ORTO
                                    )}
                                  </span>
                                  <span>
                                    Ocaso:{' '}
                                    {formatearHoraEnZona(
                                      lunarData.moonset,
                                      coordinates.timezone,
                                      TEXTO_SIN_OCASO
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {estaSeleccionado && transitoSeleccionado && (
                            <div className="mt-2.5 pt-2 border-t border-current/15 text-xs font-mono flex flex-wrap items-center justify-between gap-2 opacity-90">
                              <span>
                                Salida:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.salida,
                                  coordinates.timezone,
                                  TEXTO_SIN_ORTO
                                )}
                              </span>
                              <span>
                                Culminación:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.culminacion,
                                  coordinates.timezone,
                                  '—'
                                )}
                                {transitoSeleccionado.alturaMaxima !== null
                                  ? ` (${transitoSeleccionado.alturaMaxima}°)`
                                  : ''}
                              </span>
                              <span>
                                Puesta:{' '}
                                {formatearHoraEnZona(
                                  transitoSeleccionado.puesta,
                                  coordinates.timezone,
                                  TEXTO_SIN_OCASO
                                )}
                              </span>
                            </div>
                          )}
                        </button>

                        {objetivoPlaneta && (
                          <div className="px-3.5 pb-3 pt-0 flex justify-end">
                            <button
                              type="button"
                              aria-pressed={estaEnPlanificador}
                              onClick={() => toggleObjetivo(objetivoPlaneta)}
                              className={`min-h-9 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonObjetivoPlaneta(
                                tema,
                                estaEnPlanificador
                              )}`}
                            >
                              {estaEnPlanificador ? (
                                <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              )}
                              <span>Objetivo esta noche</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </main>
          </>
        )}
      </div>

      {vistaActiva === 'observatorio' && (
        <CelestialDetailSheet
          isOpen={isSheetOpen}
          status={sheetStatus}
          sheet={sheetData}
          fallbackName={contextoSeleccionado.fallbackName}
          fallbackSubtitle={contextoSeleccionado.fallbackSubtitle}
          ephemeris={contextoSeleccionado.ephemeris}
          errorMessage={errorMessage}
          tema={tema}
          onMinimize={() => toggleSheet(false)}
          onCloseAll={clearFocus}
          onRetry={selectedBodyId ? () => enfocarAstro(selectedBodyId) : undefined}
          objetivoSesion={objetivoDetalleSeleccionado}
          esObjetivoEnSesion={
            objetivoDetalleSeleccionado ? idsEnSesion.has(objetivoDetalleSeleccionado.id) : false
          }
          onToggleObjetivo={toggleObjetivo}
        />
      )}

      {brujulaAbierta && (
        <Compass3DModal
          tema={tema}
          cuerpos={cuerpos}
          ubicacion={ubicacion}
          objetivoSeleccionado={objetivoBrujula}
          onCerrar={cerrarBrujula}
        />
      )}

      {planificadorAbierto && (
        <PlanificadorSesionModal
          tema={tema}
          objetivos={objetivosPlanificados}
          metadatos={metadatosSesion}
          onMarcarObservado={marcarObservado}
          onActualizarNota={actualizarNota}
          onEliminarObjetivo={toggleObjetivo}
          onLimpiarSesion={limpiarSesion}
          onLocalizarEnMapa={localizarObjetivoEnMapa}
          onCerrar={cerrarPlanificador}
        />
      )}
      </div>
      <HojaImpresionSesion
        objetivos={objetivosPlanificados}
        metadatos={metadatosSesion}
      />
    </>
  );
}

export default App;
