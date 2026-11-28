export type CelestialCategory =
  | 'planet'
  | 'constellation'
  | 'galaxy'
  | 'star'
  | 'moon'
  | 'sun'
  | 'deep_sky';

export interface CelestialMetric {
  label: string;
  value: string;
  unit?: string;
}

export interface CelestialVisualSpec {
  /** Tipo de representación en grande dentro de la ficha */
  kind: 'planet_render' | 'constellation_diagram' | 'galaxy_render' | 'star_render' | 'image';
  primaryColor: string;
  secondaryColor?: string;
  hasRings?: boolean;
  /** Coordenadas normalizadas [0..1] para dibujar constelaciones en grande */
  diagramPoints?: ReadonlyArray<{ x: number; y: number; magnitude?: number }>;
  diagramEdges?: ReadonlyArray<readonly [number, number]>;
  imageUrl?: string;
  altText: string;
}

export interface CelestialTechnicalSheet {
  id: string;
  name: string;
  category: CelestialCategory;
  subtitle: string;
  description: string;
  metrics: ReadonlyArray<CelestialMetric>;
  observationTips: ReadonlyArray<string>;
  visual: CelestialVisualSpec;
}

export interface LiveEphemerisSnapshot {
  azimuthDeg: number;
  altitudeDeg: number;
  isAboveHorizon: boolean;
  magnitude?: number;
  /** Índice de color B−V de catálogo para estrellas */
  indiceColorBV?: number;
}

export type SheetLoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface UseCelestialFocusResult {
  selectedBodyId: string | null;
  isFocusActive: boolean;
  isSheetOpen: boolean;
  sheetStatus: SheetLoadStatus;
  sheetData: CelestialTechnicalSheet | null;
  errorMessage: string | null;
  selectBody: (bodyId: string) => void;
  toggleSheet: (open?: boolean) => void;
  clearFocus: () => void;
}

/** Type guard para validar cualquier ID procedente de inputs, URLs o eventos */
export function isValidCelestialId(
  value: unknown,
  validIds: ReadonlySet<string>
): value is string {
  return typeof value === 'string' && value.trim().length > 0 && validIds.has(value);
}
