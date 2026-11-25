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
} from 'lucide-react';
import { calcularCielo, calcularEstrellas, calcularMessier } from './core/skyCalculator';
import { obtenerCondicionesMeteo } from './core/weatherService';
import { calcularProximosEventos } from './core/eventsCalculator';
import { SkyMap } from './components/SkyMap';
import { WeatherPanel } from './components/WeatherPanel';
import { EventsPanel } from './components/EventsPanel';
import type { CondicionesMeteo, TemaVisual, Ubicacion } from './types/astronomy';

const UBICACION_INICIAL: Ubicacion = {
  latitud: 39.47,
  longitud: -0.38,
  altitud: 150,
  nombre: 'Mi Observatorio (Valencia)',
};

const CLASES_CONTENEDOR: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-950 text-slate-100',
  claro: 'bg-slate-100 text-slate-900',
  rojo: 'bg-black text-red-500',
};

const CLASES_TARJETA: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-900/70 border-slate-800',
  claro: 'bg-white border-slate-200 shadow-sm',
  rojo: 'bg-black border-red-900/60',
};

function obtenerClaseBotonTema(temaActual: TemaVisual, boton: TemaVisual): string {
  if (temaActual !== boton) return 'opacity-70 hover:opacity-100';
  if (boton === 'oscuro') return 'bg-sky-600 text-white';
  if (boton === 'claro') return 'bg-slate-800 text-white';
  return 'bg-red-950 text-red-500 border border-red-600';
}

function formatearFechaParaInput(fecha: Date): string {
  const copia = new Date(fecha);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 16);
}

export function App() {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(() => {
    const guardada = localStorage.getItem('skyproject_ubicacion');
    return guardada ? JSON.parse(guardada) : UBICACION_INICIAL;
  });

  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [cargandoGPS, setCargandoGPS] = useState(false);

  const [fechaStr, setFechaStr] = useState<string>(() => formatearFechaParaInput(new Date()));

  const [tema, setTema] = useState<TemaVisual>('oscuro');
  const [mostrarConstelaciones, setMostrarConstelaciones] = useState(true);
  const [mostrarEtiquetasEstrellas, setMostrarEtiquetasEstrellas] = useState(true);
  const [mostrarMessier, setMostrarMessier] = useState(true);

  const [meteo, setMeteo] = useState<CondicionesMeteo | null>(null);
  const [cargandoMeteo, setCargandoMeteo] = useState(false);
  const [avisoMeteo, setAvisoMeteo] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('skyproject_ubicacion', JSON.stringify(ubicacion));
  }, [ubicacion]);

  useEffect(() => {
    let activo = true;
    setCargandoMeteo(true);

    obtenerCondicionesMeteo(new Date(fechaStr), ubicacion).then(({ datos, aviso }) => {
      if (!activo) return;
      setMeteo(datos);
      setAvisoMeteo(aviso);
      setCargandoMeteo(false);
    });

    return () => {
      activo = false;
    };
  }, [fechaStr, ubicacion]);

  const fechaSeleccionada = useMemo(() => new Date(fechaStr), [fechaStr]);

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

  const eventos = useMemo(
    () => calcularProximosEventos(fechaSeleccionada, ubicacion),
    [fechaSeleccionada, ubicacion]
  );

  const detectarGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({
          latitud: Number(pos.coords.latitude.toFixed(4)),
          longitud: Number(pos.coords.longitude.toFixed(4)),
          altitud: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : ubicacion.altitud,
          nombre: 'Ubicación GPS Actual',
        });
        setCargandoGPS(false);
      },
      () => {
        alert('No se pudo obtener el GPS. Revisa los permisos del navegador.');
        setCargandoGPS(false);
      }
    );
  };

  const ajustarTiempo = (modo: 'ahora' | 'noche' | 'mas1h') => {
    const base = modo === 'mas1h' ? new Date(fechaStr) : new Date();
    if (modo === 'noche') {
      base.setHours(23, 30, 0, 0);
    } else if (modo === 'mas1h') {
      base.setHours(base.getHours() + 1);
    }
    setFechaStr(formatearFechaParaInput(base));
  };

  const clasesContenedor = CLASES_CONTENEDOR[tema];
  const clasesTarjeta = CLASES_TARJETA[tema];

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${clasesContenedor}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-current/15 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <Sparkles className="w-6 h-6 text-sky-400" /> SkyProject
            </h1>
            <button
              onClick={() => setEditandoUbicacion(!editandoUbicacion)}
              className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1.5 mt-1 cursor-pointer underline decoration-dotted"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {cargandoGPS ? 'Obteniendo GPS...' : 'Usar GPS del dispositivo'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-xs opacity-70">Nombre del lugar</span>
                <input
                  type="text"
                  value={ubicacion.nombre}
                  onChange={(e) => setUbicacion({ ...ubicacion, nombre: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Latitud (°N)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={ubicacion.latitud}
                  onChange={(e) => setUbicacion({ ...ubicacion, latitud: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Longitud (°E)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={ubicacion.longitud}
                  onChange={(e) => setUbicacion({ ...ubicacion, longitud: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Altitud (metros)</span>
                <input
                  type="number"
                  value={ubicacion.altitud}
                  onChange={(e) => setUbicacion({ ...ubicacion, altitud: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono"
                />
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
              onChange={(e) => setFechaStr(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono text-sm"
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75">
                  Bóveda Celeste en Tiempo Real
                </h2>
                <span className="text-xs opacity-60">Pasa el cursor sobre un astro</span>
              </div>
              <SkyMap
                cuerpos={cuerpos}
                estrellas={estrellas}
                messier={messier}
                tema={tema}
                mostrarConstelaciones={mostrarConstelaciones}
                mostrarEtiquetasEstrellas={mostrarEtiquetasEstrellas}
                mostrarMessier={mostrarMessier}
              />
            </div>

            <EventsPanel
              eventos={eventos}
              tema={tema}
              claseTarjeta={clasesTarjeta}
              onSeleccionarFecha={(fechaEvento) => setFechaStr(formatearFechaParaInput(fechaEvento))}
            />
          </div>

          {/* Columna Derecha: Meteorología + Sistema Solar */}
          <div className="lg:col-span-5 space-y-4">
            <WeatherPanel
              meteo={meteo}
              cargando={cargandoMeteo}
              aviso={avisoMeteo}
              tema={tema}
              claseTarjeta={clasesTarjeta}
            />

            <div className="space-y-2.5">
              <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 px-1">
                Sistema Solar y Luna
              </h2>
              {cuerpos.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-3.5 rounded-xl border transition-opacity ${clasesTarjeta} ${
                    obj.visible ? 'opacity-100' : 'opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: tema === 'rojo' ? '#ef4444' : obj.color }}
                      />
                      {obj.nombre}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-current/25">
                      {obj.visible ? 'Sobre el horizonte' : 'No visible'}
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
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;