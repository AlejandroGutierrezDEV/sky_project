import { useEffect, useId, useState } from 'react';
import { BookOpen, ClipboardList, Compass, Crosshair, Eye, MapPin, Menu, Moon, Sun, Telescope, X } from 'lucide-react';
import type { TemaVisual, Ubicacion, VistaActiva } from '../types/astronomy';

interface NavbarProps {
  tema: TemaVisual;
  onCambiarTema: (tema: TemaVisual) => void;
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  onAbrirBrujula: () => void;
  onAbrirPlanificador: () => void;
  totalObjetivosSesion: number;
  ubicacion: Ubicacion;
  panelUbicacionAbierto: boolean;
  onAlternarUbicacion: () => void;
  onDetectarGPS: () => void;
  cargandoGPS: boolean;
}

interface ElementoNavegacion {
  vista: VistaActiva;
  etiqueta: string;
  descripcion: string;
  Icono: typeof Telescope;
}

const ELEMENTOS_NAVEGACION: ElementoNavegacion[] = [
  {
    vista: 'observatorio',
    etiqueta: 'Observatorio',
    descripcion: 'Mapa celeste, meteorología, eventos y Sistema Solar',
    Icono: Telescope,
  },
  {
    vista: 'guia',
    etiqueta: 'Guía de uso',
    descripcion: 'Cómo usar SkyProject y astronomía básica',
    Icono: BookOpen,
  },
];

const OPCIONES_TEMA: { tema: TemaVisual; etiqueta: string; Icono: typeof Moon; titulo: string }[] = [
  { tema: 'oscuro', etiqueta: 'Oscuro', Icono: Moon, titulo: 'Tema oscuro' },
  { tema: 'claro', etiqueta: 'Claro', Icono: Sun, titulo: 'Tema claro' },
  {
    tema: 'rojo',
    etiqueta: 'Filtro Rojo',
    Icono: Eye,
    titulo: 'Protege tu adaptación ocular en el campo',
  },
];

const CLASES_BARRA: Record<TemaVisual, string> = {
  oscuro:
    'bg-slate-950/60 backdrop-blur-xl border-b border-cyan-400/15 shadow-[0_1px_24px_-12px_rgb(34_211_238/0.35)]',
  claro: 'bg-white/70 backdrop-blur-xl border-b border-slate-200/90 shadow-sm shadow-slate-900/5',
  rojo: 'bg-black border-b border-red-900/80',
};

const CLASES_MENU_MOVIL: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-950/90 backdrop-blur-xl border-cyan-400/15',
  claro: 'bg-white/95 backdrop-blur-xl border-slate-200',
  rojo: 'bg-black border-red-900/80',
};

const CLASE_ACENTO: Record<TemaVisual, string> = {
  oscuro: 'text-cyan-300',
  claro: 'text-sky-700',
  rojo: 'text-red-500',
};

function obtenerClaseNavActiva(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-transparent opacity-75 hover:opacity-100 hover:bg-current/5';
  if (tema === 'rojo') return 'border-red-700 bg-red-950/70 text-red-400';
  if (tema === 'claro') return 'border-slate-900 bg-slate-900 text-white';
  return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200';
}

function obtenerClaseBotonTema(temaActual: TemaVisual, boton: TemaVisual): string {
  if (temaActual !== boton) return 'opacity-70 hover:opacity-100';
  if (boton === 'oscuro') return 'bg-cyan-600/90 text-white';
  if (boton === 'claro') return 'bg-slate-800 text-white';
  return 'bg-red-950 text-red-500 border border-red-600';
}

function obtenerClaseBotonBrujula(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-700 bg-red-950/50 text-red-400 hover:bg-red-950';
  if (tema === 'claro') return 'border-slate-300 bg-white text-slate-900 hover:border-sky-600 hover:text-sky-700';
  return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-300/70';
}

export function Navbar({
  tema,
  onCambiarTema,
  vistaActiva,
  onCambiarVista,
  onAbrirBrujula,
  onAbrirPlanificador,
  totalObjetivosSesion,
  ubicacion,
  panelUbicacionAbierto,
  onAlternarUbicacion,
  onDetectarGPS,
  cargandoGPS,
}: NavbarProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const idMenu = useId();
  const claseAcento = CLASE_ACENTO[tema];

  // Cierra el menú móvil con Escape
  useEffect(() => {
    if (!menuAbierto) return;
    const manejarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [menuAbierto]);

  const irAVista = (vista: VistaActiva) => {
    onCambiarVista(vista);
    setMenuAbierto(false);
  };

  const abrirBrujula = () => {
    setMenuAbierto(false);
    onAbrirBrujula();
  };

  const abrirPlanificador = () => {
    setMenuAbierto(false);
    onAbrirPlanificador();
  };

  const selectorTema = (compacto: boolean) => (
    <div
      role="group"
      aria-label="Tema visual"
      className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5"
    >
      {OPCIONES_TEMA.map(({ tema: opcion, etiqueta, Icono, titulo }) => (
        <button
          key={opcion}
          type="button"
          onClick={() => onCambiarTema(opcion)}
          aria-pressed={tema === opcion}
          title={titulo}
          className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 min-h-11 md:min-h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${obtenerClaseBotonTema(
            tema,
            opcion
          )}`}
        >
          <Icono className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className={compacto ? 'hidden xl:inline' : ''}>{etiqueta}</span>
          {compacto && <span className="sr-only xl:hidden">{etiqueta}</span>}
        </button>
      ))}
    </div>
  );

  const botonUbicacion = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          onAlternarUbicacion();
          setMenuAbierto(false);
        }}
        aria-expanded={panelUbicacionAbierto}
        aria-controls="panel-ubicacion"
        title="Configurar punto de observación"
        className="flex min-w-0 items-center gap-1.5 px-2.5 min-h-11 md:min-h-9 rounded-lg border border-current/20 hover:bg-current/10 text-xs cursor-pointer transition-colors"
      >
        <MapPin className={`w-3.5 h-3.5 shrink-0 ${claseAcento}`} aria-hidden="true" />
        <span className="truncate max-w-48 lg:max-w-40">{ubicacion.nombre}</span>
        <span className="font-mono opacity-70 hidden lg:inline">
          {ubicacion.latitud.toFixed(2)}°, {ubicacion.longitud.toFixed(2)}°
        </span>
      </button>
      <button
        type="button"
        onClick={onDetectarGPS}
        disabled={cargandoGPS}
        aria-label={cargandoGPS ? 'Obteniendo ubicación GPS' : 'Usar ubicación GPS actual'}
        title="Usar ubicación GPS actual"
        className="flex items-center justify-center min-w-11 min-h-11 md:min-w-9 md:min-h-9 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer disabled:opacity-50 transition-colors"
      >
        <Crosshair
          className={`w-4 h-4 ${cargandoGPS ? 'motion-safe:animate-spin' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );

  return (
    <nav
      aria-label="Navegación principal"
      className={`sticky top-0 z-30 transition-colors duration-300 ${CLASES_BARRA[tema]}`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        {/* Marca */}
        <button
          type="button"
          onClick={() => irAVista('observatorio')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
          aria-label="SkyProject, ir al Observatorio"
        >
          <span
            className={`relative grid place-items-center w-9 h-9 rounded-xl border border-current/25 ${claseAcento}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" stroke="currentColor">
              <circle cx="16" cy="16" r="11" strokeWidth="1.5" strokeOpacity="0.6" />
              <ellipse cx="16" cy="16" rx="11" ry="4.5" strokeWidth="1.2" strokeOpacity="0.45" />
              <path d="M16 3v4M16 25v4M3 16h4M25 16h4" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-display text-lg font-bold tracking-tight leading-none">
              SkyProject
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] opacity-60 font-mono mt-1 truncate">
              Observatorio personal
            </span>
          </span>
        </button>

        {/* Navegación de escritorio */}
        <div className="hidden md:flex items-center gap-1">
          {ELEMENTOS_NAVEGACION.map(({ vista, etiqueta, descripcion, Icono }) => {
            const activo = vistaActiva === vista;
            return (
              <button
                key={vista}
                type="button"
                onClick={() => irAVista(vista)}
                aria-current={activo ? 'page' : undefined}
                title={descripcion}
                className={`flex items-center gap-2 px-3 min-h-9 rounded-lg border text-sm font-medium font-display cursor-pointer transition-colors ${obtenerClaseNavActiva(
                  tema,
                  activo
                )}`}
              >
                <Icono className="w-4 h-4" aria-hidden="true" />
                {etiqueta}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Acceso directo al Planificador de sesión nocturna */}
          <button
            type="button"
            onClick={abrirPlanificador}
            aria-haspopup="dialog"
            aria-label={
              totalObjetivosSesion > 0
                ? `Abrir planificador de sesión nocturna (${totalObjetivosSesion} objetivos)`
                : 'Abrir planificador de sesión nocturna'
            }
            title="Abrir el planificador de sesión nocturna"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 min-h-11 md:min-h-9 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${obtenerClaseBotonBrujula(
              tema
            )}`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="font-display hidden sm:inline">Sesión</span>
            {totalObjetivosSesion > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-current/15 font-mono text-[10px] leading-none">
                {totalObjetivosSesion}
              </span>
            )}
          </button>

          {/* Acceso directo a la Brújula 3D (siempre visible) */}
          <button
            type="button"
            onClick={abrirBrujula}
            aria-haspopup="dialog"
            title="Abrir la Brújula Astronómica 3D"
            className={`flex items-center gap-2 pl-2 pr-3 min-h-11 md:min-h-9 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${obtenerClaseBotonBrujula(
              tema
            )}`}
          >
            <span
              className="grid place-items-center w-7 h-7 rounded-full border border-current/40"
              aria-hidden="true"
            >
              <Compass className="w-4 h-4 brujula-icono-animada" />
            </span>
            <span className="font-display">Brújula 3D</span>
          </button>

          {/* Controles de escritorio */}
          <div className="hidden md:flex items-center gap-2">
            {botonUbicacion}
            {selectorTema(true)}
          </div>

          {/* Botón hamburguesa (móvil) */}
          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            aria-expanded={menuAbierto}
            aria-controls={idMenu}
            aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            className="md:hidden grid place-items-center min-w-11 min-h-11 rounded-lg border border-current/20 hover:bg-current/10 cursor-pointer"
          >
            {menuAbierto ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      <div
        id={idMenu}
        hidden={!menuAbierto}
        className={`md:hidden border-t ${CLASES_MENU_MOVIL[tema]}`}
      >
        <div className="px-4 py-4 space-y-4">
          <ul className="space-y-1.5">
            {ELEMENTOS_NAVEGACION.map(({ vista, etiqueta, descripcion, Icono }) => {
              const activo = vistaActiva === vista;
              return (
                <li key={vista}>
                  <button
                    type="button"
                    onClick={() => irAVista(vista)}
                    aria-current={activo ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 min-h-12 rounded-xl border text-left cursor-pointer transition-colors ${obtenerClaseNavActiva(
                      tema,
                      activo
                    )}`}
                  >
                    <Icono className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-display font-semibold text-sm">{etiqueta}</span>
                      <span className="block text-[11px] opacity-70 truncate">{descripcion}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-60">
              Punto de observación
            </p>
            {botonUbicacion}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-60">Tema visual</p>
            {selectorTema(false)}
          </div>
        </div>
      </div>
    </nav>
  );
}
