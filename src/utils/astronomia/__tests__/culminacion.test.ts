import { describe, expect, it } from 'vitest';
import {
  calcularCulminacionAstro,
  calcularTiempoSidereoLocal,
  calcularVentanaNocturna,
  ordenarPorCulminacionNocturna,
} from '../culminacion';
import type { ObjetivoPlanificado } from '../../../types/astronomy';

const LAT_VALENCIA = 39.47;
const LON_VALENCIA = -0.38;
const LAT_SIDNEY = -33.87;
const LON_SIDNEY = 151.21;

function crearObjetivoBase(
  overrides: Partial<ObjetivoPlanificado>
): ObjetivoPlanificado {
  return {
    id: 'messier-M31',
    codigo: 'M31',
    nombre: 'Galaxia de Andrómeda',
    categoria: 'messier',
    magnitud: 3.4,
    constelacion: 'Andrómeda',
    raHoras: 0.712,
    decGrados: 41.27,
    observado: false,
    horaCulminacion: null,
    altitudMaximaGrados: 88.2,
    estadoVisibilidad: 'optimo_noche',
    etiquetaHoraria: '00:00 (Alt. máx 88°)',
    ...overrides,
  };
}

describe('Cálculo de culminación meridiana (culminacion.ts)', () => {
  it('calcula el tránsito exacto (HA = 0) y la altitud máxima para un astro que culmina de noche', () => {
    // Equinoccio de otoño / noche en Valencia: M31 (RA ~0.712h, Dec +41.27°) culmina de noche en octubre
    const fecha = new Date('2026-10-15T20:00:00Z');
    const resultado = calcularCulminacionAstro(
      0.712,
      41.27,
      LAT_VALENCIA,
      LON_VALENCIA,
      fecha
    );

    expect(resultado.estadoVisibilidad).toBe('optimo_noche');
    expect(resultado.horaCulminacion).toBeInstanceOf(Date);
    expect(resultado.altitudMaximaGrados).toBeCloseTo(
      90 - Math.abs(LAT_VALENCIA - 41.27),
      1
    );
    expect(resultado.etiquetaHoraria).toMatch(/^\d{2}:\d{2} \(Alt\. máx \d+°\)$/);

    // Verificar que en la hora calculada LST ≈ RA (HA = 0 con error < 1 minuto sidéreo)
    const lstEnCulminacion = calcularTiempoSidereoLocal(
      resultado.horaCulminacion as Date,
      LON_VALENCIA
    );
    const diffHoras = Math.abs(
      ((((lstEnCulminacion - 0.712 + 12) % 24) + 24) % 24) - 12
    );
    expect(diffHoras).toBeLessThan(1 / 60);
  });

  it('marca nunca_sale y horaCulminacion null para astros bajo el horizonte en ambos hemisferios', () => {
    const fecha = new Date('2026-06-15T22:00:00Z');

    // Hemisferio norte (+39.47°): Acrux (Dec -63.1° <= 39.47 - 90 = -50.53°) nunca sale
    const acruxDesdeValencia = calcularCulminacionAstro(
      12.443,
      -63.1,
      LAT_VALENCIA,
      LON_VALENCIA,
      fecha
    );
    expect(acruxDesdeValencia.estadoVisibilidad).toBe('nunca_sale');
    expect(acruxDesdeValencia.horaCulminacion).toBeNull();
    expect(acruxDesdeValencia.etiquetaHoraria).toBe('No visible desde esta latitud');

    // Hemisferio sur (-33.87°): Polaris (Dec +89.26° >= -33.87 + 90 = +56.13°) nunca sale
    const polarisDesdeSidney = calcularCulminacionAstro(
      2.53,
      89.26,
      LAT_SIDNEY,
      LON_SIDNEY,
      fecha
    );
    expect(polarisDesdeSidney.estadoVisibilidad).toBe('nunca_sale');
    expect(polarisDesdeSidney.horaCulminacion).toBeNull();
    expect(polarisDesdeSidney.etiquetaHoraria).toBe('No visible desde esta latitud');
  });

  it('clasifica culminación diurna como visible_parcial indicando poniéndose tras anochecer o saliendo antes del amanecer', () => {
    const fecha = new Date('2026-03-21T20:00:00Z');
    const ventana = calcularVentanaNocturna(LAT_VALENCIA, LON_VALENCIA, fecha);

    // LST al anochecer menos 4 horas => culminó 4 horas antes de anochecer (se está poniendo)
    const lstAnochecer = calcularTiempoSidereoLocal(ventana.inicio, LON_VALENCIA);
    const raPoniendose = (lstAnochecer - 4 + 24) % 24;
    const resPoniendose = calcularCulminacionAstro(
      raPoniendose,
      20,
      LAT_VALENCIA,
      LON_VALENCIA,
      fecha
    );
    expect(resPoniendose.estadoVisibilidad).toBe('visible_parcial');
    expect(resPoniendose.horaCulminacion).toBeInstanceOf(Date);
    expect(resPoniendose.etiquetaHoraria.toLowerCase()).toContain('anochecer');
    expect(resPoniendose.etiquetaHoraria.toLowerCase()).toContain('poniéndose');

    // LST al amanecer más 4 horas => culminará 4 horas después de amanecer (está saliendo)
    const lstAmanecer = calcularTiempoSidereoLocal(ventana.fin, LON_VALENCIA);
    const raSaliendo = (lstAmanecer + 4) % 24;
    const resSaliendo = calcularCulminacionAstro(
      raSaliendo,
      20,
      LAT_VALENCIA,
      LON_VALENCIA,
      fecha
    );
    expect(resSaliendo.estadoVisibilidad).toBe('visible_parcial');
    expect(resSaliendo.horaCulminacion).toBeInstanceOf(Date);
    expect(resSaliendo.etiquetaHoraria.toLowerCase()).toContain('amanecer');
    expect(resSaliendo.etiquetaHoraria.toLowerCase()).toContain('saliendo');
  });

  it('gestiona entradas inválidas sin lanzar excepciones', () => {
    const invalidoFecha = calcularCulminacionAstro(
      10,
      20,
      LAT_VALENCIA,
      LON_VALENCIA,
      new Date('invalid')
    );
    expect(invalidoFecha.estadoVisibilidad).toBe('nunca_sale');
    expect(invalidoFecha.horaCulminacion).toBeNull();

    const invalidoLat = calcularCulminacionAstro(
      10,
      20,
      120,
      LON_VALENCIA,
      new Date('2026-03-21T22:00:00Z')
    );
    expect(invalidoLat.estadoVisibilidad).toBe('nunca_sale');
    expect(invalidoLat.horaCulminacion).toBeNull();
  });

  it('ordena priorizando optimo_noche cronológicamente, luego visible_parcial y al final nunca_sale', () => {
    const lista: ObjetivoPlanificado[] = [
      crearObjetivoBase({
        id: 'estrella-Acrux',
        codigo: 'Acrux',
        estadoVisibilidad: 'nunca_sale',
        horaCulminacion: null,
        altitudMaximaGrados: -12.6,
      }),
      crearObjetivoBase({
        id: 'messier-M42',
        codigo: 'M42',
        estadoVisibilidad: 'optimo_noche',
        horaCulminacion: new Date('2026-10-16T02:15:00Z'),
      }),
      crearObjetivoBase({
        id: 'messier-M13',
        codigo: 'M13',
        estadoVisibilidad: 'visible_parcial',
        horaCulminacion: new Date('2026-10-15T16:30:00Z'),
      }),
      crearObjetivoBase({
        id: 'messier-M31',
        codigo: 'M31',
        estadoVisibilidad: 'optimo_noche',
        horaCulminacion: new Date('2026-10-15T23:40:00Z'),
      }),
    ];

    const ordenada = [...lista].sort(ordenarPorCulminacionNocturna);
    expect(ordenada.map((o) => o.codigo)).toEqual(['M31', 'M42', 'M13', 'Acrux']);
  });
});
