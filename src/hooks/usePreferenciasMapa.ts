import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CapasMapa,
  ModoMapa,
  PreferenciasVisualizacion,
} from '../types/astronomy';

export const CLAVE_PREFERENCIAS_MAPA = 'skyproject_preferencias_mapa_v1';

export const CLAVES_DATOS_LOCALES: readonly string[] = [
  CLAVE_PREFERENCIAS_MAPA,
  'skyproject_ubicacion',
  'skyproject_favoritos_v1',
  'skyproject_tema',
  'skyproject_meteo_cache_v3',
  'skyproject_planificador_sesion_v1',
];

export const PREFERENCIAS_POR_DEFECTO: PreferenciasVisualizacion = {
  modoMapa: '2D',
  capas: {
    constelaciones: true,
    estrellas: true,
    messier: true,
  },
};

function esModoMapaValido(valor: unknown): valor is ModoMapa {
  return valor === '2D' || valor === '3D';
}

export function esPreferenciaValida(data: unknown): data is PreferenciasVisualizacion {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  if (!esModoMapaValido(obj.modoMapa)) {
    return false;
  }

  if (typeof obj.capas !== 'object' || obj.capas === null || Array.isArray(obj.capas)) {
    return false;
  }

  const capas = obj.capas as Record<string, unknown>;
  return (
    typeof capas.constelaciones === 'boolean' &&
    typeof capas.estrellas === 'boolean' &&
    typeof capas.messier === 'boolean'
  );
}

function clonarPreferenciasPorDefecto(): PreferenciasVisualizacion {
  return {
    modoMapa: PREFERENCIAS_POR_DEFECTO.modoMapa,
    capas: { ...PREFERENCIAS_POR_DEFECTO.capas },
  };
}

export function leerPreferenciasGuardadas(): PreferenciasVisualizacion {
  try {
    const raw = localStorage.getItem(CLAVE_PREFERENCIAS_MAPA);
    if (!raw) return clonarPreferenciasPorDefecto();
    const parsed: unknown = JSON.parse(raw);
    if (!esPreferenciaValida(parsed)) {
      return clonarPreferenciasPorDefecto();
    }
    return {
      modoMapa: parsed.modoMapa,
      capas: {
        constelaciones: parsed.capas.constelaciones,
        estrellas: parsed.capas.estrellas,
        messier: parsed.capas.messier,
      },
    };
  } catch {
    return clonarPreferenciasPorDefecto();
  }
}

export function guardarPreferenciasEnStorage(preferencias: PreferenciasVisualizacion): void {
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS_MAPA, JSON.stringify(preferencias));
  } catch {
    // Silencioso ante modo incógnito, cuota excedida o almacenamiento restringido
  }
}

export function limpiarDatosLocalesStorage(): void {
  try {
    for (const clave of CLAVES_DATOS_LOCALES) {
      localStorage.removeItem(clave);
    }
  } catch {
    // Silencioso ante almacenamiento restringido
  }
}

export interface ResultadoPreferenciasMapa {
  preferencias: PreferenciasVisualizacion;
  toggleCapa: (capa: keyof CapasMapa, valor?: boolean) => void;
  setModoMapa: (modo: ModoMapa) => void;
  resetearDatosLocales: () => void;
}

export function usePreferenciasMapa(): ResultadoPreferenciasMapa {
  const [preferencias, setPreferencias] = useState<PreferenciasVisualizacion>(
    leerPreferenciasGuardadas
  );
  const debeGuardarRef = useRef<boolean>(false);

  useEffect(() => {
    if (!debeGuardarRef.current) return;
    debeGuardarRef.current = false;
    guardarPreferenciasEnStorage(preferencias);
  }, [preferencias]);

  const toggleCapa = useCallback((capa: keyof CapasMapa, valor?: boolean) => {
    debeGuardarRef.current = true;
    setPreferencias((prev) => ({
      ...prev,
      capas: {
        ...prev.capas,
        [capa]: typeof valor === 'boolean' ? valor : !prev.capas[capa],
      },
    }));
  }, []);

  const setModoMapa = useCallback((modo: ModoMapa) => {
    if (!esModoMapaValido(modo)) return;
    setPreferencias((prev) => {
      if (prev.modoMapa === modo) return prev;
      debeGuardarRef.current = true;
      return { ...prev, modoMapa: modo };
    });
  }, []);

  const resetearDatosLocales = useCallback(() => {
    debeGuardarRef.current = false;
    limpiarDatosLocalesStorage();
    setPreferencias(clonarPreferenciasPorDefecto());
  }, []);

  return {
    preferencias,
    toggleCapa,
    setModoMapa,
    resetearDatosLocales,
  };
}
