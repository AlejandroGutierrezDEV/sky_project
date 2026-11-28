import { CONSTELACIONES_IAU, obtenerNombreConstelacionIAU } from './constelacionesIAU';
import { CATALOGO_ESTRELLAS } from './estrellasMag4';
import { CATALOGO_MESSIER } from './messier110';
import { formatearDec, formatearRA } from '../utils/exportarSesion';
import type {
  ConstelacionIAU,
  EstacionAstronomica,
  EstrellaCatalogo,
  InstrumentoObservacion,
  ObjetoMessier,
  TipoObjetoMessier,
} from '../types/astronomy';
import type {
  CelestialCategory,
  CelestialMetric,
  CelestialTechnicalSheet,
} from '../types/celestialDetails';

/* ── Metadatos curados de Planetas y Luna ─────────────────────────── */

const FICHAS_SISTEMA_SOLAR: Readonly<Record<string, CelestialTechnicalSheet>> = {
  Moon: {
    id: 'Moon',
    name: 'Luna',
    category: 'moon',
    subtitle: 'Satélite natural de la Tierra',
    description:
      'Nuestro satélite natural es el astro más cercano y detallado del cielo nocturno. Sus mares basálticos oscuros, cordilleras y cráteres de impacto ofrecen un espectáculo cambiante cada noche a medida que avanza el terminador solar.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '3.474', unit: 'km' },
      { label: 'Distancia media', value: '384.400', unit: 'km' },
      { label: 'Periodo sinódico', value: '29,53', unit: 'días' },
      { label: 'Gravedad superficial', value: '1,62', unit: 'm/s²' },
      { label: 'Albedo medio', value: '0,12', unit: 'geométrico' },
      { label: 'Magnitud llena', value: '-12,7', unit: 'mag' },
    ],
    observationTips: [
      'Observa cerca del terminador (la línea entre día y noche lunar) durante los cuartos: las sombras largas revelan el relieve de cráteres como Tycho y Copérnico.',
      'Con prismáticos 7×50 o 10×50 ya se distinguen los principales mares (Tranquilidad, Serenidad, Crisis) y los rayos brillantes de Tycho.',
      'En fases cercanas a Luna llena usa un filtro lunar neutro en telescopio para reducir el deslumbramiento y mejorar el contraste.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#e2e8f0',
      secondaryColor: '#64748b',
      altText: 'Representación detallada de la Luna con relieve de mares y cráteres',
    },
  },
  Mercury: {
    id: 'Mercury',
    name: 'Mercurio',
    category: 'planet',
    subtitle: 'Planeta rocoso interior · El más cercano al Sol',
    description:
      'Mercurio es el planeta más pequeño y veloz del sistema solar. Al orbitar tan cerca del Sol, nunca se aleja más de 28° de él en nuestro cielo, por lo que solo se observa brevemente al alba o tras el ocaso mostrando fases similares a las lunares.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '4.879', unit: 'km' },
      { label: 'Distancia al Sol', value: '0,39', unit: 'UA' },
      { label: 'Periodo orbital', value: '87,97', unit: 'días' },
      { label: 'Rotación sideral', value: '58,65', unit: 'días' },
      { label: 'Elongación máxima', value: '18°–28°', unit: 'del Sol' },
      { label: 'Lunas conocidas', value: '0', unit: 'satélites' },
    ],
    observationTips: [
      'Aprovecha sus máximas elongaciones orientales (al anochecer) u occidentales (antes del amanecer) con horizonte despejado.',
      'Unos prismáticos ayudan a localizarlo sobre el resplandor crepuscular, siempre asegurándote de que el Sol esté completamente bajo el horizonte.',
      'Con telescopio a medianos aumentos podrás distinguir su fase creciente o gibosa.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#cbd5e1',
      secondaryColor: '#64748b',
      altText: 'Representación visual del planeta Mercurio de superficie rocosa grisácea',
    },
  },
  Venus: {
    id: 'Venus',
    name: 'Venus',
    category: 'planet',
    subtitle: 'Planeta rocoso · El astro más brillante tras Sol y Luna',
    description:
      'Envuelto en una densa atmósfera de dióxido de carbono y nubes reflectantes de ácido sulfúrico, Venus domina el cielo del amanecer o el atardecer con un brillo blanco inconfundible. Su efecto invernadero extremo lo convierte en el planeta más caliente del sistema solar.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '12.104', unit: 'km' },
      { label: 'Distancia al Sol', value: '0,72', unit: 'UA' },
      { label: 'Periodo orbital', value: '224,7', unit: 'días' },
      { label: 'Temperatura media', value: '464', unit: '°C' },
      { label: 'Elongación máxima', value: '47°', unit: 'del Sol' },
      { label: 'Magnitud máxima', value: '-4,9', unit: 'mag' },
    ],
    observationTips: [
      'Incluso con prismáticos sobre trípode o un telescopio pequeño se aprecian claramente sus fases, desde un fino creciente brillante hasta un disco giboso.',
      'El mejor momento para observarlo con telescopio es durante el crepúsculo, cuando su brillo intenso contrasta menos con el fondo del cielo.',
      'Sigue su evolución a lo largo de varias semanas: cuando se acerca a la Tierra crece en tamaño angular mientras su fase se vuelve más delgada.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#fef08a',
      secondaryColor: '#ca8a04',
      altText: 'Representación visual del planeta Venus envuelto en nubes doradas brillantes',
    },
  },
  Mars: {
    id: 'Mars',
    name: 'Marte',
    category: 'planet',
    subtitle: 'Planeta rocoso · El Planeta Rojo',
    description:
      'Marte debe su característico color ocre rojizo al óxido de hierro presente en su polvo superficial. Alberga el mayor volcán del sistema solar (Monte Olimpo) y el gigantesco cañón Valles Marineris, además de casquetes polares estacionales observables desde la Tierra.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '6.779', unit: 'km' },
      { label: 'Distancia al Sol', value: '1,52', unit: 'UA' },
      { label: 'Periodo orbital', value: '687', unit: 'días' },
      { label: 'Duración del día', value: '24 h 37 m', unit: 'sol' },
      { label: 'Lunas conocidas', value: '2', unit: 'Fobos y Deimos' },
      { label: 'Oposición cada', value: '26', unit: 'meses' },
    ],
    observationTips: [
      'A simple vista destaca por su tonalidad anaranjada firme y casi sin centelleo cerca de la eclíptica.',
      'Durante los meses próximos a su oposición (cada ~2 años), un telescopio de 100–150 mm revela el casquete polar blanco y manchas oscuras como Syrtis Major.',
      'Espera momentos de buena estabilidad atmosférica (seeing) y usa aumentos altos (150×–200×) cuando Marte esté alto sobre el horizonte.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#f87171',
      secondaryColor: '#991b1b',
      altText: 'Representación visual del planeta Marte con superficie rojiza y casquete polar',
    },
  },
  Jupiter: {
    id: 'Jupiter',
    name: 'Júpiter',
    category: 'planet',
    subtitle: 'Gigante gaseoso · El mayor planeta del sistema solar',
    description:
      'Júpiter reúne más del doble de masa que todos los demás planetas juntos. Su rápida rotación inferior a 10 horas organiza su atmósfera en espectaculares bandas ecuatoriales y anticiclones colosales como la Gran Mancha Roja, escoltado por las cuatro lunas galileanas.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '142.984', unit: 'km' },
      { label: 'Distancia al Sol', value: '5,20', unit: 'UA' },
      { label: 'Periodo orbital', value: '11,86', unit: 'años' },
      { label: 'Rotación ecuatorial', value: '9 h 55 m', unit: 'periodo' },
      { label: 'Lunas principales', value: '4', unit: 'galileanas' },
      { label: 'Magnitud en oposición', value: '-2,9', unit: 'mag' },
    ],
    observationTips: [
      'Con unos simples prismáticos ya verás hasta cuatro puntos alineados junto al disco: Ío, Europa, Ganímedes y Calisto cambiando de posición cada noche.',
      'Un telescopio pequeño (70–100 mm) muestra de inmediato las dos bandas ecuatoriales principales y los tránsitos de sombras lunares.',
      'Con 150 mm o más y atmósfera estable se distingue la Gran Mancha Roja en el hemisferio sur joviano.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#fdba74',
      secondaryColor: '#9a3412',
      altText: 'Representación visual del planeta Júpiter con bandas atmosféricas ocres y cálidas',
    },
  },
  Saturn: {
    id: 'Saturn',
    name: 'Saturno',
    category: 'planet',
    subtitle: 'Gigante gaseoso · El Señor de los Anillos',
    description:
      'Saturno es célebre por su majestuoso sistema de anillos compuestos de miles de millones de fragmentos de hielo y roca. Es el planeta menos denso del sistema solar y posee una corte de satélites fascinante encabezada por Titán, una luna con atmósfera densa propia.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '120.536', unit: 'km' },
      { label: 'Extensión de anillos', value: '282.000', unit: 'km' },
      { label: 'Distancia al Sol', value: '9,58', unit: 'UA' },
      { label: 'Periodo orbital', value: '29,45', unit: 'años' },
      { label: 'Rotación ecuatorial', value: '10 h 33 m', unit: 'periodo' },
      { label: 'Luna mayor', value: 'Titán', unit: 'mag 8,4' },
    ],
    observationTips: [
      'A partir de 30×–50× de aumento en telescopio los anillos ya resultan inconfundibles y dejan una impresión memorable.',
      'Busca la División de Cassini —la brecha oscura entre los anillos A y B— con 120× o más en noches de buena transparencia.',
      'Titán suele distinguirse fácilmente como una estrella tenue de tono dorado-anaranjado a varios diámetros del planeta.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#fde047',
      secondaryColor: '#a16207',
      hasRings: true,
      altText: 'Representación visual del planeta Saturno rodeado por su sistema de anillos dorados',
    },
  },
  Uranus: {
    id: 'Uranus',
    name: 'Urano',
    category: 'planet',
    subtitle: 'Gigante helado · Eje de rotación casi horizontal',
    description:
      'Urano gira literalmente de lado, con una inclinación axial de casi 98° que provoca estaciones extremas de más de 20 años. El metano en su alta atmósfera absorbe la luz roja y le otorga un característico matiz azul verdoso pálido.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '51.118', unit: 'km' },
      { label: 'Distancia al Sol', value: '19,20', unit: 'UA' },
      { label: 'Periodo orbital', value: '84,02', unit: 'años' },
      { label: 'Inclinación axial', value: '97,8', unit: 'grados' },
      { label: 'Anillos tenues', value: '13', unit: 'conocidos' },
      { label: 'Magnitud media', value: '+5,7', unit: 'mag' },
    ],
    observationTips: [
      'En cielos muy oscuros (Bortle 1–3) está justo en el límite del ojo desnudo, pero es sencillo de localizar con prismáticos 10×50.',
      'A partir de 100×–150× en telescopio deja de verse puntual como una estrella y muestra un pequeño disco turquesa sin centelleo.',
      'Usa el mapa celeste en modo foco para confirmar su posición respecto a las estrellas de fondo cercanas.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#67e8f9',
      secondaryColor: '#0e7490',
      hasRings: true,
      altText: 'Representación visual del planeta Urano en tono cian con anillos sutiles',
    },
  },
  Neptune: {
    id: 'Neptune',
    name: 'Neptuno',
    category: 'planet',
    subtitle: 'Gigante helado · El planeta más lejano del sistema solar',
    description:
      'Descubierto en 1846 gracias a predicciones matemáticas antes de ser visto por telescopio, Neptuno es un mundo helado azotado por los vientos más rápidos del sistema solar (más de 2.000 km/h) en una órbita 30 veces más lejana que la Tierra.',
    metrics: [
      { label: 'Diámetro ecuatorial', value: '49.528', unit: 'km' },
      { label: 'Distancia al Sol', value: '30,05', unit: 'UA' },
      { label: 'Periodo orbital', value: '164,8', unit: 'años' },
      { label: 'Rotación sideral', value: '16 h 06 m', unit: 'periodo' },
      { label: 'Luna mayor', value: 'Tritón', unit: 'órbita retrógrada' },
      { label: 'Magnitud media', value: '+7,8', unit: 'mag' },
    ],
    observationTips: [
      'Invisible a simple vista; requiere al menos prismáticos 10×50 bien estabilizados o un telescopio pequeño para identificarlo.',
      'A 150×–200× en telescopio muestra un diminuto disco azul cobalto de unos 2,3 segundos de arco.',
      'Compara su posición con el campo estelar en noches separadas por varios días para notar su lento desplazamiento.',
    ],
    visual: {
      kind: 'planet_render',
      primaryColor: '#60a5fa',
      secondaryColor: '#1e3a8a',
      altText: 'Representación visual del planeta Neptuno en tono azul intenso',
    },
  },
};

/* ── Utilidades de color, espectro y geometría celeste ────────────── */

const ETIQUETA_ESTACION: Readonly<Record<EstacionAstronomica, string>> = {
  Invierno: 'Invierno boreal',
  Primavera: 'Primavera boreal',
  Verano: 'Verano boreal',
  Otono: 'Otoño boreal',
  Circumpolar: 'Circumpolar (todo el año)',
};

const ETIQUETA_TIPO_MESSIER: Readonly<Record<TipoObjetoMessier, string>> = {
  Galaxia: 'Galaxia',
  Nebulosa: 'Nebulosa',
  CumuloGlobular: 'Cúmulo globular',
  CumuloAbierto: 'Cúmulo abierto',
  RemanenteSupernova: 'Remanente de supernova',
  Asterismo: 'Asterismo / nube estelar',
};

const ETIQUETA_INSTRUMENTO: Readonly<Record<InstrumentoObservacion, string>> = {
  'Ojo desnudo': 'Ojo desnudo',
  Prismaticos: 'Prismáticos',
  Telescopio: 'Telescopio',
};

function estimarClaseEspectral(bv: number | undefined): {
  clase: string;
  temperatura: string;
  colorPrimario: string;
  colorSecundario: string;
  descripcionColor: string;
} {
  if (bv === undefined || !Number.isFinite(bv)) {
    return {
      clase: 'Estrella de secuencia',
      temperatura: '~6.500 K',
      colorPrimario: '#f8fafc',
      colorSecundario: '#94a3b8',
      descripcionColor: 'blanco neutro',
    };
  }
  if (bv < -0.1) {
    return {
      clase: 'Clase O / B (azul caliente)',
      temperatura: '15.000–30.000 K',
      colorPrimario: '#93c5fd',
      colorSecundario: '#2563eb',
      descripcionColor: 'azul intenso',
    };
  }
  if (bv < 0.2) {
    return {
      clase: 'Clase A (blanco-azulada)',
      temperatura: '7.500–10.000 K',
      colorPrimario: '#e0f2fe',
      colorSecundario: '#38bdf8',
      descripcionColor: 'blanco azulado',
    };
  }
  if (bv < 0.55) {
    return {
      clase: 'Clase F (blanco-amarillenta)',
      temperatura: '6.000–7.500 K',
      colorPrimario: '#fefce8',
      colorSecundario: '#fde047',
      descripcionColor: 'blanco cálido',
    };
  }
  if (bv < 0.9) {
    return {
      clase: 'Clase G (amarilla tipo solar)',
      temperatura: '5.200–6.000 K',
      colorPrimario: '#fef08a',
      colorSecundario: '#eab308',
      descripcionColor: 'amarillo dorado',
    };
  }
  if (bv < 1.4) {
    return {
      clase: 'Clase K (naranja)',
      temperatura: '3.700–5.200 K',
      colorPrimario: '#fdba74',
      colorSecundario: '#ea580c',
      descripcionColor: 'naranja cálido',
    };
  }
  return {
    clase: 'Clase M (gigante/supergigante roja)',
    temperatura: '2.600–3.700 K',
    colorPrimario: '#fca5a5',
    colorSecundario: '#dc2626',
    descripcionColor: 'rojo anaranjado',
  };
}

function distanciaAngularGrados(
  ra1Horas: number,
  dec1Grados: number,
  ra2Horas: number,
  dec2Grados: number
): number {
  const ra1 = (ra1Horas * 15 * Math.PI) / 180;
  const dec1 = (dec1Grados * Math.PI) / 180;
  const ra2 = (ra2Horas * 15 * Math.PI) / 180;
  const dec2 = (dec2Grados * Math.PI) / 180;
  const dot =
    Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2) + Math.sin(dec1) * Math.sin(dec2);
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

/**
 * Devuelve las estrellas pertenecientes a una constelación IAU combinando
 * sufijo de designación Bayer/Flamsteed y proximidad a los vértices del asterismo.
 */
export function obtenerEstrellasDeConstelacion<T extends EstrellaCatalogo>(
  codigoConstelacion: string,
  estrellas: readonly T[]
): T[] {
  const codigo = codigoConstelacion.toUpperCase();
  const constelacion = CONSTELACIONES_IAU.find((c) => c.codigo === codigo);
  const vertices: Array<readonly [number, number]> = [];

  if (constelacion) {
    const vistos = new Set<string>();
    for (const [desde, hasta] of constelacion.segmentos) {
      for (const punto of [desde, hasta]) {
        const clave = `${punto[0].toFixed(3)}|${punto[1].toFixed(3)}`;
        if (!vistos.has(clave)) {
          vistos.add(clave);
          vertices.push(punto);
        }
      }
    }
  }

  return estrellas.filter((estrella) => {
    const partes = estrella.id.trim().split(/\s+/);
    const sufijo = (partes[partes.length - 1] ?? '').toUpperCase();
    if (sufijo === codigo) return true;
    for (const [raV, decV] of vertices) {
      if (Math.abs(estrella.decGrados - decV) > 0.35) continue;
      if (distanciaAngularGrados(estrella.raHoras, estrella.decGrados, raV, decV) <= 0.25) {
        return true;
      }
    }
    return false;
  });
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

function ecuatorialAVectorUnitario(raHoras: number, decGrados: number): Vector3D {
  const raRad = (raHoras * 15 * Math.PI) / 180;
  const decRad = (decGrados * Math.PI) / 180;
  const cosDec = Math.cos(decRad);
  return {
    x: cosDec * Math.cos(raRad),
    y: cosDec * Math.sin(raRad),
    z: Math.sin(decRad),
  };
}

function productoEscalar(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function productoVectorial(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalizarVector(v: Vector3D): Vector3D {
  const norma = Math.hypot(v.x, v.y, v.z);
  if (norma < 1e-12) return { x: 1, y: 0, z: 0 };
  return {
    x: v.x / norma,
    y: v.y / norma,
    z: v.z / norma,
  };
}

/**
 * Construye puntos normalizados [0..1] y aristas para renderizar el diagrama
 * geométricamente fiel de cualquier constelación IAU en CelestialPreview,
 * utilizando proyección tangente estereográfica 3D para evitar distorsiones polares.
 */
function construirDiagramaConstelacion(constelacion: ConstelacionIAU): {
  diagramPoints: ReadonlyArray<{ x: number; y: number; magnitude?: number }>;
  diagramEdges: ReadonlyArray<readonly [number, number]>;
} {
  const verticesRaw: Array<{ ra: number; dec: number; magnitude?: number }> = [];
  const indicePorClave = new Map<string, number>();
  const aristas: Array<readonly [number, number]> = [];

  const obtenerIndiceVertice = (ra: number, dec: number): number => {
    const clave = `${ra.toFixed(3)}|${dec.toFixed(3)}`;
    const existente = indicePorClave.get(clave);
    if (existente !== undefined) return existente;

    // Asociar la magnitud real de la estrella más cercana del catálogo
    let magEncontrada: number | undefined;
    let distMin = 0.3;
    for (const estrella of CATALOGO_ESTRELLAS) {
      if (Math.abs(estrella.decGrados - dec) > 0.4) continue;
      const dist = distanciaAngularGrados(estrella.raHoras, estrella.decGrados, ra, dec);
      if (dist < distMin) {
        distMin = dist;
        magEncontrada = estrella.magnitud;
      }
    }

    const nuevoIndice = verticesRaw.length;
    verticesRaw.push({ ra, dec, magnitude: magEncontrada });
    indicePorClave.set(clave, nuevoIndice);
    return nuevoIndice;
  };

  for (const [desde, hasta] of constelacion.segmentos) {
    const i1 = obtenerIndiceVertice(desde[0], desde[1]);
    const i2 = obtenerIndiceVertice(hasta[0], hasta[1]);
    if (i1 !== i2) {
      aristas.push([i1, i2] as const);
    }
  }

  if (verticesRaw.length === 0) {
    return { diagramPoints: [], diagramEdges: [] };
  }

  // 1. Convertir vértices (AR, Dec) a vectores unitarios 3D en la esfera celeste
  const vertices3D = verticesRaw.map((v) => ({
    vec: ecuatorialAVectorUnitario(v.ra, v.dec),
    magnitude: v.magnitude,
  }));

  // 2. Calcular centroide normalizado c de la constelación
  let sumaX = 0;
  let sumaY = 0;
  let sumaZ = 0;
  for (const v of vertices3D) {
    sumaX += v.vec.x;
    sumaY += v.vec.y;
    sumaZ += v.vec.z;
  }
  const normaSuma = Math.hypot(sumaX, sumaY, sumaZ);
  const centroide: Vector3D =
    normaSuma > 1e-9
      ? { x: sumaX / normaSuma, y: sumaY / normaSuma, z: sumaZ / normaSuma }
      : vertices3D[0].vec;

  // 3. Base ortonormal local (ejeU, ejeV) en el plano tangente con ejeV hacia el Norte celeste
  const norteCeleste: Vector3D = { x: 0, y: 0, z: 1 };
  const proyNorteSobreCentro = productoEscalar(norteCeleste, centroide);
  let norteTangente: Vector3D = {
    x: norteCeleste.x - proyNorteSobreCentro * centroide.x,
    y: norteCeleste.y - proyNorteSobreCentro * centroide.y,
    z: norteCeleste.z - proyNorteSobreCentro * centroide.z,
  };
  if (Math.hypot(norteTangente.x, norteTangente.y, norteTangente.z) < 1e-6) {
    const referencia: Vector3D = { x: 1, y: 0, z: 0 };
    const proyRef = productoEscalar(referencia, centroide);
    norteTangente = {
      x: referencia.x - proyRef * centroide.x,
      y: referencia.y - proyRef * centroide.y,
      z: referencia.z - proyRef * centroide.z,
    };
  }
  const ejeV = normalizarVector(norteTangente);
  // c × v apunta al Oeste celeste (+X derecha en SVG -> Este a la izquierda como en el cielo real)
  const ejeU = normalizarVector(productoVectorial(centroide, ejeV));

  // 4. Proyección estereográfica conforme sobre el plano tangente (ejeU, ejeV)
  const proyectados = vertices3D.map((v) => {
    const cosAngulo = productoEscalar(v.vec, centroide);
    const factorEstereografico = 2 / Math.max(0.15, 1 + cosAngulo);
    return {
      x: productoEscalar(v.vec, ejeU) * factorEstereografico,
      y: -productoEscalar(v.vec, ejeV) * factorEstereografico,
      magnitude: v.magnitude,
    };
  });

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of proyectados) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rangoX = maxX - minX;
  const rangoY = maxY - minY;
  const escalaMax = Math.max(rangoX, rangoY, 0.001);
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;
  const margenUtil = 0.78; // Centra el asterismo en [0.11, 0.89]

  const diagramPoints = proyectados.map((p) => ({
    x: Number((0.5 + ((p.x - centroX) / escalaMax) * margenUtil).toFixed(4)),
    y: Number((0.5 + ((p.y - centroY) / escalaMax) * margenUtil).toFixed(4)),
    ...(p.magnitude !== undefined ? { magnitude: p.magnitude } : {}),
  }));

  return {
    diagramPoints,
    diagramEdges: aristas,
  };
}

/* ── Descripciones curadas de constelaciones destacadas ───────────── */

const DESCRIPCIONES_CONSTELACIONES: Readonly<
  Record<string, { descripcion: string; consejoExtra?: string }>
> = {
  ORI: {
    descripcion:
      'Orión, el Cazador, es la constelación más emblemática del cielo invernal boreal y visible desde ambos hemisferios. Su famoso Cinturón formado por Alnitak, Alnilam y Mintaka apunta hacia Sirio y las Pléyades, y bajo él brilla la Gran Nebulosa de Orión (M42).',
    consejoExtra:
      'Compara a simple vista el contraste de color entre la supergigante roja Betelgeuse (hombro superior) y la supergigante azul Rigel (pie inferior).',
  },
  UMA: {
    descripcion:
      'La Osa Mayor domina el cielo boreal durante todo el año y contiene el célebre asterismo del Carro o Cazo. Sus dos estrellas frontales, Dubhe y Merak, actúan como punteros naturales para localizar a Polaris en cuestión de segundos.',
    consejoExtra:
      'Pon a prueba tu vista buscando el par óptico Mizar y Alcor en el mango del Carro; con telescopio Mizar se resuelve además en una doble brillante.',
  },
  UMI: {
    descripcion:
      'La Osa Menor alberga en el extremo de su cola a Polaris, la Estrella Polar, situada a menos de un grado del polo norte celeste. Es la referencia fundamental para orientarse hacia el norte geográfico y alinear monturas ecuatoriales.',
    consejoExtra:
      'Usa las estrellas del cazo de la Osa Menor como test práctico de contaminación lumínica: sus magnitudes escalan aproximadamente de 2,0 a 5,0.',
  },
  CAS: {
    descripcion:
      'Casiopea es inconfundible por su figura en forma de "W" o "M" inmersa en plena Vía Láctea boreal. Al ser circumpolar desde latitudes medias del norte, resulta visible todas las noches del año y está repleta de cúmulos abiertos.',
    consejoExtra:
      'Recorre con prismáticos la banda central de la "W": descubrirás nubes estelares y cúmulos como M52, M103 y el cercano Cúmulo del Búho (NGC 457).',
  },
  AND: {
    descripcion:
      'Andrómeda se extiende desde una esquina del Gran Cuadrado de Pegaso como una cadena elegante de estrellas. Es célebre por albergar a M31, la Galaxia de Andrómeda, la gran galaxia espiral más cercana a la Vía Láctea.',
    consejoExtra:
      'Parte de Mirach (β And) y sube dos saltos estelares hacia el norte: allí aparece el núcleo difuso de la Galaxia de Andrómeda incluso a simple vista.',
  },
  CYG: {
    descripcion:
      'El Cisne, también llamado la Cruz del Norte, surca la Vía Láctea estival con Deneb en la cola y la famosa estrella doble bicolor Albireo en el pico. Sus nubes de polvo y nebulosas de emisión son un paraíso para prismáticos y astrofotografía.',
    consejoExtra:
      'Apunta un telescopio pequeño a Albireo para disfrutar de uno de los mayores contrastes de color del cielo: oro cálido y azul zafiro.',
  },
  LYR: {
    descripcion:
      'La Lira es una constelación compacta y elegante presidida por Vega, uno de los vértices del Triángulo de Verano. A pesar de su pequeño tamaño encierra joyas como la Nebulosa del Anillo (M57) y el sistema cuádruple Épsilon Lyrae.',
    consejoExtra:
      'Entre Sulafat y Sheliak, las dos estrellas inferiores del paralelogramo, se oculta la célebre Nebulosa Planetaria del Anillo (M57).',
  },
  SCO: {
    descripcion:
      'Escorpio despliega una silueta inconfundible en forma de anzuelo cerca del núcleo galáctico. Su corazón late en la supergigante roja Antares y su cola se adentra en campos riquísimos de cúmulos abiertos (M6, M7) y globulares (M4, M80).',
    consejoExtra:
      'Unos prismáticos 10×50 bastan para saborear los brillantes cúmulos de la Mariposa (M6) y de Ptolomeo (M7) sobre el aguijón.',
  },
  SGR: {
    descripcion:
      'Sagitario señala la dirección exacta del centro de la Vía Láctea y es la constelación con mayor número de objetos Messier (15). Su asterismo principal recuerda a una tetera de cuyo pico parece brotar el vapor luminoso de la galaxia.',
    consejoExtra:
      'Explora lentamente por encima de la "tapa" de la Tetera con prismáticos: verás en un solo recorrido M8 (Laguna), M20 (Trífida), M22 y M24.',
  },
  LEO: {
    descripcion:
      'Leo anuncia la llegada de la primavera boreal con su reconocible asterismo de la Hoz, coronado por Régulo. Al situarse lejos del plano galáctico, abre una ventana directa hacia numerosos grupos de galaxias espirales como el Triplete de Leo.',
    consejoExtra:
      'Con telescopio de apertura media busca el Triplete de Leo (M65, M66 y NGC 3628) bajo el vientre del león.',
  },
  TAU: {
    descripcion:
      'Tauro es una de las constelaciones zodiacales más antiguas y ricas del invierno. Presenta dos cúmulos abiertos visibles a simple vista —las Híades en forma de "V" junto a la rojiza Aldebarán y el icónico cúmulo de las Pléyades (M45)— además de la Nebulosa del Cangrejo (M1).',
    consejoExtra:
      'Observa las Híades y las Pléyades con prismáticos de gran campo: el escaso aumento realza su distribución tridimensional.',
  },
  GEM: {
    descripcion:
      'Géminis se distingue de inmediato por la pareja brillante de Cástor y Pólux, que coronan dos líneas paralelas de estrellas hacia el plano de la Vía Láctea. Es también el radiante de las Gemínidas, una de las lluvias de meteoros más intensas del año.',
    consejoExtra:
      'En el pie occidental de Géminis brilla M35, un cúmulo abierto espléndido tanto en prismáticos como en telescopio.',
  },
  VIR: {
    descripcion:
      'Virgo es la segunda constelación más extensa del cielo y está presidida por la brillante Espiga (Spica). En su interior se concentra el Supercúmulo de Virgo, con más de una decena de galaxias del catálogo Messier agrupadas en la misma región.',
    consejoExtra:
      'En cielos oscuros con telescopio recorre la Cadena de Markarian entre M84 y M86 para contemplar varias galaxias en un único campo ocular.',
  },
  CRU: {
    descripcion:
      'La Cruz del Sur es la constelación más pequeña de las 88 oficiales, pero una de las más brillantes y famosas del hemisferio austral. Su eje mayor apunta hacia el polo sur celeste y junto a ella destaca la nebulosa oscura del Saco de Carbón.',
    consejoExtra:
      'Justo al lado de Mimosa (β Cru) observa con prismáticos el Joyero (NGC 4755), un cúmulo abierto con estrellas de colores vivos.',
  },
  CEN: {
    descripcion:
      'Centauro es una vasta constelación austral repleta de estrellas brillantes, entre ellas Alfa Centauri —el sistema estelar más cercano al Sol— y el monumental cúmulo globular Omega Centauri, visible a simple vista como una estrella difusa.',
    consejoExtra:
      'Alfa y Beta Centauri sirven como punteros directos hacia la vecina Cruz del Sur.',
  },
  PEG: {
    descripcion:
      'Pegaso domina el cielo otoñal con el amplio Gran Cuadrado de Pegaso, una excelente guía geométrica para orientarse entre Andrómeda, Acuario y Piscis. En su hocico aguarda el denso cúmulo globular M15.',
    consejoExtra:
      'Cuenta cuántas estrellas ves a simple vista dentro del Gran Cuadrado para estimar rápidamente la calidad oscura de tu cielo.',
  },
  PER: {
    descripcion:
      'Perseo recorre una zona espléndida de la Vía Láctea entre Casiopea y Auriga. Alberga a la famosa estrella variable eclipsante Algol ("la estrella demonio"), el Doble Cúmulo de Perseo y el radiante de las Perseidas de agosto.',
    consejoExtra:
      'Entre Perseo y Casiopea dirige unos prismáticos hacia el Doble Cúmulo (NGC 869 y 884), uno de los campos más fotogénicos del cielo.',
  },
  AQL: {
    descripcion:
      'El Águila vuela sobre la Vía Láctea de verano guiada por la brillante Altair, flanqueada simétricamente por Tarazed y Alshain. Altair completa junto a Vega y Deneb el gran asterismo del Triángulo de Verano.',
    consejoExtra:
      'Barrer las alas del Águila con prismáticos revela la grieta oscura de polvo interestelar que divide en dos la Vía Láctea.',
  },
  CMA: {
    descripcion:
      'El Can Mayor sigue a Orión a través del cielo invernal encabezado por Sirio, la estrella más brillante de todo el cielo nocturno. Bajo Sirio se oculta el generoso cúmulo abierto M41.',
    consejoExtra:
      'Desplaza unos 4° hacia el sur desde Sirio con prismáticos: encontrarás de inmediato el cúmulo abierto M41.',
  },
  AUR: {
    descripcion:
      'El Cochero forma un gran pentágono luminoso dominado por la amarilla Capella, la sexta estrella más brillante del firmamento. Cruza la Vía Láctea invernal ofreciendo el trío de cúmulos abiertos M36, M37 y M38.',
    consejoExtra:
      'Con prismáticos 10×50 puedes saltar sucesivamente de M38 a M36 y M37 en menos de cinco minutos.',
  },
  BOO: {
    descripcion:
      'El Boyero despliega una silueta en forma de cometa anclada en Arturo, la estrella más brillante del hemisferio celeste norte. Sigue la curva del mango del Carro de la Osa Mayor para llegar directamente a su resplandor anaranjado.',
    consejoExtra:
      'Usa la regla nemotécnica clásica: "sigue el arco del Carro hasta Arturo, y continúa la línea hasta Espiga".',
  },
  HER: {
    descripcion:
      'Hércules es la quinta constelación más grande del cielo y se reconoce por su cuadrilátero central conocido como la Piedra Angular. En uno de sus costados brilla M13, el Gran Cúmulo Globular de Hércules.',
    consejoExtra:
      'Busca M13 a un tercio del camino entre Eta y Zeta Herculis; en telescopio revela cientos de miles de estrellas apiñadas.',
  },
  DRA: {
    descripcion:
      'El Dragón serpentea alrededor de la Osa Menor en el cielo circumpolar norte. Su estrella Thuban fue la Estrella Polar hace casi 5.000 años, cuando se construyeron las pirámides de Egipto.',
    consejoExtra:
      'La cabeza del Dragón forma un rombo muy fácil de reconocer justo al norte de Hércules y cerca de Vega.',
  },
};

function construirFichaConstelacion(constelacion: ConstelacionIAU): CelestialTechnicalSheet {
  const { diagramPoints, diagramEdges } = construirDiagramaConstelacion(constelacion);
  const estrellasAsociadas = obtenerEstrellasDeConstelacion(
    constelacion.codigo,
    CATALOGO_ESTRELLAS
  ).sort((a, b) => a.magnitud - b.magnitud);
  const messierAsociados = CATALOGO_MESSIER.filter(
    (m) => m.constelacionIAU === constelacion.codigo
  ).sort((a, b) => a.magnitud - b.magnitud);

  const estrellaPrincipal = estrellasAsociadas[0];
  const estrellaPrincipalTexto = estrellaPrincipal
    ? `${estrellaPrincipal.nombre ?? estrellaPrincipal.id} (mag ${estrellaPrincipal.magnitud.toFixed(1)})`
    : 'Estrellas de campo';

  const curada = DESCRIPCIONES_CONSTELACIONES[constelacion.codigo];
  const resumenMessier =
    messierAsociados.length > 0
      ? ` Contiene ${messierAsociados.length} ${
          messierAsociados.length === 1 ? 'objeto' : 'objetos'
        } del catálogo Messier (${messierAsociados
          .slice(0, 3)
          .map((m) => m.id)
          .join(', ')}${messierAsociados.length > 3 ? '…' : ''}).`
      : '';

  const descripcion =
    curada?.descripcion ??
    `${constelacion.nombreEs} (${constelacion.nombreLatin}, código IAU ${constelacion.codigo}) es una de las 88 constelaciones oficiales de la Unión Astronómica Internacional, destacada durante la temporada de ${ETIQUETA_ESTACION[constelacion.estacion].toLowerCase()}. Su asterismo principal está encabezado por ${estrellaPrincipalTexto}.${resumenMessier}`;

  const metrics: CelestialMetric[] = [
    { label: 'Código IAU', value: constelacion.codigo },
    { label: 'Nombre latino', value: constelacion.nombreLatin },
    { label: 'Mejor época', value: ETIQUETA_ESTACION[constelacion.estacion] },
    { label: 'Estrella principal', value: estrellaPrincipalTexto },
    {
      label: 'Estrellas mag ≤ 4',
      value: String(estrellasAsociadas.length),
      unit: 'en catálogo',
    },
    {
      label: 'Objetos Messier',
      value:
        messierAsociados.length > 0
          ? `${messierAsociados.length} (${messierAsociados
              .slice(0, 2)
              .map((m) => m.id)
              .join(', ')})`
          : '0',
    },
  ];

  const observationTips: string[] = [
    `Identifica primero su estrella más brillante (${estrellaPrincipalTexto}) y traza el asterismo siguiendo las líneas del diagrama.`,
    `Su mejor ventana de observación corresponde a ${ETIQUETA_ESTACION[constelacion.estacion].toLowerCase()}, cuando culmina más alta y lejos de la bruma del horizonte.`,
  ];
  if (curada?.consejoExtra) {
    observationTips.push(curada.consejoExtra);
  } else if (messierAsociados.length > 0) {
    const top = messierAsociados[0];
    observationTips.push(
      `Aprovecha la visita para buscar ${top.id}${top.nombreComun ? ` (${top.nombreComun})` : ''}, observable con ${ETIQUETA_INSTRUMENTO[top.instrumentoMinimo].toLowerCase()}.`
    );
  } else {
    observationTips.push(
      'Adapta tus ojos a la oscuridad durante al menos 15 minutos o activa el modo Filtro Rojo para distinguir sus estrellas más débiles.'
    );
  }

  return {
    id: constelacion.codigo,
    name: constelacion.nombreEs,
    category: 'constellation',
    subtitle: `Constelación IAU · ${constelacion.nombreLatin} (${constelacion.codigo})`,
    description: descripcion,
    metrics,
    observationTips,
    visual: {
      kind: 'constellation_diagram',
      primaryColor: '#38bdf8',
      secondaryColor: '#fde68a',
      diagramPoints,
      diagramEdges,
      altText: `Diagrama estelar del asterismo oficial de la constelación ${constelacion.nombreEs} (${constelacion.codigo})`,
    },
  };
}

/* ── Fichas curadas y derivadas de los 110 objetos Messier ────────── */

const DESCRIPCIONES_MESSIER: Readonly<
  Record<string, { descripcion: string; distancia?: string; consejoExtra?: string }>
> = {
  M1: {
    descripcion:
      'La Nebulosa del Cangrejo es el remanente en expansión de la histórica supernova registrada en el año 1054 por astrónomos chinos. En su centro gira un púlsar de neutrones 30 veces por segundo que ilumina toda la nube de filamentos.',
    distancia: '6.500 años luz',
    consejoExtra:
      'Bajo cielos oscuros aparece como un óvalo fantasmal grisáceo cerca de Zeta Tauri; un filtro UHC mejora su contraste.',
  },
  M8: {
    descripcion:
      'La Nebulosa de la Laguna es una gigantesca guardería estelar en Sagitario dividida por una banda oscura de polvo. A simple vista bajo cielos oscuros ya se percibe como una nube luminosa acompañada de un cúmulo joven incrustado.',
    distancia: '4.100 años luz',
  },
  M13: {
    descripcion:
      'El Gran Cúmulo de Hércules agrupa más de 300.000 estrellas antiguas en una esfera densa de unos 145 años luz de diámetro. Es el cúmulo globular más célebre y espectacular del hemisferio boreal.',
    distancia: '22.200 años luz',
    consejoExtra:
      'Con telescopios desde 100 mm sus bordes se resuelven en un hormigueo de puntitos estelares alrededor de un núcleo intenso.',
  },
  M16: {
    descripcion:
      'La Nebulosa del Águila combina un cúmulo estelar joven con nubes de gas ionizado famosas por los icónicos "Pilares de la Creación" fotografiados por los telescopios Hubble y James Webb.',
    distancia: '5.700 años luz',
  },
  M17: {
    descripcion:
      'La Nebulosa Omega (o del Cisne) es una de las regiones de formación estelar más brillantes y ricas de nuestra galaxia, con una característica silueta luminosa en forma de cisne flotando sobre el fondo estelar de Sagitario.',
    distancia: '5.500 años luz',
  },
  M20: {
    descripcion:
      'La Nebulosa Trífida combina nebulosa de emisión rosada, nebulosa de reflexión azulada y tres carriles oscuros de polvo que la dividen en lóbulos distintivos.',
    distancia: '4.100 años luz',
  },
  M22: {
    descripcion:
      'Uno de los cúmulos globulares más brillantes y cercanos a la Tierra, superando incluso en brillo aparente a M13. Sus estrellas más luminosas se resuelven con telescopios modestos.',
    distancia: '10.600 años luz',
  },
  M27: {
    descripcion:
      'La Nebulosa Dumbbell (o de la Haltera) fue la primera nebulosa planetaria descubierta en la historia. Representa las capas externas expulsadas por una estrella similar al Sol al final de su evolución.',
    distancia: '1.360 años luz',
  },
  M31: {
    descripcion:
      'La Galaxia de Andrómeda es la gran galaxia espiral vecina de la Vía Láctea, con cerca de un billón de estrellas y un diámetro superior a 150.000 años luz. Es el objeto más lejano visible habitualmente a simple vista.',
    distancia: '2,54 millones de años luz',
    consejoExtra:
      'Usa prismáticos o aumentos bajos para abarcar su halo elíptico completo junto a sus galaxias satélites M32 y M110.',
  },
  M33: {
    descripcion:
      'La Galaxia del Triángulo es el tercer miembro más grande de nuestro Grupo Local tras Andrómeda y la Vía Láctea. Vista casi de frente, sus brazos espirales abiertos poseen bajo brillo superficial.',
    distancia: '2,73 millones de años luz',
    consejoExtra:
      'Requiere cielos oscuros y poco aumento: se aprecia mejor en prismáticos luminosos o telescopios de campo amplio.',
  },
  M42: {
    descripcion:
      'La Gran Nebulosa de Orión es la región de formación estelar masiva más cercana a la Tierra. En su corazón brilla el Trapecio, un cuarteto de estrellas jóvenes muy calientes que esculpen e iluminan la cavidad gaseosa.',
    distancia: '1.344 años luz',
    consejoExtra:
      'Visible a simple vista como la "estrella borrosa" central de la espada de Orión; con telescopio revela alas extensas y los cuatro soles del Trapecio.',
  },
  M44: {
    descripcion:
      'El Cúmulo del Pesebre (Praesepe) es un cúmulo abierto cercano y espléndido en Cáncer conocido desde la Antigüedad. Contiene cientos de estrellas jóvenes que brillan como un enjambre en prismáticos.',
    distancia: '610 años luz',
  },
  M45: {
    descripcion:
      'Las Pléyades o Siete Hermanas forman el cúmulo abierto más célebre del firmamento. Sus estrellas blanco-azuladas jóvenes atraviesan una nube tenue de polvo interestelar que produce delicadas nebulosas de reflexión.',
    distancia: '444 años luz',
    consejoExtra:
      'Con prismáticos 7×50 o 10×50 se despliegan decenas de estrellas azuladas en forma de pequeño carro resplandeciente.',
  },
  M51: {
    descripcion:
      'La Galaxia del Remolino fue la primera galaxia en la que se descubrió estructura espiral. Está interactuando gravitacionalmente con su compañera NGC 5195, lo que acentúa sus majestuosos brazos.',
    distancia: '23 millones de años luz',
  },
  M57: {
    descripcion:
      'La Nebulosa del Anillo en la Lira muestra una envoltura gaseosa en forma de aro casi perfecto arrojada por una estrella moribunda hace unos pocos miles de años.',
    distancia: '2.570 años luz',
    consejoExtra:
      'Aumenta a 100×–150× en telescopio y usa visión periférica para destacar el interior más oscuro del anillo.',
  },
  M64: {
    descripcion:
      'La Galaxia del Ojo Negro recibe su nombre por una prominente banda oscura de polvo absorbente situada frente a su brillante núcleo, fruto probablemente de una fusión galáctica pasada.',
    distancia: '17 millones de años luz',
  },
  M81: {
    descripcion:
      'La Galaxia de Bode es una de las galaxias espirales de gran diseño más brillantes del cielo norte. Forma una célebre pareja visual junto a la galaxia irregular con brote estelar M82.',
    distancia: '11,8 millones de años luz',
    consejoExtra:
      'Con un ocular de gran campo o prismáticos sobre trípode puedes encuadrar simultáneamente M81 y M82 en la misma vista.',
  },
  M82: {
    descripcion:
      'La Galaxia del Cigarro se observa casi de canto y experimenta un violento episodio de formación estelar desencadenado por la interacción gravitatoria con su vecina M81.',
    distancia: '12 millones de años luz',
  },
  M83: {
    descripcion:
      'El Molinillo Austral es una galaxia espiral barrada brillante y activa en Hidra, famosa por su elevada tasa de supernovas observadas durante el último siglo.',
    distancia: '15 millones de años luz',
  },
  M87: {
    descripcion:
      'Virgo A es una gigantesca galaxia elíptica situada en el corazón del Cúmulo de Virgo. Alberga un agujero negro supermasivo de 6.500 millones de masas solares, el primero cuya sombra fue fotografiada por el Event Horizon Telescope.',
    distancia: '53,5 millones de años luz',
  },
  M97: {
    descripcion:
      'La Nebulosa del Búho es una gran nebulosa planetaria redonda en la Osa Mayor caracterizada por dos cavidades oscuras en su disco que recuerdan los ojos de un búho.',
    distancia: '2.030 años luz',
  },
  M101: {
    descripcion:
      'La Galaxia del Molinete es una enorme espiral vista de frente en la Osa Mayor, con brazos asimétricos extendidos sobre casi el diámetro aparente de la Luna llena.',
    distancia: '21 millones de años luz',
  },
  M104: {
    descripcion:
      'La Galaxia del Sombrero es una espectacular galaxia vista casi de perfil en Virgo, reconocible por su luminoso bulbo central y un nítido carril ecuatorial de polvo oscuro.',
    distancia: '29,3 millones de años luz',
  },
};

function obtenerVisualMessier(obj: ObjetoMessier): {
  category: CelestialCategory;
  kind: 'galaxy_render' | 'star_render';
  primaryColor: string;
  secondaryColor: string;
} {
  if (obj.tipo === 'Galaxia') {
    return {
      category: 'galaxy',
      kind: 'galaxy_render',
      primaryColor: '#a78bfa',
      secondaryColor: '#38bdf8',
    };
  }
  if (obj.tipo === 'Nebulosa' || obj.tipo === 'RemanenteSupernova') {
    return {
      category: 'deep_sky',
      kind: 'galaxy_render',
      primaryColor: '#f472b6',
      secondaryColor: '#22d3ee',
    };
  }
  if (obj.tipo === 'CumuloGlobular') {
    return {
      category: 'deep_sky',
      kind: 'star_render',
      primaryColor: '#fde68a',
      secondaryColor: '#f59e0b',
    };
  }
  return {
    category: 'deep_sky',
    kind: 'star_render',
    primaryColor: '#7dd3fc',
    secondaryColor: '#38bdf8',
  };
}

function construirFichaMessier(obj: ObjetoMessier): CelestialTechnicalSheet {
  const nombreConstelacion = obtenerNombreConstelacionIAU(obj.constelacionIAU);
  const visualBase = obtenerVisualMessier(obj);
  const curada = DESCRIPCIONES_MESSIER[obj.id];
  const titulo = obj.nombreComun ? `${obj.id} · ${obj.nombreComun}` : `${obj.id} (${obj.nombreNGC})`;

  const descripcion =
    curada?.descripcion ??
    `${titulo} es un objeto de cielo profundo clasificado como ${ETIQUETA_TIPO_MESSIER[obj.tipo].toLowerCase()} en la constelación de ${nombreConstelacion}, catalogado también como ${obj.nombreNGC}. Presenta una magnitud aparente de ${obj.magnitud.toFixed(1)} y una extensión angular de ${obj.tamanoArcmin} minutos de arco.`;

  const metrics: CelestialMetric[] = [
    { label: 'Designación', value: `${obj.id} / ${obj.nombreNGC}` },
    { label: 'Tipo', value: ETIQUETA_TIPO_MESSIER[obj.tipo] },
    { label: 'Magnitud aparente', value: obj.magnitud.toFixed(1), unit: 'mag' },
    { label: 'Tamaño angular', value: obj.tamanoArcmin, unit: 'arcmin' },
    { label: 'Constelación', value: `${nombreConstelacion} (${obj.constelacionIAU})` },
    { label: 'Instrumento mín.', value: ETIQUETA_INSTRUMENTO[obj.instrumentoMinimo] },
  ];

  if (curada?.distancia) {
    metrics.splice(1, 0, { label: 'Distancia estimada', value: curada.distancia });
  }

  const observationTips: string[] = [
    `Instrumento mínimo recomendado: ${ETIQUETA_INSTRUMENTO[obj.instrumentoMinimo].toLowerCase()}, preferiblemente lejos de focos de luz urbana.`,
    `Coordenadas J2000 de referencia: AR ${formatearRA(obj.raHoras)} · Dec ${formatearDec(obj.decGrados)} en ${nombreConstelacion}.`,
  ];

  if (curada?.consejoExtra) {
    observationTips.push(curada.consejoExtra);
  } else if (obj.tipo === 'Galaxia') {
    observationTips.push(
      'Utiliza visión periférica (mirando ligeramente a un lado del centro) y evita noches con Luna brillante para percibir el halo galáctico.'
    );
  } else if (obj.tipo === 'Nebulosa' || obj.tipo === 'RemanenteSupernova') {
    observationTips.push(
      'Un filtro interferencial UHC u OIII en telescopio ayuda a realzar el contraste de la nebulosidad frente al fondo del cielo.'
    );
  } else {
    observationTips.push(
      'Empieza con aumentos bajos para centrar el cúmulo en su campo estelar y sube progresivamente para resolver las estrellas más compactas.'
    );
  }

  return {
    id: obj.id,
    name: titulo,
    category: visualBase.category,
    subtitle: `${ETIQUETA_TIPO_MESSIER[obj.tipo]} · ${obj.nombreNGC} · ${nombreConstelacion}`,
    description: descripcion,
    metrics,
    observationTips,
    visual: {
      kind: visualBase.kind,
      primaryColor: visualBase.primaryColor,
      secondaryColor: visualBase.secondaryColor,
      altText: `Visualización estilizada de ${titulo}, ${ETIQUETA_TIPO_MESSIER[obj.tipo].toLowerCase()} en ${nombreConstelacion}`,
    },
  };
}

/* ── Fichas curadas y derivadas de estrellas con nombre propio ────── */

const ESTRELLAS_CURADAS: Readonly<
  Record<string, { descripcion: string; distancia: string; espectro?: string }>
> = {
  'Alp CMa': {
    descripcion:
      'Sirio es la estrella más brillante de todo el cielo nocturno. Se trata en realidad de un sistema binario cercano formado por una estrella blanca de secuencia principal (Sirio A) y la famosa enana blanca Sirio B.',
    distancia: '8,6 años luz',
    espectro: 'A1V + DA2',
  },
  'Alp Car': {
    descripcion:
      'Canopus es la segunda estrella más luminosa del firmamento y una supergigante blanco-amarillenta tan brillante que sirve como faro de referencia para la navegación de sondas espaciales interplanetarias.',
    distancia: '310 años luz',
    espectro: 'A9II',
  },
  'Alp Cen': {
    descripcion:
      'Alfa Centauri es el sistema estelar más próximo al Sistema Solar. Está compuesto por dos estrellas similares al Sol (Rigil Kentaurus y Toliman) acompañadas por la enana roja Próxima Centauri.',
    distancia: '4,37 años luz',
    espectro: 'G2V + K1V',
  },
  'Alp Boo': {
    descripcion:
      'Arturo es una gigante naranja majestuosa y la estrella más brillante del hemisferio norte celeste. Su diámetro supera en unas 25 veces al del Sol y brilla con una tonalidad ambarina inconfundible en primavera.',
    distancia: '36,7 años luz',
    espectro: 'K1.5III',
  },
  'Alp Lyr': {
    descripcion:
      'Vega es una estrella blanco-azulada de rotación vertiginosa que sirvió históricamente como patrón cero de la escala de magnitudes fotográficas. Debido a la precesión terrestre, volverá a ser nuestra Estrella Polar dentro de unos 12.000 años.',
    distancia: '25,0 años luz',
    espectro: 'A0Va',
  },
  'Alp Aur': {
    descripcion:
      'Capella parece un único faro dorado en Auriga, pero es un complejo sistema cuádruple dominado por un par de estrellas gigantes amarillas que orbitan muy cerca entre sí.',
    distancia: '42,9 años luz',
    espectro: 'G8III + G0III',
  },
  'Bet Ori': {
    descripcion:
      'Rigel es una colosal supergigante azul en el pie de Orión cuya luminosidad real supera en más de 100.000 veces a la del Sol. Su radiación intensa ilumina la cercana Nebulosa Cabeza de Bruja.',
    distancia: '863 años luz',
    espectro: 'B8Ia',
  },
  'Alp CMi': {
    descripcion:
      'Proción significa "antes del perro" en griego porque asoma por el horizonte poco antes que Sirio. Al igual que Sirio, forma un sistema binario cercano acompañado de una enana blanca.',
    distancia: '11,5 años luz',
    espectro: 'F5IV-V',
  },
  'Alp Ori': {
    descripcion:
      'Betelgeuse es una supergigante roja semirregular en el hombro oriental de Orión. Si ocupara el lugar del Sol, su fotosfera se extendería más allá de la órbita de Marte y se acercaría a la de Júpiter.',
    distancia: '~548 años luz',
    espectro: 'M1-M2Ia-ab',
  },
  'Alp Tau': {
    descripcion:
      'Aldebarán, el "Ojo del Toro", es una gigante naranja brillante situada visualmente frente al cúmulo de las Híades, aunque en realidad se encuentra a menos de la mitad de distancia que dicho cúmulo.',
    distancia: '65,3 años luz',
    espectro: 'K5III',
  },
  'Alp Vir': {
    descripcion:
      'Espiga (Spica) es un par de estrellas gigantes azules tan próximas entre sí que se deforman mutuamente por fuerzas de marea y completan una órbita cada cuatro días.',
    distancia: '250 años luz',
    espectro: 'B1III-IV',
  },
  'Alp Sco': {
    descripcion:
      'Antares ("rival de Marte") es una descomunal supergigante roja en el corazón de Escorpio cuyo tono rojizo compite con el del planeta Marte cuando este cruza la constelación.',
    distancia: '550 años luz',
    espectro: 'M1.5Iab',
  },
  'Alp UMi': {
    descripcion:
      'Polaris es una supergigante amarilla variable cefeida y estrella triple situada a menos de 0,7° del polo norte celeste, lo que la mantiene aparentemente inmóvil mientras el resto del cielo gira a su alrededor.',
    distancia: '433 años luz',
    espectro: 'F7Ib',
  },
  'Alp Aql': {
    descripcion:
      'Altair es una de las estrellas brillantes más cercanas a la Tierra y gira tan deprisa sobre sí misma (en unas 9 horas) que su ecuador está notablemente achatado.',
    distancia: '16,7 años luz',
    espectro: 'A7V',
  },
  'Alp Cyg': {
    descripcion:
      'Deneb es una de las estrellas más intrínsecamente luminosas visibles a simple vista: aunque se halla a miles de años luz de distancia, destaca con facilidad en el Triángulo de Verano.',
    distancia: '~2.600 años luz',
    espectro: 'A2Ia',
  },
  'Alp Leo': {
    descripcion:
      'Régulo ("pequeño rey") marca el corazón de Leo casi exactamente sobre la eclíptica, por lo que con frecuencia es ocultada por la Luna o visitada de cerca por los planetas.',
    distancia: '79,3 años luz',
    espectro: 'B8IVn',
  },
  'Bet Gem': {
    descripcion:
      'Pólux es una gigante naranja más brillante que su gemelo Cástor y alberga un exoplaneta confirmado de masa superior a la de Júpiter.',
    distancia: '33,8 años luz',
    espectro: 'K0III',
  },
  'Alp PsA': {
    descripcion:
      'Fomalhaut domina los cielos despejados del otoño austral y boreal sur; es una estrella joven rodeada por un prominente disco de escombros helados.',
    distancia: '25,1 años luz',
    espectro: 'A3V',
  },
  'Bet Per': {
    descripcion:
      'Algol es el arquetipo de las estrellas binarias eclipsantes: cada 2 días y 21 horas su compañera más tenue pasa por delante provocando una caída drástica y observable de brillo a simple vista.',
    distancia: '90 años luz',
    espectro: 'B8V + K0IV',
  },
  'Bet1 Cyg': {
    descripcion:
      'Albireo es una de las estrellas dobles visuales más bellas del cielo nocturno, apreciable con cualquier telescopio pequeño por el llamativo contraste entre su componente dorada y su compañera azul zafiro.',
    distancia: '430 años luz',
    espectro: 'K3II + B8V',
  },
};

function obtenerCodigoConstelacionEstrella(idEstrella: string): string | null {
  const partes = idEstrella.trim().split(/\s+/);
  const sufijo = (partes[partes.length - 1] ?? '').toUpperCase();
  return sufijo.length === 3 ? sufijo : null;
}

function construirFichaEstrella(estrella: EstrellaCatalogo): CelestialTechnicalSheet | undefined {
  // Las estrellas sin nombre propio quedan sin ficha enriquecida para validar el estado fallback/empty con efemérides en vivo
  if (!estrella.nombre) return undefined;

  const codigoConst = obtenerCodigoConstelacionEstrella(estrella.id);
  const nombreConst = codigoConst ? obtenerNombreConstelacionIAU(codigoConst) : 'Bóveda celeste';
  const espectroInfo = estimarClaseEspectral(estrella.indiceColorBV);
  const curada = ESTRELLAS_CURADAS[estrella.id];

  const descripcion =
    curada?.descripcion ??
    `${estrella.nombre} (${estrella.id}) es una estrella destacada de la constelación de ${nombreConst} con magnitud aparente ${estrella.magnitud.toFixed(2)}. Su índice de color B−V indica un tono ${espectroInfo.descripcionColor} correspondiente a una estrella de ${espectroInfo.clase.toLowerCase()}.`;

  const metrics: CelestialMetric[] = [
    { label: 'Designación', value: estrella.id },
    { label: 'Magnitud aparente', value: estrella.magnitud.toFixed(2), unit: 'mag' },
    { label: 'Constelación', value: codigoConst ? `${nombreConst} (${codigoConst})` : nombreConst },
    {
      label: 'Tipo espectral',
      value: curada?.espectro ?? espectroInfo.clase,
    },
    {
      label: curada?.distancia ? 'Distancia' : 'Temp. estimada',
      value: curada?.distancia ?? espectroInfo.temperatura,
    },
    {
      label: 'Coordenadas J2000',
      value: `${formatearRA(estrella.raHoras)} / ${formatearDec(estrella.decGrados)}`,
    },
  ];

  const observationTips: string[] = [
    `Visible a simple vista incluso desde entornos con contaminación lumínica moderada (mag ${estrella.magnitud.toFixed(1)}).`,
    `Fíjate en su matiz ${espectroInfo.descripcionColor}; desenfocar muy ligeramente el ocular de unos prismáticos o telescopio acentúa el color real de la estrella.`,
    `Sirve como estrella guía de salto estelar para orientarte dentro de ${nombreConst}.`,
  ];

  return {
    id: estrella.id,
    name: estrella.nombre,
    category: 'star',
    subtitle: `Estrella (${estrella.id}) · ${nombreConst}`,
    description: descripcion,
    metrics,
    observationTips,
    visual: {
      kind: 'star_render',
      primaryColor: espectroInfo.colorPrimario,
      secondaryColor: espectroInfo.colorSecundario,
      altText: `Representación luminosa de la estrella ${estrella.nombre} (${estrella.id}) de color ${espectroInfo.descripcionColor}`,
    },
  };
}

/* ── Caché perezosa bajo demanda e índices diferidos ──────────────── */

const cacheFichasTecnicas = new Map<string, CelestialTechnicalSheet>();

let indiceConstelaciones: Map<string, ConstelacionIAU> | null = null;
let indiceMessier: Map<string, ObjetoMessier> | null = null;
let indiceEstrellasConNombre: Map<string, EstrellaCatalogo> | null = null;

function obtenerIndiceConstelaciones(): Map<string, ConstelacionIAU> {
  if (!indiceConstelaciones) {
    indiceConstelaciones = new Map(CONSTELACIONES_IAU.map((c) => [c.codigo, c]));
  }
  return indiceConstelaciones;
}

function obtenerIndiceMessier(): Map<string, ObjetoMessier> {
  if (!indiceMessier) {
    indiceMessier = new Map(CATALOGO_MESSIER.map((m) => [m.id, m]));
  }
  return indiceMessier;
}

function obtenerIndiceEstrellasConNombre(): Map<string, EstrellaCatalogo> {
  if (!indiceEstrellasConNombre) {
    indiceEstrellasConNombre = new Map(
      CATALOGO_ESTRELLAS.filter((e) => Boolean(e.nombre)).map((e) => [e.id, e])
    );
  }
  return indiceEstrellasConNombre;
}

function resolverEntradaCatalogo(id: string):
  | { tipo: 'sistema_solar'; claveCanon: string; ficha: CelestialTechnicalSheet }
  | { tipo: 'constelacion'; claveCanon: string; dato: ConstelacionIAU }
  | { tipo: 'messier'; claveCanon: string; dato: ObjetoMessier }
  | { tipo: 'estrella'; claveCanon: string; dato: EstrellaCatalogo }
  | null {
  const limpio = id.trim();
  if (limpio.length === 0) return null;

  if (limpio.startsWith('constelacion:')) {
    const codigo = limpio.slice('constelacion:'.length).trim().toUpperCase();
    const dato = obtenerIndiceConstelaciones().get(codigo);
    return dato ? { tipo: 'constelacion', claveCanon: dato.codigo, dato } : null;
  }

  if (limpio.startsWith('messier:')) {
    const codigo = limpio.slice('messier:'.length).trim().toUpperCase();
    const dato = obtenerIndiceMessier().get(codigo);
    return dato ? { tipo: 'messier', claveCanon: dato.id, dato } : null;
  }

  if (limpio.startsWith('estrella:')) {
    const idEstrella = limpio.slice('estrella:'.length).trim();
    const dato = obtenerIndiceEstrellasConNombre().get(idEstrella);
    return dato ? { tipo: 'estrella', claveCanon: dato.id, dato } : null;
  }

  if (Object.prototype.hasOwnProperty.call(FICHAS_SISTEMA_SOLAR, limpio)) {
    return {
      tipo: 'sistema_solar',
      claveCanon: limpio,
      ficha: FICHAS_SISTEMA_SOLAR[limpio],
    };
  }

  const constelacion = obtenerIndiceConstelaciones().get(limpio);
  if (constelacion) {
    return { tipo: 'constelacion', claveCanon: constelacion.codigo, dato: constelacion };
  }

  const messier = obtenerIndiceMessier().get(limpio);
  if (messier) {
    return { tipo: 'messier', claveCanon: messier.id, dato: messier };
  }

  const estrella = obtenerIndiceEstrellasConNombre().get(limpio);
  if (estrella) {
    return { tipo: 'estrella', claveCanon: estrella.id, dato: estrella };
  }

  return null;
}

function tieneFichaTecnica(id: string): boolean {
  if (cacheFichasTecnicas.has(id)) return true;
  return resolverEntradaCatalogo(id) !== null;
}

function listarIdsConFichaTecnica(): string[] {
  return [
    ...Object.keys(FICHAS_SISTEMA_SOLAR),
    ...obtenerIndiceConstelaciones().keys(),
    ...obtenerIndiceMessier().keys(),
    ...obtenerIndiceEstrellasConNombre().keys(),
  ];
}

/**
 * Obtiene bajo demanda la ficha técnica de un cuerpo celeste (planeta, Luna,
 * constelación IAU, objeto Messier o estrella con nombre propio) usando caché en memoria.
 * Acepta tanto IDs canónicos (`UMI`, `M31`, `Alp UMi`) como prefijados (`constelacion:UMI`).
 */
export function obtenerFichaTecnica(id: string): CelestialTechnicalSheet | undefined {
  if (typeof id !== 'string' || id.trim().length === 0) return undefined;

  const enCacheDirecta = cacheFichasTecnicas.get(id);
  if (enCacheDirecta) return enCacheDirecta;

  const entrada = resolverEntradaCatalogo(id);
  if (!entrada) return undefined;

  const enCacheCanon = cacheFichasTecnicas.get(entrada.claveCanon);
  if (enCacheCanon) return enCacheCanon;

  let ficha: CelestialTechnicalSheet | undefined;
  if (entrada.tipo === 'sistema_solar') {
    ficha = entrada.ficha;
  } else if (entrada.tipo === 'constelacion') {
    ficha = construirFichaConstelacion(entrada.dato);
  } else if (entrada.tipo === 'messier') {
    ficha = construirFichaMessier(entrada.dato);
  } else {
    ficha = construirFichaEstrella(entrada.dato);
  }

  if (ficha) {
    cacheFichasTecnicas.set(entrada.claveCanon, ficha);
  }

  return ficha;
}

/**
 * Acceso retrocompatible respaldado por evaluación perezosa (`Proxy` + `cacheFichasTecnicas`).
 * Garantiza cero cálculos trigonométricos al importar el módulo.
 */
export const CELESTIAL_TECHNICAL_SHEETS: Readonly<Record<string, CelestialTechnicalSheet>> =
  new Proxy<Record<string, CelestialTechnicalSheet>>(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        return obtenerFichaTecnica(prop);
      },
      has(_target, prop) {
        if (typeof prop !== 'string') return false;
        return tieneFichaTecnica(prop);
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (typeof prop !== 'string' || !tieneFichaTecnica(prop)) return undefined;
        return {
          configurable: true,
          enumerable: true,
          value: obtenerFichaTecnica(prop),
          writable: false,
        };
      },
      ownKeys() {
        return listarIdsConFichaTecnica();
      },
    }
  );

/**
 * Conjunto completo de IDs válidos y seleccionables en el observatorio
 * (planetas, Luna, 88 constelaciones IAU, 110 objetos Messier y catálogo estelar mag <= 4).
 */
export const VALID_CELESTIAL_IDS: ReadonlySet<string> = new Set<string>([
  ...Object.keys(FICHAS_SISTEMA_SOLAR),
  ...CONSTELACIONES_IAU.map((c) => c.codigo),
  ...CATALOGO_MESSIER.map((m) => m.id),
  ...CATALOGO_ESTRELLAS.map((e) => e.id),
]);
