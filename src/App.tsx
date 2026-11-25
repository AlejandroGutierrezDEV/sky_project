import { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Eye,
  Moon,
  Sun,
  Calendar,
  Sparkles,
  MapPin,
  Crosshair,
  Clock,
  Layers,
  Play,
  Pause,
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
import type {
  AstroSeleccionado,
  CondicionesMeteo,
  CuerpoCeleste,
  EfemeridesTransito,
  TemaVisual,
  Ubicacion,
} from './types/astronomy';

const CLAVE_UBICACION = 'skyproject_ubicacion';
const CLAVE_TEMA = 'skyproject_tema';

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
  oscuro: 'bg-slate-900/55 backdrop-blur-md border-slate-700/50 shadow-xl shadow-black/30',
  claro: 'bg-white/80 backdrop-blur-md border-slate-200/90 shadow-md shadow-slate-900/5',
  rojo: 'bg-black/90 border-red-900/70',
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

function obtenerClaseBotonTema(temaActual: TemaVisual, boton: TemaVisual): string {
  if (temaActual !== boton) return 'opacity-70 hover:opacity-100';
  if (boton === 'oscuro') return 'bg-sky-600 text-white';
  if (boton === 'claro') return 'bg-slate-800 text-white';
  return 'bg-red-950 text-red-500 border border-red-600';
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

export function App() {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(leerUbicacionGuardada);
  const [formUbicacion, setFormUbicacion] = useState<FormularioUbicacion>(() => ({
    nombre: ubicacion.nombre,
    latitud: String(ubicacion.latitud),
    longitud: String(ubicacion.longitud),
    altitud: String(ubicacion.altitud),
  }));

  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [errorGPS, setErrorGPS] = useState<string | null>(null);

  const [fechaStr, setFechaStr] = useState<string>(() => formatearFechaParaInput(new Date()));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidadMinPorSeg, setVelocidadMinPorSeg] = useState<15 | 60>(15);
  const [astroSeleccionado, setAstroSeleccionado] = useState<AstroSeleccionado | null>(null);

  const [tema, setTema] = useState<TemaVisual>(leerTemaGuardado);
  const [mostrarConstelaciones, setMostrarConstelaciones] = useState(true);
  const [mostrarEtiquetasEstrellas, setMostrarEtiquetasEstrellas] = useState(true);
  const [mostrarMessier, setMostrarMessier] = useState(true);

  const claveConsultaMeteo = `${fechaStr}|${ubicacion.latitud.toFixed(4)}|${ubicacion.longitud.toFixed(4)}`;
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

  const fechaSeleccionada = useMemo(() => {
    const fecha = new Date(fechaStr);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }, [fechaStr]);

  useEffect(() => {
    const controller = new AbortController();
    const temporizador = window.setTimeout(() => {
      obtenerCondicionesMeteo(fechaSeleccionada, ubicacion, controller.signal)
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
  }, [claveConsultaMeteo, fechaSeleccionada, ubicacion]);

  const estadoSolar = useMemo(
    () => calcularEstadoSolar(fechaSeleccionada, ubicacion),
    [fechaSeleccionada, ubicacion]
  );

  const cuerpos = useMemo(
    () => calcularCielo(fechaSeleccionada, ubicacion),
    [fechaSeleccionada, ubicacion]
  );

  const estrellas = useMemo(
    () => calcularEstrellas(fechaSeleccionada, ubicacion),
    [fechaSeleccionada, ubicacion]
  );

  const messier = useMemo(
    () => calcularMessier(fechaSeleccionada, ubicacion),
    [fechaSeleccionada, ubicacion]
  );

  const trayectoriaAstro = useMemo(
    () =>
      astroSeleccionado
        ? calcularTrayectoriaAstro(astroSeleccionado, fechaSeleccionada, ubicacion)
        : [],
    [astroSeleccionado, fechaSeleccionada, ubicacion]
  );

  const transitoSeleccionado: EfemeridesTransito | null = useMemo(
    () =>
      astroSeleccionado && astroSeleccionado.categoria === 'cuerpo'
        ? calcularTransitoCuerpo(astroSeleccionado.id, fechaSeleccionada, ubicacion)
        : null,
    [astroSeleccionado, fechaSeleccionada, ubicacion]
  );

  const diaSeleccionado = fechaStr.slice(0, 10);

  const eventos = useMemo(() => {
    const fechaDia = new Date(`${diaSeleccionado}T12:00:00`);
    const baseValida = Number.isNaN(fechaDia.getTime()) ? new Date() : fechaDia;
    return calcularProximosEventos(baseValida, ubicacion);
  }, [diaSeleccionado, ubicacion]);

  const actualizarCampoUbicacion = (campo: keyof FormularioUbicacion, valor: string) => {
    const siguienteForm = { ...formUbicacion, [campo]: valor };
    setFormUbicacion(siguienteForm);
    setErrorGPS(null);

    const { ubicacionValida } = validarFormularioUbicacion(siguienteForm);
    if (ubicacionValida) {
      setUbicacion(ubicacionValida);
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

  const clasesContenedor = CLASES_CONTENEDOR[tema];
  const clasesTarjeta = CLASES_TARJETA[tema];
  const claseHoverTarjeta = CLASES_HOVER_TARJETA[tema];
  const claseEsquemaInput = tema !== 'claro' ? '[color-scheme:dark]' : '';
  const claseIconoTitulo =
    tema === 'rojo' ? 'text-red-500' : tema === 'claro' ? 'text-sky-600' : 'text-sky-400';

  return (
    <div className={`relative min-h-screen p-4 md:p-6 transition-colors duration-300 ${clasesContenedor}`}>
      <StarfieldBackground tema={tema} />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <header
          className={`flex flex-wrap items-center justify-between gap-4 p-4 md:px-5 rounded-2xl border ${clasesTarjeta}`}
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <Sparkles className={`w-6 h-6 ${claseIconoTitulo}`} /> SkyProject
            </h1>
            <button
              onClick={() => setEditandoUbicacion(!editandoUbicacion)}
              aria-expanded={editandoUbicacion}
              className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1.5 mt-1 cursor-pointer underline decoration-dotted transition-opacity"
            >
              <MapPin className="w-3.5 h-3.5" />
              {ubicacion.nombre} ({ubicacion.latitud}°, {ubicacion.longitud}° · {ubicacion.altitud}m)
            </button>
          </div>

          {/* Selector de Tema */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-current/20 bg-current/5">
            <button
              onClick={() => setTema('oscuro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${obtenerClaseBotonTema(tema, 'oscuro')}`}
            >
              <Moon className="w-3.5 h-3.5" /> Oscuro
            </button>
            <button
              onClick={() => setTema('claro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${obtenerClaseBotonTema(tema, 'claro')}`}
            >
              <Sun className="w-3.5 h-3.5" /> Claro
            </button>
            <button
              onClick={() => setTema('rojo')}
              title="Protege tu adaptación ocular en el campo"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${obtenerClaseBotonTema(tema, 'rojo')}`}
            >
              <Eye className="w-3.5 h-3.5" /> Filtro Rojo
            </button>
          </div>
        </header>

        {/* Panel desplegable de Ubicación */}
        {editandoUbicacion && (
          <section className={`p-4 rounded-2xl border ${clasesTarjeta} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Configurar punto de observación
              </h2>
              <button
                onClick={detectarGPS}
                disabled={cargandoGPS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer disabled:opacity-50"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {cargandoGPS ? 'Obteniendo GPS...' : 'Usar GPS del dispositivo'}
              </button>
            </div>

            {errorGPS && (
              <p
                role="alert"
                className={`text-xs px-3 py-2 rounded-lg border ${obtenerClaseErrorInline(tema)}`}
              >
                {errorGPS}
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
          </section>
        )}

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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                  Bóveda Celeste en Tiempo Real
                </h2>
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
              <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 px-1">
                Sistema Solar y Luna
              </h2>
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
      </div>
    </div>
  );
}

export default App;
