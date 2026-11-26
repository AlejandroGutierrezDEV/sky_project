import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTecladoReact, PointerEvent as EventoPunteroReact } from 'react';
import { ArrowDown, ArrowUp, Check, Compass, Hand, Navigation, Smartphone, Target, X } from 'lucide-react';
import type {
  ConstructorOrientacionConPermiso,
  CuerpoCeleste,
  EstadoSensorBrujula,
  EventoOrientacionDispositivo,
  ObjetivoBrujula,
  OrientacionBrujula,
  TemaVisual,
  Ubicacion,
} from '../types/astronomy';
import {
  calcularDeclinacionMagnetica,
  formatearDeclinacionMagnetica,
} from '../utils/astronomia/declinacionMagnetica';

interface Compass3DModalProps {
  tema: TemaVisual;
  cuerpos: CuerpoCeleste[];
  ubicacion: Pick<Ubicacion, 'latitud' | 'longitud'>;
  objetivoSeleccionado?: ObjetivoBrujula | null;
  onCerrar: () => void;
}

/* ── Utilidades angulares ─────────────────────────────────────────── */

function normalizarAngulo(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
}

/** Convierte rumbo magnético a acimut geográfico verdadero aplicando la declinación local. */
// eslint-disable-next-line react-refresh/only-export-components
export function aplicarDeclinacionMagnetica(
  rumboMagnetico: number,
  declinacionGrados: number
): number {
  if (!Number.isFinite(rumboMagnetico)) return 0;
  const declinacion = Number.isFinite(declinacionGrados) ? declinacionGrados : 0;
  return normalizarAngulo(rumboMagnetico + declinacion);
}

/** Diferencia por el camino más corto en el círculo, en el rango [-180, 180). */
function diferenciaAngular(destino: number, origen: number): number {
  return ((((destino - origen) % 360) + 540) % 360) - 180;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

const DIRECCIONES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;

function direccionCardinal(rumbo: number): string {
  return DIRECCIONES[Math.round(normalizarAngulo(rumbo) / 45) % 8];
}

function puntoPolar(angulo: number, radio: number): { x: number; y: number } {
  const rad = (angulo * Math.PI) / 180;
  return { x: CENTRO + Math.sin(rad) * radio, y: CENTRO - Math.cos(rad) * radio };
}

/* ── Geometría estática del disco (viewBox -20 -20 440 440) ──────── */

const CENTRO = 200;
const RADIO_ESFERA = 196;
const RADIO_MARCADORES = 187;
const RADIO_MARCAS = 175;
const MARGEN_ALINEACION = 8;
const INCLINACION_VISUAL_MAX = 65;
const UMBRAL_PROYECCION_HORIZONTAL = 0.15;
const ALTITUD_MANUAL_MIN = -60;
const ALTITUD_MANUAL_MAX = 90;
const ALTITUD_MANUAL_INICIAL = 25;

function obtenerAnguloPantalla(): number {
  if (typeof window === 'undefined') return 0;
  const angulo = window.screen?.orientation?.angle;
  return typeof angulo === 'number' && Number.isFinite(angulo) ? normalizarAngulo(angulo) : 0;
}

/**
 * Proyección matricial 3D estándar W3C (rotación intrínseca Z-X'-Y'') del vector
 * de la cámara trasera (0, 0, -1) al marco terrestre ENU (Este-Norte-Arriba),
 * compensando la rotación de pantalla (0°, 90°, 180°, 270°).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calcularOrientacionDesdeSensores(
  alpha: number,
  beta: number,
  gamma: number,
  anguloPantalla: number
): { rumbo: number; altitudApuntado: number } {
  const a = (alpha * Math.PI) / 180;
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  const s = (normalizarAngulo(anguloPantalla) * Math.PI) / 180;

  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  const cg = Math.cos(g);
  const sg = Math.sin(g);

  // Vector cámara trasera [0, 0, -1] proyectado por R = Rz(a) * Rx(b) * Ry(g)
  // (invariante respecto a la rotación de pantalla Rz(-s) alrededor del eje Z del dispositivo)
  const camX = -ca * sg - sa * sb * cg;
  const camY = -sa * sg + ca * sb * cg;
  const camZ = -cb * cg;

  const altitudApuntado = (Math.asin(limitar(camZ, -1, 1)) * 180) / Math.PI;

  let vx = camX;
  let vy = camY;

  // Cuando la proyección horizontal de la cámara trasera es casi nula (teléfono plano
  // o apuntando cerca del cenit), proyectar el borde superior de la pantalla Rz(-s) * [0, 1, 0]
  if (Math.hypot(vx, vy) < UMBRAL_PROYECCION_HORIZONTAL) {
    const cs = Math.cos(s);
    const ss = Math.sin(s);

    // Primera y segunda columnas de R (ejes +X y +Y del dispositivo en ENU)
    const r11 = ca * cg - sa * sb * sg;
    const r21 = sa * cg + ca * sb * sg;
    const r12 = -sa * cb;
    const r22 = ca * cb;

    // Si camZ > 0 (cámara apuntando casi al cenit), invertir el vector superior mantiene
    // la continuidad del acimut sin salto de 180° al pasar de ~81° a 90° de elevación.
    const signo = camZ > 0 ? -1 : 1;
    vx = signo * (r11 * ss + r12 * cs);
    vy = signo * (r21 * ss + r22 * cs);
  }

  const rumbo = normalizarAngulo((Math.atan2(vx, vy) * 180) / Math.PI);
  return { rumbo, altitudApuntado };
}

interface MarcaGraduacion {
  angulo: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tipo: 'menor' | 'media' | 'mayor';
}

const MARCAS: MarcaGraduacion[] = Array.from({ length: 72 }, (_, i) => {
  const angulo = i * 5;
  const tipo: MarcaGraduacion['tipo'] = angulo % 45 === 0 ? 'mayor' : angulo % 15 === 0 ? 'media' : 'menor';
  const largo = tipo === 'mayor' ? 16 : tipo === 'media' ? 11 : 5;
  const exterior = puntoPolar(angulo, RADIO_MARCAS);
  const interior = puntoPolar(angulo, RADIO_MARCAS - largo);
  return { angulo, x1: exterior.x, y1: exterior.y, x2: interior.x, y2: interior.y, tipo };
});

interface EtiquetaDisco {
  angulo: number;
  texto: string;
  x: number;
  y: number;
  tipo: 'cardinal' | 'intercardinal' | 'grado';
}

const ETIQUETAS: EtiquetaDisco[] = Array.from({ length: 24 }, (_, i) => {
  const angulo = i * 15;
  if (angulo % 90 === 0) {
    const p = puntoPolar(angulo, 141);
    return { angulo, texto: DIRECCIONES[angulo / 45], ...p, tipo: 'cardinal' as const };
  }
  if (angulo % 45 === 0) {
    const p = puntoPolar(angulo, 143);
    return { angulo, texto: DIRECCIONES[angulo / 45], ...p, tipo: 'intercardinal' as const };
  }
  const p = puntoPolar(angulo, 145);
  return { angulo, texto: String(angulo), ...p, tipo: 'grado' as const };
});

/* ── Paletas por tema (Filtro Rojo: solo rojos sobre negro puro) ── */

interface PaletaBrujula {
  esfera: string;
  esferaBorde: string;
  capa: string;
  marcaMenor: string;
  marcaMayor: string;
  texto: string;
  textoSuave: string;
  acento: string;
  norte: string;
  sur: string;
  aro: string;
  marcadorFijo: string | null;
  claseBackdrop: string;
  clasePanel: string;
  claseAcento: string;
  claseLectura: string;
  claseBotonPrimario: string;
  claseAviso: string;
  claseEstadoOk: string;
  claseEstadoAviso: string;
}

const PALETAS: Record<TemaVisual, PaletaBrujula> = {
  oscuro: {
    esfera: 'rgba(2,6,23,0.9)',
    esferaBorde: 'rgba(34,211,238,0.5)',
    capa: 'rgba(15,23,42,0.95)',
    marcaMenor: 'rgba(148,163,184,0.55)',
    marcaMayor: '#e2e8f0',
    texto: '#e2e8f0',
    textoSuave: '#94a3b8',
    acento: '#22d3ee',
    norte: '#f43f5e',
    sur: '#64748b',
    aro: 'rgba(34,211,238,0.3)',
    marcadorFijo: null,
    claseBackdrop: 'bg-slate-950/65',
    clasePanel: 'bg-slate-950/90 border-cyan-400/25 text-slate-100 shadow-2xl shadow-black/60',
    claseAcento: 'text-cyan-300',
    claseLectura: 'bg-slate-950/90 border-cyan-400/40 text-slate-50',
    claseBotonPrimario: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/25',
    claseAviso: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100',
    claseEstadoOk: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    claseEstadoAviso: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  claro: {
    esfera: 'rgba(248,250,252,0.96)',
    esferaBorde: '#334155',
    capa: '#cbd5e1',
    marcaMenor: '#94a3b8',
    marcaMayor: '#0f172a',
    texto: '#0f172a',
    textoSuave: '#475569',
    acento: '#0369a1',
    norte: '#e11d48',
    sur: '#94a3b8',
    aro: 'rgba(51,65,85,0.28)',
    marcadorFijo: null,
    claseBackdrop: 'bg-slate-900/40',
    clasePanel: 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/20',
    claseAcento: 'text-sky-700',
    claseLectura: 'bg-white/95 border-slate-300 text-slate-900',
    claseBotonPrimario: 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800',
    claseAviso: 'border-sky-600/50 bg-sky-50 text-sky-900',
    claseEstadoOk: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    claseEstadoAviso: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  rojo: {
    esfera: '#000000',
    esferaBorde: '#991b1b',
    capa: '#450a0a',
    marcaMenor: '#7f1d1d',
    marcaMayor: '#dc2626',
    texto: '#ef4444',
    textoSuave: '#b91c1c',
    acento: '#ef4444',
    norte: '#f87171',
    sur: '#7f1d1d',
    aro: 'rgba(153,27,27,0.55)',
    marcadorFijo: '#b91c1c',
    claseBackdrop: 'bg-black/90',
    clasePanel: 'bg-black border-red-800 text-red-500',
    claseAcento: 'text-red-500',
    claseLectura: 'bg-black border-red-700 text-red-500',
    claseBotonPrimario: 'bg-red-950 border-red-600 text-red-400 hover:bg-red-900/60',
    claseAviso: 'border-red-600 bg-red-950/60 text-red-400',
    claseEstadoOk: 'border-red-700 bg-red-950/50 text-red-400',
    claseEstadoAviso: 'border-red-900 bg-black text-red-600',
  },
};

const MENSAJES_ESTADO: Record<EstadoSensorBrujula, string> = {
  inactivo: 'Sensores en espera: pulsa «Activar sensores del dispositivo».',
  solicitando: 'Solicitando permiso de orientación…',
  buscando: 'Buscando lecturas del magnetómetro…',
  activo: 'Sensores activos: la brújula sigue a tu dispositivo.',
  denegado: 'Permiso denegado. Puedes seguir en modo simulación.',
  'no-disponible': 'Este equipo no dispone de sensores de orientación. Modo simulación activo.',
  inseguro: 'Los sensores requieren una conexión segura (HTTPS). Modo simulación activo.',
  'sin-lecturas': 'No se reciben lecturas del sensor en este equipo. Modo simulación activo.',
};

/** Determina el estado inicial de los sensores sin efectos secundarios. */
function detectarEstadoInicial(): EstadoSensorBrujula {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return 'no-disponible';
  }
  if (!window.isSecureContext) return 'inseguro';
  const constructor = DeviceOrientationEvent as unknown as ConstructorOrientacionConPermiso;
  return typeof constructor.requestPermission === 'function' ? 'inactivo' : 'buscando';
}

function prefiereMovimientoReducido(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function etiquetaMarcador(nombre: string): string {
  const token = nombre.split(' ')[0];
  if (/^M\d+$/i.test(token)) return token.slice(0, 3);
  return nombre.slice(0, 2);
}

const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Compass3DModal({
  tema,
  cuerpos,
  ubicacion,
  objetivoSeleccionado = null,
  onCerrar,
}: Compass3DModalProps) {
  const paleta = PALETAS[tema];
  const idTitulo = useId();
  const idDescripcion = useId();

  const declinacionMagnetica = useMemo(
    () => calcularDeclinacionMagnetica(ubicacion.latitud, ubicacion.longitud),
    [ubicacion.latitud, ubicacion.longitud]
  );
  const etiquetaDeclinacion = useMemo(
    () => formatearDeclinacionMagnetica(declinacionMagnetica),
    [declinacionMagnetica]
  );
  const declinacionRef = useRef(declinacionMagnetica);
  useEffect(() => {
    declinacionRef.current = declinacionMagnetica;
  }, [declinacionMagnetica]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null);
  const discoRef = useRef<HTMLDivElement | null>(null);

  const [estadoSensor, setEstadoSensor] = useState<EstadoSensorBrujula>(detectarEstadoInicial);
  const [referenciaSensor, setReferenciaSensor] = useState<'absoluta' | 'relativa' | null>(null);
  const [intentoSensor, setIntentoSensor] = useState(0);
  const [modoManual, setModoManual] = useState(false);
  const [rumboManual, setRumboManual] = useState(0);
  const [altitudManual, setAltitudManual] = useState(ALTITUD_MANUAL_INICIAL);
  const [visual, setVisual] = useState<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const [movimientoReducido] = useState(prefiereMovimientoReducido);

  const objetivoRef = useRef<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const visualRef = useRef<OrientacionBrujula>({
    rumbo: 0,
    inclinacion: ALTITUD_MANUAL_INICIAL,
    altitudApuntado: ALTITUD_MANUAL_INICIAL,
  });
  const animacionIdRef = useRef<number>(0);
  const simulacionRef = useRef(true);
  const lecturaRecibidaRef = useRef(false);
  const lecturaAbsolutaRef = useRef(false);
  const referenciaRef = useRef<'absoluta' | 'relativa' | null>(null);
  const arrastreRef = useRef<{ idPuntero: number; anguloPrevio: number } | null>(null);

  const simulacion = modoManual || estadoSensor !== 'activo';
  const escuchando =
    estadoSensor === 'buscando' || estadoSensor === 'activo' || estadoSensor === 'sin-lecturas';

  // Referencia estable al callback de cierre (evita reiniciar el foco en cada render del padre)
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  /* Bloqueo de scroll, foco inicial, Escape y trampa de foco */
  useEffect(() => {
    const elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonCerrarRef.current?.focus();

    const manejarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrarRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !panelRef.current) return;
      const enfocables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
      ).filter((el) => !el.hasAttribute('hidden'));
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = overflowPrevio;
      elementoPrevio?.focus();
    };
  }, []);

  /* Suavizado angular bajo demanda (camino más corto, sin bucle activo en reposo) */
  const programarSuavizado = useCallback(() => {
    if (animacionIdRef.current !== 0) return;
    const factor = movimientoReducido ? 0.45 : 0.16;

    const paso = () => {
      const objetivo = objetivoRef.current;
      const actual = visualRef.current;
      const difRumbo = diferenciaAngular(objetivo.rumbo, actual.rumbo);
      const difInclinacion = objetivo.inclinacion - actual.inclinacion;
      const difAltitud = objetivo.altitudApuntado - actual.altitudApuntado;

      if (
        Math.abs(difRumbo) < 0.05 &&
        Math.abs(difInclinacion) < 0.05 &&
        Math.abs(difAltitud) < 0.05
      ) {
        if (
          actual.rumbo !== objetivo.rumbo ||
          actual.inclinacion !== objetivo.inclinacion ||
          actual.altitudApuntado !== objetivo.altitudApuntado
        ) {
          const exacto: OrientacionBrujula = {
            rumbo: objetivo.rumbo,
            inclinacion: objetivo.inclinacion,
            altitudApuntado: objetivo.altitudApuntado,
          };
          visualRef.current = exacto;
          setVisual(exacto);
        }
        animacionIdRef.current = 0;
        return;
      }

      const rumbo =
        Math.abs(difRumbo) < 0.05
          ? objetivo.rumbo
          : normalizarAngulo(actual.rumbo + difRumbo * factor);
      const inclinacion =
        Math.abs(difInclinacion) < 0.05
          ? objetivo.inclinacion
          : actual.inclinacion + difInclinacion * factor;
      const altitudApuntado =
        Math.abs(difAltitud) < 0.05
          ? objetivo.altitudApuntado
          : actual.altitudApuntado + difAltitud * factor;

      const siguiente: OrientacionBrujula = { rumbo, inclinacion, altitudApuntado };
      visualRef.current = siguiente;
      setVisual(siguiente);
      animacionIdRef.current = window.requestAnimationFrame(paso);
    };

    animacionIdRef.current = window.requestAnimationFrame(paso);
  }, [movimientoReducido]);

  useEffect(() => {
    return () => {
      if (animacionIdRef.current !== 0) {
        window.cancelAnimationFrame(animacionIdRef.current);
        animacionIdRef.current = 0;
      }
    };
  }, []);

  /* Sincroniza el objetivo con los controles manuales en modo simulación */
  useEffect(() => {
    simulacionRef.current = simulacion;
    if (simulacion) {
      const altitudAcotada = limitar(altitudManual, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX);
      objetivoRef.current = {
        rumbo: normalizarAngulo(rumboManual),
        inclinacion: limitar(altitudAcotada, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX),
        altitudApuntado: altitudAcotada,
      };
      programarSuavizado();
    }
  }, [simulacion, rumboManual, altitudManual, programarSuavizado]);

  /* Escucha de sensores: deviceorientationabsolute (prioritario) + deviceorientation */
  useEffect(() => {
    if (!escuchando || typeof DeviceOrientationEvent === 'undefined') return;

    const procesarOrientacion = (evento: Event) => {
      if (!(evento instanceof DeviceOrientationEvent)) return;
      const datos = evento as EventoOrientacionDispositivo;
      const anguloPantalla = obtenerAnguloPantalla();

      const alpha = typeof datos.alpha === 'number' && Number.isFinite(datos.alpha) ? datos.alpha : null;
      const beta = typeof datos.beta === 'number' && Number.isFinite(datos.beta) ? datos.beta : null;
      const gamma = typeof datos.gamma === 'number' && Number.isFinite(datos.gamma) ? datos.gamma : null;

      let rumbo: number | null = null;
      let altitudApuntado = 0;
      let absoluta = false;

      if (typeof datos.webkitCompassHeading === 'number' && Number.isFinite(datos.webkitCompassHeading)) {
        // Safari iOS: rumbo magnético absoluto referido al Norte magnético -> aplicar declinación local
        const rumboMagnetico = normalizarAngulo(datos.webkitCompassHeading + anguloPantalla);
        rumbo = aplicarDeclinacionMagnetica(rumboMagnetico, declinacionRef.current);
        absoluta = true;
        if (beta !== null || gamma !== null) {
          altitudApuntado = calcularOrientacionDesdeSensores(
            alpha ?? 0,
            beta ?? 0,
            gamma ?? 0,
            anguloPantalla
          ).altitudApuntado;
        }
      } else if (alpha !== null) {
        absoluta = evento.type === 'deviceorientationabsolute' || datos.absolute;
        // Si ya llegan lecturas absolutas, se descartan las relativas
        if (!absoluta && lecturaAbsolutaRef.current) return;
        const orientacion = calcularOrientacionDesdeSensores(
          alpha,
          beta ?? 0,
          gamma ?? 0,
          anguloPantalla
        );
        rumbo = absoluta
          ? aplicarDeclinacionMagnetica(orientacion.rumbo, declinacionRef.current)
          : orientacion.rumbo;
        altitudApuntado = beta !== null || gamma !== null ? orientacion.altitudApuntado : 0;
      }

      if (rumbo === null) return;
      if (absoluta) lecturaAbsolutaRef.current = true;

      const altitudAcotada = limitar(altitudApuntado, -90, 90);
      const inclinacion = limitar(altitudAcotada, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX);

      if (!simulacionRef.current) {
        objetivoRef.current = { rumbo, inclinacion, altitudApuntado: altitudAcotada };
        programarSuavizado();
      }

      const referencia = absoluta ? 'absoluta' : 'relativa';
      if (referenciaRef.current !== referencia) {
        referenciaRef.current = referencia;
        setReferenciaSensor(referencia);
      }
      if (!lecturaRecibidaRef.current) {
        lecturaRecibidaRef.current = true;
        setEstadoSensor('activo');
      }
    };

    const admiteAbsoluto = 'ondeviceorientationabsolute' in window;
    if (admiteAbsoluto) {
      window.addEventListener('deviceorientationabsolute', procesarOrientacion);
    }
    window.addEventListener('deviceorientation', procesarOrientacion);

    const temporizador = window.setTimeout(() => {
      if (!lecturaRecibidaRef.current) {
        setEstadoSensor((prev) => (prev === 'buscando' ? 'sin-lecturas' : prev));
      }
    }, 2500);

    return () => {
      window.clearTimeout(temporizador);
      if (admiteAbsoluto) {
        window.removeEventListener('deviceorientationabsolute', procesarOrientacion);
      }
      window.removeEventListener('deviceorientation', procesarOrientacion);
    };
  }, [escuchando, intentoSensor, programarSuavizado]);

  const activarSensores = async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setEstadoSensor('no-disponible');
      return;
    }
    if (!window.isSecureContext) {
      setEstadoSensor('inseguro');
      return;
    }
    const constructor = DeviceOrientationEvent as unknown as ConstructorOrientacionConPermiso;
    if (typeof constructor.requestPermission === 'function') {
      setEstadoSensor('solicitando');
      try {
        const respuesta = await constructor.requestPermission();
        if (respuesta !== 'granted') {
          setEstadoSensor('denegado');
          return;
        }
      } catch {
        setEstadoSensor('denegado');
        return;
      }
    }
    lecturaRecibidaRef.current = false;
    lecturaAbsolutaRef.current = false;
    setModoManual(false);
    setEstadoSensor('buscando');
    setIntentoSensor((prev) => prev + 1);
  };

  const pasarAModoManual = () => {
    setRumboManual(Math.round(visualRef.current.rumbo));
    setAltitudManual(
      Math.round(limitar(visualRef.current.altitudApuntado, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX))
    );
    setModoManual(true);
  };

  /* Arrastre sobre la brújula (ratón o dedo) */
  const anguloDesdePuntero = (clienteX: number, clienteY: number): number | null => {
    const elemento = discoRef.current;
    if (!elemento) return null;
    const rect = elemento.getBoundingClientRect();
    const dx = clienteX - (rect.left + rect.width / 2);
    const dy = clienteY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 8) return null;
    return normalizarAngulo((Math.atan2(dx, -dy) * 180) / Math.PI);
  };

  const manejarPunteroAbajo = (evento: EventoPunteroReact<HTMLDivElement>) => {
    const angulo = anguloDesdePuntero(evento.clientX, evento.clientY);
    if (angulo === null) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastreRef.current = { idPuntero: evento.pointerId, anguloPrevio: angulo };
    if (!simulacion) pasarAModoManual();
    else setModoManual(true);
  };

  const manejarPunteroMovido = (evento: EventoPunteroReact<HTMLDivElement>) => {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.idPuntero !== evento.pointerId) return;
    const angulo = anguloDesdePuntero(evento.clientX, evento.clientY);
    if (angulo === null) return;
    const delta = diferenciaAngular(angulo, arrastre.anguloPrevio);
    arrastre.anguloPrevio = angulo;
    // Girar el disco en sentido horario equivale a reducir el rumbo
    setRumboManual((prev) => normalizarAngulo(prev - delta));
  };

  const finalizarArrastre = (evento: EventoPunteroReact<HTMLDivElement>) => {
    if (arrastreRef.current?.idPuntero === evento.pointerId) {
      arrastreRef.current = null;
    }
  };

  const manejarTeclaDisco = (evento: EventoTecladoReact<HTMLDivElement>) => {
    const paso = evento.shiftKey ? 15 : 1;
    let delta = 0;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') delta = paso;
    else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') delta = -paso;
    else return;
    evento.preventDefault();
    if (!simulacion) {
      setRumboManual(normalizarAngulo(Math.round(visualRef.current.rumbo) + delta));
      setAltitudManual(
        Math.round(limitar(visualRef.current.altitudApuntado, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX))
      );
      setModoManual(true);
      return;
    }
    setModoManual(true);
    setRumboManual((prev) => normalizarAngulo(Math.round(prev) + delta));
  };

  /* Datos derivados */
  const rumboEntero = Math.round(visual.rumbo) % 360;
  const cardinal = direccionCardinal(visual.rumbo);
  const altitudEntera = Math.round(visual.altitudApuntado);
  const inclinacionVisual = limitar(visual.inclinacion, -INCLINACION_VISUAL_MAX, INCLINACION_VISUAL_MAX);

  const objetivosVisibles = useMemo<ObjetivoBrujula[]>(() => {
    const lista: ObjetivoBrujula[] = cuerpos
      .filter((c) => c.altitud > 0 && Number.isFinite(c.acimut))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        acimut: c.acimut,
        altitud: c.altitud,
        color: c.color,
      }));

    if (
      objetivoSeleccionado &&
      objetivoSeleccionado.altitud > 0 &&
      Number.isFinite(objetivoSeleccionado.acimut) &&
      !lista.some((item) => item.id === objetivoSeleccionado.id)
    ) {
      lista.unshift(objetivoSeleccionado);
    }

    return lista;
  }, [cuerpos, objetivoSeleccionado]);

  let alineado: ObjetivoBrujula | null = null;
  let mejorDiferencia = Number.POSITIVE_INFINITY;
  for (const objetivo of objetivosVisibles) {
    const dif = Math.abs(diferenciaAngular(objetivo.acimut, visual.rumbo));
    if (dif <= MARGEN_ALINEACION && dif < mejorDiferencia) {
      mejorDiferencia = dif;
      alineado = objetivo;
    }
  }

  const difElevacion = alineado ? alineado.altitud - visual.altitudApuntado : null;
  const alturaAlineada = difElevacion !== null && Math.abs(difElevacion) <= MARGEN_ALINEACION;
  const gradosElevacion = difElevacion !== null ? Math.round(Math.abs(difElevacion)) : 0;
  const direccionElevacion: 'alineada' | 'subir' | 'bajar' | null =
    difElevacion === null ? null : alturaAlineada ? 'alineada' : difElevacion > 0 ? 'subir' : 'bajar';
  const textoGuiaElevacion =
    direccionElevacion === null
      ? null
      : direccionElevacion === 'alineada'
        ? 'Altura alineada'
        : direccionElevacion === 'subir'
          ? `Sube el móvil ${gradosElevacion}°`
          : `Baja el móvil ${gradosElevacion}°`;

  const mostrarBotonActivar =
    estadoSensor === 'inactivo' || estadoSensor === 'denegado' || estadoSensor === 'sin-lecturas';
  const estadoCorrecto = estadoSensor === 'activo';
  const mensajeEstado =
    estadoSensor === 'activo' && referenciaSensor === 'relativa'
      ? 'Sensores activos (orientación relativa: el Norte puede no ser exacto en este navegador).'
      : MENSAJES_ESTADO[estadoSensor];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md ${paleta.claseBackdrop}`}
      onPointerDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className={`hud-esquinas hud-${tema} relative w-full max-w-xl max-h-[94dvh] overflow-y-auto overscroll-contain rounded-3xl border p-4 sm:p-6 ${paleta.clasePanel}`}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] uppercase tracking-[0.25em] font-mono ${paleta.claseAcento}`}>
              Instrumento de orientación
            </p>
            <h2 id={idTitulo} className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Compass className={`w-5 h-5 ${paleta.claseAcento}`} aria-hidden="true" />
              Brújula Astronómica 3D
            </h2>
            <p id={idDescripcion} className="text-xs opacity-75 mt-1">
              Gira con tu dispositivo o arrastra el disco. Los marcadores del anillo exterior son la
              Luna, los planetas y el astro seleccionado sobre el horizonte.
            </p>
            <p className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md border border-current/20 bg-current/5 font-mono text-[11px] opacity-80">
              <span>Decl. Mag: {etiquetaDeclinacion}</span>
              <span aria-hidden="true">·</span>
              <span>Norte geográfico</span>
            </p>
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la brújula"
            className="grid place-items-center min-w-11 min-h-11 rounded-xl border border-current/25 hover:bg-current/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Brújula 3D */}
        <div className="relative mx-auto mt-4 w-[min(80vw,22rem)] aspect-square select-none">
          <div
            ref={discoRef}
            role="slider"
            tabIndex={0}
            aria-label="Rumbo de la brújula"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={rumboEntero}
            aria-valuetext={`${rumboEntero} grados, ${cardinal}, altitud ${altitudEntera} grados`}
            onPointerDown={manejarPunteroAbajo}
            onPointerMove={manejarPunteroMovido}
            onPointerUp={finalizarArrastre}
            onPointerCancel={finalizarArrastre}
            onKeyDown={manejarTeclaDisco}
            className="absolute inset-0 rounded-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ perspective: '1000px', touchAction: 'none' }}
          >
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${inclinacionVisual}deg)`,
              }}
            >
              {/* Grosor del instrumento (capas inferiores) */}
              {[-18, -12, -6].map((z) => (
                <div
                  key={z}
                  aria-hidden="true"
                  className="absolute inset-[3%] rounded-full"
                  style={{
                    transform: `translateZ(${z}px)`,
                    backgroundColor: paleta.capa,
                    border: `1px solid ${paleta.esferaBorde}`,
                    opacity: 0.85,
                  }}
                />
              ))}

              {/* Disco giratorio (SVG) */}
              <svg
                viewBox="-20 -20 440 440"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
                style={{ transform: 'translateZ(0px)' }}
              >
                <circle
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO_ESFERA}
                  fill={paleta.esfera}
                  stroke={paleta.esferaBorde}
                  strokeWidth="2"
                />
                <circle
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO_MARCAS + 2}
                  fill="none"
                  stroke={paleta.aro}
                  strokeWidth="1"
                />
                <circle cx={CENTRO} cy={CENTRO} r={110} fill="none" stroke={paleta.aro} strokeDasharray="2 5" />

                <g transform={`rotate(${-visual.rumbo} ${CENTRO} ${CENTRO})`}>
                  {MARCAS.map((m) => (
                    <line
                      key={m.angulo}
                      x1={m.x1}
                      y1={m.y1}
                      x2={m.x2}
                      y2={m.y2}
                      stroke={
                        m.angulo === 0 ? paleta.norte : m.tipo === 'menor' ? paleta.marcaMenor : paleta.marcaMayor
                      }
                      strokeWidth={m.tipo === 'mayor' ? 2.5 : m.tipo === 'media' ? 1.6 : 1}
                      strokeLinecap="round"
                    />
                  ))}

                  {ETIQUETAS.map((e) => (
                    <text
                      key={e.angulo}
                      x={e.x}
                      y={e.y}
                      transform={`rotate(${visual.rumbo} ${e.x} ${e.y})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily={
                        e.tipo === 'grado'
                          ? "'JetBrains Mono Variable', ui-monospace, monospace"
                          : "'Space Grotesk Variable', system-ui, sans-serif"
                      }
                      fontWeight={e.tipo === 'grado' ? 500 : 700}
                      fontSize={e.tipo === 'cardinal' ? 24 : e.tipo === 'intercardinal' ? 14 : 10.5}
                      fill={
                        e.angulo === 0 ? paleta.norte : e.tipo === 'grado' ? paleta.textoSuave : paleta.texto
                      }
                    >
                      {e.texto}
                    </text>
                  ))}

                  {/* Aguja: norte destacado y cola sur */}
                  <polygon
                    points={`${CENTRO},${CENTRO - 122} ${CENTRO - 9},${CENTRO - 76} ${CENTRO + 9},${CENTRO - 76}`}
                    fill={paleta.norte}
                  />
                  <polygon
                    points={`${CENTRO},${CENTRO + 108} ${CENTRO - 7},${CENTRO + 76} ${CENTRO + 7},${CENTRO + 76}`}
                    fill={paleta.sur}
                  />

                  {/* Marcadores astronómicos en su acimut real */}
                  {objetivosVisibles.map((objetivo) => {
                    const p = puntoPolar(objetivo.acimut, RADIO_MARCADORES);
                    const esAlineado = alineado?.id === objetivo.id;
                    const esSeleccionado = objetivoSeleccionado?.id === objetivo.id;
                    const color = paleta.marcadorFijo ?? objetivo.color;
                    const etiqueta = etiquetaMarcador(objetivo.nombre);
                    return (
                      <g key={objetivo.id} transform={`rotate(${visual.rumbo} ${p.x} ${p.y})`}>
                        {(esAlineado || esSeleccionado) && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={14}
                            fill="none"
                            stroke={paleta.acento}
                            strokeWidth={esAlineado ? '2' : '1.4'}
                            strokeDasharray={esAlineado ? undefined : '3 2'}
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={9.5}
                          fill={esAlineado ? paleta.acento : color}
                          stroke={paleta.esfera}
                          strokeWidth="1.5"
                        />
                        <text
                          x={p.x}
                          y={p.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={etiqueta.length > 2 ? '7.5' : '8.5'}
                          fontWeight={700}
                          fontFamily="'Space Grotesk Variable', system-ui, sans-serif"
                          fill={tema === 'rojo' ? '#000000' : '#0f172a'}
                        >
                          {etiqueta}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Línea de fe fija (dirección del dispositivo) */}
                <polygon
                  points={`${CENTRO},${CENTRO - RADIO_ESFERA + 14} ${CENTRO - 10},${-16} ${CENTRO + 10},${-16}`}
                  fill={paleta.acento}
                />
              </svg>

              {/* Cardán: meridianos de la cúpula que giran con el rumbo */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ transformStyle: 'preserve-3d', transform: `rotateZ(${-visual.rumbo}deg)` }}
              >
                <div
                  className="absolute inset-[6%] rounded-full"
                  style={{ border: `1.5px solid ${paleta.aro}`, transform: 'rotateY(90deg)' }}
                />
                <div
                  className="absolute inset-[6%] rounded-full"
                  style={{ border: `1px solid ${paleta.aro}`, transform: 'rotateX(90deg)' }}
                />
              </div>
            </div>
          </div>

          {/* Lectura central (plana, siempre legible) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] aspect-square rounded-full border flex flex-col items-center justify-center ${paleta.claseLectura}`}
          >
            <span className="font-mono font-bold text-3xl sm:text-4xl leading-none tabular-nums">
              {String(rumboEntero).padStart(3, '0')}°
            </span>
            <span className={`font-display font-bold text-sm mt-1 ${paleta.claseAcento}`}>{cardinal}</span>
            <span className="font-mono text-[10px] opacity-75 mt-0.5 tabular-nums">
              Alt {altitudEntera}°
            </span>
          </div>
        </div>

        {/* Aviso de alineación */}
        <div aria-live="polite" className="min-h-12 mt-3 flex items-center justify-center">
          {alineado ? (
            <p
              className={`alineacion-pulso inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3.5 py-2 rounded-2xl border text-sm font-medium text-center ${
                alturaAlineada ? paleta.claseEstadoOk : paleta.claseAviso
              }`}
            >
              <Target className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Apuntando hacia {alineado.nombre} ·{' '}
                <span className="font-mono">Alt {Math.round(alineado.altitud)}°</span>
              </span>
              {textoGuiaElevacion && (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold">
                  {direccionElevacion === 'alineada' ? (
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : direccionElevacion === 'subir' ? (
                    <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {textoGuiaElevacion}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs opacity-65 text-center">
              {objetivosVisibles.length > 0
                ? 'Gira hasta situar un marcador bajo la línea de fe superior.'
                : 'Ahora mismo no hay objetivos visibles sobre el horizonte.'}
            </p>
          )}
        </div>

        {/* Estado de sensores */}
        <div className="mt-2 space-y-3">
          <p
            role="status"
            className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl border ${
              estadoCorrecto ? paleta.claseEstadoOk : paleta.claseEstadoAviso
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{mensajeEstado}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {mostrarBotonActivar && (
              <button
                type="button"
                onClick={() => {
                  void activarSensores();
                }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${paleta.claseBotonPrimario}`}
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                Activar sensores del dispositivo
              </button>
            )}
            {estadoSensor === 'activo' && (
              <button
                type="button"
                onClick={() => (modoManual ? setModoManual(false) : pasarAModoManual())}
                aria-pressed={modoManual}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border border-current/30 hover:bg-current/10 text-sm font-medium cursor-pointer transition-colors"
              >
                <Hand className="w-4 h-4" aria-hidden="true" />
                {modoManual ? 'Volver a los sensores' : 'Modo manual'}
              </button>
            )}
          </div>

          {/* Controles de simulación */}
          {simulacion && (
            <fieldset className="p-3 rounded-2xl border border-current/20 bg-current/5 space-y-1">
              <legend className="px-1.5 text-[10px] uppercase tracking-[0.2em] font-mono opacity-75">
                Modo simulación
              </legend>
              <label className="block">
                <span className="flex items-center justify-between text-xs">
                  <span>Rumbo</span>
                  <span className="font-mono">{String(Math.round(normalizarAngulo(rumboManual)) % 360).padStart(3, '0')}°</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={359}
                  step={1}
                  value={Math.round(normalizarAngulo(rumboManual)) % 360}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    if (!Number.isFinite(valor)) return;
                    setModoManual(true);
                    setRumboManual(limitar(valor, 0, 359));
                  }}
                  className={`rango-hud ${paleta.claseAcento}`}
                />
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-xs">
                  <span>Altitud de apuntado</span>
                  <span className="font-mono tabular-nums">
                    {altitudManual > 0 ? '+' : ''}
                    {altitudManual}°
                  </span>
                </span>
                <input
                  type="range"
                  min={ALTITUD_MANUAL_MIN}
                  max={ALTITUD_MANUAL_MAX}
                  step={1}
                  value={altitudManual}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    if (!Number.isFinite(valor)) return;
                    setModoManual(true);
                    setAltitudManual(limitar(valor, ALTITUD_MANUAL_MIN, ALTITUD_MANUAL_MAX));
                  }}
                  className={`rango-hud ${paleta.claseAcento}`}
                />
              </label>
              <p className="text-[11px] opacity-70">
                También puedes arrastrar el disco o usar las flechas del teclado (Mayús: pasos de 15°).
              </p>
            </fieldset>
          )}

          {/* Astros visibles */}
          {objetivosVisibles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-65 mb-1.5">
                Sobre el horizonte
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {objetivosVisibles.map((objetivo) => {
                  const esAlineado = alineado?.id === objetivo.id;
                  return (
                    <li
                      key={objetivo.id}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                        esAlineado ? paleta.claseAviso : 'border-current/15'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: paleta.marcadorFijo ?? objetivo.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{objetivo.nombre}</span>
                      </span>
                      <span className="font-mono opacity-80 shrink-0">
                        {Math.round(objetivo.acimut)}° · {Math.round(objetivo.altitud)}°
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] opacity-55 mt-1 font-mono">Acimut · Altitud</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
