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