import type {
  CategoriaAstroObjetivo,
  MetadatosExportacionSesion,
  ObjetivoPlanificado,
} from '../types/astronomy';

const ETIQUETA_CATEGORIA: Readonly<Record<CategoriaAstroObjetivo, string>> = {
  messier: 'Messier',
  estrella: 'Estrella',
  planeta: 'Planeta',
};

/**
 * Formatea Ascensión Recta (horas decimales) a formato "HHh MM.Mm".
 */
export function formatearRA(raHoras: number): string {
  if (!Number.isFinite(raHoras)) return '—';
  const normalizada = ((raHoras % 24) + 24) % 24;
  let horas = Math.floor(normalizada);
  let minutos = Math.round((normalizada - horas) * 600) / 10;
  if (minutos >= 60) {
    minutos = 0;
    horas = (horas + 1) % 24;
  }
  const hStr = String(horas).padStart(2, '0');
  const mStr = minutos.toFixed(1).padStart(4, '0');
  return `${hStr}h ${mStr}m`;
}

/**
 * Formatea Declinación (grados decimales) a formato "+DD° MM'".
 */
export function formatearDec(decGrados: number): string {
  if (!Number.isFinite(decGrados)) return '—';
  const signo = decGrados >= 0 ? '+' : '-';
  const abs = Math.abs(decGrados);
  let grados = Math.floor(abs);
  let minutos = Math.round((abs - grados) * 60);
  if (minutos >= 60) {
    minutos = 0;
    grados += 1;
  }
  const gStr = String(grados).padStart(2, '0');
  const mStr = String(minutos).padStart(2, '0');
  return `${signo}${gStr}° ${mStr}'`;
}

function escaparCeldaMarkdown(texto: string): string {
  return texto.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function formatearFechaArchivo(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const anio = valida.getFullYear();
  const mes = String(valida.getMonth() + 1).padStart(2, '0');
  const dia = String(valida.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearFechaLegible(fecha: Date): string {
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'full',
    }).format(valida);
  } catch {
    return formatearFechaArchivo(valida);
  }
}

/**
 * Genera el contenido completo en formato Markdown (.md) de la hoja de observación nocturna.
 */
export function generarMarkdownSesion(
  objetivos: readonly ObjetivoPlanificado[],
  metadatos: MetadatosExportacionSesion
): string {
  const fechaLegible = formatearFechaLegible(metadatos.fecha);
  const ubicacionLimpia = metadatos.ubicacionNombre.trim() || 'Observatorio sin nombre';
  const faseLimpia = metadatos.faseLunar.trim() || 'Sin datos';
  const bortleSeguro = Number.isFinite(metadatos.bortle) ? Math.round(metadatos.bortle) : 4;
  const observados = objetivos.filter((o) => o.observado).length;

  const lineas: string[] = [
    '# Hoja de Observación Nocturna — SkyProject',
    '',
    `- **Fecha:** ${fechaLegible}`,
    `- **Ubicación:** ${ubicacionLimpia}`,
    `- **Escala Bortle:** Bortle ${bortleSeguro}`,
    `- **Fase lunar:** ${faseLimpia}`,
    `- **Progreso:** ${observados} / ${objetivos.length} observados`,
    '',
  ];

  if (objetivos.length === 0) {
    lineas.push('_No hay objetivos añadidos en esta sesión._', '');
    return lineas.join('\n');
  }

  lineas.push(
    '## Lista de objetivos (ordenados por culminación nocturna)',
    '',
    '| Estado | Astro | Categoría | Constelación | Mag | Coordenadas (AR / Dec) | Hora óptima / Culminación | Notas |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |'
  );

  for (const obj of objetivos) {
    const casilla = obj.observado ? '- [x]' : '- [ ]';
    const tituloAstro =
      obj.nombre.toLowerCase() === obj.codigo.toLowerCase()
        ? obj.nombre
        : `${obj.codigo} · ${obj.nombre}`;
    const categoria = ETIQUETA_CATEGORIA[obj.categoria];
    const constelacion = obj.constelacion || '—';
    const mag = Number.isFinite(obj.magnitud) ? obj.magnitud.toFixed(1) : '—';
    const coords = `AR ${formatearRA(obj.raHoras)} / Dec ${formatearDec(obj.decGrados)}`;
    const notas = obj.notas && obj.notas.trim().length > 0 ? obj.notas : '—';

    lineas.push(
      `| ${casilla} | ${escaparCeldaMarkdown(tituloAstro)} | ${categoria} | ${escaparCeldaMarkdown(constelacion)} | ${mag} | ${coords} | ${escaparCeldaMarkdown(obj.etiquetaHoraria)} | ${escaparCeldaMarkdown(notas)} |`
    );
  }

  lineas.push('');
  return lineas.join('\n');
}

/**
 * Descarga la hoja de observación nocturna como archivo Markdown (.md)
 * revocando siempre la URL temporal del Blob para liberar memoria.
 */
export function descargarSesionMarkdown(
  objetivos: ObjetivoPlanificado[],
  metadatos: MetadatosExportacionSesion
): void {
  const contenido = generarMarkdownSesion(objetivos, metadatos);
  const blob = new Blob([contenido], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `sesion-observacion-${formatearFechaArchivo(metadatos.fecha)}.md`;
    enlace.rel = 'noopener';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prepara la vista imprimible dedicada (hoja @media print) y lanza la impresión/exportación a PDF.
 */
export function imprimirHojaObservacionPDF(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const cuerpo = document.body;
  cuerpo.classList.add('imprimiendo-sesion');

  const restaurar = () => {
    cuerpo.classList.remove('imprimiendo-sesion');
    window.removeEventListener('afterprint', restaurar);
  };

  window.addEventListener('afterprint', restaurar, { once: true });

  try {
    window.print();
  } finally {
    // Garantiza limpieza incluso en entornos donde afterprint no se dispara de forma síncrona
    window.setTimeout(restaurar, 500);
  }
}
