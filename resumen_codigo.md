This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
public/
  favicon.svg
src/
  components/
    EventsPanel.tsx
    MoonPhase3D.tsx
    SkyMap.tsx
    StarfieldBackground.tsx
    WeatherPanel.tsx
  core/
    eventsCalculator.ts
    skyCalculator.ts
    weatherService.ts
  data/
    brightStars.ts
    messierCatalog.ts
    meteorShowers.ts
  types/
    astronomy.ts
  App.tsx
  index.css
  main.tsx
.gitignore
AGENTS.md
capacitor.config.ts
eslint.config.js
GEMINI.md
index.html
package.json
README.md
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
````

# Files

## File: src/components/MoonPhase3D.tsx
````typescript
import { useId } from 'react';
import type { TemaVisual } from '../types/astronomy';

interface MoonPhase3DProps {
  iluminacion: number;
  faseLunar: string;
  anguloFase?: number;
  tema: TemaVisual;
}

function construirRutaIluminada(angulo: number, cx: number, cy: number, r: number): string | null {
  const normalizado = ((angulo % 360) + 360) % 360;
  if (normalizado < 2 || normalizado > 358) return null;
  if (Math.abs(normalizado - 180) < 2) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }

  const rad = (normalizado * Math.PI) / 180;
  const rx = Math.max(0.5, Math.abs(Math.cos(rad)) * r);

  if (normalizado < 180) {
    // Fase creciente: lado derecho iluminado
    const sweepTerminador = normalizado < 90 ? 0 : 1;
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminador} ${cx} ${cy - r} Z`;
  }

  // Fase menguante: lado izquierdo iluminado
  const sweepTerminador = normalizado < 270 ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminador} ${cx} ${cy - r} Z`;
}

export function MoonPhase3D({
  iluminacion,
  faseLunar,
  anguloFase,
  tema,
}: Readonly<MoonPhase3DProps>) {
  const uid = useId();
  const clipId = `luna-clip-${uid}`;
  const gradLuzId = `luna-luz-${uid}`;
  const gradSombraId = `luna-sombra-${uid}`;
  const gradLimboId = `luna-limbo-${uid}`;

  const angulo = anguloFase ?? (iluminacion / 100) * 180;
  const rutaLuz = construirRutaIluminada(angulo, 50, 50, 40);

  const esRojo = tema === 'rojo';
  const esClaro = tema === 'claro';

  const haloClase = esRojo
    ? 'shadow-[0_0_24px_rgba(220,38,38,0.28)]'
    : esClaro
      ? 'shadow-[0_4px_18px_rgba(15,23,42,0.18)]'
      : 'shadow-[0_0_28px_rgba(148,163,184,0.28)]';

  return (
    <div
      className={`relative shrink-0 w-16 h-16 rounded-full transition-transform duration-300 hover:scale-105 ${haloClase}`}
      title={`${faseLunar} · ${iluminacion}% iluminada`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full rounded-full"
        role="img"
        aria-label={`Esfera lunar en fase ${faseLunar} con ${iluminacion}% de iluminación`}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="40" />
          </clipPath>

          <radialGradient id={gradSombraId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor={esRojo ? '#1a0202' : '#1e293b'} />
            <stop offset="100%" stopColor={esRojo ? '#050000' : '#020617'} />
          </radialGradient>

          <radialGradient id={gradLuzId} cx="36%" cy="34%" r="68%">
            <stop offset="0%" stopColor={esRojo ? '#ef4444' : '#ffffff'} />
            <stop offset="55%" stopColor={esRojo ? '#b91c1c' : '#e2e8f0'} />
            <stop offset="100%" stopColor={esRojo ? '#7f1d1d' : '#94a3b8'} />
          </radialGradient>

          <radialGradient id={gradLimboId} cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor={esRojo ? 'rgba(0,0,0,0.55)' : 'rgba(2,6,23,0.42)'} />
          </radialGradient>
        </defs>

        {/* Anillo atmosférico muy sutil */}
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={esRojo ? 'rgba(220,38,38,0.35)' : esClaro ? 'rgba(100,116,139,0.28)' : 'rgba(186,230,253,0.22)'}
          strokeWidth="1.5"
        />

        {/* Cara oscura base */}
        <circle cx="50" cy="50" r="40" fill={`url(#${gradSombraId})`} />

        {/* Zona iluminada según fase real */}
        <g clipPath={`url(#${clipId})`}>
          {rutaLuz && <path d={rutaLuz} fill={`url(#${gradLuzId})`} />}

          {/* Mares y cráteres lunares sutiles */}
          <g opacity={esRojo ? 0.25 : 0.22} fill={esRojo ? '#450a0a' : '#475569'}>
            <ellipse cx="40" cy="36" rx="11" ry="8" transform="rotate(-15 40 36)" />
            <ellipse cx="58" cy="42" rx="9" ry="12" transform="rotate(12 58 42)" />
            <ellipse cx="46" cy="58" rx="13" ry="7" transform="rotate(8 46 58)" />
            <circle cx="64" cy="60" r="5" />
            <circle cx="34" cy="54" r="4" />
            <circle cx="53" cy="27" r="3.5" />
          </g>

          {/* Sombreado esférico en el limbo para efecto 3D */}
          <circle cx="50" cy="50" r="40" fill={`url(#${gradLimboId})`} />
        </g>
      </svg>
    </div>
  );
}
````

## File: src/components/StarfieldBackground.tsx
````typescript
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
````

## File: src/data/brightStars.ts
````typescript
import type { EstrellaCatalogo, LineaConstelacion } from '../types/astronomy';

export const ESTRELLAS_BRILLANTES: EstrellaCatalogo[] = [
  // Referencia Norte
  { id: 'polaris', nombre: 'Polaris (Estrella Polar)', constelacion: 'Osa Menor', ra: 2.530, dec: 89.26, magnitud: 1.98 },

  // Orión
  { id: 'betelgeuse', nombre: 'Betelgeuse', constelacion: 'Orión', ra: 5.919, dec: 7.41, magnitud: 0.42 },
  { id: 'rigel', nombre: 'Rigel', constelacion: 'Orión', ra: 5.242, dec: -8.20, magnitud: 0.13 },
  { id: 'bellatrix', nombre: 'Bellatrix', constelacion: 'Orión', ra: 5.419, dec: 6.35, magnitud: 1.64 },
  { id: 'saiph', nombre: 'Saiph', constelacion: 'Orión', ra: 5.796, dec: -9.67, magnitud: 2.09 },
  { id: 'alnitak', nombre: 'Alnitak', constelacion: 'Orión', ra: 5.679, dec: -1.94, magnitud: 1.77 },
  { id: 'alnilam', nombre: 'Alnilam', constelacion: 'Orión', ra: 5.603, dec: -1.20, magnitud: 1.69 },
  { id: 'mintaka', nombre: 'Mintaka', constelacion: 'Orión', ra: 5.533, dec: -0.30, magnitud: 2.23 },

  // Osa Mayor (El Carro)
  { id: 'dubhe', nombre: 'Dubhe', constelacion: 'Osa Mayor', ra: 11.062, dec: 61.75, magnitud: 1.79 },
  { id: 'merak', nombre: 'Merak', constelacion: 'Osa Mayor', ra: 11.031, dec: 56.38, magnitud: 2.37 },
  { id: 'phecda', nombre: 'Phecda', constelacion: 'Osa Mayor', ra: 11.897, dec: 53.69, magnitud: 2.44 },
  { id: 'megrez', nombre: 'Megrez', constelacion: 'Osa Mayor', ra: 12.257, dec: 57.03, magnitud: 3.31 },
  { id: 'alioth', nombre: 'Alioth', constelacion: 'Osa Mayor', ra: 12.900, dec: 55.96, magnitud: 1.77 },
  { id: 'mizar', nombre: 'Mizar', constelacion: 'Osa Mayor', ra: 13.399, dec: 54.93, magnitud: 2.04 },
  { id: 'alkaid', nombre: 'Alkaid', constelacion: 'Osa Mayor', ra: 13.792, dec: 49.31, magnitud: 1.86 },

  // Casiopea (La W)
  { id: 'schedar', nombre: 'Schedar', constelacion: 'Casiopea', ra: 0.675, dec: 56.54, magnitud: 2.23 },
  { id: 'caph', nombre: 'Caph', constelacion: 'Casiopea', ra: 0.153, dec: 59.15, magnitud: 2.27 },
  { id: 'gamma_cas', nombre: 'Navi', constelacion: 'Casiopea', ra: 0.945, dec: 60.72, magnitud: 2.47 },
  { id: 'ruchbah', nombre: 'Ruchbah', constelacion: 'Casiopea', ra: 1.430, dec: 60.24, magnitud: 2.68 },
  { id: 'segin', nombre: 'Segin', constelacion: 'Casiopea', ra: 1.907, dec: 63.67, magnitud: 3.37 },

  // Triángulo de Verano y otras gigantes
  { id: 'sirius', nombre: 'Sirio', constelacion: 'Can Mayor', ra: 6.752, dec: -16.72, magnitud: -1.46 },
  { id: 'vega', nombre: 'Vega', constelacion: 'Lira', ra: 18.616, dec: 38.78, magnitud: 0.03 },
  { id: 'deneb', nombre: 'Deneb', constelacion: 'Cisne', ra: 20.690, dec: 45.28, magnitud: 1.25 },
  { id: 'altair', nombre: 'Altair', constelacion: 'Águila', ra: 19.846, dec: 8.87, magnitud: 0.77 },
  { id: 'capella', nombre: 'Capella', constelacion: 'Auriga', ra: 5.278, dec: 46.00, magnitud: 0.08 },
  { id: 'aldebaran', nombre: 'Aldebarán', constelacion: 'Tauro', ra: 4.599, dec: 16.51, magnitud: 0.85 },
  { id: 'arcturus', nombre: 'Arturo', constelacion: 'Boyero', ra: 14.261, dec: 19.18, magnitud: -0.05 },
  { id: 'procyon', nombre: 'Proción', constelacion: 'Can Menor', ra: 7.655, dec: 5.22, magnitud: 0.34 },
  { id: 'pollux', nombre: 'Pólux', constelacion: 'Géminis', ra: 7.755, dec: 28.03, magnitud: 1.14 },
  { id: 'castor', nombre: 'Cástor', constelacion: 'Géminis', ra: 7.577, dec: 31.89, magnitud: 1.58 },
  { id: 'regulus', nombre: 'Régulo', constelacion: 'Leo', ra: 10.140, dec: 11.97, magnitud: 1.35 },
  { id: 'spica', nombre: 'Espiga', constelacion: 'Virgo', ra: 13.420, dec: -11.16, magnitud: 0.97 },
  { id: 'antares', nombre: 'Antares', constelacion: 'Escorpio', ra: 16.490, dec: -26.43, magnitud: 0.96 },
];

export const LINEAS_CONSTELACIONES: LineaConstelacion[] = [
  {
    constelacion: 'Orión',
    tramos: [
      ['betelgeuse', 'bellatrix'],
      ['betelgeuse', 'alnitak'],
      ['bellatrix', 'mintaka'],
      ['alnitak', 'alnilam'],
      ['alnilam', 'mintaka'],
      ['alnitak', 'saiph'],
      ['mintaka', 'rigel'],
      ['saiph', 'rigel'],
    ],
  },
  {
    constelacion: 'Osa Mayor',
    tramos: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    constelacion: 'Casiopea',
    tramos: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
];
````

## File: src/data/meteorShowers.ts
````typescript
import type { LluviaAnual } from '../types/astronomy';

export const LLUVIAS_ESTRELLAS: LluviaAnual[] = [
  { id: 'cuadrantidas', nombre: 'Cuadrántidas', mesPico: 1, diaPico: 4, thz: 110, radiante: 'Boyero' },
  { id: 'liridas', nombre: 'Líridas', mesPico: 4, diaPico: 22, thz: 18, radiante: 'Lira' },
  { id: 'eta_acuaridas', nombre: 'Eta Acuáridas', mesPico: 5, diaPico: 6, thz: 50, radiante: 'Acuario' },
  { id: 'delta_acuaridas', nombre: 'Delta Acuáridas', mesPico: 7, diaPico: 30, thz: 25, radiante: 'Acuario' },
  { id: 'perseidas', nombre: 'Perseidas (Lágrimas de S. Lorenzo)', mesPico: 8, diaPico: 12, thz: 100, radiante: 'Perseo' },
  { id: 'orionidas', nombre: 'Oriónidas', mesPico: 10, diaPico: 21, thz: 20, radiante: 'Orión' },
  { id: 'leonidas', nombre: 'Leónidas', mesPico: 11, diaPico: 17, thz: 15, radiante: 'Leo' },
  { id: 'geminidas', nombre: 'Gemínidas', mesPico: 12, diaPico: 14, thz: 150, radiante: 'Géminis' },
  { id: 'ursidas', nombre: 'Úrsidas', mesPico: 12, diaPico: 22, thz: 10, radiante: 'Osa Menor' },
];
````

## File: src/main.tsx
````typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
````

## File: capacitor.config.ts
````typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skyproject.app',
  appName: 'SkyProject',
  webDir: 'dist'
};

export default config;
````

## File: eslint.config.js
````javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
````

## File: GEMINI.md
````markdown
# Reglas del Proyecto - SkyProject

## Idioma y comunicación
- Responde siempre en **español** (explicaciones, comentarios en el código, mensajes de error e interfaz de usuario).
- Mantén respuestas directas, técnicas y orientadas a la acción.

## Stack y arquitectura
- **Frontend:** React, TypeScript (modo estricto), Vite y Tailwind CSS v4.
- **Motor astronómico:** `astronomy-engine` (cálculo local y *offline-first*).
- **Meteorología:** API de Open-Meteo con caché en `localStorage`.
- **Objetivo móvil:** Compatibilidad con diseño táctil y futuro empaquetado con Capacitor (Android).
- **Estructura principal:**
  - `src/types/`: Interfaces y tipos compartidos (`astronomy.ts`).
  - `src/core/`: Lógica de negocio y servicios (`skyCalculator.ts`, `eventsCalculator.ts`, `weatherService.ts`).
  - `src/data/`: Catálogos estáticos (`brightStars.ts`, `messierCatalog.ts`).
  - `src/components/`: Componentes visuales (`SkyMap.tsx`, `WeatherPanel.tsx`, `EventsPanel.tsx`).

## Estándares de código y robustez
- **TypeScript estricto:** Prohibido usar `any`. Tipar siempre props, estados y respuestas de APIs.
- **Validación defensiva:**
  - Envolver siempre `JSON.parse` / lecturas de `localStorage` en bloques `try/catch` con *fallback* seguro.
  - Sanitizar entradas de usuario antes de pasarlas a `astronomy-engine` (latitud en `[-90, 90]`, longitud en `[-180, 180]`, altitud finita y fechas válidas evitando `Invalid Date`).
- **Zonas horarias:** Usar **UTC** para sincronizar las consultas y búsquedas horarias de Open-Meteo.
- **React y ESLint:** Respetar todas las reglas de React Hooks (evitar `setState` síncrono dentro de `useEffect`).
- **UX y temas:**
  - Prohibido usar `window.alert()` o `confirm()`; mostrar errores de forma integrada en la UI.
  - Mantener compatibilidad con los tres temas visuales (`oscuro`, `claro` y `rojo` para visión nocturna).

## Ahorro de cuota y flujo de trabajo
- **Solo lectura cuando se pida análisis:** No ejecutes comandos en la terminal ni modifiques archivos si únicamente se solicita revisar, auditar o explicar código.
- **Cambios incrementales:** Evita reescribir archivos completos si solo cambian líneas concretas; entrega únicamente los bloques a modificar salvo que se pida explícitamente el archivo entero.
- **Sin dependencias innecesarias:** Prioriza soluciones nativas o librerías gratuitas ya instaladas en el proyecto.
````

## File: package.json
````json
{
  "name": "sky_project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/core": "^8.6.2",
    "@tailwindcss/vite": "^4.3.5",
    "astronomy-engine": "^2.1.19",
    "lucide-react": "^1.80.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "tailwindcss": "^4.3.5"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.6.2",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^10.14.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.7",
    "globals": "^17.13.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.72.1",
    "vite": "^8.3.6"
  }
}
````

## File: tsconfig.json
````json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
````

## File: vite.config.ts
````typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
````

## File: public/favicon.svg
````xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="30" fill="#0b132b" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="2" />
  <circle cx="32" cy="32" r="24" fill="url(#cielo)" />
  <path
    d="M36.5 16.5C27.4 17.5 21 25.6 22 34.8C23 43.9 31.2 50.4 40.4 49.4C43.2 49.1 45.8 48.1 48 46.6C44.5 47.4 40.7 46.8 37.5 44.7C31.3 40.7 29.5 32.4 33.5 26.2C35.2 23.6 37.6 21.7 40.3 20.6C39.1 19 37.8 17.6 36.5 16.5Z"
    fill="#f8fafc"
  />
  <path
    d="M45 18L46.4 21.6L50 23L46.4 24.4L45 28L43.6 24.4L40 23L43.6 21.6L45 18Z"
    fill="#38bdf8"
  />
  <circle cx="19" cy="21" r="1.4" fill="#bae6fd" opacity="0.85" />
  <circle cx="21" cy="46" r="1" fill="#fde68a" opacity="0.8" />
  <defs>
    <radialGradient id="cielo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(26 24) rotate(50) scale(34)">
      <stop stop-color="#1e293b" />
      <stop offset="1" stop-color="#020617" />
    </radialGradient>
  </defs>
</svg>
````

## File: src/core/eventsCalculator.ts
````typescript
import * as Astronomy from 'astronomy-engine';
import type { EventoCeleste, Ubicacion } from '../types/astronomy';
import { LLUVIAS_ESTRELLAS } from '../data/meteorShowers';
import { esEntradaAstronomicaValida } from './skyCalculator';

const NOMBRES_ECLIPSE: Record<string, string> = {
  Total: 'Total',
  Partial: 'Parcial',
  Annular: 'Anular',
  Penumbra: 'Penumbral',
};

function calcularDiasRestantes(desde: Date, hasta: Date): number {
  const inicioDia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
  const finDia = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()).getTime();
  return Math.round((finDia - inicioDia) / (1000 * 60 * 60 * 24));
}

function obtenerProximasLluvias(fechaBase: Date): EventoCeleste[] {
  const anioActual = fechaBase.getFullYear();

  return LLUVIAS_ESTRELLAS.map((lluvia) => {
    let fechaPico = new Date(anioActual, lluvia.mesPico - 1, lluvia.diaPico, 23, 30);
    if (calcularDiasRestantes(fechaBase, fechaPico) < 0) {
      fechaPico = new Date(anioActual + 1, lluvia.mesPico - 1, lluvia.diaPico, 23, 30);
    }

    return {
      id: `lluvia-${lluvia.id}-${fechaPico.getFullYear()}`,
      titulo: lluvia.nombre,
      tipo: 'lluvia' as const,
      fechaPico,
      diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
      resumen: `Máximo ~${lluvia.thz} meteoros/h`,
      detalle: `Radiante: Const. ${lluvia.radiante}`,
    };
  });
}

function obtenerProximosEclipses(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
  const eventos: EventoCeleste[] = [];
  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  // 1. Próximos 2 eclipses lunares con comprobación de visibilidad local
  let fechaBusqueda = new Date(fechaBase);
  for (let i = 0; i < 2; i++) {
    const lunar = Astronomy.SearchLunarEclipse(fechaBusqueda);
    const fechaPico = lunar.peak.date;
    const tipoClave = String(lunar.kind);
    const tipoStr = NOMBRES_ECLIPSE[tipoClave] ?? 'Lunar';

    const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, fechaPico, observador, true, true);
    const horLuna = Astronomy.Horizon(fechaPico, observador, eqLuna.ra, eqLuna.dec, 'normal');

    const resumen =
      tipoClave === 'Penumbra'
        ? 'Eclipse penumbral (oscurecimiento sutil)'
        : `Oscurecimiento: ${Math.round(lunar.obscuration * 100)}%`;

    const detalle =
      horLuna.altitude > 0
        ? `Visible desde tu ubicación (Luna a ${horLuna.altitude.toFixed(1)}° en el máximo)`
        : `No visible desde tu ubicación (Luna bajo el horizonte: ${horLuna.altitude.toFixed(1)}°)`;

    eventos.push({
      id: `eclipse-lunar-${fechaPico.getTime()}`,
      titulo: `Eclipse Lunar ${tipoStr}`,
      tipo: 'eclipse',
      fechaPico,
      diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
      resumen,
      detalle,
    });

    fechaBusqueda = new Date(fechaPico.getTime() + 15 * 24 * 60 * 60 * 1000);
  }

  // 2. Próximos eclipses solares visibles sobre el horizonte en tu ubicación
  let fechaSolar = new Date(fechaBase);
  let encontrados = 0;
  let intentos = 0;

  while (encontrados < 2 && intentos < 8) {
    intentos++;
    const solar = Astronomy.SearchLocalSolarEclipse(fechaSolar, observador);
    const fechaPico = solar.peak.time.date;

    if (solar.peak.altitude > 0) {
      const tipoStr = NOMBRES_ECLIPSE[String(solar.kind)] ?? 'Solar';
      eventos.push({
        id: `eclipse-solar-${fechaPico.getTime()}`,
        titulo: `Eclipse Solar ${tipoStr}`,
        tipo: 'eclipse',
        fechaPico,
        diasRestantes: calcularDiasRestantes(fechaBase, fechaPico),
        resumen: `Ocultación local: ${Math.round(solar.obscuration * 100)}%`,
        detalle: `Altura del Sol en máximo: ${solar.peak.altitude.toFixed(1)}°`,
      });
      encontrados++;
    }

    fechaSolar = new Date(fechaPico.getTime() + 20 * 24 * 60 * 60 * 1000);
  }

  return eventos;
}

export function calcularProximosEventos(fechaBase: Date, ubicacion: Ubicacion): EventoCeleste[] {
  if (!esEntradaAstronomicaValida(fechaBase, ubicacion)) return [];

  const lluvias = obtenerProximasLluvias(fechaBase);
  const eclipses = obtenerProximosEclipses(fechaBase, ubicacion);

  return [...lluvias, ...eclipses]
    .sort((a, b) => a.fechaPico.getTime() - b.fechaPico.getTime())
    .slice(0, 6);
}
````

## File: src/core/weatherService.ts
````typescript
import type { CondicionesMeteo, Ubicacion } from '../types/astronomy';
import { esEntradaAstronomicaValida } from './skyCalculator';

interface OpenMeteoHourly {
  time: string[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  temperature_2m: number[];
}

interface CacheMeteo {
  claveUbicacion: string;
  timestamp: number;
  hourly: OpenMeteoHourly;
}

const CACHE_KEY = 'skyproject_meteo_cache_v2';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function esArrayDeStrings(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string');
}

function esArrayNumerico(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'number' || item === null);
}

function esOpenMeteoHourlyValido(valor: unknown): valor is OpenMeteoHourly {
  if (typeof valor !== 'object' || valor === null) return false;
  const obj = valor as Record<string, unknown>;
  return (
    esArrayDeStrings(obj.time) &&
    esArrayNumerico(obj.cloud_cover) &&
    esArrayNumerico(obj.cloud_cover_low) &&
    esArrayNumerico(obj.cloud_cover_mid) &&
    esArrayNumerico(obj.cloud_cover_high) &&
    esArrayNumerico(obj.relative_humidity_2m) &&
    esArrayNumerico(obj.wind_speed_10m) &&
    esArrayNumerico(obj.temperature_2m)
  );
}

function leerCacheMeteo(): CacheMeteo | null {
  try {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    if (!cacheRaw) return null;
    const parsed: unknown = JSON.parse(cacheRaw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.claveUbicacion !== 'string' ||
      typeof obj.timestamp !== 'number' ||
      !Number.isFinite(obj.timestamp) ||
      !esOpenMeteoHourlyValido(obj.hourly)
    ) {
      return null;
    }

    return {
      claveUbicacion: obj.claveUbicacion,
      timestamp: obj.timestamp,
      hourly: obj.hourly,
    };
  } catch {
    return null;
  }
}

function guardarCacheMeteo(cache: CacheMeteo): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora errores de cuota o almacenamiento bloqueado
  }
}

function evaluarVeredicto(nubesTotal: number, vientoKmh: number): CondicionesMeteo['veredicto'] {
  if (nubesTotal <= 20 && vientoKmh <= 25) return 'Excelente';
  if (nubesTotal <= 50 && vientoKmh <= 35) return 'Aceptable';
  return 'Desfavorable';
}

function formatearClaveHoraUTC(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const hora = String(fecha.getUTCHours()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${hora}:00`;
}

function extraerDesdeHourly(
  hourly: OpenMeteoHourly,
  fecha: Date,
  esCache: boolean
): CondicionesMeteo | null {
  const claveHora = formatearClaveHoraUTC(fecha);
  const idx = hourly.time.indexOf(claveHora);
  if (idx === -1) return null;

  const nubesTotal = Math.round(hourly.cloud_cover[idx] ?? 0);
  const vientoKmh = Math.round(hourly.wind_speed_10m[idx] ?? 0);

  return {
    horaPronostico: `${claveHora.replace('T', ' ')} UTC`,
    nubesTotal,
    nubesBajas: Math.round(hourly.cloud_cover_low[idx] ?? 0),
    nubesMedias: Math.round(hourly.cloud_cover_mid[idx] ?? 0),
    nubesAltas: Math.round(hourly.cloud_cover_high[idx] ?? 0),
    humedad: Math.round(hourly.relative_humidity_2m[idx] ?? 0),
    vientoKmh,
    temperatura: Number((hourly.temperature_2m[idx] ?? 0).toFixed(1)),
    veredicto: evaluarVeredicto(nubesTotal, vientoKmh),
    esCache,
  };
}

export async function obtenerCondicionesMeteo(
  fecha: Date,
  ubicacion: Ubicacion,
  signal?: AbortSignal
): Promise<{ datos: CondicionesMeteo | null; aviso: string | null }> {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) {
    return { datos: null, aviso: 'Fecha o coordenadas inválidas.' };
  }

  const claveUbicacion = `${ubicacion.latitud.toFixed(2)},${ubicacion.longitud.toFixed(2)}`;
  const cache = leerCacheMeteo();

  const cacheValida =
    cache !== null &&
    cache.claveUbicacion === claveUbicacion &&
    Date.now() - cache.timestamp < CACHE_TTL_MS;

  if (cacheValida) {
    const datos = extraerDesdeHourly(cache.hourly, fecha, true);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(ubicacion.latitud));
    url.searchParams.set('longitude', String(ubicacion.longitud));
    url.searchParams.set(
      'hourly',
      'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_speed_10m,temperature_2m'
    );
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('forecast_days', '14');

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error('Error HTTP Open-Meteo');

    const json: unknown = await res.json();
    const hourly =
      typeof json === 'object' && json !== null
        ? (json as Record<string, unknown>).hourly
        : null;

    if (!esOpenMeteoHourlyValido(hourly)) {
      throw new Error('Respuesta meteorológica con formato inesperado');
    }

    const nuevoCache: CacheMeteo = {
      claveUbicacion,
      timestamp: Date.now(),
      hourly,
    };
    guardarCacheMeteo(nuevoCache);

    const datos = extraerDesdeHourly(hourly, fecha, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    if (cache && cache.claveUbicacion === claveUbicacion) {
      const datos = extraerDesdeHourly(cache.hourly, fecha, true);
      return {
        datos,
        aviso: datos ? 'Sin conexión: mostrando datos guardados en caché.' : 'Sin conexión.',
      };
    }
    return { datos: null, aviso: 'No se pudo obtener la previsión meteorológica.' };
  }
}
````

## File: src/data/messierCatalog.ts
````typescript
import type { ObjetoMessier } from '../types/astronomy';

export const CATALOGO_MESSIER: ObjetoMessier[] = [
  { id: 'M42', nombre: 'Nebulosa de Orión', tipo: 'nebulosa', constelacion: 'Orión', ra: 5.588, dec: -5.39, magnitud: 4.0, dificultad: 'Fácil' },
  { id: 'M45', nombre: 'Las Pléyades', tipo: 'cumulo', constelacion: 'Tauro', ra: 3.783, dec: 24.12, magnitud: 1.6, dificultad: 'Fácil' },
  { id: 'M31', nombre: 'Galaxia de Andrómeda', tipo: 'galaxia', constelacion: 'Andrómeda', ra: 0.712, dec: 41.27, magnitud: 3.4, dificultad: 'Fácil' },
  { id: 'M44', nombre: 'Cúmulo del Pesebre', tipo: 'cumulo', constelacion: 'Cáncer', ra: 8.673, dec: 19.67, magnitud: 3.7, dificultad: 'Fácil' },
  { id: 'M13', nombre: 'Gran Cúmulo de Hércules', tipo: 'cumulo', constelacion: 'Hércules', ra: 16.695, dec: 36.46, magnitud: 5.8, dificultad: 'Fácil' },
  { id: 'M35', nombre: 'Cúmulo en Géminis', tipo: 'cumulo', constelacion: 'Géminis', ra: 6.148, dec: 24.33, magnitud: 5.3, dificultad: 'Fácil' },
  { id: 'M8', nombre: 'Nebulosa de la Laguna', tipo: 'nebulosa', constelacion: 'Sagitario', ra: 18.063, dec: -24.38, magnitud: 6.0, dificultad: 'Fácil' },
  { id: 'M7', nombre: 'Cúmulo de Ptolomeo', tipo: 'cumulo', constelacion: 'Escorpio', ra: 17.898, dec: -34.79, magnitud: 3.3, dificultad: 'Fácil' },
  { id: 'M81', nombre: 'Galaxia de Bode', tipo: 'galaxia', constelacion: 'Osa Mayor', ra: 9.926, dec: 69.07, magnitud: 6.9, dificultad: 'Moderada' },
  { id: 'M27', nombre: 'Nebulosa Dumbbell', tipo: 'nebulosa', constelacion: 'Zorro', ra: 19.993, dec: 22.72, magnitud: 7.5, dificultad: 'Moderada' },
  { id: 'M51', nombre: 'Galaxia del Remolino', tipo: 'galaxia', constelacion: 'Perros de Caza', ra: 13.498, dec: 47.20, magnitud: 8.4, dificultad: 'Moderada' },
  { id: 'M57', nombre: 'Nebulosa del Anillo', tipo: 'nebulosa', constelacion: 'Lira', ra: 18.893, dec: 33.03, magnitud: 8.8, dificultad: 'Moderada' },
];
````

## File: src/index.css
````css
@import "tailwindcss";

@layer utilities {
  .tarjeta-3d {
    transform-style: preserve-3d;
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 240ms ease,
      border-color 240ms ease,
      opacity 200ms ease;
  }

  .tarjeta-3d:hover {
    transform: perspective(900px) translateY(-2px) rotateX(1.2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-3d,
  .tarjeta-3d:hover {
    transform: none;
    transition: none;
  }
}
````

## File: .gitignore
````
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
# Archivos personales y temporales (no subir a GitHub)
NOTAS.md
````

## File: AGENTS.md
````markdown
# Instrucciones para Agentes (Jules) - SkyProject

## Entorno y comandos de verificación
Proyecto frontend desarrollado con **React + TypeScript (estricto) + Vite + Tailwind CSS v4**, enfocado en astronomía *offline-first* (`astronomy-engine`, Open-Meteo API y futuro soporte móvil con Capacitor).

Antes de finalizar cualquier tarea, ejecuta y verifica que pasan sin errores:
- Instalación de dependencias: `npm install`
- Linter: `npm run lint`
- Comprobación de tipos y build de producción: `npm run build`

## Estructura del proyecto
- `src/types/`: Tipos e interfaces TypeScript.
- `src/core/`: Cálculos astronómicos, eventos y servicio meteorológico.
- `src/data/`: Catálogos estáticos de estrellas y objetos Messier.
- `src/components/`: Componentes de interfaz y mapa celeste en `<canvas>`.

## Reglas de implementación
- **Idioma:** Redacta el código (comentarios, variables de dominio, textos de UI), los mensajes de commit y el resumen de la Pull Request siempre en **español**.
- **Tipado estricto:** No utilices `any`. Mantén las interfaces centralizadas en `src/types/astronomy.ts`.
- **Seguridad y validación de datos:**
  - Protege todas las lecturas de `localStorage` con `try/catch` y valida la estructura resultante.
  - Valida rangos de coordenadas (`latitud` entre `-90` y `90`, `longitud` entre `-180` y `180`) y fechas (`!Number.isNaN(date.getTime())`) antes de invocar `astronomy-engine`.
  - Mantén las consultas y cruces horarios de Open-Meteo en **UTC**.
- **Calidad de UI/UX:**
  - No uses `alert()`, `prompt()` ni `confirm()`. Gestiona los errores con estado en React.
  - Respeta los tres temas visuales (`oscuro`, `claro`, `rojo`) y prioriza eventos compatibles con pantallas táctiles (`onPointerDown` / `onPointerMove`).
- **Alcance estricto:** No modifiques, formatees ni elimines archivos que no estén directamente relacionados con la tarea solicitada.

## Reglas de Git, commits y autoría
- **Autoría de commits:** Antes de realizar cualquier commit en Git, configura el autor local para que figure exclusivamente a nombre del propietario del repositorio:
  ```bash
  git config user.name "alejandrogutierrezdev"
  git config user.email "gutierrezvillalba.dev@gmail.com"
  ```
- **Cero atribución al agente:**
  - **No** añadas líneas `Co-authored-by:` ni firmas automáticas en los mensajes de commit.
  - **No** menciones a Jules, bots ni asistentes de IA en mensajes de commit, comentarios del código ni descripciones de Pull Request.
- **Formato de commits:** Usa *Conventional Commits* en español, claros y concisos (por ejemplo: `fix: validar rangos de coordenadas y localStorage`, `feat: soporte tactil en el mapa celeste`).
````

## File: index.html
````html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkyProject — Mapa Celeste</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

## File: README.md
````markdown
# SkyProject

Aplicación web *offline-first* de astronomía observacional que permite consultar la bóveda celeste en tiempo real, efemérides planetarias, próximos eventos astronómicos y condiciones meteorológicas para cualquier ubicación y fecha.

## Funcionalidades principales

- **Mapa celeste interactivo (`<canvas>`):** proyección polar del cielo con estrellas brillantes, líneas de constelaciones, catálogo Messier, Luna y planetas del Sistema Solar, con precesión desde época J2000 a la fecha de observación y soporte para ratón y pantalla táctil.
- **Efemérides y estado solar:** cálculo local con `astronomy-engine` de altitud, acimut, magnitud, fase lunar, iluminación y fase del crepúsculo (día, civil, náutico, astronómico o noche astronómica).
- **Próximos eventos celestes:** calendario dinámico de lluvias de estrellas y próximos eclipses lunares (con comprobación de visibilidad local) y solares.
- **Condiciones meteorológicas astronómicas:** integración con la API de Open-Meteo sincronizada en UTC (nubosidad por capas, viento, humedad, temperatura y veredicto de observación) con caché local en `localStorage` para uso sin conexión.
- **Tres temas visuales:** `Oscuro`, `Claro` y `Filtro Rojo` diseñado para preservar la adaptación ocular nocturna en el campo.
- **Geolocalización y ubicaciones personalizadas:** detección mediante GPS del navegador o edición manual de latitud, longitud y altitud con validación defensiva.

## Stack tecnológico

- **Frontend:** React 19 + TypeScript (modo estricto) + Vite 8 + Tailwind CSS v4
- **Cálculo astronómico:** `astronomy-engine` (100% local y *offline-first*)
- **Meteorología:** Open-Meteo API + caché en `localStorage`
- **Iconografía:** `lucide-react`
- **Preparado para móvil:** Capacitor (`@capacitor/core`, `@capacitor/cli`)

## Instalación y puesta en marcha

Requisitos: Node.js 20 o superior y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar servidor de desarrollo
npm run dev
```

## Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo con Vite.
- `npm run lint` — Ejecuta ESLint sobre todo el proyecto.
- `npm run build` — Comprueba tipos con TypeScript (`tsc -b`) y genera el build de producción en `dist/`.
- `npm run preview` — Previsualiza localmente el build de producción.

## Estructura del proyecto

```text
src/
├── components/   # SkyMap, WeatherPanel, EventsPanel
├── core/         # skyCalculator, eventsCalculator, weatherService
├── data/         # brightStars, messierCatalog, meteorShowers
└── types/        # Interfaces y tipos centralizados (astronomy.ts)
```
````

## File: tsconfig.app.json
````json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
````

## File: tsconfig.node.json
````json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
````

## File: src/components/EventsPanel.tsx
````typescript
import { CalendarClock, Sparkles, Eclipse, ArrowUpRight } from 'lucide-react';
import type { EventoCeleste, TemaVisual } from '../types/astronomy';

interface EventsPanelProps {
  eventos: EventoCeleste[];
  tema: TemaVisual;
  claseTarjeta: string;
  onSeleccionarFecha: (fecha: Date) => void;
}

function formatearBadgeDias(dias: number): string {
  if (dias < 0) return 'Ayer';
  if (dias === 0) return '¡Hoy!';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

function obtenerClaseIconoEvento(tema: TemaVisual, tipo: EventoCeleste['tipo']): string {
  if (tema === 'rojo') return 'text-red-500';
  if (tema === 'claro') return tipo === 'lluvia' ? 'text-amber-600' : 'text-sky-600';
  return tipo === 'lluvia' ? 'text-amber-400' : 'text-sky-400';
}

function obtenerClaseBadgeDias(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-600 text-red-500';
  if (tema === 'claro') return 'border-sky-600/40 bg-sky-500/10 text-sky-700';
  return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
}

export function EventsPanel({
  eventos,
  tema,
  claseTarjeta,
  onSeleccionarFecha,
}: Readonly<EventsPanelProps>) {
  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Próximos Eventos Celestes
        </h2>
        <span className="text-[11px] opacity-60">Lluvias y Eclipses</span>
      </div>

      <div className="space-y-2.5">
        {eventos.map((ev) => {
          const fechaTexto = ev.fechaPico.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          const claseHoverEvento =
            tema === 'rojo'
              ? 'hover:border-red-600/80'
              : tema === 'claro'
                ? 'hover:border-slate-300 hover:shadow-md'
                : 'hover:border-sky-500/40';

          return (
            <div
              key={ev.id}
              className={`tarjeta-3d p-3.5 rounded-xl border border-current/15 bg-current/5 flex flex-col gap-1.5 ${claseHoverEvento}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  {ev.tipo === 'lluvia' ? (
                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'lluvia')}`} />
                  ) : (
                    <Eclipse className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'eclipse')}`} />
                  )}
                  {ev.titulo}
                </span>

                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${obtenerClaseBadgeDias(
                    tema
                  )}`}
                >
                  {formatearBadgeDias(ev.diasRestantes)}
                </span>
              </div>

              <div className="text-xs opacity-80 font-mono flex flex-wrap items-center justify-between gap-2">
                <span>
                  {fechaTexto} · {ev.resumen}
                </span>
                <button
                  onClick={() => onSeleccionarFecha(ev.fechaPico)}
                  className="inline-flex items-center gap-1 underline decoration-dotted hover:opacity-100 cursor-pointer font-sans font-medium"
                >
                  Ver en mapa <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] opacity-65">{ev.detalle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
````

## File: src/components/SkyMap.tsx
````typescript
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Globe, Compass, RotateCcw } from 'lucide-react';
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

const CAMARA_INICIAL: Camara3D = { rotAz: 0, tilt: 32 };

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
  const [modoVista, setModoVista] = useState<ModoVista>('2d');
  const [camara, setCamara] = useState<Camara3D>(CAMARA_INICIAL);
  const [hoverInfo, setHoverInfo] = useState<ObjetoHover | null>(null);

  const puntosInteractivosRef = useRef<ObjetoHover[]>([]);
  const arrastreRef = useRef<{
    activo: boolean;
    pointerId: number;
    ultimoX: number;
    ultimoY: number;
    movido: boolean;
  } | null>(null);

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

    const proyectarFn =
      modoVista === '2d'
        ? (alt: number, az: number) => proyectar2D(alt, az, cx, cy, radio)
        : (alt: number, az: number) => proyectar3D(alt, az, cx, cy, size, camara);

    if (modoVista === '2d') {
      dibujarBaseMapa2D(ctx, size, cx, cy, radio, paleta);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radio, 0, Math.PI * 2);
      ctx.clip();
    } else {
      dibujarBaseMapa3D(ctx, size, cx, cy, camara, paleta, tema);
      ctx.save();
    }

    dibujarEstrellas(
      ctx,
      estrellas,
      mostrarConstelaciones,
      mostrarEtiquetasEstrellas,
      proyectarFn,
      paleta,
      tema,
      interactivos
    );

    if (mostrarMessier) {
      dibujarMessier(ctx, messier, tema, proyectarFn, interactivos);
    }

    dibujarCuerpos(ctx, cuerpos, tema, proyectarFn, interactivos);

    ctx.restore();
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
  ]);

  const inspeccionarPuntero = (e: PointerEvent<HTMLCanvasElement>) => {
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

  const manejarPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (modoVista === '3d') {
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastreRef.current = {
        activo: true,
        pointerId: e.pointerId,
        ultimoX: e.clientX,
        ultimoY: e.clientY,
        movido: false,
      };
    }
    inspeccionarPuntero(e);
  };

  const manejarPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const arrastre = arrastreRef.current;
    if (modoVista === '3d' && arrastre && arrastre.activo && arrastre.pointerId === e.pointerId) {
      const dx = e.clientX - arrastre.ultimoX;
      const dy = e.clientY - arrastre.ultimoY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
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
    if (arrastre && arrastre.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      arrastreRef.current = null;
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
        <div className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5">
          <button
            type="button"
            onClick={() => setModoVista('2d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoVista === '2d'
            )}`}
          >
            <Compass className="w-3.5 h-3.5" /> 2D Planisferio
          </button>
          <button
            type="button"
            onClick={() => setModoVista('3d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${claseBotonVista(
              modoVista === '3d'
            )}`}
          >
            <Globe className="w-3.5 h-3.5" /> 3D Bóveda
          </button>
        </div>

        <div className="flex items-center gap-2">
          {modoVista === '3d' ? (
            <>
              <span className="opacity-65 hidden sm:inline">Arrastra para rotar el cielo</span>
              <button
                type="button"
                onClick={() => setCamara(CAMARA_INICIAL)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Centrar
              </button>
            </>
          ) : (
            <span className="opacity-60">Toca o pasa el cursor sobre un astro</span>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={
          modoVista === '3d'
            ? 'Bóveda celeste interactiva en 3D con estrellas, constelaciones, objetos Messier y planetas'
            : 'Mapa celeste interactivo con estrellas, constelaciones, objetos Messier y planetas'
        }
        onPointerDown={manejarPointerDown}
        onPointerMove={manejarPointerMove}
        onPointerUp={manejarPointerUp}
        onPointerCancel={manejarPointerUp}
        onPointerLeave={() => {
          if (!arrastreRef.current?.activo) setHoverInfo(null);
        }}
        className={`w-full max-w-140 aspect-square rounded-2xl shadow-2xl ${
          modoVista === '3d' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-crosshair'
        }`}
      />

      {hoverInfo && (
        <div
          className={`px-4 py-2 rounded-xl border text-xs font-mono flex flex-wrap items-center gap-4 ${CLASES_TOOLTIP[tema]}`}
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
````

## File: src/components/WeatherPanel.tsx
````typescript
import { Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import type { CondicionesMeteo, TemaVisual } from '../types/astronomy';

interface WeatherPanelProps {
  meteo: CondicionesMeteo | null;
  cargando: boolean;
  aviso: string | null;
  tema: TemaVisual;
  claseTarjeta: string;
}

const ESTILOS_VEREDICTO_OSCURO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  Aceptable: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  Desfavorable: 'border-rose-500/40 bg-rose-500/15 text-rose-400',
};

const ESTILOS_VEREDICTO_CLARO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'border-emerald-600/40 bg-emerald-500/15 text-emerald-700',
  Aceptable: 'border-amber-600/40 bg-amber-500/15 text-amber-700',
  Desfavorable: 'border-rose-600/40 bg-rose-500/15 text-rose-700',
};

function obtenerEstiloVeredicto(tema: TemaVisual, veredicto: CondicionesMeteo['veredicto']): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-500';
  if (tema === 'claro') return ESTILOS_VEREDICTO_CLARO[veredicto];
  return ESTILOS_VEREDICTO_OSCURO[veredicto];
}

export function WeatherPanel({
  meteo,
  cargando,
  aviso,
  tema,
  claseTarjeta,
}: Readonly<WeatherPanelProps>) {
  const colorBarra =
    tema === 'rojo' ? 'bg-red-600' : tema === 'claro' ? 'bg-sky-600' : 'bg-sky-400';

  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <Cloud className="w-4 h-4" /> Condiciones del Cielo
        </h2>

        {meteo && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${obtenerEstiloVeredicto(
              tema,
              meteo.veredicto
            )}`}
          >
            {meteo.veredicto}
          </span>
        )}
      </div>

      {cargando && <p className="text-xs opacity-70 font-mono">Consultando Open-Meteo...</p>}

      {!cargando && meteo && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono opacity-75">
            <span>Pronóstico: {meteo.horaPronostico}</span>
            {meteo.esCache && (
              <span className="px-2 py-0.5 rounded-full border border-current/25">
                Desde caché
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs pt-1">
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Cloud className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.nubesTotal}%</div>
              <div className="text-[10px] opacity-65">Nubes</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Wind className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.vientoKmh}</div>
              <div className="text-[10px] opacity-65">km/h</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Droplets className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.humedad}%</div>
              <div className="text-[10px] opacity-65">Humedad</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Thermometer className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
              <div className="font-bold text-sm">{meteo.temperatura}°</div>
              <div className="text-[10px] opacity-65">Temp.</div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono pt-1">
            {[
              { etiqueta: 'Nubes bajas (< 3 km)', valor: meteo.nubesBajas },
              { etiqueta: 'Nubes medias (3-8 km)', valor: meteo.nubesMedias },
              { etiqueta: 'Nubes altas (> 8 km)', valor: meteo.nubesAltas },
            ].map((capa) => (
              <div key={capa.etiqueta} className="space-y-1">
                <div className="flex justify-between opacity-80">
                  <span>{capa.etiqueta}</span>
                  <span>{capa.valor}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-current/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colorBarra}`}
                    style={{ width: `${capa.valor}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!cargando && aviso && <p className="text-xs opacity-70 font-mono">{aviso}</p>}
    </section>
  );
}
````

## File: src/core/skyCalculator.ts
````typescript
import * as Astronomy from 'astronomy-engine';
import type {
  CuerpoCeleste,
  EstadoCieloSolar,
  EstrellaCalculada,
  FaseCrepusculo,
  MessierCalculado,
  Ubicacion,
} from '../types/astronomy';
import { CATALOGO_MESSIER } from '../data/messierCatalog';
import { ESTRELLAS_BRILLANTES } from '../data/brightStars';

const CUERPOS_A_CALCULAR: {
  body: Astronomy.Body;
  nombre: string;
  tipo: CuerpoCeleste['tipo'];
  color: string;
}[] = [
  { body: Astronomy.Body.Moon, nombre: 'Luna', tipo: 'luna', color: '#f8fafc' },
  { body: Astronomy.Body.Mercury, nombre: 'Mercurio', tipo: 'planeta', color: '#94a3b8' },
  { body: Astronomy.Body.Venus, nombre: 'Venus', tipo: 'planeta', color: '#fef08a' },
  { body: Astronomy.Body.Mars, nombre: 'Marte', tipo: 'planeta', color: '#f87171' },
  { body: Astronomy.Body.Jupiter, nombre: 'Júpiter', tipo: 'planeta', color: '#fdba74' },
  { body: Astronomy.Body.Saturn, nombre: 'Saturno', tipo: 'planeta', color: '#fde047' },
  { body: Astronomy.Body.Uranus, nombre: 'Urano', tipo: 'planeta', color: '#67e8f9' },
  { body: Astronomy.Body.Neptune, nombre: 'Neptuno', tipo: 'planeta', color: '#60a5fa' },
];

export function esEntradaAstronomicaValida(fecha: Date, ubicacion: Ubicacion): boolean {
  if (Number.isNaN(fecha.getTime())) return false;
  if (!Number.isFinite(ubicacion.latitud) || ubicacion.latitud < -90 || ubicacion.latitud > 90) {
    return false;
  }
  if (!Number.isFinite(ubicacion.longitud) || ubicacion.longitud < -180 || ubicacion.longitud > 180) {
    return false;
  }
  if (!Number.isFinite(ubicacion.altitud)) return false;
  return true;
}

function gradosADireccion(acimut: number): string {
  const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const indice = Math.round(acimut / 45) % 8;
  return puntos[indice];
}

function obtenerNombreFaseLunar(angulo: number): string {
  if (angulo < 22.5 || angulo >= 337.5) return 'Luna Nueva';
  if (angulo < 67.5) return 'Luna Creciente';
  if (angulo < 112.5) return 'Cuarto Creciente';
  if (angulo < 157.5) return 'Gibosa Creciente';
  if (angulo < 202.5) return 'Luna Llena';
  if (angulo < 247.5) return 'Gibosa Menguante';
  if (angulo < 292.5) return 'Cuarto Menguante';
  return 'Luna Menguante';
}

function clasificarFaseSolar(altitudSol: number): FaseCrepusculo {
  if (altitudSol >= 0) return 'Día';
  if (altitudSol >= -6) return 'Crepúsculo civil';
  if (altitudSol >= -12) return 'Crepúsculo náutico';
  if (altitudSol >= -18) return 'Crepúsculo astronómico';
  return 'Noche astronómica';
}

function precesarJ2000AFecha(
  raJ2000Horas: number,
  decJ2000Grados: number,
  fecha: Date,
  rotacionEqjEqd: Astronomy.RotationMatrix
): { ra: number; dec: number } {
  const esferaJ2000 = new Astronomy.Spherical(decJ2000Grados, raJ2000Horas * 15, 1);
  const vectorJ2000 = Astronomy.VectorFromSphere(esferaJ2000, fecha);
  const vectorFecha = Astronomy.RotateVector(rotacionEqjEqd, vectorJ2000);
  const ecuatorialFecha = Astronomy.EquatorFromVector(vectorFecha);
  return { ra: ecuatorialFecha.ra, dec: ecuatorialFecha.dec };
}

export function calcularEstadoSolar(fecha: Date, ubicacion: Ubicacion): EstadoCieloSolar | null {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return null;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const ecuatorial = Astronomy.Equator(Astronomy.Body.Sun, fecha, observador, true, true);
  const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
  const altitudSol = Number(horizontal.altitude.toFixed(1));

  return {
    altitudSol,
    fase: clasificarFaseSolar(horizontal.altitude),
  };
}

export function calcularCielo(fecha: Date, ubicacion: Ubicacion): CuerpoCeleste[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  return CUERPOS_A_CALCULAR.map(({ body, nombre, tipo, color }) => {
    const ecuatorial = Astronomy.Equator(body, fecha, observador, true, true);
    const horizontal = Astronomy.Horizon(fecha, observador, ecuatorial.ra, ecuatorial.dec, 'normal');
    const brillo = Astronomy.Illumination(body, fecha);

    let faseLunar: string | undefined;
    let anguloFase: number | undefined;
    if (tipo === 'luna') {
      anguloFase = Astronomy.MoonPhase(fecha);
      faseLunar = obtenerNombreFaseLunar(anguloFase);
    }

    return {
      id: body.toString(),
      nombre,
      tipo,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      direccion: gradosADireccion(horizontal.azimuth),
      magnitud: Number(brillo.mag.toFixed(1)),
      iluminacion: Number((brillo.phase_fraction * 100).toFixed(0)),
      faseLunar,
      anguloFase,
      visible: horizontal.altitude > 0,
      color,
    };
  }).sort((a, b) => b.altitud - a.altitud);
}

export function calcularEstrellas(fecha: Date, ubicacion: Ubicacion): EstrellaCalculada[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);

  return ESTRELLAS_BRILLANTES.map((estrella) => {
    const { ra, dec } = precesarJ2000AFecha(estrella.ra, estrella.dec, fecha, rotacion);
    const horizontal = Astronomy.Horizon(fecha, observador, ra, dec, 'normal');
    return {
      ...estrella,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 0,
    };
  });
}

export function calcularMessier(fecha: Date, ubicacion: Ubicacion): MessierCalculado[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);

  return CATALOGO_MESSIER.map((obj) => {
    const { ra, dec } = precesarJ2000AFecha(obj.ra, obj.dec, fecha, rotacion);
    const horizontal = Astronomy.Horizon(fecha, observador, ra, dec, 'normal');
    return {
      ...obj,
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      visible: horizontal.altitude > 10,
    };
  });
}
````

## File: src/types/astronomy.ts
````typescript
export type TemaVisual = 'oscuro' | 'claro' | 'rojo';

export interface Ubicacion {
  latitud: number;
  longitud: number;
  altitud: number;
  nombre: string;
}

export interface CuerpoCeleste {
  id: string;
  nombre: string;
  tipo: 'planeta' | 'luna';
  altitud: number;
  acimut: number;
  direccion: string;
  magnitud: number;
  iluminacion?: number;
  faseLunar?: string;
  anguloFase?: number;
  visible: boolean;
  color: string;
}

export interface EstrellaCatalogo {
  id: string;
  nombre: string;
  constelacion: string;
  ra: number;
  dec: number;
  magnitud: number;
}

export interface EstrellaCalculada extends EstrellaCatalogo {
  altitud: number;
  acimut: number;
  visible: boolean;
}

export interface LineaConstelacion {
  constelacion: string;
  tramos: [string, string][];
}
export interface CondicionesMeteo {
  horaPronostico: string;
  nubesTotal: number;
  nubesBajas: number;
  nubesMedias: number;
  nubesAltas: number;
  humedad: number;
  vientoKmh: number;
  temperatura: number;
  veredicto: 'Excelente' | 'Aceptable' | 'Desfavorable';
  esCache?: boolean;
}
export type TipoMessier = 'nebulosa' | 'cumulo' | 'galaxia';

export interface ObjetoMessier {
  id: string;
  nombre: string;
  tipo: TipoMessier;
  constelacion: string;
  ra: number;
  dec: number;
  magnitud: number;
  dificultad: 'Fácil' | 'Moderada';
}

export interface MessierCalculado extends ObjetoMessier {
  altitud: number;
  acimut: number;
  visible: boolean;
}

export interface EventoCeleste {
  id: string;
  titulo: string;
  tipo: 'lluvia' | 'eclipse';
  fechaPico: Date;
  diasRestantes: number;
  resumen: string;
  detalle: string;
}

export interface LluviaAnual {
  id: string;
  nombre: string;
  mesPico: number; // 1-12
  diaPico: number;
  thz: number; // Meteoros por hora en condiciones ideales
  radiante: string;
}

export type FaseCrepusculo =
  | 'Día'
  | 'Crepúsculo civil'
  | 'Crepúsculo náutico'
  | 'Crepúsculo astronómico'
  | 'Noche astronómica';

export interface EstadoCieloSolar {
  altitudSol: number;
  fase: FaseCrepusculo;
}
````

## File: src/App.tsx
````typescript
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
import {
  calcularCielo,
  calcularEstadoSolar,
  calcularEstrellas,
  calcularMessier,
} from './core/skyCalculator';
import { obtenerCondicionesMeteo } from './core/weatherService';
import { calcularProximosEventos } from './core/eventsCalculator';
import { SkyMap } from './components/SkyMap';
import { WeatherPanel } from './components/WeatherPanel';
import { EventsPanel } from './components/EventsPanel';
import { StarfieldBackground } from './components/StarfieldBackground';
import { MoonPhase3D } from './components/MoonPhase3D';
import type { CondicionesMeteo, CuerpoCeleste, TemaVisual, Ubicacion } from './types/astronomy';

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
              />
            </div>

            <EventsPanel
              eventos={eventos}
              tema={tema}
              claseTarjeta={clasesTarjeta}
              onSeleccionarFecha={(fechaEvento) =>
                setFechaStr(formatearFechaParaInput(fechaEvento))
              }
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
            />

            <div className="space-y-2.5">
              <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 px-1">
                Sistema Solar y Luna
              </h2>
              {cuerpos.map((obj) => {
                const visibilidad = obtenerEstadoVisibilidadCuerpo(obj);
                const esLunaConFase =
                  obj.tipo === 'luna' && obj.faseLunar !== undefined && obj.iluminacion !== undefined;

                return (
                  <div
                    key={obj.id}
                    className={`tarjeta-3d p-3.5 rounded-xl border ${clasesTarjeta} ${claseHoverTarjeta} ${visibilidad.opacidad}`}
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
                  </div>
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
````
