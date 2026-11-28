import type { ConstellationDefinition, StarCatalogEntry } from '../types/starChart';

/** Ubicación por defecto segura para el modo aislado de la Carta Astronómica (Madrid). */
export const DEFAULT_STAR_CHART_LOCATION = {
  name: 'Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
} as const;

/**
 * Catálogo compacto J2000 con las estrellas más brillantes de ambos hemisferios
 * y las estrellas de soporte necesarias para trazar 15 constelaciones principales.
 */
export const STAR_CATALOG: ReadonlyArray<StarCatalogEntry> = [
  // ── Orión (ORI) ────────────────────────────────────────────────────────────
  { id: 'betelgeuse', name: 'Betelgeuse', constellation: 'ORI', raHours: 5.9195, decDeg: 7.4071, magnitude: 0.42, spectralClass: 'M' },
  { id: 'rigel', name: 'Rigel', constellation: 'ORI', raHours: 5.2423, decDeg: -8.2016, magnitude: 0.13, spectralClass: 'B' },
  { id: 'bellatrix', name: 'Bellatrix', constellation: 'ORI', raHours: 5.4189, decDeg: 6.3497, magnitude: 1.64, spectralClass: 'B' },
  { id: 'mintaka', name: 'Mintaka', constellation: 'ORI', raHours: 5.5334, decDeg: -0.2991, magnitude: 2.23, spectralClass: 'O' },
  { id: 'alnilam', name: 'Alnilam', constellation: 'ORI', raHours: 5.6036, decDeg: -1.2019, magnitude: 1.69, spectralClass: 'B' },
  { id: 'alnitak', name: 'Alnitak', constellation: 'ORI', raHours: 5.6793, decDeg: -1.9426, magnitude: 1.77, spectralClass: 'O' },
  { id: 'saiph', name: 'Saiph', constellation: 'ORI', raHours: 5.7959, decDeg: -9.6696, magnitude: 2.09, spectralClass: 'B' },

  // ── Osa Mayor (UMA) ────────────────────────────────────────────────────────
  { id: 'dubhe', name: 'Dubhe', constellation: 'UMA', raHours: 11.0621, decDeg: 61.7510, magnitude: 1.79, spectralClass: 'K' },
  { id: 'merak', name: 'Merak', constellation: 'UMA', raHours: 11.0307, decDeg: 56.3824, magnitude: 2.37, spectralClass: 'A' },
  { id: 'phecda', name: 'Phecda', constellation: 'UMA', raHours: 11.8972, decDeg: 53.6948, magnitude: 2.44, spectralClass: 'A' },
  { id: 'megrez', name: 'Megrez', constellation: 'UMA', raHours: 12.2570, decDeg: 57.0326, magnitude: 3.31, spectralClass: 'A' },
  { id: 'alioth', name: 'Alioth', constellation: 'UMA', raHours: 12.9005, decDeg: 55.9598, magnitude: 1.77, spectralClass: 'A' },
  { id: 'mizar', name: 'Mizar', constellation: 'UMA', raHours: 13.3988, decDeg: 54.9254, magnitude: 2.27, spectralClass: 'A' },
  { id: 'alkaid', name: 'Alkaid', constellation: 'UMA', raHours: 13.7923, decDeg: 49.3133, magnitude: 1.86, spectralClass: 'B' },

  // ── Osa Menor (UMI) ────────────────────────────────────────────────────────
  { id: 'polaris', name: 'Polaris', constellation: 'UMI', raHours: 2.5303, decDeg: 89.2641, magnitude: 1.98, spectralClass: 'F' },
  { id: 'kochab', name: 'Kochab', constellation: 'UMI', raHours: 14.8451, decDeg: 74.1555, magnitude: 2.08, spectralClass: 'K' },
  { id: 'pherkad', name: 'Pherkad', constellation: 'UMI', raHours: 15.3455, decDeg: 71.8340, magnitude: 3.05, spectralClass: 'A' },
  { id: 'yildun', name: 'Yildun', constellation: 'UMI', raHours: 17.5369, decDeg: 86.5863, magnitude: 4.35, spectralClass: 'A' },
  { id: 'eps_umi', name: 'Épsilon UMi', constellation: 'UMI', raHours: 16.7662, decDeg: 82.0373, magnitude: 4.21, spectralClass: 'G' },
  { id: 'alifa', name: 'Alifa al Farkadain', constellation: 'UMI', raHours: 15.7344, decDeg: 77.7945, magnitude: 4.32, spectralClass: 'A' },
  { id: 'anwar', name: 'Anwar al Farkadain', constellation: 'UMI', raHours: 16.2918, decDeg: 75.7553, magnitude: 4.95, spectralClass: 'F' },

  // ── Casiopea (CAS) ─────────────────────────────────────────────────────────
  { id: 'caph', name: 'Caph', constellation: 'CAS', raHours: 0.1529, decDeg: 59.1498, magnitude: 2.27, spectralClass: 'F' },
  { id: 'schedar', name: 'Schedar', constellation: 'CAS', raHours: 0.6751, decDeg: 56.5373, magnitude: 2.24, spectralClass: 'K' },
  { id: 'gamma_cas', name: 'Gamma Cas', constellation: 'CAS', raHours: 0.9451, decDeg: 60.7167, magnitude: 2.47, spectralClass: 'B' },
  { id: 'ruchbah', name: 'Ruchbah', constellation: 'CAS', raHours: 1.4303, decDeg: 60.2353, magnitude: 2.68, spectralClass: 'A' },
  { id: 'segin', name: 'Segin', constellation: 'CAS', raHours: 1.9066, decDeg: 63.6701, magnitude: 3.38, spectralClass: 'B' },

  // ── Leo (LEO) ──────────────────────────────────────────────────────────────
  { id: 'regulus', name: 'Régulo', constellation: 'LEO', raHours: 10.1395, decDeg: 11.9672, magnitude: 1.35, spectralClass: 'B' },
  { id: 'algieba', name: 'Algieba', constellation: 'LEO', raHours: 10.3329, decDeg: 19.8415, magnitude: 2.08, spectralClass: 'K' },
  { id: 'adhafera', name: 'Adhafera', constellation: 'LEO', raHours: 10.2782, decDeg: 23.4173, magnitude: 3.44, spectralClass: 'F' },
  { id: 'rasalas', name: 'Rasalas', constellation: 'LEO', raHours: 9.8794, decDeg: 26.0070, magnitude: 3.88, spectralClass: 'K' },
  { id: 'algenubi', name: 'Algenubi', constellation: 'LEO', raHours: 9.7642, decDeg: 23.7743, magnitude: 2.98, spectralClass: 'G' },
  { id: 'zosma', name: 'Zosma', constellation: 'LEO', raHours: 11.2351, decDeg: 20.5237, magnitude: 2.56, spectralClass: 'A' },
  { id: 'chertan', name: 'Chertan', constellation: 'LEO', raHours: 11.2373, decDeg: 15.4296, magnitude: 3.34, spectralClass: 'A' },
  { id: 'denebola', name: 'Denébola', constellation: 'LEO', raHours: 11.8177, decDeg: 14.5721, magnitude: 2.14, spectralClass: 'A' },

  // ── Escorpio (SCO) ─────────────────────────────────────────────────────────
  { id: 'antares', name: 'Antares', constellation: 'SCO', raHours: 16.4901, decDeg: -26.4320, magnitude: 0.96, spectralClass: 'M' },
  { id: 'acrab', name: 'Acrab', constellation: 'SCO', raHours: 16.0906, decDeg: -19.8055, magnitude: 2.62, spectralClass: 'B' },
  { id: 'dschubba', name: 'Dschubba', constellation: 'SCO', raHours: 16.0056, decDeg: -22.6217, magnitude: 2.32, spectralClass: 'B' },
  { id: 'larawag', name: 'Larawag', constellation: 'SCO', raHours: 16.8361, decDeg: -34.2932, magnitude: 2.29, spectralClass: 'K' },
  { id: 'sargas', name: 'Sargas', constellation: 'SCO', raHours: 17.6220, decDeg: -42.9978, magnitude: 1.87, spectralClass: 'F' },
  { id: 'girtab', name: 'Girtab', constellation: 'SCO', raHours: 17.7082, decDeg: -39.0300, magnitude: 2.41, spectralClass: 'B' },
  { id: 'shaula', name: 'Shaula', constellation: 'SCO', raHours: 17.5601, decDeg: -37.1038, magnitude: 1.63, spectralClass: 'B' },

  // ── Cisne (CYG) ────────────────────────────────────────────────────────────
  { id: 'deneb', name: 'Deneb', constellation: 'CYG', raHours: 20.6905, decDeg: 45.2803, magnitude: 1.25, spectralClass: 'A' },
  { id: 'sadr', name: 'Sadr', constellation: 'CYG', raHours: 20.3705, decDeg: 40.2567, magnitude: 2.20, spectralClass: 'F' },
  { id: 'gienah_cyg', name: 'Aljanah', constellation: 'CYG', raHours: 20.7702, decDeg: 33.9703, magnitude: 2.46, spectralClass: 'K' },
  { id: 'fawaris', name: 'Fawaris', constellation: 'CYG', raHours: 19.7496, decDeg: 45.1308, magnitude: 2.87, spectralClass: 'B' },
  { id: 'albireo', name: 'Albireo', constellation: 'CYG', raHours: 19.5120, decDeg: 27.9597, magnitude: 3.08, spectralClass: 'K' },

  // ── Cruz del Sur (CRU) ─────────────────────────────────────────────────────
  { id: 'acrux', name: 'Acrux', constellation: 'CRU', raHours: 12.4433, decDeg: -63.0991, magnitude: 0.76, spectralClass: 'B' },
  { id: 'mimosa', name: 'Mimosa', constellation: 'CRU', raHours: 12.7953, decDeg: -59.6888, magnitude: 1.25, spectralClass: 'B' },
  { id: 'gacrux', name: 'Gacrux', constellation: 'CRU', raHours: 12.5194, decDeg: -57.1132, magnitude: 1.63, spectralClass: 'M' },
  { id: 'imai', name: 'Imai', constellation: 'CRU', raHours: 12.2524, decDeg: -58.7489, magnitude: 2.80, spectralClass: 'B' },

  // ── Can Mayor (CMA) ────────────────────────────────────────────────────────
  { id: 'sirius', name: 'Sirio', constellation: 'CMA', raHours: 6.7525, decDeg: -16.7161, magnitude: -1.46, spectralClass: 'A' },
  { id: 'adhara', name: 'Adhara', constellation: 'CMA', raHours: 6.9771, decDeg: -28.9721, magnitude: 1.50, spectralClass: 'B' },
  { id: 'wezen', name: 'Wezen', constellation: 'CMA', raHours: 7.1399, decDeg: -26.3932, magnitude: 1.84, spectralClass: 'F' },
  { id: 'mirzam', name: 'Mirzam', constellation: 'CMA', raHours: 6.3783, decDeg: -17.9559, magnitude: 1.98, spectralClass: 'B' },
  { id: 'aludra', name: 'Aludra', constellation: 'CMA', raHours: 7.4016, decDeg: -29.3031, magnitude: 2.45, spectralClass: 'B' },

  // ── Géminis (GEM) ──────────────────────────────────────────────────────────
  { id: 'pollux', name: 'Pólux', constellation: 'GEM', raHours: 7.7553, decDeg: 28.0262, magnitude: 1.14, spectralClass: 'K' },
  { id: 'castor', name: 'Cástor', constellation: 'GEM', raHours: 7.5767, decDeg: 31.8883, magnitude: 1.58, spectralClass: 'A' },
  { id: 'alhena', name: 'Alhena', constellation: 'GEM', raHours: 6.6285, decDeg: 16.3993, magnitude: 1.93, spectralClass: 'A' },
  { id: 'wasat', name: 'Wasat', constellation: 'GEM', raHours: 7.3355, decDeg: 21.9823, magnitude: 3.53, spectralClass: 'F' },
  { id: 'tejat', name: 'Tejat', constellation: 'GEM', raHours: 6.3827, decDeg: 22.5136, magnitude: 2.88, spectralClass: 'M' },

  // ── Tauro (TAU) ────────────────────────────────────────────────────────────
  { id: 'aldebaran', name: 'Aldebarán', constellation: 'TAU', raHours: 4.5987, decDeg: 16.5093, magnitude: 0.85, spectralClass: 'K' },
  { id: 'elnath', name: 'Elnath', constellation: 'TAU', raHours: 5.4382, decDeg: 28.6075, magnitude: 1.65, spectralClass: 'B' },
  { id: 'alcyone', name: 'Alcíone', constellation: 'TAU', raHours: 3.7914, decDeg: 24.1051, magnitude: 2.87, spectralClass: 'B' },
  { id: 'tianguan', name: 'Tianguan', constellation: 'TAU', raHours: 5.6274, decDeg: 21.1425, magnitude: 3.00, spectralClass: 'B' },
  { id: 'ain', name: 'Ain', constellation: 'TAU', raHours: 4.4769, decDeg: 19.1804, magnitude: 3.53, spectralClass: 'K' },
  { id: 'hyadum1', name: 'Prima Hyadum', constellation: 'TAU', raHours: 4.3299, decDeg: 15.6276, magnitude: 3.65, spectralClass: 'K' },

  // ── Lira (LYR) ─────────────────────────────────────────────────────────────
  { id: 'vega', name: 'Vega', constellation: 'LYR', raHours: 18.6156, decDeg: 38.7837, magnitude: 0.03, spectralClass: 'A' },
  { id: 'sheliak', name: 'Sheliak', constellation: 'LYR', raHours: 18.8347, decDeg: 33.3627, magnitude: 3.45, spectralClass: 'B' },
  { id: 'sulafat', name: 'Sulafat', constellation: 'LYR', raHours: 18.9824, decDeg: 32.6896, magnitude: 3.24, spectralClass: 'B' },
  { id: 'zeta_lyr', name: 'Zeta Lyr', constellation: 'LYR', raHours: 18.7462, decDeg: 37.6051, magnitude: 4.36, spectralClass: 'A' },
  { id: 'delta_lyr', name: 'Delta Lyr', constellation: 'LYR', raHours: 18.9085, decDeg: 36.8986, magnitude: 4.30, spectralClass: 'M' },

  // ── Águila (AQL) ───────────────────────────────────────────────────────────
  { id: 'altair', name: 'Altair', constellation: 'AQL', raHours: 19.8464, decDeg: 8.8683, magnitude: 0.77, spectralClass: 'A' },
  { id: 'tarazed', name: 'Tarazed', constellation: 'AQL', raHours: 19.7710, decDeg: 10.6133, magnitude: 2.72, spectralClass: 'K' },
  { id: 'alshain', name: 'Alshain', constellation: 'AQL', raHours: 19.9219, decDeg: 6.4068, magnitude: 3.71, spectralClass: 'G' },
  { id: 'okab', name: 'Okab', constellation: 'AQL', raHours: 19.0902, decDeg: 13.8635, magnitude: 2.99, spectralClass: 'A' },
  { id: 'theta_aql', name: 'Theta Aql', constellation: 'AQL', raHours: 20.1884, decDeg: -0.8215, magnitude: 3.23, spectralClass: 'B' },

  // ── Pegaso (PEG) y Alpheratz (AND) ─────────────────────────────────────────
  { id: 'markab', name: 'Markab', constellation: 'PEG', raHours: 23.0793, decDeg: 15.2053, magnitude: 2.49, spectralClass: 'B' },
  { id: 'scheat', name: 'Scheat', constellation: 'PEG', raHours: 23.0629, decDeg: 28.0828, magnitude: 2.42, spectralClass: 'M' },
  { id: 'algenib', name: 'Algenib', constellation: 'PEG', raHours: 0.2206, decDeg: 15.1836, magnitude: 2.83, spectralClass: 'B' },
  { id: 'enif', name: 'Enif', constellation: 'PEG', raHours: 21.7364, decDeg: 9.8750, magnitude: 2.39, spectralClass: 'K' },
  { id: 'alpheratz', name: 'Alpheratz', constellation: 'AND', raHours: 0.1398, decDeg: 29.0904, magnitude: 2.06, spectralClass: 'B' },

  // ── Centauro (CEN) ─────────────────────────────────────────────────────────
  { id: 'alfa_cen', name: 'Alfa Centauri', constellation: 'CEN', raHours: 14.6601, decDeg: -60.8340, magnitude: -0.01, spectralClass: 'G' },
  { id: 'hadar', name: 'Hadar', constellation: 'CEN', raHours: 14.0637, decDeg: -60.3730, magnitude: 0.61, spectralClass: 'B' },
  { id: 'menkent', name: 'Menkent', constellation: 'CEN', raHours: 14.1114, decDeg: -36.3700, magnitude: 2.06, spectralClass: 'K' },
  { id: 'muhlifain', name: 'Muhlifain', constellation: 'CEN', raHours: 12.6919, decDeg: -48.9599, magnitude: 2.17, spectralClass: 'A' },

  // ── Estrellas brillantes de referencia de ambos hemisferios ────────────────
  { id: 'canopus', name: 'Canopo', constellation: 'CAR', raHours: 6.3992, decDeg: -52.6957, magnitude: -0.74, spectralClass: 'A' },
  { id: 'arcturus', name: 'Arturo', constellation: 'BOO', raHours: 14.2610, decDeg: 19.1824, magnitude: -0.05, spectralClass: 'K' },
  { id: 'capella', name: 'Capella', constellation: 'AUR', raHours: 5.2782, decDeg: 45.9980, magnitude: 0.08, spectralClass: 'G' },
  { id: 'procyon', name: 'Proción', constellation: 'CMI', raHours: 7.6550, decDeg: 5.2250, magnitude: 0.34, spectralClass: 'F' },
  { id: 'achernar', name: 'Achernar', constellation: 'ERI', raHours: 1.6286, decDeg: -57.2368, magnitude: 0.46, spectralClass: 'B' },
  { id: 'spica', name: 'Espiga', constellation: 'VIR', raHours: 13.4199, decDeg: -11.1614, magnitude: 0.97, spectralClass: 'B' },
  { id: 'fomalhaut', name: 'Fomalhaut', constellation: 'PSA', raHours: 22.9608, decDeg: -29.6222, magnitude: 1.16, spectralClass: 'A' },
  { id: 'miaplacidus', name: 'Miaplacidus', constellation: 'CAR', raHours: 9.2200, decDeg: -69.7172, magnitude: 1.68, spectralClass: 'A' },
  { id: 'alnair', name: 'Alnair', constellation: 'GRU', raHours: 22.1372, decDeg: -46.9610, magnitude: 1.74, spectralClass: 'B' },
  { id: 'mirfak', name: 'Mirfak', constellation: 'PER', raHours: 3.4054, decDeg: 49.8612, magnitude: 1.79, spectralClass: 'F' },
  { id: 'kaus_australis', name: 'Kaus Australis', constellation: 'SGR', raHours: 18.4029, decDeg: -34.3846, magnitude: 1.85, spectralClass: 'B' },
  { id: 'peacock', name: 'Peacock', constellation: 'PAV', raHours: 20.4275, decDeg: -56.7351, magnitude: 1.94, spectralClass: 'B' },
  { id: 'alphard', name: 'Alphard', constellation: 'HYA', raHours: 9.4598, decDeg: -8.6586, magnitude: 1.98, spectralClass: 'K' },
  { id: 'hamal', name: 'Hamal', constellation: 'ARI', raHours: 2.1196, decDeg: 23.4624, magnitude: 2.00, spectralClass: 'K' },
  { id: 'diphda', name: 'Diphda', constellation: 'CET', raHours: 0.7265, decDeg: -17.9866, magnitude: 2.04, spectralClass: 'K' },
  { id: 'rasalhague', name: 'Rasalhague', constellation: 'OPH', raHours: 17.5822, decDeg: 12.5600, magnitude: 2.07, spectralClass: 'A' },
  { id: 'algol', name: 'Algol', constellation: 'PER', raHours: 3.1361, decDeg: 40.9556, magnitude: 2.12, spectralClass: 'B' },
  { id: 'alphecca', name: 'Alphecca', constellation: 'CRB', raHours: 15.5781, decDeg: 26.7147, magnitude: 2.23, spectralClass: 'A' },
  { id: 'eltanin', name: 'Eltanin', constellation: 'DRA', raHours: 17.9434, decDeg: 51.4889, magnitude: 2.23, spectralClass: 'K' },
] as const;

/** Definición de las 15 constelaciones principales con sus segmentos estelares. */
export const CONSTELLATIONS: ReadonlyArray<ConstellationDefinition> = [
  {
    id: 'ORI',
    name: 'Orión',
    segments: [
      ['betelgeuse', 'bellatrix'],
      ['bellatrix', 'mintaka'],
      ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'],
      ['alnitak', 'betelgeuse'],
      ['mintaka', 'rigel'],
      ['alnitak', 'saiph'],
      ['rigel', 'saiph'],
    ],
  },
  {
    id: 'UMA',
    name: 'Osa Mayor',
    segments: [
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
    id: 'UMI',
    name: 'Osa Menor',
    segments: [
      ['polaris', 'yildun'],
      ['yildun', 'eps_umi'],
      ['eps_umi', 'alifa'],
      ['alifa', 'kochab'],
      ['kochab', 'pherkad'],
      ['pherkad', 'anwar'],
      ['anwar', 'alifa'],
    ],
  },
  {
    id: 'CAS',
    name: 'Casiopea',
    segments: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
  {
    id: 'LEO',
    name: 'Leo',
    segments: [
      ['algenubi', 'rasalas'],
      ['rasalas', 'adhafera'],
      ['adhafera', 'algieba'],
      ['algieba', 'regulus'],
      ['algieba', 'zosma'],
      ['regulus', 'chertan'],
      ['chertan', 'zosma'],
      ['zosma', 'denebola'],
      ['chertan', 'denebola'],
    ],
  },
  {
    id: 'SCO',
    name: 'Escorpio',
    segments: [
      ['acrab', 'dschubba'],
      ['dschubba', 'antares'],
      ['antares', 'larawag'],
      ['larawag', 'sargas'],
      ['sargas', 'girtab'],
      ['girtab', 'shaula'],
    ],
  },
  {
    id: 'CYG',
    name: 'Cisne',
    segments: [
      ['deneb', 'sadr'],
      ['sadr', 'albireo'],
      ['fawaris', 'sadr'],
      ['sadr', 'gienah_cyg'],
    ],
  },
  {
    id: 'CRU',
    name: 'Cruz del Sur',
    segments: [
      ['acrux', 'gacrux'],
      ['mimosa', 'imai'],
    ],
  },
  {
    id: 'CMA',
    name: 'Can Mayor',
    segments: [
      ['mirzam', 'sirius'],
      ['sirius', 'wezen'],
      ['wezen', 'adhara'],
      ['wezen', 'aludra'],
    ],
  },
  {
    id: 'GEM',
    name: 'Géminis',
    segments: [
      ['castor', 'pollux'],
      ['castor', 'tejat'],
      ['pollux', 'wasat'],
      ['wasat', 'alhena'],
    ],
  },
  {
    id: 'TAU',
    name: 'Tauro',
    segments: [
      ['elnath', 'ain'],
      ['ain', 'hyadum1'],
      ['hyadum1', 'aldebaran'],
      ['aldebaran', 'tianguan'],
      ['ain', 'alcyone'],
    ],
  },
  {
    id: 'LYR',
    name: 'Lira',
    segments: [
      ['vega', 'zeta_lyr'],
      ['zeta_lyr', 'sheliak'],
      ['sheliak', 'sulafat'],
      ['sulafat', 'delta_lyr'],
      ['delta_lyr', 'zeta_lyr'],
    ],
  },
  {
    id: 'AQL',
    name: 'Águila',
    segments: [
      ['okab', 'tarazed'],
      ['tarazed', 'altair'],
      ['altair', 'alshain'],
      ['alshain', 'theta_aql'],
    ],
  },
  {
    id: 'PEG',
    name: 'Pegaso',
    segments: [
      ['markab', 'scheat'],
      ['scheat', 'alpheratz'],
      ['alpheratz', 'algenib'],
      ['algenib', 'markab'],
      ['markab', 'enif'],
    ],
  },
  {
    id: 'CEN',
    name: 'Centauro',
    segments: [
      ['alfa_cen', 'hadar'],
      ['hadar', 'muhlifain'],
      ['muhlifain', 'menkent'],
    ],
  },
] as const;

/** Nombres en español de todos los códigos IAU presentes en el catálogo compacto. */
export const CONSTELLATION_NAMES: Readonly<Record<string, string>> = {
  AND: 'Andrómeda',
  AQL: 'Águila',
  ARI: 'Aries',
  AUR: 'Cochero',
  BOO: 'Boyero',
  CAR: 'Quilla',
  CAS: 'Casiopea',
  CEN: 'Centauro',
  CET: 'Ballena',
  CMA: 'Can Mayor',
  CMI: 'Can Menor',
  CRB: 'Corona Boreal',
  CRU: 'Cruz del Sur',
  CYG: 'Cisne',
  DRA: 'Dragón',
  ERI: 'Erídano',
  GEM: 'Géminis',
  GRU: 'Grulla',
  HYA: 'Hidra',
  LEO: 'Leo',
  LYR: 'Lira',
  OPH: 'Ofiuco',
  ORI: 'Orión',
  PAV: 'Pavo',
  PEG: 'Pegaso',
  PER: 'Perseo',
  PSA: 'Pez Austral',
  SCO: 'Escorpio',
  SGR: 'Sagitario',
  TAU: 'Tauro',
  UMA: 'Osa Mayor',
  UMI: 'Osa Menor',
  VIR: 'Virgo',
};

/** Devuelve el nombre en español de una constelación a partir de su código IAU. */
export function getConstellationName(code: string): string {
  return CONSTELLATION_NAMES[code.toUpperCase()] ?? code;
}
