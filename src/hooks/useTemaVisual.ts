import { useCallback, useEffect, useRef, useState } from 'react';
import { esTemaVisual, isThemeMode, type TemaVisual } from '../types/astronomy';

export const CLAVE_TEMA_STORAGE = 'skyproject_tema';

export const COLOR_TEMA_META: Readonly<Record<TemaVisual, string>> = {
  oscuro: '#020617',
  claro: '#e2e8f0',
  rojo: '#000000',
};

/**
 * Normaliza un valor arbitrario (por ejemplo leído desde localStorage) a un `TemaVisual` válido.
 * Soporta tanto los identificadores locales ('oscuro' | 'claro' | 'rojo') como `ThemeMode` ('dark' | 'light').
 */
export function parsearTemaGuardado(valor: unknown): TemaVisual | null {
  if (esTemaVisual(valor)) return valor;
  if (isThemeMode(valor)) {
    return valor === 'light' ? 'claro' : 'oscuro';
  }
  return null;
}

/**
 * Lee y valida el tema desde `localStorage` con fallback seguro a `'oscuro'`
 * si el valor está vacío, corrupto o el almacenamiento no está disponible.
 */
export function leerTemaGuardado(): TemaVisual {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA_STORAGE);
    const normalizado = parsearTemaGuardado(guardado);
    if (normalizado !== null) {
      return normalizado;
    }
    return 'oscuro';
  } catch {
    return 'oscuro';
  }
}

function guardarTemaEnStorage(tema: TemaVisual): void {
  try {
    localStorage.setItem(CLAVE_TEMA_STORAGE, tema);
  } catch {
    // Ignora errores de cuota o modo privado restringido
  }
}

export function useTemaVisual() {
  const [tema, setTemaState] = useState<TemaVisual>(leerTemaGuardado);
  const omitirGuardadoRef = useRef(true);

  useEffect(() => {
    const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = COLOR_TEMA_META[tema];
    }
    if (omitirGuardadoRef.current) {
      omitirGuardadoRef.current = false;
      return;
    }
    guardarTemaEnStorage(tema);
  }, [tema]);

  const setTema = useCallback((nuevoTema: TemaVisual) => {
    if (!esTemaVisual(nuevoTema)) return;
    setTemaState(nuevoTema);
  }, []);

  const restablecerTema = useCallback(() => {
    setTemaState((prev) => {
      if (prev !== 'oscuro') {
        omitirGuardadoRef.current = true;
      }
      return 'oscuro';
    });
  }, []);

  return {
    tema,
    setTema,
    restablecerTema,
  };
}
