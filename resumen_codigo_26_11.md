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
    AstronomyGuide.tsx
    Compass3DModal.tsx
    EventsPanel.tsx
    MoonPhase3D.tsx
    Navbar.tsx
    SkyMap.tsx
    StarfieldBackground.tsx
    WeatherPanel.tsx
  core/
    __tests__/
      astronomy.test.ts
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

## File: src/components/AstronomyGuide.tsx
````typescript
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Cloud,
  Compass,
  Crosshair,
  Eye,
  Map as IconoMapa,
  Sparkles,
  Sunset,
  Telescope,
  Wind,
} from 'lucide-react';
import type { TemaVisual } from '../types/astronomy';

interface AstronomyGuideProps {
  tema: TemaVisual;
  claseTarjeta: string;
  onVolver: () => void;
  onAbrirBrujula: () => void;
}

/** Paleta de trazos SVG por tema (en rojo, solo tonos rojos sobre negro). */
interface PaletaGuia {
  trazo: string;
  trazoSuave: string;
  acento: string;
  texto: string;
  claseAcento: string;
  claseBotonPrimario: string;
  /** Colores de las fases del crepúsculo: día → noche astronómica. */
  crepusculo: [string, string, string, string, string];
  /** Gradiente de brillo para la escala de magnitudes (brillante → tenue). */
  magnitudes: [string, string];
}

const PALETAS: Record<TemaVisual, PaletaGuia> = {
  oscuro: {
    trazo: '#94a3b8',
    trazoSuave: 'rgba(148,163,184,0.3)',
    acento: '#22d3ee',
    texto: '#e2e8f0',
    claseAcento: 'text-cyan-300',
    claseBotonPrimario:
      'bg-cyan-500/15 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/25',
    crepusculo: ['#38bdf8', '#2563eb', '#1e3a8a', '#172554', '#020617'],
    magnitudes: ['#f8fafc', '#334155'],
  },
  claro: {
    trazo: '#475569',
    trazoSuave: 'rgba(71,85,105,0.25)',
    acento: '#0369a1',
    texto: '#0f172a',
    claseAcento: 'text-sky-700',
    claseBotonPrimario: 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800',
    crepusculo: ['#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a', '#0f172a'],
    magnitudes: ['#0f172a', '#cbd5e1'],
  },
  rojo: {
    trazo: '#991b1b',
    trazoSuave: 'rgba(153,27,27,0.45)',
    acento: '#ef4444',
    texto: '#ef4444',
    claseAcento: 'text-red-500',
    claseBotonPrimario: 'bg-red-950 border-red-600 text-red-400 hover:bg-red-900/60',
    crepusculo: ['#dc2626', '#b91c1c', '#7f1d1d', '#450a0a', '#000000'],
    magnitudes: ['#f87171', '#450a0a'],
  },
};

function SeccionGuia({
  id,
  numero,
  titulo,
  Icono,
  claseTarjeta,
  claseAcento,
  children,
}: {
  id: string;
  numero: string;
  titulo: string;
  Icono: typeof Compass;
  claseTarjeta: string;
  claseAcento: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`p-5 md:p-6 rounded-2xl border scroll-mt-24 ${claseTarjeta}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`grid place-items-center w-10 h-10 rounded-xl border border-current/25 ${claseAcento}`}
          aria-hidden="true"
        >
          <Icono className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] font-mono opacity-60">
            Módulo {numero}
          </p>
          <h2 id={id} className="text-lg md:text-xl font-semibold tracking-tight">
            {titulo}
          </h2>
        </div>
      </div>
      <div className="space-y-4 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-current/15 bg-current/5">
      <dt className="text-[10px] uppercase tracking-[0.18em] opacity-60">{etiqueta}</dt>
      <dd className="font-mono text-sm mt-0.5">{valor}</dd>
    </div>
  );
}

/** Diagrama de rosa de los vientos con acimut. */
function DiagramaAcimut({ paleta }: { paleta: PaletaGuia }) {
  const marcas = Array.from({ length: 24 }, (_, i) => i * 15);
  const cardinales = [
    { angulo: 0, texto: 'N 0°' },
    { angulo: 90, texto: 'E 90°' },
    { angulo: 180, texto: 'S 180°' },
    { angulo: 270, texto: 'O 270°' },
  ];
  return (
    <svg
      viewBox="0 0 220 220"
      className="w-full max-w-56 mx-auto"
      role="img"
      aria-label="Rosa de acimut: Norte 0 grados, Este 90, Sur 180 y Oeste 270"
    >
      <circle cx="110" cy="110" r="78" fill="none" stroke={paleta.trazoSuave} strokeWidth="1" />
      <circle cx="110" cy="110" r="60" fill="none" stroke={paleta.trazoSuave} strokeDasharray="2 4" />
      {marcas.map((a) => {
        const rad = (a * Math.PI) / 180;
        const largo = a % 90 === 0 ? 12 : a % 45 === 0 ? 8 : 4;
        return (
          <line
            key={a}
            x1={110 + Math.sin(rad) * 78}
            y1={110 - Math.cos(rad) * 78}
            x2={110 + Math.sin(rad) * (78 - largo)}
            y2={110 - Math.cos(rad) * (78 - largo)}
            stroke={a % 90 === 0 ? paleta.acento : paleta.trazo}
            strokeWidth={a % 90 === 0 ? 2 : 1}
          />
        );
      })}
      {cardinales.map(({ angulo, texto }) => {
        const rad = (angulo * Math.PI) / 180;
        return (
          <text
            key={angulo}
            x={110 + Math.sin(rad) * 96}
            y={110 - Math.cos(rad) * 96 + 4}
            textAnchor="middle"
            fontSize="11"
            fontFamily="'JetBrains Mono Variable', monospace"
            fill={paleta.texto}
          >
            {texto}
          </text>
        );
      })}
      {/* Ejemplo: astro a 135° (SE) */}
      <line
        x1="110"
        y1="110"
        x2={110 + Math.sin((135 * Math.PI) / 180) * 70}
        y2={110 - Math.cos((135 * Math.PI) / 180) * 70}
        stroke={paleta.acento}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <path
        d={`M110 ${110 - 40} A40 40 0 0 1 ${110 + Math.sin((135 * Math.PI) / 180) * 40} ${
          110 - Math.cos((135 * Math.PI) / 180) * 40
        }`}
        fill="none"
        stroke={paleta.acento}
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <circle
        cx={110 + Math.sin((135 * Math.PI) / 180) * 70}
        cy={110 - Math.cos((135 * Math.PI) / 180) * 70}
        r="5"
        fill={paleta.acento}
      />
      <text
        x="134"
        y="104"
        fontSize="10"
        fontFamily="'JetBrains Mono Variable', monospace"
        fill={paleta.acento}
      >
        135°
      </text>
      <circle cx="110" cy="110" r="3" fill={paleta.trazo} />
    </svg>
  );
}

/** Diagrama lateral de altitud: horizonte (0°) a cenit (90°). */
function DiagramaAltitud({ paleta }: { paleta: PaletaGuia }) {
  const angulo = 40;
  const rad = (angulo * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 240 170"
      className="w-full max-w-64 mx-auto"
      role="img"
      aria-label="Altitud: 0 grados en el horizonte y 90 grados en el cenit, ejemplo de astro a 40 grados"
    >
      <line x1="20" y1="140" x2="220" y2="140" stroke={paleta.trazo} strokeWidth="1.5" />
      <path d="M40 140 A90 90 0 0 1 220 140" fill="none" stroke={paleta.trazoSuave} strokeDasharray="3 4" />
      <line x1="130" y1="140" x2="130" y2="40" stroke={paleta.trazoSuave} strokeDasharray="2 3" />
      <line
        x1="130"
        y1="140"
        x2={130 + Math.cos(rad) * 90}
        y2={140 - Math.sin(rad) * 90}
        stroke={paleta.acento}
        strokeWidth="1.5"
      />
      <path
        d={`M${130 + 36} 140 A36 36 0 0 0 ${130 + Math.cos(rad) * 36} ${140 - Math.sin(rad) * 36}`}
        fill="none"
        stroke={paleta.acento}
        strokeWidth="1"
      />
      <circle cx={130 + Math.cos(rad) * 90} cy={140 - Math.sin(rad) * 90} r="5" fill={paleta.acento} />
      <g fontFamily="'JetBrains Mono Variable', monospace" fontSize="10" fill={paleta.texto}>
        <text x="176" y="128">40°</text>
        <text x="130" y="32" textAnchor="middle">Cenit 90°</text>
        <text x="20" y="158">Horizonte 0°</text>
      </g>
      <circle cx="130" cy="140" r="3" fill={paleta.trazo} />
    </svg>
  );
}

const EJEMPLOS_MAGNITUD: { nombre: string; mag: number }[] = [
  { nombre: 'Venus', mag: -4.4 },
  { nombre: 'Júpiter', mag: -2.5 },
  { nombre: 'Sirio', mag: -1.46 },
  { nombre: 'Vega', mag: 0.03 },
  { nombre: 'M45 Pléyades', mag: 1.6 },
  { nombre: 'Polaris', mag: 1.98 },
  { nombre: 'M31 Andrómeda', mag: 3.4 },
  { nombre: 'Límite urbano', mag: 4.0 },
  { nombre: 'Límite ojo (cielo oscuro)', mag: 6.5 },
  { nombre: 'M1 Cangrejo', mag: 8.4 },
];

const MAG_MIN = -5;
const MAG_MAX = 9;

function EscalaMagnitudes({ paleta }: { paleta: PaletaGuia }) {
  const posicion = (mag: number) => ((mag - MAG_MIN) / (MAG_MAX - MAG_MIN)) * 100;
  return (
    <figure className="space-y-3">
      <div
        className="relative h-3 rounded-full"
        style={{
          background: `linear-gradient(to right, ${paleta.magnitudes[0]}, ${paleta.magnitudes[1]})`,
        }}
        aria-hidden="true"
      >
        {/* Franja Messier 4.0–8.8 */}
        <span
          className="absolute -top-1.5 -bottom-1.5 rounded border border-dashed"
          style={{
            left: `${posicion(4)}%`,
            width: `${posicion(8.8) - posicion(4)}%`,
            borderColor: paleta.acento,
          }}
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] opacity-70" aria-hidden="true">
        <span>-5 · más brillante</span>
        <span>0</span>
        <span>+9 · más tenue</span>
      </div>
      <figcaption className="sr-only">
        Escala de magnitud aparente de -5 a +9; la franja discontinua marca el rango típico de los
        objetos Messier, entre 4.0 y 8.8.
      </figcaption>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {EJEMPLOS_MAGNITUD.map(({ nombre, mag }) => {
          // Tamaño del punto proporcional al brillo
          const tam = Math.max(3, 14 - (mag - MAG_MIN) * 0.8);
          return (
            <li
              key={nombre}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-current/10"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="grid place-items-center w-4 h-4 shrink-0" aria-hidden="true">
                  <span
                    className="rounded-full"
                    style={{ width: tam, height: tam, backgroundColor: paleta.acento }}
                  />
                </span>
                <span className="truncate">{nombre}</span>
              </span>
              <span className="font-mono text-xs">{mag > 0 ? `+${mag.toFixed(2)}` : mag.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

const FASES_CREPUSCULO: { nombre: string; rango: string; descripcion: string }[] = [
  { nombre: 'Día', rango: 'Sol > 0°', descripcion: 'Solo Luna, Venus o Júpiter brillantes.' },
  {
    nombre: 'Crepúsculo civil',
    rango: '0° a -6°',
    descripcion: 'Aún hay luz para leer; aparecen los planetas brillantes.',
  },
  {
    nombre: 'Crepúsculo náutico',
    rango: '-6° a -12°',
    descripcion: 'Se distingue el horizonte y las estrellas principales.',
  },
  {
    nombre: 'Crepúsculo astronómico',
    rango: '-12° a -18°',
    descripcion: 'Cielo casi oscuro; el fondo aún tiene un leve resplandor.',
  },
  {
    nombre: 'Noche astronómica',
    rango: 'Sol < -18°',
    descripcion: 'Oscuridad total: el momento ideal para galaxias y nebulosas.',
  },
];

export function AstronomyGuide({ tema, claseTarjeta, onVolver, onAbrirBrujula }: AstronomyGuideProps) {
  const paleta = PALETAS[tema];
  const claseBotonSecundario =
    'border-current/30 hover:bg-current/10';

  return (
    <article className="space-y-6" aria-labelledby="titulo-guia">
      {/* Cabecera de la guía */}
      <header className={`p-5 md:p-7 rounded-2xl border hud-rejilla ${claseTarjeta}`}>
        <p className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-mono ${paleta.claseAcento}`}>
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Manual de campo
        </p>
        <h1 id="titulo-guia" className="mt-2 text-2xl md:text-4xl font-bold tracking-tight">
          Guía del Observatorio
        </h1>
        <p className="mt-3 max-w-3xl text-sm md:text-base opacity-80 leading-relaxed">
          Todo lo que necesitas para empezar a observar con prismáticos o un telescopio sencillo y
          sacar el máximo partido a SkyProject: cómo leer coordenadas, interpretar el brillo de los
          astros, decidir si la noche merece la pena y orientarte en el campo.
        </p>
        <nav aria-label="Índice de la guía" className="mt-5 flex flex-wrap gap-2 text-xs">
          {[
            { href: '#guia-mapa', texto: 'Mapa celeste' },
            { href: '#guia-magnitud', texto: 'Magnitud' },
            { href: '#guia-cielo', texto: 'Condiciones del cielo' },
            { href: '#guia-campo', texto: 'Uso en el campo' },
          ].map(({ href, texto }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center min-h-10 px-3 rounded-full border border-current/25 hover:bg-current/10 transition-colors"
            >
              {texto}
            </a>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1 · Mapa celeste */}
        <SeccionGuia
          id="guia-mapa"
          numero="01"
          titulo="Cómo leer el mapa celeste (2D y 3D)"
          Icono={IconoMapa}
          claseTarjeta={claseTarjeta}
          claseAcento={paleta.claseAcento}
        >
          <p>
            Cada astro se localiza con dos ángulos horizontales, medidos desde tu posición exacta:
            el <strong>acimut</strong> (hacia dónde mirar) y la <strong>altitud</strong> (cuánto
            levantar la vista).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <DiagramaAcimut paleta={paleta} />
              <p className="text-xs opacity-80 text-center">
                <strong>Acimut:</strong> se mide en sentido horario desde el Norte.
              </p>
            </div>
            <div className="space-y-2">
              <DiagramaAltitud paleta={paleta} />
              <p className="text-xs opacity-80 text-center">
                <strong>Altitud:</strong> 0° en el horizonte, 90° justo sobre tu cabeza.
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Dato etiqueta="Norte" valor="0°" />
            <Dato etiqueta="Este" valor="90°" />
            <Dato etiqueta="Sur" valor="180°" />
            <Dato etiqueta="Oeste" valor="270°" />
          </dl>
          <ul className="list-disc pl-5 space-y-1.5 marker:opacity-50">
            <li>
              En la <strong>vista 2D</strong>, el centro del círculo es el cenit y el borde, el
              horizonte; las letras del borde indican cada punto cardinal, como si miraras el
              cielo tumbado boca arriba.
            </li>
            <li>
              En la <strong>Bóveda 3D</strong>, arrastra con el dedo o el ratón para girar la cúpula
              y mira en cualquier dirección. Pulsa un astro para ver su trayectoria nocturna.
            </li>
            <li>
              Un astro a <span className="font-mono">Alt &lt; 10°</span> atraviesa mucha atmósfera:
              se verá más tenue y turbulento. Espera a que suba.
            </li>
          </ul>
        </SeccionGuia>

        {/* 2 · Magnitud */}
        <SeccionGuia
          id="guia-magnitud"
          numero="02"
          titulo="Brillo y visibilidad: la magnitud aparente"
          Icono={Sparkles}
          claseTarjeta={claseTarjeta}
          claseAcento={paleta.claseAcento}
        >
          <p>
            La magnitud es una escala <strong>inversa</strong>: cuanto menor (o más negativo) es el
            número, más brillante es el astro. Cada punto de magnitud equivale a unas{' '}
            <span className="font-mono">2,5×</span> de diferencia de brillo.
          </p>
          <EscalaMagnitudes paleta={paleta} />
          <p className="text-xs opacity-80">
            Por ejemplo, Sirio (<span className="font-mono">-1.46</span>) es la estrella más
            brillante del cielo nocturno, mientras que los objetos Messier del catálogo
            (<span className="font-mono">4.0–8.8</span>) piden cielo oscuro y, en la mayoría de los
            casos, prismáticos o telescopio.
          </p>
        </SeccionGuia>

        {/* 3 · Condiciones del cielo */}
        <SeccionGuia
          id="guia-cielo"
          numero="03"
          titulo="Condiciones del cielo y fases del crepúsculo"
          Icono={Cloud}
          claseTarjeta={claseTarjeta}
          claseAcento={paleta.claseAcento}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                titulo: 'Nubes bajas',
                alt: '< 2 km',
                texto: 'Las más dañinas: tapan el cielo por completo. Por encima del 30 % la noche peligra.',
              },
              {
                titulo: 'Nubes medias',
                alt: '2–6 km',
                texto: 'Bancos grises que van y vienen. Permiten observar a ratos entre claros.',
              },
              {
                titulo: 'Nubes altas',
                alt: '> 6 km',
                texto: 'Cirros finos: dejan ver planetas y la Luna, pero apagan galaxias y nebulosas.',
              },
            ].map(({ titulo, alt, texto }) => (
              <div key={titulo} className="p-3 rounded-xl border border-current/15 bg-current/5">
                <p className="font-display font-semibold text-sm flex items-center justify-between gap-2">
                  {titulo} <span className="font-mono text-[11px] opacity-70">{alt}</span>
                </p>
                <p className="text-xs opacity-80 mt-1">{texto}</p>
              </div>
            ))}
          </div>
          <p className="flex gap-2.5">
            <Wind className={`w-4 h-4 mt-0.5 shrink-0 ${paleta.claseAcento}`} aria-hidden="true" />
            <span>
              <strong>El viento importa:</strong> por encima de{' '}
              <span className="font-mono">20 km/h</span> un telescopio vibra y la imagen tiembla a
              grandes aumentos. Busca refugio tras un muro o usa pocos aumentos.
            </span>
          </p>
          <div>
            <p className="font-display font-semibold mb-2 flex items-center gap-2">
              <Sunset className={`w-4 h-4 ${paleta.claseAcento}`} aria-hidden="true" /> Fases del
              crepúsculo (altura del Sol)
            </p>
            <div className="flex h-3 rounded-full overflow-hidden" aria-hidden="true">
              {paleta.crepusculo.map((color, i) => (
                <span key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            <ol className="mt-3 space-y-1.5">
              {FASES_CREPUSCULO.map((fase, i) => (
                <li key={fase.nombre} className="flex items-start gap-2.5">
                  <span
                    className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 border border-current/30"
                    style={{ backgroundColor: paleta.crepusculo[i] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="font-semibold">{fase.nombre}</span>{' '}
                    <span className="font-mono text-xs opacity-75">({fase.rango})</span>
                    <span className="block text-xs opacity-80">{fase.descripcion}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs opacity-80 mt-3">
              La barra de tiempo del Observatorio muestra la fase actual junto a la altura del Sol.
            </p>
          </div>
        </SeccionGuia>

        {/* 4 · Uso en el campo */}
        <SeccionGuia
          id="guia-campo"
          numero="04"
          titulo="Uso en el campo"
          Icono={Telescope}
          claseTarjeta={claseTarjeta}
          claseAcento={paleta.claseAcento}
        >
          <ul className="space-y-3">
            <li className="flex gap-3">
              <Eye className={`w-5 h-5 shrink-0 mt-0.5 ${paleta.claseAcento}`} aria-hidden="true" />
              <span>
                <strong>Filtro Rojo:</strong> tus ojos tardan entre 20 y 30 minutos en adaptarse a
                la oscuridad, y un solo destello de luz blanca lo arruina. La luz roja apenas afecta
                a los bastones de la retina, así que conservas la visión nocturna mientras
                consultas la app. Baja también el brillo de la pantalla al mínimo.
              </span>
            </li>
            <li className="flex gap-3">
              <Crosshair className={`w-5 h-5 shrink-0 mt-0.5 ${paleta.claseAcento}`} aria-hidden="true" />
              <span>
                <strong>GPS:</strong> pulsa el botón de mira en la barra superior para fijar tu
                posición real. Unos pocos kilómetros de error apenas cambian el cielo, pero cambiar
                de ciudad o de país sí. Guarda tus lugares habituales en favoritos.
              </span>
            </li>
            <li className="flex gap-3">
              <Telescope className={`w-5 h-5 shrink-0 mt-0.5 ${paleta.claseAcento}`} aria-hidden="true" />
              <span>
                <strong>Objetos Messier para empezar:</strong> las Pléyades (M45), el cúmulo de
                Hércules (M13), la nebulosa de Orión (M42) y la galaxia de Andrómeda (M31) se ven
                con prismáticos de <span className="font-mono">10×50</span> o un telescopio de
                iniciación. Actívalos en las capas del mapa y búscalos por nombre.
              </span>
            </li>
            <li className="flex gap-3">
              <Compass className={`w-5 h-5 shrink-0 mt-0.5 ${paleta.claseAcento}`} aria-hidden="true" />
              <span>
                <strong>Apuntar con la Brújula 3D:</strong> ábrela, activa los sensores y sostén el
                móvil en horizontal, lejos de objetos metálicos. Gira sobre ti mismo hasta que el
                marcador del planeta quede bajo la marca superior: la app te avisará cuando estés
                alineado (±8°) y te dirá a qué altitud levantar la vista.
              </span>
            </li>
          </ul>
          <p className="text-xs opacity-75 border-t border-current/15 pt-3">
            Consejo: calibra la brújula del móvil trazando un «8» en el aire si las lecturas
            parecen erráticas.
          </p>
        </SeccionGuia>
      </div>

      {/* Acciones finales */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${claseTarjeta}`}
      >
        <p className="text-sm opacity-85">
          ¿Listo para salir a observar? Vuelve al mapa o prueba la brújula para orientarte.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onVolver}
            className={`inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${claseBotonSecundario}`}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver al Observatorio
          </button>
          <button
            type="button"
            onClick={onAbrirBrujula}
            aria-haspopup="dialog"
            className={`inline-flex items-center justify-center gap-2 px-4 min-h-11 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${paleta.claseBotonPrimario}`}
          >
            <Compass className="w-4 h-4 brujula-icono-animada" aria-hidden="true" />
            Probar Brújula 3D
          </button>
        </div>
      </div>
    </article>
  );
}
````

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

## File: src/core/__tests__/astronomy.test.ts
````typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcularCielo,
  calcularEstadoSolar,
  calcularEstrellas,
  calcularMessier,
  calcularTransitoCuerpo,
  calcularTrayectoriaAstro,
  esEntradaAstronomicaValida,
} from '../skyCalculator';
import { calcularProximosEventos } from '../eventsCalculator';
import { obtenerCondicionesMeteo } from '../weatherService';
import type { Ubicacion } from '../../types/astronomy';

const VALENCIA: Ubicacion = {
  latitud: 39.47,
  longitud: -0.38,
  altitud: 150,
  nombre: 'Valencia',
};

function crearMockStorage(): Storage {
  const almacen = new Map<string, string>();
  return {
    get length() {
      return almacen.size;
    },
    clear() {
      almacen.clear();
    },
    getItem(clave: string) {
      return almacen.get(clave) ?? null;
    },
    key(indice: number) {
      return Array.from(almacen.keys())[indice] ?? null;
    },
    removeItem(clave: string) {
      almacen.delete(clave);
    },
    setItem(clave: string, valor: string) {
      almacen.set(clave, valor);
    },
  };
}

function crearHourlySintetico(inicioUTC: Date, horas: number) {
  const time: string[] = [];
  const cloud_cover: number[] = [];
  const cloud_cover_low: number[] = [];
  const cloud_cover_mid: number[] = [];
  const cloud_cover_high: number[] = [];
  const relative_humidity_2m: number[] = [];
  const wind_speed_10m: number[] = [];
  const temperature_2m: number[] = [];

  for (let i = 0; i < horas; i++) {
    const fecha = new Date(inicioUTC.getTime() + i * 3_600_000);
    const anio = fecha.getUTCFullYear();
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getUTCDate()).padStart(2, '0');
    const hora = String(fecha.getUTCHours()).padStart(2, '0');
    time.push(`${anio}-${mes}-${dia}T${hora}:00`);
    cloud_cover.push(10 + (i % 5) * 5);
    cloud_cover_low.push(5);
    cloud_cover_mid.push(10);
    cloud_cover_high.push(15);
    relative_humidity_2m.push(60);
    wind_speed_10m.push(12);
    temperature_2m.push(18.4);
  }

  return {
    time,
    cloud_cover,
    cloud_cover_low,
    cloud_cover_mid,
    cloud_cover_high,
    relative_humidity_2m,
    wind_speed_10m,
    temperature_2m,
  };
}

describe('Validación defensiva (esEntradaAstronomicaValida)', () => {
  const fechaValida = new Date('2026-06-15T22:00:00Z');

  it('acepta fechas y coordenadas dentro de los límites exactos', () => {
    expect(esEntradaAstronomicaValida(fechaValida, VALENCIA)).toBe(true);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: -90, longitud: -180 })
    ).toBe(true);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: 90, longitud: 180 })
    ).toBe(true);
  });

  it('rechaza fechas inválidas', () => {
    expect(esEntradaAstronomicaValida(new Date('invalid'), VALENCIA)).toBe(false);
  });

  it('rechaza latitudes y longitudes fuera de rango', () => {
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: -90.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud: 90.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, longitud: -180.01 })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, longitud: 180.01 })).toBe(false);
  });

  it('rechaza altitudes no finitas (NaN e Infinity)', () => {
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.NaN })).toBe(
      false
    );
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.POSITIVE_INFINITY })
    ).toBe(false);
    expect(
      esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.NEGATIVE_INFINITY })
    ).toBe(false);
  });
});

describe('Motor astronómico (skyCalculator)', () => {
  describe('calcularEstadoSolar', () => {
    it('clasifica correctamente Día al mediodía y Noche astronómica de madrugada en Valencia', () => {
      const mediodia = calcularEstadoSolar(new Date('2026-03-21T12:00:00Z'), VALENCIA);
      expect(mediodia).not.toBeNull();
      expect(mediodia?.fase).toBe('Día');
      expect(mediodia?.altitudSol).toBeGreaterThan(0);

      const noche = calcularEstadoSolar(new Date('2026-03-21T01:00:00Z'), VALENCIA);
      expect(noche).not.toBeNull();
      expect(noche?.fase).toBe('Noche astronómica');
      expect(noche?.altitudSol).toBeLessThan(-18);
    });

    it('clasifica crepúsculo civil/náutico/astronómico tras la puesta de sol', () => {
      const fasesCrepusculo = new Set([
        'Crepúsculo civil',
        'Crepúsculo náutico',
        'Crepúsculo astronómico',
      ]);
      const atardecer = calcularEstadoSolar(new Date('2026-03-21T18:45:00Z'), VALENCIA);
      expect(atardecer).not.toBeNull();
      expect(fasesCrepusculo.has(atardecer?.fase ?? '')).toBe(true);
    });

    it('devuelve null ante entradas inválidas', () => {
      expect(calcularEstadoSolar(new Date('invalid'), VALENCIA)).toBeNull();
      expect(
        calcularEstadoSolar(new Date('2026-03-21T12:00:00Z'), { ...VALENCIA, latitud: 95 })
      ).toBeNull();
    });
  });

  describe('calcularCielo', () => {
    it('devuelve los 8 cuerpos ordenados descendentemente por altitud con fase lunar solo en la Luna', () => {
      const cuerpos = calcularCielo(new Date('2026-03-21T22:00:00Z'), VALENCIA);
      expect(cuerpos).toHaveLength(8);

      for (let i = 1; i < cuerpos.length; i++) {
        expect(cuerpos[i - 1].altitud).toBeGreaterThanOrEqual(cuerpos[i].altitud);
      }

      const luna = cuerpos.find((c) => c.tipo === 'luna');
      expect(luna).toBeDefined();
      expect(luna?.faseLunar).toBeDefined();
      expect(luna?.anguloFase).toBeTypeOf('number');

      const planetas = cuerpos.filter((c) => c.tipo === 'planeta');
      expect(planetas).toHaveLength(7);
      for (const planeta of planetas) {
        expect(planeta.faseLunar).toBeUndefined();
        expect(planeta.anguloFase).toBeUndefined();
      }
    });
  });

  describe('calcularEstrellas y calcularMessier', () => {
    it('aplica precesión J2000 situando a Polaris cerca de la latitud del observador en el hemisferio norte', () => {
      const fecha = new Date('2026-03-21T22:00:00Z');
      const estrellas = calcularEstrellas(fecha, VALENCIA);
      const polaris = estrellas.find((e) => e.id === 'polaris');

      expect(polaris).toBeDefined();
      expect(Math.abs((polaris?.altitud ?? 0) - VALENCIA.latitud)).toBeLessThan(1.5);
    });

    it('aplica umbral de visibilidad > 0° en estrellas y > 10° en objetos Messier', () => {
      const fecha = new Date('2026-03-21T22:00:00Z');
      const estrellas = calcularEstrellas(fecha, VALENCIA);
      const messier = calcularMessier(fecha, VALENCIA);

      expect(estrellas.length).toBeGreaterThan(0);
      for (const estrella of estrellas) {
        if (estrella.altitud > 0.1) expect(estrella.visible).toBe(true);
        if (estrella.altitud < -0.1) expect(estrella.visible).toBe(false);
      }

      expect(messier.length).toBeGreaterThan(0);
      for (const obj of messier) {
        if (obj.altitud > 10.1) expect(obj.visible).toBe(true);
        if (obj.altitud < 9.9) expect(obj.visible).toBe(false);
      }
    });
  });

  describe('calcularTrayectoriaAstro y calcularTransitoCuerpo', () => {
    const fecha = new Date('2026-03-21T22:00:00Z');

    it('devuelve 25 puntos (-6h a +6h cada 30 min) para cuerpo, estrella y objeto Messier válidos', () => {
      const trajLuna = calcularTrayectoriaAstro(
        { id: 'Moon', nombre: 'Luna', categoria: 'cuerpo' },
        fecha,
        VALENCIA
      );
      const trajSirio = calcularTrayectoriaAstro(
        { id: 'sirius', nombre: 'Sirio', categoria: 'estrella' },
        fecha,
        VALENCIA
      );
      const trajM31 = calcularTrayectoriaAstro(
        { id: 'M31', nombre: 'M31 · Galaxia de Andrómeda', categoria: 'messier' },
        fecha,
        VALENCIA
      );

      expect(trajLuna).toHaveLength(25);
      expect(trajSirio).toHaveLength(25);
      expect(trajM31).toHaveLength(25);
    });

    it('devuelve array vacío para IDs inexistentes y tránsito vacío para cuerpos inexistentes', () => {
      expect(
        calcularTrayectoriaAstro(
          { id: 'PlutonInexistente', nombre: 'Inexistente', categoria: 'cuerpo' },
          fecha,
          VALENCIA
        )
      ).toEqual([]);

      expect(
        calcularTrayectoriaAstro(
          { id: 'estrella-falsa', nombre: 'Falsa', categoria: 'estrella' },
          fecha,
          VALENCIA
        )
      ).toEqual([]);

      const transitoInvalido = calcularTransitoCuerpo('NoExiste', fecha, VALENCIA);
      expect(transitoInvalido).toEqual({
        salida: null,
        culminacion: null,
        puesta: null,
        alturaMaxima: null,
      });
    });

    it('calcula efemérides de tránsito válidas para un cuerpo existente', () => {
      const transito = calcularTransitoCuerpo('Moon', fecha, VALENCIA);
      expect(transito.culminacion).toBeInstanceOf(Date);
      expect(transito.alturaMaxima).toBeTypeOf('number');
    });
  });
});

describe('Eventos astronómicos (eventsCalculator)', () => {
  it('devuelve como máximo 6 eventos ordenados cronológicamente con diasRestantes >= 0', () => {
    const fechaBase = new Date('2026-03-21T12:00:00Z');
    const eventos = calcularProximosEventos(fechaBase, VALENCIA);

    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos.length).toBeLessThanOrEqual(6);

    for (let i = 0; i < eventos.length; i++) {
      expect(eventos[i].diasRestantes).toBeGreaterThanOrEqual(0);
      if (i > 0) {
        expect(eventos[i].fechaPico.getTime()).toBeGreaterThanOrEqual(
          eventos[i - 1].fechaPico.getTime()
        );
      }
    }
  });

  it('diferencia eclipses lunares penumbrales frente a eclipses totales o parciales', () => {
    // 25 de marzo de 2024: eclipse lunar penumbral
    const eventosPenumbral = calcularProximosEventos(new Date('2024-03-20T12:00:00Z'), VALENCIA);
    const eclipsePenumbral = eventosPenumbral.find((ev) => ev.titulo.includes('Eclipse Lunar'));
    expect(eclipsePenumbral).toBeDefined();
    expect(eclipsePenumbral?.titulo).toBe('Eclipse Lunar Penumbral');
    expect(eclipsePenumbral?.resumen).toBe('Eclipse penumbral (oscurecimiento sutil)');

    // 14 de marzo de 2025: eclipse lunar total
    const eventosTotal = calcularProximosEventos(new Date('2025-03-01T12:00:00Z'), VALENCIA);
    const eclipseTotal = eventosTotal.find((ev) => ev.titulo.includes('Eclipse Lunar'));
    expect(eclipseTotal).toBeDefined();
    expect(eclipseTotal?.titulo).toBe('Eclipse Lunar Total');
    expect(eclipseTotal?.resumen).toMatch(/^Oscurecimiento: \d+%$/);
  });
});

describe('Servicio meteorológico (weatherService)', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = crearMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa la caché válida de localStorage sin invocar fetch y genera 12 franjas en proximasHoras', async () => {
    const fechaUTC = new Date('2026-06-15T20:00:00Z');
    const hourly = crearHourlySintetico(fechaUTC, 24);
    mockStorage.setItem(
      'skyproject_meteo_cache_v2',
      JSON.stringify({
        claveUbicacion: '39.47,-0.38',
        timestamp: Date.now(),
        hourly,
      })
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado.aviso).toBeNull();
    expect(resultado.datos).not.toBeNull();
    expect(resultado.datos?.esCache).toBe(true);
    expect(resultado.datos?.horaPronostico).toBe('2026-06-15 20:00 UTC');
    expect(resultado.datos?.proximasHoras).toHaveLength(12);
    expect(resultado.datos?.proximasHoras[0].fechaISO).toBe('2026-06-15T20:00:00Z');
  });

  it('se recupera de forma segura ante JSON corrupto en localStorage y consulta Open-Meteo en UTC', async () => {
    const fechaUTC = new Date('2026-06-15T21:00:00Z');
    const hourly = crearHourlySintetico(fechaUTC, 18);
    mockStorage.setItem('skyproject_meteo_cache_v2', '{json-corrupto');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hourly }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await obtenerCondicionesMeteo(fechaUTC, VALENCIA);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const urlLlamada = String(fetchMock.mock.calls[0][0]);
    expect(urlLlamada).toContain('timezone=UTC');
    expect(resultado.aviso).toBeNull();
    expect(resultado.datos).not.toBeNull();
    expect(resultado.datos?.esCache).toBe(false);
    expect(resultado.datos?.horaPronostico).toBe('2026-06-15 21:00 UTC');
    expect(resultado.datos?.proximasHoras).toHaveLength(12);
  });
});
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

## File: src/components/Compass3DModal.tsx
````typescript
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTecladoReact, PointerEvent as EventoPunteroReact } from 'react';
import { Compass, Hand, Navigation, Smartphone, Target, X } from 'lucide-react';
import type {
  ConstructorOrientacionConPermiso,
  CuerpoCeleste,
  EstadoSensorBrujula,
  EventoOrientacionDispositivo,
  ObjetivoBrujula,
  OrientacionBrujula,
  TemaVisual,
} from '../types/astronomy';

interface Compass3DModalProps {
  tema: TemaVisual;
  cuerpos: CuerpoCeleste[];
  objetivoSeleccionado?: ObjetivoBrujula | null;
  onCerrar: () => void;
}

/* ── Utilidades angulares ─────────────────────────────────────────── */

function normalizarAngulo(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
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
  objetivoSeleccionado = null,
  onCerrar,
}: Compass3DModalProps) {
  const paleta = PALETAS[tema];
  const idTitulo = useId();
  const idDescripcion = useId();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null);
  const discoRef = useRef<HTMLDivElement | null>(null);

  const [estadoSensor, setEstadoSensor] = useState<EstadoSensorBrujula>(detectarEstadoInicial);
  const [referenciaSensor, setReferenciaSensor] = useState<'absoluta' | 'relativa' | null>(null);
  const [intentoSensor, setIntentoSensor] = useState(0);
  const [modoManual, setModoManual] = useState(false);
  const [rumboManual, setRumboManual] = useState(0);
  const [inclinacionManual, setInclinacionManual] = useState(25);
  const [visual, setVisual] = useState<OrientacionBrujula>({ rumbo: 0, inclinacion: 25 });
  const [movimientoReducido] = useState(prefiereMovimientoReducido);

  const objetivoRef = useRef<OrientacionBrujula>({ rumbo: 0, inclinacion: 25 });
  const visualRef = useRef<OrientacionBrujula>({ rumbo: 0, inclinacion: 25 });
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

      if (Math.abs(difRumbo) < 0.05 && Math.abs(difInclinacion) < 0.05) {
        if (actual.rumbo !== objetivo.rumbo || actual.inclinacion !== objetivo.inclinacion) {
          const exacto = { rumbo: objetivo.rumbo, inclinacion: objetivo.inclinacion };
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

      const siguiente = { rumbo, inclinacion };
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
      objetivoRef.current = { rumbo: normalizarAngulo(rumboManual), inclinacion: inclinacionManual };
      programarSuavizado();
    }
  }, [simulacion, rumboManual, inclinacionManual, programarSuavizado]);

  /* Escucha de sensores: deviceorientationabsolute (prioritario) + deviceorientation */
  useEffect(() => {
    if (!escuchando || typeof DeviceOrientationEvent === 'undefined') return;

    const procesarOrientacion = (evento: Event) => {
      if (!(evento instanceof DeviceOrientationEvent)) return;
      const datos = evento as EventoOrientacionDispositivo;
      let rumbo: number | null = null;
      let absoluta = false;

      if (typeof datos.webkitCompassHeading === 'number' && Number.isFinite(datos.webkitCompassHeading)) {
        // Safari iOS: rumbo magnético ya referido al Norte
        rumbo = normalizarAngulo(datos.webkitCompassHeading);
        absoluta = true;
      } else if (datos.alpha !== null && Number.isFinite(datos.alpha)) {
        absoluta = evento.type === 'deviceorientationabsolute' || datos.absolute;
        // Si ya llegan lecturas absolutas, se descartan las relativas
        if (!absoluta && lecturaAbsolutaRef.current) return;
        rumbo = normalizarAngulo(360 - datos.alpha);
      }

      if (rumbo === null) return;
      if (absoluta) lecturaAbsolutaRef.current = true;

      const inclinacion =
        datos.beta !== null && Number.isFinite(datos.beta) ? limitar(datos.beta, -90, 90) : 0;

      if (!simulacionRef.current) {
        objetivoRef.current = { rumbo, inclinacion };
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
    setInclinacionManual(Math.round(limitar(visualRef.current.inclinacion, -60, 60)));
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
      setModoManual(true);
      return;
    }
    setModoManual(true);
    setRumboManual((prev) => normalizarAngulo(Math.round(prev) + delta));
  };

  /* Datos derivados */
  const rumboEntero = Math.round(visual.rumbo) % 360;
  const cardinal = direccionCardinal(visual.rumbo);
  const inclinacionEntera = Math.round(visual.inclinacion);
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
            aria-valuetext={`${rumboEntero} grados, ${cardinal}`}
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
            <span className="font-mono text-[10px] opacity-75 mt-0.5">
              Incl {inclinacionEntera > 0 ? '+' : ''}
              {inclinacionEntera}°
            </span>
          </div>
        </div>

        {/* Aviso de alineación */}
        <div aria-live="polite" className="min-h-12 mt-3 flex items-center justify-center">
          {alineado ? (
            <p
              className={`alineacion-pulso inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-medium ${paleta.claseAviso}`}
            >
              <Target className="w-4 h-4" aria-hidden="true" />
              Apuntando hacia {alineado.nombre} ·{' '}
              <span className="font-mono">Alt {Math.round(alineado.altitud)}°</span>
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
                  <span>Inclinación</span>
                  <span className="font-mono">
                    {inclinacionManual > 0 ? '+' : ''}
                    {inclinacionManual}°
                  </span>
                </span>
                <input
                  type="range"
                  min={-60}
                  max={60}
                  step={1}
                  value={inclinacionManual}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    if (!Number.isFinite(valor)) return;
                    setModoManual(true);
                    setInclinacionManual(limitar(valor, -60, 60));
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
````

## File: src/components/Navbar.tsx
````typescript
import { useEffect, useId, useState } from 'react';
import { BookOpen, Compass, Crosshair, Eye, MapPin, Menu, Moon, Sun, Telescope, X } from 'lucide-react';
import type { TemaVisual, Ubicacion, VistaActiva } from '../types/astronomy';

interface NavbarProps {
  tema: TemaVisual;
  onCambiarTema: (tema: TemaVisual) => void;
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  onAbrirBrujula: () => void;
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

## File: src/main.tsx
````typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tipografías astronómicas locales (offline-first, sin peticiones externas)
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
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

## Reglas transversales obligatorias
- TypeScript en modo estricto (prohibido `any`).
- Compatibilidad total con los 3 temas (`oscuro`, `claro`, `rojo`) y `prefers-reduced-motion`.
- Prohibido usar `alert()`, `confirm()` o `prompt()`.
- Validar siempre `localStorage`, APIs y entradas de usuario con *type guards* y `try/catch`.
- Ejecutar `npm run lint` y `npm run build` al finalizar cada tarea.
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

## File: src/core/eventsCalculator.ts
````typescript
import * as Astronomy from 'astronomy-engine';
import type { EventoCeleste, Ubicacion } from '../types/astronomy';
import { LLUVIAS_ESTRELLAS } from '../data/meteorShowers';
import { esEntradaAstronomicaValida } from './skyCalculator';

const NOMBRES_ECLIPSE: Record<string, string> = {
  total: 'Total',
  partial: 'Parcial',
  annular: 'Anular',
  penumbral: 'Penumbral',
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
    const tipoClave = String(lunar.kind).toLowerCase();
    const tipoStr = NOMBRES_ECLIPSE[tipoClave] ?? 'Lunar';

    const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, fechaPico, observador, true, true);
    const horLuna = Astronomy.Horizon(fechaPico, observador, eqLuna.ra, eqLuna.dec, 'normal');

    const resumen =
      tipoClave === 'penumbral'
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
      const tipoStr = NOMBRES_ECLIPSE[String(solar.kind).toLowerCase()] ?? 'Solar';
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
import type { CondicionesMeteo, FranjaHorariaMeteo, Ubicacion } from '../types/astronomy';
import { calcularEstadoSolar, esEntradaAstronomicaValida } from './skyCalculator';

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

function formatearHoraLocalFranja(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function extraerDesdeHourly(
  hourly: OpenMeteoHourly,
  fecha: Date,
  ubicacion: Ubicacion,
  esCache: boolean
): CondicionesMeteo | null {
  const claveHora = formatearClaveHoraUTC(fecha);
  const idx = hourly.time.indexOf(claveHora);
  if (idx === -1) return null;

  const nubesTotal = Math.round(hourly.cloud_cover[idx] ?? 0);
  const vientoKmh = Math.round(hourly.wind_speed_10m[idx] ?? 0);

  const proximasHoras: FranjaHorariaMeteo[] = [];
  const limite = Math.min(idx + 12, hourly.time.length);

  for (let i = idx; i < limite; i++) {
    const horaRaw = hourly.time[i];
    const fechaISO = horaRaw.endsWith('Z') ? horaRaw : `${horaRaw}:00Z`;
    const fechaFranja = new Date(fechaISO);
    if (Number.isNaN(fechaFranja.getTime())) continue;

    const nubesFranja = Math.min(100, Math.max(0, Math.round(hourly.cloud_cover[i] ?? 0)));
    const vientoFranja = Math.max(0, Math.round(hourly.wind_speed_10m[i] ?? 0));
    const estadoSolar = calcularEstadoSolar(fechaFranja, ubicacion);

    proximasHoras.push({
      fechaISO,
      horaLocal: formatearHoraLocalFranja(fechaFranja),
      nubesTotal: nubesFranja,
      vientoKmh: vientoFranja,
      veredicto: evaluarVeredicto(nubesFranja, vientoFranja),
      esNoche: estadoSolar !== null && estadoSolar.altitudSol < -6,
    });
  }

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
    proximasHoras,
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
    const datos = extraerDesdeHourly(cache.hourly, fecha, ubicacion, true);
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

    const datos = extraerDesdeHourly(hourly, fecha, ubicacion, false);
    return {
      datos,
      aviso: datos ? null : 'Pronóstico disponible solo hasta 14 días vista.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    if (cache && cache.claveUbicacion === claveUbicacion) {
      const datos = extraerDesdeHourly(cache.hourly, fecha, ubicacion, true);
      return {
        datos,
        aviso: datos ? 'Sin conexión: mostrando datos guardados en caché.' : 'Sin conexión.',
      };
    }
    return { datos: null, aviso: 'No se pudo obtener la previsión meteorológica.' };
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
MOVIL.md
PORTFOLIO.md
resumen_codigo.md
````

## File: index.html
````html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#020617" />
    <title>SkyProject — Mapa Celeste</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

## File: package.json
````json
{
  "name": "sky_project",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@capacitor/core": "^8.6.2",
    "@fontsource-variable/inter": "^5.3.0",
    "@fontsource-variable/jetbrains-mono": "^5.3.0",
    "@fontsource-variable/space-grotesk": "^5.3.0",
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
    "vite": "^8.3.6",
    "vitest": "^5.1.2"
  }
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
          <CalendarClock className="w-4 h-4" aria-hidden="true" /> Próximos Eventos Celestes
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
                    <Sparkles
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'lluvia')}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <Eclipse
                      className={`w-3.5 h-3.5 shrink-0 ${obtenerClaseIconoEvento(tema, 'eclipse')}`}
                      aria-hidden="true"
                    />
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
                  type="button"
                  onClick={() => onSeleccionarFecha(ev.fechaPico)}
                  aria-label={`Ver ${ev.titulo} en el mapa celeste`}
                  className="inline-flex items-center gap-1 min-h-9 px-2.5 py-1 rounded-lg border border-current/25 hover:bg-current/10 no-underline hover:opacity-100 cursor-pointer font-sans font-medium transition-colors"
                >
                  Ver en mapa <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
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

## File: src/core/skyCalculator.ts
````typescript
import * as Astronomy from 'astronomy-engine';
import type {
  AstroSeleccionado,
  CuerpoCeleste,
  EfemeridesTransito,
  EstadoCieloSolar,
  EstrellaCalculada,
  FaseCrepusculo,
  MessierCalculado,
  PuntoTrayectoria,
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

function formatearHoraEtiqueta(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function calcularTrayectoriaAstro(
  astro: AstroSeleccionado,
  fecha: Date,
  ubicacion: Ubicacion
): PuntoTrayectoria[] {
  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return [];

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );
  const puntos: PuntoTrayectoria[] = [];
  const pasoMs = 30 * 60_000;

  if (astro.categoria === 'cuerpo') {
    const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === astro.id);
    if (!cuerpoDef) return [];

    for (let i = -12; i <= 12; i++) {
      const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
      const ecuatorial = Astronomy.Equator(cuerpoDef.body, fechaPaso, observador, true, true);
      const horizontal = Astronomy.Horizon(
        fechaPaso,
        observador,
        ecuatorial.ra,
        ecuatorial.dec,
        'normal'
      );
      puntos.push({
        altitud: Number(horizontal.altitude.toFixed(1)),
        acimut: Number(horizontal.azimuth.toFixed(1)),
        horaEtiqueta: formatearHoraEtiqueta(fechaPaso),
      });
    }
    return puntos;
  }

  const catalogo =
    astro.categoria === 'estrella'
      ? ESTRELLAS_BRILLANTES.find((e) => e.id === astro.id)
      : CATALOGO_MESSIER.find((m) => m.id === astro.id);

  if (!catalogo) return [];

  const rotacion = Astronomy.Rotation_EQJ_EQD(fecha);
  const { ra, dec } = precesarJ2000AFecha(catalogo.ra, catalogo.dec, fecha, rotacion);

  for (let i = -12; i <= 12; i++) {
    const fechaPaso = new Date(fecha.getTime() + i * pasoMs);
    const horizontal = Astronomy.Horizon(fechaPaso, observador, ra, dec, 'normal');
    puntos.push({
      altitud: Number(horizontal.altitude.toFixed(1)),
      acimut: Number(horizontal.azimuth.toFixed(1)),
      horaEtiqueta: formatearHoraEtiqueta(fechaPaso),
    });
  }

  return puntos;
}

export function calcularTransitoCuerpo(
  idCuerpo: string,
  fecha: Date,
  ubicacion: Ubicacion
): EfemeridesTransito {
  const vacio: EfemeridesTransito = {
    salida: null,
    culminacion: null,
    puesta: null,
    alturaMaxima: null,
  };

  if (!esEntradaAstronomicaValida(fecha, ubicacion)) return vacio;

  const cuerpoDef = CUERPOS_A_CALCULAR.find((c) => c.body.toString() === idCuerpo);
  if (!cuerpoDef) return vacio;

  const observador = new Astronomy.Observer(
    ubicacion.latitud,
    ubicacion.longitud,
    ubicacion.altitud
  );

  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);

  let salida: Date | null = null;
  let puesta: Date | null = null;
  let culminacion: Date | null = null;
  let alturaMaxima: number | null = null;

  try {
    const eventoSalida = Astronomy.SearchRiseSet(cuerpoDef.body, observador, 1, inicioDia, 1);
    if (eventoSalida) salida = eventoSalida.date;
  } catch {
    // Mantiene salida en null en latitudes o fechas sin orto
  }

  try {
    const eventoPuesta = Astronomy.SearchRiseSet(cuerpoDef.body, observador, -1, inicioDia, 1);
    if (eventoPuesta) puesta = eventoPuesta.date;
  } catch {
    // Mantiene puesta en null en latitudes o fechas sin ocaso
  }

  try {
    const eventoCulminacion = Astronomy.SearchHourAngle(
      cuerpoDef.body,
      observador,
      0,
      inicioDia,
      1
    );
    culminacion = eventoCulminacion.time.date;
    alturaMaxima = Number(eventoCulminacion.hor.altitude.toFixed(1));
  } catch {
    // Mantiene culminación en null si no es resoluble
  }

  return {
    salida,
    culminacion,
    puesta,
    alturaMaxima,
  };
}
````

## File: src/index.css
````css
@import "tailwindcss";

/* Sistema tipográfico astronómico (fuentes locales vía @fontsource-variable) */
@theme {
  --font-display: 'Space Grotesk Variable', system-ui, sans-serif;
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}

@layer base {
  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1,
  h2,
  h3 {
    font-family: var(--font-display);
    letter-spacing: -0.01em;
  }

  /* Filtro Rojo: ningún acento del navegador puede salir del espectro rojo */
  .tema-rojo {
    accent-color: #dc2626;
  }

  .tema-rojo *:focus-visible {
    outline-color: #dc2626;
  }

  .tema-rojo ::selection {
    background-color: #7f1d1d;
    color: #f87171;
  }

  button,
  a,
  input,
  [role="slider"] {
    -webkit-tap-highlight-color: transparent;
  }
}

@layer utilities {
  .tarjeta-3d {
    transform-style: preserve-3d;
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 240ms ease,
      border-color 240ms ease,
      opacity 200ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .tarjeta-3d:hover {
      transform: perspective(900px) translateY(-2px) rotateX(1.2deg);
    }
  }

  /* ── Estética HUD de observatorio ─────────────────────────────── */
  .hud-esquinas {
    position: relative;
  }

  /* Esquinas técnicas discretas (marcas de retícula en las 4 esquinas) */
  .hud-esquinas::before {
    content: '';
    position: absolute;
    inset: 6px;
    pointer-events: none;
    border-radius: inherit;
    --hud-l: 12px;
    --hud-g: 1.5px;
    background:
      linear-gradient(var(--hud-color), var(--hud-color)) top left / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top left / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top right / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) top right / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom left / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom left / var(--hud-g) var(--hud-l) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom right / var(--hud-l) var(--hud-g) no-repeat,
      linear-gradient(var(--hud-color), var(--hud-color)) bottom right / var(--hud-g) var(--hud-l) no-repeat;
  }

  /* Oscuro: brillo cian tenue */
  .hud-oscuro {
    --hud-color: rgb(34 211 238 / 0.45);
    box-shadow:
      0 0 0 1px rgb(34 211 238 / 0.04),
      0 0 24px -12px rgb(34 211 238 / 0.35),
      0 20px 25px -5px rgb(0 0 0 / 0.3);
  }

  /* Claro: acabado limpio de instrumento */
  .hud-claro {
    --hud-color: rgb(71 85 105 / 0.45);
  }

  /* Rojo: líneas finas rojo oscuro, sin brillo */
  .hud-rojo {
    --hud-color: rgb(153 27 27 / 0.9);
  }

  /* Rejilla técnica tenue para fondos de instrumentos */
  .hud-rejilla {
    background-image:
      linear-gradient(to right, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  /* Icono de brújula con oscilación sutil */
  .brujula-icono-animada {
    animation: brujula-oscilar 4.5s ease-in-out infinite;
    transform-origin: center;
  }

  .alineacion-pulso {
    animation: alineacion-pulso 1.6s ease-in-out infinite;
  }

  /* Deslizadores HUD: usan currentColor para respetar los 3 temas */
  .rango-hud {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 2.5rem;
    background: transparent;
    cursor: pointer;
    touch-action: pan-y;
  }

  .rango-hud::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 9999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }

  .rango-hud::-moz-range-track {
    height: 4px;
    border-radius: 9999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }

  .rango-hud::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -9px;
    border-radius: 9999px;
    background: currentColor;
    border: 3px solid color-mix(in srgb, currentColor 35%, black);
  }

  .rango-hud::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: currentColor;
    border: 3px solid color-mix(in srgb, currentColor 35%, black);
  }
}

@keyframes brujula-oscilar {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(14deg);
  }
}

@keyframes alineacion-pulso {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-3d,
  .tarjeta-3d:hover {
    transform: none;
    transition: none;
  }

  .brujula-icono-animada,
  .alineacion-pulso {
    animation: none;
  }
}
````

## File: README.md
````markdown
# ✨ SkyProject

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Offline First](https://img.shields.io/badge/Architecture-Offline--First-10B981?style=for-the-badge)](#arquitectura-y-decisiones-técnicas)

Aplicación web **offline-first** (`v1.0.0`) de astronomía observacional para planificar salidas nocturnas y explorar la bóveda celeste en tiempo real. Calcula efemérides planetarias, posiciones estelares, objetos del catálogo Messier, próximos eventos astronómicos y previsión meteorológica por capas de nubosidad para cualquier ubicación y fecha.

---

## 🚀 Funcionalidades principales

- **Navbar responsive y navegación unificada (`Navbar`):** barra superior adaptable con acceso directo al Observatorio, Guía de uso, Brújula 3D, selector rápido de ubicación/GPS y cambio de tema visual.
- **Mapa celeste interactivo (`<canvas>`) con doble vista y control por teclado:**
  - **2D Planisferio:** proyección polar del cielo con rejilla de altitud (30° y 60°), puntos cardinales e inspección de astros por puntero o toque.
  - **3D Bóveda:** proyección hemisférica interactiva con rotación libre mediante arrastre (ratón/táctil) y teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `R`/`Home`).
  - Renderizado de **33 estrellas brillantes** con colores espectrales, líneas de constelaciones (Orión, Osa Mayor, Casiopea), **12 objetos Messier**, Luna y planetas (incluidos los anillos de Saturno), además de trayectorias ±6h y retícula de selección.
- **Buscador global de astros con autoenfoque 3D:** búsqueda instantánea por nombre, constelación o código Messier con navegación por teclado (`combobox`/`listbox`), activación automática de la capa Messier y centrado suave en la bóveda 3D.
- **Reproductor Time-Lapse y control temporal:** atajos rápidos (`Ahora`, `Esta noche 23:30`, `+1h`), selector manual y simulación animada del movimiento celeste a `+15 min/s` o `+1 h/s`.
- **Brújula Astronómica 3D (`Compass3DModal`):** herramienta de apuntado celeste en tiempo real con soporte para sensores reales del dispositivo (`DeviceOrientationEvent`) y modo simulación interactivo para escritorio o pruebas en interior.
- **Guía del Observatorio (`AstronomyGuide`):** documentación integrada paso a paso con diagramas SVG interactivos sobre coordenadas horizontales (altitud y acimut), fases crepusculares y planificación de sesiones.
- **Motor astronómico local (`astronomy-engine`):**
  - Altitud, acimut, orientación cardinal, magnitud aparente, visibilidad sobre el horizonte y efemérides de tránsito (salida, culminación y puesta).
  - Precesión de coordenadas desde época **J2000** a la fecha exacta de observación.
  - Cálculo del estado solar y fase del crepúsculo (*Día*, *Civil*, *Náutico*, *Astronómico* y *Noche astronómica*).
- **Esfera lunar dinámica (`MoonPhase3D`):** representación SVG vectorial de la fase lunar real a partir del ángulo de fase, con sombreado de limbo y mares lunares adaptados al tema activo.
- **Meteorología astronómica y Ventana Óptima de 12 h (Open-Meteo API):**
  - Consulta sincronizada en **UTC** hasta 14 días vista con desglose de nubosidad baja (< 3 km), media (3–8 km) y alta (> 8 km), viento, humedad, temperatura y veredicto automático (*Excelente*, *Aceptable* o *Desfavorable*).
  - **Ventana de las próximas 12 h:** barra interactiva de claridad hora a hora con indicador día/noche y salto directo al cielo de esa franja en un clic.
  - Caché en `localStorage` (TTL de 1 hora) con *fallback* automático sin conexión.
- **Calendario de próximos eventos celestes:** próximas lluvias de estrellas (THZ y radiante) y eclipses lunares y solares calculados para las coordenadas del observador, con salto directo en un clic al mapa en la fecha del pico.
- **Gestor de observatorios favoritos y GPS:** geolocalización del dispositivo con mensajes de error específicos, edición manual validada y guardado persistente de hasta 8 ubicaciones favoritas en `localStorage`.
- **Tres temas visuales, accesibilidad WCAG 2.1 AA y soporte móvil (Capacitor):** `Oscuro`, `Claro` y **Filtro Rojo** para preservar la adaptación ocular nocturna, respeto a `prefers-reduced-motion`, áreas seguras (`safe-area-inset`) y sincronización dinámica de `<meta name="theme-color">`.

---

## 📸 Capturas recomendadas

> Sustituye las rutas siguientes por tus capturas reales dentro de `docs/screenshots/` (recomendado: ancho de `1280px` en formato `.webp` o `.png`).

| Vista | Descripción recomendada para la captura |
| :--- | :--- |
| ![Vista principal en modo oscuro](docs/screenshots/vista-principal-oscuro.png) | **Vista principal (Tema Oscuro):** mapa celeste en 2D/3D, panel meteorológico con ventana de 12 h y tarjetas del Sistema Solar con la esfera lunar `MoonPhase3D`. |
| ![Bóveda 3D interactiva](docs/screenshots/boveda-3d.png) | **Modo 3D Bóveda:** cúpula rotada mostrando constelaciones, objetos Messier, trayectoria ±6h y barra de inspección fija. |
| ![Modo Filtro Rojo](docs/screenshots/filtro-rojo-nocturno.png) | **Tema Filtro Rojo:** interfaz completa en modo de visión nocturna junto a la Brújula 3D y el panel de próximos eventos celestes. |

---

## 🛠️ Stack tecnológico

| Categoría | Tecnología | Uso en el proyecto |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript (modo estricto) | UI reactiva y tipado exhaustivo sin `any` |
| **Build & Estilos** | Vite 8 + Tailwind CSS v4 | Bundling ultrarrápido y diseño *responsive* |
| **Astronomía** | `astronomy-engine` | Efemérides, precesión J2000 y eclipses 100% en local |
| **Meteorología** | Open-Meteo API | Previsión horaria en UTC con caché en `localStorage` |
| **Iconografía** | `lucide-react` | Iconos vectoriales ligeros |
| **Testing** | Vitest | Tests unitarios del motor astronómico, eventos y caché meteo |
| **Móvil (preparado)** | Capacitor 8 | Empaquetado nativo futuro (Android / iOS) |
| **Calidad de código** | ESLint 10 + `typescript-eslint` | Reglas de React Hooks y análisis estático |

---

## 📜 Scripts disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con Vite |
| `npm run build` | Comprueba tipos con TypeScript (`tsc -b`) y genera el bundle de producción |
| `npm run preview` | Previsualiza localmente el build de producción |
| `npm run lint` | Ejecuta ESLint sobre todo el proyecto |
| `npm test` | Ejecuta la batería de tests unitarios con Vitest (`vitest run`) |

---

## 🏗️ Arquitectura y decisiones técnicas

```text
sky_project/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx                # Barra de navegación responsive, GPS, tema y acceso a Brújula 3D
│   │   ├── SkyMap.tsx                # Canvas interactivo 2D Planisferio y 3D Bóveda (Pointer + Teclado)
│   │   ├── Compass3DModal.tsx        # Brújula Astronómica 3D con DeviceOrientationEvent y modo simulación
│   │   ├── AstronomyGuide.tsx        # Guía del Observatorio con diagramas SVG interactivos
│   │   ├── MoonPhase3D.tsx           # Esfera lunar SVG basada en el ángulo de fase real
│   │   ├── StarfieldBackground.tsx   # Fondo estelar en canvas con soporte prefers-reduced-motion
│   │   ├── WeatherPanel.tsx          # Panel meteorológico, nubosidad por capas y Ventana Óptima de 12 h
│   │   └── EventsPanel.tsx           # Próximas lluvias de estrellas y eclipses locales
│   ├── core/
│   │   ├── __tests__/
│   │   │   └── astronomy.test.ts     # Batería de tests unitarios con Vitest
│   │   ├── skyCalculator.ts          # Cálculos astronómicos, precesión J2000, tránsitos y validación
│   │   ├── eventsCalculator.ts       # Búsqueda de eclipses visibles y cálculo de lluvias anuales
│   │   └── weatherService.ts         # Cliente Open-Meteo en UTC, caché local y fallback offline
│   ├── data/
│   │   ├── brightStars.ts            # Catálogo de 33 estrellas brillantes y trazos de constelaciones
│   │   ├── messierCatalog.ts         # Catálogo de 12 objetos de cielo profundo (nebulosas, cúmulos, galaxias)
│   │   └── meteorShowers.ts          # Calendario de 9 lluvias de estrellas anuales
│   ├── types/
│   │   └── astronomy.ts              # Contratos e interfaces TypeScript centralizadas
│   ├── App.tsx                       # Estado principal, buscador, Time-Lapse, favoritos, GPS y temas
│   └── main.tsx                      # Punto de entrada de React
├── capacitor.config.ts               # Configuración base de Capacitor para empaquetado móvil
├── GEMINI.md                         # Reglas de arquitectura y estándares del proyecto
└── AGENTS.md                         # Guía de convenciones, verificación y commits
```
````

## File: src/components/WeatherPanel.tsx
````typescript
import { Cloud, Droplets, Moon, Sun, Thermometer, Wind } from 'lucide-react';
import type { CondicionesMeteo, TemaVisual } from '../types/astronomy';

interface WeatherPanelProps {
  meteo: CondicionesMeteo | null;
  cargando: boolean;
  aviso: string | null;
  tema: TemaVisual;
  claseTarjeta: string;
  onSeleccionarHora: (fecha: Date) => void;
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

const COLORES_BARRA_OSCURO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-emerald-400',
  Aceptable: 'bg-amber-400',
  Desfavorable: 'bg-rose-400',
};

const COLORES_BARRA_CLARO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-emerald-600',
  Aceptable: 'bg-amber-500',
  Desfavorable: 'bg-rose-600',
};

const COLORES_BARRA_ROJO: Record<CondicionesMeteo['veredicto'], string> = {
  Excelente: 'bg-red-500',
  Aceptable: 'bg-red-700',
  Desfavorable: 'bg-red-900',
};

function obtenerEstiloVeredicto(tema: TemaVisual, veredicto: CondicionesMeteo['veredicto']): string {
  if (tema === 'rojo') return 'border-red-600 bg-red-950/50 text-red-500';
  if (tema === 'claro') return ESTILOS_VEREDICTO_CLARO[veredicto];
  return ESTILOS_VEREDICTO_OSCURO[veredicto];
}

function obtenerColorBarraFranja(
  tema: TemaVisual,
  veredicto: CondicionesMeteo['veredicto']
): string {
  if (tema === 'rojo') return COLORES_BARRA_ROJO[veredicto];
  if (tema === 'claro') return COLORES_BARRA_CLARO[veredicto];
  return COLORES_BARRA_OSCURO[veredicto];
}

export function WeatherPanel({
  meteo,
  cargando,
  aviso,
  tema,
  claseTarjeta,
  onSeleccionarHora,
}: Readonly<WeatherPanelProps>) {
  const colorBarra =
    tema === 'rojo' ? 'bg-red-600' : tema === 'claro' ? 'bg-sky-600' : 'bg-sky-400';

  return (
    <section className={`p-4 rounded-2xl border space-y-3 ${claseTarjeta}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider opacity-75 flex items-center gap-2">
          <Cloud className="w-4 h-4" aria-hidden="true" /> Condiciones del Cielo
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

      {cargando && (
        <p role="status" aria-live="polite" className="text-xs opacity-70 font-mono">
          Consultando Open-Meteo...
        </p>
      )}

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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs pt-1">
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Cloud className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.nubesTotal}%</div>
              <div className="text-[10px] opacity-65">Nubes</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Wind className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.vientoKmh}</div>
              <div className="text-[10px] opacity-65">km/h</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Droplets className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
              <div className="font-bold text-sm">{meteo.humedad}%</div>
              <div className="text-[10px] opacity-65">Humedad</div>
            </div>
            <div className="p-2 rounded-xl border border-current/15 bg-current/5 transition-colors hover:border-current/30">
              <Thermometer className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" aria-hidden="true" />
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
                <div
                  role="progressbar"
                  aria-label={capa.etiqueta}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={capa.valor}
                  className="w-full h-1.5 rounded-full bg-current/15 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all motion-reduce:transition-none ${colorBarra}`}
                    style={{ width: `${capa.valor}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {meteo.proximasHoras.length > 0 && (
            <div className="pt-2 border-t border-current/15 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="uppercase tracking-wider font-semibold opacity-75">
                  Ventana de las próximas 12 h
                </span>
                <span className="opacity-60">Claridad · clic para saltar</span>
              </div>

              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="grid grid-cols-12 gap-1 min-w-[432px] sm:min-w-0">
                  {meteo.proximasHoras.map((franja, indice) => {
                    const claridad = Math.min(100, Math.max(0, 100 - franja.nubesTotal));
                    const colorBarraFranja = obtenerColorBarraFranja(tema, franja.veredicto);
                    const esHoraActual = indice === 0;
                    const claseFranjaActiva = esHoraActual
                      ? 'border-current/40 bg-current/10'
                      : 'border-current/15 bg-current/5 hover:border-current/35 hover:bg-current/10';

                    return (
                      <button
                        key={franja.fechaISO}
                        type="button"
                        onClick={() => {
                          const fecha = new Date(franja.fechaISO);
                          if (!Number.isNaN(fecha.getTime())) {
                            onSeleccionarHora(fecha);
                          }
                        }}
                        title={`${franja.horaLocal} · Claridad ${claridad}% (Nubes ${franja.nubesTotal}%) · Viento ${franja.vientoKmh} km/h · ${franja.veredicto} · ${franja.esNoche ? 'Noche' : 'Día'}`}
                        aria-label={`Ver cielo a las ${franja.horaLocal}, claridad ${claridad}%, ${franja.veredicto}, ${franja.esNoche ? 'noche' : 'día'}`}
                        className={`flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-lg border cursor-pointer transition-colors motion-reduce:transition-none ${claseFranjaActiva}`}
                      >
                        <div className="w-2.5 h-11 rounded-full bg-current/10 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-full transition-all motion-reduce:transition-none ${colorBarraFranja}`}
                            style={{ height: `${claridad}%` }}
                          />
                        </div>
                        {franja.esNoche ? (
                          <Moon className="w-2.5 h-2.5 opacity-75" aria-hidden="true" />
                        ) : (
                          <Sun className="w-2.5 h-2.5 opacity-45" aria-hidden="true" />
                        )}
                        <span className="text-[9px] font-mono leading-none opacity-80">
                          {franja.horaLocal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!cargando && aviso && (
        <p role="status" aria-live="polite" className="text-xs opacity-70 font-mono">
          {aviso}
        </p>
      )}
    </section>
  );
}
````

## File: src/components/SkyMap.tsx
````typescript
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 560;
    const tamanoBuffer = Math.round(size * dpr);
    if (canvas.width !== tamanoBuffer || canvas.height !== tamanoBuffer) {
      canvas.width = tamanoBuffer;
      canvas.height = tamanoBuffer;
    }

    const cx = size / 2;
    const cy = size / 2;
    const radio = size / 2 - 36;
    const paleta = PALETAS[tema];

    const proyectarFn =
      modoVista === '2d'
        ? (alt: number, az: number) => proyectar2D(alt, az, cx, cy, radio)
        : (alt: number, az: number) => proyectar3D(alt, az, cx, cy, size, camara);

    const dibujarEscena = (fasePulso: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const interactivos: ObjetoHover[] = [];

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

      dibujarTrayectoria(ctx, trayectoria, tema, proyectarFn);
      dibujarCuerpos(ctx, cuerpos, tema, proyectarFn, interactivos);
      dibujarReticulaSeleccion(ctx, astroSeleccionado, interactivos, tema, fasePulso);

      ctx.restore();
      puntosInteractivosRef.current = interactivos;
    };

    const prefiereMovimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!astroSeleccionado || prefiereMovimientoReducido) {
      dibujarEscena(0.5);
      return;
    }

    let animacionId = 0;
    const animar = (tiempo: number) => {
      const fase = (Math.sin(tiempo / 320) + 1) / 2;
      dibujarEscena(fase);
      animacionId = window.requestAnimationFrame(animar);
    };
    animacionId = window.requestAnimationFrame(animar);

    return () => {
      window.cancelAnimationFrame(animacionId);
    };
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
    astroSeleccionado,
    trayectoria,
  ]);

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

export interface UbicacionFavorita extends Ubicacion {
  id: string;
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
export interface FranjaHorariaMeteo {
  fechaISO: string;
  horaLocal: string;
  nubesTotal: number;
  vientoKmh: number;
  veredicto: CondicionesMeteo['veredicto'];
  esNoche: boolean;
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
  proximasHoras: FranjaHorariaMeteo[];
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

export type CategoriaAstro = 'cuerpo' | 'estrella' | 'messier';

export interface AstroSeleccionado {
  id: string;
  nombre: string;
  categoria: CategoriaAstro;
}

export interface PuntoTrayectoria {
  altitud: number;
  acimut: number;
  horaEtiqueta: string;
}

export interface EfemeridesTransito {
  salida: Date | null;
  culminacion: Date | null;
  puesta: Date | null;
  alturaMaxima: number | null;
}

/** Vistas principales de la aplicación (navegación sin router). */
export type VistaActiva = 'observatorio' | 'guia';

/** Resultado de la solicitud de permiso de sensores (Safari iOS 13+). */
export type PermisoOrientacion = 'granted' | 'denied' | 'default';

/** Evento de orientación con la extensión propietaria de Safari iOS. */
export interface EventoOrientacionDispositivo extends DeviceOrientationEvent {
  /** Rumbo magnético en grados (0 = Norte), solo en WebKit/iOS. */
  readonly webkitCompassHeading?: number;
  /** Precisión estimada del rumbo en grados, solo en WebKit/iOS. */
  readonly webkitCompassAccuracy?: number;
}

/** Constructor de DeviceOrientationEvent con el método estático opcional de iOS. */
export interface ConstructorOrientacionConPermiso {
  requestPermission?: () => Promise<PermisoOrientacion>;
}

export type EstadoSensorBrujula =
  | 'inactivo'
  | 'solicitando'
  | 'buscando'
  | 'activo'
  | 'denegado'
  | 'no-disponible'
  | 'inseguro'
  | 'sin-lecturas';

export interface OrientacionBrujula {
  /** Rumbo en grados [0, 360). */
  rumbo: number;
  /** Cabeceo/inclinación del dispositivo en grados. */
  inclinacion: number;
}

export interface ObjetivoBrujula {
  id: string;
  nombre: string;
  acimut: number;
  altitud: number;
  color: string;
}
````

## File: src/App.tsx
````typescript
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

const COLOR_TEMA_META: Record<TemaVisual, string> = {
  oscuro: '#020617',
  claro: '#dbeafe',
  rojo: '#000000',
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
    const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = COLOR_TEMA_META[tema];
    }
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
      (err) => {
        if (err.code === 1) {
          setErrorGPS('Permiso de ubicación denegado. Actívalo en los ajustes del navegador.');
        } else if (err.code === 2) {
          setErrorGPS('Señal GPS no disponible en este momento.');
        } else if (err.code === 3) {
          setErrorGPS('Tiempo de espera agotado al obtener la ubicación GPS.');
        } else {
          setErrorGPS('No se pudo obtener el GPS. Revisa los permisos o inténtalo de nuevo.');
        }
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
    <div
      className={`tema-${tema} relative min-h-screen transition-colors duration-300 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${clasesContenedor}`}
    >
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
          <section id="panel-ubicacion" className={`p-4 rounded-2xl border ${clasesTarjeta} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Configurar punto de observación
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={guardarUbicacionFavorita}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  Guardar en favoritos
                </button>
                <button
                  type="button"
                  onClick={detectarGPS}
                  disabled={cargandoGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 sm:min-h-8 rounded-lg text-xs font-medium border border-current/30 hover:bg-current/10 cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
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
                  className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent ${claseEsquemaInput}`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Latitud (°N)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={-90}
                  max={90}
                  step="0.0001"
                  aria-invalid={Boolean(erroresUbicacion.latitud)}
                  aria-describedby={erroresUbicacion.latitud ? 'error-latitud' : undefined}
                  value={formUbicacion.latitud}
                  onChange={(e) => actualizarCampoUbicacion('latitud', e.target.value)}
                  className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.latitud && (
                  <span id="error-latitud" className="block text-[11px] opacity-90">
                    {erroresUbicacion.latitud}
                  </span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Longitud (°E)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={-180}
                  max={180}
                  step="0.0001"
                  aria-invalid={Boolean(erroresUbicacion.longitud)}
                  aria-describedby={erroresUbicacion.longitud ? 'error-longitud' : undefined}
                  value={formUbicacion.longitud}
                  onChange={(e) => actualizarCampoUbicacion('longitud', e.target.value)}
                  className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.longitud && (
                  <span id="error-longitud" className="block text-[11px] opacity-90">
                    {erroresUbicacion.longitud}
                  </span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs opacity-70">Altitud (metros)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={-500}
                  max={9000}
                  aria-invalid={Boolean(erroresUbicacion.altitud)}
                  aria-describedby={erroresUbicacion.altitud ? 'error-altitud' : undefined}
                  value={formUbicacion.altitud}
                  onChange={(e) => actualizarCampoUbicacion('altitud', e.target.value)}
                  className={`w-full min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono ${claseEsquemaInput}`}
                />
                {erroresUbicacion.altitud && (
                  <span id="error-altitud" className="block text-[11px] opacity-90">
                    {erroresUbicacion.altitud}
                  </span>
                )}
              </label>
            </div>

            {favoritos.length > 0 && (
              <div className="pt-2 border-t border-current/15 space-y-2">
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Observatorios favoritos
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
                          <MapPin className="w-3 h-3 opacity-75 shrink-0" aria-hidden="true" />
                          <span>{fav.nombre}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarUbicacionFavorita(fav.id)}
                          aria-label={`Eliminar ${fav.nombre} de favoritos`}
                          title="Eliminar favorito"
                          className="pr-2.5 pl-1 py-1 opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
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
                <Calendar className="w-5 h-5 opacity-75" aria-hidden="true" />
                <input
                  type="datetime-local"
                  aria-label="Fecha y hora de observación"
                  value={fechaStr}
                  onChange={(e) => manejarCambioFecha(e.target.value)}
                  className={`w-full sm:w-auto min-h-10 px-3 py-1.5 rounded-lg border border-current/25 bg-transparent font-mono text-sm ${claseEsquemaInput}`}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('ahora')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('noche')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 cursor-pointer"
                  >
                    Esta noche 23:30
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempo('mas1h')}
                    className="min-h-10 sm:min-h-8 px-2.5 py-1.5 rounded-lg border border-current/25 hover:bg-current/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" /> +1h
                  </button>
                </div>
                {/* Control de Time-Lapse */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-current/20 bg-current/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setReproduciendo((prev) => !prev)}
                    aria-pressed={reproduciendo}
                    className={`min-h-10 sm:min-h-8 flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
                      tema,
                      reproduciendo
                    )}`}
                  >
                    {reproduciendo ? (
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {reproduciendo ? 'Pausa' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocidadMinPorSeg(15)}
                    aria-pressed={velocidadMinPorSeg === 15}
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
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
                    className={`min-h-10 sm:min-h-8 px-2 py-1 rounded-lg font-mono cursor-pointer transition-colors ${obtenerClaseBotonControlActivo(
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
                      <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {estadoSolar.fase} (Sol {estadoSolar.altitudSol}°)
                  </span>
                )}
              </div>

              {/* Capas del Mapa */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-70 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Capas:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={mostrarConstelaciones}
                    onChange={(e) => setMostrarConstelaciones(e.target.checked)}
                  />
                  <span>Constelaciones</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={mostrarEtiquetasEstrellas}
                    onChange={(e) => setMostrarEtiquetasEstrellas(e.target.checked)}
                  />
                  <span>Estrellas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border border-current/20 hover:bg-current/10 transition-colors">
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
                        <Search
                          className="w-3.5 h-3.5 opacity-60 absolute left-2.5 pointer-events-none"
                          aria-hidden="true"
                        />
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
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
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
                                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
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
````
