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
