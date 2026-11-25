2. Batería de Tests Unitarios (Vitest)Nota rápida de configuración: vitest no está aún en package.json. Instálalo con npm i -D vitest y añade "test": "vitest run" en scripts de package.json. El archivo está tipado en modo estricto compatible con tu tsconfig.app.json (verbatimModuleSyntax, noUnusedLocals, sin any).   TypeScriptimport { describe, it, expect } from 'vitest';
import {
  esEntradaAstronomicaValida,
  calcularEstadoSolar,
  calcularCielo,
  calcularEstrellas,
  calcularMessier,
} from '../skyCalculator';
import { calcularProximosEventos } from '../eventsCalculator';
import { ESTRELLAS_BRILLANTES } from '../../data/brightStars';
import { CATALOGO_MESSIER } from '../../data/messierCatalog';
import type { Ubicacion } from '../../types/astronomy';

const VALENCIA: Ubicacion = {
  latitud: 39.47,
  longitud: -0.38,
  altitud: 150,
  nombre: 'Valencia',
};

const POLO_NORTE: Ubicacion = {
  latitud: 90,
  longitud: 0,
  altitud: 0,
  nombre: 'Polo Norte',
};

const POLO_SUR: Ubicacion = {
  latitud: -90,
  longitud: 0,
  altitud: 0,
  nombre: 'Polo Sur',
};

describe('Validación defensiva de entradas astronómicas (esEntradaAstronomicaValida)', () => {
  const fechaValida = new Date('2026-06-21T22:00:00Z');

  it('acepta coordenadas exactamente en los límites válidos (-90/90 y -180/180)', () => {
    const limitesValidos: Ubicacion[] = [
      { latitud: -90, longitud: -180, altitud: 0, nombre: 'Límite SW' },
      { latitud: 90, longitud: 180, altitud: 8848, nombre: 'Límite NE' },
      { latitud: 0, longitud: 0, altitud: -430, nombre: 'Null Island / Mar Muerto' },
    ];

    for (const ubicacion of limitesValidos) {
      expect(esEntradaAstronomicaValida(fechaValida, ubicacion)).toBe(true);
    }
  });

  it('rechaza latitudes fuera de [-90, 90] y valores no finitos', () => {
    const latitudesInvalidas = [-90.0001, 90.0001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

    for (const latitud of latitudesInvalidas) {
      expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, latitud })).toBe(false);
    }
  });

  it('rechaza longitudes fuera de [-180, 180] y valores no finitos', () => {
    const longitudesInvalidas = [-180.0001, 180.0001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

    for (const longitud of longitudesInvalidas) {
      expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, longitud })).toBe(false);
    }
  });

  it('rechaza altitudes no finitas y fechas inválidas (Invalid Date)', () => {
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.NaN })).toBe(false);
    expect(esEntradaAstronomicaValida(fechaValida, { ...VALENCIA, altitud: Number.POSITIVE_INFINITY })).toBe(false);
    expect(esEntradaAstronomicaValida(new Date('fecha-invalida'), VALENCIA)).toBe(false);
  });

  it('devuelve fallbacks seguros (null / []) en todas las funciones core ante entradas corruptas', () => {
    const fechaRota = new Date(Number.NaN);
    const ubicacionRota: Ubicacion = { ...VALENCIA, latitud: 95 };

    expect(calcularEstadoSolar(fechaRota, VALENCIA)).toBeNull();
    expect(calcularEstadoSolar(fechaValida, ubicacionRota)).toBeNull();
    expect(calcularCielo(fechaValida, ubicacionRota)).toEqual([]);
    expect(calcularEstrellas(fechaValida, ubicacionRota)).toEqual([]);
    expect(calcularMessier(fechaValida, ubicacionRota)).toEqual([]);
    expect(calcularProximosEventos(fechaRota, VALENCIA)).toEqual([]);
  });
});

describe('Cálculos solares y clasificación de crepúsculos (calcularEstadoSolar)', () => {
  it('clasifica correctamente el mediodía y la medianoche astronómica en Valencia', () => {
    const mediodiaVerano = new Date('2026-06-21T12:00:00Z');
    const medianocheInvierno = new Date('2026-12-21T00:00:00Z');

    const estadoDia = calcularEstadoSolar(mediodiaVerano, VALENCIA);
    const estadoNoche = calcularEstadoSolar(medianocheInvierno, VALENCIA);

    expect(estadoDia).not.toBeNull();
    expect(estadoDia?.fase).toBe('Día');
    expect(estadoDia!.altitudSol).toBeGreaterThan(60);

    expect(estadoNoche).not.toBeNull();
    expect(estadoNoche?.fase).toBe('Noche astronómica');
    expect(estadoNoche!.altitudSol).toBeLessThan(-18);
  });

  it('mantiene coherencia matemática entre altitudSol y la etiqueta de fase', () => {
    // Muestreamos las 24 horas del equinoccio en Valencia para cubrir todas las franjas de crepúsculo
    const fasesVistas = new Set<string>();

    for (let hora = 0; hora < 24; hora++) {
      const fecha = new Date(Date.UTC(2026, 2, 20, hora, 15, 0));
      const estado = calcularEstadoSolar(fecha, VALENCIA);
      expect(estado).not.toBeNull();

      const { altitudSol, fase } = estado!;
      fasesVistas.add(fase);

      if (altitudSol >= 0.1) expect(fase).toBe('Día');
      else if (altitudSol <= -18.1) expect(fase).toBe('Noche astronómica');
    }

    expect(fasesVistas.has('Día')).toBe(true);
    expect(fasesVistas.has('Noche astronómica')).toBe(true);
  });
});

describe('Efemérides del Sistema Solar, Estrellas (precesión J2000) y Messier', () => {
  const fechaReferencia = new Date('2026-08-12T22:00:00Z');

  it('calcula los 8 cuerpos celestes ordenados de mayor a menor altitud e incluye fase lunar', () => {
    const cuerpos = calcularCielo(fechaReferencia, VALENCIA);

    expect(cuerpos).toHaveLength(8);

    // Orden descendente estricto por altitud
    for (let i = 1; i < cuerpos.length; i++) {
      expect(cuerpos[i - 1].altitud).toBeGreaterThanOrEqual(cuerpos[i].altitud);
    }

    const direccionesValidas = new Set(['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']);
    for (const cuerpo of cuerpos) {
      expect(cuerpo.altitud).toBeGreaterThanOrEqual(-90);
      expect(cuerpo.altitud).toBeLessThanOrEqual(90);
      expect(cuerpo.acimut).toBeGreaterThanOrEqual(0);
      expect(cuerpo.acimut).toBeLessThanOrEqual(360);
      expect(direccionesValidas.has(cuerpo.direccion)).toBe(true);
      expect(Number.isFinite(cuerpo.magnitud)).toBe(true);
    }

    const luna = cuerpos.find((c) => c.tipo === 'luna');
    expect(luna).toBeDefined();
    expect(luna?.faseLunar).toBeTruthy();
    expect(luna?.anguloFase).toBeGreaterThanOrEqual(0);
    expect(luna?.anguloFase).toBeLessThan(360);
    expect(luna?.iluminacion).toBeGreaterThanOrEqual(0);
    expect(luna?.iluminacion).toBeLessThanOrEqual(100);
  });

  it('devuelve todas las estrellas y objetos Messier respetando umbrales de visibilidad (>0° y >10°)', () => {
    const estrellas = calcularEstrellas(fechaReferencia, VALENCIA);
    const messier = calcularMessier(fechaReferencia, VALENCIA);

    expect(estrellas).toHaveLength(ESTRELLAS_BRILLANTES.length);
    expect(messier).toHaveLength(CATALOGO_MESSIER.length);

    for (const est of estrellas) {
      if (est.altitud > 0.1) expect(est.visible).toBe(true);
      if (est.altitud < -0.1) expect(est.visible).toBe(false);
    }

    for (const obj of messier) {
      if (obj.altitud > 10.1) expect(obj.visible).toBe(true);
      if (obj.altitud < 9.9) expect(obj.visible).toBe(false);
    }
  });
});

describe('Casos borde geográficos (Polos y Antimeridiano ±180°)', () => {
  it('reproduce el sol de medianoche y la noche polar en solsticios de junio y diciembre', () => {
    const solsticioJunio = new Date('2026-06-21T12:00:00Z');
    const solsticioDiciembre = new Date('2026-12-21T12:00:00Z');

    const norteJunio = calcularEstadoSolar(solsticioJunio, POLO_NORTE);
    const surJunio = calcularEstadoSolar(solsticioJunio, POLO_SUR);

    expect(norteJunio?.fase).toBe('Día');
    expect(norteJunio!.altitudSol).toBeGreaterThan(20);
    expect(surJunio?.fase).toBe('Noche astronómica');
    expect(surJunio!.altitudSol).toBeLessThan(-20);

    const norteDic = calcularEstadoSolar(solsticioDiciembre, POLO_NORTE);
    const surDic = calcularEstadoSolar(solsticioDiciembre, POLO_SUR);

    expect(norteDic?.fase).toBe('Noche astronómica');
    expect(norteDic!.altitudSol).toBeLessThan(-20);
    expect(surDic?.fase).toBe('Día');
    expect(surDic!.altitudSol).toBeGreaterThan(20);
  });

  it('sitúa a Polaris cerca del cenit en el Polo Norte y bajo el horizonte en el Polo Sur', () => {
    const fecha = new Date('2026-03-20T00:00:00Z');

    const polarisNorte = calcularEstrellas(fecha, POLO_NORTE).find((e) => e.id === 'polaris');
    const polarisSur = calcularEstrellas(fecha, POLO_SUR).find((e) => e.id === 'polaris');

    expect(polarisNorte).toBeDefined();
    expect(polarisNorte!.altitud).toBeGreaterThan(88);
    expect(polarisNorte!.visible).toBe(true);

    expect(polarisSur).toBeDefined();
    expect(polarisSur!.altitud).toBeLessThan(-88);
    expect(polarisSur!.visible).toBe(false);
  });

  it('produce resultados idénticos en longitud -180° y +180° (mismo meridiano)', () => {
    const fecha = new Date('2026-09-22T18:00:00Z');
    const oeste: Ubicacion = { latitud: 15, longitud: -180, altitud: 0, nombre: 'Antimeridiano O' };
    const este: Ubicacion = { latitud: 15, longitud: 180, altitud: 0, nombre: 'Antimeridiano E' };

    expect(calcularEstadoSolar(fecha, oeste)).toEqual(calcularEstadoSolar(fecha, este));
    expect(calcularCielo(fecha, oeste)).toEqual(calcularCielo(fecha, este));
  });
});

describe('Invariancia ante cambios de huso horario UTC y cruce de medianoche/año', () => {
  it('genera exactamente el mismo cielo para el mismo instante en distintos offsets horarios', () => {
    const enUTC = new Date('2026-08-12T22:00:00Z');
    const enCEST = new Date('2026-08-13T00:00:00+02:00'); // Ya es día 13 en España
    const enEDT = new Date('2026-08-12T18:00:00-04:00');

    expect(calcularEstadoSolar(enUTC, VALENCIA)).toEqual(calcularEstadoSolar(enCEST, VALENCIA));
    expect(calcularEstadoSolar(enUTC, VALENCIA)).toEqual(calcularEstadoSolar(enEDT, VALENCIA));
    expect(calcularCielo(enUTC, VALENCIA)).toEqual(calcularCielo(enCEST, VALENCIA));
    expect(calcularEstrellas(enUTC, VALENCIA)).toEqual(calcularEstrellas(enEDT, VALENCIA));
  });

  it('mantiene continuidad suave al cruzar la medianoche UTC y el cambio de año', () => {
    const antesCambioAnio = new Date('2026-12-31T23:59:30Z');
    const despuesCambioAnio = new Date('2027-01-01T00:00:30Z');

    const lunaAntes = calcularCielo(antesCambioAnio, VALENCIA).find((c) => c.tipo === 'luna');
    const lunaDespues = calcularCielo(despuesCambioAnio, VALENCIA).find((c) => c.tipo === 'luna');

    expect(lunaAntes).toBeDefined();
    expect(lunaDespues).toBeDefined();
    // En 1 minuto el movimiento aparente en altitud no debe superar ~0.5°
    expect(Math.abs(lunaDespues!.altitud - lunaAntes!.altitud)).toBeLessThan(0.5);
  });

  it('ordena los próximos eventos celestes y proyecta correctamente el salto al año siguiente', () => {
    const finDeAnio = new Date('2026-12-28T12:00:00Z');
    const eventos = calcularProximosEventos(finDeAnio, VALENCIA);

    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos.length).toBeLessThanOrEqual(6);

    for (let i = 1; i < eventos.length; i++) {
      expect(eventos[i].fechaPico.getTime()).toBeGreaterThanOrEqual(
        eventos[i - 1].fechaPico.getTime()
      );
    }

    // Las Cuadrántidas (4 de enero) deben proyectarse a enero de 2027
    const cuadrantidas = eventos.find((ev) => ev.id.startsWith('lluvia-cuadrantidas-'));
    expect(cuadrantidas).toBeDefined();
    expect(cuadrantidas?.fechaPico.getFullYear()).toBe(2027);
    expect(cuadrantidas!.diasRestantes).toBeGreaterThanOrEqual(0);
  });
});
3. Pitch para CV y Post Técnico para LinkedInResumen para el CV (4 líneas)SkyProject — Mapa Celeste y Efemérides Offline-First (React 19, TypeScript estricto, Vite, Tailwind CSS v4, Capacitor)
Desarrollé una aplicación web de astronomía observacional capaz de calcular en tiempo real efemérides planetarias, estrellas con precesión J2000, objetos Messier y eclipses locales mediante astronomy-engine sin depender de un backend.
Construí un motor de renderizado interactivo en <canvas> 2D/3D nativo (sin librerías 3D) con soporte táctil (Pointer Events), proyección en perspectiva, terminador lunar en SVG y modo de visión nocturna con filtro rojo.
Integré previsión meteorológica con Open-Meteo sincronizada en UTC, prevención de race conditions con AbortController, caché offline en localStorage y validación defensiva en tiempo de ejecución mediante Type Guards sin any.   Post técnico listo para publicar en LinkedInAcabo de cerrar una nueva etapa en SkyProject, mi aplicación web offline-first de astronomía observacional construida con React 19, TypeScript estricto, Vite y Tailwind CSS v4.   Más allá de mostrar planetas en pantalla, este proyecto ha sido mi laboratorio para resolver problemas reales de ingeniería frontend sin sobre-ingeniería ni dependencias innecesarias. Estos son los 4 retos técnicos que más me han hecho aprender:🔭 1. Cálculo astronómico local y precesión J2000
En lugar de depender de una API de pago, todos los cálculos de planetas, Luna, crepúsculos, eclipses locales y catálogos (estrellas brillantes + Messier) se ejecutan en el cliente con astronomy-engine. Para evitar desviaciones en las estrellas fijas, aplico la matriz de rotación de época J2000 a la fecha actual una sola vez por frame y reutilizo la transformación sobre todo el catálogo.   🎨 2. Planisferio 2D y Bóveda 3D en <canvas> nativo (sin Three.js)
Quería que la app fuera ligera y preparada para móvil (Capacitor). Implementé la proyección esférica con rotación de cámara, perspectiva y ordenación por profundidad (Painter's Algorithm) directamente sobre la API 2D de Canvas, soportando pantallas HiDPI y arrastre táctil fluido con Pointer Events y setPointerCapture.   ⚡ 3. Concurrencia limpia y meteorología offline-first en UTCAl integrar la API de Open-Meteo (nubosidad por capas, viento y humedad), resolví tres problemas clásicos:Debounce + AbortController para cancelar peticiones en vuelo al cambiar rápido de hora o coordenadas y evitar race conditions.Estado de carga derivado por clave de consulta, evitando setState síncronos dentro de useEffect (100 % compatible con las reglas estrictas de React 19).Cruce horario en UTC y caché en localStorage con degradación elegante si te quedas sin cobertura en mitad del campo.🛡️ 4. TypeScript estricto de verdad (cero any)
Como los tipos no existen en runtime, cada lectura de localStorage, cada respuesta de la API y cada coordenada introducida por el usuario pasa por Type Guards y validaciones defensivas antes de tocar el motor matemático.   Además, añadí un modo Filtro Rojo para proteger la adaptación ocular nocturna y un indicador de fase lunar renderizado en SVG puro calculando la curva elíptica del terminador.   Si quieres curiosear el código, dar feedback o proponer mejoras, el repositorio está abierto en mi GitHub (AlejandroGutierrezDEV).¿Qué reto de renderizado o gestión de estado en frontend te ha dado más guerra últimamente? Te leo en comentarios 👇#React #TypeScript #Frontend #WebDevelopment #Canvas #Vite #TailwindCSS #JavaScript #Portfolio #JuniorDeveloper