export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarCatalogEntry {
  id: string;
  name: string;
  constellation: string; // Código IAU de 3 letras (ej. "ORI", "UMA")
  raHours: number; // Ascensión recta en horas [0, 24)
  decDeg: number; // Declinación en grados [-90, 90]
  magnitude: number; // Magnitud aparente (menor = más brillante)
  spectralClass: SpectralClass;
}

export interface ConstellationDefinition {
  id: string; // Código IAU (ej. "ORI")
  name: string; // Nombre en español (ej. "Orión")
  segments: ReadonlyArray<readonly [string, string]>; // Pares de IDs de estrellas
}

export interface SegmentoConstelacionProyectado {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  altitudDesde: number;
  altitudHasta: number;
}

export interface ConstelacionCartaProyectada {
  codigo: string;
  nombreEs: string;
  segmentos: ReadonlyArray<SegmentoConstelacionProyectado>;
  etiquetaX: number;
  etiquetaY: number;
  mostrarEtiqueta: boolean;
}

export interface HorizontalCoordinates {
  altitudeDeg: number; // [-90, 90]
  azimuthDeg: number; // [0, 360) desde el Norte hacia el Este
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface ProjectedStar {
  star: StarCatalogEntry;
  horizontal: HorizontalCoordinates;
  x: number; // Coordenada X en píxeles CSS del canvas
  y: number; // Coordenada Y en píxeles CSS del canvas
  radius: number; // Radio visual derivado de la magnitud
  visible: boolean; // altitudeDeg >= 0 y dentro del límite de magnitud
}

export interface StarChartLayers {
  showConstellations: boolean;
  showStarLabels: boolean;
  showConstellationLabels: boolean;
  showAltAzGrid: boolean;
  maxMagnitude: number; // Filtro de brillo (ej. 1.5 a 5.0)
}

export interface StarChartObserver {
  latitude: number; // [-90, 90]
  longitude: number; // [-180, 180]
  date: Date;
}
