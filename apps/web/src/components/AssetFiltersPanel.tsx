import { getStateOptions, getStatusLabel } from '../lib/geo';
import type { AssetFilters, MeteorologyAssetStatus, Municipality } from '../types/geo';
import { formControlClassName, labelTextClassName } from './styles';

type AssetFiltersPanelProps = {
  filters: AssetFilters;
  municipalities: Municipality[];
  totalCount: number;
  visibleCount: number;
  onChange: (filters: AssetFilters) => void;
  onClear: () => void;
};

const statusOptions: MeteorologyAssetStatus[] = ['NOT_STARTED', 'STARTED', 'CONCLUDED'];

export function AssetFiltersPanel({
  filters,
  municipalities,
  totalCount,
  visibleCount,
  onChange,
  onClear,
}: AssetFiltersPanelProps) {
  const stateOptions = getStateOptions(municipalities);
  const hasActiveFilters = filters.state !== 'ALL' || filters.status !== 'ALL';

  return (
    <aside
      className="fixed top-6 left-6 z-[1] grid max-h-[calc(100vh-48px)] w-[min(380px,calc(100vw-48px))] gap-3 overflow-y-auto rounded-lg border border-slate-300/70 bg-white p-4 font-sans text-slate-900 shadow-[0_12px_32px_rgb(15_23_42_/_14%)] max-[720px]:top-3 max-[720px]:left-3 max-[720px]:max-h-[48vh] max-[720px]:w-[min(360px,calc(100vw-24px))]"
      aria-label="Filtros de entregaveis"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-semibold leading-tight">Filtros</h2>
        </div>
        <strong className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {visibleCount}/{totalCount}
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className={labelTextClassName}>Estado</span>
          <select
            className={formControlClassName}
            value={filters.state}
            onChange={(event) =>
              onChange({
                ...filters,
                state: event.target.value,
              })
            }
          >
            <option value="ALL">Todos</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className={labelTextClassName}>Status</span>
          <select
            className={formControlClassName}
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as AssetFilters['status'],
              })
            }
          >
            <option value="ALL">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasActiveFilters && (
        <button
          className="min-h-9 cursor-pointer rounded-md border border-slate-300 bg-slate-50 font-bold text-sm text-slate-700"
          type="button"
          onClick={onClear}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  );
}
