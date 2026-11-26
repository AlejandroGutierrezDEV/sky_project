import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Globe, Compass, RotateCcw, X } from 'lucide-react';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CuerpoCeleste,
  EstrellaCalculada,
  MessierCalculado,
  PuntoTrayectoria,
  TemaVisual,
} from '../types/astronomy';
import { LINEAS_CONSTELACIONES } from '../data/brightStars';

interface SkyMapProps {
  cuerpos: CuerpoCeleste[];
  estrellas: EstrellaCalculada[];
  messier: MessierCalculado[];
  tema: TemaVisual;
  mostrarConstelaciones: boolean;
  mostrarEtiquetasEstrellas: boolean;
  mostrarMessier: boolean;
  astroSeleccionado: AstroSeleccionado | null;
  trayectoria: PuntoTrayectoria[];
  onSeleccionarAstro: (astro: AstroSeleccionado | null) => void;
  contadorFoco?: number;
}

type ModoVista = '2d' | '3d';

interface Camara3D {
  rotAz: number;
  tilt: number;
}

interface PuntoProyectado {
  x: number;
  y: number;
  escala: number;
  profundidad: number;
}

interface ObjetoHover {
  id: string;
  categoria: CategoriaAstro;
  nombreCorto: string;
  nombre: string;
  subtitulo: string;
  altitud: number;
  acimut: number;
  magnitud: number;
  x: number;
  y: number;
}

interface PaletaMapa {
  fondoExterior: string;
  cieloCentro: string;
  cieloBorde: string;
  rejilla: string;
  textoCardinal: string;
  norte: string;
  lineaConst: string;
  estrella: string;
  textoEstrella: string;
}

interface CacheEscenaCanvas {
  canvas: HTMLCanvasElement;
  ancho: number;
  alto: number;
}

const TAMANO_CANVAS = 560;
const CAMARA_INICIAL: Camara3D = { rotAz: 0, tilt: 32 };
const DURACION_TRANSICION_CAMARA_MS = 480;

function normalizarAcimut(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

function diferenciaAngularCorta(origen: number, destino: number): number {
  return ((destino - origen + 540) % 360) - 180;
}

function calcularTiltParaAltitud(altitud: number): number {
  return Math.max(12, Math.min(85, 16 + altitud * 0.72));
}

function buscarPosicionAstroVisible(
  astro: AstroSeleccionado,
  cuerpos: CuerpoCeleste[],
  estrellas: EstrellaCalculada[],
  messier: MessierCalculado[]
): { altitud: number; acimut: number } | null {
  if (astro.categoria === 'cuerpo') {
    const cuerpo = cuerpos.find((c) => c.id === astro.id);
    return cuerpo && cuerpo.altitud > 0 ? { altitud: cuerpo.altitud, acimut: cuerpo.acimut } : null;
  }
  if (astro.categoria === 'estrella') {
    const estrella = estrellas.find((e) => e.id === astro.id);
    return estrella && estrella.visible
      ? { altitud: estrella.altitud, acimut: estrella.acimut }
      : null;
  }
  const objMessier = messier.find((m) => m.id === astro.id);
  return objMessier && objMessier.visible
    ? { altitud: objMessier.altitud, acimut: objMessier.acimut }
    : null;
}

const PALETAS: Record<TemaVisual, PaletaMapa> = {
  oscuro: {
    fondoExterior: '#020617',
    cieloCentro: '#0b1530',
    cieloBorde: '#020617',
    rejilla: 'rgba(148, 163, 184, 0.16)',
    textoCardinal: '#94a3b8',
    norte: '#38bdf8',
    lineaConst: 'rgba(56, 189, 248, 0.32)',
    estrella: '#f8fafc',
    textoEstrella: 'rgba(203, 213, 225, 0.78)',
  },
  claro: {
    fondoExterior: '#e2e8f0',
    cieloCentro: '#0f172a',
    cieloBorde: '#1e293b',
    rejilla: 'rgba(148, 163, 184, 0.18)',
    textoCardinal: '#1e293b',
    norte: '#0284c7',
    lineaConst: 'rgba(56, 189, 248, 0.34)',
    estrella: '#f8fafc',
    textoEstrella: 'rgba(203, 213, 225, 0.78)',
  },
  rojo: {
    fondoExterior: '#000000',
    cieloCentro: '#140000',
    cieloBorde: '#050000',
    rejilla: 'rgba(220, 38, 38, 0.22)',
    textoCardinal: '#ef4444',
    norte: '#ff0000',
    lineaConst: 'rgba(239, 68, 68, 0.35)',
    estrella: '#ef4444',
    textoEstrella: 'rgba(239, 68, 68, 0.72)',
  },
};

const COLORES_ESPECTRALES: Record<string, string> = {
  rigel: '#93c5fd',
  sirius: '#bae6fd',
  spica: '#93c5fd',
  bellatrix: '#bfdbfe',
  regulus: '#bae6fd',
  vega: '#e0f2fe',
  deneb: '#e0f2fe',
  altair: '#f0f9ff',
  betelgeuse: '#fdba74',
  aldebaran: '#fdba74',
  antares: '#fca5a5',
  arcturus: '#fed7aa',
  capella: '#fef08a',
  pollux: '#fde68a',
  polaris: '#fef9c3',
};

const CLASES_TOOLTIP: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-900/90 border-sky-500/40 text-slate-100 backdrop-blur-md',
  claro: 'bg-white/95 border-slate-300 text-slate-800 shadow-md backdrop-blur-md',
  rojo: 'bg-black border-red-600 text-red-500',
};

const CARDINALES = [
  { label: 'N', az: 0, destacar: true },
  { label: 'NE', az: 45, destacar: false },
  { label: 'E', az: 90, destacar: false },
  { label: 'SE', az: 135, destacar: false },
  { label: 'S', az: 180, destacar: false },
  { label: 'SO', az: 225, destacar: false },
  { label: 'O', az: 270, destacar: false },
  { label: 'NO', az: 315, destacar: false },
];

function proyectar2D(
  altitud: number,
  acimut: number,
  cx: number,
  cy: number,
  radio: number
): PuntoProyectado {
  const r = radio * ((90 - altitud) / 90);
  const rad = (acimut * Math.PI) / 180;
  return {
    x: cx - r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
    escala: 1,
    profundidad: 0,
  };
}

function proyectar3D(
  altitud: number,
  acimut: number,
  cx: number,
  cy: number,
  size: number,
  camara: Camara3D,
  factorRadio = 1
): PuntoProyectado {
  const altRad = (altitud * Math.PI) / 180;
  const azRel = ((acimut - camara.rotAz) * Math.PI) / 180;
  const cosAlt = Math.cos(altRad) * factorRadio;

  const x3 = -cosAlt * Math.sin(azRel);
  const y3 = Math.sin(altRad) * factorRadio;
  const z3 = -cosAlt * Math.cos(azRel);

  const tiltRad = (camara.tilt * Math.PI) / 180;
  const yRot = y3 * Math.cos(tiltRad) - z3 * Math.sin(tiltRad);
  const zRot = y3 * Math.sin(tiltRad) + z3 * Math.cos(tiltRad);

  const distCam = 2.9;
  const escala = distCam / (distCam - zRot);
  const radio3D = size * 0.36;
  const baseY = cy + size * 0.14;

  return {
    x: cx + x3 * radio3D * escala,
    y: baseY - yRot * radio3D * escala,
    escala,
    profundidad: zRot,
  };
}

function dibujarBaseMapa2D(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  radio: number,
  paleta: PaletaMapa
) {
  ctx.fillStyle = paleta.fondoExterior;
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radio);
  grad.addColorStop(0, paleta.cieloCentro);
  grad.addColorStop(1, paleta.cieloBorde);

  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = paleta.textoCardinal;
  ctx.stroke();

  ctx.strokeStyle = paleta.rejilla;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (const alt of [30, 60]) {
    const rAnillo = radio * ((90 - alt) / 90);
    ctx.beginPath();
    ctx.arc(cx, cy, rAnillo, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx, cy - radio);
  ctx.lineTo(cx, cy + radio);
  ctx.moveTo(cx - radio, cy);
  ctx.lineTo(cx + radio, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = 'bold 13px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const { label, az, destacar } of CARDINALES) {
    const pos = proyectar2D(-7, az, cx, cy, radio);
    ctx.fillStyle = destacar ? paleta.norte : paleta.textoCardinal;
    ctx.fillText(label, pos.x, pos.y);
  }
}

function dibujarBaseMapa3D(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  camara: Camara3D,
  paleta: PaletaMapa,
  tema: TemaVisual
) {
  ctx.fillStyle = paleta.fondoExterior;
  ctx.fillRect(0, 0, size, size);

  // Halo atmosférico suave detrás de la bóveda
  const cenit = proyectar3D(45, camara.rotAz, cx, cy, size, camara);
  const gradCupula = ctx.createRadialGradient(cenit.x, cenit.y, 12, cx, cy, size * 0.48);
  gradCupula.addColorStop(0, paleta.cieloCentro);
  gradCupula.addColorStop(1, paleta.fondoExterior);
  ctx.fillStyle = gradCupula;
  ctx.fillRect(0, 0, size, size);

  // Plano del horizonte (alt = 0°)
  ctx.beginPath();
  const pasos = 72;
  for (let i = 0; i <= pasos; i++) {
    const az = (i / pasos) * 360;
    const p = proyectar3D(0, az, cx, cy, size, camara);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = tema === 'rojo' ? 'rgba(30, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.55)';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = paleta.textoCardinal;
  ctx.stroke();

  // Anillos de altitud 30° y 60° en 3D
  ctx.strokeStyle = paleta.rejilla;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (const alt of [30, 60]) {
    ctx.beginPath();
    for (let i = 0; i <= pasos; i++) {
      const az = (i / pasos) * 360;
      const p = proyectar3D(alt, az, cx, cy, size, camara);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Meridianos principales (N-S y E-O) sobre la cúpula
  for (const azBase of [0, 90]) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const ang = (i / 36) * 180;
      const alt = ang <= 90 ? ang : 180 - ang;
      const az = ang <= 90 ? azBase : azBase + 180;
      const p = proyectar3D(alt, az, cx, cy, size, camara);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Puntos cardinales en el perímetro del horizonte 3D
  ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const { label, az, destacar } of CARDINALES) {
    const p = proyectar3D(0, az, cx, cy, size, camara, 1.12);
    const alpha = Math.max(0.45, Math.min(1, 0.72 + p.profundidad * 0.3));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = destacar ? paleta.norte : paleta.textoCardinal;
    ctx.fillText(label, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function dibujarEstrellas(
  ctx: CanvasRenderingContext2D,
  estrellas: EstrellaCalculada[],
  mostrarConstelaciones: boolean,
  mostrarEtiquetas: boolean,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  paleta: PaletaMapa,
  tema: TemaVisual,
  interactivos: ObjetoHover[]
) {
  const mapaEstrellas = new Map<string, { pos: PuntoProyectado; data: EstrellaCalculada }>();

  for (const est of estrellas) {
    if (est.altitud > -5) {
      mapaEstrellas.set(est.id, { pos: proyectarFn(est.altitud, est.acimut), data: est });
    }
  }

  if (mostrarConstelaciones) {
    ctx.strokeStyle = paleta.lineaConst;
    ctx.lineWidth = 1.2;
    for (const constelacion of LINEAS_CONSTELACIONES) {
      for (const [idA, idB] of constelacion.tramos) {
        const a = mapaEstrellas.get(idA);
        const b = mapaEstrellas.get(idB);
        if (!a || !b) continue;
        if (!a.data.visible && !b.data.visible) continue;

        ctx.beginPath();
        ctx.moveTo(a.pos.x, a.pos.y);
        ctx.lineTo(b.pos.x, b.pos.y);
        ctx.stroke();
      }
    }
  }

  const visibles = [...mapaEstrellas.values()]
    .filter(({ data }) => data.visible)
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  for (const { pos, data } of visibles) {
    const tamanoBase = Math.max(1.5, 4.2 - data.magnitud * 0.8);
    const tamano = tamanoBase * Math.max(0.75, Math.min(1.25, pos.escala));
    const colorEstrella =
      tema === 'rojo' ? paleta.estrella : (COLORES_ESPECTRALES[data.id] ?? paleta.estrella);

    // Halo luminoso sutil para estrellas brillantes
    if (data.magnitud < 1.8) {
      const radioHalo = tamano * 3.4;
      const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radioHalo);
      if (tema === 'rojo') {
        halo.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        halo.addColorStop(0, `${colorEstrella}66`);
        halo.addColorStop(1, `${colorEstrella}00`);
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radioHalo, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, tamano, 0, Math.PI * 2);
    ctx.fillStyle = colorEstrella;
    ctx.fill();

    if (mostrarEtiquetas && data.magnitud < 2.1) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = paleta.textoEstrella;
      ctx.textAlign = 'left';
      ctx.fillText(data.nombre.split(' ')[0], pos.x + tamano + 4, pos.y + 3);
    }

    interactivos.push({
      id: data.id,
      categoria: 'estrella',
      nombreCorto: data.nombre,
      nombre: data.nombre,
      subtitulo: `Estrella · Const. ${data.constelacion}`,
      altitud: data.altitud,
      acimut: data.acimut,
      magnitud: data.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }
}

function dibujarMessier(
  ctx: CanvasRenderingContext2D,
  messier: MessierCalculado[],
  tema: TemaVisual,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
) {
  const colorMessier = tema === 'rojo' ? '#dc2626' : '#34d399';

  for (const obj of messier) {
    if (!obj.visible) continue;
    const pos = proyectarFn(obj.altitud, obj.acimut);
    const r = 6 * Math.max(0.8, Math.min(1.2, pos.escala));

    ctx.save();
    ctx.strokeStyle = colorMessier;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = colorMessier;
    ctx.textAlign = 'left';
    ctx.fillText(obj.id, pos.x + r + 3, pos.y + 3);

    interactivos.push({
      id: obj.id,
      categoria: 'messier',
      nombreCorto: `${obj.id} · ${obj.nombre}`,
      nombre: `${obj.id} · ${obj.nombre}`,
      subtitulo: `${obj.tipo.toUpperCase()} (${obj.dificultad}) · ${obj.constelacion}`,
      altitud: obj.altitud,
      acimut: obj.acimut,
      magnitud: obj.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }
}

function dibujarCuerpos(
  ctx: CanvasRenderingContext2D,
  cuerpos: CuerpoCeleste[],
  tema: TemaVisual,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
) {
  const visibles = cuerpos
    .filter((c) => c.altitud > 0)
    .map((c) => ({ cuerpo: c, pos: proyectarFn(c.altitud, c.acimut) }))
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  for (const { cuerpo, pos } of visibles) {
    const colorCuerpo = tema === 'rojo' ? '#ff2a2a' : cuerpo.color;
    const rBase = cuerpo.tipo === 'luna' ? 7 : 5.5;
    const rCuerpo = rBase * Math.max(0.8, Math.min(1.25, pos.escala));

    // Halo exterior
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCuerpo + 5, 0, Math.PI * 2);
    ctx.fillStyle = tema === 'rojo' ? 'rgba(255, 0, 0, 0.2)' : `${colorCuerpo}33`;
    ctx.fill();

    // Anillo inclinado de Saturno
    const esSaturno = cuerpo.id === 'Saturn' || cuerpo.nombre === 'Saturno';
    if (esSaturno) {
      ctx.save();
      ctx.strokeStyle = tema === 'rojo' ? '#dc2626' : '#fde68a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rCuerpo * 2.15, rCuerpo * 0.72, -0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Disco del cuerpo
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCuerpo, 0, Math.PI * 2);
    ctx.fillStyle = colorCuerpo;
    ctx.fill();

    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = colorCuerpo;
    ctx.textAlign = 'left';
    ctx.fillText(cuerpo.nombre, pos.x + rCuerpo + (esSaturno ? 10 : 6), pos.y + 4);

    interactivos.push({
      id: cuerpo.id,
      categoria: 'cuerpo',
      nombreCorto: cuerpo.nombre,
      nombre: cuerpo.nombre,
      subtitulo: cuerpo.faseLunar ? `${cuerpo.faseLunar} (${cuerpo.iluminacion}%)` : 'Planeta',
      altitud: cuerpo.altitud,
      acimut: cuerpo.acimut,
      magnitud: cuerpo.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }
}

function dibujarTrayectoria(
  ctx: CanvasRenderingContext2D,
  trayectoria: PuntoTrayectoria[],
  tema: TemaVisual,
  proyectarFn: (alt: number, az: number) => PuntoProyectado
) {
  if (trayectoria.length === 0) return;

  const colorLinea = tema === 'rojo' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(56, 189, 248, 0.78)';
  const colorPunto = tema === 'rojo' ? '#ff3b3b' : '#7dd3fc';
  const colorTexto = tema === 'rojo' ? 'rgba(252, 165, 165, 0.88)' : 'rgba(186, 230, 253, 0.9)';

  ctx.save();
  ctx.strokeStyle = colorLinea;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();

  let enTrazo = false;
  const puntosVisibles: { pos: PuntoProyectado; horaEtiqueta: string; indice: number }[] = [];

  for (let i = 0; i < trayectoria.length; i++) {
    const punto = trayectoria[i];
    if (punto.altitud > 0) {
      const pos = proyectarFn(punto.altitud, punto.acimut);
      if (!enTrazo) {
        ctx.moveTo(pos.x, pos.y);
        enTrazo = true;
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
      puntosVisibles.push({ pos, horaEtiqueta: punto.horaEtiqueta, indice: i });
    } else {
      enTrazo = false;
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (const { pos, horaEtiqueta, indice } of puntosVisibles) {
    // Mostrar marcadores horarios discretos cada hora (índices pares)
    if (indice % 2 !== 0) continue;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = colorPunto;
    ctx.fill();

    ctx.fillStyle = colorTexto;
    ctx.fillText(horaEtiqueta, pos.x, pos.y - 5);
  }

  ctx.restore();
}

function dibujarReticulaSeleccion(
  ctx: CanvasRenderingContext2D,
  astroSeleccionado: AstroSeleccionado | null,
  interactivos: ObjetoHover[],
  tema: TemaVisual,
  fasePulso: number
) {
  if (!astroSeleccionado) return;

  const objetivo = interactivos.find(
    (item) => item.id === astroSeleccionado.id && item.categoria === astroSeleccionado.categoria
  );
  if (!objetivo) return;

  const colorPrincipal = tema === 'rojo' ? '#ff3b3b' : '#38bdf8';
  const radioBase = objetivo.categoria === 'cuerpo' ? 14 : 11;
  const radioPulso = radioBase + fasePulso * 4.5;

  ctx.save();

  // Anillo exterior pulsante
  ctx.beginPath();
  ctx.arc(objetivo.x, objetivo.y, radioPulso, 0, Math.PI * 2);
  ctx.strokeStyle = colorPrincipal;
  ctx.globalAlpha = 0.85 - fasePulso * 0.45;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Anillo interior y marcas de retícula
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(objetivo.x, objetivo.y, radioBase - 1, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  const tamMarca = 4.5;
  const inicio = radioBase + 1;
  ctx.beginPath();
  ctx.moveTo(objetivo.x - inicio - tamMarca, objetivo.y);
  ctx.lineTo(objetivo.x - inicio, objetivo.y);
  ctx.moveTo(objetivo.x + inicio, objetivo.y);
  ctx.lineTo(objetivo.x + inicio + tamMarca, objetivo.y);
  ctx.moveTo(objetivo.x, objetivo.y - inicio - tamMarca);
  ctx.lineTo(objetivo.x, objetivo.y - inicio);
  ctx.moveTo(objetivo.x, objetivo.y + inicio);
  ctx.lineTo(objetivo.x, objetivo.y + inicio + tamMarca);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

export function SkyMap({
  cuerpos,
  estrellas,
  messier,
  tema,
  mostrarConstelaciones,
  mostrarEtiquetasEstrellas,
  mostrarMessier,
  astroSeleccionado,
  trayectoria,
  onSeleccionarAstro,
  contadorFoco = 0,
}: Readonly<SkyMapProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const escenaBaseRef = useRef<CacheEscenaCanvas | null>(null);
  const [modoVista, setModoVista] = useState<ModoVista>('2d');
  const [camara, setCamara] = useState<Camara3D>(CAMARA_INICIAL);
  const [hoverInfo, setHoverInfo] = useState<ObjetoHover | null>(null);

  const camaraRef = useRef<Camara3D>(CAMARA_INICIAL);
  const animacionCamaraRef = useRef<number>(0);
  const datosAstrosRef = useRef({ cuerpos, estrellas, messier });
  const puntosInteractivosRef = useRef<ObjetoHover[]>([]);
  const arrastreRef = useRef<{
    activo: boolean;
    pointerId: number;
    inicioX: number;
    inicioY: number;
    ultimoX: number;
    ultimoY: number;
    movido: boolean;
  } | null>(null);

  useEffect(() => {
    camaraRef.current = camara;
  }, [camara]);

  useEffect(() => {
    datosAstrosRef.current = { cuerpos, estrellas, messier };
  }, [cuerpos, estrellas, messier]);

  const cancelarAnimacionCamara = () => {
    if (animacionCamaraRef.current !== 0) {
      window.cancelAnimationFrame(animacionCamaraRef.current);
      animacionCamaraRef.current = 0;
    }
  };

  useEffect(() => {
    if (modoVista !== '3d' || !astroSeleccionado) return;

    const { cuerpos: listaCuerpos, estrellas: listaEstrellas, messier: listaMessier } =
      datosAstrosRef.current;
    const posicion = buscarPosicionAstroVisible(
      astroSeleccionado,
      listaCuerpos,
      listaEstrellas,
      listaMessier
    );
    if (!posicion) return;

    const destino: Camara3D = {
      rotAz: normalizarAcimut(posicion.acimut),
      tilt: calcularTiltParaAltitud(posicion.altitud),
    };

    const prefiereMovimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (animacionCamaraRef.current !== 0) {
      window.cancelAnimationFrame(animacionCamaraRef.current);
      animacionCamaraRef.current = 0;
    }

    if (prefiereMovimientoReducido) {
      animacionCamaraRef.current = window.requestAnimationFrame(() => {
        animacionCamaraRef.current = 0;
        camaraRef.current = destino;
        setCamara(destino);
      });
      return () => {
        if (animacionCamaraRef.current !== 0) {
          window.cancelAnimationFrame(animacionCamaraRef.current);
          animacionCamaraRef.current = 0;
        }
      };
    }

    const origen = camaraRef.current;
    const deltaAz = diferenciaAngularCorta(origen.rotAz, destino.rotAz);
    const deltaTilt = destino.tilt - origen.tilt;

    if (Math.abs(deltaAz) < 0.2 && Math.abs(deltaTilt) < 0.2) return;

    let inicio = 0;
    const paso = (tiempo: number) => {
      if (inicio === 0) inicio = tiempo;
      const progreso = Math.min(1, (tiempo - inicio) / DURACION_TRANSICION_CAMARA_MS);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      const siguiente: Camara3D = {
        rotAz: normalizarAcimut(origen.rotAz + deltaAz * suavizado),
        tilt: origen.tilt + deltaTilt * suavizado,
      };
      camaraRef.current = siguiente;
      setCamara(siguiente);

      if (progreso < 1) {
        animacionCamaraRef.current = window.requestAnimationFrame(paso);
      } else {
        animacionCamaraRef.current = 0;
      }
    };

    animacionCamaraRef.current = window.requestAnimationFrame(paso);

    return () => {
      if (animacionCamaraRef.current !== 0) {
        window.cancelAnimationFrame(animacionCamaraRef.current);
        animacionCamaraRef.current = 0;
      }
    };
  }, [astroSeleccionado, modoVista, contadorFoco]);

  const claveEscenaBase = useMemo(
    () => ({
      cuerpos,
      estrellas,
      messier,
      tema,
      modoVista,
      camara,
      mostrarConstelaciones,
      mostrarEtiquetasEstrellas,
      mostrarMessier,
      trayectoria,
    }),
    [
      cuerpos,
      estrellas,
      messier,
      tema,
      modoVista,
      camara,
      mostrarConstelaciones,
      mostrarEtiquetasEstrellas,
      mostrarMessier,
      trayectoria,
    ]
  );

  // Effect 1: Renderizado de la escena celeste base en el canvas secundario
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = TAMANO_CANVAS;
    const tamanoBuffer = Math.round(size * dpr);

    let cache = escenaBaseRef.current;
    if (!cache) {
      const canvasBase = document.createElement('canvas');
      canvasBase.width = tamanoBuffer;
      canvasBase.height = tamanoBuffer;
      cache = {
        canvas: canvasBase,
        ancho: tamanoBuffer,
        alto: tamanoBuffer,
      };
      escenaBaseRef.current = cache;
    } else if (cache.ancho !== tamanoBuffer || cache.alto !== tamanoBuffer) {
      cache.canvas.width = tamanoBuffer;
      cache.canvas.height = tamanoBuffer;
      cache.ancho = tamanoBuffer;
      cache.alto = tamanoBuffer;
    }

    const ctxBase = cache.canvas.getContext('2d');
    if (!ctxBase) return;

    const cx = size / 2;
    const cy = size / 2;
    const radio = size / 2 - 36;
    const paleta = PALETAS[tema];

    const proyectarFn =
      modoVista === '2d'
        ? (alt: number, az: number) => proyectar2D(alt, az, cx, cy, radio)
        : (alt: number, az: number) => proyectar3D(alt, az, cx, cy, size, camara);

    ctxBase.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxBase.clearRect(0, 0, size, size);
    const interactivos: ObjetoHover[] = [];

    if (modoVista === '2d') {
      dibujarBaseMapa2D(ctxBase, size, cx, cy, radio, paleta);
      ctxBase.save();
      ctxBase.beginPath();
      ctxBase.arc(cx, cy, radio, 0, Math.PI * 2);
      ctxBase.clip();
    } else {
      dibujarBaseMapa3D(ctxBase, size, cx, cy, camara, paleta, tema);
      ctxBase.save();
    }

    dibujarEstrellas(
      ctxBase,
      estrellas,
      mostrarConstelaciones,
      mostrarEtiquetasEstrellas,
      proyectarFn,
      paleta,
      tema,
      interactivos
    );

    if (mostrarMessier) {
      dibujarMessier(ctxBase, messier, tema, proyectarFn, interactivos);
    }

    dibujarTrayectoria(ctxBase, trayectoria, tema, proyectarFn);
    dibujarCuerpos(ctxBase, cuerpos, tema, proyectarFn, interactivos);

    ctxBase.restore();
    puntosInteractivosRef.current = interactivos;
  }, [
    cuerpos,
    estrellas,
    messier,
    tema,
    modoVista,
    camara,
    mostrarConstelaciones,
    mostrarEtiquetasEstrellas,
    mostrarMessier,
    trayectoria,
  ]);

  // Effect 2: Composición desde el canvas cacheado y animación de la retícula de selección
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = TAMANO_CANVAS;
    const tamanoBuffer = Math.round(size * dpr);
    if (canvas.width !== tamanoBuffer || canvas.height !== tamanoBuffer) {
      canvas.width = tamanoBuffer;
      canvas.height = tamanoBuffer;
    }

    const { tema: temaActual, modoVista: modoActual } = claveEscenaBase;

    const dibujarFrame = (fasePulso: number) => {
      const base = escenaBaseRef.current;
      if (!base) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(base.canvas, 0, 0, size, size);

      if (astroSeleccionado) {
        ctx.save();
        if (modoActual === '2d') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 36, 0, Math.PI * 2);
          ctx.clip();
        }
        dibujarReticulaSeleccion(
          ctx,
          astroSeleccionado,
          puntosInteractivosRef.current,
          temaActual,
          fasePulso
        );
        ctx.restore();
      }
    };

    const prefiereMovimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!astroSeleccionado || prefiereMovimientoReducido) {
      dibujarFrame(0.5);
      return;
    }

    // Dibujar inmediatamente para evitar frames en blanco al cambiar escena o tamaño
    dibujarFrame((Math.sin(performance.now() / 320) + 1) / 2);

    let animacionId = 0;
    const animar = (tiempo: number) => {
      const fase = (Math.sin(tiempo / 320) + 1) / 2;
      dibujarFrame(fase);
      animacionId = window.requestAnimationFrame(animar);
    };
    animacionId = window.requestAnimationFrame(animar);

    return () => {
      window.cancelAnimationFrame(animacionId);
    };
  }, [astroSeleccionado, claveEscenaBase]);

  const buscarAstroEnPuntero = (e: PointerEvent<HTMLCanvasElement>): ObjetoHover | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = 560 / rect.width;
    const scaleY = 560 / rect.height;
    const posX = (e.clientX - rect.left) * scaleX;
    const posY = (e.clientY - rect.top) * scaleY;

    let masCercano: ObjetoHover | null = null;
    let distanciaMin = e.pointerType === 'touch' ? 28 : 18;

    for (const obj of puntosInteractivosRef.current) {
      const dist = Math.hypot(obj.x - posX, obj.y - posY);
      if (dist < distanciaMin) {
        distanciaMin = dist;
        masCercano = obj;
      }
    }
    return masCercano;
  };

  const inspeccionarPuntero = (e: PointerEvent<HTMLCanvasElement>) => {
    setHoverInfo(buscarAstroEnPuntero(e));
  };

  const manejarPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (modoVista === '3d') {
      cancelarAnimacionCamara();
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastreRef.current = {
        activo: true,
        pointerId: e.pointerId,
        inicioX: e.clientX,
        inicioY: e.clientY,
        ultimoX: e.clientX,
        ultimoY: e.clientY,
        movido: false,
      };
      return;
    }
    inspeccionarPuntero(e);
  };

  const manejarPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    if (modoVista === '3d' && arrastre && arrastre.activo && arrastre.pointerId === e.pointerId) {
      const dx = e.clientX - arrastre.ultimoX;
      const dy = e.clientY - arrastre.ultimoY;
      if (Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) > 4) {
        arrastre.movido = true;
      }
      arrastre.ultimoX = e.clientX;
      arrastre.ultimoY = e.clientY;

      setCamara((prev) => ({
        rotAz: (prev.rotAz - dx * 0.45 + 360) % 360,
        tilt: Math.max(12, Math.min(85, prev.tilt + dy * 0.35)),
      }));
      return;
    }

    inspeccionarPuntero(e);
  };

  const manejarPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    const fueArrastre = Boolean(arrastre && arrastre.pointerId === e.pointerId && arrastre.movido);

    if (arrastre && arrastre.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      arrastreRef.current = null;
    }

    if (fueArrastre) return;

    if (modoVista === '3d') {
      inspeccionarPuntero(e);
    }

    const encontrado = buscarAstroEnPuntero(e);
    if (encontrado) {
      if (
        astroSeleccionado &&
        astroSeleccionado.id === encontrado.id &&
        astroSeleccionado.categoria === encontrado.categoria
      ) {
        onSeleccionarAstro(null);
      } else {
        onSeleccionarAstro({
          id: encontrado.id,
          nombre: encontrado.nombreCorto,
          categoria: encontrado.categoria,
        });
      }
    } else if (astroSeleccionado) {
      onSeleccionarAstro(null);
    }
  };

  const manejarPointerCancel = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    if (arrastre && arrastre.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      arrastreRef.current = null;
    }
  };

  const manejarKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (modoVista !== '3d') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, rotAz: normalizarAcimut(prev.rotAz - 10) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, rotAz: normalizarAcimut(prev.rotAz + 10) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, tilt: Math.min(85, prev.tilt + 5) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara((prev) => ({ ...prev, tilt: Math.max(12, prev.tilt - 5) }));
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'Home') {
      e.preventDefault();
      cancelarAnimacionCamara();
      setCamara(CAMARA_INICIAL);
    }
  };

  const claseBotonVista = (activo: boolean) => {
    if (!activo) return 'opacity-70 hover:opacity-100';
    if (tema === 'rojo') return 'bg-red-950 text-red-500 border border-red-600';
    if (tema === 'claro') return 'bg-slate-800 text-white';
    return 'bg-sky-600 text-white';
  };

  return (
    <div className="relative flex flex-col items-center justify-center space-y-3">
      {/* Controles de Vista 2D / 3D */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
        <div
          role="group"
          aria-label="Modo de proyección del mapa"
          className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5"
        >
          <button
            type="button"
            aria-pressed={modoVista === '2d'}
            onClick={() => setModoVista('2d')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoVista === '2d'
            )}`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" /> 2D Planisferio
          </button>
          <button
            type="button"
            aria-pressed={modoVista === '3d'}
            onClick={() => setModoVista('3d')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoVista === '3d'
            )}`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" /> 3D Bóveda
          </button>
        </div>

        <div className="flex items-center gap-2">
          {modoVista === '3d' ? (
            <>
              <span className="opacity-65 hidden sm:inline">Arrastra para rotar el cielo</span>
              <button
                type="button"
                onClick={() => {
                  cancelarAnimacionCamara();
                  setCamara(CAMARA_INICIAL);
                }}
                className="min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" /> Centrar
              </button>
            </>
          ) : (
            <span className="opacity-60">Toca o pasa el cursor sobre un astro</span>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={
          modoVista === '3d'
            ? 'Bóveda celeste interactiva en 3D con estrellas, constelaciones, objetos Messier y planetas'
            : 'Mapa celeste interactivo con estrellas, constelaciones, objetos Messier y planetas'
        }
        onKeyDown={manejarKeyDown}
        onPointerDown={manejarPointerDown}
        onPointerMove={manejarPointerMove}
        onPointerUp={manejarPointerUp}
        onPointerCancel={manejarPointerCancel}
        onPointerLeave={() => {
          if (!arrastreRef.current?.activo) setHoverInfo(null);
        }}
        className={`w-full max-w-140 aspect-square rounded-2xl shadow-2xl ${
          modoVista === '3d' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-crosshair'
        }`}
      />

      {astroSeleccionado && (
        <div
          className={`px-3.5 py-1.5 rounded-xl border text-xs flex flex-wrap items-center gap-3 ${CLASES_TOOLTIP[tema]}`}
        >
          <span className="font-semibold">Trayectoria ±6h: {astroSeleccionado.nombre}</span>
          <button
            type="button"
            onClick={() => onSeleccionarAstro(null)}
            aria-label="Quitar selección de astro"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-current/25 hover:bg-current/10 cursor-pointer transition-colors"
          >
            <X className="w-3 h-3" aria-hidden="true" /> Limpiar
          </button>
        </div>
      )}

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`w-full min-h-11 px-4 py-2 rounded-xl border text-xs font-mono flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${CLASES_TOOLTIP[tema]}`}
      >
        {hoverInfo ? (
          <>
            <span className="font-bold text-sm">{hoverInfo.nombre}</span>
            <span className="opacity-80">{hoverInfo.subtitulo}</span>
            <span>Alt: {hoverInfo.altitud}°</span>
            <span>Acimut: {hoverInfo.acimut}°</span>
            <span>Mag: {hoverInfo.magnitud}</span>
          </>
        ) : (
          <span className="font-sans opacity-65 text-center">
            Toca o pasa el cursor sobre un astro para ver sus coordenadas
          </span>
        )}
      </div>
    </div>
  );
}
