import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CategoriaAstroObjetivo,
  ClaveDiaCivil,
  ObjetivoPlanificado,
  ObjetivoSesion,
} from '../types/astronomy';
import {
  calcularCulminacionAstro,
  ordenarPorCulminacionNocturna,
} from '../utils/astronomia/culminacion';
import {
  normalizarZonaHoraria,
  obtenerClaveDiaCivil,
  obtenerFechaReferenciaDiaCivil,
} from '../utils/lunarCalculations';

export const CLAVE_PLANIFICADOR_SESION = 'skyproject_planificador_sesion_v1';
export const MAX_LONGITUD_NOTA = 240;
export const MAX_OBJETIVOS_SESION = 200;

function esCategoriaAstroObjetivoValida(valor: unknown): valor is CategoriaAstroObjetivo {
  return valor === 'messier' || valor === 'estrella' || valor === 'planeta';
}

/**
 * Type guard estricto para validar elementos recuperados desde localStorage.
 */
export function esObjetivoSesionValido(valor: unknown): valor is ObjetivoSesion {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const obj = valor as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.trim().length === 0 || obj.id.length > 100) {
    return false;
  }
  if (typeof obj.codigo !== 'string' || obj.codigo.trim().length === 0 || obj.codigo.length > 60) {
    return false;
  }
  if (typeof obj.nombre !== 'string' || obj.nombre.trim().length === 0 || obj.nombre.length > 120) {
    return false;
  }
  if (!esCategoriaAstroObjetivoValida(obj.categoria)) {
    return false;
  }
  if (typeof obj.magnitud !== 'number' || !Number.isFinite(obj.magnitud)) {
    return false;
  }
  if (typeof obj.constelacion !== 'string' || obj.constelacion.length > 80) {
    return false;
  }
  if (
    typeof obj.raHoras !== 'number' ||
    !Number.isFinite(obj.raHoras) ||
    obj.raHoras < 0 ||
    obj.raHoras >= 24.0001
  ) {
    return false;
  }
  if (
    typeof obj.decGrados !== 'number' ||
    !Number.isFinite(obj.decGrados) ||
    obj.decGrados < -90 ||
    obj.decGrados > 90
  ) {
    return false;
  }
  if (typeof obj.observado !== 'boolean') {
    return false;
  }
  if (obj.notas !== undefined && typeof obj.notas !== 'string') {
    return false;
  }

  return true;
}

function normalizarObjetivo(objetivo: ObjetivoSesion): ObjetivoSesion {
  const raNormalizada = ((objetivo.raHoras % 24) + 24) % 24;
  const notasLimpias =
    typeof objetivo.notas === 'string' && objetivo.notas.length > 0
      ? objetivo.notas.slice(0, MAX_LONGITUD_NOTA)
      : undefined;

  return {
    id: objetivo.id.trim().slice(0, 100),
    codigo: objetivo.codigo.trim().slice(0, 60),
    nombre: objetivo.nombre.trim().slice(0, 120),
    categoria: objetivo.categoria,
    magnitud: Number(objetivo.magnitud.toFixed(2)),
    constelacion: objetivo.constelacion.trim().slice(0, 80),
    raHoras: Number(raNormalizada.toFixed(4)),
    decGrados: Math.max(-90, Math.min(90, Number(objetivo.decGrados.toFixed(4)))),
    observado: objetivo.observado,
    ...(notasLimpias !== undefined ? { notas: notasLimpias } : {}),
  };
}

/**
 * Parsea la lista de objetivos de sesión desde JSON descartando elementos corruptos
 * o duplicados sin interrumpir la carga de los registros válidos.
 */
export function parsearObjetivosGuardados(raw: string | null): ObjetivoSesion[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const vistos = new Set<string>();
    const validos: ObjetivoSesion[] = [];

    for (const item of parsed) {
      if (!esObjetivoSesionValido(item)) continue;
      const normalizado = normalizarObjetivo(item);
      if (vistos.has(normalizado.id)) continue;
      vistos.add(normalizado.id);
      validos.push(normalizado);
      if (validos.length >= MAX_OBJETIVOS_SESION) break;
    }

    return validos;
  } catch {
    return [];
  }
}

export function leerObjetivosGuardados(): ObjetivoSesion[] {
  try {
    return parsearObjetivosGuardados(localStorage.getItem(CLAVE_PLANIFICADOR_SESION));
  } catch {
    return [];
  }
}

export function guardarObjetivosEnStorage(objetivos: ObjetivoSesion[]): void {
  try {
    localStorage.setItem(CLAVE_PLANIFICADOR_SESION, JSON.stringify(objetivos));
  } catch {
    // Silencioso ante cuota excedida o modo incógnito restringido
  }
}

/**
 * Enriquece cada objetivo con su culminación meridiana y lo ordena para la sesión nocturna.
 */
export function planificarObjetivosSesion(
  objetivos: readonly ObjetivoSesion[],
  latitud: number,
  longitud: number,
  fechaReferencia: Date,
  timezone?: string
): ObjetivoPlanificado[] {
  const zonaHoraria = normalizarZonaHoraria(timezone, latitud, longitud);
  return objetivos
    .map((objetivo) => {
      const culminacion = calcularCulminacionAstro(
        objetivo.raHoras,
        objetivo.decGrados,
        latitud,
        longitud,
        fechaReferencia,
        zonaHoraria
      );

      return {
        ...objetivo,
        horaCulminacion: culminacion.horaCulminacion,
        altitudMaximaGrados: culminacion.altitudMaximaGrados,
        estadoVisibilidad: culminacion.estadoVisibilidad,
        etiquetaHoraria: culminacion.etiquetaHoraria,
      };
    })
    .sort(ordenarPorCulminacionNocturna);
}

export type EntradaObjetivoSesion = Omit<ObjetivoSesion, 'observado'> & {
  observado?: boolean;
};

export interface OpcionesPlanificadorSesion {
  latitud: number;
  longitud: number;
  fechaReferencia: Date;
  timezone?: string;
  claveDiaCivil?: ClaveDiaCivil;
}

export interface ResultadoPlanificadorSesion {
  objetivosPlanificados: ObjetivoPlanificado[];
  idsEnSesion: ReadonlySet<string>;
  totalObjetivos: number;
  totalObservados: number;
  toggleObjetivo: (astro: EntradaObjetivoSesion) => void;
  marcarObservado: (id: string, observado?: boolean) => void;
  actualizarNota: (id: string, texto: string) => void;
  limpiarSesion: () => void;
}

export function usePlanificadorSesion({
  latitud,
  longitud,
  fechaReferencia,
  timezone,
  claveDiaCivil,
}: OpcionesPlanificadorSesion): ResultadoPlanificadorSesion {
  const [objetivos, setObjetivos] = useState<ObjetivoSesion[]>(leerObjetivosGuardados);
  const debeGuardarRef = useRef<boolean>(false);

  useEffect(() => {
    if (!debeGuardarRef.current) return;
    debeGuardarRef.current = false;
    guardarObjetivosEnStorage(objetivos);
  }, [objetivos]);

  const zonaHorariaEfectiva = useMemo(
    () => normalizarZonaHoraria(timezone, latitud, longitud),
    [timezone, latitud, longitud]
  );

  const claveDiaEfectiva = useMemo<ClaveDiaCivil>(
    () => claveDiaCivil ?? obtenerClaveDiaCivil(fechaReferencia, zonaHorariaEfectiva),
    [claveDiaCivil, fechaReferencia, zonaHorariaEfectiva]
  );

  const fechaAncladaDiaCivil = useMemo(
    () => obtenerFechaReferenciaDiaCivil(claveDiaEfectiva, zonaHorariaEfectiva, 12),
    [claveDiaEfectiva, zonaHorariaEfectiva]
  );

  const objetivosPlanificados = useMemo(
    () =>
      planificarObjetivosSesion(
        objetivos,
        latitud,
        longitud,
        fechaAncladaDiaCivil,
        zonaHorariaEfectiva
      ),
    [objetivos, latitud, longitud, fechaAncladaDiaCivil, zonaHorariaEfectiva]
  );

  const idsEnSesion = useMemo<ReadonlySet<string>>(
    () => new Set(objetivos.map((o) => o.id)),
    [objetivos]
  );

  const totalObservados = useMemo(
    () => objetivos.reduce((acc, obj) => acc + (obj.observado ? 1 : 0), 0),
    [objetivos]
  );

  const toggleObjetivo = useCallback((astro: EntradaObjetivoSesion) => {
    const candidato: ObjetivoSesion = {
      ...astro,
      observado: astro.observado ?? false,
    };
    if (!esObjetivoSesionValido(candidato)) return;
    const normalizado = normalizarObjetivo(candidato);

    debeGuardarRef.current = true;
    setObjetivos((prev) => {
      const existe = prev.some((item) => item.id === normalizado.id);
      if (existe) {
        return prev.filter((item) => item.id !== normalizado.id);
      }
      if (prev.length >= MAX_OBJETIVOS_SESION) {
        return prev;
      }
      return [...prev, normalizado];
    });
  }, []);

  const marcarObservado = useCallback((id: string, observado?: boolean) => {
    debeGuardarRef.current = true;
    setObjetivos((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nuevoEstado = typeof observado === 'boolean' ? observado : !item.observado;
        return { ...item, observado: nuevoEstado };
      })
    );
  }, []);

  const actualizarNota = useCallback((id: string, texto: string) => {
    const notaRecortada = texto.slice(0, MAX_LONGITUD_NOTA);
    debeGuardarRef.current = true;
    setObjetivos((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (notaRecortada.length === 0) {
          const sinNotas: ObjetivoSesion = {
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            categoria: item.categoria,
            magnitud: item.magnitud,
            constelacion: item.constelacion,
            raHoras: item.raHoras,
            decGrados: item.decGrados,
            observado: item.observado,
          };
          return sinNotas;
        }
        return { ...item, notas: notaRecortada };
      })
    );
  }, []);

  const limpiarSesion = useCallback(() => {
    debeGuardarRef.current = true;
    setObjetivos([]);
  }, []);

  return {
    objetivosPlanificados,
    idsEnSesion,
    totalObjetivos: objetivos.length,
    totalObservados,
    toggleObjetivo,
    marcarObservado,
    actualizarNota,
    limpiarSesion,
  };
}
