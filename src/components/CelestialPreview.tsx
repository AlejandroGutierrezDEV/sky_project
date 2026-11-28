import { useId, useState, type ReactNode } from 'react';
import type { TemaVisual } from '../types/astronomy';
import type { CelestialCategory, CelestialVisualSpec } from '../types/celestialDetails';

interface CelestialPreviewProps {
  visual: CelestialVisualSpec;
  category?: CelestialCategory;
  tema: TemaVisual;
  className?: string;
}

const ESTRELLAS_FONDO = [
  { x: 18, y: 24, r: 1.1, o: 0.55 },
  { x: 46, y: 18, r: 0.9, o: 0.45 },
  { x: 84, y: 28, r: 1.2, o: 0.6 },
  { x: 142, y: 19, r: 0.8, o: 0.4 },
  { x: 186, y: 31, r: 1.3, o: 0.65 },
  { x: 214, y: 20, r: 0.9, o: 0.45 },
  { x: 24, y: 88, r: 0.8, o: 0.4 },
  { x: 218, y: 74, r: 1.1, o: 0.5 },
  { x: 31, y: 152, r: 1.2, o: 0.55 },
  { x: 206, y: 158, r: 0.9, o: 0.45 },
  { x: 42, y: 204, r: 1.0, o: 0.5 },
  { x: 192, y: 212, r: 1.3, o: 0.6 },
  { x: 118, y: 222, r: 0.9, o: 0.4 },
  { x: 158, y: 196, r: 0.8, o: 0.35 },
] as const;

const PUNTOS_CUMULO = [
  { x: 120, y: 120, r: 3.1, o: 1 },
  { x: 112, y: 114, r: 2.2, o: 0.92 },
  { x: 130, y: 112, r: 2.0, o: 0.9 },
  { x: 125, y: 131, r: 2.3, o: 0.88 },
  { x: 105, y: 128, r: 1.9, o: 0.85 },
  { x: 138, y: 126, r: 1.8, o: 0.82 },
  { x: 118, y: 98, r: 2.1, o: 0.85 },
  { x: 96, y: 108, r: 1.6, o: 0.72 },
  { x: 145, y: 104, r: 1.7, o: 0.74 },
  { x: 134, y: 144, r: 1.6, o: 0.7 },
  { x: 102, y: 145, r: 1.5, o: 0.68 },
  { x: 86, y: 124, r: 1.4, o: 0.62 },
  { x: 154, y: 122, r: 1.5, o: 0.64 },
  { x: 116, y: 156, r: 1.4, o: 0.58 },
  { x: 128, y: 86, r: 1.4, o: 0.6 },
  { x: 94, y: 92, r: 1.2, o: 0.52 },
  { x: 150, y: 146, r: 1.3, o: 0.52 },
  { x: 78, y: 104, r: 1.1, o: 0.44 },
  { x: 164, y: 106, r: 1.1, o: 0.44 },
  { x: 84, y: 148, r: 1.0, o: 0.4 },
] as const;

function resolverColorTema(color: string, tema: TemaVisual, fallbackRojo: string): string {
  return tema === 'rojo' ? fallbackRojo : color;
}

interface ImagenConFallbackProps {
  imageUrl: string;
  altText: string;
  tema: TemaVisual;
  fallback: ReactNode;
}

function ImagenConFallback({
  imageUrl,
  altText,
  tema,
  fallback,
}: Readonly<ImagenConFallbackProps>) {
  const [estado, setEstado] = useState<'loading' | 'loaded' | 'error'>('loading');

  if (estado === 'error') {
    return <>{fallback}</>;
  }

  const fondoCarga =
    tema === 'rojo' ? 'bg-red-950/30' : tema === 'claro' ? 'bg-slate-200' : 'bg-slate-800/60';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {estado === 'loading' && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse motion-reduce:animate-none ${fondoCarga}`}
        />
      )}
      <img
        src={imageUrl}
        alt={altText}
        onLoad={() => setEstado('loaded')}
        onError={() => setEstado('error')}
        className={`w-full h-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${
          estado === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

/**
 * Renderizador visual ligero en gran formato para la columna izquierda
 * de la Ficha Técnica Desplegable (planetas, constelaciones, galaxias, estrellas e imágenes).
 */
export function CelestialPreview({
  visual,
  category,
  tema,
  className = '',
}: Readonly<CelestialPreviewProps>) {
  const uid = useId();
  const esRojo = tema === 'rojo';
  const esClaro = tema === 'claro';

  const primario = resolverColorTema(visual.primaryColor, tema, '#ef4444');
  const secundario = resolverColorTema(
    visual.secondaryColor ?? visual.primaryColor,
    tema,
    '#7f1d1d'
  );

  // En modo claro, el diagrama de constelación usa estilo carta celeste/blueprint;
  // planetas, galaxias y estrellas se muestran en un visor astronómico oscuro de alto contraste.
  const esCartaClara = esClaro && visual.kind === 'constellation_diagram';

  const claseContenedor = esRojo
    ? 'bg-black border-red-800/80'
    : esCartaClara
      ? 'bg-sky-50 border-slate-300'
      : esClaro
        ? 'bg-slate-900 border-slate-300 shadow-inner'
        : 'bg-slate-950/90 border-cyan-400/20';

  const colorRejilla = esRojo
    ? 'rgba(220, 38, 38, 0.16)'
    : esCartaClara
      ? 'rgba(30, 58, 138, 0.14)'
      : 'rgba(148, 163, 184, 0.12)';

  const colorEstrellaFondo = esRojo
    ? '#dc2626'
    : esCartaClara
      ? '#64748b'
      : '#e2e8f0';

  const renderPlaneta = () => {
    const gradEsfera = `planet-sphere-${uid}`;
    const gradHalo = `planet-halo-${uid}`;
    const gradLimbo = `planet-limb-${uid}`;
    const clipEsfera = `planet-clip-${uid}`;
    const esLuna = category === 'moon';
    const tieneAnillos = Boolean(visual.hasRings);
    const radioPlaneta = tieneAnillos ? 46 : 58;
    const colorAnillo = esRojo ? '#dc2626' : primario;

    return (
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full"
        role="img"
        aria-label={visual.altText}
      >
        <defs>
          <radialGradient id={gradHalo} cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor={primario} stopOpacity={esRojo ? 0.24 : 0.3} />
            <stop offset="100%" stopColor={primario} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gradEsfera} cx="34%" cy="32%" r="72%">
            <stop offset="0%" stopColor={esRojo ? '#f87171' : '#ffffff'} stopOpacity="0.95" />
            <stop offset="28%" stopColor={primario} />
            <stop offset="82%" stopColor={secundario} />
            <stop offset="100%" stopColor={esRojo ? '#1a0000' : '#020617'} />
          </radialGradient>
          <radialGradient id={gradLimbo} cx="62%" cy="62%" r="62%">
            <stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor={esRojo ? 'rgba(0,0,0,0.72)' : 'rgba(2,6,23,0.68)'} />
          </radialGradient>
          <clipPath id={clipEsfera}>
            <circle cx="120" cy="120" r={radioPlaneta} />
          </clipPath>
        </defs>

        {/* Fondo estrellado sutil */}
        {ESTRELLAS_FONDO.map((s, idx) => (
          <circle
            key={idx}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={colorEstrellaFondo}
            opacity={s.o}
          />
        ))}

        {/* Halo atmosférico */}
        <circle cx="120" cy="120" r={radioPlaneta + 38} fill={`url(#${gradHalo})`} />

        {/* Mitad trasera de anillos */}
        {tieneAnillos && (
          <g transform="rotate(-20 120 120)" opacity="0.72">
            <path
              d="M 28 120 A 92 26 0 0 1 212 120"
              fill="none"
              stroke={colorAnillo}
              strokeWidth="12"
              strokeOpacity="0.48"
            />
            <path
              d="M 42 120 A 78 21 0 0 1 198 120"
              fill="none"
              stroke={secundario}
              strokeWidth="4"
              strokeOpacity="0.65"
            />
          </g>
        )}

        {/* Esfera del astro */}
        <circle cx="120" cy="120" r={radioPlaneta} fill={`url(#${gradEsfera})`} />

        {/* Textura superficial estilizada (bandas atmosféricas o cráteres lunares) */}
        <g clipPath={`url(#${clipEsfera})`}>
          {esLuna ? (
            <g fill={esRojo ? '#450a0a' : '#334155'} opacity="0.28">
              <ellipse cx="104" cy="102" rx="18" ry="13" transform="rotate(-14 104 102)" />
              <ellipse cx="136" cy="112" rx="14" ry="19" transform="rotate(10 136 112)" />
              <ellipse cx="114" cy="138" rx="20" ry="11" transform="rotate(6 114 138)" />
              <circle cx="144" cy="142" r="8" />
              <circle cx="94" cy="134" r="7" />
              <circle cx="126" cy="88" r="6" />
            </g>
          ) : (
            <g opacity="0.22">
              <ellipse cx="120" cy="96" rx="68" ry="8" fill={secundario} />
              <ellipse
                cx="120"
                cy="116"
                rx="70"
                ry="10"
                fill={esRojo ? '#ef4444' : '#ffffff'}
                opacity={esRojo ? '0.45' : '0.55'}
              />
              <ellipse cx="120" cy="136" rx="68" ry="9" fill={secundario} />
              <ellipse cx="120" cy="154" rx="60" ry="7" fill={secundario} />
            </g>
          )}
          <circle cx="120" cy="120" r={radioPlaneta} fill={`url(#${gradLimbo})`} />
        </g>

        {/* Mitad delantera de anillos */}
        {tieneAnillos && (
          <g transform="rotate(-20 120 120)">
            <path
              d="M 28 120 A 92 26 0 0 0 212 120"
              fill="none"
              stroke={colorAnillo}
              strokeWidth="12"
              strokeOpacity="0.72"
            />
            {/* División sutil tipo Cassini */}
            <path
              d="M 38 120 A 82 22.5 0 0 0 202 120"
              fill="none"
              stroke={esRojo ? '#000000' : '#020617'}
              strokeWidth="1.6"
              strokeOpacity="0.65"
            />
            <path
              d="M 46 120 A 74 19.5 0 0 0 194 120"
              fill="none"
              stroke={secundario}
              strokeWidth="5"
              strokeOpacity="0.75"
            />
          </g>
        )}
      </svg>
    );
  };

  const renderConstelacion = () => {
    const puntos = visual.diagramPoints ?? [];
    const aristas = visual.diagramEdges ?? [];
    const padding = 24;
    const area = 240 - padding * 2;
    const colorLinea = esRojo
      ? 'rgba(239, 68, 68, 0.72)'
      : esCartaClara
        ? 'rgba(29, 78, 216, 0.75)'
        : 'rgba(56, 189, 248, 0.72)';
    const colorEstrella = esRojo ? '#ef4444' : esCartaClara ? '#0f172a' : '#f8fafc';
    const colorHaloEstrella = esRojo ? '#dc2626' : esCartaClara ? '#1d4ed8' : primario;

    return (
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full"
        role="img"
        aria-label={visual.altText}
      >
        {/* Rejilla de carta celeste */}
        <g stroke={colorRejilla} strokeWidth="0.9">
          <line x1="60" y1="12" x2="60" y2="228" strokeDasharray="3 4" />
          <line x1="120" y1="12" x2="120" y2="228" strokeDasharray="3 4" />
          <line x1="180" y1="12" x2="180" y2="228" strokeDasharray="3 4" />
          <line x1="12" y1="60" x2="228" y2="60" strokeDasharray="3 4" />
          <line x1="12" y1="120" x2="228" y2="120" strokeDasharray="3 4" />
          <line x1="12" y1="180" x2="228" y2="180" strokeDasharray="3 4" />
        </g>

        {/* Estrellas tenues de fondo */}
        {ESTRELLAS_FONDO.map((s, idx) => (
          <circle
            key={idx}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.85}
            fill={colorEstrellaFondo}
            opacity={esCartaClara ? s.o * 0.45 : s.o * 0.55}
          />
        ))}

        {/* Líneas del asterismo */}
        <g stroke={colorLinea} strokeWidth="1.9" strokeLinecap="round">
          {aristas.map(([a, b], idx) => {
            const p1 = puntos[a];
            const p2 = puntos[b];
            if (!p1 || !p2) return null;
            return (
              <line
                key={idx}
                x1={padding + p1.x * area}
                y1={padding + p1.y * area}
                x2={padding + p2.x * area}
                y2={padding + p2.y * area}
              />
            );
          })}
        </g>

        {/* Estrellas integrantes escaladas por magnitud */}
        {puntos.map((p, idx) => {
          const cx = padding + p.x * area;
          const cy = padding + p.y * area;
          const mag = typeof p.magnitude === 'number' && Number.isFinite(p.magnitude) ? p.magnitude : 3.0;
          const radio = Math.max(2.2, Math.min(5.2, 4.6 - mag * 0.55));
          const esBrillante = mag <= 1.6;

          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={radio * 2.5}
                fill={colorHaloEstrella}
                opacity={esBrillante ? 0.24 : 0.14}
              />
              {esBrillante && (
                <g stroke={colorEstrella} strokeWidth="0.9" opacity="0.75">
                  <line x1={cx - radio * 2.2} y1={cy} x2={cx + radio * 2.2} y2={cy} />
                  <line x1={cx} y1={cy - radio * 2.2} x2={cx} y2={cy + radio * 2.2} />
                </g>
              )}
              <circle cx={cx} cy={cy} r={radio} fill={colorEstrella} />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderGalaxia = () => {
    const gradNucleo = `galaxy-core-${uid}`;
    const gradDisco = `galaxy-disk-${uid}`;
    const esNebulosa = category === 'deep_sky';

    return (
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full"
        role="img"
        aria-label={visual.altText}
      >
        <defs>
          <radialGradient id={gradNucleo} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={esRojo ? '#fca5a5' : '#ffffff'} stopOpacity="0.96" />
            <stop offset="32%" stopColor={primario} stopOpacity="0.82" />
            <stop offset="72%" stopColor={secundario} stopOpacity="0.28" />
            <stop offset="100%" stopColor={secundario} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gradDisco} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primario} stopOpacity="0.52" />
            <stop offset="60%" stopColor={secundario} stopOpacity="0.22" />
            <stop offset="100%" stopColor={secundario} stopOpacity="0" />
          </radialGradient>
        </defs>

        {ESTRELLAS_FONDO.map((s, idx) => (
          <circle
            key={idx}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={colorEstrellaFondo}
            opacity={s.o}
          />
        ))}

        {esNebulosa ? (
          <g>
            <ellipse
              cx="112"
              cy="122"
              rx="76"
              ry="52"
              transform="rotate(-18 112 122)"
              fill={`url(#${gradDisco})`}
            />
            <ellipse
              cx="134"
              cy="114"
              rx="64"
              ry="42"
              transform="rotate(24 134 114)"
              fill={`url(#${gradNucleo})`}
              opacity="0.72"
            />
            <path
              d="M 54 138 Q 108 78 184 98"
              fill="none"
              stroke={primario}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M 68 158 Q 126 146 178 112"
              fill="none"
              stroke={secundario}
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.4"
            />
            <circle cx="120" cy="118" r="2.8" fill={esRojo ? '#fca5a5' : '#ffffff'} />
            <circle cx="111" cy="124" r="2.0" fill={esRojo ? '#f87171' : '#e0f2fe'} />
            <circle cx="128" cy="123" r="1.9" fill={esRojo ? '#f87171' : '#e0f2fe'} />
          </g>
        ) : (
          <g transform="rotate(-26 120 120)">
            <ellipse cx="120" cy="120" rx="92" ry="42" fill={`url(#${gradDisco})`} />
            <path
              d="M 120 120 C 148 94, 188 96, 198 118 C 186 144, 134 152, 86 142"
              fill="none"
              stroke={primario}
              strokeWidth="6.5"
              strokeLinecap="round"
              opacity="0.52"
            />
            <path
              d="M 120 120 C 92 146, 52 144, 42 122 C 54 96, 106 88, 154 98"
              fill="none"
              stroke={secundario}
              strokeWidth="6.5"
              strokeLinecap="round"
              opacity="0.48"
            />
            <ellipse cx="120" cy="120" rx="44" ry="26" fill={`url(#${gradNucleo})`} />
            <circle cx="120" cy="120" r="10" fill={esRojo ? '#fca5a5' : '#ffffff'} opacity="0.92" />
          </g>
        )}
      </svg>
    );
  };

  const renderEstrella = () => {
    const gradCorona = `star-corona-${uid}`;
    const esCumulo = category === 'deep_sky';

    return (
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full"
        role="img"
        aria-label={visual.altText}
      >
        <defs>
          <radialGradient id={gradCorona} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={esRojo ? '#fca5a5' : '#ffffff'} stopOpacity="0.98" />
            <stop offset="22%" stopColor={primario} stopOpacity="0.82" />
            <stop offset="58%" stopColor={secundario} stopOpacity="0.25" />
            <stop offset="100%" stopColor={secundario} stopOpacity="0" />
          </radialGradient>
        </defs>

        {ESTRELLAS_FONDO.map((s, idx) => (
          <circle
            key={idx}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={colorEstrellaFondo}
            opacity={s.o}
          />
        ))}

        {esCumulo ? (
          <g>
            <circle cx="120" cy="120" r="64" fill={`url(#${gradCorona})`} opacity="0.6" />
            {PUNTOS_CUMULO.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r={p.r * 2.2} fill={primario} opacity={p.o * 0.22} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={esRojo ? '#ef4444' : idx % 3 === 0 ? '#ffffff' : primario}
                  opacity={p.o}
                />
              </g>
            ))}
          </g>
        ) : (
          <g>
            <circle
              cx="120"
              cy="120"
              r="78"
              fill="none"
              stroke={colorRejilla}
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <circle cx="120" cy="120" r="76" fill={`url(#${gradCorona})`} />

            {/* Picos de difracción ópticos */}
            <g stroke={primario} strokeLinecap="round" opacity="0.82">
              <line x1="42" y1="120" x2="198" y2="120" strokeWidth="1.6" />
              <line x1="120" y1="42" x2="120" y2="198" strokeWidth="1.6" />
              <line x1="76" y1="76" x2="164" y2="164" strokeWidth="0.95" opacity="0.55" />
              <line x1="164" y1="76" x2="76" y2="164" strokeWidth="0.95" opacity="0.55" />
            </g>

            <circle cx="120" cy="120" r="14" fill={esRojo ? '#fca5a5' : '#ffffff'} />
          </g>
        )}
      </svg>
    );
  };

  let contenido: ReactNode;
  if (visual.kind === 'planet_render') {
    contenido = renderPlaneta();
  } else if (visual.kind === 'constellation_diagram') {
    contenido = renderConstelacion();
  } else if (visual.kind === 'galaxy_render') {
    contenido = renderGalaxia();
  } else if (visual.kind === 'image' && visual.imageUrl) {
    contenido = (
      <ImagenConFallback
        key={visual.imageUrl}
        imageUrl={visual.imageUrl}
        altText={visual.altText}
        tema={tema}
        fallback={renderEstrella()}
      />
    );
  } else {
    contenido = renderEstrella();
  }

  return (
    <div
      className={`relative aspect-square w-full max-w-68 mx-auto rounded-2xl border overflow-hidden select-none ${claseContenedor} ${className}`}
    >
      {contenido}
    </div>
  );
}
