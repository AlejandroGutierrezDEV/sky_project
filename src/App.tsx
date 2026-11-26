import { useState, useMemo, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import {
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
  X,
} from 'lucide-react';
import {
  calcularCielo,
  calcularEstadoSolar,
  calcularEstrellas,
  calcularMessier,
  calcularTransitoCuerpo,
  calcularTrayectoriaAstro,
} from './core/skyCalculator';
import { obtenerCondicionesMeteo } from './core/weatherService';
import { calcularProximosEventos } from './core/eventsCalculator';
import { SkyMap } from './components/SkyMap';
import { WeatherPanel } from './components/WeatherPanel';
import { EventsPanel } from './components/EventsPanel';
import { StarfieldBackground } from './components/StarfieldBackground';
import { MoonPhase3D } from './components/MoonPhase3D';
import { Navbar } from './components/Navbar';
import { AstronomyGuide } from './components/AstronomyGuide';
import { Compass3DModal } from './components/Compass3DModal';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CondicionesMeteo,
  CuerpoCeleste,
  EfemeridesTransito,
  ObjetivoBrujula,
  TemaVisual,
  Ubicacion,
  UbicacionFavorita,
  VistaActiva,
} from './types/astronomy';

const CLAVE_UBICACION = 'skyproject_ubicacion';
const CLAVE_TEMA = 'skyproject_tema';
const CLAVE_FAVORITOS = 'skyproject_favoritos_v1';
const MAX_FAVORITOS = 8;
const MAX_RESULTADOS_BUSQUEDA = 6;
const UMBRAL_COORD_DUPLICADA = 0.01;

const UBICACION_INICIAL: Ubicacion = {
  latitud: 39.47,
  longitud: -0.38,
  altitud: 150,
  nombre: 'Mi Observatorio (Valencia)',
};

const CLASES_CONTENEDOR: Record<TemaVisual, string> = {
  oscuro: 'bg-transparent text-slate-100',
  claro: 'bg-transparent text-slate-900',
  rojo: 'bg-transparent text-red-500',
};

const CLASES_TARJETA: Record<TemaVisual, string> = {
  oscuro:
    'hud-esquinas hud-oscuro bg-slate-900/55 backdrop-blur-md border-cyan-400/15',
  claro: 'hud-esquinas hud-claro bg-white/80 backdrop-blur-md border-slate-200/90 shadow-md shadow-slate-900/5',
  rojo: 'hud-esquinas hud-rojo bg-black/90 border-red-900/70',
};

const CLASES_HOVER_TARJETA: Record<TemaVisual, string> = {
  oscuro: 'hover:border-sky-500/40',
  claro: 'hover:border-slate-300 hover:shadow-lg',
  rojo: 'hover:border-red-600/80',
};

interface FormularioUbicacion {
  nombre: string;
  latitud: string;
  longitud: string;
  altitud: string;
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

function esUbicacionValida(valor: unknown): valor is Ubicacion {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    typeof obj.nombre === 'string' &&
    typeof obj.latitud === 'number' &&
    Number.isFinite(obj.latitud) &&
    obj.latitud >= -90 &&
    obj.latitud <= 90 &&
    typeof obj.longitud === 'number' &&
    Number.isFinite(obj.longitud) &&
    obj.longitud >= -180 &&
    obj.longitud <= 180 &&
    typeof obj.altitud === 'number' &&
    Number.isFinite(obj.altitud) &&
    obj.altitud >= -500 &&
    obj.altitud <= 9000
  );
}

function esUbicacionFavoritaValida(valor: unknown): valor is UbicacionFavorita {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.trim().length > 0 &&
    esUbicacionValida(valor)
  );
}

function leerUbicacionGuardada(): Ubicacion {
  try {
    const guardada = localStorage.getItem(CLAVE_UBICACION);
    if (!guardada) return UBICACION_INICIAL;
    const parsed: unknown = JSON.parse(guardada);
    return esUbicacionValida(parsed) ? parsed : UBICACION_INICIAL;
  } catch {
    return UBICACION_INICIAL;
  }
}

function leerFavoritosGuardados(): UbicacionFavorita[] {
  try {
    const guardado = localStorage.getItem(CLAVE_FAVORITOS);
    if (!guardado) return [];
    const parsed: unknown = JSON.parse(guardado);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(esUbicacionFavoritaValida).slice(0, MAX_FAVORITOS);
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

function leerTemaGuardado(): TemaVisual {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'oscuro' || guardado === 'claro' || guardado === 'rojo') {
      return guardado;
    }
    return 'oscuro';
  } catch {
    return 'oscuro';
  }
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

  return {
    errores,
    ubicacionValida: {
      nombre: form.nombre,
      latitud: lat,
      longitud: lon,
      altitud: alt,
    },
  };
}

function obtenerClaseErrorInline(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-rose-300 bg-rose-50 text-rose-700';
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
    return { etiqueta: 'Muy bajo en el horizonte', opacidad: 'opacity-80' };
  }
  return { etiqueta: 'Bajo el horizonte', opacidad: 'opacity-45' };
}

function formatearFechaParaInput(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const copia = new Date(valida);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 16);
}

function formatearHoraLocal(fecha: Date | null): string {
  if (!fecha || Number.isNaN(fecha.getTime())) return '—';
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
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
  if (tema === 'claro') return 'bg-white border-slate-300 text-slate-900 shadow-lg shadow-slate-900/10';
  return 'bg-slate-950/95 border-slate-700 text-slate-100 shadow-xl shadow-black/60 backdrop-blur-md';
}

function obtenerClaseItemBusqueda(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'hover:bg-current/10';
  if (tema === 'rojo') return 'bg-red-950/80 text-red-400';
  if (tema === 'claro') return 'bg-sky-50 text-sky-900';
  return 'bg-sky-500/20 text-sky-100';
}

function obtenerClaseInsigniaHorizonte(tema: TemaVisual, sobreHorizonte: boolean): string {
  if (!sobreHorizonte) return 'border-current/20 opacity-65';
  if (tema === 'rojo') return 'border-red-600/80 bg-red-950/50 text-red-400';
  if (tema === 'claro') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
}

function obtenerClaseChipFavorito(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/25 hover:border-current/45';
  if (tema === 'rojo') return 'border-red-500 bg-red-950/60 text-red-400';
  if (tema === 'claro') return 'border-sky-600 bg-sky-50 text-sky-900';
  return 'border-sky-400/70 bg-sky-500/15 text-sky-200';
}

export function App() {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(leerUbicacionGuardada);
  const [formUbicacion, setFormUbicacion] = useState<FormularioUbicacion>(() => ({
    nombre: ubicacion.nombre,
    latitud: String(ubicacion.latitud),
    longitud: String(ubicacion.longitud),
    altitud: String(ubicacion.altitud),
  }));

  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [favoritos, setFavoritos] = useState<UbicacionFavorita[]>(leerFavoritosGuardados);
  const [avisoFavorito, setAvisoFavorito] = useState<string | null>(null);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [errorGPS, setErrorGPS] = useState<string | null>(null);

  const [fechaStr, setFechaStr] = useState<string>(() => formatearFechaParaInput(new Date()));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidadMinPorSeg, setVelocidadMinPorSeg] = useState<15 | 60>(15);
  const [astroSeleccionado, setAstroSeleccionado] = useState<AstroSeleccionado | null>(null);
  const [contadorFoco, setContadorFoco] = useState(0);

  const [busquedaAstro, setBusquedaAstro] = useState('');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [indiceResultadoActivo, setIndiceResultadoActivo] = useState(0);
  const buscadorRef = useRef<HTMLDivElement | null>(null);

  const [tema, setTema] = useState<TemaVisual>(leerTemaGuardado);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('observatorio');
  const [brujulaAbierta, setBrujulaAbierta] = useState(false);
  const [mostrarConstelaciones, setMostrarConstelaciones] = useState(true);
  const [mostrarEtiquetasEstrellas, setMostrarEtiquetasEstrellas] = useState(true);
  const [mostrarMessier, setMostrarMessier] = useState(true);

  const coordenadasEstables = useMemo<Ubicacion>(
    () => ({
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      altitud: ubicacion.altitud,
      nombre: '',
    }),
    [ubicacion.latitud, ubicacion.longitud, ubicacion.altitud]
  );

  const fechaSeleccionada = useMemo(() => {
    const fecha = new Date(fechaStr);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }, [fechaStr]);

  const claveHoraUTC = fechaSeleccionada.toISOString().slice(0, 13);
  const claveConsultaMeteo = `${claveHoraUTC}|${coordenadasEstables.latitud.toFixed(2)}|${coordenadasEstables.longitud.toFixed(2)}`;
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

  const { errores: erroresUbicacion } = useMemo(
    () => validarFormularioUbicacion(formUbicacion),
    [formUbicacion]
  );

  useEffect(() => {
    guardarEnStorage(CLAVE_UBICACION, JSON.stringify(ubicacion));
  }, [ubicacion]);

  useEffect(() => {
    guardarEnStorage(CLAVE_TEMA, tema);
  }, [tema]);

  useEffect(() => {
    guardarEnStorage(CLAVE_FAVORITOS, JSON.stringify(favoritos));
  }, [favoritos]);

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

  const estrellas = useMemo(
    () => calcularEstrellas(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

  const messier = useMemo(
    () => calcularMessier(fechaSeleccionada, coordenadasEstables),
    [fechaSeleccionada, coordenadasEstables]
  );

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

    for (const estrella of estrellas) {
      const nombreNorm = normalizarTextoBusqueda(estrella.nombre);
      const constNorm = normalizarTextoBusqueda(estrella.constelacion);
      if (nombreNorm.includes(consulta) || constNorm.includes(consulta)) {
        coincidencias.push({
          id: estrella.id,
          categoria: 'estrella',
          nombreSeleccion: estrella.nombre,
          titulo: estrella.nombre,
          subtitulo: `Estrella · ${estrella.constelacion}`,
          altitud: estrella.altitud,
          sobreHorizonte: estrella.altitud > 0,
          textoBusqueda: nombreNorm,
          prioridadInicio: nombreNorm.startsWith(consulta) || constNorm.startsWith(consulta),
        });
      }
    }

    for (const obj of messier) {
      const idNorm = normalizarTextoBusqueda(obj.id);
      const nombreNorm = normalizarTextoBusqueda(obj.nombre);
      const constNorm = normalizarTextoBusqueda(obj.constelacion);
      if (
        idNorm.includes(consulta) ||
        nombreNorm.includes(consulta) ||
        constNorm.includes(consulta)
      ) {
        coincidencias.push({
          id: obj.id,
          categoria: 'messier',
          nombreSeleccion: `${obj.id} · ${obj.nombre}`,
          titulo: `${obj.id} · ${obj.nombre}`,
          subtitulo: `Messier (${obj.tipo}) · ${obj.constelacion}`,
          altitud: obj.altitud,
          sobreHorizonte: obj.altitud > 0,
          textoBusqueda: `${idNorm} ${nombreNorm}`,
          prioridadInicio: idNorm.startsWith(consulta) || nombreNorm.startsWith(consulta),
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
  }, [busquedaAstro, cuerpos, estrellas, messier]);

  const trayectoriaAstro = useMemo(
    () =>
      astroSeleccionado
        ? calcularTrayectoriaAstro(astroSeleccionado, fechaSeleccionada, coordenadasEstables)
        : [],
    [astroSeleccionado, fechaSeleccionada, coordenadasEstables]
  );

  const transitoSeleccionado: EfemeridesTransito | null = useMemo(
    () =>
      astroSeleccionado && astroSeleccionado.categoria === 'cuerpo'
        ? calcularTransitoCuerpo(astroSeleccionado.id, fechaSeleccionada, coordenadasEstables)
        : null,
    [astroSeleccionado, fechaSeleccionada, coordenadasEstables]
  );

  const diaSeleccionado = fechaStr.slice(0, 10);

  const eventos = useMemo(() => {
    const fechaDia = new Date(`${diaSeleccionado}T12:00:00`);
    const baseValida = Number.isNaN(fechaDia.getTime()) ? new Date() : fechaDia;
    return calcularProximosEventos(baseValida, coordenadasEstables);
  }, [diaSeleccionado, coordenadasEstables]);

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
      const estrella = estrellas.find((e) => e.id === astroSeleccionado.id);
      if (!estrella || estrella.altitud <= 0 || !Number.isFinite(estrella.acimut)) return null;
      return {
        id: `estrella-${estrella.id}`,
        nombre: estrella.nombre,
        acimut: estrella.acimut,
        altitud: estrella.altitud,
        color: '#fde68a',
      };
    }
    const objMessier = messier.find((m) => m.id === astroSeleccionado.id);
    if (!objMessier || objMessier.altitud <= 0 || !Number.isFinite(objMessier.acimut)) return null;
    return {
      id: `messier-${objMessier.id}`,
      nombre: `${objMessier.id} · ${objMessier.nombre}`,
      acimut: objMessier.acimut,
      altitud: objMessier.altitud,
      color: '#34d399',
    };
  }, [astroSeleccionado, cuerpos, estrellas, messier]);

  const actualizarCampoUbicacion = (campo: keyof FormularioUbicacion, valor: string) => {
    const siguienteForm = { ...formUbicacion, [campo]: valor };
    setFormUbicacion(siguienteForm);
    setErrorGPS(null);
    setAvisoFavorito(null);

    const { ubicacionValida } = validarFormularioUbicacion(siguienteForm);
    if (ubicacionValida) {
      setUbicacion(ubicacionValida);
    }
  };

  const guardarUbicacionFavorita = () => {
    setAvisoFavorito(null);
    const { ubicacionValida } = validarFormularioUbicacion(formUbicacion);
    if (!ubicacionValida) {
      setAvisoFavorito('Corrige las coordenadas o la altitud antes de guardar en favoritos.');
      return;
    }

    const nombreLimpio = ubicacionValida.nombre.trim() || 'Observatorio sin nombre';
    const candidata: Ubicacion = {
      ...ubicacionValida,
      nombre: nombreLimpio,
    };

    if (favoritos.some((fav) => esUbicacionDuplicada(fav, candidata))) {
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
    };
    setFavoritos((prev) => [...prev, nuevoFavorito]);
  };

  const cargarUbicacionFavorita = (fav: UbicacionFavorita) => {
    setErrorGPS(null);
    setAvisoFavorito(null);
    const seleccionada: Ubicacion = {
      nombre: fav.nombre,
      latitud: fav.latitud,
      longitud: fav.longitud,
      altitud: fav.altitud,
    };
    setUbicacion(seleccionada);
    setFormUbicacion({
      nombre: seleccionada.nombre,
      latitud: String(seleccionada.latitud),
      longitud: String(seleccionada.longitud),
      altitud: String(seleccionada.altitud),
    });
  };

  const eliminarUbicacionFavorita = (id: string) => {
    setAvisoFavorito(null);
    setFavoritos((prev) => prev.filter((fav) => fav.id !== id));
  };

  const seleccionarResultadoBusqueda = (resultado: ResultadoBusquedaAstro) => {
    if (resultado.categoria === 'messier' && !mostrarMessier) {
      setMostrarMessier(true);
    }
    setAstroSeleccionado({
      id: resultado.id,
      nombre: resultado.nombreSeleccion,
      categoria: resultado.categoria,
    });
    setContadorFoco((prev) => prev + 1);
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
    setErrorGPS(null);
    if (!navigator.geolocation) {
      setErrorGPS('Tu navegador no soporta geolocalización.');
      return;
    }
    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        setUbicacion((prev) => {
          const alt =
            pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude)
              ? Math.min(9000, Math.max(-500, Math.round(pos.coords.altitude)))
              : prev.altitud;
          const nuevaUbicacion: Ubicacion = {
            latitud: lat,
            longitud: lon,
            altitud: alt,
            nombre: 'Ubicación GPS Actual',
          };
          setFormUbicacion({
            nombre: nuevaUbicacion.nombre,
            latitud: String(nuevaUbicacion.latitud),
            longitud: String(nuevaUbicacion.longitud),
            altitud: String(nuevaUbicacion.altitud),
          });
          return nuevaUbicacion;
        });
        setCargandoGPS(false);
      },
      () => {
        setErrorGPS('No se pudo obtener el GPS. Revisa los permisos o inténtalo de nuevo.');
        setCargandoGPS(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
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

  const clasesContenedor = CLASES_CONTENEDOR[tema];
  const clasesTarjeta = CLASES_TARJETA[tema];
  const claseHoverTarjeta = CLASES_HOVER_TARJETA[tema];
  const claseEsquemaInput = tema !== 'claro' ? '[color-scheme:dark]' : '';

  return (
    <div className={`tema-${tema} relative min-h-screen transition-colors duration-300 ${clasesContenedor}`}>
      <StarfieldBackground tema={tema} />
      <Navbar
        tema={tema}
        onCambiarTema={setTema}
        vistaActiva={vistaActiva}
        onCambiarVista={cambiarVista}
        onAbrirBrujula={abrirBrujula}
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
          <section className={`p-4 rounded-2xl border ${clasesTarjeta} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Configurar punto de observación
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={guardarUbicacionFavorita}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  Guardar en favoritos
                </button>
                <button
                  type="button"
                  onClick={detectarGPS}
                  disabled={cargandoGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5" />
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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-xs opacity-70">Nombre del lugar</span>
                <input
                  type="text"
                  value={formUbicacion.nombre}
                  onChange={(e) => actualizarCampoUbicacion('nombre', e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent ${claseEsquemaInput}`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Latitud (°N)</span>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  step="0.0001"
                  value={formUbicacion.latitud}
                  onChange={(e) => actualizarCampoUbicacion('latitud', e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.latitud && (
                  <span className="block text-[11px] opacity-90">{erroresUbicacion.latitud}</span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Longitud (°E)</span>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step="0.0001"
                  value={formUbicacion.longitud}
                  onChange={(e) => actualizarCampoUbicacion('longitud', e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.longitud && (
                  <span className="block text-[11px] opacity-90">{erroresUbicacion.longitud}</span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Altitud (metros)</span>
                <input
                  type="number"
                  min={-500}
                  max={9000}
                  value={formUbicacion.altitud}
                  onChange={(e) => actualizarCampoUbicacion('altitud', e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.altitud && (
                  <span className="block text-[11px] opacity-90">{erroresUbicacion.altitud}</span>
                )}
              </label>
            </div>

            {favoritos.length > 0 && (
              <div className="pt-2 border-t border-current/15 space-y-2">
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="w-3.5 h-3.5" /> Observatorios favoritos
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
                          title={`${fav.nombre} (${fav.latitud}°, ${fav.longitud}° · ${fav.altitud}m)`}
                          className="pl-3 pr-2 py-1 cursor-pointer flex items-center gap-1.5 font-medium"
                        >
                          <MapPin className="w-3 h-3 opacity-75 shrink-0" />
                          <span>{fav.nombre}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarUbicacionFavorita(fav.id)}
                          aria-label={`Eliminar ${fav.nombre} de favoritos`}
                          title="Eliminar favorito"
                          className="pr-2.5 pl-1 py-1 opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                <Calendar className="w-5 h-5 opacity-75" />
                <input
                  type="datetime-local"
                  value={fechaStr}
                  onChange={(e) => manejarCambioFecha(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono text-sm ${claseEsquemaInput}`}
                />
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => ajustarTiempo('ahora')}
                    className="px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Ahora
                  </button>
                  <button
                    onClick={() => ajustarTiempo('noche')}
                    className="px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Esta noche 23:30
                  </button>
                  <button
                    onClick={() => ajustarTiempo('mas1h')}
                    className="px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3" /> +1h
                  </button>
                </div>
                {/* Control de Time-Lapse */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setReproduciendo((prev) => !prev)}
                    aria-pressed={reproduciendo}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      reproduciendo
                    )}`}
                  >
                    {reproduciendo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {reproduciendo ? 'Pausa' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(15)}
                    aria-pressed={velocidadMinPorSeg === 15}
                    className={`px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
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
                    className={`px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
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
                      <Sun className="w-3.5 h-3.5" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" />
                    )}
                    {estadoSolar.fase} (Sol {estadoSolar.altitudSol}°)
                  </span>
                )}
              </div>

              {/* Capas del Mapa */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="opacity-70 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Capas:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarConstelaciones}
                    onChange={(e) => setMostrarConstelaciones(e.target.checked)}
                  />
                  <span>Constelaciones</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarEtiquetasEstrellas}
                    onChange={(e) => setMostrarEtiquetasEstrellas(e.target.checked)}
                  />
                  <span>Estrellas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarMessier}
                    onChange={(e) => setMostrarMessier(e.target.checked)}
                  />
                  <span>Messier</span>
                </label>
              </div>
            </section>

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
                        <Search className="w-3.5 h-3.5 opacity-60 absolute left-2.5 pointer-events-none" />
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
                            <X className="w-3.5 h-3.5" />
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
                  <SkyMap
                    cuerpos={cuerpos}
                    estrellas={estrellas}
                    messier={messier}
                    tema={tema}
                    mostrarConstelaciones={mostrarConstelaciones}
                    mostrarEtiquetasEstrellas={mostrarEtiquetasEstrellas}
                    mostrarMessier={mostrarMessier}
                    astroSeleccionado={astroSeleccionado}
                    trayectoria={trayectoriaAstro}
                    onSeleccionarAstro={setAstroSeleccionado}
                    contadorFoco={contadorFoco}
                  />
                </div>

                <EventsPanel
                  eventos={eventos}
                  tema={tema}
                  claseTarjeta={clasesTarjeta}
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

                    return (
                      <button
                        key={obj.id}
                        type="button"
                        aria-pressed={estaSeleccionado}
                        onClick={() =>
                          setAstroSeleccionado((prev) =>
                            prev?.categoria === 'cuerpo' && prev.id === obj.id
                              ? null
                              : { id: obj.id, nombre: obj.nombre, categoria: 'cuerpo' }
                          )
                        }
                        className={`w-full text-left cursor-pointer tarjeta-3d p-3.5 rounded-xl border ${clasesTarjeta} ${claseHoverTarjeta} ${claseSeleccion} ${
                          estaSeleccionado ? 'opacity-100' : visibilidad.opacidad
                        }`}
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
                                <Compass className="w-3.5 h-3.5" />
                                {obj.direccion} ({obj.acimut}°)
                              </span>
                              <span>Alt: {obj.altitud}°</span>
                              <span>Mag: {obj.magnitud}</span>
                              {obj.faseLunar && (
                                <span>
                                  {obj.faseLunar} ({obj.iluminacion}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {estaSeleccionado && transitoSeleccionado && (
                          <div className="mt-2.5 pt-2 border-t border-current/15 text-xs font-mono flex flex-wrap items-center justify-between gap-2 opacity-90">
                            <span>Salida: {formatearHoraLocal(transitoSeleccionado.salida)}</span>
                            <span>
                              Culminación: {formatearHoraLocal(transitoSeleccionado.culminacion)}
                              {transitoSeleccionado.alturaMaxima !== null
                                ? ` (${transitoSeleccionado.alturaMaxima}°)`
                                : ''}
                            </span>
                            <span>Puesta: {formatearHoraLocal(transitoSeleccionado.puesta)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </main>
          </>
        )}
      </div>

      {brujulaAbierta && (
        <Compass3DModal
          tema={tema}
          cuerpos={cuerpos}
          objetivoSeleccionado={objetivoBrujula}
          onCerrar={cerrarBrujula}
        />
      )}
    </div>
  );
}

export default App;
