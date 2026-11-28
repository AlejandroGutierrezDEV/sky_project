import { useCallback, useEffect, useRef, useState } from 'react';
import { VALID_CELESTIAL_IDS, obtenerFichaTecnica } from '../data/celestialDetails';
import {
  isValidCelestialId,
  type CelestialTechnicalSheet,
  type SheetLoadStatus,
  type UseCelestialFocusResult,
} from '../types/celestialDetails';

export interface UseCelestialFocusOptions {
  /** Conjunto de IDs válidos seleccionables en el mapa, bóveda y buscador */
  validIds?: ReadonlySet<string>;
  /** Mapa estático opcional de fichas técnicas (retrocompatibilidad o mocks) */
  sheets?: Readonly<Record<string, CelestialTechnicalSheet>>;
  /** Resolvedor perezoso bajo demanda de fichas técnicas (por defecto `obtenerFichaTecnica`) */
  obtenerFicha?: (bodyId: string) => CelestialTechnicalSheet | undefined;
  /**
   * Cargador asíncrono opcional para fichas dinámicas o recursos remotos.
   * Si se proporciona, las selecciones rápidas cancelan la petición anterior mediante AbortController.
   */
  loadSheetAsync?: (
    bodyId: string,
    signal: AbortSignal
  ) => Promise<CelestialTechnicalSheet | null>;
  /** Desactiva el atajo Escape temporalmente cuando otro modal superior está abierto */
  disableEscapeKey?: boolean;
}

export type AccionEscapeFoco = 'close_sheet' | 'clear_focus' | 'none';

/** Determina la acción predecible al pulsar Escape: cierra primero la ficha y luego sale del foco. */
export function resolverAccionEscape(
  isSheetOpen: boolean,
  isFocusActive: boolean
): AccionEscapeFoco {
  if (isSheetOpen) return 'close_sheet';
  if (isFocusActive) return 'clear_focus';
  return 'none';
}

function esErrorAbort(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * Hook centralizado que sincroniza el Modo Foco (2D/3D) y el estado de la
 * Ficha Técnica Desplegable a partir de un único `selectedBodyId`.
 */
export function useCelestialFocus(
  options: Readonly<UseCelestialFocusOptions> = {}
): UseCelestialFocusResult {
  const {
    validIds = VALID_CELESTIAL_IDS,
    sheets,
    obtenerFicha = obtenerFichaTecnica,
    loadSheetAsync,
    disableEscapeKey = false,
  } = options;

  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<SheetLoadStatus>('idle');
  const [sheetData, setSheetData] = useState<CelestialTechnicalSheet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abortarCargaEnCurso = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortarCargaEnCurso();
    };
  }, [abortarCargaEnCurso]);

  const clearFocus = useCallback(() => {
    abortarCargaEnCurso();
    setSelectedBodyId(null);
    setIsFocusActive(false);
    setIsSheetOpen(false);
    setSheetStatus('idle');
    setSheetData(null);
    setErrorMessage(null);
  }, [abortarCargaEnCurso]);

  const toggleSheet = useCallback(
    (open?: boolean) => {
      setIsSheetOpen((prev) => {
        if (!isFocusActive) return false;
        return typeof open === 'boolean' ? open : !prev;
      });
    },
    [isFocusActive]
  );

  const selectBody = useCallback(
    (bodyId: string) => {
      if (!isValidCelestialId(bodyId, validIds)) {
        return;
      }

      abortarCargaEnCurso();

      setSelectedBodyId(bodyId);
      setIsFocusActive(true);
      setIsSheetOpen(true);
      setErrorMessage(null);

      if (loadSheetAsync) {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setSheetStatus('loading');
        setSheetData(null);

        loadSheetAsync(bodyId, controller.signal)
          .then((ficha) => {
            if (controller.signal.aborted) return;
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
            if (ficha) {
              setSheetData(ficha);
              setSheetStatus('ready');
            } else {
              setSheetData(null);
              setSheetStatus('empty');
            }
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted || esErrorAbort(error)) return;
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
            setSheetData(null);
            setSheetStatus('error');
            setErrorMessage(
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : 'No se pudo cargar la ficha técnica del objeto seleccionado.'
            );
          });
        return;
      }

      const fichaLocal = sheets
        ? Object.prototype.hasOwnProperty.call(sheets, bodyId)
          ? sheets[bodyId]
          : undefined
        : obtenerFicha(bodyId);

      if (fichaLocal) {
        setSheetData(fichaLocal);
        setSheetStatus('ready');
      } else {
        setSheetData(null);
        setSheetStatus('empty');
      }
    },
    [validIds, sheets, obtenerFicha, loadSheetAsync, abortarCargaEnCurso]
  );

  useEffect(() => {
    if (disableEscapeKey || (!isSheetOpen && !isFocusActive)) return;

    const manejarKeyDown = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      const accion = resolverAccionEscape(isSheetOpen, isFocusActive);
      if (accion === 'close_sheet') {
        setIsSheetOpen(false);
      } else if (accion === 'clear_focus') {
        clearFocus();
      }
    };

    window.addEventListener('keydown', manejarKeyDown);
    return () => {
      window.removeEventListener('keydown', manejarKeyDown);
    };
  }, [disableEscapeKey, isSheetOpen, isFocusActive, clearFocus]);

  return {
    selectedBodyId,
    isFocusActive,
    isSheetOpen,
    sheetStatus,
    sheetData,
    errorMessage,
    selectBody,
    toggleSheet,
    clearFocus,
  };
}
