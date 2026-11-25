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

export interface LluviaAnual {
  id: string;
  nombre: string;
  mesPico: number; // 1-12
  diaPico: number;
  thz: number;     // Meteoros por hora en condiciones ideales
  radiante: string;
}

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