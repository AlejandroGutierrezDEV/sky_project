import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  descargarSesionMarkdown,
  formatearDec,
  formatearRA,
  generarMarkdownSesion,
  imprimirHojaObservacionPDF,
} from '../exportarSesion';
import type {
  MetadatosExportacionSesion,
  ObjetivoPlanificado,
} from '../../types/astronomy';

const METADATOS: MetadatosExportacionSesion = {
  ubicacionNombre: 'Observatorio del Teide',
  bortle: 2,
  faseLunar: 'Luna Nueva',
  fecha: new Date('2026-10-15T12:00:00Z'),
  timezone: 'Atlantic/Canary',
};

const OBJETIVOS_EJEMPLO: ObjetivoPlanificado[] = [
  {
    id: 'messier-M31',
    codigo: 'M31',
    nombre: 'Galaxia de Andrómeda',
    categoria: 'messier',
    magnitud: 3.4,
    constelacion: 'Andrómeda',
    raHoras: 0.712,
    decGrados: 41.27,
    observado: true,
    notas: 'Núcleo brillante | Filtro UHC\nMuy nítida',
    horaCulminacion: new Date('2026-10-16T00:42:00Z'),
    altitudMaximaGrados: 78.2,
    estadoVisibilidad: 'optimo_noche',
    etiquetaHoraria: '01:42 (Alt. máx 78°)',
  },
  {
    id: 'estrella-Alp Cru',
    codigo: 'Acrux',
    nombre: 'Acrux',
    categoria: 'estrella',
    magnitud: 0.8,
    constelacion: 'Cruz del Sur',
    raHoras: 12.443,
    decGrados: -63.1,
    observado: false,
    horaCulminacion: null,
    altitudMaximaGrados: -1.6,
    estadoVisibilidad: 'nunca_sale',
    etiquetaHoraria: 'No visible desde esta latitud',
  },
];

describe('Exportación de sesión nocturna (exportarSesion.ts)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('formatea correctamente coordenadas ecuatoriales AR y Dec', () => {
    expect(formatearRA(0.712)).toBe('00h 42.7m');
    expect(formatearRA(23.9995)).toBe('00h 00.0m');
    expect(formatearDec(41.27)).toBe("+41° 16'");
    expect(formatearDec(-63.1)).toBe("-63° 06'");
  });

  it('genera tabla Markdown limpia con casillas - [x] / - [ ], metadatos y escape de caracteres', () => {
    const md = generarMarkdownSesion(OBJETIVOS_EJEMPLO, METADATOS);

    expect(md).toContain('# Hoja de Observación Nocturna — SkyProject');
    expect(md).toContain('Observatorio del Teide');
    expect(md).toContain('Bortle 2');
    expect(md).toContain('Luna Nueva');
    expect(md).toContain('1 / 2 observados');
    expect(md).toContain('| - [x] | M31 · Galaxia de Andrómeda |');
    expect(md).toContain('| - [ ] | Acrux |');
    expect(md).toContain('01:42 (Alt. máx 78°)');
    expect(md).toContain('No visible desde esta latitud');
    // Verifica que el pipe y el salto de línea en notas quedan escapados para no romper la tabla
    expect(md).toContain('Núcleo brillante \\| Filtro UHC Muy nítida');
  });

  it('exporta fechas y horas de culminación en la zona horaria IANA del observatorio (Tokio vs Canarias)', () => {
    const fechaTardeUTC = new Date('2026-10-15T20:00:00Z');
    const metadatosTokio: MetadatosExportacionSesion = {
      ...METADATOS,
      ubicacionNombre: 'Tokio',
      fecha: fechaTardeUTC,
      timezone: 'Asia/Tokyo',
    };

    const mdTokio = generarMarkdownSesion(OBJETIVOS_EJEMPLO, metadatosTokio, 'Asia/Tokyo');
    // 2026-10-15T20:00:00Z ya es 16 de octubre en Asia/Tokyo (UTC+9)
    expect(mdTokio).toContain('16 de octubre de 2026');
    // 2026-10-16T00:42:00Z son las 09:42 en Asia/Tokyo
    expect(mdTokio).toContain('09:42 (Alt. máx 78°)');
    expect(mdTokio).toContain('Asia/Tokyo');

    const mdCanarias = generarMarkdownSesion(
      OBJETIVOS_EJEMPLO,
      { ...METADATOS, fecha: fechaTardeUTC, timezone: 'Atlantic/Canary' },
      'Atlantic/Canary'
    );
    // 2026-10-15T20:00:00Z sigue siendo 15 de octubre en Atlantic/Canary (UTC+1)
    expect(mdCanarias).toContain('15 de octubre de 2026');
    // 2026-10-16T00:42:00Z son las 01:42 en Atlantic/Canary (WEST = UTC+1)
    expect(mdCanarias).toContain('01:42 (Alt. máx 78°)');
  });

  it('difiere 1500 ms la revocación de la URL temporal del Blob al descargar el archivo .md', () => {
    vi.useFakeTimers();

    const createObjectURL = vi.fn(() => 'blob:skyproject-test-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const clickMock = vi.fn();
    const enlaceMock = {
      href: '',
      download: '',
      rel: '',
      click: clickMock,
    };
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    vi.stubGlobal('document', {
      createElement: vi.fn(() => enlaceMock),
      body: { appendChild, removeChild },
    });
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
    });

    descargarSesionMarkdown(OBJETIVOS_EJEMPLO, METADATOS);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(enlaceMock.download).toBe('sesion-observacion-2026-10-15.md');
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(enlaceMock);
    expect(removeChild).toHaveBeenCalledWith(enlaceMock);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:skyproject-test-url');
  });

  it('invoca window.print() y limpia la clase de impresión al exportar PDF', () => {
    const add = vi.fn();
    const remove = vi.fn();
    const printMock = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const setTimeoutMock = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });

    vi.stubGlobal('document', {
      body: { classList: { add, remove } },
    });
    vi.stubGlobal('window', {
      print: printMock,
      addEventListener,
      removeEventListener,
      setTimeout: setTimeoutMock,
    });

    imprimirHojaObservacionPDF();

    expect(add).toHaveBeenCalledWith('imprimiendo-sesion');
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('imprimiendo-sesion');
  });
});
