import { useEffect, useRef } from 'react';
import type { TemaVisual } from '../types/astronomy';

interface StarfieldBackgroundProps {
  tema: TemaVisual;
}

interface EstrellaFondo {
  x: number;
  y: number;
  radio: number;
  opacidadBase: number;
  velocidadParpadeo: number;
  fase: number;
  tinteOscuro: string;
}

interface EstrellaFugaz {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaMax: number;
  longitud: number;
}

function crearSemillaEstrellas(cantidad: number): EstrellaFondo[] {
  const tintes = ['#f8fafc', '#e0f2fe', '#bae6fd', '#fef3c7', '#e2e8f0'];
  const resultado: EstrellaFondo[] = [];
  let semilla = 1337;

  const siguiente = () => {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  };

  for (let i = 0; i < cantidad; i++) {
    const capa = i % 3;
    const radio = capa === 0 ? 0.6 + siguiente() * 0.5 : capa === 1 ? 0.9 + siguiente() * 0.7 : 1.3 + siguiente() * 0.8;
    resultado.push({
      x: siguiente(),
      y: siguiente(),
      radio,
      opacidadBase: capa === 0 ? 0.28 + siguiente() * 0.25 : capa === 1 ? 0.45 + siguiente() * 0.35 : 0.65 + siguiente() * 0.3,
      velocidadParpadeo: 0.4 + siguiente() * 1.4,
      fase: siguiente() * Math.PI * 2,
      tinteOscuro: tintes[Math.floor(siguiente() * tintes.length)],
    });
  }

  return resultado;
}

const ESTRELLAS_FONDO = crearSemillaEstrellas(125);

export function StarfieldBackground({ tema }: Readonly<StarfieldBackgroundProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animacionId = 0;
    let ancho = window.innerWidth;
    let alto = window.innerHeight;
    let fugaz: EstrellaFugaz | null = null;
    let proximoFugazMs = 5500;

    const ajustarTamano = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = Math.floor(ancho * dpr);
      canvas.height = Math.floor(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const dibujarClaro = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, alto);
      grad.addColorStop(0, '#dbeafe');
      grad.addColorStop(0.35, '#eef2ff');
      grad.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ancho, alto);
    };

    const dibujarRojo = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, ancho, alto);

      for (let i = 0; i < 90; i++) {
        const est = ESTRELLAS_FONDO[i];
        const alpha = Math.min(0.25, est.opacidadBase * 0.28);
        ctx.beginPath();
        ctx.arc(est.x * ancho, est.y * alto, Math.min(est.radio, 1.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 38, 38, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
    };

    const dibujarOscuro = (tiempoMs: number, deltaMs: number, reducirMovimiento: boolean) => {
      const grad = ctx.createLinearGradient(0, 0, 0, alto);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#070e24');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ancho, alto);

      // Nebulosas sutiles de fondo
      const neb1 = ctx.createRadialGradient(
        ancho * 0.18,
        alto * 0.22,
        10,
        ancho * 0.18,
        alto * 0.22,
        Math.max(ancho, alto) * 0.45
      );
      neb1.addColorStop(0, 'rgba(30, 58, 138, 0.14)');
      neb1.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, ancho, alto);

      const neb2 = ctx.createRadialGradient(
        ancho * 0.82,
        alto * 0.72,
        10,
        ancho * 0.82,
        alto * 0.72,
        Math.max(ancho, alto) * 0.42
      );
      neb2.addColorStop(0, 'rgba(49, 46, 129, 0.12)');
      neb2.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, ancho, alto);

      const seg = tiempoMs * 0.001;
      for (const est of ESTRELLAS_FONDO) {
        const parpadeo = reducirMovimiento
          ? 1
          : 0.72 + 0.28 * Math.sin(seg * est.velocidadParpadeo + est.fase);
        const alpha = Math.max(0.1, Math.min(1, est.opacidadBase * parpadeo));
        const px = est.x * ancho;
        const py = est.y * alto;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = est.tinteOscuro;
        ctx.beginPath();
        ctx.arc(px, py, est.radio, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Estrella fugaz muy ocasional y discreta
      if (!reducirMovimiento) {
        if (!fugaz && tiempoMs >= proximoFugazMs) {
          const inicioX = ancho * (0.2 + Math.random() * 0.65);
          const inicioY = alto * (0.05 + Math.random() * 0.35);
          fugaz = {
            x: inicioX,
            y: inicioY,
            vx: -0.42 - Math.random() * 0.22,
            vy: 0.22 + Math.random() * 0.14,
            vida: 0,
            vidaMax: 750 + Math.random() * 350,
            longitud: 65 + Math.random() * 45,
          };
          proximoFugazMs = tiempoMs + 8500 + Math.random() * 9000;
        }

        if (fugaz) {
          fugaz.vida += deltaMs;
          fugaz.x += fugaz.vx * deltaMs;
          fugaz.y += fugaz.vy * deltaMs;
          const progreso = fugaz.vida / fugaz.vidaMax;

          if (progreso >= 1) {
            fugaz = null;
          } else {
            const opacidad = Math.sin(progreso * Math.PI) * 0.55;
            const norm = Math.hypot(fugaz.vx, fugaz.vy) || 1;
            const colaX = fugaz.x - (fugaz.vx / norm) * fugaz.longitud;
            const colaY = fugaz.y - (fugaz.vy / norm) * fugaz.longitud;

            const gradFugaz = ctx.createLinearGradient(fugaz.x, fugaz.y, colaX, colaY);
            gradFugaz.addColorStop(0, `rgba(224, 242, 254, ${opacidad.toFixed(3)})`);
            gradFugaz.addColorStop(1, 'rgba(56, 189, 248, 0)');

            ctx.strokeStyle = gradFugaz;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(fugaz.x, fugaz.y);
            ctx.lineTo(colaX, colaY);
            ctx.stroke();
          }
        }
      }
    };

    ajustarTamano();

    const reducir = mediaReduced.matches;
    if (tema === 'claro') {
      dibujarClaro();
    } else if (tema === 'rojo') {
      dibujarRojo();
    } else if (reducir) {
      dibujarOscuro(0, 0, true);
    } else {
      let ultimoTiempo = performance.now();
      const bucle = (ahora: number) => {
        const delta = Math.min(50, ahora - ultimoTiempo);
        ultimoTiempo = ahora;
        dibujarOscuro(ahora, delta, false);
        animacionId = window.requestAnimationFrame(bucle);
      };
      animacionId = window.requestAnimationFrame(bucle);
    }

    const manejarResize = () => {
      ajustarTamano();
      if (tema === 'claro') dibujarClaro();
      else if (tema === 'rojo') dibujarRojo();
      else if (mediaReduced.matches) dibujarOscuro(0, 0, true);
    };

    window.addEventListener('resize', manejarResize);

    return () => {
      window.removeEventListener('resize', manejarResize);
      if (animacionId) window.cancelAnimationFrame(animacionId);
    };
  }, [tema]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
