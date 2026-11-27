import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Bookmark, BookmarkCheck, Globe, Compass, RotateCcw, X } from 'lucide-react';
import type {
  AstroSeleccionado,
  CategoriaAstro,
  CelestialThemePalette,
  ConstelacionCalculada,
  CuerpoCeleste,
  EscalaBortle,
  EstrellaCalculada,
  InstrumentoObservacion,
  MessierCalculado,
  ModoMapa,
  PuntoTrayectoria,
  TemaVisual,
  TipoObjetoMessier,
} from '../types/astronomy';
import { obtenerNombreConstelacionIAU } from '../data/constelacionesIAU';
import type { EntradaObjetivoSesion } from '../hooks/usePlanificadorSesion';
import { obtenerPaletaCeleste } from '../theme/celestialPalettes';
import { formatearDec, formatearRA } from '../utils/exportarSesion';

interface SkyMapProps {
  cuerpos: CuerpoCeleste[];
  estrellas: EstrellaCalculada[];
  messier: MessierCalculado[];
  constelaciones: ConstelacionCalculada[];
  tema: TemaVisual;
  modoMapa: ModoMapa;
  onCambiarModoMapa: (modo: ModoMapa) => void;
  mostrarConstelaciones: boolean;
  mostrarEstrellas: boolean;
  mostrarMessier: boolean;
  astroSeleccionado: AstroSeleccionado | null;
  trayectoria: PuntoTrayectoria[];
  onSeleccionarAstro: (astro: AstroSeleccionado | null) => void;
  contadorFoco?: number;
  magnitudLimiteVisible?: number;
  bortle?: EscalaBortle;
  instrumentoActivo?: InstrumentoObservacion | 'Todos';
  objetivoDetalleSeleccionado?: EntradaObjetivoSesion | null;
  esObjetivoEnSesion?: boolean;
  onToggleObjetivo?: (astro: EntradaObjetivoSesion) => void;
}

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
    return estrella && estrella.altitud >= 0
      ? { altitud: estrella.altitud, acimut: estrella.acimut }
      : null;
  }
  const objMessier = messier.find((m) => m.id === astro.id);
  return objMessier && objMessier.altitud >= 0
    ? { altitud: objMessier.altitud, acimut: objMessier.acimut }
    : null;
}

interface CajaEtiqueta {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ETIQUETA_TIPO_MESSIER: Readonly<Record<TipoObjetoMessier, string>> = {
  Galaxia: 'Galaxia',
  Nebulosa: 'Nebulosa',
  CumuloGlobular: 'Cúmulo globular',
  CumuloAbierto: 'Cúmulo abierto',
  RemanenteSupernova: 'Remanente supernova',
  Asterismo: 'Asterismo',
};

const ETIQUETA_INSTRUMENTO: Readonly<Record<InstrumentoObservacion, string>> = {
  'Ojo desnudo': 'Ojo desnudo',
  Prismaticos: 'Prismáticos',
  Telescopio: 'Telescopio',
};

function dibujarTextoConHalo(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  colorTexto: string,
  colorHalo: string,
  grosorHalo = 3
) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = grosorHalo;
  ctx.strokeStyle = colorHalo;
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = colorTexto;
  ctx.fillText(texto, x, y);
  ctx.restore();
}

function obtenerColorEstrellaBV(
  bv: number | undefined,
  tema: TemaVisual,
  fallback: string
): string {
  if (tema === 'rojo') return fallback;
  if (bv === undefined || !Number.isFinite(bv)) return fallback;
  if (tema === 'claro') {
    if (bv < 0.0) return '#1d4ed8';
    if (bv < 0.4) return '#1e40af';
    if (bv < 0.8) return '#0f172a';
    if (bv < 1.3) return '#92400e';
    return '#991b1b';
  }
  if (bv < 0.0) return '#93c5fd';
  if (bv < 0.4) return '#e0f2fe';
  if (bv < 0.8) return '#fef9c3';
  if (bv < 1.3) return '#fed7aa';
  return '#fca5a5';
}

function intentarReservarEtiqueta(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  cajas: CajaEtiqueta[],
  tamanoCanvas: number,
  alineacion: CanvasTextAlign = 'left',
  alturaTexto = 11
): boolean {
  const ancho = ctx.measureText(texto).width;
  const margen = 3;
  const x1 =
    alineacion === 'center'
      ? x - ancho / 2
      : alineacion === 'right'
        ? x - ancho
        : x;
  const x2 = x1 + ancho;
  const y1 = y - alturaTexto;
  const y2 = y + 2;

  if (x1 < 10 || x2 > tamanoCanvas - 10 || y1 < 10 || y2 > tamanoCanvas - 10) {
    return false;
  }

  for (const caja of cajas) {
    const separaX = x2 + margen < caja.x1 || x1 - margen > caja.x2;
    const separaY = y2 + margen < caja.y1 || y1 - margen > caja.y2;
    if (!separaX && !separaY) {
      return false;
    }
  }

  cajas.push({ x1, y1, x2, y2 });
  return true;
}

const CLASES_TOOLTIP: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-900/90 border-sky-500/40 text-slate-100 backdrop-blur-md',
  claro: 'bg-slate-50/95 border-slate-300 text-slate-900 shadow-md backdrop-blur-md',
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
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  ctx.fillStyle = paleta.background;
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radio);
  if (tema === 'claro') {
    grad.addColorStop(0, '#eff6ff');
    grad.addColorStop(1, paleta.domeSurface);
  } else if (tema === 'rojo') {
    grad.addColorStop(0, paleta.domeSurface);
    grad.addColorStop(1, '#050000');
  } else {
    grad.addColorStop(0, paleta.domeSurface);
    grad.addColorStop(1, paleta.background);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = paleta.horizonLine;
  ctx.stroke();

  ctx.strokeStyle = paleta.gridPrimary;
  ctx.lineWidth = tema === 'claro' ? 1.1 : 1;
  ctx.setLineDash([4, 4]);

  for (const alt of [30, 60]) {
    const rAnillo = radio * ((90 - alt) / 90);
    ctx.beginPath();
    ctx.arc(cx, cy, rAnillo, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = paleta.gridSecondary;
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
    const colorTexto = destacar ? paleta.highlightAccent : paleta.labelText;
    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, label, pos.x, pos.y, colorTexto, paleta.labelHalo, 3.2);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(label, pos.x, pos.y);
    }
  }
}

function dibujarBaseMapa3D(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  camara: Camara3D,
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  ctx.fillStyle = paleta.background;
  ctx.fillRect(0, 0, size, size);

  // Halo atmosférico / bóveda detrás del hemisferio celeste
  const cenit = proyectar3D(45, camara.rotAz, cx, cy, size, camara);
  const gradCupula = ctx.createRadialGradient(cenit.x, cenit.y, 12, cx, cy, size * 0.48);
  if (tema === 'claro') {
    gradCupula.addColorStop(0, '#eff6ff');
    gradCupula.addColorStop(0.65, paleta.domeSurface);
    gradCupula.addColorStop(1, paleta.background);
  } else {
    gradCupula.addColorStop(0, paleta.domeSurface);
    gradCupula.addColorStop(1, paleta.background);
  }
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
  if (tema === 'claro') {
    ctx.save();
    ctx.globalAlpha = paleta.domeOpacity;
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = tema === 'rojo' ? 'rgba(30, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.55)';
    ctx.fill();
  }
  ctx.lineWidth = tema === 'claro' ? 2 : 1.8;
  ctx.strokeStyle = paleta.horizonLine;
  ctx.stroke();

  // Anillos de altitud 30° y 60° en 3D
  ctx.strokeStyle = paleta.gridPrimary;
  ctx.lineWidth = tema === 'claro' ? 1.15 : 1;
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
  ctx.strokeStyle = paleta.gridSecondary;
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
    const alpha = tema === 'claro'
      ? Math.max(0.75, Math.min(1, 0.85 + p.profundidad * 0.2))
      : Math.max(0.45, Math.min(1, 0.72 + p.profundidad * 0.3));
    const colorTexto = destacar ? paleta.highlightAccent : paleta.labelText;
    ctx.globalAlpha = alpha;
    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, label, p.x, p.y, colorTexto, paleta.labelHalo, 3.2);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(label, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

interface EtiquetaPendiente {
  texto: string;
  x: number;
  y: number;
  color: string;
  fuente: string;
  alineacion: CanvasTextAlign;
  altura: number;
}

function dibujarConstelaciones(
  ctx: CanvasRenderingContext2D,
  constelaciones: ConstelacionCalculada[],
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  paleta: CelestialThemePalette,
  tema: TemaVisual
): EtiquetaPendiente[] {
  const etiquetas: EtiquetaPendiente[] = [];

  ctx.save();
  ctx.strokeStyle = paleta.constellationLine;
  ctx.lineWidth = tema === 'claro' ? 1.25 : 1.0;

  for (const constelacion of constelaciones) {
    let tieneSegmentoVisible = false;
    for (const segmento of constelacion.segmentos) {
      if (segmento.desde.altitud < 0 || segmento.hasta.altitud < 0) continue;
      const p1 = proyectarFn(segmento.desde.altitud, segmento.desde.acimut);
      const p2 = proyectarFn(segmento.hasta.altitud, segmento.hasta.acimut);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      tieneSegmentoVisible = true;
    }

    if (tieneSegmentoVisible && constelacion.centroAltitud >= 5) {
      const posCentro = proyectarFn(constelacion.centroAltitud, constelacion.centroAcimut);
      etiquetas.push({
        texto: constelacion.nombreEs,
        x: posCentro.x,
        y: posCentro.y,
        color: tema === 'claro' ? '#1e3a8a' : paleta.labelText,
        fuente: tema === 'claro' ? '600 9px system-ui, sans-serif' : '9px system-ui, sans-serif',
        alineacion: 'center',
        altura: 9,
      });
    }
  }

  ctx.restore();
  return etiquetas;
}

function dibujarEstrellas(
  ctx: CanvasRenderingContext2D,
  estrellas: EstrellaCalculada[],
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  paleta: CelestialThemePalette,
  tema: TemaVisual,
  interactivos: ObjetoHover[],
  magnitudLimiteVisible?: number
): EtiquetaPendiente[] {
  const limiteMagnitud =
    typeof magnitudLimiteVisible === 'number' && Number.isFinite(magnitudLimiteVisible)
      ? magnitudLimiteVisible
      : Number.POSITIVE_INFINITY;

  const visibles = estrellas
    .filter((est) => est.altitud >= 0 && est.magnitud <= limiteMagnitud)
    .map((est) => ({ pos: proyectarFn(est.altitud, est.acimut), data: est }))
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  const candidatasEtiquetas: { mag: number; etiqueta: EtiquetaPendiente }[] = [];

  for (const { pos, data } of visibles) {
    const tamanoBase = Math.max(1.0, 3.6 - data.magnitud * 0.62);
    const tamano = tamanoBase * Math.max(0.75, Math.min(1.25, pos.escala));
    const colorEstrella = obtenerColorEstrellaBV(
      data.indiceColorBV,
      tema,
      paleta.starDefault
    );

    // Halo luminoso sutil para estrellas muy brillantes
    if (data.magnitud < 1.5) {
      const radioHalo = tamano * 3.2;
      const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radioHalo);
      if (tema === 'rojo') {
        halo.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (tema === 'claro') {
        halo.addColorStop(0, `${colorEstrella}38`);
        halo.addColorStop(1, `${colorEstrella}00`);
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

    if (data.nombre && data.magnitud <= 2.1) {
      candidatasEtiquetas.push({
        mag: data.magnitud,
        etiqueta: {
          texto: data.nombre,
          x: pos.x + tamano + 4,
          y: pos.y + 3,
          color: paleta.labelText,
          fuente: tema === 'claro' ? '600 10px system-ui, sans-serif' : '10px system-ui, sans-serif',
          alineacion: 'left',
          altura: 10,
        },
      });
    }

    const nombreVisible = data.nombre ?? data.id;
    interactivos.push({
      id: data.id,
      categoria: 'estrella',
      nombreCorto: nombreVisible,
      nombre: nombreVisible,
      subtitulo: data.nombre ? `Estrella (${data.id})` : `Estrella ${data.id}`,
      altitud: data.altitud,
      acimut: data.acimut,
      magnitud: data.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }

  return candidatasEtiquetas
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 24)
    .map((item) => item.etiqueta);
}

function dibujarSimboloMessier(
  ctx: CanvasRenderingContext2D,
  tipo: TipoObjetoMessier,
  x: number,
  y: number,
  r: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;

  if (tipo === 'Galaxia') {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r * 0.62, -0.45, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === 'CumuloGlobular') {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.moveTo(x - r * 0.9, y);
    ctx.lineTo(x + r * 0.9, y);
    ctx.moveTo(x, y - r * 0.9);
    ctx.lineTo(x, y + r * 0.9);
    ctx.stroke();
  } else if (tipo === 'CumuloAbierto') {
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === 'Nebulosa' || tipo === 'RemanenteSupernova') {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.95);
    ctx.lineTo(x + r * 0.9, y + r * 0.75);
    ctx.lineTo(x - r * 0.9, y + r * 0.75);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function dibujarMessier(
  ctx: CanvasRenderingContext2D,
  messier: MessierCalculado[],
  tema: TemaVisual,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
): EtiquetaPendiente[] {
  const colorMessier =
    tema === 'rojo' ? '#dc2626' : tema === 'claro' ? '#047857' : '#34d399';
  const visibles = messier
    .filter((obj) => obj.altitud >= 0)
    .sort((a, b) => a.magnitud - b.magnitud);

  const etiquetas: EtiquetaPendiente[] = [];
  const mostrarTodosEtiquetados = visibles.length <= 25;

  for (const obj of visibles) {
    const pos = proyectarFn(obj.altitud, obj.acimut);
    const r = 5.5 * Math.max(0.8, Math.min(1.2, pos.escala));

    dibujarSimboloMessier(ctx, obj.tipo, pos.x, pos.y, r, colorMessier);

    if ((mostrarTodosEtiquetados || obj.magnitud <= 8.0) && etiquetas.length < 28) {
      etiquetas.push({
        texto: obj.id,
        x: pos.x + r + 3,
        y: pos.y + 3,
        color: colorMessier,
        fuente: '10px ui-monospace, monospace',
        alineacion: 'left',
        altura: 10,
      });
    }

    const nombreVisible = obj.nombreComun
      ? `${obj.id} · ${obj.nombreComun}`
      : `${obj.id} · ${obj.nombreNGC}`;

    interactivos.push({
      id: obj.id,
      categoria: 'messier',
      nombreCorto: nombreVisible,
      nombre: nombreVisible,
      subtitulo: `${ETIQUETA_TIPO_MESSIER[obj.tipo]} · ${obtenerNombreConstelacionIAU(
        obj.constelacionIAU
      )} · ${ETIQUETA_INSTRUMENTO[obj.instrumentoMinimo]} · ${obj.tamanoArcmin}'`,
      altitud: obj.altitud,
      acimut: obj.acimut,
      magnitud: obj.magnitud,
      x: pos.x,
      y: pos.y,
    });
  }

  return etiquetas;
}

function dibujarCuerpos(
  ctx: CanvasRenderingContext2D,
  cuerpos: CuerpoCeleste[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  proyectarFn: (alt: number, az: number) => PuntoProyectado,
  interactivos: ObjetoHover[]
): EtiquetaPendiente[] {
  const visibles = cuerpos
    .filter((c) => c.altitud > 0)
    .map((c) => ({ cuerpo: c, pos: proyectarFn(c.altitud, c.acimut) }))
    .sort((a, b) => a.pos.profundidad - b.pos.profundidad);

  const etiquetas: EtiquetaPendiente[] = [];

  for (const { cuerpo, pos } of visibles) {
    const colorCuerpo = tema === 'rojo' ? '#ff2a2a' : cuerpo.color;
    const rBase = cuerpo.tipo === 'luna' ? 7 : 5.5;
    const rCuerpo = rBase * Math.max(0.8, Math.min(1.25, pos.escala));

    // Halo exterior
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCuerpo + 5, 0, Math.PI * 2);
    ctx.fillStyle =
      tema === 'rojo'
        ? 'rgba(255, 0, 0, 0.2)'
        : tema === 'claro'
          ? 'rgba(15, 23, 42, 0.14)'
          : `${colorCuerpo}33`;
    ctx.fill();

    // Anillo inclinado de Saturno
    const esSaturno = cuerpo.id === 'Saturn' || cuerpo.nombre === 'Saturno';
    if (esSaturno) {
      ctx.save();
      ctx.strokeStyle =
        tema === 'rojo' ? '#dc2626' : tema === 'claro' ? '#92400e' : '#fde68a';
      ctx.lineWidth = tema === 'claro' ? 1.8 : 1.6;
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
    if (tema === 'claro') {
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = paleta.horizonLine;
      ctx.stroke();
    }

    etiquetas.push({
      texto: cuerpo.nombre,
      x: pos.x + rCuerpo + (esSaturno ? 10 : 6),
      y: pos.y + 4,
      color: tema === 'claro' ? paleta.labelText : colorCuerpo,
      fuente: 'bold 12px system-ui, sans-serif',
      alineacion: 'left',
      altura: 12,
    });

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

  return etiquetas;
}

function dibujarEtiquetasPrioritarias(
  ctx: CanvasRenderingContext2D,
  grupos: readonly EtiquetaPendiente[][],
  tamanoCanvas: number,
  paleta: CelestialThemePalette,
  tema: TemaVisual
) {
  const cajas: CajaEtiqueta[] = [];
  ctx.save();

  for (const grupo of grupos) {
    for (const etiqueta of grupo) {
      ctx.font = etiqueta.fuente;
      if (
        intentarReservarEtiqueta(
          ctx,
          etiqueta.texto,
          etiqueta.x,
          etiqueta.y,
          cajas,
          tamanoCanvas,
          etiqueta.alineacion,
          etiqueta.altura
        )
      ) {
        ctx.textAlign = etiqueta.alineacion;
        if (tema === 'claro') {
          dibujarTextoConHalo(
            ctx,
            etiqueta.texto,
            etiqueta.x,
            etiqueta.y,
            etiqueta.color,
            paleta.labelHalo,
            3
          );
        } else {
          ctx.fillStyle = etiqueta.color;
          ctx.fillText(etiqueta.texto, etiqueta.x, etiqueta.y);
        }
      }
    }
  }

  ctx.restore();
}

function dibujarTrayectoria(
  ctx: CanvasRenderingContext2D,
  trayectoria: PuntoTrayectoria[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  proyectarFn: (alt: number, az: number) => PuntoProyectado
) {
  if (trayectoria.length === 0) return;

  const colorLinea =
    tema === 'rojo'
      ? 'rgba(239, 68, 68, 0.8)'
      : tema === 'claro'
        ? 'rgba(29, 78, 216, 0.82)'
        : 'rgba(56, 189, 248, 0.78)';
  const colorPunto =
    tema === 'rojo' ? '#ff3b3b' : tema === 'claro' ? paleta.highlightAccent : '#7dd3fc';
  const colorTexto =
    tema === 'rojo'
      ? 'rgba(252, 165, 165, 0.88)'
      : tema === 'claro'
        ? paleta.labelText
        : 'rgba(186, 230, 253, 0.9)';

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

    if (tema === 'claro') {
      dibujarTextoConHalo(ctx, horaEtiqueta, pos.x, pos.y - 5, colorTexto, paleta.labelHalo, 2.8);
    } else {
      ctx.fillStyle = colorTexto;
      ctx.fillText(horaEtiqueta, pos.x, pos.y - 5);
    }
  }

  ctx.restore();
}

function dibujarReticulaSeleccion(
  ctx: CanvasRenderingContext2D,
  astroSeleccionado: AstroSeleccionado | null,
  interactivos: ObjetoHover[],
  tema: TemaVisual,
  paleta: CelestialThemePalette,
  fasePulso: number
) {
  if (!astroSeleccionado) return;

  const objetivo = interactivos.find(
    (item) => item.id === astroSeleccionado.id && item.categoria === astroSeleccionado.categoria
  );
  if (!objetivo) return;

  const colorPrincipal = tema === 'rojo' ? '#ff3b3b' : paleta.highlightAccent;
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
  constelaciones,
  tema,
  modoMapa,
  onCambiarModoMapa,
  mostrarConstelaciones,
  mostrarEstrellas,
  mostrarMessier,
  astroSeleccionado,
  trayectoria,
  onSeleccionarAstro,
  contadorFoco = 0,
  magnitudLimiteVisible,
  bortle,
  instrumentoActivo = 'Todos',
  objetivoDetalleSeleccionado = null,
  esObjetivoEnSesion = false,
  onToggleObjetivo,
}: Readonly<SkyMapProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const escenaBaseRef = useRef<CacheEscenaCanvas | null>(null);
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
    if (modoMapa !== '3D' || !astroSeleccionado) return;

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
  }, [astroSeleccionado, modoMapa, contadorFoco]);

  const claveEscenaBase = useMemo(
    () => ({
      cuerpos,
      estrellas,
      messier,
      constelaciones,
      tema,
      modoMapa,
      camara,
      mostrarConstelaciones,
      mostrarEstrellas,
      mostrarMessier,
      trayectoria,
      magnitudLimiteVisible,
      astroSeleccionado,
    }),
    [
      cuerpos,
      estrellas,
      messier,
      constelaciones,
      tema,
      modoMapa,
      camara,
      mostrarConstelaciones,
      mostrarEstrellas,
      mostrarMessier,
      trayectoria,
      magnitudLimiteVisible,
      astroSeleccionado,
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
    const paleta = obtenerPaletaCeleste(tema);

    const proyectarFn =
      modoMapa === '2D'
        ? (alt: number, az: number) => proyectar2D(alt, az, cx, cy, radio)
        : (alt: number, az: number) => proyectar3D(alt, az, cx, cy, size, camara);

    ctxBase.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxBase.clearRect(0, 0, size, size);
    const interactivos: ObjetoHover[] = [];

    if (modoMapa === '2D') {
      dibujarBaseMapa2D(ctxBase, size, cx, cy, radio, paleta, tema);
      ctxBase.save();
      ctxBase.beginPath();
      ctxBase.arc(cx, cy, radio, 0, Math.PI * 2);
      ctxBase.clip();
    } else {
      dibujarBaseMapa3D(ctxBase, size, cx, cy, camara, paleta, tema);
      ctxBase.save();
    }

    const etiquetasConstelaciones = mostrarConstelaciones
      ? dibujarConstelaciones(ctxBase, constelaciones, proyectarFn, paleta, tema)
      : [];

    const etiquetasEstrellas = mostrarEstrellas
      ? dibujarEstrellas(
          ctxBase,
          estrellas,
          proyectarFn,
          paleta,
          tema,
          interactivos,
          magnitudLimiteVisible
        )
      : [];

    const etiquetasMessier = mostrarMessier
      ? dibujarMessier(ctxBase, messier, tema, proyectarFn, interactivos)
      : [];

    dibujarTrayectoria(ctxBase, trayectoria, tema, paleta, proyectarFn);
    const etiquetasCuerpos = dibujarCuerpos(
      ctxBase,
      cuerpos,
      tema,
      paleta,
      proyectarFn,
      interactivos
    );

    const etiquetasSeleccionado: EtiquetaPendiente[] = [];
    if (astroSeleccionado) {
      const objSeleccionado = interactivos.find(
        (item) =>
          item.id === astroSeleccionado.id &&
          item.categoria === astroSeleccionado.categoria
      );
      if (objSeleccionado && objSeleccionado.categoria !== 'cuerpo') {
        etiquetasSeleccionado.push({
          texto: objSeleccionado.nombreCorto,
          x: objSeleccionado.x + 10,
          y: objSeleccionado.y + 3,
          color: tema === 'rojo' ? '#ff5555' : paleta.highlightAccent,
          fuente: 'bold 11px system-ui, sans-serif',
          alineacion: 'left',
          altura: 11,
        });
      }
    }

    dibujarEtiquetasPrioritarias(
      ctxBase,
      [
        etiquetasSeleccionado,
        etiquetasCuerpos,
        etiquetasMessier,
        etiquetasEstrellas,
        etiquetasConstelaciones,
      ],
      size,
      paleta,
      tema
    );

    ctxBase.restore();
    puntosInteractivosRef.current = interactivos;
  }, [
    cuerpos,
    estrellas,
    messier,
    constelaciones,
    tema,
    modoMapa,
    camara,
    mostrarConstelaciones,
    mostrarEstrellas,
    mostrarMessier,
    trayectoria,
    magnitudLimiteVisible,
    astroSeleccionado,
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

    const { tema: temaActual, modoMapa: modoActual } = claveEscenaBase;

    const dibujarFrame = (fasePulso: number) => {
      const base = escenaBaseRef.current;
      if (!base) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(base.canvas, 0, 0, size, size);

      if (astroSeleccionado) {
        ctx.save();
        if (modoActual === '2D') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 36, 0, Math.PI * 2);
          ctx.clip();
        }
        dibujarReticulaSeleccion(
          ctx,
          astroSeleccionado,
          puntosInteractivosRef.current,
          temaActual,
          obtenerPaletaCeleste(temaActual),
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

    const umbral = e.pointerType === 'touch' ? 28 : 18;
    const candidatos: { obj: ObjetoHover; dist: number }[] = [];
    let distMin = umbral;

    for (const obj of puntosInteractivosRef.current) {
      const dist = Math.hypot(obj.x - posX, obj.y - posY);
      if (dist < umbral) {
        candidatos.push({ obj, dist });
        if (dist < distMin) distMin = dist;
      }
    }

    if (candidatos.length === 0) return null;

    const prioridadCategoria: Record<CategoriaAstro, number> = {
      cuerpo: 3,
      messier: 2,
      estrella: 1,
    };

    const cercanos = candidatos.filter((c) => c.dist <= distMin + 6);
    cercanos.sort((a, b) => {
      const diffPrio =
        prioridadCategoria[b.obj.categoria] - prioridadCategoria[a.obj.categoria];
      if (diffPrio !== 0) return diffPrio;
      const diffDist = a.dist - b.dist;
      if (Math.abs(diffDist) > 1.5) return diffDist;
      return a.obj.magnitud - b.obj.magnitud;
    });

    return cercanos[0].obj;
  };

  const inspeccionarPuntero = (e: PointerEvent<HTMLCanvasElement>) => {
    setHoverInfo(buscarAstroEnPuntero(e));
  };

  const manejarPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (modoMapa === '3D') {
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
    if (modoMapa === '3D' && arrastre && arrastre.activo && arrastre.pointerId === e.pointerId) {
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

    if (modoMapa === '3D') {
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
    if (modoMapa !== '3D') return;

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

  const claseBotonObjetivo = (activo: boolean) => {
    if (!activo) return 'border-current/30 hover:bg-current/10';
    if (tema === 'rojo') return 'border-red-500 bg-red-950/80 text-red-300';
    if (tema === 'claro') return 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700';
    return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30';
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
            aria-pressed={modoMapa === '2D'}
            onClick={() => onCambiarModoMapa('2D')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoMapa === '2D'
            )}`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" /> 2D Planisferio
          </button>
          <button
            type="button"
            aria-pressed={modoMapa === '3D'}
            onClick={() => onCambiarModoMapa('3D')}
            className={`min-h-10 sm:min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoMapa === '3D'
            )}`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" /> 3D Bóveda
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof magnitudLimiteVisible === 'number' && Number.isFinite(magnitudLimiteVisible) && (
            <span
              title="Magnitud límite visible estimada según escala Bortle, brillo lunar e instrumento"
              className="px-2 py-0.5 rounded-lg border border-current/20 bg-current/5 font-mono text-[11px] opacity-85"
            >
              {instrumentoActivo !== 'Todos'
                ? `Límite ≤ ${magnitudLimiteVisible.toFixed(1)} mag · ${
                    ETIQUETA_INSTRUMENTO[instrumentoActivo]
                  }`
                : `NELM ≤ ${magnitudLimiteVisible.toFixed(1)} mag${
                    bortle !== undefined ? ` · B${bortle}` : ''
                  }`}
            </span>
          )}
          {modoMapa === '3D' ? (
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
          modoMapa === '3D'
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
          tema === 'claro' ? 'border border-slate-300' : ''
        } ${
          modoMapa === '3D' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-crosshair'
        }`}
      />

      {astroSeleccionado && (
        <div
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${CLASES_TOOLTIP[tema]}`}
        >
          <div className="min-w-0 space-y-0.5">
            <div className="font-semibold flex flex-wrap items-center gap-2">
              <span>Trayectoria ±6h: {astroSeleccionado.nombre}</span>
              {objetivoDetalleSeleccionado && (
                <span className="font-mono text-[11px] opacity-80">
                  Mag {objetivoDetalleSeleccionado.magnitud.toFixed(1)}
                </span>
              )}
            </div>
            {objetivoDetalleSeleccionado && (
              <div className="font-mono text-[11px] opacity-75 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                {objetivoDetalleSeleccionado.constelacion && (
                  <span>{objetivoDetalleSeleccionado.constelacion}</span>
                )}
                <span>AR {formatearRA(objetivoDetalleSeleccionado.raHoras)}</span>
                <span>Dec {formatearDec(objetivoDetalleSeleccionado.decGrados)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {objetivoDetalleSeleccionado && onToggleObjetivo && (
              <button
                type="button"
                aria-pressed={esObjetivoEnSesion}
                onClick={() => onToggleObjetivo(objetivoDetalleSeleccionado)}
                className={`min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${claseBotonObjetivo(
                  esObjetivoEnSesion
                )}`}
              >
                {esObjetivoEnSesion ? (
                  <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>Objetivo esta noche</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSeleccionarAstro(null)}
              aria-label="Quitar selección de astro"
              className="min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer transition-colors motion-reduce:transition-none"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Limpiar
            </button>
          </div>
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
