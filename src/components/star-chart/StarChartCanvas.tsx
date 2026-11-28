import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { TemaVisual } from '../../types/astronomy';
import type {
  ConstellationDefinition,
  ProjectedStar,
  StarChartLayers,
} from '../../types/starChart';
import { DEFAULT_CANVAS_PADDING } from '../../hooks/useStarChart';
import {
  clamp,
  findNearestStar,
  getSpectralColor,
} from '../../utils/skyProjection';

export interface StarChartCanvasProps {
  projectedStars: ReadonlyArray<ProjectedStar>;
  constellations: ReadonlyArray<ConstellationDefinition>;
  layers: StarChartLayers;
  selectedStar: ProjectedStar | null;
  hoveredStar: ProjectedStar | null;
  date: Date;
  locationName: string;
  visibleCount: number;
  tema: TemaVisual;
  padding?: number;
  onSizeChange?: (size: number) => void;
  onSelectStar: (star: ProjectedStar | null) => void;
  onHoverStar: (star: ProjectedStar | null) => void;
}

interface CanvasThemeColors {
  skyZenith: string;
  skyMid: string;
  skyHorizon: string;
  horizonStroke: string;
  horizonTicks: string;
  gridLine: string;
  gridLabel: string;
  constellationLine: string;
  constellationLabel: string;
  starLabel: string;
  starLabelHalo: string;
  cardinalText: string;
  northAccent: string;
  selectionRing: string;
  hoverRing: string;
  redMode: boolean;
}

const CANVAS_THEMES: Readonly<Record<TemaVisual, CanvasThemeColors>> = {
  oscuro: {
    skyZenith: '#0c1c3d',
    skyMid: '#071128',
    skyHorizon: '#020617',
    horizonStroke: 'rgba(148, 163, 184, 0.72)',
    horizonTicks: 'rgba(148, 163, 184, 0.45)',
    gridLine: 'rgba(148, 163, 184, 0.22)',
    gridLabel: 'rgba(148, 163, 184, 0.75)',
    constellationLine: 'rgba(56, 189, 248, 0.42)',
    constellationLabel: 'rgba(125, 211, 252, 0.72)',
    starLabel: 'rgba(241, 245, 249, 0.9)',
    starLabelHalo: 'rgba(2, 6, 23, 0.85)',
    cardinalText: '#cbd5e1',
    northAccent: '#38bdf8',
    selectionRing: '#22d3ee',
    hoverRing: 'rgba(226, 232, 240, 0.75)',
    redMode: false,
  },
  claro: {
    skyZenith: '#14294d',
    skyMid: '#0e1d38',
    skyHorizon: '#091326',
    horizonStroke: '#0f172a',
    horizonTicks: 'rgba(15, 23, 42, 0.55)',
    gridLine: 'rgba(186, 230, 253, 0.24)',
    gridLabel: 'rgba(224, 242, 254, 0.8)',
    constellationLine: 'rgba(125, 211, 252, 0.48)',
    constellationLabel: 'rgba(186, 230, 253, 0.84)',
    starLabel: 'rgba(248, 250, 252, 0.95)',
    starLabelHalo: 'rgba(9, 19, 38, 0.88)',
    cardinalText: '#0f172a',
    northAccent: '#0369a1',
    selectionRing: '#38bdf8',
    hoverRing: 'rgba(248, 250, 252, 0.82)',
    redMode: false,
  },
  rojo: {
    skyZenith: '#1a0202',
    skyMid: '#0d0000',
    skyHorizon: '#000000',
    horizonStroke: '#dc2626',
    horizonTicks: 'rgba(220, 38, 38, 0.55)',
    gridLine: 'rgba(220, 38, 38, 0.26)',
    gridLabel: 'rgba(239, 68, 68, 0.75)',
    constellationLine: 'rgba(239, 68, 68, 0.4)',
    constellationLabel: 'rgba(239, 68, 68, 0.72)',
    starLabel: '#f87171',
    starLabelHalo: 'rgba(0, 0, 0, 0.92)',
    cardinalText: '#ef4444',
    northAccent: '#ff3b3b',
    selectionRing: '#ff2a2a',
    hoverRing: 'rgba(248, 113, 113, 0.78)',
    redMode: true,
  },
};

const DEG_TO_RAD = Math.PI / 180;
const STAR_HIT_RADIUS_PX = 18;

function formatTimeForAria(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'hora desconocida';
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRedFilterStarColor(magnitude: number): string {
  if (magnitude < 0.8) return '#ff6b6b';
  if (magnitude < 2.2) return '#ef4444';
  return '#dc2626';
}

export function StarChartCanvas({
  projectedStars,
  constellations,
  layers,
  selectedStar,
  hoveredStar,
  date,
  locationName,
  visibleCount,
  tema,
  padding = DEFAULT_CANVAS_PADDING,
  onSizeChange,
  onSelectStar,
  onHoverStar,
}: StarChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastHoveredIdRef = useRef<string | null>(null);
  const [measuredSize, setMeasuredSize] = useState<number>(0);

  // Observa el contenedor para mantener el círculo nítido y proporcional al redimensionar
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = (width: number) => {
      const nextSize = Math.max(240, Math.floor(width));
      setMeasuredSize((prev) => (prev === nextSize ? prev : nextSize));
      onSizeChange?.(nextSize);
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.contentRect.width > 0) {
          updateSize(entry.contentRect.width);
        }
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    const handleResize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0) {
        updateSize(rect.width);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onSizeChange]);

  const starById = useMemo(() => {
    const map = new Map<string, ProjectedStar>();
    for (const item of projectedStars) {
      map.set(item.star.id, item);
    }
    return map;
  }, [projectedStars]);

  const palette = CANVAS_THEMES[tema];

  // Renderizado HiDPI en <canvas>
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || measuredSize <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr =
      typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    const targetWidth = Math.round(measuredSize * dpr);
    const targetHeight = Math.round(measuredSize * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, measuredSize, measuredSize);

    const safePadding = clamp(padding, 16, measuredSize * 0.25);
    const center = measuredSize / 2;
    const diskRadius = Math.max(10, center - safePadding);

    // 1. Fondo nocturno con degradado radial sutil
    const skyGradient = ctx.createRadialGradient(
      center,
      center,
      diskRadius * 0.05,
      center,
      center,
      diskRadius
    );
    skyGradient.addColorStop(0, palette.skyZenith);
    skyGradient.addColorStop(0.65, palette.skyMid);
    skyGradient.addColorStop(1, palette.skyHorizon);

    ctx.beginPath();
    ctx.arc(center, center, diskRadius, 0, Math.PI * 2);
    ctx.fillStyle = skyGradient;
    ctx.fill();

    // 2. Clipping estricto al círculo del horizonte antes de dibujar cuadrícula, constelaciones y estrellas
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, diskRadius, 0, Math.PI * 2);
    ctx.clip();

    // 3. Cuadrícula altazimutal opcional (círculos de 30° y 60° en proyección estereográfica + ejes)
    if (layers.showAltAzGrid) {
      ctx.strokeStyle = palette.gridLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const altitudes = [30, 60] as const;
      for (const alt of altitudes) {
        const ringRadius = diskRadius * Math.tan(((90 - alt) / 2) * DEG_TO_RAD);
        ctx.beginPath();
        ctx.arc(center, center, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.setLineDash([]);
        ctx.font = '500 10px "JetBrains Mono Variable", ui-monospace, monospace';
        ctx.fillStyle = palette.gridLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${alt}°`, center, center - ringRadius - 3);
        ctx.restore();
      }

      // Ejes N-S y E-O + diagonales intercardinales tenues
      ctx.beginPath();
      ctx.moveTo(center, center - diskRadius);
      ctx.lineTo(center, center + diskRadius);
      ctx.moveTo(center - diskRadius, center);
      ctx.lineTo(center + diskRadius, center);
      ctx.stroke();

      ctx.setLineDash([]);

      // Marca sutil del cenit (90°)
      ctx.strokeStyle = palette.gridLabel;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center - 5, center);
      ctx.lineTo(center + 5, center);
      ctx.moveTo(center, center - 5);
      ctx.lineTo(center, center + 5);
      ctx.stroke();
    }

    // 4. Líneas de constelaciones (clipeadas al horizonte)
    if (layers.showConstellations) {
      ctx.strokeStyle = palette.constellationLine;
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (const constellation of constellations) {
        for (const [fromId, toId] of constellation.segments) {
          const fromStar = starById.get(fromId);
          const toStar = starById.get(toId);
          if (!fromStar || !toStar) continue;
          // Omitimos segmentos completamente bajo el horizonte
          if (fromStar.horizontal.altitudeDeg < 0 && toStar.horizontal.altitudeDeg < 0) {
            continue;
          }
          ctx.moveTo(fromStar.x, fromStar.y);
          ctx.lineTo(toStar.x, toStar.y);
        }
      }
      ctx.stroke();
    }

    // 5. Nombres de constelaciones opcionales
    if (layers.showConstellationLabels) {
      ctx.font = '600 10px "Space Grotesk Variable", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = palette.constellationLabel;

      for (const constellation of constellations) {
        const uniqueIds = new Set<string>();
        for (const [a, b] of constellation.segments) {
          uniqueIds.add(a);
          uniqueIds.add(b);
        }

        let sumX = 0;
        let sumY = 0;
        let aboveCount = 0;

        for (const id of uniqueIds) {
          const item = starById.get(id);
          if (item && item.horizontal.altitudeDeg >= 0) {
            sumX += item.x;
            sumY += item.y;
            aboveCount += 1;
          }
        }

        if (aboveCount >= 2) {
          const cx = sumX / aboveCount;
          const cy = sumY / aboveCount;
          ctx.fillText(constellation.name.toUpperCase(), cx, cy);
        }
      }
    }

    // 6. Estrellas visibles (altitudeDeg >= 0 y magnitude <= maxMagnitude)
    for (const item of projectedStars) {
      if (!item.visible) continue;

      const starColor = palette.redMode
        ? getRedFilterStarColor(item.star.magnitude)
        : getSpectralColor(item.star.spectralClass);

      // Brillo (glow) suave para estrellas brillantes (magnitud < 1.5)
      if (item.star.magnitude < 1.5) {
        const glowRadius = item.radius * 3.4;
        const glow = ctx.createRadialGradient(
          item.x,
          item.y,
          item.radius * 0.2,
          item.x,
          item.y,
          glowRadius
        );
        glow.addColorStop(0, starColor);
        glow.addColorStop(0.35, palette.redMode ? 'rgba(239, 68, 68, 0.32)' : `${starColor}55`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(item.x, item.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Disco central de la estrella
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();

      // Etiquetas de estrellas destacadas o seleccionadas
      const isSelected = selectedStar?.star.id === item.star.id;
      const isHovered = hoveredStar?.star.id === item.star.id;
      const shouldShowLabel =
        isSelected ||
        isHovered ||
        (layers.showStarLabels &&
          (item.star.magnitude <= 2.15 || item.star.id === 'polaris'));

      if (shouldShowLabel) {
        const labelX = item.x + item.radius + 5;
        const labelY = item.y - 2;
        ctx.font = isSelected || isHovered
          ? '600 11px "Inter Variable", system-ui, sans-serif'
          : '500 10px "Inter Variable", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = palette.starLabelHalo;
        ctx.strokeText(item.star.name, labelX, labelY);
        ctx.fillStyle = palette.starLabel;
        ctx.fillText(item.star.name, labelX, labelY);
      }
    }

    // 7. Halo de hover
    if (
      hoveredStar &&
      hoveredStar.visible &&
      hoveredStar.star.id !== selectedStar?.star.id
    ) {
      ctx.save();
      ctx.strokeStyle = palette.hoverRing;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(hoveredStar.x, hoveredStar.y, hoveredStar.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 8. Retícula de selección activa
    if (selectedStar && selectedStar.visible) {
      const ringRadius = selectedStar.radius + 9;
      ctx.save();
      ctx.strokeStyle = palette.selectionRing;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(selectedStar.x, selectedStar.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Pequeñas marcas de mira cardinales
      const tickInner = ringRadius + 2;
      const tickOuter = ringRadius + 6;
      ctx.beginPath();
      ctx.moveTo(selectedStar.x, selectedStar.y - tickInner);
      ctx.lineTo(selectedStar.x, selectedStar.y - tickOuter);
      ctx.moveTo(selectedStar.x, selectedStar.y + tickInner);
      ctx.lineTo(selectedStar.x, selectedStar.y + tickOuter);
      ctx.moveTo(selectedStar.x - tickInner, selectedStar.y);
      ctx.lineTo(selectedStar.x - tickOuter, selectedStar.y);
      ctx.moveTo(selectedStar.x + tickInner, selectedStar.y);
      ctx.lineTo(selectedStar.x + tickOuter, selectedStar.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // Fin del clipping circular del horizonte

    // 9. Anillo exterior del horizonte y marcas de azimut
    ctx.strokeStyle = palette.horizonStroke;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(center, center, diskRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = palette.horizonTicks;
    for (let az = 0; az < 360; az += 15) {
      const isMajor = az % 90 === 0;
      const isMid = az % 45 === 0 && !isMajor;
      const tickLen = isMajor ? 7 : isMid ? 5 : 3;
      const azRad = az * DEG_TO_RAD;
      const dx = -Math.sin(azRad);
      const dy = -Math.cos(azRad);
      ctx.lineWidth = isMajor ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(center + dx * diskRadius, center + dy * diskRadius);
      ctx.lineTo(
        center + dx * (diskRadius + tickLen),
        center + dy * (diskRadius + tickLen)
      );
      ctx.stroke();
    }

    // 10. Puntos cardinales: Norte arriba, Este izquierda, Sur abajo, Oeste derecha
    const cardinalOffset = diskRadius + Math.min(20, safePadding * 0.56);
    const cardinals: ReadonlyArray<{
      label: string;
      azDeg: number;
      major: boolean;
    }> = [
      { label: 'N', azDeg: 0, major: true },
      { label: 'NE', azDeg: 45, major: false },
      { label: 'E', azDeg: 90, major: true },
      { label: 'SE', azDeg: 135, major: false },
      { label: 'S', azDeg: 180, major: true },
      { label: 'SO', azDeg: 225, major: false },
      { label: 'O', azDeg: 270, major: true },
      { label: 'NO', azDeg: 315, major: false },
    ];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const point of cardinals) {
      const azRad = point.azDeg * DEG_TO_RAD;
      const tx = center - Math.sin(azRad) * cardinalOffset;
      const ty = center - Math.cos(azRad) * cardinalOffset;

      ctx.font = point.major
        ? '700 13px "Space Grotesk Variable", system-ui, sans-serif'
        : '500 10px "JetBrains Mono Variable", ui-monospace, monospace';
      ctx.fillStyle =
        point.label === 'N'
          ? palette.northAccent
          : point.major
            ? palette.cardinalText
            : palette.horizonTicks;
      ctx.fillText(point.label, tx, ty);
    }
  }, [
    measuredSize,
    padding,
    palette,
    layers,
    constellations,
    starById,
    projectedStars,
    selectedStar,
    hoveredStar,
  ]);

  const getCanvasPoint = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'touch') return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    const nearest = findNearestStar(
      point.x,
      point.y,
      projectedStars,
      STAR_HIT_RADIUS_PX
    );
    const nextId = nearest ? nearest.star.id : null;
    if (nextId !== lastHoveredIdRef.current) {
      lastHoveredIdRef.current = nextId;
      onHoverStar(nearest);
    }
  };

  const handlePointerLeave = () => {
    if (lastHoveredIdRef.current !== null) {
      lastHoveredIdRef.current = null;
      onHoverStar(null);
    }
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const nearest = findNearestStar(
      point.x,
      point.y,
      projectedStars,
      STAR_HIT_RADIUS_PX
    );
    onSelectStar(nearest);
  };

  const ariaLabel = `Carta astronómica para ${locationName} a las ${formatTimeForAria(
    date
  )}. ${visibleCount} estrellas visibles sobre el horizonte con magnitud hasta ${layers.maxMagnitude.toFixed(
    1
  )}. Orientación celeste con Norte arriba, Este a la izquierda y Oeste a la derecha.`;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square max-w-[640px] mx-auto select-none"
    >
      {measuredSize === 0 ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Preparando carta astronómica"
          className="absolute inset-4 rounded-full border border-current/20 bg-current/5 flex items-center justify-center motion-safe:animate-pulse"
        >
          <span className="text-xs font-mono opacity-70">
            Calculando bóveda celeste...
          </span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          style={{ width: measuredSize, height: measuredSize }}
          className={`block touch-manipulation ${
            hoveredStar ? 'cursor-pointer' : 'cursor-crosshair'
          }`}
        />
      )}
    </div>
  );
}
