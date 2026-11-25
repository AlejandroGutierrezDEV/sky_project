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
