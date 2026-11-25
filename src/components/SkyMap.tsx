import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type {
  CuerpoCeleste,
  EstrellaCalculada,
  MessierCalculado,
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
}

interface ObjetoHover {
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

const PALETAS: Record<TemaVisual, PaletaMapa> = {
  oscuro: {
    fondoExterior: '#020617',
    cieloCentro: '#0b132b',
    cieloBorde: '#020617',
    rejilla: 'rgba(148, 163, 184, 0.16)',
    textoCardinal: '#94a3b8',
    norte: '#38bdf8',
    lineaConst: 'rgba(56, 189, 248, 0.32)',
    estrella: '#f8fafc',
    textoEstrella: 'rgba(203, 213, 225, 0.75)',
  },
  claro: {
    fondoExterior: '#e2e8f0',
    cieloCentro: '#0f172a',
    cieloBorde: '#1e293b',
    rejilla: 'rgba(148, 163, 184, 0.16)',
    textoCardinal: '#1e293b',
    norte: '#38bdf8',
    lineaConst: 'rgba(56, 189, 248, 0.32)',
    estrella: '#f8fafc',
    textoEstrella: 'rgba(203, 213, 225, 0.75)',
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
    textoEstrella: 'rgba(239, 68, 68, 0.7)',
  },
};

const CLASES_TOOLTIP: Record<TemaVisual, string> = {
  oscuro: 'bg-slate-900/90 border-sky-500/40 text-slate-100',
  claro: 'bg-white border-slate-300 text-slate-800 shadow-md',
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

function proyectar(altitud: number, acimut: number, cx: number, cy: number, radio: number) {
  const r = radio * ((90 - altitud) / 90);
  const rad = (acimut * Math.PI) / 180;
  return {
    x: cx - r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

function dibujarBaseMapa(
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
    const pos = proyectar(-7, az, cx, cy, radio);
    ctx.fillStyle = destacar ? paleta.norte : paleta.textoCardinal;
    ctx.fillText(label, pos.x, pos.y);
  }
}

function dibujarEstrellas(
  ctx: CanvasRenderingContext2D,
  estrellas: EstrellaCalculada[],
  mostrarConstelaciones: boolean,
  mostrarEtiquetas: boolean,
  cx: number,
  cy: number,
  radio: number,
  paleta: PaletaMapa,
  interactivos: ObjetoHover[]
) {
  const mapaEstrellas = new Map<string, { x: number; y: number; data: EstrellaCalculada }>();

  for (const est of estrellas) {
    if (est.altitud > -5) {
      const pos = proyectar(est.altitud, est.acimut, cx, cy, radio);
      mapaEstrellas.set(est.id, { x: pos.x, y: pos.y, data: est });
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
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const { x, y, data } of mapaEstrellas.values()) {
    if (!data.visible) continue;
    const tamano = Math.max(1.5, 4.2 - data.magnitud * 0.8);

    ctx.beginPath();
    ctx.arc(x, y, tamano, 0, Math.PI * 2);
    ctx.fillStyle = paleta.estrella;
    ctx.fill();

    if (mostrarEtiquetas && data.magnitud < 2.1) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = paleta.textoEstrella;
      ctx.textAlign = 'left';
      ctx.fillText(data.nombre.split(' ')[0], x + tamano + 4, y + 3);
    }

    interactivos.push({
      nombre: data.nombre,
      subtitulo: `Estrella · Const. ${data.constelacion}`,
      altitud: data.altitud,
      acimut: data.acimut,
      magnitud: data.magnitud,
      x,
      y,
    });
  }
}

function dibujarMessier(
  ctx: CanvasRenderingContext2D,
  messier: MessierCalculado[],
  tema: TemaVisual,
  cx: number,
  cy: number,
  radio: number,
  interactivos: ObjetoHover[]
) {
  const colorMessier = tema === 'rojo' ? '#dc2626' : '#34d399';

  for (const obj of messier) {
    if (!obj.visible) continue;
    const { x, y } = proyectar(obj.altitud, obj.acimut, cx, cy, radio);

    ctx.save();
    ctx.strokeStyle = colorMessier;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = colorMessier;
    ctx.textAlign = 'left';
    ctx.fillText(obj.id, x + 8, y + 3);

    interactivos.push({
      nombre: `${obj.id} · ${obj.nombre}`,
      subtitulo: `${obj.tipo.toUpperCase()} (${obj.dificultad}) · ${obj.constelacion}`,
      altitud: obj.altitud,
      acimut: obj.acimut,
      magnitud: obj.magnitud,
      x,
      y,
    });
  }
}

function dibujarCuerpos(
  ctx: CanvasRenderingContext2D,
  cuerpos: CuerpoCeleste[],
  tema: TemaVisual,
  cx: number,
  cy: number,
  radio: number,
  interactivos: ObjetoHover[]
) {
  for (const cuerpo of cuerpos) {
    if (cuerpo.altitud <= 0) continue;
    const { x, y } = proyectar(cuerpo.altitud, cuerpo.acimut, cx, cy, radio);
    const colorCuerpo = tema === 'rojo' ? '#ff2a2a' : cuerpo.color;
    const rCuerpo = cuerpo.tipo === 'luna' ? 7 : 5.5;

    ctx.beginPath();
    ctx.arc(x, y, rCuerpo + 5, 0, Math.PI * 2);
    ctx.fillStyle = tema === 'rojo' ? 'rgba(255, 0, 0, 0.2)' : `${colorCuerpo}33`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, rCuerpo, 0, Math.PI * 2);
    ctx.fillStyle = colorCuerpo;
    ctx.fill();

    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = colorCuerpo;
    ctx.textAlign = 'left';
    ctx.fillText(cuerpo.nombre, x + rCuerpo + 6, y + 4);

    interactivos.push({
      nombre: cuerpo.nombre,
      subtitulo: cuerpo.faseLunar ? `${cuerpo.faseLunar} (${cuerpo.iluminacion}%)` : 'Planeta',
      altitud: cuerpo.altitud,
      acimut: cuerpo.acimut,
      magnitud: cuerpo.magnitud,
      x,
      y,
    });
  }
}

export function SkyMap({
  cuerpos,
  estrellas,
  messier,
  tema,
  mostrarConstelaciones,
  mostrarEtiquetasEstrellas,
  mostrarMessier,
}: Readonly<SkyMapProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ObjetoHover | null>(null);
  const puntosInteractivosRef = useRef<ObjetoHover[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 560;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radio = size / 2 - 36;
    const paleta = PALETAS[tema];
    const interactivos: ObjetoHover[] = [];

    dibujarBaseMapa(ctx, size, cx, cy, radio, paleta);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radio, 0, Math.PI * 2);
    ctx.clip();

    dibujarEstrellas(
      ctx,
      estrellas,
      mostrarConstelaciones,
      mostrarEtiquetasEstrellas,
      cx,
      cy,
      radio,
      paleta,
      interactivos
    );

    if (mostrarMessier) {
      dibujarMessier(ctx, messier, tema, cx, cy, radio, interactivos);
    }

    dibujarCuerpos(ctx, cuerpos, tema, cx, cy, radio, interactivos);

    ctx.restore();
    puntosInteractivosRef.current = interactivos;
  }, [
    cuerpos,
    estrellas,
    messier,
    tema,
    mostrarConstelaciones,
    mostrarEtiquetasEstrellas,
    mostrarMessier,
  ]);

  const manejarInteraccionPuntero = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

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
    setHoverInfo(masCercano);
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Mapa celeste interactivo con estrellas, constelaciones, objetos Messier y planetas"
        onPointerMove={manejarInteraccionPuntero}
        onPointerDown={manejarInteraccionPuntero}
        onPointerLeave={() => setHoverInfo(null)}
        className="w-full max-w-140 aspect-square rounded-2xl cursor-crosshair shadow-2xl"
      />

      {hoverInfo && (
        <div
          className={`mt-3 px-4 py-2 rounded-xl border text-xs font-mono flex flex-wrap items-center gap-4 ${CLASES_TOOLTIP[tema]}`}
        >
          <span className="font-bold text-sm">{hoverInfo.nombre}</span>
          <span className="opacity-80">{hoverInfo.subtitulo}</span>
          <span>Alt: {hoverInfo.altitud}°</span>
          <span>Acimut: {hoverInfo.acimut}°</span>
          <span>Mag: {hoverInfo.magnitud}</span>
        </div>
      )}
    </div>
  );
}