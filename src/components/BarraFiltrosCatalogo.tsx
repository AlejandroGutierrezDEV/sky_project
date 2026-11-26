import { Eye, Filter, RotateCcw } from 'lucide-react';
import { GANANCIA_MAGNITUD_INSTRUMENTO } from '../hooks/useFiltrosCatalogo';
import type {
  FiltrosCatalogo,
  FiltroTipoUI,
  InstrumentoObservacion,
  TemaVisual,
} from '../types/astronomy';

interface BarraFiltrosCatalogoProps {
  filtros: FiltrosCatalogo;
  onCambiarFiltros: (actualizacion: Partial<FiltrosCatalogo>) => void;
  onResetearFiltros: () => void;
  tema: TemaVisual;
  totalMessierFiltrados: number;
  totalMessierSobreHorizonte: number;
  magnitudLimiteEfectiva: number;
  capaMessierActiva: boolean;
}

const OPCIONES_TIPO: readonly { valor: FiltroTipoUI; etiqueta: string }[] = [
  { valor: 'Todos', etiqueta: 'Todos' },
  { valor: 'Galaxia', etiqueta: 'Galaxia' },
  { valor: 'Nebulosa', etiqueta: 'Nebulosa' },
  { valor: 'Cumulo', etiqueta: 'Cúmulo' },
];

const OPCIONES_INSTRUMENTO: readonly {
  valor: InstrumentoObservacion | 'Todos';
  etiqueta: string;
}[] = [
  { valor: 'Todos', etiqueta: 'Todos' },
  { valor: 'Ojo desnudo', etiqueta: 'Ojo desnudo' },
  { valor: 'Prismaticos', etiqueta: 'Prismáticos' },
  { valor: 'Telescopio', etiqueta: 'Telescopio' },
];

function obtenerClaseBotonFiltro(tema: TemaVisual, activo: boolean): string {
  if (!activo) return 'border-current/20 opacity-75 hover:opacity-100 hover:bg-current/10';
  if (tema === 'rojo') return 'border-red-500 bg-red-950 text-red-400';
  if (tema === 'claro') return 'border-slate-800 bg-slate-800 text-white';
  return 'border-sky-500/80 bg-sky-600 text-white';
}

function obtenerClaseEstadoVacio(tema: TemaVisual): string {
  if (tema === 'rojo') return 'border-red-700/80 bg-red-950/40 text-red-400';
  if (tema === 'claro') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
}

export function BarraFiltrosCatalogo({
  filtros,
  onCambiarFiltros,
  onResetearFiltros,
  tema,
  totalMessierFiltrados,
  totalMessierSobreHorizonte,
  magnitudLimiteEfectiva,
  capaMessierActiva,
}: Readonly<BarraFiltrosCatalogoProps>) {
  const gananciaInstrumento =
    filtros.instrumento === 'Todos'
      ? null
      : GANANCIA_MAGNITUD_INSTRUMENTO[filtros.instrumento];

  const hayFiltrosPersonalizados =
    filtros.tipo !== 'Todos' ||
    filtros.instrumento !== 'Todos' ||
    !filtros.soloPorEncimaHorizonte;

  return (
    <div className="mb-3 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Filtro rápido por tipo de objeto Messier */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="opacity-70 flex items-center gap-1 mr-0.5">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Tipo:
          </span>
          <div
            role="group"
            aria-label="Filtrar objetos por tipo"
            className="flex flex-wrap items-center gap-1"
          >
            {OPCIONES_TIPO.map(({ valor, etiqueta }) => {
              const activo = filtros.tipo === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => onCambiarFiltros({ tipo: valor })}
                  className={`min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonFiltro(
                    tema,
                    activo
                  )}`}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle rápido de horizonte */}
        <button
          type="button"
          aria-pressed={filtros.soloPorEncimaHorizonte}
          onClick={() =>
            onCambiarFiltros({
              soloPorEncimaHorizonte: !filtros.soloPorEncimaHorizonte,
            })
          }
          className={`min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonFiltro(
            tema,
            filtros.soloPorEncimaHorizonte
          )}`}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          Sobre horizonte
        </button>
      </div>

      {/* Filtro por instrumento de observación y resumen */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="opacity-70 mr-0.5">Instrumento:</span>
          <div
            role="group"
            aria-label="Filtrar por instrumento de observación"
            className="flex flex-wrap items-center gap-1"
          >
            {OPCIONES_INSTRUMENTO.map(({ valor, etiqueta }) => {
              const activo = filtros.instrumento === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => onCambiarFiltros({ instrumento: valor })}
                  className={`min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors motion-reduce:transition-none ${obtenerClaseBotonFiltro(
                    tema,
                    activo
                  )}`}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] opacity-85">
          <span title="Objetos Messier coincidentes respecto al total sobre el horizonte">
            Messier: {totalMessierFiltrados}/{totalMessierSobreHorizonte}
            {!capaMessierActiva ? ' (capa oculta)' : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span title="Magnitud límite efectiva considerando Bortle, Luna e instrumento">
            Límite ≤ {magnitudLimiteEfectiva.toFixed(1)} mag
            {gananciaInstrumento !== null
              ? ` (+${gananciaInstrumento.toFixed(1)})`
              : ''}
          </span>
          {hayFiltrosPersonalizados && (
            <button
              type="button"
              onClick={onResetearFiltros}
              aria-label="Restablecer filtros de catálogo"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-current/25 hover:bg-current/10 font-sans cursor-pointer transition-colors motion-reduce:transition-none"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Estado vacío cuando la combinación de filtros y altitud devuelve 0 objetos Messier */}
      {totalMessierFiltrados === 0 && (
        <div
          role="status"
          className={`px-3 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${obtenerClaseEstadoVacio(
            tema
          )}`}
        >
          <span>
            Ningún objeto Messier coincide con los filtros activos, la altitud sobre el
            horizonte o la magnitud límite actual ({magnitudLimiteEfectiva.toFixed(1)} mag).
          </span>
          <button
            type="button"
            onClick={onResetearFiltros}
            className="min-h-10 sm:min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-current/40 hover:bg-current/10 font-medium cursor-pointer transition-colors motion-reduce:transition-none"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Restablecer filtros
          </button>
        </div>
      )}
    </div>
  );
}
